import { HeadContent, Scripts, createRootRoute, useLocation } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import { ThemeProvider } from '@/components/theme-provider'
import appCss from '../styles.css?url'
import { Toaster } from '@/components/ui/sonner'
import { AppSidebar } from '@/components/ui/app-sidebar'
import { GlobalApprovalDrawer } from '@/components/agents/global-approval-drawer'
import { TerminalDrawer } from '@/components/agents/terminal-drawer'
import { PageHeader } from '@/components/shared/page-header'
import { useAgentState } from '@/hooks/use-agent-state'
import { useUIStore } from '@/stores/ui-store'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Makima',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),

  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()

  const {
    mode,
    pendingApprovals,
    refreshState,
    toggleMode,
  } = useAgentState()

  const {
    openApprovalDrawer,
    openTerminalDrawer,
  } = useUIStore()

  // Hide search on settings page
  const showSearch = pathname !== '/settings'

  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          <div className="relative flex h-svh flex-row overflow-hidden bg-background">
            <AppSidebar />
            <div className="flex-1 flex flex-col min-h-0 ml-14 overflow-hidden">
              <PageHeader
                mode={mode}
                pendingCount={pendingApprovals.length}
                onToggleMode={toggleMode}
                onOpenApprovals={openApprovalDrawer}
                onOpenTerminal={openTerminalDrawer}
                onRefresh={refreshState}
                showSearch={showSearch}
              />
              <main className="flex-1 overflow-hidden mt-14 relative z-0">
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
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
        <Toaster />
      </body>
    </html>
  )
}
