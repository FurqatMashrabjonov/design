// Contact sheet for an eval run: every generated screen as a live, sandboxed 390px iframe, scaled down.
// Pure string building so it can be tested without a run. Headless Chrome on macOS cannot open a
// window narrower than 500px, so a screen is never screenshotted on its own: it is always framed here.

export type ScreenResult = { file: string; name: string; screenType: string; ms: number; chars: number }
export type BriefResult = {
  id: string
  brief: string
  designSystem: string
  appName?: string
  ms: number
  screens: ScreenResult[]
  errors: string[]
}

export const FRAME = { width: 390, height: 1200, scale: 0.5 }

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const CSS = `body{margin:0;padding:24px;font:13px/1.4 system-ui,sans-serif;background:#f4f4f5;color:#18181b}
h1{font-size:18px;margin:0 0 16px}section{margin:0 0 28px}
.meta{margin:0 0 8px}.meta b{font-size:14px}.meta span{color:#71717a;margin-left:8px}.err{color:#b91c1c}
.tag{display:inline-block;font-size:11px;font-weight:600;padding:1px 6px;border-radius:4px;background:#18181b;color:#fff;margin-right:6px}
.row{display:flex;gap:12px;overflow-x:auto;padding-bottom:4px}
figure{margin:0;flex:none}figcaption{font-size:11px;color:#52525b;margin-top:4px;max-width:${FRAME.width * FRAME.scale}px}
.f{width:${FRAME.width * FRAME.scale}px;height:${FRAME.height * FRAME.scale}px;overflow:hidden;background:#fff;border:1px solid #d4d4d8;border-radius:8px}
details{margin:0 0 20px}summary{font-weight:600;cursor:pointer}pre{font:12px/1.5 ui-monospace,monospace;background:#fff;border:1px solid #d4d4d8;border-radius:8px;padding:12px;overflow:auto;max-height:320px}
iframe{width:${FRAME.width}px;height:${FRAME.height}px;border:0;transform:scale(${FRAME.scale});transform-origin:0 0}`

// `base` is the path from the sheet to the run directory holding the screens ('' for the run's own sheet).
function briefRow(r: BriefResult, base: string, tag?: string): string {
  const frames = r.screens
    .map(
      (s) =>
        `<figure><div class="f"><iframe sandbox="allow-scripts" loading="lazy" src="${esc(base + s.file)}"></iframe></div>` +
        `<figcaption>${esc(s.name)} · ${esc(s.screenType)} · ${(s.ms / 1000).toFixed(0)}s · ${(s.chars / 1000).toFixed(1)}k</figcaption></figure>`,
    )
    .join('')
  const errors = r.errors.map((e) => `<div class="err">${esc(e)}</div>`).join('')
  return (
    `<div class="meta">${tag ? `<span class="tag">${esc(tag)}</span>` : ''}<b>${esc(r.id)}</b>` +
    `<span>${esc(r.designSystem)} · ${esc(r.appName ?? '—')} · ${(r.ms / 1000).toFixed(0)}s</span></div>` +
    `${errors}<div class="row">${frames}</div>`
  )
}

const page = (title: string, body: string) =>
  `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>${CSS}</style></head><body><h1>${esc(title)}</h1>${body}</body></html>`

// `metrics` is printed as-is: the sheet does not need to know its shape.
export function sheetHtml(label: string, results: BriefResult[], metrics?: unknown, delta: string[] = []): string {
  const head =
    (metrics ? `<details open><summary>Metrics</summary><pre>${esc(JSON.stringify(metrics, null, 2))}</pre></details>` : '') +
    (delta.length ? `<details open><summary>Changed since previous run</summary><pre>${esc(delta.join('\n'))}</pre></details>` : '')
  const body = head + results
    .map((r) => `<section><div class="meta"><span>${esc(r.brief)}</span></div>${briefRow(r, '')}</section>`)
    .join('')
  return page(`Eval · ${label}`, body)
}

