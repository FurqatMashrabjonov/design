import { asc, eq } from 'drizzle-orm'
import { db } from '@/database/connection'
import { messages } from '@/database/schema'
import type { MessageKind, MessageMeta } from '@/lib/agent-messages'

export type MessageRow = typeof messages.$inferSelect

// Ids sort in the order messages were written: an ask and its answer are often written within the
// same millisecond, and a random suffix alone would order them by chance.
let seq = 0
const nextId = () => `${Date.now().toString(36).padStart(9, '0')}-${(seq++ % 1_679_616).toString(36).padStart(4, '0')}-${crypto.randomUUID().slice(0, 4)}`

export const Message = {
  forProject(projectId: string): MessageRow[] {
    return db.select().from(messages).where(eq(messages.projectId, projectId)).orderBy(asc(messages.createdAt), asc(messages.id)).all()
  },

  find(id: string): MessageRow | undefined {
    return db.select().from(messages).where(eq(messages.id, id)).get()
  },

  add(data: { projectId: string; role: 'user' | 'agent'; kind: MessageKind; text: string; meta?: MessageMeta }): string {
    const id = nextId()
    db.insert(messages)
      .values({ id, projectId: data.projectId, role: data.role, kind: data.kind, text: data.text.slice(0, 4000), meta: data.meta ? JSON.stringify(data.meta) : null })
      .run()
    return id
  },

  setMeta(id: string, meta: MessageMeta) {
    db.update(messages).set({ meta: JSON.stringify(meta) }).where(eq(messages.id, id)).run()
  },
}
