import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { hash } from '../../lib/hash.ts'

// Screen archetype blueprints (blueprints/<id>.json, one per planner archetype): the structure a
// kind of screen needs — what it must show, where its primary action lives, the mistakes that make
// it look generated. The planner picks the archetype; this puts the matching pattern into that
// screen's brief, so a "detail" screen gets a sticky bottom bar because the pattern says so, not
// because the model happened to remember.

const DIR = join(process.cwd(), 'blueprints')
// Platform component cards (HIG-01): craft/platform/<ios|android>/<component>.md, our wording of
// the platform guidelines. A screen's brief carries only the cards its archetype uses (HIG-02).
// ponytail: always iOS until a project can choose its platform (HIG-04).
const CARDS = join(process.cwd(), 'craft', 'platform')
const MAX_CARDS = 4
const cardCache = new Map<string, string>()
function card(platform: string, name: string): string {
  const key = `${platform}/${name}`
  if (!cardCache.has(key)) {
    const path = join(CARDS, platform, `${name}.md`)
    cardCache.set(key, /^[a-z-]+$/.test(name) && existsSync(path) ? readFileSync(path, 'utf8').trim() : '')
  }
  return cardCache.get(key)!
}

export type Blueprint = {
  id: string
  purpose: string
  layout: string
  sections: { required: string[]; optional: string[] }
  primaryAction: { placement: 'bottom-bar' | 'inline' | 'header' | 'none'; note: string }
  avoid: string[]
  hig: string[]
  /** 2–3 structurally different layouts for the same sections (VAR-02). */
  variants?: { id: string; layout: string }[]
  /**
   * GQ-15: the one thing the screen is about and how big it is drawn. The size is a floor in px,
   * because "hero" on its own came out as a 14px number in a row — Sleek's is ~120px. Not every
   * archetype has one; a settings screen is quiet on purpose.
   */
  hero?: {
    what: string
    size: string
    /** GQ-27: the one sticker this kind of screen wants, named here so the screen's own spec carries
     * it. The general paragraph in the system prompt produced two screens of the same flame and
     * none on the stats screen — a name in the specific brief is what a sampler acts on. */
    sticker?: string
    stickerWhy?: string
  }
  /** The pattern sketched with od-kit classes (KIT-04); [brackets] stand for this app's content. */
  kit?: string
}


const cache = new Map<string, Blueprint | null>()

export const BlueprintService = {
  find(id: string): Blueprint | null {
    if (!/^[a-z-]{2,30}$/.test(id)) return null
    if (!cache.has(id)) {
      const path = join(DIR, `${id}.json`)
      cache.set(id, existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as Blueprint) : null)
    }
    return cache.get(id)!
  },

  /**
   * Which layout variant an app uses for an archetype. Seeded by the app (its name), so every
   * screen of one archetype in one app shares a layout — the app stays coherent — while other apps
   * land on other layouts, which is what keeps different apps from looking the same.
   */
  variant(id: string, seed: string): { id: string; layout: string } | null {
    const vs = BlueprintService.find(id)?.variants ?? []
    return vs.length ? vs[hash(`${seed.trim().toLowerCase()}|${id}`) % vs.length] : null
  },

  /** The platform cards for an archetype's components, most important first, at most four. */
  platformNotes(id: string, platform = 'ios'): string {
    const cards = (BlueprintService.find(id)?.hig ?? []).map((h) => card(platform, h)).filter(Boolean).slice(0, MAX_CARDS)
    return cards.length ? `Platform notes (${platform === 'ios' ? 'iOS' : 'Android'}) for this screen's components:\n${cards.join('\n')}` : ''
  },

  /** The pattern as brief text — a few lines, so it fits next to the plan's own sections. */
  brief(id: string, seed?: string): string {
    const b = BlueprintService.find(id)
    if (!b) return ''
    const v = seed ? BlueprintService.variant(id, seed) : null
    return [
      v ? `Screen pattern (${b.id}, layout ${v.id}): ${v.layout} Use this layout, not the most common one.` : `Screen pattern (${b.id}): ${b.layout}`,
      `It must show: ${b.sections.required.join('; ')}.`,
      // The one place the brief says "big" in numbers. Left to taste, the hero was a 14px figure in a
      // row; a floor in px is the difference between a screen and a list.
      b.hero &&
        `HERO MOMENT: ${b.hero.what}. Draw it as ${b.hero.size}. It is the largest thing on the screen by a clear margin — nothing else comes within two type sizes of it, and everything else on the screen is at least one step quieter.${b.hero.sticker ? ` Put one sticker near it — \`<div data-od-sticker="${b.hero.sticker}"></div>\`, for ${b.hero.stickerWhy ?? 'this screen\'s moment'} — unless this app's subject calls for a different one from the list. It goes on the label's line or its own line above the figure, never on the figure's line and never positioned over it: the figure's size is measured for the full width.` : ''}`,
      `Primary action placement: ${b.primaryAction.note}`,
      `Avoid: ${b.avoid.join('; ')}.`,
      BlueprintService.platformNotes(id),
      b.kit && `Kit sketch of this pattern — structure only; follow the layout above where it differs, and replace every [bracket] with this app's real content (never output a bracket):\n${b.kit}`,
    ]
      .filter(Boolean)
      .join('\n')
  },
}
