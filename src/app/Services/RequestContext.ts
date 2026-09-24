import { AsyncLocalStorage } from 'node:async_hooks'

// OBS-10: which HTTP request the current code runs for. The request middleware (src/start.ts) opens
// it; userFrom() fills in the user once it is known. Logs and model calls read it to point back.
export type RequestStore = { requestId: string; userId?: string }

const als = new AsyncLocalStorage<RequestStore>()

export const RequestContext = {
  run: <T>(store: RequestStore, fn: () => T): T => als.run(store, fn),
  get: (): RequestStore | undefined => als.getStore(),
}
