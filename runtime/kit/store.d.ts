export function setupStore(mod: { initial?: unknown; actions?: Record<string, (state: any, ...args: any[]) => unknown>; derived?: Record<string, (state: any) => unknown> } | null, opts?: { id?: string; persist?: boolean }): void
export function resetStore(): void
export function readStore(): Record<string, unknown>
export function useStore(): Record<string, any>
