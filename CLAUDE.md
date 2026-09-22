# Working agreement

This is an MVP. The rules below exist so scope stays fixed. Read them before writing code.

## Scope rules (highest priority)

1. **The Notion database ["Vazifalar"](https://app.notion.com/p/55b59dbe8eb4414490bd2baa79cc6540) is the source of truth for what to build.** Work only on rows whose `Doira` is `MVP` and whose `Holat` is not `Tayyor`, in `Tartib` order. The plan is written in Uzbek: `Doira` = scope (`MVP` / `Keyin` / `Bekor`), `Holat` = status (`Rejada` / `Jarayonda` / `Bloklangan` / `Tayyor`).
2. **No feature that is not in the roadmap.** If you think of one (or the user asks for something not listed), do not build it. Add it to the Notion plan with `Doira` = `Keyin`, say so in one line, and ask whether to move it to `MVP`.
3. **Finish before starting.** Do not begin a new row while another is `Jarayonda`.
4. **Bug fixes, tests, and refactors needed to finish an MVP row are in scope.** Cleanup that serves no MVP row is not.
5. Do not propose new features unprompted while an MVP row is open. Recommendations are welcome only when the user asks "what's next" or asks for research.

## Log every change

After each completed change, before reporting it done:

- Add an entry to `docs/CHANGELOG.md` (newest first): what changed, files touched, how it was verified.
- Set the row's `Holat` to `Tayyor` in Notion, and regenerate the `docs/ROADMAP.md` snapshot.
- If it changes how the system works, update the "Architecture rules" section below.

`docs/ROADMAP.md` is a read-only snapshot of that database so the plan stays readable without Notion. When Notion is unreachable, work from the snapshot and reconcile once it is back. Related Notion pages: the [plan overview](https://app.notion.com/p/3e039db48ef981bb9c26e3b652eeebaa), the [Modullar](https://app.notion.com/p/cea1e64dba26420d8a3d5088f9272201) database (one page per module, with its tasks), and the [competitor notes](https://app.notion.com/p/3e139db48ef981f2adb7f6d10f919ed5).

Starting a session on a new machine or after a break: read `docs/HANDOFF.md` first — current state, open issues, and setup.

## Commands

```
npm run dev          # vite dev server (http://localhost:3000 by default; pass --port to change)
npm run check        # service, database and feature tests (plain node scripts, no framework)
npx tsc --noEmit     # typecheck
npm run eval         # generate eval/briefs.json through the real pipeline -> eval/out/<label>/ (costs LLM tokens)
                     #   flags: --only id,id  --limit n  --concurrency n  --label name  --no-shot
```

A change is not done until `npm run check` and `npx tsc --noEmit` are clean. UI changes must also be exercised in a real browser (golden path plus one edge case) — type checks do not prove a feature works.

A change to generation (prompts, planner, normalizer, linter, shell) is judged on the eval set, not on one hand-picked prompt: run `npm run eval -- --label <what-changed>` and read `compare.html` and the metrics delta against the previous run. Use `--only` while iterating; a full run is 25 briefs.

## Model policy

Generation runs on DeepSeek V4 Flash (`deepseek-flash`) with thinking disabled, and nothing else — not `deepseek-v4-pro`, not thinking mode. Both are pinned in `LlmService`: asked for by name, `deepseek-flash` thinks by default, and reasoning tokens are billed as output. (The old `deepseek-chat` id is an alias of exactly this configuration.) Push correctness into deterministic code instead of asking a model to hold a contract — see the next section.

For local testing only, `LLM_PROVIDER=claude-cli` routes generation through the developer's own Claude Code login (`claude -p`) so trying things costs no DeepSeek balance. It refuses to run with `NODE_ENV=production`, and `npm run eval` refuses to run with it: evals always measure DeepSeek.

## Architecture rules

- **Consistency across screens is enforced in code after generation, never by prompt wording.** Parallel LLM calls are independent samples. Anything that must match across screens belongs in `ShellService`, `lib/screen-normalizer.ts`, or `lib/design-lint.ts`. Prompt text should only tell the model *not* to draw things the code injects.
- **Layers:** `app/Models` (data access), `app/Services` (logic), `app/Http/Controllers` (request handling), `routes/` (TanStack file routes), `server/fns.ts` (route-to-controller binding). Migrations are numbered files in `database/migrations`, registered in `database/migrate.ts`.
- **The plan is a contract checked in code, not a suggestion.** `parsePlan` closes the vocabulary (`ARCHETYPES`, icon names, screen types), enforces one root screen per tab, prunes tabs no screen opens, keeps only links to real screens, cleans the data model, and reports requested screens the plan dropped; `planScreens` spends one repair call on those. The app's data model (`entities`) is stored in `projects.plan` and put into every screen's brief by `dataBlock` — a screen never invents its own dishes, transactions or tasks.
- **Structure comes from blueprints, not from the model's memory.** `blueprints/<archetype>.json` holds one pattern per planner archetype (sections, where the primary action lives, what to avoid); `screenSpec` puts the planned screen's pattern into its spec via `BlueprintService`. A new archetype needs a blueprint (`services.check.ts` enforces one per archetype), and a change to a blueprint is a generation change — judge it on the eval (`plan.bottomBarShare` measures adherence). Each blueprint has 2–3 layout variants; `BlueprintService.variant` picks one per app (seeded by the app name), so one app is coherent and different apps differ (`sameness.sameKindMean`).
- **The app type is decided in code, before planning.** `AppPatternService.classify` matches the brief to one of `app-patterns/*.json` by keywords (en/uz/ru) and only that pattern goes into the planner's user message, worded as subordinate to the brief: a pattern may fill open slots but never displace a requested screen. No match means no pattern.
- **Every screen is generated with its app's context, whichever path makes it.** `app/Services/ScreenContext.ts` builds the brief (app name, sibling screens, shell contract, house-style digest) for both the planned run and a screen added later from chat. A new generation path must go through it, or the screen is designed as if it belonged to no app.
- **The conversation is written by the controllers, in code.** Every generation request records the ask and then what was done (`messages` table, `lib/agent-messages.ts`): the agent's reply and log are assembled from facts the pipeline already has — never from a model — and each agent message points at the snapshot taken before its change, which is what makes "Undo this step" exact. A new way to change a screen must write its message, with `versionId` or `created`, or it cannot be undone from the chat. The one exception is stepping between a screen's versions with the frame's `‹ ›` (`screens.version_id`): the opposite arrow is its undo, and every edit path starts from what the frame shows.
- **Elements are addressed by ids that are computed, not stored.** `annotateElements` (lib/element-ops.ts) is deterministic and idempotent; the browser runs it on stored HTML to render and the server runs it on the same stored HTML before any element edit, so both agree on `button-3` without it ever being saved. Every element edit — by hand or by model — must start from `annotateElements(screen.html)`. Hand edits splice the source (lib/html-tree.ts) so the rest of the screen stays byte-identical.
- **A frame only trusts messages from its own iframe.** Every `ScreenFrame` listens on the same `window`; a handler that skips the `e.source === iframeRef.current.contentWindow` check answers every other frame's messages too. Anything a frame posts is untrusted input and is validated before it changes state or reaches the database.
- **A deleted screen keeps its row too** (`deleted_at`), so Cmd+Z can bring it back with its versions. `Screen.forProject` / `positions` leave deleted rows out; `find` / `findInProject` still return them (that is how restore and revert reach them), so a new listing query must filter `deleted_at IS NULL` itself.
- **Every canvas action is undoable from the keyboard** (`lib/undo-stack.ts`): an action either records its inverse (`pairStep`) or writes a conversation message, which the route turns into a step whose undo and redo are both "revert the latest message of the chain" (`messageStep`). A revert message records what it did in the same shape as the message it reverted, so reverting it is the redo. A new action that changes saved state does one of the two, or Cmd+Z will skip over it.
- **A screen that failed to generate keeps its row** (`html = ''`, `error`, `spec`), so it holds its slot on the canvas and can be retried in place. Code that lists screens for display, export, preview or measurement skips rows with empty `html`. `spec` is what a screen was planned to be and is never overwritten; `prompt` is the last instruction.
- **Platform numbers live in `lib/hig-rules.ts`** (min font, tap target, contrast, tabs). The linter, `autofixScreen` and the render audit read them from there; the prompt only says them in words. A fix with exactly one right answer (tiny text → 11px, an icon button's 44px hit area) belongs in `autofixScreen`, not in the prompt.
- **Shell markup uses inline styles only**, never Tailwind classes. Whether a screen loads Tailwind is the model's choice; a class-styled nav collapsed off-screen on a plain-CSS screen.
- **Never hardcode a light surface** (`bg-white`, `#fff`) in shell markup. Use `var(--surface)` / `var(--border)` or dark design systems break.
- **Icons are `<i data-lucide="name">`.** The model must not hand-draw icon SVG.
- **Mobile prompts read `design-systems/<id>/STYLE.md`, never `DESIGN.md`.** The style card describes the look only: no brand, product or mascot names, colours only as `var(--token)` from that system's `tokens.css`, at most 60 lines, fixed section outline. `services.check.ts` enforces this for every system, so a new design system needs a card that passes it. `DESIGN.md` is the source the card is distilled from and still feeds the desktop prompt.
- **The mobile system prompt has a budget: under 24 000 characters, enforced by a test.** Craft guidance for phone screens lives in one file, `craft/mobile.md` (at most 150 lines, each rule a decision plus its reason). A new rule replaces a weaker one; it is not appended. The long craft essays (`accessibility-baseline`, `form-validation`, …) belong to the web skills only.
- **Images are slots.** The model writes `<img data-od-img="what the photo shows" alt="…">` with no `src`; `ImageService.resolveImages` fills it from Pexels before the screen is saved, caching by normalised query in `image_cache`, and locks the box (`object-fit`, `aspect-ratio`) so a photo never decides layout. Only `https://images.pexels.com/` URLs are accepted; the API key stays server-side. A slot with no photo becomes a token-coloured block, never a broken image. Any new path that saves generated HTML must call `resolveImages`.
- **Fonts are declared per design system** as `@import` in `design-systems/<id>/tokens.css` and injected by the normalizer. Every family in that URL must appear in a `--font-*` stack. Validate any new Google Fonts URL with curl; a weight the family lacks makes the whole request 400.
- **Theme overrides are applied at render time** over stored HTML (`lib/theme-override.ts`); stored screens are never rewritten. Only validated values reach CSS — sanitize at every boundary.
- **The eval harness runs the real controllers, never a copy of the pipeline.** `eval/run.ts` calls `PlanController.stream` in-process against a throwaway SQLite file (`DB_PATH`), so it measures what users get. `eval/alias-hook.mjs` is what lets plain `node` resolve `@/` outside Vite. Metrics in `eval/metrics.ts` are deterministic; every known failure mode gets a counter there before it gets a fix.
- **Shell and injected markup carries markers** (`data-od-shell`, `data-od-icon`, `data-od-font`, `data-od-tab`, `data-od-back`; the model adds `data-od-link`, `data-od-img`, `data-od-avatar`, `data-od-logo`) so the linter and the preview recognize canonical output.

## Git

- Commit and push only when the user asks.
- Pushing over HTTPS needs the GitHub CLI credential helper:
  `git -c credential.helper='!gh auth git-credential' push origin <branch>`
- Never commit `.env` or `data.db*` (both are ignored).
