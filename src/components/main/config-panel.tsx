import {
  Bot,
  Clock,
  Cloud,
  Database,
  Mail,
  MessageCircle,
  Plug,
  Shield,
  Wrench,
} from "lucide-react";
import {
  channelItems,
  logLevelOptions,
  modelOptions,
  pluginItems,
  toolItems,
} from "./config-types";
import type {
  AutomationKey,
  ChannelKey,
  IntegrationKey,
  MemoryKey,
  NotificationKey,
  PluginKey,
  SafetyKey,
  ToolKey
} from "./config-types";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";


interface ToggleCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  tag?: string;
  tagClassName?: string;
}

function ToggleCard({
  title,
  description,
  icon: Icon,
  checked,
  onCheckedChange,
  tag,
  tagClassName,
}: ToggleCardProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border p-3 transition-colors",
      )}
    >
      <div className="border-border bg-muted flex size-9 items-center justify-center rounded-md border">
        <Icon className="text-muted-foreground size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-foreground text-sm font-medium">{title}</p>
          {tag ? (
            <Badge
              variant="outline"
              className={cn("h-4 text-[10px]", tagClassName)}
            >
              {tag}
            </Badge>
          ) : null}
        </div>
        <p className="text-muted-foreground text-xs">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

interface InlineToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

