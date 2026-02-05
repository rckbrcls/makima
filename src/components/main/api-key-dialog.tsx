import { useState, useCallback, useEffect } from "react";
import {
  CheckIcon,
  CircleIcon,
  KeyIcon,
  Loader2Icon,
  XIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useSettingsStore } from "@/stores/settings-store";
import { useChatProvider } from "@/hooks/use-chat-provider";
import type { Provider } from "@/lib/provider-types";
import type { AuthSourcePreference } from "@/lib/auth-types";
import { getPreferenceLabel, getPreferenceDescription } from "@/lib/auth-types";
import { cn } from "@/lib/utils";

interface APIKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: "openai" | "anthropic";
}

type ValidationStatus = "idle" | "validating" | "valid" | "invalid";

interface AuthSourceOptionProps {
  value: AuthSourcePreference;
  label: string;
  description: string;
  isSelected: boolean;
  isAvailable: boolean | null; // null = loading
  onSelect: () => void;
  badge?: React.ReactNode;
}

function AuthSourceOption({
  label,
  description,
  isSelected,
  isAvailable,
  onSelect,
  badge,
}: AuthSourceOptionProps) {
  const isLoading = isAvailable === null;
  const isDisabled = isAvailable === false;

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={isDisabled}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors",
        isSelected
          ? "border-sky-500 bg-sky-950"
          : isDisabled
            ? "border-border bg-muted cursor-not-allowed opacity-50"
            : "border-border bg-card hover:bg-muted",
      )}
    >
      <div className="mt-0.5">
        {isSelected ? (
          <div className="flex size-4 items-center justify-center rounded-full bg-sky-500">
            <CheckIcon className="size-2.5 text-sky-950" />
          </div>
        ) : (
          <CircleIcon className="text-muted-foreground size-4" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{label}</span>
          {badge}
          {isLoading && (
            <Loader2Icon className="text-muted-foreground ml-auto size-3.5 animate-spin" />
          )}
          {isAvailable === true && (
            <CheckIcon className="ml-auto size-3.5 text-emerald-500" />
          )}
          {isAvailable === false && (
            <XIcon className="text-muted-foreground ml-auto size-3.5" />
          )}
        </div>
        <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>
      </div>
    </button>
  );
}

