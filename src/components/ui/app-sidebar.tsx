import { Link } from "@tanstack/react-router"
import {
  Bot,
  Settings,
  ListChecks,
  Activity,
  FolderGit2,
  Info
} from "lucide-react"

const navItems = [
  {
    name: "Agents",
    icon: Bot,
    to: "/",
  },
  {
    name: "Sessions",
    icon: ListChecks,
    to: "/sessions",
  },
  {
    name: "Actions",
    icon: Activity,
    to: "/actions",
  },
  {
    name: "Repos",
    icon: FolderGit2,
    to: "/repos",
  },
  {
    name: "Settings",
    icon: Settings,
    to: "/settings",
  },
]

export function AppSidebar() {
  return (
    <aside className="group fixed top-0 left-0 z-[40] flex h-full w-14 flex-col border-r border-border/40 bg-card text-card-foreground transition-all duration-300 ease-in-out hover:w-60">
      <nav className="flex flex-1 flex-col gap-1.5 p-2 pt-20">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            activeProps={{
              className: "bg-primary text-primary-foreground shadow-sm",
            }}
            className="flex h-10 w-full items-center rounded-full px-2.5 transition-all duration-200 hover:bg-accent hover:text-accent-foreground group/item"
          >
            <item.icon className="size-4 shrink-0" />
            <span className="ml-3 text-[11px] font-medium tracking-wide opacity-0 transition-opacity duration-300 group-hover:opacity-100 whitespace-nowrap overflow-hidden">
              {item.name}
            </span>
          </Link>
        ))}
      </nav>

      <div className="p-2 pb-6 flex flex-col gap-1.5">
        <button className="flex h-10 w-full items-center rounded-full px-2.5 transition-all duration-200 hover:bg-primary hover:text-primary-foreground text-muted-foreground">
          <Info className="size-4 shrink-0" />
          <span className="ml-3 text-[11px] font-medium tracking-wide opacity-0 transition-opacity duration-300 group-hover:opacity-100 whitespace-nowrap overflow-hidden">
            Help & Info
          </span>
        </button>
      </div>
    </aside>
  )
}
