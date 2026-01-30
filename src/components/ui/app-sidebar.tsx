import { Link } from "@tanstack/react-router"
import {
  Bot,
  Settings,
  LayoutDashboard,
  History,
  Info
} from "lucide-react"

const navItems = [
  {
    name: "Dashboard",
    icon: LayoutDashboard,
    to: "/",
  },
  {
    name: "Agents",
    icon: Bot,
    to: "/agents",
  },
  {
    name: "Execution",
    icon: History,
    to: "/execution",
  },
  {
    name: "Settings",
    icon: Settings,
    to: "/settings",
  },
]

export function AppSidebar() {
  return (
    <aside className="group  fixed top-0 left-0 z-[100] flex h-full w-14 flex-col border-r border-border/40 bg-card text-card-foreground transition-all duration-300 ease-in-out hover:w-60">
      <div className="flex h-24 shrink-0 items-end px-3 pb-4">
        <div className="flex size-7 items-center justify-center shrink-0 overflow-hidden">
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
        </div>
        <span className="ml-3 text-lg tracking-tight opacity-0 transition-opacity duration-300 group-hover:opacity-100 whitespace-nowrap overflow-hidden leading-none">
          Commander
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-1.5 p-2 pt-6">
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
