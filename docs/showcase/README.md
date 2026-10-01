# Showcase — nine prototypes from one prompt each

Made 2026-10-01 for the landing and for posts. Each folder holds what the pipeline produced for one prompt: `plan.json`
(the planner's plan: name, style, palette, tabs, data) and one `.jsx` per screen, exactly as stored. The pictures are in
`public/examples/<id>/` (780×1688, an iPhone's safe areas; `sm/` is 440 wide).

- Prompts: `eval/showcase-briefs.json`.
- Generated: `LLM_PROVIDER=claude-cli CLAUDE_CLI_MODEL=claude-opus-5-5 npm run eval -- --label showcase-opus --briefs eval/showcase-briefs.json --concurrency 3`
  (10 apps, 77 screens, 100% built, 0 crashes, ~150 s per app; `metrics.json`).
- Pictured with the product's `screenshotScreen` (SHOT_SCALE=2, look = the plan's accent and style, midnight → dark,
  insets 54/34), photos resolved from Pexels as the product does at save.
- Left out: the sneaker store (`kicks`, wrong photos) and four broken screens — stay/explore and stay/stay-detail
  (blank gallery photo), food/onboarding (an empty block), cook/profile (photo over the avatar). Their sources are
  kept here; nothing shown was edited.
