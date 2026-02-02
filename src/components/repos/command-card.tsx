import { AlertTriangle, Clock, Pencil, Play, Trash2 } from "lucide-react";
import { QuickComposer } from "./quick-composer";
import type { Command } from "./types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { statusStyles, typeIcons } from "@/lib/command-hub/constants";

interface CommandCardProps {
  command: Command;
  index: number;
  onRun?: (command: Command) => void;
  onDelete?: (command: Command) => void;
  onUpdateCommand?: (command: Command) => void | Promise<void>;
}

export function CommandCard({
  command,
  index,
  onRun,
  onDelete,
  onUpdateCommand,
}: CommandCardProps) {
  const Icon = typeIcons[command.type];

  // If command is running, editing should be disabled.
  // We can condition the rendering of QuickComposer or pass disabled state to it.
  // QuickComposer wrapper (ExpandableScreenTrigger) doesn't support disabled prop directly on it?
  // We should conditionally wrap or render disabled button.
  // If disabled, just render disabled button.
  // If enabled, wrap with QuickComposer.

  const isRunning = command.status === "running";
  const canEdit = !isRunning && !!onUpdateCommand;

  return (
    <Card
      size="sm"
      className={cn(
        "border-border bg-card animate-in fade-in slide-in-from-bottom-8 shrink-0 duration-700",
        index % 2 === 0 ? "delay-200" : "delay-300",
      )}
    >
      <CardHeader className="border-border/60 border-b">
        <CardTitle className="flex items-center gap-2 text-sm">
          <span className="border-border bg-muted text-foreground/80 flex size-7 items-center justify-center border">
            <Icon className="size-4" />
          </span>
          {command.name}
        </CardTitle>
        <CardAction>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                "text-[0.6rem] uppercase",
                statusStyles[command.status],
              )}
            >
              {command.status}
            </Badge>

            {canEdit ? (
              <QuickComposer
                repoName={command.repo}
                editingCommand={command}
                onUpdateCommand={onUpdateCommand}
                // onRunCommand is likely not needed here for editing config, or we can add it if needed.
              >
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="text-muted-foreground hover:text-primary"
                  aria-label={`Edit ${command.name}`}
                >
                  <Pencil className="size-3" />
                </Button>
              </QuickComposer>
            ) : (
              <Button
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground hover:text-primary"
                aria-label={`Edit ${command.name}`}
                disabled
              >
                <Pencil className="size-3" />
              </Button>
            )}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="text-muted-foreground hover:text-destructive"
                  aria-label={`Delete ${command.name}`}
                  disabled={command.status === "running" || !onDelete}
                >
                  <Trash2 className="size-3" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent size="sm">
                <AlertDialogHeader>
                  <AlertDialogMedia className="text-destructive">
                    <AlertTriangle />
                  </AlertDialogMedia>
                  <AlertDialogTitle>Delete command?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes {command.name} from {command.repo}.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel size="sm">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    size="sm"
                    variant="destructive"
                    onClick={() => onDelete?.(command)}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardAction>
        <CardDescription className="text-muted-foreground text-[0.7rem]">
          {command.command}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-muted-foreground flex items-center justify-between text-[0.65rem]">
          <span>last run: {command.lastRun}</span>
          <span className="text-foreground/80">time: {command.duration}</span>
        </div>
        <div className="border-border bg-muted h-1 w-full overflow-hidden border">
          <div
            className={cn(
              "h-full",
              command.status === "running"
                ? "from-chart-1 via-chart-2 to-chart-1/80 w-3/4 animate-[shimmer_2.8s_linear_infinite] bg-gradient-to-r bg-[length:200%_100%]"
                : command.status === "queued"
                  ? "bg-chart-4/80 w-1/3"
                  : command.status === "failed"
                    ? "bg-destructive/70 w-full"
                    : command.status === "stopped"
                      ? "bg-muted-foreground/70 w-full"
                      : command.status === "success"
                        ? "bg-chart-1/70 w-full"
                        : "w-0",
            )}
          />
        </div>
      </CardContent>
      <CardFooter className="justify-between">
        <div className="text-muted-foreground flex items-center gap-2 text-[0.65rem]">
          <Clock className="size-3" />
          scheduled at 14:30
        </div>
        <Button
          size="xs"
          className="bg-primary text-primary-foreground hover:bg-primary/90 h-6"
          onClick={() => onRun?.(command)}
        >
          <Play data-icon="inline-start" />
          Run
        </Button>
      </CardFooter>
    </Card>
  );
}