function InlineToggle({
  label,
  description,
  checked,
  onCheckedChange,
}: InlineToggleProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-1">
        <span className="text-sm font-medium">{label}</span>
        <p className="text-muted-foreground text-xs">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

interface ConfigPanelProps {
  model: string;
  setModel: (value: string) => void;
  temperature: string;
  setTemperature: (value: string) => void;
  maxTokens: string;
  setMaxTokens: (value: string) => void;
  contextWindow: string;
  setContextWindow: (value: string) => void;
  runtimeConcurrency: string;
  setRuntimeConcurrency: (value: string) => void;
  executionTimeout: string;
  setExecutionTimeout: (value: string) => void;
  gpuEnabled: boolean;
  setGpuEnabled: (value: boolean) => void;
  logLevel: string;
  setLogLevel: (value: string) => void;
  traceSample: string;
  setTraceSample: (value: string) => void;
  tools: Record<ToolKey, boolean>;
  handleToolChange: (key: ToolKey, checked: boolean) => void;
  channels: Record<ChannelKey, boolean>;
  handleChannelChange: (key: ChannelKey, checked: boolean) => void;
  plugins: Record<PluginKey, boolean>;
  handlePluginChange: (key: PluginKey, checked: boolean) => void;
  safety: Record<SafetyKey, boolean>;
  handleSafetyChange: (key: SafetyKey, checked: boolean) => void;
  automation: Record<AutomationKey, boolean>;
  handleAutomationChange: (key: AutomationKey, checked: boolean) => void;
  memory: Record<MemoryKey, boolean>;
  handleMemoryChange: (key: MemoryKey, checked: boolean) => void;
  integrations: Record<IntegrationKey, boolean>;
  handleIntegrationChange: (key: IntegrationKey, checked: boolean) => void;
  notifications: Record<NotificationKey, boolean>;
  handleNotificationChange: (key: NotificationKey, checked: boolean) => void;
}

export function ConfigPanel({
  model,
  setModel,
  temperature,
  setTemperature,
  maxTokens,
  setMaxTokens,
  contextWindow,
  setContextWindow,
  runtimeConcurrency,
  setRuntimeConcurrency,
  executionTimeout,
  setExecutionTimeout,
  gpuEnabled,
  setGpuEnabled,
  logLevel,
  setLogLevel,
  traceSample,
  setTraceSample,
  tools,
  handleToolChange,
  channels,
  handleChannelChange,
  plugins,
  handlePluginChange,
  safety,
  handleSafetyChange,
  automation,
  handleAutomationChange,
  memory,
  handleMemoryChange,
  integrations,
  handleIntegrationChange,
  notifications,
  handleNotificationChange,
}: ConfigPanelProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="size-4" />
              Model Configuration
            </CardTitle>
            <CardDescription>LLM parameters and constraints</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Model</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {modelOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="temperature">Temperature</Label>
                <Input
                  id="temperature"
                  type="number"
                  step="0.1"
                  value={temperature}
                  onChange={(event) => setTemperature(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxTokens">Max tokens</Label>
                <Input
                  id="maxTokens"
                  type="number"
                  value={maxTokens}
                  onChange={(event) => setMaxTokens(event.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contextWindow">Context window</Label>
              <Input
                id="contextWindow"
                value={contextWindow}
                onChange={(event) => setContextWindow(event.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Cloud className="size-4" />
              Runtime and Resources
            </CardTitle>
            <CardDescription>openClaw executor limits</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="concurrency">Concurrency</Label>
                <Input
                  id="concurrency"
                  type="number"
                  value={runtimeConcurrency}
                  onChange={(event) =>
                    setRuntimeConcurrency(event.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timeout">Timeout (s)</Label>
                <Input
                  id="timeout"
                  type="number"
                  value={executionTimeout}
                  onChange={(event) => setExecutionTimeout(event.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Allowed workspace</Label>
              <Input placeholder="/repos, /configs, /data" />
            </div>
            <InlineToggle
              label="GPU assisted"
              description="Enables GPU resources for heavy tasks"
              checked={gpuEnabled}
              onCheckedChange={setGpuEnabled}
            />
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wrench className="size-4" />
            Tools and Access
          </CardTitle>
          <CardDescription>Enable what Jarvis can execute</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {toolItems.map((tool) => (
              <ToggleCard
                key={tool.key}
                title={tool.label}
                description={tool.description}
                icon={tool.icon}
                checked={tools[tool.key]}
                tag={tool.tag}
                tagClassName={tool.tagClassName}
                onCheckedChange={(checked) =>
                  handleToolChange(tool.key, checked)
                }
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageCircle className="size-4" />
            Channels
          </CardTitle>
          <CardDescription>Where Jarvis serves end users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {channelItems.map((channel) => (
              <ToggleCard
                key={channel.key}
                title={channel.label}
                description={channel.description}
                icon={channel.icon}
                checked={channels[channel.key]}
                tag={channel.tag}
                tagClassName={channel.tagClassName}
                onCheckedChange={(checked) =>
                  handleChannelChange(channel.key, checked)
                }
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plug className="size-4" />
            Plugins
          </CardTitle>
          <CardDescription>
            Official extensions to enable channels
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {pluginItems.map((plugin) => (
              <ToggleCard
                key={plugin.key}
                title={plugin.label}
                description={plugin.description}
                icon={plugin.icon}
                checked={plugins[plugin.key]}
                onCheckedChange={(checked) =>
                  handlePluginChange(plugin.key, checked)
                }
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="size-4" />
              Memory and Context
            </CardTitle>
            <CardDescription>
              Persistence and continuous summary
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <InlineToggle
              label="Short-term memory"
              description="Current session context"
              checked={memory.shortTerm}
              onCheckedChange={(checked) =>
                handleMemoryChange("shortTerm", checked)
              }
            />
            <InlineToggle
              label="Long-term memory"
              description="History between sessions"
              checked={memory.longTerm}
              onCheckedChange={(checked) =>
                handleMemoryChange("longTerm", checked)
              }
            />
            <InlineToggle
              label="Automatic summaries"
              description="Compacts long conversations"
              checked={memory.summarization}
              onCheckedChange={(checked) =>
                handleMemoryChange("summarization", checked)
              }
            />
            <InlineToggle
              label="Vector index"
              description="Semantic search and retrieval"
              checked={memory.vectorIndex}
              onCheckedChange={(checked) =>
                handleMemoryChange("vectorIndex", checked)
              }
            />
            <div className="space-y-2">
              <Label>Retention days</Label>
              <Input type="number" defaultValue="30" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="size-4" />
              Automations
            </CardTitle>
            <CardDescription>Clawdbot triggers and routines</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <InlineToggle
              label="Schedules"
              description="Executes jobs by cron"
              checked={automation.schedules}
              onCheckedChange={(checked) =>
                handleAutomationChange("schedules", checked)
              }
            />
            <InlineToggle
              label="Webhooks"
              description="Receives external events"
              checked={automation.webhooks}
              onCheckedChange={(checked) =>
                handleAutomationChange("webhooks", checked)
              }
            />
            <InlineToggle
              label="Repo watch"
              description="Watches commits and branches"
              checked={automation.repoWatch}
              onCheckedChange={(checked) =>
                handleAutomationChange("repoWatch", checked)
              }
            />
            <InlineToggle
              label="Auto recovery"
              description="Restarts failed flows"
              checked={automation.autoRecovery}
              onCheckedChange={(checked) =>
                handleAutomationChange("autoRecovery", checked)
              }
            />
            <div className="space-y-2">
              <Label htmlFor="cron">Main cron</Label>
              <Input id="cron" placeholder="0 */6 * * *" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Cloud className="size-4" />
              Integrations
            </CardTitle>
            <CardDescription>openClaw external connectors</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <InlineToggle
              label="GitHub"
              description="Repo sync and PRs"
              checked={integrations.github}
              onCheckedChange={(checked) =>
                handleIntegrationChange("github", checked)
              }
            />
            <InlineToggle
              label="Slack"
              description="Alerts and commands"
              checked={integrations.slack}
              onCheckedChange={(checked) =>
                handleIntegrationChange("slack", checked)
              }
            />
            <InlineToggle
              label="Jira"
              description="Tickets and backlog"
              checked={integrations.jira}
              onCheckedChange={(checked) =>
                handleIntegrationChange("jira", checked)
              }
            />
            <InlineToggle
              label="Notion"
              description="Docs and bases"
              checked={integrations.notion}
              onCheckedChange={(checked) =>
                handleIntegrationChange("notion", checked)
              }
            />
            <div className="space-y-2">
              <Label>Base webhook</Label>
              <Input placeholder="https://hooks..." />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Mail className="size-4" />
              Notifications
            </CardTitle>
            <CardDescription>Jarvis alerts and channels</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <InlineToggle
              label="Desktop"
              description="Local notifications"
              checked={notifications.desktop}
              onCheckedChange={(checked) =>
                handleNotificationChange("desktop", checked)
              }
            />
            <InlineToggle
              label="Email"
              description="Daily summary"
              checked={notifications.email}
              onCheckedChange={(checked) =>
                handleNotificationChange("email", checked)
              }
            />
            <InlineToggle
              label="Incident"
              description="Critical warnings"
              checked={notifications.incident}
              onCheckedChange={(checked) =>
                handleNotificationChange("incident", checked)
              }
            />
            <div className="space-y-2">
              <Label>Default channel</Label>
              <Input placeholder="#jarvis-alerts" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="size-4" />
            Security and Approvals
          </CardTitle>
          <CardDescription>Critical policies and controls</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <InlineToggle
            label="Manual approvals"
            description="Requires confirmation for sensitive actions"
            checked={safety.approvals}
            onCheckedChange={(checked) =>
              handleSafetyChange("approvals", checked)
            }
          />
          <InlineToggle
            label="Safe mode"
            description="Blocks destructive commands"
            checked={safety.safeMode}
            onCheckedChange={(checked) =>
              handleSafetyChange("safeMode", checked)
            }
          />
          <InlineToggle
            label="PII redaction"
            description="Removes sensitive data from logs"
            checked={safety.redactPii}
            onCheckedChange={(checked) =>
              handleSafetyChange("redactPii", checked)
            }
          />
          <InlineToggle
            label="Secrets scanner"
            description="Detects keys and tokens"
            checked={safety.secretsScan}
            onCheckedChange={(checked) =>
              handleSafetyChange("secretsScan", checked)
            }
          />
          <InlineToggle
            label="External network"
            description="Allows external http calls"
            checked={safety.allowNetwork}
            onCheckedChange={(checked) =>
              handleSafetyChange("allowNetwork", checked)
            }
          />
          <InlineToggle
            label="Write sandbox"
            description="Restricts writing outside the workspace"
            checked={safety.sandboxWrite}
            onCheckedChange={(checked) =>
              handleSafetyChange("sandboxWrite", checked)
            }
          />
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Cloud className="size-4" />
            Observability
          </CardTitle>
          <CardDescription>Logs, traces, and diagnostics</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Log level</Label>
              <Select value={logLevel} onValueChange={setLogLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {logLevelOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="traceSample">Trace sampling (%)</Label>
              <Input
                id="traceSample"
                type="number"
                value={traceSample}
                onChange={(event) => setTraceSample(event.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Metrics endpoint</Label>
            <Input placeholder="http://localhost:9090/metrics" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
