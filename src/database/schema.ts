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
