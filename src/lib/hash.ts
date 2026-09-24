// FNV-1a over a string: the one stable pick behind every "decided in code, seeded by the app"
// choice — the blueprint variant, the bottom bar, the art direction, the design system. Stable on
// every run and every machine, which Math.random and a JS object's key order are not.
export function hash(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193)
  return h >>> 0
}
