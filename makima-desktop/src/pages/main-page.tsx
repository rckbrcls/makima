import { useState } from "react";
import { Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DirectionAwareTabs } from "@/components/ui/direction-aware-tabs";
import { TextureOverlay } from "@/components/ui/texture-overlay";
import { SettingsDialog } from "@/components/main/settings-dialog";
import { RunDetailsModal } from "@/components/main/run-details-modal";
import { useActiveTabId, useUIActions, useUIHydrated } from "@/stores";

import {
  ChatDomainProvider,
  ChatSidebar,
  ChatWorkspace,
} from "@/components/chat";
import {
  CodeTabSidebar,
  CodeTabWithProvider,
  CodeTabWorkspace,
} from "@/components/code/code-tab";

export function MainPage() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const activeTabId = useActiveTabId();
  const { setActiveTabId } = useUIActions();
  const hydrated = useUIHydrated();

  const tabs = [
    {
      id: 0,
      label: "chat",
      content: <ChatSidebar />,
    },
    {
      id: 1,
      label: "work",
      content: <div />,
    },
    {
      id: 2,
      label: "code",
      content: <CodeTabSidebar />,
    },
  ];

  const renderWorkspace = () => {
    switch (activeTabId) {
      case 0:
        return <ChatWorkspace />;
      case 1:
        return <div />;
      case 2:
        return <CodeTabWorkspace />;
      default:
        return <ChatWorkspace />;
    }
  };

  if (!hydrated) return null;

  return (
    <ChatDomainProvider>
      <CodeTabWithProvider>
          <div className="text-foreground relative h-full max-h-dvh min-h-0 w-full max-w-[100vw] overflow-hidden">
            <TextureOverlay texture="grid" className="mix-blend-overlay" />
            <div className="relative z-10 flex h-full min-h-0">
              {/* Sidebar */}
              <aside className="relative flex w-[300px] flex-col items-center">
                <DirectionAwareTabs
                  onChange={(tabId) => setActiveTabId(tabId)}
                  tabs={tabs}
                  className="mt-10 rounded-lg"
                  defaultTab={activeTabId}
                />
                <div className="absolute right-3 bottom-3 left-3">
                  <Button
                    variant="ghost"
                    className="glass glass-solid glass-hover w-full justify-start gap-2 rounded-lg"
                    onClick={() => setSettingsOpen(true)}
                  >
                    <Settings className="size-4" />
                    Settings
                  </Button>
                </div>

                <SettingsDialog
                  open={settingsOpen}
                  onOpenChange={setSettingsOpen}
                />
              </aside>

              {/* Workspace */}
              <main className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
                {renderWorkspace()}
              </main>
            </div>

            <RunDetailsModal activeRun={null} onClose={() => {}} />
          </div>
        </CodeTabWithProvider>
    </ChatDomainProvider>
  );
}
