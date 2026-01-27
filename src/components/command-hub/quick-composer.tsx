import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Play, Plus } from "lucide-react"

interface QuickComposerProps {
  repoName: string
}

export function QuickComposer({ repoName }: QuickComposerProps) {
  return (
    <Card className="shrink-0 border-border/60 bg-card/85 shadow-[0_18px_36px_var(--shadow-color)]">
      <CardHeader className="border-b border-border/60">
        <CardTitle className="text-sm">Quick composer</CardTitle>
        <CardDescription>Build custom commands for {repoName}.</CardDescription>
      </CardHeader>
      <CardContent className="grid min-h-0 gap-3 sm:grid-cols-[1.2fr_1fr]">
        <div className="space-y-2">
          <label className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
            base command
          </label>
          <Input
            className="h-9 border-border bg-background/80 text-xs"
            defaultValue="pnpm run"
          />
          <label className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
            arguments
          </label>
          <Input
            className="h-9 border-border bg-background/80 text-xs"
            placeholder="build --filter=desktop"
          />
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="border-border bg-card/70">
              <Play data-icon="inline-start" />
              Run now
            </Button>
            <Button variant="outline" size="sm" className="border-border bg-card/70">
              <Plus data-icon="inline-start" />
              Save command
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
            notes and variables
          </label>
          <Textarea
            className="min-h-[124px] border-border bg-background/80 text-xs"
            placeholder="ENV=production\nCACHE=false\n"
          />
          <div className="rounded-none border border-border/70 bg-accent/60 p-3 text-[0.65rem] text-muted-foreground">
            Tip: use {"{{repo}}"} and {"{{branch}}"} to inject context in
            real-time.
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
