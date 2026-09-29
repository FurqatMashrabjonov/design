import { randomBytes, createHash } from 'node:crypto'
import { notFound } from '@tanstack/react-router'
import { Project } from '@/app/Models/Project'
import { Screen } from '@/app/Models/Screen'
import { Waitlist } from '@/app/Models/Waitlist'
import { EmailService } from '@/app/Services/EmailService'

// SHR-02: a preview the owner made public, seen by anyone with its link (/s/<token>), view only. WLT-01: the
// waitlist that link collects, and which post (`ref`) brought each view and sign-up. The caller is checked in
// server/fns.ts (the owner for `share`); the public calls are keyed by the unguessable token alone.

export const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,24}$/i

/** A `ref` as the link carries it (reddit, x, threads…): short and plain, or nothing. */
export const cleanRef = (r: unknown) => (typeof r === 'string' && /^[a-z0-9_.-]{1,32}$/i.test(r) ? r.toLowerCase() : null)

export const ShareController = {
  /** Turns sharing on (a new token, or the one it has) or off (the token is dropped, so the old link dies). */
  async share(data: { id: string; on: boolean }) {
    const project = await Project.find(data.id)
    if (!project) throw notFound()
    const token = data.on ? (project.shareToken ?? randomBytes(16).toString('base64url')) : null
    if (token !== project.shareToken) await Project.setShareToken(data.id, token)
    return { token }
  },

  /** What a stranger's preview needs, and nothing else: no owner, no messages, no ids but the screens'. The
   *  screens' source stays on the server (export is a paid feature): `html` is only a version key for the frame URL. */
  async shared(token: string, ref: string | null) {
    const project = await Project.byShareToken(token)
    if (!project) throw notFound()
    const screens = (await Screen.forProject(project.id))
      .filter((s) => s.html)
      .map((s) => ({ id: s.id, name: s.name, x: s.x, y: s.y, slug: s.slug, screenType: s.screenType, activeTabId: s.activeTabId, html: createHash('sha1').update(s.html).digest('base64url').slice(0, 12) }))
    await Waitlist.view(project.id, ref)
    return { project: { id: '', name: project.name, plan: project.plan, theme: project.theme }, screens, token }
  },

  /** A waitlist sign-up from a shared preview. True when the email is new. */
  async join(data: { token: string | null; email: string; ref: string | null; note: string | null }) {
    const project = data.token ? await Project.byShareToken(data.token) : undefined
    const email = data.email.toLowerCase()
    const joined = await Waitlist.join({ email, ref: data.ref, projectId: project?.id ?? null, note: data.note })
    // EML-01: a new sign-up gets its confirmation; a mail that fails never fails the sign-up (it is logged).
    if (joined) await EmailService.system('waitlist', email).catch((e) => console.error('[email] waitlist confirmation failed:', e instanceof Error ? e.message : e))
    return { joined }
  },
}
