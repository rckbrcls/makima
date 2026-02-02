import {
  Activity,
  Calendar,
  Database,
  Eye,
  FileText,
  GitBranch,
  Globe,
  Grid3x3,
  Hash,
  Mail,
  MessageCircle,
  MessageSquare,
  MessagesSquare,
  Mic,
  Phone,
  Search,
  Send,
  Shield,
  Smartphone,
  Terminal,
  Tv,
  Users,
  Wrench,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const environmentOptions = [
  { value: "dev", label: "Dev" },
  { value: "staging", label: "Staging" },
  { value: "prod", label: "Prod" },
];

export const languageOptions = [
  { value: "pt-BR", label: "pt-BR" },
  { value: "en-US", label: "en-US" },
  { value: "es-ES", label: "es-ES" },
];

export const toneOptions = [
  { value: "balanced", label: "Balanced" },
  { value: "direct", label: "Direct" },
  { value: "creative", label: "Creative" },
  { value: "concise", label: "Concise" },
];

export const providerOptions = [
  { value: "openclaw", label: "openClaw Cloud" },
  { value: "anthropic", label: "Anthropic" },
  { value: "openai", label: "OpenAI" },
  { value: "local", label: "Local Runtime" },
];

export const modelOptions = [
  { value: "claw-sonic", label: "Claw Sonic" },
  { value: "claw-vision", label: "Claw Vision" },
  { value: "claude-sonnet", label: "Claude Sonnet" },
  { value: "gpt-4o", label: "GPT-4o" },
];

export const logLevelOptions = [
  { value: "debug", label: "Debug" },
  { value: "info", label: "Info" },
  { value: "warn", label: "Warn" },
  { value: "error", label: "Error" },
];

export const toolDefaults = {
  fileRead: true,
  fileWrite: true,
  shell: false,
  git: true,
  browser: true,
  webSearch: true,
  memoryTools: true,
  vision: false,
  audio: false,
  calendar: false,
  email: false,
  database: false,
};

export type ToolKey = keyof typeof toolDefaults;

export const toolItems: Array<{
  key: ToolKey;
  label: string;
  description: string;
  icon: LucideIcon;
  tag?: string;
  tagClassName?: string;
}> = [
  {
    key: "fileRead",
    label: "File Read",
    description: "Read files and repositories",
    icon: FileText,
  },
  {
    key: "fileWrite",
    label: "File Write",
    description: "Local creation and editing",
    icon: Wrench,
  },
  {
    key: "shell",
    label: "Shell",
    description: "Commands and scripts",
    icon: Terminal,
  },
  {
    key: "git",
    label: "Git",
    description: "Commit, diff, and PRs",
    icon: GitBranch,
  },
  {
    key: "browser",
    label: "Browser",
    description: "Assisted navigation",
    icon: Globe,
  },
  {
    key: "webSearch",
    label: "Web Search",
    description: "Search and external sources",
    icon: Search,
  },
  {
    key: "memoryTools",
    label: "Memory",
    description: "Vectors and summary",
    icon: Database,
  },
  { key: "vision", label: "Vision", description: "Visual analysis", icon: Eye },
  {
    key: "audio",
    label: "Audio",
    description: "Voice input and output",
    icon: Mic,
  },
  {
    key: "calendar",
    label: "Calendar",
    description: "Calendar and reminders",
    icon: Calendar,
  },
  { key: "email", label: "Email", description: "Send and read", icon: Mail },
  {
    key: "database",
    label: "Database",
    description: "SQL and connectors",
    icon: Database,
  },
];

export const channelDefaults = {
  whatsapp: false,
  telegram: true,
  discord: true,
  slack: true,
  googleChat: false,
  signal: false,
  imessage: false,
  webChat: true,
  microsoftTeams: false,
  line: false,
  matrix: false,
  nostr: false,
  tlon: false,
  twitch: false,
  zalo: false,
  zaloPersonal: false,
};

export type ChannelKey = keyof typeof channelDefaults;

export const channelItems: Array<{
  key: ChannelKey;
  label: string;
  description: string;
  icon: LucideIcon;
  tag?: string;
  tagClassName?: string;
}> = [
  {
    key: "whatsapp",
    label: "WhatsApp",
    description: "Official and scalable support",
    icon: Phone,
  },
  {
    key: "telegram",
    label: "Telegram",
    description: "Bots, groups, and channels",
    icon: Send,
  },
  {
    key: "discord",
    label: "Discord",
    description: "Servers, threads, and DMs",
    icon: MessageSquare,
  },
  {
    key: "slack",
    label: "Slack",
    description: "Workspaces and internal channels",
    icon: MessagesSquare,
  },
  {
    key: "googleChat",
    label: "Google Chat",
    description: "Spaces and direct messages",
    icon: MessageCircle,
  },
  {
    key: "signal",
    label: "Signal",
    description: "Encrypted private conversations",
    icon: Shield,
  },
  {
    key: "imessage",
    label: "iMessage (BlueBubbles)",
    description: "Bridge for macOS/iOS",
    icon: Smartphone,
    tag: "Plugin required",
    tagClassName: "border-yellow-400 text-amber-500",
  },
  {
    key: "webChat",
    label: "WebChat",
    description: "Widget and embed on websites",
    icon: Globe,
  },
  {
    key: "microsoftTeams",
    label: "Microsoft Teams",
    description: "Corporate channels and bots",
    icon: Users,
    tag: "Plugin required",
    tagClassName: "border-yellow-400 text-yellow-500",
  },
  {
    key: "line",
    label: "LINE",
    description: "Mobile messaging for Asia",
    icon: MessageCircle,
    tag: "Plugin required",
    tagClassName: "border-yellow-400 text-yellow-500",
  },
  {
    key: "matrix",
    label: "Matrix",
    description: "Federated rooms and bridges",
    icon: Grid3x3,
    tag: "Plugin required",
    tagClassName: "border-yellow-400 text-yellow-500",
  },
  {
    key: "nostr",
    label: "Nostr",
    description: "Decentralized protocols",
    icon: Zap,
    tag: "Plugin required",
    tagClassName: "border-yellow-400 text-yellow-500",
  },
  {
    key: "tlon",
    label: "Tlon",
    description: "Private communities and groups",
    icon: Hash,
    tag: "Plugin required",
    tagClassName: "border-yellow-400 text-yellow-500",
  },
  {
    key: "twitch",
    label: "Twitch",
    description: "Live chat and moderation",
    icon: Tv,
    tag: "Plugin required",
    tagClassName: "border-yellow-400 text-yellow-500",
  },
  {
    key: "zalo",
    label: "Zalo",
    description: "Regional corporate messaging",
    icon: MessageCircle,
    tag: "Plugin required",
    tagClassName: "border-yellow-400 text-yellow-500",
  },
  {
    key: "zaloPersonal",
    label: "Zalo Personal",
    description: "Personal accounts and automation",
    icon: MessageCircle,
    tag: "Plugin required",
    tagClassName: "border-yellow-400 text-yellow-500",
  },
];

export const pluginDefaults = {
  voiceCall: false,
  microsoftTeams: false,
  matrix: false,
  nostr: false,
  line: false,
  tlon: false,
  twitch: false,
  zalo: false,
  zaloPersonal: false,
  bluebubbles: false,
};

export type PluginKey = keyof typeof pluginDefaults;

export const pluginItems: Array<{
  key: PluginKey;
  label: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    key: "voiceCall",
    label: "Voice Call",
    description: "Voice input and output",
    icon: Mic,
  },
  {
    key: "microsoftTeams",
    label: "Microsoft Teams",
    description: "Official channel connector",
    icon: Users,
  },
  {
    key: "matrix",
    label: "Matrix",
    description: "Connector for federated networks",
    icon: Grid3x3,
  },
  {
    key: "nostr",
    label: "Nostr",
    description: "Decentralized relay and identity",
    icon: Zap,
  },
  {
    key: "line",
    label: "LINE",
    description: "LINE channel activation",
    icon: MessageCircle,
  },
  {
    key: "tlon",
    label: "Tlon",
    description: "Connection to private communities",
    icon: Hash,
  },
  {
    key: "twitch",
    label: "Twitch",
    description: "Live chat integration",
    icon: Tv,
  },
  {
    key: "zalo",
    label: "Zalo",
    description: "Business connector",
    icon: MessageCircle,
  },
  {
    key: "zaloPersonal",
    label: "Zalo Personal",
    description: "Personal account connector",
    icon: MessageCircle,
  },
  {
    key: "bluebubbles",
    label: "BlueBubbles",
    description: "iMessage bridge",
    icon: Smartphone,
  },
];

export const safetyDefaults = {
  approvals: true,
  safeMode: true,
  redactPii: true,
  secretsScan: true,
  allowNetwork: false,
  sandboxWrite: true,
};

export type SafetyKey = keyof typeof safetyDefaults;

export const automationDefaults = {
  schedules: true,
  webhooks: true,
  repoWatch: false,
  autoRecovery: true,
};

export type AutomationKey = keyof typeof automationDefaults;

export const memoryDefaults = {
  shortTerm: true,
  longTerm: true,
  summarization: true,
  vectorIndex: true,
};

export type MemoryKey = keyof typeof memoryDefaults;

export const integrationDefaults = {
  slack: false,
  github: true,
  jira: false,
  notion: false,
};

export type IntegrationKey = keyof typeof integrationDefaults;

export const notificationDefaults = {
  desktop: true,
  email: false,
  incident: true,
};

export type NotificationKey = keyof typeof notificationDefaults;
