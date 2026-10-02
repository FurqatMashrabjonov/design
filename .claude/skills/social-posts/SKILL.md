---
name: social-posts
description: Make posts for X, LinkedIn, Threads and Instagram from a Screenspell project — images in the brand's one style plus ready-to-paste captions. Use when the owner asks for a post, post images, a carousel, or "post qilib ber" / "post yasab ber" for an app made in Screenspell.
---

# Social posts from a project

The owner builds Screenspell in public, **from his personal account** ("I'm building…"): people follow people,
not logos. The brand account only reposts. Every caption is first person, his voice. A post shows one app made in the product, in one fixed style (ink
`#1a1511`, lime `#c6f648`, Instrument Sans with Instrument Serif italic for the one emphasised word, the Screenspell
lockup). Never invent a new look per post; the style lives in `scripts/social-posts.ts`.

## 1. Pick the project — or make one from a scenario

- **An existing app:** the owner pastes a canvas link, `http://localhost:3000/p/<projectId>` (the id is the last
  segment).
- **A scenario from Notion** ("keyingi post", "meditatsiya postini qil"): the scenarios live in the Notion database
  **Post ssenariylari** (data source `collection://76d1cb70-a300-4417-87f3-5494b11e3a96`, under the MVP plan page).
  Take the row the owner names, else the lowest `Tartib` whose `Holat` is `Navbatda`. Its `Prompt` goes to the
  product word for word: `scripts/social-posts.ts --brief "<Prompt>"` plans and draws the app (a real generation on
  the default model, about ten cents; the project is the admin's, so it shows on their dashboard) and prints
  `planned <projectId>`. Then set the row's `Holat` to `Yasaldi` and `Loyiha` to the canvas link. When the owner says
  it is posted: `Joylandi` and `Joylangan sana`.
- Neither given: list recent projects (`SELECT id, name, created_at FROM projects ORDER BY created_at DESC LIMIT 10`
  against `DATABASE_URL`) and ask which one.

## 2. Make the screens worth posting (before any image)

Shoot every screen at 2× and look at each one at full size (a 3-up sheet of 390×844 images is fastest). Look for:
text cut off or wrapping badly, boxes over text, numbers that disagree between screens (a weekly goal on one screen,
another figure on the next), empty half-screens, stray emoji in controls.

- Fix what you find **through the product**, so the post stays honest: call `GenerateController.stream` with
  `{ projectId, editScreenId, prompt }` from a throwaway script under `scripts/` (run with
  `node --env-file=.env --import ./scripts/alias-hook.mjs`, delete it after). Each edit is a chat step the owner can
  undo. Describe the problem precisely and say "keep everything else exactly as it is".
- If the same mistake survives two edits, it is a Konsta/kit trap, not the model: fix it in `src/lib/jsx-lint.ts`
  (one right answer) with a test in `controllers.check.ts`, as CLAUDE.md requires — then re-lint the stored screens
  (capture a `ScreenVersion` before each change).
- Edits cost model calls (a cent or two each on the default model); say how many you made.

## 3. Draw the images

```
node --env-file=.env --import ./scripts/alias-hook.mjs scripts/social-posts.ts --project <id> \
  [--prompt "the first message, typos fixed, meaning unchanged"] [--count <screens the sentence produced>] \
  [--edited yes|no] [--out docs/brand/posts/<app>]
```

(After a `--brief` run, review the new screens as in step 2 and rerun with `--project <id>` if anything was edited.)

It prints what it used (app, prompt, count, edited, which screens). Check it:

- **Honesty is the rule.** The quote must be the project's real first message (typos may be fixed). `--count` is how
  many screens the *plan* drew — screens added later in chat do not count (the plan message says "Designed N
  screens"). If anything was edited after, the copy must say so (`--edited yes`, the default when the chat has edits).
  No invented prompts, numbers or claims ("for free", "no edits") that the project does not support.
- Then read every image: nothing cut off, the phones not clipped awkwardly, the text readable.

Add `--share` once the site is deployed: it turns on the project's public preview and prints one link per platform
(`…/s/<token>?ref=x-<app>`, `linkedin-`, `threads-`, `ig-`) — the waitlist table then shows which post brought whom.
The live preview is our edge over competitors' static screenshots: **every post ends by inviting people to tap
through the real thing.**

Output (`docs/brand/posts/<app>/`): `strip-light.png` and `strip-dark.png` (1.91:1, every screen in a row on the
canvas with its name above — the main image for LinkedIn and X), `x-1-hero.png`, `x-2-ios-android.png`, `x-3-light-dark.png` (16:9, for X and
Threads) and `ig-1.png` … `ig-5.png` (9:16, in that order; the key content sits in the middle 3:4, which Instagram's
profile grid shows).

## 4. Captions — pick the format from the scenario's `Format` (empty = showcase)

Voice: a solo founder from Uzbekistan building in public — plain, specific, short lines, never hype (no "🚀 game
changer", no attacks on other tools). Never "ready-to-build" or "production": it is the design and a clickable
prototype.

- **teardown** — a simple app that earns well, and my take on it. Hook that breaks a myth ("Most people think you
  need a groundbreaking idea for a big app. You don't.") → the real app and its numbers **only from the row's
  `Raqamlar`, with `~` and "(estimates)" when they are third-party** → why it works (one clear problem, one clear
  audience, a clean flow, a way to pay) → the bridge (the edge today is how fast you can design, test and launch) →
  "I described it in one sentence to Screenspell" → the strip image → "tap through it yourself". Never copy the
  app's name, logo or look into our design, and never imply we are affiliated: "an app like X", "my take on X". A
  number without a source in the row does not go in the post.
- **experiment** — the idea of the day: "I had an idea today:" → three bullets of what it does → "normally this is
  days of design" → "I typed one sentence into Screenspell, a few minutes later:" → the strip → one takeaway line
  (seeing the idea beats imagining it) → "tap through it".
- **showcase** — the first-post style: the prompt, the screen count, iOS/Android and light/dark, a question.

Per platform:
- **LinkedIn** — the full text, the strip image (light usually; dark for midnight apps). LinkedIn holds back posts
  with links, so the preview link goes in the **first comment**.
- **X** — the same story cut to ~280 characters for post 1 with the strip; reply 2 `x-2-ios-android.png`, reply 3
  `x-3-light-dark.png`; the preview link in the last reply, never post 1.
- **Threads** — conversational, the strip plus one more image, a question at the end, one topic tag; a link in the
  post is fine.
- **Instagram** — the five 9:16 slides `ig-1` → `ig-5`, a short caption, 4–6 hashtags, "link in bio" (the bio link
  carries `?ref=ig-bio`).

Links work only once the site is deployed; until then write the captions without them and say where the link
will go.

## 5. Report

Answer the owner in Uzbek: what was fixed (and how many edits), where the images are, the captions ready to paste,
and when to post (Tashkent 18:00–21:00 reaches the US morning). Log the post set in `docs/CHANGELOG.md` only if code
changed; images alone are not a code change.
