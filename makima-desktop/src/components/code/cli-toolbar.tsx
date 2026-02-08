import {
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CliToolbarProps {
  repositoryName?: string;
  isAgentPanelCollapsed?: boolean;
  onToggleAgentPanel?: () => void;
  isGitPanelCollapsed?: boolean;
  onToggleGitPanel?: () => void;
}

export function CliToolbar({
  repositoryName,
  isAgentPanelCollapsed,
  onToggleAgentPanel,
  isGitPanelCollapsed,
  onToggleGitPanel,
}: CliToolbarProps) {
  return (
    <div className="bg-background border-border flex items-center gap-3 rounded-xl border px-4 py-2">
      {/* Repository name */}
      {repositoryName && (
        <span className="text-foreground truncate text-xs font-medium">
          {repositoryName}
        </span>
      )}

      <div className="flex-1" />

      {/* Panel toggles */}
      {(onToggleAgentPanel || onToggleGitPanel) && (
        <div className="flex items-center gap-1">
          {onToggleAgentPanel && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={onToggleAgentPanel}
                >
                  {isAgentPanelCollapsed ? (
                    <PanelLeftOpen className="size-3.5" />
                  ) : (
                    <PanelLeftClose className="size-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <span className="flex items-center gap-1.5">
                  {isAgentPanelCollapsed ? "Show" : "Hide"} Agent
                  <kbd className="bg-background text-muted-foreground rounded px-1 py-0.5 font-mono text-[10px]">
                    ⌘B
                  </kbd>
                </span>
              </TooltipContent>
            </Tooltip>
          )}

          {onToggleGitPanel && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={onToggleGitPanel}
                >
                  {isGitPanelCollapsed ? (
                    <PanelRightOpen className="size-3.5" />
                  ) : (
                    <PanelRightClose className="size-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <span className="flex items-center gap-1.5">
                  {isGitPanelCollapsed ? "Show" : "Hide"} Git Changes
                  <kbd className="bg-background text-muted-foreground rounded px-1 py-0.5 font-mono text-[10px]">
                    ⌥⌘B
                  </kbd>
                </span>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      )}
    </div>
  );
}
