// The logo and everything made from it: public/ (favicons, apple-touch-icon, og.png, email-logo.png),
// docs/brand/ (marks, lockups, avatars, the X banner) and src/lib/brand-paths.ts (the outlines the pages draw).
// Mark: a lime phone tilted −10° with a Dynamic Island and an Unbounded 900 S, on an ink tile. Chosen 2026-09-30.
// Needs the font and a parser, not kept as dependencies:  npm i --no-save opentype.js @fontsource/unbounded
// Run from the repo root:  node scripts/brand-assets.mjs   (renders PNGs with the local Google Chrome)
import opentype from 'opentype.js'
import fs from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
const font = (b => opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)))(fs.readFileSync(join(process.cwd(), 'node_modules/@fontsource/unbounded/files/unbounded-latin-900-normal.woff')))
// S fitted into a box, centred at (cx, cy)
function fit(text, maxW, maxH, cx, cy) {
  const p = font.getPath(text, 0, 0, 100), b = p.getBoundingBox()
  const k = Math.min(maxW / (b.x2 - b.x1), maxH / (b.y2 - b.y1))
  const q = font.getPath(text, 0, 0, 100 * k), c = q.getBoundingBox()
  const dx = cx - (c.x1 + c.x2) / 2, dy = cy - (c.y1 + c.y2) / 2
  const r = font.getPath(text, dx, dy, 100 * k)
  return { d: r.toPathData(2), box: r.getBoundingBox() }
}
const S = fit('S', 36, 38, 50, 56).d          // with the island above it
const Ssmall = fit('S', 40, 44, 50, 51).d     // favicon: no island, bigger letter
// wordmark at cap/x-height 100 units tall-ish, origin at 0
const wordPath = font.getPath('screenspell', 0, 0, 100), wb = wordPath.getBoundingBox()

const P = { S, Ssmall, word: wordPath.toPathData(2), wordX: +wb.x1.toFixed(2), wordY: +wb.y1.toFixed(2), wordW: +(wb.x2 - wb.x1).toFixed(2), wordH: +(wb.y2 - wb.y1).toFixed(2) }
const INK = '#1a1511', LIME = '#c6f648', PAPER = '#f3f1ec'
const REPO = process.cwd()
fs.mkdirSync(`${REPO}/public`, { recursive: true }); fs.mkdirSync(`${REPO}/docs/brand`, { recursive: true }); const TMP = fs.mkdtempSync(join(tmpdir(), 'brand-')); process.chdir(TMP); fs.mkdirSync('png')

// The phone (100×100 space): lime phone tilted −10°, Dynamic Island, Unbounded S. small = favicon (no island).
const phone = ({ small = false, body = LIME, ink = INK } = {}) =>
  `<g transform="rotate(-10 50 50)"><rect x="23" y="13" width="54" height="74" rx="14" fill="${body}"/>${small ? '' : `<rect x="43" y="18" width="14" height="4.5" rx="2.25" fill="${ink}"/>`}<path d="${small ? P.Ssmall : P.S}" fill="${ink}"/></g>`
const svg = (w, h, inner, vb = `0 0 ${w} ${h}`) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${vb}">${inner}</svg>`
const tile = (o = {}) => `<rect width="100" height="100" rx="22" fill="${o.tile ?? INK}"/>` + phone(o)
const word = (fill, x, y, h) => { const k = h / P.wordH; return `<path transform="translate(${x} ${y}) scale(${+k.toFixed(4)}) translate(${-P.wordX} ${-P.wordY})" d="${P.word}" fill="${fill}"/>` }
const wordW = (h) => P.wordW * h / P.wordH
// A lockup: tile of height h, a gap, the wordmark at 0.62h
// On ink the tile disappears, so a dark lockup is the phone alone, set closer to the word.
const lockup = (h, text, o = {}) => { const wh = h * .62, bare = text !== INK, g = bare ? h * .02 : h * .32; return { w: h + g + wordW(wh), inner: `<g transform="scale(${h / 100})">${bare ? phone(o) : tile(o)}</g>` + word(text, h + g, (h - wh) / 2 + wh * .06, wh) } }

const files = {
  'public/favicon.svg': svg(100, 100, tile({ small: true })),
  'docs/brand/mark.svg': svg(100, 100, tile()),
  'docs/brand/mark-lime.svg': svg(100, 100, tile({ tile: LIME, body: INK, ink: LIME })),
  'docs/brand/favicon.svg': svg(100, 100, tile({ small: true })),
}
for (const [name, text] of [['lockup', INK], ['lockup-on-dark', PAPER]]) { const l = lockup(100, text); files[`docs/brand/${name}.svg`] = svg(Math.ceil(l.w), 100, l.inner) }
for (const [f, s] of Object.entries(files)) fs.writeFileSync(`${REPO}/${f}`, s)

// PNGs through headless Chrome: its viewport is ≥500 wide and 87px shorter than the window, so render big and crop.
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
function png(out, w, h, body, scale = 1) {
  const html = `png/${out}.html`
  fs.writeFileSync(html, `<!doctype html><html><body style="margin:0;height:100vh;display:grid;place-items:center;background:transparent">${body}</body></html>`)
  const file = `png/${out}.png`
  execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--force-device-scale-factor=${scale}`, '--default-background-color=00000000', `--window-size=${Math.max(w, 600)},${h + 200}`, `--screenshot=${process.cwd()}/${file}`, `file://${process.cwd()}/${html}`], { stdio: 'ignore' })
  execFileSync('sips', ['--cropToHeightWidth', String(h * scale), String(w * scale), file], { stdio: 'ignore' })
  return file
}
const block = (w, h, bg, inner) => `<div style="width:${w}px;height:${h}px;background:${bg}">${inner}</div>`
const place = (w, h, inner) => svg(w, h, inner)

