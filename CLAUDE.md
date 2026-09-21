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

Generation runs on DeepSeek's fast chat model (`deepseek-chat`) only. Never switch to `deepseek-reasoner`. Push correctness into deterministic code instead of asking a model to hold a contract — see the next section.

## Architecture rules

- **Consistency across screens is enforced in code after generation, never by prompt wording.** Parallel LLM calls are independent samples. Anything that must match across screens belongs in `ShellService`, `lib/screen-normalizer.ts`, or `lib/design-lint.ts`. Prompt text should only tell the model *not* to draw things the code injects.
- **Layers:** `app/Models` (data access), `app/Services` (logic), `app/Http/Controllers` (request handling), `routes/` (TanStack file routes), `server/fns.ts` (route-to-controller binding). Migrations are numbered files in `database/migrations`, registered in `database/migrate.ts`.
- **Every screen is generated with its app's context, whichever path makes it.** `app/Services/ScreenContext.ts` builds the brief (app name, sibling screens, shell contract, house-style digest) for both the planned run and a screen added later from chat. A new generation path must go through it, or the screen is designed as if it belonged to no app.
- **Shell markup uses inline styles only**, never Tailwind classes. Whether a screen loads Tailwind is the model's choice; a class-styled nav collapsed off-screen on a plain-CSS screen.
- **Never hardcode a light surface** (`bg-white`, `#fff`) in shell markup. Use `var(--surface)` / `var(--border)` or dark design systems break.
- **Icons are `<i data-lucide="name">`.** The model must not hand-draw icon SVG.
- **Mobile prompts read `design-systems/<id>/STYLE.md`, never `DESIGN.md`.** The style card describes the look only: no brand, product or mascot names, colours only as `var(--token)` from that system's `tokens.css`, at most 60 lines, fixed section outline. `services.check.ts` enforces this for every system, so a new design system needs a card that passes it. `DESIGN.md` is the source the card is distilled from and still feeds the desktop prompt.
- **The mobile system prompt has a budget: under 24 000 characters, enforced by a test.** Craft guidance for phone screens lives in one file, `craft/mobile.md` (at most 150 lines, each rule a decision plus its reason). A new rule replaces a weaker one; it is not appended. The long craft essays (`accessibility-baseline`, `form-validation`, …) belong to the web skills only.
- **Images are slots.** The model writes `<img data-od-img="what the photo shows" alt="…">` with no `src`; `ImageService.resolveImages` fills it from Pexels before the screen is saved, caching by normalised query in `image_cache`, and locks the box (`object-fit`, `aspect-ratio`) so a photo never decides layout. Only `https://images.pexels.com/` URLs are accepted; the API key stays server-side. A slot with no photo becomes a token-coloured block, never a broken image. Any new path that saves generated HTML must call `resolveImages`.
- **Fonts are declared per design system** as `@import` in `design-systems/<id>/tokens.css` and injected by the normalizer. Every family in that URL must appear in a `--font-*` stack. Validate any new Google Fonts URL with curl; a weight the family lacks makes the whole request 400.
- **Theme overrides are applied at render time** over stored HTML (`lib/theme-override.ts`); stored screens are never rewritten. Only validated values reach CSS — sanitize at every boundary.
- **The eval harness runs the real controllers, never a copy of the pipeline.** `eval/run.ts` calls `PlanController.stream` in-process against a throwaway SQLite file (`DB_PATH`), so it measures what users get. `eval/alias-hook.mjs` is what lets plain `node` resolve `@/` outside Vite. Metrics in `eval/metrics.ts` are deterministic; every known failure mode gets a counter there before it gets a fix.
- **Shell and injected markup carries markers** (`data-od-shell`, `data-od-icon`, `data-od-font`, `data-od-tab`, `data-od-back`) so the linter and the preview recognize canonical output.

## Git

- Commit and push only when the user asks.
- Pushing over HTTPS needs the GitHub CLI credential helper:
  `git -c credential.helper='!gh auth git-credential' push origin <branch>`
- Never commit `.env` or `data.db*` (both are ignored).
