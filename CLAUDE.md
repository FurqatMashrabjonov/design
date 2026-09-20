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
```

A change is not done until `npm run check` and `npx tsc --noEmit` are clean. UI changes must also be exercised in a real browser (golden path plus one edge case) — type checks do not prove a feature works.

## Model policy

Generation runs on DeepSeek's fast chat model (`deepseek-chat`) only. Never switch to `deepseek-reasoner`. Push correctness into deterministic code instead of asking a model to hold a contract — see the next section.

## Architecture rules

- **Consistency across screens is enforced in code after generation, never by prompt wording.** Parallel LLM calls are independent samples. Anything that must match across screens belongs in `ShellService`, `lib/screen-normalizer.ts`, or `lib/design-lint.ts`. Prompt text should only tell the model *not* to draw things the code injects.
- **Layers:** `app/Models` (data access), `app/Services` (logic), `app/Http/Controllers` (request handling), `routes/` (TanStack file routes), `server/fns.ts` (route-to-controller binding). Migrations are numbered files in `database/migrations`, registered in `database/migrate.ts`.
- **Shell markup uses inline styles only**, never Tailwind classes. Whether a screen loads Tailwind is the model's choice; a class-styled nav collapsed off-screen on a plain-CSS screen.
- **Never hardcode a light surface** (`bg-white`, `#fff`) in shell markup. Use `var(--surface)` / `var(--border)` or dark design systems break.
- **Icons are `<i data-lucide="name">`.** The model must not hand-draw icon SVG.
- **Fonts are declared per design system** as `@import` in `design-systems/<id>/tokens.css` and injected by the normalizer. Every family in that URL must appear in a `--font-*` stack. Validate any new Google Fonts URL with curl; a weight the family lacks makes the whole request 400.
- **Theme overrides are applied at render time** over stored HTML (`lib/theme-override.ts`); stored screens are never rewritten. Only validated values reach CSS — sanitize at every boundary.
- **Shell and injected markup carries markers** (`data-od-shell`, `data-od-icon`, `data-od-font`, `data-od-tab`, `data-od-back`) so the linter and the preview recognize canonical output.

## Git

- Commit and push only when the user asks.
- Pushing over HTTPS needs the GitHub CLI credential helper:
  `git -c credential.helper='!gh auth git-credential' push origin <branch>`
- Never commit `.env` or `data.db*` (both are ignored).
