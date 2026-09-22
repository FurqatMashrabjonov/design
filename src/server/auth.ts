// Who is asking (AUTH-06). Every server function and API route that touches a project goes
// through one of these; controllers below them trust the caller, so the eval harness and the
// tests can call controllers directly.
import { getRequest } from '@tanstack/react-start/server'
import { auth } from '@/app/Services/AuthService'
import { Project, type ProjectRow } from '@/app/Models/Project'
import { Screen } from '@/app/Models/Screen'

export class HttpError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export type SessionUser = { id: string; name: string; email: string; image?: string | null }

/** The signed-in user for a request, or null. */
export async function userFrom(request: Request): Promise<SessionUser | null> {
  const s = await auth.api.getSession({ headers: request.headers })
  return s ? { id: s.user.id, name: s.user.name, email: s.user.email, image: s.user.image } : null
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
