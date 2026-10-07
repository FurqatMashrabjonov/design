// EMJ-01: every emoji a screen (or Konsta, or the kit) puts in text is drawn as Microsoft's Fluent 3D emoji instead of
// the device's own — one look on every phone. It happens where React elements are made (the jsx runtime the screens
// and the runtime bundle import), so the model's code is never changed and React owns every node it renders. An emoji
// the set does not have stays text; an image that fails to load falls back to the device's emoji.
import * as R from '../node_modules/react/jsx-runtime.js'
import React, { createElement } from 'react'
import { STILL, ANIMATED, DATA } from './emoji-codes.js'

export const Fragment = R.Fragment
const EMOJI = /\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic}️?|[\u{1F3FB}-\u{1F3FF}])*|[\u{1F1E6}-\u{1F1FF}]{2}|[#*0-9]️⃣/gu
// Text-only places: an <img> there would be dropped or break the markup.
const TEXT_ONLY = new Set(['option', 'textarea', 'title', 'style', 'script', 'text', 'tspan', 'textPath', 'desc'])
// This module is bundled into runtime/dist/chunks/, the images sit in runtime/dist/emoji/ (an export sets __odEmojiBase).
const base = () => globalThis.__odEmojiBase ?? new URL('../emoji/', import.meta.url).href

/** The key of an emoji in the set (codepoints in hex, '-', no FE0F, the default skin tone), or null. */
export function emojiKey(ch) {
  const cps = [...ch].map((c) => c.codePointAt(0)).filter((c) => c !== 0xfe0f)
  const key = cps.map((c) => c.toString(16)).join('-')
  if (STILL.has(key)) return key
  const plain = cps.filter((c) => c < 0x1f3fb || c > 0x1f3ff).map((c) => c.toString(16)).join('-')
  return STILL.has(plain) ? plain : null
}

const fallback = (ch) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text x="50" y="86" font-size="88" text-anchor="middle">${ch}</text></svg>`)}`
/** One emoji as its Fluent image; `animated` uses the moving version when the set has one. */
export function emojiImage(ch, key, { animated = false, className = 'od-emoji', style } = {}) {
  const moving = animated && ANIMATED.has(key)
  return createElement('img', {
    key: undefined, src: !moving && DATA?.[key] ? DATA[key] : `${base()}${moving ? 'anim/' : ''}${key}.webp`, alt: ch, draggable: false, className, style, 'data-od-emoji': ch,
    onError: (e) => { if (!e.currentTarget.src.startsWith('data:')) e.currentTarget.src = fallback(ch) },
  })
}

function split(text) {
  if (typeof text !== 'string' || !EMOJI.test(text)) return null
  EMOJI.lastIndex = 0
  const out = []
  let at = 0, hit = false
  for (const m of text.matchAll(EMOJI)) {
    // Text symbols that are emoji only when asked (©, ™, ↔, ★): drawn as emoji only with FE0F or in a ZWJ sequence.
    if (!/\p{Emoji_Presentation}/u.test(m[0]) && !/[\uFE0F\u200D]/.test(m[0])) continue
    const key = emojiKey(m[0])
    if (!key) continue
    if (m.index > at) out.push(text.slice(at, m.index))
    out.push(emojiImage(m[0], key))
    at = m.index + m[0].length
    hit = true
  }
  if (!hit) return null
  if (at < text.length) out.push(text.slice(at))
  return out
}

function convert(type, props) {
  if (!props || typeof type === 'string' && TEXT_ONLY.has(type)) return null
  const c = props.children
  if (typeof c === 'string') { const parts = split(c); return parts && { ...props, children: parts } }
  if (Array.isArray(c) && c.some((x) => typeof x === 'string')) {
    let changed = false
    const next = c.flatMap((x) => { const parts = split(x); if (parts) { changed = true; return parts } return [x] })
    return changed ? { ...props, children: next } : null
  }
  return null
}

// Static children (jsxs) carry no keys and need none; a converted string becomes static children.
export function jsx(type, props, key) {
  const next = convert(type, props)
  return next ? R.jsxs(type, next, key) : R.jsx(type, props, key)
}
export function jsxs(type, props, key) {
  const next = convert(type, props)
  return R.jsxs(type, next ?? props, key)
}

// Konsta renders its own parts with React.createElement (a ListItem's `title`, a Button's text), not through this jsx
// runtime; the same conversion is applied there, once, for the whole runtime.
if (!React.__odEmoji) {
  const original = React.createElement
  React.createElement = function (type, props, ...children) {
    if (children.length && !(typeof type === 'string' && TEXT_ONLY.has(type)) && children.some((x) => typeof x === 'string')) {
      let changed = false
      const next = children.flatMap((x) => { const parts = split(x); if (parts) { changed = true; return parts } return [x] })
      if (changed) return original.call(this, type, props, ...next)
    }
    return original.call(this, type, props, ...children)
  }
  React.__odEmoji = true
}

