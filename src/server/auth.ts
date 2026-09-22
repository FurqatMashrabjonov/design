// Who is asking (AUTH-06). Every server function and API route that touches a project goes
// through one of these; controllers below them trust the caller, so the eval harness and the
// tests can call controllers directly.
import { getRequest } from '@tanstack/react-start/server'
import { auth, isAdmin } from '@/app/Services/AuthService'
import { Project, type ProjectRow } from '@/app/Models/Project'
import { Screen } from '@/app/Models/Screen'

export class HttpError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export type SessionUser = { id: string; name: string; email: string; image?: string | null; admin: boolean }

/** The signed-in user for a request, or null. A banned user counts as signed out (ADM-04). */
export async function userFrom(request: Request): Promise<SessionUser | null> {
  const s = await auth.api.getSession({ headers: request.headers })
  if (!s) return null
  const u = s.user as typeof s.user & { role?: string | null; banned?: boolean | null; banExpires?: Date | null }
  if (u.banned && (!u.banExpires || new Date(u.banExpires) > new Date())) return null
  return { id: u.id, name: u.name, email: u.email, image: u.image, admin: isAdmin(u) }
}

/** ADM-01: only an admin gets past; anyone else gets the same 404 as a page that does not exist. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await userFrom(getRequest())
  if (!user?.admin) throw new HttpError(404, 'Not found')
  return user
}

/** Inside a server function: the signed-in user, or a 401. */
export async function requireUser(): Promise<SessionUser> {
  const user = await userFrom(getRequest())
  if (!user) throw new HttpError(401, 'Sign in to continue')
  return user
}

/** The project if the signed-in user owns it; a 404 otherwise (never tell a stranger it exists). */
export async function requireProject(projectId: unknown): Promise<{ user: SessionUser; project: ProjectRow }> {
  const user = await requireUser()
  const project = typeof projectId === 'string' ? Project.findOwned(projectId, user.id) : undefined
  if (!project) throw new HttpError(404, 'Project not found')
  return { user, project }
}

/** For calls that name only a screen: its project must be the user's. */
export async function requireScreen(screenId: unknown): Promise<{ user: SessionUser; project: ProjectRow }> {
  const screen = typeof screenId === 'string' ? Screen.find(screenId) : undefined
  return requireProject(screen?.projectId)
}
