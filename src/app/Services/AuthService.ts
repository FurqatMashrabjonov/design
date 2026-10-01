import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { magicLink } from 'better-auth/plugins/magic-link'
import { EmailService } from './EmailService'
import { admin } from 'better-auth/plugins/admin'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { db } from '@/database/connection'
import { account, session, user, verification } from '@/database/schema'
import { CreditService } from './CreditService'
import { Project } from '@/app/Models/Project'
import { APIError } from 'better-auth/api'
import { eq } from 'drizzle-orm'
import { AccessService, WAITLIST_ONLY } from './AccessService'

// Accounts (B1). Sign-in is Google or a magic link sent to your email — no passwords are stored
// (AUTH-01). Better Auth owns sessions and the four auth tables; everything else in the app only
// asks "who is this" through requireUser() (lib: server/auth.ts).
//
// A magic link is mailed through EmailService (EML-01, Resend). With no key it is printed to the server log in
// development — the way to sign in locally without Google keys — and refused in production.

const google =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? { google: { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET } }
    : undefined

/** The last magic link issued, for tests and local development only. */
export const devMail: { lastLink?: { email: string; url: string } } = {}

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg', schema: { user, session, account, verification } }),
  secret: process.env.BETTER_AUTH_SECRET || (process.env.NODE_ENV === 'production' ? undefined : 'dev-only-secret-change-me-in-production'),
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
  socialProviders: google,
  session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 },
  databaseHooks: {
    user: {
      create: {
        // ACC-02: while the app is waitlist-only, no new account is made except an admin's (Google or a link).
        before: async (created) => {
          if (!(await AccessService.allows(isAdmin(created)))) throw new APIError('FORBIDDEN', { message: WAITLIST_ONLY })
        },
        // OWN-05: projects made before accounts existed belong to the first person who signs in.
        after: async (created) => {
          await Project.adoptOrphans(created.id)
          // BIL-07: every new account starts with free credits.
          await CreditService.signupGrant(created.id)
        },
      },
    },
    // ACC-02: an account made earlier (while open, or in testing) does not get a session in waitlist mode either.
    session: {
      create: {
        before: async (created) => {
          const u = (await db.select({ email: user.email, role: user.role }).from(user).where(eq(user.id, created.userId)))[0]
          if (!(await AccessService.allows(!!u && isAdmin(u)))) throw new APIError('FORBIDDEN', { message: WAITLIST_ONLY })
        },
      },
    },
  },
  plugins: [
    magicLink({
      expiresIn: 15 * 60,
      // EML-01: sent through Resend; with no key, development logs it and production refuses (EmailService).
      sendMagicLink: async ({ email, url }) => {
        // ACC-02: no link is mailed that would only be refused when it is opened.
        if (!(await AccessService.allows(isAdmin({ email })))) throw new APIError('FORBIDDEN', { message: WAITLIST_ONLY })
        if (process.env.NODE_ENV !== 'production') devMail.lastLink = { email, url }
        await EmailService.system('magic-link', email, { url })
      },
    }),
    // ADM-01: roles and bans. Its hooks refuse sign-in to a banned user; server/auth.ts also treats
    // one as signed out, so a ban takes effect on the next request.
    admin({ defaultRole: 'user', adminRoles: ['admin'] }),
    tanstackStartCookies(),
  ],
})

/** ADM-01: the first admins come from ADMIN_EMAILS (comma-separated); more can be named in the panel. */
export function isAdmin(u: { email: string; role?: string | null }): boolean {
  if (u.role === 'admin') return true
  return adminEmails().includes(u.email.toLowerCase())
}
export const adminEmails = () => (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)

export const signInMethods = { google: Boolean(google), magicLink: true }
