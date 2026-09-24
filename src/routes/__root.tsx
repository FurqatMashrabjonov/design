import type { ReactNode } from 'react'
import { Outlet, createRootRoute, HeadContent, Scripts } from '@tanstack/react-router'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { CreditsDialog } from '../credits'
import css from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Design' },
    ],
    links: [{ rel: 'stylesheet', href: css }],
    // DSH-09: the saved theme is applied before the first paint, so a dark page never flashes white.
    scripts: [{ children: "try{if(localStorage.getItem('od:theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}" }],
  }),
  component: () => (
    <RootDocument>
      <Outlet />
    </RootDocument>
  ),
})

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="antialiased">
        <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
        {/* UI-21: top centre — the canvas keeps its corners for tools (bottom-right was the zoom cluster). */}
        <Toaster position="top-center" offset={16} />
        <CreditsDialog />
        <Scripts />
      </body>
    </html>
  )
}
