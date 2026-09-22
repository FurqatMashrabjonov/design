// LP-05: what the streaming preview shows, measured. Replays a recorded model stream
// (eval/fixtures/streams/*.json: [ms, delta][]) through the real pieces — extractArtifact,
// repairPartialHtml, the stream frame runtime — in headless Chrome, sampling the frame every 300ms
// of stream time, and counts: frames whose visible text contains code, blank frames (no skeleton,
// no content), and how many times the iframe loaded. Targets: 0 code frames, 0 blank frames, 1 load.
//
//   node --import ./eval/alias-hook.mjs eval/stream.check.ts            (asserts, part of npm run check)
//   node --import ./eval/alias-hook.mjs eval/stream.check.ts --report   (prints per-fixture numbers)
import assert from 'node:assert'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { extractArtifact } from '../src/artifact.ts'
import { repairPartialHtml } from '../src/lib/partial-html.ts'
import { STREAM_MESSAGE, streamFrameDoc } from '../src/lib/stream-frame.ts'
import { imageQueries } from '../src/lib/image-slots.ts'

const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const STEP = 300

type Result = { fixture: string; ticks: number; code: number; blank: number; skeleton: number; loads: number; firstContentMs: number | null; samples: string[]; slots: number; photosFilled: number; heights: number[] }

// Inside a <script>, a literal "</script>" in the data would end the script.
const embed = (v: unknown) => JSON.stringify(v).replace(/</g, '\\u003c')

export function measure(fixture: string): Result {
  const deltas: [number, string][] = JSON.parse(readFileSync(`eval/fixtures/streams/${fixture}.json`, 'utf8'))
  const end = deltas.at(-1)![0]
  // The frames the UI would post: the repaired document every STEP ms of stream time.
  const frames: [number, string][] = []
  let acc = ''
  let i = 0
  for (let t = STEP; t <= end + STEP; t += STEP) {
    while (i < deltas.length && deltas[i]![0] <= t) acc += deltas[i++]![1]
    const html = repairPartialHtml(extractArtifact(acc).html)
    if (html && html !== frames.at(-1)?.[1]) frames.push([t, html])
  }
  // Every photo slot "found" as the server would send it (no network: the frame only sets src).
  const queries = imageQueries(extractArtifact(acc).html)
  const photos = Object.fromEntries(queries.map((q, n) => [q, `https://images.pexels.com/photos/${n}/x.jpeg`]))
  const dir = mkdtempSync(join(tmpdir(), 'od-stream-'))
  // No sandbox here, so the harness can read the frame; the product frame is sandboxed.
  const page = `<!doctype html><html><body style="margin:0"><iframe id="f" style="width:390px;height:844px;border:0"></iframe>
<script>
var frames = ${embed(frames)}, doc = ${embed(streamFrameDoc())}, photos = ${embed(photos)}, slots = ${queries.length};
var f = document.getElementById('f'), loads = 0, out = { ticks: 0, code: 0, blank: 0, skeleton: 0, firstContentMs: null, samples: [], slots: slots, photosFilled: 0, heights: [] };
var CODE = /addEventListener|querySelector|\\{\\s*[a-z-]+\\s*:|:\\s*var\\(--|<\\/?[a-z]+[\\s>]|function\\s*\\(/i;
f.addEventListener('load', function () { loads++; });
window.addEventListener('message', function (e) { if (!e.data) return; if (e.data.type === '${STREAM_MESSAGE}:ready') go(); if (e.data.type === '${STREAM_MESSAGE}:height') out.heights.push(e.data.height); });
f.srcdoc = doc;
function go() {
  var k = 0;
  f.contentWindow.postMessage({ type: '${STREAM_MESSAGE}', photos: photos }, '*');
  function tick() {
    if (k >= frames.length) { finish(); return; }
    f.contentWindow.postMessage({ type: '${STREAM_MESSAGE}', html: frames[k][1] }, '*');
    var at = frames[k][0]; k++;
    setTimeout(function () {
      var d = f.contentDocument, b = d && d.body;
      var text = b ? (b.innerText || '').trim() : '';
      var sk = b && b.querySelector('[data-od-skeleton]');
      var skeleton = !!(sk && sk.getBoundingClientRect().height > 100); // present and actually painted
      var content = !!(b && b.querySelector('body > :not([data-od-skeleton]):not(script)'));
      out.ticks++;
      if (skeleton) out.skeleton++;
      if (!skeleton && !content) out.blank++;
      if (content && out.firstContentMs === null) out.firstContentMs = at;
      var m = text.match(CODE);
      if (m) { out.code++; if (out.samples.length < 5) out.samples.push(at + 'ms: ' + text.slice(Math.max(0, text.indexOf(m[0]) - 30), text.indexOf(m[0]) + 80).replace(/\\s+/g, ' ')); }
      tick();
    }, 120);
  }
  tick();
}
function finish() { out.loads = loads; out.photosFilled = f.contentDocument.querySelectorAll('img[data-od-img][src^="https://images.pexels.com/"]').length; var p = document.createElement('pre'); p.id = 'res'; p.textContent = JSON.stringify(out); document.body.appendChild(p); }
</script></body></html>`
  const file = join(dir, 'harness.html')
  writeFileSync(file, page)
  const dom = execFileSync(CHROME, ['--headless=new', '--hide-scrollbars', '--window-size=500,900', '--virtual-time-budget=120000', '--dump-dom', pathToFileURL(file).href], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 180000 })
  const json = dom.match(/<pre id="res">([\s\S]*?)<\/pre>/)?.[1]
  if (!json) throw new Error(`${fixture}: the harness produced no result (${file})`)
  const decoded = json.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
  return { fixture, ...(JSON.parse(decoded) as Omit<Result, 'fixture'>) }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  if (!existsSync(CHROME)) {
    console.warn(`Chrome not found at ${CHROME}; stream check skipped (set CHROME_PATH).`)
  } else {
    const report = process.argv.includes('--report')
    for (const f of readdirSync('eval/fixtures/streams').filter((n) => n.endsWith('.json'))) {
      const r = measure(f.replace(/\.json$/, ''))
      console.log(`[stream] ${r.fixture}: ${r.ticks} frames · code ${r.code} · blank ${r.blank} · skeleton ${r.skeleton} · loads ${r.loads} · first content ${r.firstContentMs}ms · photos ${r.photosFilled}/${r.slots} · heights ${r.heights.join('→')}`)
      if (r.samples.length) console.log('  ' + r.samples.join('\n  '))
      if (!report) {
        assert.equal(r.code, 0, `${r.fixture}: code shown as text`)
        assert.equal(r.blank, 0, `${r.fixture}: blank frames`)
        assert.equal(r.loads, 1, `${r.fixture}: the frame loaded more than once`)
        assert.ok(r.firstContentMs !== null, `${r.fixture}: content appeared`)
        if (r.slots) assert.ok(r.photosFilled > 0, `${r.fixture}: photos appear while streaming (LP-06)`)
        assert.ok(r.heights.length >= 2 && r.heights.at(-1)! > r.heights[0]!, `${r.fixture}: the frame grows as content arrives (LP-06)`)
      }
    }
    console.log('ok')
  }
}
