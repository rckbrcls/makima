-- ============================================================================
-- Push Notification Trigger
-- Fires when an approval_request message is inserted for mobile
-- ============================================================================

-- Enable pg_net for HTTP calls from Postgres
create extension if not exists "pg_net" with schema extensions;

-- Function that sends push notification via the send-push Edge Function
create or replace function notify_mobile_approval()
returns trigger
language plpgsql
security definer
as $$
declare
  v_user_id uuid;
  v_device record;
  v_tool_name text;
  v_description text;
  v_supabase_url text;
  v_service_key text;
begin
  -- Only fire for approval_request messages going to mobile
  if new.message_type != 'approval_request' or new.direction != 'desktop_to_mobile' then
    return new;
  end if;

  -- Get the user_id from the session
  select user_id into v_user_id
  from relay_sessions
  where id = new.session_id;

  if v_user_id is null then
    return new;
  end if;

  -- Extract tool info from payload
  v_tool_name := coalesce(new.payload->>'toolName', 'Unknown tool');
  v_description := coalesce(new.payload->>'description', v_tool_name);

  -- Find user's device tokens
  for v_device in
    select apns_token, device_name
    from relay_devices
    where user_id = v_user_id
  loop
    -- Call the send-push Edge Function via pg_net
    -- The Edge Function URL is constructed from the Supabase project URL
    v_supabase_url := current_setting('app.settings.supabase_url', true);
    v_service_key := current_setting('app.settings.service_role_key', true);

    if v_supabase_url is not null and v_service_key is not null then
      perform extensions.http_post(
        url := v_supabase_url || '/functions/v1/send-push',
        body := json_build_object(
          'deviceToken', v_device.apns_token,
          'title', 'Approval Required',
          'body', v_tool_name || ': ' || v_description,
          'data', json_build_object(
            'type', 'approval_request',
            'sessionId', new.session_id::text,
            'approvalId', (new.payload->>'approvalId')::text
          )
        )::text,
        headers := json_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_service_key
        )::jsonb
      );
    end if;
  end loop;

  return new;
end;
$$;

-- Create trigger
create trigger on_approval_request_notify
  after insert on relay_messages
  for each row
  execute function notify_mobile_approval();
