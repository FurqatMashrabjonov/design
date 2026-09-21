import { asc, eq } from 'drizzle-orm'
import { db } from '@/database/connection'
import { messages } from '@/database/schema'
import type { MessageKind, MessageMeta } from '@/lib/agent-messages'

export type MessageRow = typeof messages.$inferSelect

export const Message = {
  forProject(projectId: string): MessageRow[] {
    return db.select().from(messages).where(eq(messages.projectId, projectId)).orderBy(asc(messages.createdAt), asc(messages.id)).all()
  },

  find(id: string): MessageRow | undefined {
    return db.select().from(messages).where(eq(messages.id, id)).get()
  },

  add(data: { projectId: string; role: 'user' | 'agent'; kind: MessageKind; text: string; meta?: MessageMeta }): string {
    const id = `${Date.now().toString(36).padStart(9, '0')}-${crypto.randomUUID().slice(0, 8)}` // sorts by time within a second
    db.insert(messages)
      .values({ id, projectId: data.projectId, role: data.role, kind: data.kind, text: data.text.slice(0, 4000), meta: data.meta ? JSON.stringify(data.meta) : null })
      .run()
    return id
  },

  setMeta(id: string, meta: MessageMeta) {
    db.update(messages).set({ meta: JSON.stringify(meta) }).where(eq(messages.id, id)).run()
  },
}
