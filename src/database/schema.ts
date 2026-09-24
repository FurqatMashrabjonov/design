import { sqliteTable, text, real, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const projects = sqliteTable('projects', {
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
  designSystemAuto: integer('design_system_auto', { mode: 'boolean' }).notNull().default(false),
  // What later screens still need from the plan — summary, app type, data model — as JSON.
  plan: text('plan'),
  // The owner (OWN-01). Null only for projects made before accounts existed (OWN-05).
  userId: text('user_id'),
  // DSH-08: starred on the dashboard.
  favorite: integer('favorite', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at').notNull().default(sql`(unixepoch())`),
})

export const screens = sqliteTable('screens', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  prompt: text('prompt').notNull(),
  html: text('html').notNull(),
  x: real('x').notNull().default(0),
  y: real('y').notNull().default(0),
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
  deletedAt: integer('deleted_at'),
  createdAt: integer('created_at').notNull().default(sql`(unixepoch())`),
})

export const screenVersions = sqliteTable('screen_versions', {
  id: text('id').primaryKey(),
  screenId: text('screen_id')
    .notNull()
    .references(() => screens.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  prompt: text('prompt').notNull(),
  html: text('html').notNull(),
  createdAt: integer('created_at').notNull().default(sql`(unixepoch())`),
})

// Stock-photo lookups, keyed by the normalised search text (see lib/image-slots.ts).
export const imageCache = sqliteTable('image_cache', {
  query: text('query').primaryKey(),
  url: text('url').notNull(),
  avgColor: text('avg_color'),
  createdAt: integer('created_at').notNull().default(sql`(unixepoch())`),
})

// The project's conversation (see migration 0012 and lib/agent-messages.ts).
export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  role: text('role').notNull(),
  kind: text('kind').notNull(),
  text: text('text').notNull(),
  meta: text('meta'),
  createdAt: integer('created_at').notNull().default(sql`(unixepoch())`),
})

export const feedback = sqliteTable('feedback', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  screenId: text('screen_id').notNull(),
  value: text('value').notNull(),
  designSystem: text('design_system').notNull(),
  archetype: text('archetype'),
  variant: text('variant'),
  createdAt: integer('created_at').notNull().default(sql`(unixepoch())`),
})

// Better Auth's tables (AUTH-02, migration 0016). Field names are the ones its Drizzle adapter expects.
const ts = (name: string) => integer(name, { mode: 'timestamp_ms' })
export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  image: text('image'),
  createdAt: ts('created_at').notNull(),
  updatedAt: ts('updated_at').notNull(),
  // ADM-01 (Better Auth admin plugin)
  role: text('role').notNull().default('user'),
  banned: integer('banned', { mode: 'boolean' }).notNull().default(false),
  banReason: text('ban_reason'),
  banExpires: ts('ban_expires'),
})
export const session = sqliteTable('session', {
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
export const account = sqliteTable('account', {
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
export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: ts('expires_at').notNull(),
  createdAt: ts('created_at').notNull(),
  updatedAt: ts('updated_at').notNull(),
})

export const llmCalls = sqliteTable('llm_calls', {
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
  costUsd: real('cost_usd').notNull().default(0),
  ms: integer('ms').notNull().default(0),
  ok: integer('ok', { mode: 'boolean' }).notNull(),
  error: text('error'),
  createdAt: integer('created_at').notNull().default(sql`(unixepoch())`),
})


// BIL-04: every credit movement; a balance is the sum of `delta`. `ref` is unique when set.
export const creditLedger = sqliteTable('credit_ledger', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  delta: integer('delta').notNull(),
  kind: text('kind').notNull(),
  actionId: text('action_id'),
  ref: text('ref'),
  note: text('note'),
  createdAt: integer('created_at').notNull().default(sql`(unixepoch())`),
})

// BIL-10: a plan as the payment provider reports it; its credits live in credit_ledger.
export const subscriptions = sqliteTable('subscriptions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  productKey: text('product_key').notNull(),
  status: text('status').notNull(),
  startedAt: integer('started_at').notNull(),
  currentPeriodEnd: integer('current_period_end'),
  cancelAtPeriodEnd: integer('cancel_at_period_end', { mode: 'boolean' }).notNull().default(false),
  updatedAt: integer('updated_at').notNull().default(sql`(unixepoch())`),
})

// ADM-01: every admin action (ban, pause, limit, role), who did it and when.
export const adminActions = sqliteTable('admin_actions', {
  id: text('id').primaryKey(),
  adminId: text('admin_id').notNull(),
  action: text('action').notNull(),
  target: text('target'),
  detail: text('detail'),
  createdAt: integer('created_at').notNull().default(sql`(unixepoch())`),
})

// ADM-08: runtime switches (pause, limits, budget, per-user limits) as key/value.
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at').notNull().default(sql`(unixepoch())`),
})
