-- ============================================================================
-- Relay Schema: relay_sessions, relay_messages, relay_devices
-- ============================================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ============================================================================
-- relay_sessions: Links a desktop instance to a mobile device via pairing code
-- ============================================================================
create table relay_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pairing_code text unique not null,
  desktop_name text,
  active_agent_id text,
  active_agent_name text,
  active_session_key text,
  status text not null default 'waiting_pair'
    check (status in ('waiting_pair', 'paired', 'active', 'disconnected')),
  desktop_connected_at timestamptz default now(),
  mobile_connected_at timestamptz,
  expires_at timestamptz default (now() + interval '24 hours'),
  created_at timestamptz default now()
);

-- Index for pairing code lookups
create index idx_relay_sessions_pairing_code on relay_sessions(pairing_code)
  where status = 'waiting_pair';

-- Index for user sessions
create index idx_relay_sessions_user on relay_sessions(user_id, status);

-- RLS
alter table relay_sessions enable row level security;

create policy "Users can read their own sessions"
  on relay_sessions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own sessions"
  on relay_sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own sessions"
  on relay_sessions for update
  using (auth.uid() = user_id);

create policy "Users can delete their own sessions"
  on relay_sessions for delete
  using (auth.uid() = user_id);


-- ============================================================================
-- relay_messages: Bidirectional message queue
-- ============================================================================
create table relay_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references relay_sessions(id) on delete cascade,
  direction text not null
    check (direction in ('mobile_to_desktop', 'desktop_to_mobile')),
  message_type text not null
    check (message_type in (
      'user_message',
      'agent_chunk',
      'agent_message',
      'agent_tool_call',
      'agent_done',
      'agent_error',
      'approval_request',
      'approval_response',
      'session_update'
    )),
  payload jsonb not null default '{}',
  consumed boolean not null default false,
  created_at timestamptz default now()
);

-- Fast unconsumed message lookups
create index idx_relay_messages_unconsumed
  on relay_messages(session_id, direction, consumed)
  where consumed = false;

-- Index for session message ordering
create index idx_relay_messages_session_time
  on relay_messages(session_id, created_at);

-- RLS
alter table relay_messages enable row level security;

-- Users can access messages for their own sessions
create policy "Users can read messages in their sessions"
  on relay_messages for select
  using (
    exists (
      select 1 from relay_sessions
      where relay_sessions.id = relay_messages.session_id
        and relay_sessions.user_id = auth.uid()
    )
  );

create policy "Users can insert messages in their sessions"
  on relay_messages for insert
  with check (
    exists (
      select 1 from relay_sessions
      where relay_sessions.id = relay_messages.session_id
        and relay_sessions.user_id = auth.uid()
    )
  );

create policy "Users can update messages in their sessions"
  on relay_messages for update
  using (
    exists (
      select 1 from relay_sessions
      where relay_sessions.id = relay_messages.session_id
        and relay_sessions.user_id = auth.uid()
    )
  );


-- ============================================================================
-- relay_devices: APNs device tokens for push notifications
-- ============================================================================
create table relay_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  apns_token text not null,
  device_name text,
  platform text not null default 'ios'
    check (platform in ('ios')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- One token per user per platform
create unique index idx_relay_devices_user_token
  on relay_devices(user_id, apns_token);

-- RLS
alter table relay_devices enable row level security;

create policy "Users can read their own devices"
  on relay_devices for select
  using (auth.uid() = user_id);

create policy "Users can insert their own devices"
  on relay_devices for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own devices"
  on relay_devices for update
  using (auth.uid() = user_id);

create policy "Users can delete their own devices"
  on relay_devices for delete
  using (auth.uid() = user_id);


-- ============================================================================
-- Enable Realtime for relay_messages
-- ============================================================================
alter publication supabase_realtime add table relay_messages;
