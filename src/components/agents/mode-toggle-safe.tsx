import { Shield, Zap } from "lucide-react";
import type { BridgeMode } from "./types";
import { Button } from "@/components/ui/button";

// Safe/Auto mode toggle component
interface ModeToggleSafeProps {
  mode: BridgeMode;
  onToggle: () => void;
}

export function ModeToggleSafe({ mode, onToggle }: ModeToggleSafeProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="h-8 gap-2"
      onClick={onToggle}
    >
      {mode === "safe" ? (
        <>
          <Shield className="size-3.5 text-yellow-500" />
          <span className="hidden sm:inline">Safe</span>
        </>
      ) : (
        <>
          <Zap className="size-3.5 text-green-500" />
          <span className="hidden sm:inline">Auto</span>
        </>
      )}
    </Button>
  );
}
