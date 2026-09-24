// API routes that stream generation (OWN-03): the caller must be signed in and own the project
// the body names. The body is read here once and handed to the controller unchanged.
import { Project } from '@/app/Models/Project'
import { userFrom } from './auth'
import { UsageService } from '@/app/Services/UsageService'

export async function guardGeneration(request: Request, run: (req: Request, userId: string, finish: () => void) => Promise<Response>): Promise<Response> {
  // SEC-01: a state-changing POST must come from this site, not from a page elsewhere.
  const origin = request.headers.get('origin')
  if (origin && origin !== new URL(request.url).origin) return new Response('Cross-site request refused', { status: 403 })
  const user = await userFrom(request)
  if (!user) return new Response('Sign in to continue', { status: 401 })
  const text = await request.text()
  let body: Record<string, unknown> = {}
  try {
    body = JSON.parse(text || '{}')
  } catch {
    return new Response('Invalid request', { status: 400 })
  }
  if (body.projectId !== undefined && !(typeof body.projectId === 'string' && Project.findOwned(body.projectId, user.id))) return new Response('Project not found', { status: 404 })
  // LIM-01/02/03: daily call limit, one generation at a time, the service-wide daily budget.
  const refused = UsageService.refusal(user.id)
  if (refused) return new Response(refused.message, { status: refused.status })

  UsageService.begin(user.id)
  const done = () => UsageService.end(user.id)
  // LLM-05: one guarded request is one action; every model call inside it carries its id.
  const who = { userId: user.id, projectId: typeof body.projectId === 'string' ? body.projectId : undefined, actionId: crypto.randomUUID() }
  let res: Response
  try {
    res = await UsageService.run(who, () => run(new Request(request.url, { method: 'POST', headers: request.headers, body: text, signal: request.signal }), user.id, done))
  } catch (e) {
    done()
    throw e
  }
  if (!res.body) {
    done()
    return res
  }
  // The generation is over when its stream is: finished, failed, or cancelled by the client (Stop).
  // A detached run (GQ-07) keeps going after the page leaves and calls `finish` itself.
  const body2 = res.body.pipeThrough(new TransformStream({ flush: done }))
  if (!res.headers.get('X-OD-Detached')) request.signal.addEventListener('abort', done, { once: true })
  return new Response(body2, { status: res.status, headers: res.headers })
}
