import { Link } from "@tanstack/react-router";
import { BarChart2, Bot, Cpu, FolderGit2, Info, Settings } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

const navItems = [
  {
    name: "Jarvis",
    icon: Bot,
    to: "/jarvis",
  },
  {
    name: "Workspace",
    icon: FolderGit2,
    to: "/",
  },
  {
    name: "Agents",
    icon: Cpu,
    to: "/agents",
  },
  {
    name: "Statistics",
    icon: BarChart2,
    to: "/statistics",
  },
  {
    name: "Settings",
    icon: Settings,
    to: "/settings",
  },
];

const bottomItems = [

  {
    name: "Help & Info",
    icon: Info,
    to: "/help-info",
  },
];

export function AppSidebar() {
  return (
    <aside className="group border-border bg-card text-card-foreground fixed top-0 left-0 z-40 flex h-full w-14 flex-col border-r">
      <nav className="flex flex-1 flex-col gap-1.5 p-2 pt-16">
        {navItems.map((item) => (
          <Tooltip key={item.to} delayDuration={500}>
            <TooltipTrigger asChild>
              <Link
                key={item.to}
                to={item.to}
                activeProps={{
                  className:
                    "bg-primary text-primary-foreground dark:bg-primary dark:text-primary-foreground hover:bg-primary hover:text-primary-foreground/90 dark:hover:bg-primary/90 dark:hover:text-primary-foreground/90",
                }}
                className="border-border bg-background hover:bg-muted hover:text-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 aria-expanded:bg-muted aria-expanded:text-foreground group/item flex h-10 w-full items-center rounded border px-2.5 transition-all duration-200"
              >
                <item.icon className="size-4 shrink-0" />
                <span className="ml-3 overflow-hidden text-[11px] font-medium tracking-wide whitespace-nowrap opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  {item.name}
                </span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side={"right"}>
              <p>{item.name}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </nav>

      <div className="flex flex-col gap-1.5 p-2 pb-6">
        {bottomItems.map((item) => (
          <Tooltip key={item.to} delayDuration={500}>
            <TooltipTrigger asChild>
              <Link
                key={item.to}
                to={item.to}
                activeProps={{
                  className:
                    "bg-primary text-primary-foreground dark:bg-primary dark:text-primary-foreground hover:bg-primary hover:text-primary-foreground/90 dark:hover:bg-primary/90 dark:hover:text-primary-foreground/90",
                }}
                className="border-border bg-background hover:bg-muted hover:text-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 aria-expanded:bg-muted aria-expanded:text-foreground group/item flex h-10 w-full items-center rounded border px-2.5 transition-all duration-200"
              >
                <item.icon className="size-4 shrink-0" />
                <span className="ml-3 overflow-hidden text-[11px] font-medium tracking-wide whitespace-nowrap opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  {item.name}
                </span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side={"right"}>
              <p>{item.name}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </aside>
  );
}
