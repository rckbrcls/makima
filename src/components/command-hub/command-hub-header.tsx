import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ModeToggle } from "@/components/mode-toggle"
import { Menu, Plus, Search, Sparkles, Terminal } from "lucide-react"

interface CommandHubHeaderProps {
  onMenuClick: () => void
}

export function CommandHubHeader({ onMenuClick }: CommandHubHeaderProps) {
  return (
    <header className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Mobile menu trigger */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onMenuClick}
          >
            <Menu className="size-5" />
          </Button>
          <div className="flex size-12 items-center justify-center border border-border/70 bg-card/70 shadow-[0_8px_20px_var(--shadow-color)]">
            <Terminal className="size-5 text-primary" />
          </div>
          <div>
            <p className="text-[0.6rem] uppercase tracking-[0.4em] text-muted-foreground">
              Command panel
            </p>
            <h1 className="text-2xl font-semibold">Commander</h1>
            <p className="text-xs text-muted-foreground">
              Orchestrate build, run and deploy per repository in one place.
            </p>
          </div>
        </div>
        <div className="flex flex-1 flex-wrap items-center justify-end gap-2 min-[480px]:flex-nowrap">
          <div className="relative w-full min-w-[220px] max-w-sm">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search commands, repos or tags"
              className="h-9 border-border bg-background/80 pl-8 text-xs shadow-sm"
            />
          </div>
          <ModeToggle />
          <Button variant="outline" className="h-9 border-border bg-card/70 text-xs">
            <Sparkles data-icon="inline-start" />
            Auto-setup
          </Button>
          <Button className="h-9 bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus data-icon="inline-start" />
            New repo
          </Button>
        </div>
      </div>
    </header>
  )
}
