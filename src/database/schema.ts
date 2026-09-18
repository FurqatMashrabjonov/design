import { sqliteTable, text, real, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  designSystem: text('design_system').notNull().default('minimal'),
  device: text('device').notNull().default('desktop'),
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
