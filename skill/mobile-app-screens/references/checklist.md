# The pass over a finished screen

Run these in order. The first four are measurable; the rest need eyes.

1. **Sizes.** No font-size below 11px anywhere, including inline styles and utility classes.
2. **Targets.** Every button, chip and icon control measures at least 44×44px including its hit area.
3. **Contrast.** Every text colour against its real background: 4.5:1, or 3:1 from 24px up.
4. **Overflow.** Nothing wider than 390px; no text clipped by its box; nothing hidden behind the bar.
5. **Shell.** Exactly one bottom bar, and the screen did not draw its own. The active tab is this
   screen's tab.
6. **Data.** Names, prices and totals match the app's plan and each other.
7. **Tells.** No ALL-CAPS eyebrows, no middle-dot meta strings, no grid of identical cards, no
   per-section fade-and-slide.
8. **Focus and motion.** Focus rings visible; non-essential motion inside a reduced-motion query.

Anything that fails 1–4 has exactly one right answer — fix it in code rather than regenerating the
screen, and the fix will be the same every time.