export function APIKeyDialog({
  open,
  onOpenChange,
  initialTab = "openai",
}: APIKeyDialogProps) {
  const { providers, setProviderConfig } = useSettingsStore();
  const { validateApiKey, auth } = useChatProvider();

  const [activeTab, setActiveTab] = useState<"openai" | "anthropic">(
    initialTab,
  );
  const [openaiKey, setOpenaiKey] = useState(providers.openai.apiKey ?? "");
  const [anthropicKey, setAnthropicKey] = useState(
    providers.anthropic.apiKey ?? "",
  );
  const [openaiStatus, setOpenaiStatus] = useState<ValidationStatus>("idle");
  const [anthropicStatus, setAnthropicStatus] =
    useState<ValidationStatus>("idle");

  // Auth source preferences
  const [openaiPref, setOpenaiPref] = useState<AuthSourcePreference>(
    providers.openai.preferredAuthSource || "auto",
  );
  const [anthropicPref, setAnthropicPref] = useState<AuthSourcePreference>(
    providers.anthropic.preferredAuthSource || "auto",
  );

  // Refresh auth status when dialog opens
  useEffect(() => {
    if (open) {
      auth.refresh();
      // Reset to current saved values
      setOpenaiKey(providers.openai.apiKey ?? "");
      setAnthropicKey(providers.anthropic.apiKey ?? "");
      setOpenaiPref(providers.openai.preferredAuthSource || "auto");
      setAnthropicPref(providers.anthropic.preferredAuthSource || "auto");
      setOpenaiStatus("idle");
      setAnthropicStatus("idle");
    }
  }, [
    open,
    auth.refresh,
    providers.openai.apiKey,
    providers.anthropic.apiKey,
    providers.openai.preferredAuthSource,
    providers.anthropic.preferredAuthSource,
  ]);

  const handleTestConnection = useCallback(
    async (provider: "openai" | "anthropic") => {
      const key = provider === "openai" ? openaiKey : anthropicKey;
      const setStatus =
        provider === "openai" ? setOpenaiStatus : setAnthropicStatus;

      if (!key.trim()) {
        setStatus("invalid");
        return;
      }

      setStatus("validating");
      const isValid = await validateApiKey(provider as Provider, key);
      setStatus(isValid ? "valid" : "invalid");
    },
    [openaiKey, anthropicKey, validateApiKey],
  );

  const handleSave = useCallback(() => {
    // Save OpenAI config
    const openaiEnabled =
      openaiPref === "manual"
        ? !!openaiKey.trim()
        : (openaiPref === "environment" &&
            auth.openaiAvailability?.environment) ||
          (openaiPref === "auto" &&
            (auth.openaiAvailability?.environment || !!openaiKey.trim()));

    setProviderConfig("openai", {
      enabled: openaiEnabled,
      apiKey: openaiKey.trim() || undefined,
      preferredAuthSource: openaiPref,
    });

    // Save Anthropic config
    const anthropicEnabled =
      anthropicPref === "manual"
        ? !!anthropicKey.trim()
        : (anthropicPref === "environment" &&
            auth.anthropicAvailability?.environment) ||
          (anthropicPref === "auto" &&
            (auth.anthropicAvailability?.environment || !!anthropicKey.trim()));

    setProviderConfig("anthropic", {
      enabled: anthropicEnabled,
      apiKey: anthropicKey.trim() || undefined,
      preferredAuthSource: anthropicPref,
    });

    onOpenChange(false);
  }, [
    openaiKey,
    anthropicKey,
    openaiPref,
    anthropicPref,
    setProviderConfig,
    onOpenChange,
    auth.openaiAvailability,
    auth.anthropicAvailability,
  ]);

  const renderStatusIcon = (status: ValidationStatus) => {
    switch (status) {
      case "validating":
        return (
          <Loader2Icon className="text-muted-foreground size-4 animate-spin" />
        );
      case "valid":
        return <CheckIcon className="size-4 text-emerald-500" />;
      case "invalid":
        return <XIcon className="size-4 text-red-500" />;
      default:
        return null;
    }
  };

  const openaiAvail = auth.openaiAvailability;
  const anthropicAvail = auth.anthropicAvailability;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyIcon className="size-4" />
            API Keys
          </DialogTitle>
          <DialogDescription>
            Choose your preferred authentication source for each provider.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "openai" | "anthropic")}
        >
          <TabsList className="w-full">
            <TabsTrigger value="openai" className="flex-1">
              OpenAI
            </TabsTrigger>
            <TabsTrigger value="anthropic" className="flex-1">
              Anthropic
            </TabsTrigger>
          </TabsList>

          <TabsContent value="openai" className="mt-4 space-y-3">
            <Label className="text-muted-foreground text-xs tracking-wide uppercase">
              Auth Source
            </Label>

            <div className="space-y-2">
              <AuthSourceOption
                value="auto"
                label={getPreferenceLabel("auto")}
                description={getPreferenceDescription("auto", "openai")}
                isSelected={openaiPref === "auto"}
                isAvailable={true}
                onSelect={() => setOpenaiPref("auto")}
                badge={
                  <span className="rounded border border-zinc-500 bg-zinc-600 px-1.5 py-0.5 text-xs text-zinc-950">
                    Recommended
                  </span>
                }
              />

              <AuthSourceOption
                value="environment"
                label={getPreferenceLabel("environment")}
                description="Use OPENAI_API_KEY from environment"
                isSelected={openaiPref === "environment"}
                isAvailable={openaiAvail ? openaiAvail.environment : null}
                onSelect={() => setOpenaiPref("environment")}
                badge={
                  <span className="rounded border border-amber-500 bg-amber-600 px-1.5 py-0.5 text-xs text-amber-950">
                    ENV
                  </span>
                }
              />

              <AuthSourceOption
                value="manual"
                label={getPreferenceLabel("manual")}
                description="Use manually entered API key"
                isSelected={openaiPref === "manual"}
                isAvailable={true}
                onSelect={() => setOpenaiPref("manual")}
                badge={
                  <span className="rounded border border-sky-500 bg-sky-600 px-1.5 py-0.5 text-xs text-sky-950">
                    API Key
                  </span>
                }
              />
            </div>

            {(openaiPref === "manual" || openaiPref === "auto") && (
              <div className="border-border space-y-2 border-t pt-2">
                <Label htmlFor="openai-key">
                  {openaiPref === "manual"
                    ? "API Key"
                    : "Manual API Key (fallback)"}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="openai-key"
                    type="password"
                    placeholder="sk-..."
                    value={openaiKey}
                    onChange={(e) => {
                      setOpenaiKey(e.target.value);
                      setOpenaiStatus("idle");
                    }}
                  />
                  {renderStatusIcon(openaiStatus)}
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground text-xs">
                    Get your API key from{" "}
                    <a
                      href="https://platform.openai.com/api-keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-foreground underline underline-offset-2"
                    >
                      platform.openai.com
                    </a>
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTestConnection("openai")}
                    disabled={
                      !openaiKey.trim() || openaiStatus === "validating"
                    }
                  >
                    {openaiStatus === "validating" ? (
                      <>
                        <Loader2Icon className="mr-2 size-3 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      "Test"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="anthropic" className="mt-4 space-y-3">
            <Label className="text-muted-foreground text-xs tracking-wide uppercase">
              Auth Source
            </Label>

            <div className="space-y-2">
              <AuthSourceOption
                value="auto"
                label={getPreferenceLabel("auto")}
                description={getPreferenceDescription("auto", "anthropic")}
                isSelected={anthropicPref === "auto"}
                isAvailable={true}
                onSelect={() => setAnthropicPref("auto")}
                badge={
                  <span className="rounded border border-zinc-500 bg-zinc-600 px-1.5 py-0.5 text-xs text-zinc-950">
                    Recommended
                  </span>
                }
              />

              <AuthSourceOption
                value="environment"
                label={getPreferenceLabel("environment")}
                description="Use ANTHROPIC_API_KEY from environment"
                isSelected={anthropicPref === "environment"}
                isAvailable={anthropicAvail ? anthropicAvail.environment : null}
                onSelect={() => setAnthropicPref("environment")}
                badge={
                  <span className="rounded border border-amber-500 bg-amber-600 px-1.5 py-0.5 text-xs text-amber-950">
                    ENV
                  </span>
                }
              />

              <AuthSourceOption
                value="manual"
                label={getPreferenceLabel("manual")}
                description="Use manually entered API key"
                isSelected={anthropicPref === "manual"}
                isAvailable={true}
                onSelect={() => setAnthropicPref("manual")}
                badge={
                  <span className="rounded border border-sky-500 bg-sky-600 px-1.5 py-0.5 text-xs text-sky-950">
                    API Key
                  </span>
                }
              />
            </div>

            {(anthropicPref === "manual" || anthropicPref === "auto") && (
              <div className="border-border space-y-2 border-t pt-2">
                <Label htmlFor="anthropic-key">
                  {anthropicPref === "manual"
                    ? "API Key"
                    : "Manual API Key (fallback)"}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="anthropic-key"
                    type="password"
                    placeholder="sk-ant-..."
                    value={anthropicKey}
                    onChange={(e) => {
                      setAnthropicKey(e.target.value);
                      setAnthropicStatus("idle");
                    }}
                  />
                  {renderStatusIcon(anthropicStatus)}
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground text-xs">
                    Get your API key from{" "}
                    <a
                      href="https://console.anthropic.com/settings/keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-foreground underline underline-offset-2"
                    >
                      console.anthropic.com
                    </a>
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTestConnection("anthropic")}
                    disabled={
                      !anthropicKey.trim() || anthropicStatus === "validating"
                    }
                  >
                    {anthropicStatus === "validating" ? (
                      <>
                        <Loader2Icon className="mr-2 size-3 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      "Test"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
