import * as React from "react"
import * as ResizablePrimitive from "react-resizable-panels"

import { cn } from "@/lib/utils"

type Orientation = "horizontal" | "vertical"

function ResizablePanelGroup({
  className,
  direction,
  orientation,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.Group> & {
  direction?: Orientation
}) {
  const resolvedOrientation = orientation ?? direction
  return (
    <ResizablePrimitive.Group
      data-slot="resizable-panel-group"
      className={cn(
        "flex h-full w-full",
        resolvedOrientation === "vertical" && "flex-col",
        className
      )}
      orientation={resolvedOrientation}
      {...props}
    />
  )
}

function ResizablePanel({
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.Panel>) {
  return <ResizablePrimitive.Panel data-slot="resizable-panel" {...props} />
}

function ResizableHandle({
  withHandle,
  className,
  direction,
  orientation,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.Separator> & {
  withHandle?: boolean
  direction?: Orientation
}) {
  const resolvedOrientation = orientation ?? direction ?? "horizontal"
  return (
    <ResizablePrimitive.Separator
      data-slot="resizable-handle"
      data-orientation={resolvedOrientation}
      className={cn(
        "relative flex items-center justify-center outline-none",
        resolvedOrientation === "vertical"
          ? "h-px w-full after:absolute after:inset-x-0 after:top-1/2 after:h-1 after:-translate-y-1/2"
          : "w-px after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2",
        className
      )}
      {...props}
    >
      {withHandle && (
        <div
          className={cn(
            "bg-border z-10 flex shrink-0 rounded-none",
            resolvedOrientation === "vertical" ? "h-1 w-6" : "h-6 w-1"
          )}
        />
      )}
    </ResizablePrimitive.Separator>
  )
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
