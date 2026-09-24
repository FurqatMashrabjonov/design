import { pgTable, text, doublePrecision, integer, bigint, bigserial, boolean, timestamp } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// INF-10: Postgres. Times the app writes are unix seconds (bigint), as they were in SQLite, so no
// query had to learn a new unit; Better Auth's own tables keep real timestamps.
const unix = (name: string) => bigint(name, { mode: 'number' })
const now = sql`extract(epoch from now())::bigint`

export const projects = pgTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  designSystem: text('design_system').notNull().default('minimal'),
  device: text('device').notNull().default('desktop'),
  // The planned AppNavigation, as JSON — lets the canvas resolve a tab id to a screen.
  navigation: text('navigation'),
  // Validated theme overrides as JSON (see lib/theme-override.ts); null = design system as-is.
  theme: text('theme'),
  // GQ-10: the AA-repaired palette the planner invented (lib/palette.ts Palette as JSON); null =
  // the catalogue system's own colours. Only set when the system was chosen automatically.
  palette: text('palette'),
  designSystemAuto: boolean('design_system_auto').notNull().default(false),
  // What later screens still need from the plan — summary, app type, data model — as JSON.
  plan: text('plan'),
  // The owner (OWN-01). Null only for projects made before accounts existed (OWN-05).
  userId: text('user_id'),
  // DSH-08: starred on the dashboard.
  favorite: boolean('favorite').notNull().default(false),
  createdAt: unix('created_at').notNull().default(now),
})

export const screens = pgTable('screens', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  prompt: text('prompt').notNull(),
  html: text('html').notNull(),
  x: doublePrecision('x').notNull().default(0),
  y: doublePrecision('y').notNull().default(0),
  // Measured content height in CSS pixels; null until the frame has reported one.
  height: integer('height'),
  screenType: text('screen_type').notNull().default('root-tab'),
  activeTabId: text('active_tab_id'),
  parentScreenName: text('parent_screen_name'),
  // What the screen was planned to be; never overwritten by edits (see migration 0011).
  spec: text('spec'),
  // Set while the last attempt to draw the screen failed; html is '' in that case.
  error: text('error'),
  // The snapshot the screen is showing when the user stepped back with ‹ (null = the newest work).
  versionId: text('version_id'),
  // Set when the user deleted the screen; the row stays so Cmd+Z can bring it back (see migration 0014).
  deletedAt: unix('deleted_at'),
  createdAt: unix('created_at').notNull().default(now),
})

export const screenVersions = pgTable('screen_versions', {
  id: text('id').primaryKey(),
  screenId: text('screen_id')
    .notNull()
    .references(() => screens.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  prompt: text('prompt').notNull(),
  html: text('html').notNull(),
  createdAt: unix('created_at').notNull().default(now),
  // Insertion order: two snapshots often share a second (SQLite's rowid did this).
  seq: bigserial('seq', { mode: 'number' }),
})

// Stock-photo lookups, keyed by the normalised search text (see lib/image-slots.ts).
export const imageCache = pgTable('image_cache', {
  query: text('query').primaryKey(),
  url: text('url').notNull(),
  avgColor: text('avg_color'),
  createdAt: unix('created_at').notNull().default(now),
})

// The project's conversation (see migration 0012 and lib/agent-messages.ts).
export const messages = pgTable('messages', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  role: text('role').notNull(),
  kind: text('kind').notNull(),
  text: text('text').notNull(),
  meta: text('meta'),
  createdAt: unix('created_at').notNull().default(now),
})

export const feedback = pgTable('feedback', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  screenId: text('screen_id').notNull(),
  value: text('value').notNull(),
  designSystem: text('design_system').notNull(),
  archetype: text('archetype'),
  variant: text('variant'),
  createdAt: unix('created_at').notNull().default(now),
})

// Better Auth's tables (AUTH-02, migration 0016). Field names are the ones its Drizzle adapter expects.
const ts = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' })
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: ts('created_at').notNull(),
  updatedAt: ts('updated_at').notNull(),
  // ADM-01 (Better Auth admin plugin)
  role: text('role').notNull().default('user'),
  banned: boolean('banned').notNull().default(false),
  banReason: text('ban_reason'),
  banExpires: ts('ban_expires'),
})
export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: ts('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: ts('created_at').notNull(),
  updatedAt: ts('updated_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  impersonatedBy: text('impersonated_by'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
})
export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: ts('access_token_expires_at'),
  refreshTokenExpiresAt: ts('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: ts('created_at').notNull(),
  updatedAt: ts('updated_at').notNull(),
})
export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: ts('expires_at').notNull(),
  createdAt: ts('created_at').notNull(),
  updatedAt: ts('updated_at').notNull(),
})

