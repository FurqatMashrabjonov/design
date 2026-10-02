// VID-01: a recorded take (record-studio.ts) cut into a film. Chrome's screencast gives frames at an uneven rate
// with timestamps; this lays them on a steady 30 fps timeline, keeps the moments people should watch at real speed
// (typing, the finished screens, the preview) and speeds the waits up — saying so on screen, "6× faster", because
// a viewer should never think a minute of drawing took two seconds. Title and end cards are films of their own
// (render.mjs), joined at the ends.
//
//   node scripts/video/cut.mjs <take dir> --out film.mp4 [--intro intro.mp4] [--outro end.mp4] [--fit 14]
import fs from 'node:fs'
import { spawn, execFileSync } from 'node:child_process'
import { join, resolve } from 'node:path'

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d }
const DIR = resolve(process.argv[2] ?? '')
const take = JSON.parse(fs.readFileSync(join(DIR, 'take.json'), 'utf8'))
const OUT = resolve(arg('out', join(DIR, 'film.mp4')))
const FPS = 30
const FIT = Number(arg('fit', 12)) // seconds the plan's drawing is squeezed into
const { frames, marks } = take
const t0 = frames[0].t

// The cut: [from, to, speed] in take time. A wait is fitted into a few seconds; the rest plays as it happened.
const m = (k, d) => (marks[k] ?? d) - t0
const end = frames.at(-1).t - t0
const pieces = [[0, m('send'), 1], [m('send'), m('drawn'), Math.max(1, (m('drawn') - m('send')) / FIT)], [m('drawn'), m('edit', m('preview')), 1]]
if (marks.edit) pieces.push([m('edit'), m('edited'), Math.max(1, (m('edited') - m('edit')) / 5)], [m('edited'), m('preview'), 1])
pieces.push([m('preview'), end, 1])

// Output frame → take time → the last frame shown by then.
const pick = []
let cursor = 0, outT = 0
const labels = []
for (const [a, b, speed] of pieces) {
  if (!(b > a)) continue
  const outLen = (b - a) / speed
  if (speed > 1.05) labels.push({ from: outT, to: outT + outLen, text: `${Math.round(speed)}× faster` })
  for (let i = 0; i < Math.round(outLen * FPS); i++) {
    const t = a + (i / FPS) * speed
    while (cursor < frames.length - 1 && frames[cursor + 1].t - t0 <= t) cursor++
    pick.push(frames[cursor].file)
  }
  outT += outLen
}

// The "faster" pill, drawn by ffmpeg over the sped-up stretches.
const font = '/System/Library/Fonts/Helvetica.ttc'
const draw = labels.map((l) => `drawtext=fontfile=${font}:text='${l.text}':fontsize=30:fontcolor=0x1a1511:box=1:boxcolor=0xc6f648:boxborderw=14:x=w-tw-56:y=48:enable='between(t,${l.from.toFixed(2)},${l.to.toFixed(2)})'`)
const body = join(DIR, 'body.mp4')
const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-', '-vf', ['scale=1920:1080:flags=lanczos', ...draw].join(','), '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', body], { stdio: ['pipe', 'inherit', 'inherit'] })
for (const f of pick) if (!ff.stdin.write(fs.readFileSync(join(DIR, 'frames', f)))) await new Promise((r) => ff.stdin.once('drain', r))
ff.stdin.end()
await new Promise((r) => ff.on('close', r))

// Cards at the ends, joined with the same size, rate and pixel format.
const parts = [arg('intro'), body, arg('outro')].filter(Boolean).map((p) => resolve(p))
if (parts.length > 1) {
  const inputs = parts.flatMap((p) => ['-i', p])
  const filter = parts.map((_, i) => `[${i}:v]scale=1920:1080,fps=${FPS},format=yuv420p,setsar=1[v${i}]`).join(';') + ';' + parts.map((_, i) => `[v${i}]`).join('') + `concat=n=${parts.length}:v=1:a=0[out]`
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', filter, '-map', '[out]', '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', OUT])
} else fs.copyFileSync(body, OUT)
console.log(JSON.stringify({ out: OUT, seconds: +(outT).toFixed(1), frames: pick.length, faster: labels.map((l) => l.text) }))
