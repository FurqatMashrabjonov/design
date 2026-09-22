// Run with the alias hook and a throwaway database (see package.json "check").
import assert from 'node:assert'
import { applyAvatars, applyImages, applyLogo, monogram, avatarNames, imageQueries, normalizeQuery, slotQuery } from '../../lib/image-slots.ts'

// --- slots (pure) ---
assert.equal(normalizeQuery('  Grilled Salmon Bowl, top-view!! <script> '), 'grilled salmon bowl top-view script')
assert.equal(normalizeQuery('Свежие фрукты & овощи'), 'свежие фрукты овощи')
assert.equal(normalizeQuery('x'.repeat(200)).length, 80)

assert.equal(slotQuery('<img data-od-img="Cozy cafe interior" alt="Cafe">'), 'cozy cafe interior')
assert.equal(slotQuery('<img alt="Avocado toast" src="https://placehold.co/600x400">'), 'avocado toast', 'a placeholder CDN is a slot, described by its alt')
assert.equal(slotQuery('<img src="" alt="Sushi">'), 'sushi')
assert.equal(slotQuery('<img src="https://images.pexels.com/photos/1/a.jpeg" data-od-img="sushi">'), null, 'a filled slot is left alone')
assert.equal(slotQuery('<img src="data:image/svg+xml;base64,AAAA" alt="logo">'), null)
assert.equal(slotQuery('<img src="https://placehold.co/1x1">'), null, 'nothing to search for')

const page = `<main><img data-od-img="ramen bowl" alt="Ra&quot;men" class="hero" style="height:180px;border-radius:12px"><img alt="ramen bowl" src="https://picsum.photos/200"><img data-od-img="empty query zzz" alt="Nothing"><img src="/logo.png" alt="Logo"></main>`
assert.deepEqual(imageQueries(page), ['ramen bowl', 'empty query zzz'], 'queries are de-duplicated')
const filled = applyImages(page, new Map([['ramen bowl', { url: 'https://images.pexels.com/photos/2/r.jpeg?w=800', avgColor: '#aa5522' }], ['empty query zzz', null]]))
assert.equal(filled.match(/src="https:\/\/images\.pexels\.com\/photos\/2\/r\.jpeg\?w=800"/g)?.length, 2)
assert.ok(!filled.includes('picsum.photos'))
assert.ok(/style="height:180px;border-radius:12px;object-fit:cover;background:#aa5522"/.test(filled), 'the model\'s own size is kept and nothing inline overrides a size set by class')
assert.ok(filled.includes('<style data-od-slots>') && /:where\(\[data-od-img-resolved\][^{]*\)\{display:block;width:100%;aspect-ratio:4\/3\}/.test(filled), 'the default box is a zero-specificity rule, so any page rule wins (GQ-01)')
assert.equal(filled.match(/data-od-slots/g)?.length, 1, 'the rule is added once')
{
  // GQ-01: a list thumbnail sized by class stayed a thumbnail — inline width:100% used to beat the class.
  const row = applyImages('<html><head><style>.thumb{width:64px;height:64px}</style></head><body><img data-od-img="burger" class="thumb"></body></html>', new Map([['burger', { url: 'https://images.pexels.com/photos/3/b.jpeg' }]]))
  assert.ok(!/style="[^"]*width:100%/.test(row) && !/style="[^"]*aspect-ratio/.test(row), 'no inline size on a class-sized image')
  assert.ok(row.indexOf('data-od-slots') < row.indexOf('.thumb{'), 'defaults come before the page styles')
}
assert.ok(filled.includes('data-od-img-resolved') && filled.includes('loading="lazy"'))
assert.ok(/<div role="img" aria-label="Nothing" data-od-img-fallback style="[^"]*var\(--surface\)/.test(filled), 'no photo: a token-coloured block, not a broken image')
assert.ok(filled.includes('<img src="/logo.png" alt="Logo">'), 'other images are untouched')
assert.equal(applyImages(filled, new Map()), filled, 'idempotent: filled slots and fallbacks are not slots any more')

