import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ModeToggle } from "@/components/mode-toggle"
import {
  Shield,
  Zap,
  RefreshCw,
  Menu,
  Search,
} from "lucide-react"
import type { BridgeMode } from "@/components/agents/types"

interface PageHeaderProps {
  mode: BridgeMode
  pendingCount: number
  onToggleMode: () => void
  onOpenApprovals: () => void
  onRefresh?: () => void
  onMenuClick?: () => void
  showSearch?: boolean
  searchPlaceholder?: string
  onSearch?: (query: string) => void
}

export function PageHeader({
  mode,
  pendingCount,
  onToggleMode,
  onOpenApprovals,
  onRefresh,
  onMenuClick,
  showSearch = true,
  searchPlaceholder = "Search...",
  onSearch,
}: PageHeaderProps) {
  return (
    <header className="flex items-center px-4 fixed top-0 left-0 right-0 justify-between gap-4 border-b z-50 border-border h-14 bg-card" data-tauri-drag-region>
      <div className="flex items-center ml-22">
        {/* <div className="flex size-6 items-center justify-center shrink-0 overflow-hidden">
          <img
            src="/white-logo.png"
            alt="Logo"
            className="hidden h-full w-auto object-contain dark:block"
          />
          <img
            src="/black-logo.png"
            alt="Logo"
            className="block h-full w-auto object-contain dark:hidden"
          />
        </div> */}
        <span className="text-xl tracking-0 whitespace-nowrap text-primary font-serif font-bold">
          MAKIMA
        </span>
      </div>

      <div className="flex items-center gap-2">
        {onMenuClick && (
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onMenuClick}
          >
            <Menu className="size-5" />
          </Button>
        )}
        {showSearch && (
          <div className="relative hidden w-full min-w-[180px] max-w-xs sm:block">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              className="h-9 rounded-full border-border bg-card pl-8 text-xs"
              onChange={(e) => onSearch?.(e.target.value)}
            />
          </div>
        )}
        {/* Mode Toggle */}
        <ModeToggleSafe mode={mode} onToggle={onToggleMode} />

        {/* Approvals Button */}
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-2"
          onClick={onOpenApprovals}
        >
          <Shield className="size-3.5" />
          <span className="hidden sm:inline">Approvals</span>
          {pendingCount > 0 && (
            <Badge variant="destructive" className="text-[0.55rem] h-4 px-1">
              {pendingCount}
            </Badge>
          )}
        </Button>

        {/* Theme toggle */}
        <ModeToggle />

        {/* Refresh */}
        {onRefresh && (
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={onRefresh}
          >
            <RefreshCw className="size-3.5" />
          </Button>
        )}
      </div>
    </header>
  )
}

// Safe/Auto mode toggle component
interface ModeToggleSafeProps {
  mode: BridgeMode
  onToggle: () => void
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
  )
}