export const llmCalls = pgTable('llm_calls', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  projectId: text('project_id'),
  provider: text('provider').notNull(),
  model: text('model').notNull().default(''),
  actionId: text('action_id'),
  promptTokens: integer('prompt_tokens').notNull().default(0),
  cachedTokens: integer('cached_tokens').notNull().default(0),
  completionTokens: integer('completion_tokens').notNull().default(0),
  cacheWriteTokens: integer('cache_write_tokens').notNull().default(0),
  costUsd: doublePrecision('cost_usd').notNull().default(0),
  ms: integer('ms').notNull().default(0),
  ok: boolean('ok').notNull(),
  error: text('error'),
  createdAt: unix('created_at').notNull().default(now),
  // OBS-10: the HTTP request that made the call.
  requestId: text('request_id'),
})


// BIL-04: every credit movement; a balance is the sum of `delta`. `ref` is unique when set.
export const creditLedger = pgTable('credit_ledger', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  delta: integer('delta').notNull(),
  kind: text('kind').notNull(),
  actionId: text('action_id'),
  ref: text('ref'),
  note: text('note'),
  createdAt: unix('created_at').notNull().default(now),
  // Insertion order (SQLite's rowid did this): "since the last plan grant" is counted by it.
  seq: bigserial('seq', { mode: 'number' }),
})

// BIL-10: a plan as the payment provider reports it; its credits live in credit_ledger.
export const subscriptions = pgTable('subscriptions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  productKey: text('product_key').notNull(),
  status: text('status').notNull(),
  startedAt: unix('started_at').notNull(),
  currentPeriodEnd: unix('current_period_end'),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
  updatedAt: unix('updated_at').notNull().default(now),
})

// ADM-13: API keys entered in the admin panel, sealed (lib/secret-box.ts); only last4 is ever shown.
export const secrets = pgTable('secrets', {
  name: text('name').primaryKey(),
  sealed: text('sealed').notNull(),
  last4: text('last4').notNull(),
  updatedBy: text('updated_by'),
  updatedAt: unix('updated_at').notNull().default(now),
})

// ADM-01: every admin action (ban, pause, limit, role), who did it and when.
export const adminActions = pgTable('admin_actions', {
  id: text('id').primaryKey(),
  adminId: text('admin_id').notNull(),
  action: text('action').notNull(),
  target: text('target'),
  detail: text('detail'),
  createdAt: unix('created_at').notNull().default(now),
})

// ADM-08: runtime switches (pause, limits, budget, per-user limits) as key/value.
export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: unix('updated_at').notNull().default(now),
})

// OBS-10: one row per HTTP request (static assets and dev internals are not recorded).
export const httpRequests = pgTable('http_requests', {
  id: text('id').primaryKey(),
  method: text('method').notNull(),
  path: text('path').notNull(),
  query: text('query'),
  kind: text('kind').notNull(),
  status: integer('status').notNull(),
  ms: integer('ms').notNull(),
  userId: text('user_id'),
  ipHash: text('ip_hash'),
  userAgent: text('user_agent'),
  size: integer('size'),
  createdAt: unix('created_at').notNull().default(now),
})

// OBS-11: console output and uncaught errors; errors carry a fingerprint so repeats group.
export const serverLogs = pgTable('server_logs', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  level: text('level').notNull(),
  message: text('message').notNull(),
  stack: text('stack'),
  fingerprint: text('fingerprint'),
  requestId: text('request_id'),
  createdAt: unix('created_at').notNull().default(now),
})

// ADM-15: one row per paid order (Polar order.paid); the id is the provider's order id.
export const orders = pgTable('orders', {
  id: text('id').primaryKey(),
  provider: text('provider').notNull().default('polar'),
  userId: text('user_id').notNull(),
  productKey: text('product_key').notNull(),
  amountCents: integer('amount_cents').notNull(),
  currency: text('currency').notNull(),
  billingReason: text('billing_reason'),
  subscriptionId: text('subscription_id'),
  createdAt: unix('created_at').notNull().default(now),
})
