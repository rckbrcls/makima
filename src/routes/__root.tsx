import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";

import appCss from "../styles.css?url";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { AppSidebar } from "@/components/ui/app-sidebar";
import { GlobalApprovalDrawer } from "@/components/agents/global-approval-drawer";
import { TerminalDrawer } from "@/components/agents/terminal-drawer";
import { PageHeader } from "@/components/shared/page-header";
import { useAgentState } from "@/hooks/use-agent-state";
import { useUIStore } from "@/stores/ui-store";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "Makima",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),

  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          <div className="bg-background relative flex h-svh flex-row ">
            <AppSidebar />
            <div className="ml-14 flex min-h-0 flex-1 flex-col ">
              <PageHeader />
              <main className="relative z-0 mt-14 flex-1 ">
                {children}
              </main>
            </div>
          </div>
          {/* Global Approval Drawer - accessible from any page */}
          <GlobalApprovalDrawer />
          <TerminalDrawer />
        </ThemeProvider>
        <TanStackDevtools
          config={{
            position: "bottom-right",
          }}
          plugins={[
            {
              name: "Tanstack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
        <Toaster />
      </body>
    </html>
  );
}
