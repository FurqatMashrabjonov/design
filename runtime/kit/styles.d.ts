export const STYLES: readonly string[]
export function parseStyle(s: unknown): string
export function styleTokens(style: string, accent: string, dark: boolean): { page: string; card: string; card2: string; line: string; radius: number; body: string; display: string }
export function applyStyle(style: string, accent: string, dark: boolean, root?: HTMLElement): void
