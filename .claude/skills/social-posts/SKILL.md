---
name: social-posts
description: Make launch posts for X, Threads and Instagram from a Screenspell project — images in the brand's one style plus ready-to-paste captions. Use when the owner asks for a post, post images, a carousel, or "post qilib ber" / "post yasab ber" for an app made in Screenspell.
---

# Social posts from a project

The owner builds Screenspell in public. A post shows one app made in the product, in one fixed style (ink
`#1a1511`, lime `#c6f648`, Instrument Sans with Instrument Serif italic for the one emphasised word, the Screenspell
lockup). Never invent a new look per post; the style lives in `scripts/social-posts.ts`.

## 1. Pick the project

- The owner usually pastes a canvas link: `http://localhost:3000/p/<projectId>` — the id is the last segment.
- If none is given, list recent projects (`SELECT id, name, created_at FROM projects ORDER BY created_at DESC LIMIT 10`
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

It prints what it used (app, prompt, count, edited, which screens). Check it:

- **Honesty is the rule.** The quote must be the project's real first message (typos may be fixed). `--count` is how
  many screens the *plan* drew — screens added later in chat do not count (the plan message says "Designed N
  screens"). If anything was edited after, the copy must say so (`--edited yes`, the default when the chat has edits).
  No invented prompts, numbers or claims ("for free", "no edits") that the project does not support.
- Then read every image: nothing cut off, the phones not clipped awkwardly, the text readable.

Output (`docs/brand/posts/<app>/`): `x-1-hero.png`, `x-2-ios-android.png`, `x-3-light-dark.png` (16:9, for X and
Threads) and `ig-1.png` … `ig-5.png` (4:5 carousel, in that order).

## 4. Captions, in English, one block per platform

Voice: a solo founder from Uzbekistan building in public — plain, specific, a little proud, never hype (no "🚀
game changer", no attacks on other tools). Quote the real prompt. End with a question or a way to get in.

- **X** — a 3-post thread: post 1 with `x-1-hero.png` (the prompt, the count, "then a few edits" if edited, beta
  timing, a question), reply 2 with `x-2-ios-android.png`, reply 3 with `x-3-light-dark.png`. A link, if any, goes
  in the last reply, never the first post. Pin post 1 if it is the best so far.
- **Threads** — one post with the three 16:9 images, conversational, ending in a question; one topic tag
  (`#buildinpublic`, `#indiehackers` or `#uidesign`).
- **Instagram** — the carousel `ig-1` → `ig-5`, a short caption and 4–6 hashtags (`#appdesign #uidesign
  #buildinpublic #mobileapp …`). `ig-1` is the cover.

Links: only once the site is deployed; each gets its own `?ref=` (`?ref=x-<app>`, `?ref=threads-<app>`,
`?ref=ig-<app>`) so the admin's waitlist table shows which post worked.

## 5. Report

Answer the owner in Uzbek: what was fixed (and how many edits), where the images are, the captions ready to paste,
and when to post (Tashkent 18:00–21:00 reaches the US morning). Log the post set in `docs/CHANGELOG.md` only if code
changed; images alone are not a code change.
