import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { magicLink } from 'better-auth/plugins/magic-link'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { db } from '@/database/connection'
import { account, session, user, verification } from '@/database/schema'
import { Project } from '@/app/Models/Project'

// Accounts (B1). Sign-in is Google or a magic link sent to your email — no passwords are stored
// (AUTH-01). Better Auth owns sessions and the four auth tables; everything else in the app only
// asks "who is this" through requireUser() (lib: server/auth.ts).
//
// Until an email provider is set up (EML-01), a magic link is printed to the server log in
// development and refused in production — the only way to sign in locally without Google keys.

const google =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? { google: { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET } }
    : undefined

/** The last magic link issued, for tests and local development only. */
export const devMail: { lastLink?: { email: string; url: string } } = {}

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'sqlite', schema: { user, session, account, verification } }),
  secret: process.env.BETTER_AUTH_SECRET || (process.env.NODE_ENV === 'production' ? undefined : 'dev-only-secret-change-me-in-production'),
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
  socialProviders: google,
  session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 },
  databaseHooks: {
    user: {
      create: {
        // OWN-05: projects made before accounts existed belong to the first person who signs in.
        after: async (created) => {
          Project.adoptOrphans(created.id)
        },
      },
    },
  },
  plugins: [
    magicLink({
      expiresIn: 15 * 60,
      sendMagicLink: async ({ email, url }) => {
        if (process.env.NODE_ENV === 'production') throw new Error('Email sign-in is not set up yet')
        devMail.lastLink = { email, url }
        console.log(`\n[auth] magic link for ${email}:\n${url}\n`)
      },
    }),
    tanstackStartCookies(),
  ],
})

export const signInMethods = { google: Boolean(google), magicLink: true }
