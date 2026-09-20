// Canvas frames grow to fit their screen instead of being cropped at the device height.
//
// The parent can't measure the page itself: the generated HTML runs in a sandbox that withholds
// same-origin access, so contentDocument is unreachable. The page measures itself and posts the
// number out, the same postMessage shape the theme and prototype bridges already use.
//
// The measurement only holds still if nothing in the page sizes itself against the *frame*. A
// screen that says `min-height: 100dvh` would stretch to whatever height we just gave the iframe
// and report that back, so the frame could grow but never shrink again. So before measuring we
// pin the viewport reference to the device height: `--od-frame-vh` replaces the viewport units and
// the root box is held at that height. Content taller than the device then overflows the root box,
// which is exactly what scrollHeight reports, and a screen that later gets shorter measures shorter.
//
// The probe measures the body box rather than the document's scrolling box. The scrolling box is
// floored at the viewport, so it would report back whatever height the frame already had — a
// screen that got shorter after an edit would stay tall forever.
//
// This is a render-time transform over stored HTML (like lib/theme-override.ts) — screens are
// never rewritten in the database, so existing projects get it too.

export const FRAME_HEIGHT_MESSAGE = 'od:frame_height'

/** A frame taller than this is a runaway layout, not a long screen. */
export const MAX_FRAME_HEIGHT = 12000

export type FrameHeightMessage = { type: typeof FRAME_HEIGHT_MESSAGE; frameId: string; height: number }

/** Reads a height off an untrusted postMessage from the sandbox. Returns null if it isn't one. */
export function parseHeightMessage(data: unknown, deviceHeight: number): { frameId: string; height: number } | null {
  if (!data || typeof data !== 'object') return null
  const msg = data as Record<string, unknown>
  if (msg.type !== FRAME_HEIGHT_MESSAGE) return null
  if (typeof msg.frameId !== 'string' || !msg.frameId) return null
  const height = clampFrameHeight(msg.height, deviceHeight)
  return height === null ? null : { frameId: msg.frameId, height }
}

/** Never shorter than the device, never taller than a sane page, always a whole pixel. */
export function clampFrameHeight(value: unknown, deviceHeight: number): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return Math.min(MAX_FRAME_HEIGHT, Math.max(deviceHeight, Math.round(value)))
}

// 100vh and its dynamic/small/large siblings. Rewritten so nothing measures against the frame.
const VIEWPORT_HEIGHT_UNIT = /\b100(?:d|s|l)?vh\b/g

/**
 * Repoints viewport-height units at `--od-frame-vh`, inside <style> blocks and style attributes
 * only — a page that merely prints "100vh" as text is left alone.
 */
export function pinViewportHeight(html: string): string {
  return html
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, (block) => block.replace(VIEWPORT_HEIGHT_UNIT, 'var(--od-frame-vh)'))
    .replace(/\sstyle="([^"]*)"/gi, (attr, value: string) =>
      VIEWPORT_HEIGHT_UNIT.test(value) ? attr.replace(VIEWPORT_HEIGHT_UNIT, 'var(--od-frame-vh)') : attr,
    )
}

function probeMarkup(frameId: string, deviceHeight: number) {
  const id = JSON.stringify(frameId)
  return `<style data-od-frame>:root{--od-frame-vh:${deviceHeight}px}html{height:var(--od-frame-vh)!important}body{min-height:var(--od-frame-vh)!important}</style>
<script data-od-frame>(function(){var id=${id},last=0;function report(){var b=document.body;if(!b)return;
var cs=getComputedStyle(b);var h=b.scrollHeight+(parseFloat(cs.marginTop)||0)+(parseFloat(cs.marginBottom)||0);
if(!h||h===last)return;last=h;try{parent.postMessage({type:${JSON.stringify(FRAME_HEIGHT_MESSAGE)},frameId:id,height:h},'*')}catch(e){}}
function start(){report();if(window.ResizeObserver){var o=new ResizeObserver(report);if(document.body)o.observe(document.body);o.observe(document.documentElement)}addEventListener('load',report);if(document.fonts&&document.fonts.ready)document.fonts.ready.then(report);setTimeout(report,300);setTimeout(report,1200)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start()})();</script>`
}

/**
 * Pins the viewport reference and appends the self-measuring probe. `frameId` comes back on every
 * message so one listener can serve a canvas full of frames.
 */
export function withHeightProbe(html: string, frameId: string, deviceHeight: number): string {
  if (!html) return html
  const pinned = pinViewportHeight(html)
  const markup = probeMarkup(frameId, deviceHeight)
  if (/<\/body>/i.test(pinned)) return pinned.replace(/<\/body>/i, `${markup}</body>`)
  return pinned + markup
}
