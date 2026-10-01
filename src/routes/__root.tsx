import type { ReactNode } from 'react'
import { BRAND, DOMAIN } from '@/lib/brand'
import { Outlet, createRootRoute, HeadContent, Scripts, useRouteContext } from '@tanstack/react-router'
import { getAccess } from '../server/fns'
import type { AccessMode } from '@/app/Services/AccessService'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { CreditsDialog } from '../credits'
import css from '../styles.css?url'

// ACC-01: waitlist-only or open, for every page. Asked once per page load in the browser (a switch in the panel
// shows on the next load); the server checks it again on every call that matters.
let browserAccess: AccessMode | undefined

export const Route = createRootRoute({
  beforeLoad: async (): Promise<{ access: AccessMode }> => {
    if (typeof window !== 'undefined' && browserAccess) return { access: browserAccess }
    const { mode } = await getAccess()
    if (typeof window !== 'undefined') browserAccess = mode
    return { access: mode }
  },
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: BRAND },
      // A link pasted anywhere shows the logo card (public/og.png, from scripts/brand-assets.mjs).
      { property: 'og:site_name', content: BRAND },
      { property: 'og:image', content: `https://${DOMAIN}/og.png` },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:image', content: `https://${DOMAIN}/og.png` },
    ],
    links: [
      { rel: 'stylesheet', href: css },
      { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
      { rel: 'icon', href: '/favicon.ico', sizes: '32x32' },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
    ],
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

/** ACC-01: 'waitlist' while only admins may sign in; the pages show the waitlist instead of sign-in. */
export const useAccess = (): AccessMode => useRouteContext({ from: '__root__' }).access
