import { eq } from 'drizzle-orm'
import { db } from '@/database/connection'
import { imageCache } from '@/database/schema'

export const ImageCache = {
  async find(query: string) {
    return (await db.select().from(imageCache).where(eq(imageCache.query, query)))[0]
  },

  // Two screens of one app are generated in parallel and often want the same photo.
  async save(query: string, url: string, avgColor: string | null) {
    await db.insert(imageCache).values({ query, url, avgColor }).onConflictDoNothing()
  },
}
