import { sql } from 'drizzle-orm'
import { db } from '@/database/connection'
import { all, one, unixNow } from '@/database/query'
import { Credit } from '@/app/Models/Credit'

// The beta's two conversations with the people trying the product. PAY-03: out of free credits, a person asks for
// more and an admin answers (a grant is a ledger row, like every credit). FDB-10: after the first app, and any time
// from the Feedback button, a rating and a few words.

export const FEEDBACK_SOURCES = ['first-app', 'button'] as const
export type FeedbackSource = (typeof FEEDBACK_SOURCES)[number]
export type CreditRequestRow = { id: number; userId: string; email: string | null; name: string | null; note: string | null; status: 'open' | 'granted' | 'dismissed'; granted: number | null; createdAt: number; handledAt: number | null; balance: number; apps: number }
export type FeedbackRow = { id: number; userId: string; email: string | null; projectId: string | null; app: string | null; source: FeedbackSource; rating: number | null; text: string | null; createdAt: number }

export const BetaService = {
  /** One open request per person: asking again replaces the note (the newer words say more). */
  async requestCredits(userId: string, note: string | null) {
    await db.execute(sql`
      INSERT INTO credit_requests (user_id, note) VALUES (${userId}, ${note})
      ON CONFLICT (user_id) WHERE status = 'open' DO UPDATE SET note = coalesce(excluded.note, credit_requests.note), created_at = ${unixNow()}`)
    return { ok: true }
  },

  /** Open requests first, then the last answered ones — with who asks, their balance and how many apps they made. */
  requests: () => all<CreditRequestRow>(sql`
    SELECT r.id, r.user_id AS "userId", u.email, u.name, r.note, r.status, r.granted, r.created_at AS "createdAt", r.handled_at AS "handledAt",
      coalesce((SELECT sum(delta) FROM credit_ledger l WHERE l.user_id = r.user_id), 0)::int AS balance,
      (SELECT count(*) FROM projects p WHERE p.user_id = r.user_id)::int AS apps
    FROM credit_requests r LEFT JOIN "user" u ON u.id = r.user_id
    ORDER BY (r.status = 'open') DESC, r.created_at DESC LIMIT 100`),

  openRequests: async () => (await one<{ n: number }>(sql`SELECT count(*)::int AS n FROM credit_requests WHERE status = 'open'`)).n,

  /** An admin's answer. `amount` > 0 grants (a ledger row whose ref is the request, so it lands once); null dismisses.
   *  Returns the person asked for, or null when the request was already answered. */
  async answer(adminId: string, id: number, amount: number | null): Promise<{ userId: string; email: string | null } | null> {
    const r = await one<{ userId: string; email: string | null } | undefined>(sql`
      UPDATE credit_requests r SET status = ${amount ? 'granted' : 'dismissed'}, granted = ${amount}, handled_by = ${adminId}, handled_at = ${unixNow()}
      FROM (SELECT c.id, c.user_id, u.email FROM credit_requests c LEFT JOIN "user" u ON u.id = c.user_id WHERE c.id = ${id} AND c.status = 'open') o
      WHERE r.id = o.id RETURNING o.user_id AS "userId", o.email`)
    if (!r) return null
    if (amount) await Credit.add({ userId: r.userId, delta: amount, kind: 'admin', ref: `credit-request:${id}`, note: 'beta top-up' })
    return r
  },

  /** FDB-10: one thing a person said. A closed prompt is recorded with neither rating nor text. */
  async feedback(userId: string, d: { source: FeedbackSource; rating: number | null; text: string | null; projectId: string | null }) {
    await db.execute(sql`INSERT INTO app_feedback (user_id, project_id, source, rating, text) VALUES (${userId}, ${d.projectId}, ${d.source}, ${d.rating}, ${d.text})`)
    return { ok: true }
  },

  /** The first-app question is asked once: not again after an answer or a close. */
  firstAppDue: async (userId: string) => !(await one<{ id: number } | undefined>(sql`SELECT id FROM app_feedback WHERE user_id = ${userId} AND source = 'first-app' LIMIT 1`)),

  /** What people said (closed prompts left out), newest first. */
  feedbackList: () => all<FeedbackRow>(sql`
    SELECT f.id, f.user_id AS "userId", u.email, f.project_id AS "projectId", p.name AS app, f.source, f.rating, f.text, f.created_at AS "createdAt"
    FROM app_feedback f LEFT JOIN "user" u ON u.id = f.user_id LEFT JOIN projects p ON p.id = f.project_id
    WHERE f.rating IS NOT NULL OR f.text IS NOT NULL ORDER BY f.created_at DESC LIMIT 200`),

  feedbackSummary: () => one<{ n: number; avg: number | null }>(sql`SELECT count(*)::int AS n, round(avg(rating)::numeric, 1)::float AS avg FROM app_feedback WHERE rating IS NOT NULL`),
}
