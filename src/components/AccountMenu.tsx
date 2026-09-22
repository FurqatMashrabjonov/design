import { useState } from 'react'
import { useNavigate, useRouteContext } from '@tanstack/react-router'
import { LogOut, Shield, Trash2 } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { deleteAccount } from '@/server/fns'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'

// AUTH-08: who is signed in, sign out, and (AUTH-09) delete the account with everything in it.
export function AccountMenu() {
  const { user } = useRouteContext({ strict: false }) as { user?: { name: string; email: string; image?: string | null; admin?: boolean } }
  const navigate = useNavigate()
  const [confirm, setConfirm] = useState(false)
  if (!user) return null
  const initials = (user.name || user.email).split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')

  async function signOut() {
    await authClient.signOut()
    navigate({ to: '/login' })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className="flex size-8 items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-semibold" aria-label="Account" title={user.email}>
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
          <DropdownMenuItem onSelect={signOut}>
            <LogOut /> Sign out
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={() => setConfirm(true)}>
            <Trash2 /> Delete account
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>All your projects, screens and history are deleted with it. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={async () => {
                await deleteAccount()
                await authClient.signOut().catch(() => {})
                navigate({ to: '/login' })
              }}
            >
              Delete everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
