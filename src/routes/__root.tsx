import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import { ThemeProvider } from '@/components/theme-provider'
import appCss from '../styles.css?url'
import { Toaster } from '@/components/ui/sonner'
import { AppSidebar } from '@/components/ui/app-sidebar'
import { GlobalApprovalDrawer } from '@/components/agents/global-approval-drawer'
import { TerminalDrawer } from '@/components/agents/terminal-drawer'
import { TextureOverlay } from '@/components/ui/texture-overlay'

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
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          <div className="relative flex h-svh flex-row overflow-hidden">
            <AppSidebar />
            <main className="min-h-0 flex-1 overflow-hidden ml-14 mt-14">{children}</main>
          </div>
          {/* Global Approval Drawer - accessible from any page */}
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