// Same briefs, previous run above the current one.
export function compareHtml(label: string, results: BriefResult[], prevLabel: string, prev: BriefResult[]): string {
  const body = results
    .map((r) => {
      const before = prev.find((p) => p.id === r.id)
      return (
        `<section><div class="meta"><span>${esc(r.brief)}</span></div>` +
        (before ? briefRow(before, `../${prevLabel}/`, prevLabel) : `<div class="meta"><span>no previous run</span></div>`) +
        briefRow(r, '', label) +
        `</section>`
      )
    })
    .join('')
  return page(`Eval · ${prevLabel} → ${label}`, body)
}

// Blind pairwise rating of two runs. Which run is "A" flips per brief (stable hash of the brief id),
// votes live in localStorage, and the tally stays hidden until Reveal.
// ponytail: blind to the eye only — iframe src paths name the run to anyone who opens devtools.
const flips = (id: string) => [...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % 2 === 1

export function abHtml(label: string, results: BriefResult[], prevLabel: string, prev: BriefResult[]): string {
  const pairs = results.flatMap((r) => {
    const before = prev.find((p) => p.id === r.id)
    return before && before.screens.length && r.screens.length ? [{ r, before, flip: flips(r.id) }] : []
  })
  const frames = (x: BriefResult, base: string) =>
    x.screens.map((sc) => `<figure><div class="f"><iframe sandbox="allow-scripts" loading="lazy" src="${esc(base + sc.file)}"></iframe></div></figure>`).join('')
  const body =
    `<p id="tally"><button id="reveal">Reveal tally</button></p>` +
    pairs
      .map(({ r, before, flip }) => {
        const cur = `<div class="row">${frames(r, '')}</div>`
        const old = `<div class="row">${frames(before, `../${prevLabel}/`)}</div>`
        return (
          `<section data-id="${esc(r.id)}"><div class="meta"><b>${esc(r.id)}</b><span>${esc(r.brief)}</span></div>` +
          `<div class="meta"><span class="tag">A</span></div>${flip ? cur : old}` +
          `<div class="meta"><span class="tag">B</span></div>${flip ? old : cur}` +
          `<p class="vote"><button data-v="A">A better</button> <button data-v="B">B better</button> <button data-v="tie">Tie</button></p></section>`
        )
      })
      .join('')
  // `cur` maps brief id -> which letter the current run got.
  const cur = Object.fromEntries(pairs.map(({ r, flip }) => [r.id, flip ? 'A' : 'B']))
  const script = `<script>
const KEY = ${JSON.stringify(`od-ab:${prevLabel}:${label}`)}, CUR = ${JSON.stringify(cur)}
let votes = {}; try { votes = JSON.parse(localStorage.getItem(KEY) || '{}') } catch {}
const paint = () => document.querySelectorAll('section').forEach((s) => s.querySelectorAll('button').forEach((b) => b.classList.toggle('on', votes[s.dataset.id] === b.dataset.v)))
document.body.addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return
  if (b.id === 'reveal') {
    const ids = Object.keys(votes), won = ids.filter((i) => votes[i] === CUR[i]).length, tie = ids.filter((i) => votes[i] === 'tie').length
    b.parentNode.textContent = ${JSON.stringify(label)} + ' won ' + won + ', ' + ${JSON.stringify(prevLabel)} + ' won ' + (ids.length - won - tie) + ', ties ' + tie + ' — ' + ids.length + ' of ' + Object.keys(CUR).length + ' rated'
    return
  }
  votes[b.closest('section').dataset.id] = b.dataset.v
  try { localStorage.setItem(KEY, JSON.stringify(votes)) } catch {}
  paint()
})
paint()
</script>`
  return page('Eval · blind A/B', body + script).replace('</style>', '.vote button,#reveal{font:inherit;padding:6px 12px;border:1px solid #d4d4d8;border-radius:6px;background:#fff;cursor:pointer}.vote button.on{background:#18181b;color:#fff}</style>')
}
