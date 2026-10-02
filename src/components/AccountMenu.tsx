import { useNavigate, useRouteContext } from '@tanstack/react-router'
import { CreditCard, LifeBuoy, LogOut, Shield } from 'lucide-react'
import { manageBilling } from '@/credits'
import { authClient } from '@/lib/auth-client'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

// AUTH-08: who is signed in, and sign out. AUTH-09's Delete account is off the menu since 2026-10-02 (one slip away
// from losing everything); an account is deleted on request by email (/privacy), with AccountController.destroy.
export function AccountMenu() {
  const { user } = useRouteContext({ strict: false }) as { user?: { name: string; email: string; image?: string | null; admin?: boolean } }
  const navigate = useNavigate()
  if (!user) return null
  const initials = (user.name || user.email).split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')

  async function signOut() {
    await authClient.signOut()
    navigate({ to: '/login' })
  }

  return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className="flex size-8 items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-semibold outline-none ring-offset-2 ring-offset-background transition-shadow duration-(--duration-base) hover:ring-2 hover:ring-border focus-visible:ring-2 focus-visible:ring-ring" aria-label="Account" title={user.email}>
            {user.image ? <img src={user.image} alt="" className="size-full object-cover" referrerPolicy="no-referrer" /> : initials}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel className="font-normal">
            <div className="truncate text-sm font-medium">{user.name}</div>
            <div className="truncate text-xs text-muted-foreground">{user.email}</div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {user.admin && (
            <DropdownMenuItem onSelect={() => navigate({ to: '/admin' })}>
              <Shield /> Admin panel
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => manageBilling()}>
            <CreditCard /> Billing
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => navigate({ to: '/contact' })}>
            <LifeBuoy /> Help & support
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={signOut}>
            <LogOut /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
  )
}
