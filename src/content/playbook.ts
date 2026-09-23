import { HIG } from '@/lib/hig-rules'

// MKT-06: the rules this product enforces, written for a person rather than for the linter. Each
// one is a decision, its reason, and where it is held — the last column is the argument: a rule a
// tool only asks a model for is a suggestion, a rule it applies in code is a guarantee.
export type PlaybookRule = {
  title: string
  rule: string
  why: string
  /** Where it is enforced — the file a reader could go and check. */
  where: string
}

export type PlaybookSection = { id: string; title: string; blurb: string; rules: PlaybookRule[] }

export const PLAYBOOK: PlaybookSection[] = [
  {
    id: 'platform',
    title: 'Platform minimums',
    blurb: 'The numbers a phone screen cannot go below. They live in one file, and the linter, the auto-fix and the render audit all read them from there.',
    rules: [
      {
        title: `Nothing smaller than ${HIG.minFontPx}px`,
        rule: `Every piece of text, captions and tab labels included, is at least ${HIG.minFontPx}px.`,
        why: 'Below that, text stops being read and starts being decoration — and a caption is usually the line that carries the fact.',
        where: 'lib/hig-rules.ts → autofixScreen raises it',
      },
      {
        title: `${HIG.minTargetPx}×${HIG.minTargetPx}px touch targets`,
        rule: `Anything tappable gets a ${HIG.minTargetPx}px hit area, whatever it is drawn at, with ${HIG.targetGapPx}px between separate targets.`,
        why: 'A 20px icon button is a miss waiting to happen; the hit area can be invisible, the target cannot be small.',
        where: 'autofixScreen adds a centred ::after hit area',
      },
      {
        title: `Contrast ${HIG.contrast.text}:1`,
        rule: `Body text holds ${HIG.contrast.text}:1 against its real background; ${HIG.contrast.largeText}:1 from ${HIG.contrast.largeTextPx}px up.`,
        why: 'Light grey on white is the most common generated-UI failure, and it is invisible in a screenshot review.',
        where: 'design-lint + the in-frame render audit',
      },
      {
        title: `${HIG.tabs.min}–${HIG.tabs.max} tabs`,
        rule: 'A bottom bar carries between two and five destinations, and every one of them opens a screen that exists.',
        why: 'A sixth tab means the app has no primary sections; a tab that opens nothing is a dead end.',
        where: 'parsePlan closes the navigation before anything is drawn',
      },
    ],
  },
  {
    id: 'consistency',
    title: 'One app, not five screens',
    blurb: 'Screens are generated in parallel, so anything that must match across them is applied afterwards, in code. Prompt wording cannot hold a contract across independent samples.',
    rules: [
      {
        title: 'The navigation is injected, not drawn',
        rule: 'The bottom bar is built once and pasted into every root screen, identical but for the active tab.',
        why: 'Ask five parallel calls for "the same tab bar" and you get five tab bars with different labels, icons and heights.',
        where: 'ShellService.buildBottomNav',
      },
      {
        title: 'The bar has a shape, and the app picks it once',
        rule: 'A floating island, a narrow translucent pill or a filled contrast bar — chosen from the app name, then repeated on every screen.',
        why: 'The bar is on every screen, so its shape dates the whole app; and one app must not change shape halfway through.',
        where: 'ShellService.navStyle',
      },
      {
        title: 'The data is the app’s, not the screen’s',
        rule: 'Dishes, transactions and habits are planned once and handed to every screen that shows them.',
        why: 'Otherwise the cart totals disagree with the menu, and a reviewer notices in four seconds.',
        where: 'the plan’s entities, injected by dataBlock',
      },
      {
        title: 'Photos are slots',
        rule: 'The model writes what the photo shows; the server fetches a real one and locks the box it sits in.',
        why: 'Models invent image URLs that 404, and a photo that decides its own size breaks the layout under it.',
        where: 'ImageService.resolveImages',
      },
    ],
  },
  {
    id: 'craft',
    title: 'Craft, applied in code',
    blurb: 'Rules with exactly one right answer are not worth asking a model for. They are applied to every screen after it is generated, as zero-specificity defaults a screen can always override.',
    rules: [
      {
        title: 'Numbers line up',
        rule: 'Prices, stats and times get tabular figures.',
        why: 'Proportional digits make a column of prices look ragged even when the markup is perfect.',
        where: 'autofixScreen → font-variant-numeric',
      },
      {
        title: 'Headings balance',
        rule: 'Headings get text-wrap: balance, body copy gets pretty.',
        why: 'A heading that drops one word onto its own line reads as a bug.',
        where: 'autofixScreen',
      },
      {
        title: 'Buttons answer the press',
        rule: 'A press scales to 0.96 — and only when the viewer has not asked for reduced motion.',
        why: '0.96 reads as a press; 0.95 and below reads as a glitch.',
        where: 'autofixScreen, inside a prefers-reduced-motion query',
      },
      {
        title: 'Keyboard focus is visible',
        rule: 'Every focusable element shows a 2px accent ring on :focus-visible.',
        why: 'A missing focus ring cannot be seen in a screenshot review, so it must never depend on one.',
        where: 'autofixScreen',
      },
    ],
  },
  {
    id: 'tells',
    title: 'The tells of generated UI',
    blurb: 'Traits that cluster in AI output. Each is counted on every evaluation run before anything is done about it — a failure mode gets a counter first, then a fix.',
    rules: [
      {
        title: 'No ALL-CAPS eyebrow above every heading',
        rule: 'A section gets a heading, not a tracked-out label above the heading. Sentence case everywhere.',
        why: 'It is the single most recognisable mark of a generated page.',
        where: 'craft/mobile.md + the tells counters in the eval',
      },
      {
        title: 'No meta strings glued with middle dots',
        rule: '"12 min · Easy · 4.8 · Vegan" on every card becomes the one or two facts that decide.',
        why: 'Four facts in a row is four facts nobody reads.',
        where: 'craft/mobile.md',
      },
      {
        title: 'Not every section is a card',
        rule: 'A grid of identical rounded cards with the same soft shadow is not the answer to every section.',
        why: 'Sameness across sections is what makes a page feel assembled rather than designed.',
        where: 'blueprints: one pattern per screen archetype, with layout variants',
      },
      {
        title: 'One entrance, not fifteen',
        rule: 'At most one load sequence, moving whole blocks about 100ms apart.',
        why: 'A fade-and-slide on each card is the clearest sign a machine made the page.',
        where: 'craft/mobile.md',
      },
    ],
  },
]