// --- avatars (pure) ---
const people = `<img data-od-avatar="Zainab Novak" alt="Zainab Novak" style="width:56px;height:56px"><img data-od-avatar="Zainab Novak"><img data-od-avatar="Maya Chen" class="av">`
assert.equal(slotQuery('<img data-od-avatar="Zainab Novak" alt="Zainab Novak">'), null, 'an avatar is never searched as a photo of its alt text')
assert.deepEqual(avatarNames(people), ['Zainab Novak', 'Maya Chen'])
const faces = applyAvatars(people, new Map([['Zainab Novak', 'https://images.pexels.com/photos/7/f.jpeg?w=128']]))
assert.equal(faces.match(/src="https:\/\/images\.pexels\.com\/photos\/7\/f\.jpeg\?w=128"/g)?.length, 2, 'one person, one face, everywhere')
assert.ok(/style="width:56px;height:56px;border-radius:9999px;flex:none;object-fit:cover/.test(faces), 'the model\'s size is kept and the image is made round')
assert.ok(/<img data-od-avatar="Zainab Novak"[^>]*style="border-radius:9999px/.test(faces) && faces.includes(':where([data-od-avatar-resolved]){width:40px;height:40px}'), 'an unsized avatar gets the default size from the slot rule, not inline')
assert.ok(/<span role="img" aria-label="Maya Chen" data-od-avatar-resolved class="av" style="[^"]*var\(--surface\)[^"]*">MC<\/span>/.test(faces), 'no portrait: initials in a token-coloured circle')
assert.equal(applyAvatars(faces, new Map()), faces, 'idempotent')
assert.deepEqual(avatarNames(faces), [])

// --- app mark (pure) ---
assert.equal(monogram('LingoStreak'), 'LS')
assert.equal(monogram('Nova Bank'), 'NB')
assert.equal(monogram('feastly'), 'F')
assert.equal(monogram('Продукты24'), 'П')
assert.equal(monogram('  '), 'A')
const mark = applyLogo('<header><img data-od-logo alt="" style="width:72px;height:72px"><img data-od-logo class="sm"><img src="/x.png" alt="data-od-logo is only text here"></header>', 'Pantry & "Plate"')
assert.equal(mark.match(/<span[^>]*data-od-logo-resolved/g)?.length, 2)
assert.ok(/aria-label="Pantry &amp; &quot;Plate&quot;"[^>]*style="width:72px;height:72px;[^"]*background:var\(--accent\);color:var\(--accent-on\)[^"]*">PP<\/span>/.test(mark), 'drawn from tokens, so it follows the theme')
assert.ok(/class="sm" style="display:inline-flex/.test(mark) && mark.includes(':where([data-od-logo-resolved]){width:56px;height:56px;border-radius:22%}'), 'an unsized mark gets its default size from the slot rule, so a class size wins')
assert.ok(mark.includes('<img src="/x.png" alt="data-od-logo is only text here">'), 'the attribute is matched, not the text')
assert.equal(applyLogo(mark, 'Other'), mark, 'idempotent')
assert.equal(slotQuery('<img data-od-logo alt="LingoStreak logo">'), null, 'a logo slot is never searched as a photo of its alt text')

// --- service: cache, provider failures, URL validation ---
const { resolveImages } = await import('./ImageService.ts')
const realFetch = globalThis.fetch
let calls: string[] = []
const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
const stub = (fn: (url: string) => Response) => {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    calls.push(url)
    assert.equal((init?.headers as Record<string, string>).Authorization, 'test-key', 'the key travels in a header, never in the URL')
    return fn(url)
  }) as typeof fetch
}
process.env.PEXELS_API_KEY = 'test-key'

stub(() => respond({ photos: [{ src: { original: 'https://images.pexels.com/photos/9/x.jpeg?old=1' }, avg_color: '#112233' }] }))
const first = await resolveImages('<img data-od-img="Mountain lake" alt="Lake">')
assert.ok(first.includes('src="https://images.pexels.com/photos/9/x.jpeg?auto=compress&amp;cs=tinysrgb&amp;w=800"'))
assert.ok(calls[0].includes('query=mountain%20lake') && !calls[0].includes('test-key'))
await resolveImages('<img data-od-img="mountain LAKE!" alt="Lake">')
assert.equal(calls.length, 1, 'the second screen asking for the same photo costs no request')

calls = []
stub(() => respond({ photos: [{ src: { original: 'https://evil.example/x.jpeg' } }] }))
assert.ok((await resolveImages('<img data-od-img="foreign host" alt="x">')).includes('data-od-img-fallback'), 'only the photo CDN is accepted')
stub(() => respond({ photos: [] }))
assert.ok((await resolveImages('<img data-od-img="no results here" alt="x">')).includes('data-od-img-fallback'))
calls = []
await resolveImages('<img data-od-img="no results here" alt="x">')
assert.equal(calls.length, 0, 'an empty search is remembered too')

stub(() => respond({ error: 'rate limit' }, 429))
assert.ok((await resolveImages('<img data-od-img="rate limited" alt="x">')).includes('data-od-img-fallback'))
stub(() => respond({ photos: [{ src: { original: 'https://images.pexels.com/photos/3/ok.jpeg' } }] }))
assert.ok((await resolveImages('<img data-od-img="rate limited" alt="x">')).includes('photos/3/ok.jpeg'), 'a provider failure is not cached')

// avatars: a seeded person gets a face from a per-gender pool that is fetched once
calls = []
stub((url) => respond({ photos: Array.from({ length: 12 }, (_, i) => ({ src: { original: `https://images.pexels.com/photos/${url.includes('woman') ? 'w' : 'm'}${i}/p.jpeg` } })) }))
const team = await resolveImages('<img data-od-avatar="Zainab Novak" alt="Zainab Novak"><img data-od-avatar="Bram Lindqvist"><img data-od-avatar="Maya Chen">')
assert.ok(/data-od-avatar="Zainab Novak"[^>]*src="https:\/\/images\.pexels\.com\/photos\/w\d+\/p\.jpeg\?auto=compress&amp;cs=tinysrgb&amp;w=128&amp;h=128&amp;fit=crop"/.test(team), 'a woman\'s name gets a face from the women\'s pool')
assert.ok(/data-od-avatar="Bram Lindqvist"[^>]*photos\/m\d+\//.test(team))
assert.ok(/aria-label="Maya Chen" data-od-avatar-resolved[^>]*>MC</.test(team), 'a name the model invented gets initials, not a coin-flip portrait')
assert.equal(calls.length, 2, 'one request per gender pool, none for the unknown name')
const again = await resolveImages('<img data-od-avatar="Zainab Novak">')
assert.equal(calls.length, 2, 'pools are served from the cache afterwards')
assert.equal(again.match(/photos\/w\d+/)?.[0], team.match(/photos\/w\d+/)?.[0], 'the same person keeps the same face on every screen')

delete process.env.PEXELS_API_KEY
calls = []
assert.ok((await resolveImages('<img data-od-avatar="Kofi Mensah">')).includes('src="https://images.pexels.com/photos/m'), 'a cached pool needs no key')
assert.ok((await resolveImages('<img data-od-img="no key configured" alt="x">')).includes('data-od-img-fallback'))
assert.equal(calls.length, 0, 'no key, no request')
assert.equal(await resolveImages('<p>no images</p>'), '<p>no images</p>')

globalThis.fetch = realFetch
console.log('ok')
