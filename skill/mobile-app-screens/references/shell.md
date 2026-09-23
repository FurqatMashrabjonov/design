# The shared shell

Build these once per app and paste them in; never ask for them per screen.

## Bottom bar

Common to every shape:

```
position:fixed;z-index:40;display:flex;align-items:stretch;justify-content:space-around;
box-sizing:content-box;padding-bottom:env(safe-area-inset-bottom)
```

Then one shape, chosen once per app:

```css
/* island — the default */
left:12px;right:12px;bottom:12px;height:64px;border-radius:28px;background:var(--surface);
box-shadow:0 10px 30px -12px rgba(0,0,0,.38), 0 2px 6px -2px rgba(0,0,0,.12),
           0 0 0 1px color-mix(in oklab, var(--fg) 8%, transparent)

/* pill — icons only, centred */
left:50%;transform:translateX(-50%);bottom:14px;height:58px;border-radius:9999px;
background:color-mix(in oklab, var(--surface) 84%, transparent);backdrop-filter:blur(14px)

/* contrast — inverts itself on a dark system */
left:16px;right:16px;bottom:14px;height:60px;border-radius:9999px;
background:var(--fg);color:var(--bg)
```

The hairline in the shadow is what separates the panel on a dark background, where a shadow is
invisible.

Active tab, where there are labels:

```css
background:color-mix(in oklab, var(--accent) 14%, transparent);border-radius:9999px;padding:6px 14px
```

Where there are none, a 4px dot under the icon. Icon-only tabs still carry `aria-label`.

## Detail header

A pushed screen gets a 56px sticky header: a 44px back button, then the title at 17px/600. The
screen itself draws no header, no back button, and no bottom bar.

## The contract given to each screen

State plainly, in the brief for every screen:

1. The shared bar (or header) is added automatically after the screen is finished.
2. Do not draw a bottom nav, tab bar or floating action button — a second one will collide.
3. This screen is the "<tab>" tab; the injected bar highlights it.
4. End the page with <clearance>px of bottom padding.