// Icons
png('fav16', 16, 16, svg(16, 16, tile({ small: true }), '0 0 100 100'))
png('fav32', 32, 32, svg(32, 32, tile({ small: true }), '0 0 100 100'))
png('apple-touch-icon', 180, 180, block(180, 180, INK, svg(180, 180, phone(), '4 4 92 92')))   // iOS rounds it itself
png('email-logo', 56, 56, svg(56, 56, tile(), '0 0 100 100'))
// Avatars (full bleed; the platforms crop a circle)
png('avatar-ink', 400, 400, block(400, 400, INK, svg(400, 400, phone(), '-13 -13 126 126')), 2)
png('avatar-lime', 400, 400, block(400, 400, LIME, svg(400, 400, phone({ body: INK, ink: LIME }), '-13 -13 126 126')), 2)
// og:image and the X banner: the lockup on ink, the domain under it
const hero = (W, H, h, sub) => { const l = lockup(h, PAPER); const x = (W - l.w) / 2, y = (H - h) / 2 - (sub ? h * .25 : 0)
  return block(W, H, INK, place(W, H, `<g transform="translate(${x} ${y})">${l.inner}</g>` + (sub ? `<text x="${W / 2}" y="${y + h * 1.75}" text-anchor="middle" font-family="-apple-system,Helvetica,Arial" font-size="${h * .26}" fill="#a39d8f">${sub}</text>` : ''))) }
png('og', 1200, 630, hero(1200, 630, 150, 'Describe an app. Get every screen.'))
// The X banner says what the product does: the name and the promise at the top left (X's avatar covers the left below
// y≈320 of 500), three
// real screens from an eval run (docs/brand/screens) tilted like the mark on the right.
{
  const font = (f) => `file://${REPO}/node_modules/${f}`
  const l = lockup(52, PAPER)
  const shots = ['habit-today', 'habit-reminders', 'habit-insights']
  const phones = shots.map((n, i) => { const w = 232, x = 860 + i * 205, y = [70, 30, 95][i]
    return `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${Math.round(w * 844 / 390)}px;transform:rotate(-8deg);border:7px solid #2b2521;border-radius:38px;overflow:hidden;box-shadow:0 30px 60px rgba(0,0,0,.45);z-index:${i === 1 ? 2 : 1}"><img src="file://${REPO}/docs/brand/screens/${n}.png" style="width:100%;display:block"></div>` }).join('')
  png('x-banner', 1500, 500, `<style>
    @font-face{font-family:IS;src:url(${font('@fontsource-variable/instrument-sans/files/instrument-sans-latin-wght-normal.woff2')})}
    @font-face{font-family:ISerif;font-style:italic;src:url(${font('@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff2')})}</style>
    <div style="position:relative;width:1500px;height:500px;overflow:hidden;background:radial-gradient(circle at 76% 45%, rgba(198,246,72,.16), transparent 55%) ${INK};font-family:IS">
      <div style="position:absolute;left:110px;top:52px">${svg(Math.ceil(l.w), 52, l.inner)}
        <div style="isolation:isolate;margin-top:24px;font-size:52px;line-height:1.08;font-weight:600;letter-spacing:-.02em;color:${PAPER}">Describe an app.<br>Get <span style="position:relative;font-family:ISerif;font-style:italic;font-weight:400;letter-spacing:0"><span style="position:absolute;left:0;right:0;bottom:.06em;height:.16em;background:${LIME};opacity:.9;z-index:-1"></span>every screen.</span></div>
        <div style="margin-top:16px;font-size:19px;color:#a39d8f">iOS + Android · click-through · React &amp; Figma export</div>
      </div>${phones}</div>`, 2)
}

// favicon.ico: two PNG entries (16, 32) in one ICO
const ents = ['png/fav16.png', 'png/fav32.png'].map((f) => fs.readFileSync(f))
const head = Buffer.alloc(6 + 16 * ents.length); head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(ents.length, 4)
let off = head.length
ents.forEach((b, i) => { const s = [16, 32][i], o = 6 + 16 * i; head.writeUInt8(s, o); head.writeUInt8(s, o + 1); head.writeUInt16LE(1, o + 4); head.writeUInt16LE(32, o + 6); head.writeUInt32LE(b.length, o + 8); head.writeUInt32LE(off, o + 12); off += b.length })
fs.writeFileSync(`${REPO}/public/favicon.ico`, Buffer.concat([head, ...ents]))

for (const f of ['apple-touch-icon', 'email-logo', 'og']) fs.copyFileSync(`png/${f}.png`, `${REPO}/public/${f}.png`)
for (const f of ['avatar-ink', 'avatar-lime', 'x-banner', 'og']) fs.copyFileSync(`png/${f}.png`, `${REPO}/docs/brand/${f}.png`)
fs.writeFileSync(`${REPO}/src/lib/brand-paths.ts`, `// The logo as outlines (Unbounded 900, SIL OFL), so no page loads the font. Made by scripts/brand-assets.mjs.
/** The S inside the phone, in the mark's 100×100 box. */
export const MARK_S = '${P.S}'
/** "screenspell", and the box it sits in. */
export const WORDMARK = '${P.word}'
export const WORDMARK_VIEWBOX = '${P.wordX} ${P.wordY} ${P.wordW} ${P.wordH}'
`)
fs.rmSync(TMP, { recursive: true })
console.log('brand assets written')
