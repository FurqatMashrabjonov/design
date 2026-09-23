// Run with the alias hook (see package.json "check").
import assert from 'node:assert'
import { odToSvg, odTreesToSvg, embedImages } from './figma-svg.ts'
import type { ODTree } from './figma-serialize.ts'

const white = { r: 255, g: 255, b: 255, a: 1 }
const tree = (name: string, w = 390, h = 844): ODTree => ({
  version: 1,
  name,
  width: w,
  height: h,
  background: white,
  root: {
    type: 'frame',
    name: 'Screen',
    x: 0,
    y: 0,
    w,
    h,
    fills: [{ type: 'solid', color: white }],
    children: [
      { type: 'text', name: 'Title', x: 16, y: 20, w: 200, h: 24, text: `Hi ${name}`, font: { family: 'Inter', size: 18, weight: 700, italic: false, lineHeight: 24, letterSpacing: 0, color: { r: 0, g: 0, b: 0, a: 1 }, align: 'left', decoration: 'none' }, lines: [{ x: 16, y: 20, w: 200, h: 24, text: `Hi ${name}` }] },
      { type: 'image', name: 'Photo', x: 16, y: 60, w: 120, h: 90, src: 'https://images.pexels.com/photos/1/x.jpeg', fit: 'cover', radius: [8, 8, 8, 8] },
    ],
  },
})

// One screen.
const one = odToSvg(tree('Home'))
assert.ok(one.startsWith('<svg') && one.includes('width="390"') && one.includes('data-name="Home"'))
assert.ok(one.includes('<tspan x="16"') && one.includes('Hi Home'), 'text is real text')
assert.ok(one.includes('<image href="https://images.pexels.com/photos/1/x.jpeg"'), 'the photo is an image layer')
assert.ok(!/<foreignObject|<html/.test(one), 'no HTML smuggled into the SVG')

// FIG-06: several screens, placed as they sit on the canvas and normalised to the origin.
const many = odTreesToSvg(
  [
    { tree: tree('Home'), x: 0, y: 0 },
    { tree: tree('Cart', 390, 900), x: 454, y: 0 },
  ],
  'Feast',
)
assert.ok(many.includes('data-name="Feast"') && many.includes('width="844"') && many.includes('height="900"'), 'the board is as wide as the screens together and as tall as the tallest')
assert.equal(many.match(/<g data-name="(Home|Cart)"/g)?.length, 2, 'a group per screen')
assert.ok(many.includes('<g data-name="Cart" transform="translate(454 0)"'), 'the second screen keeps its canvas position')
assert.ok(!many.includes('transform="translate(0 0)"'), 'the first screen needs no transform')
assert.equal(new Set(many.match(/id="[lcf]\d+"/g)).size, (many.match(/id="[lcf]\d+"/g) ?? []).length, 'ids are unique across screens')
{
  const shifted = odTreesToSvg([{ tree: tree('A'), x: 900, y: 500 }, { tree: tree('B'), x: 1354, y: 500 }], 'App')
  assert.ok(shifted.includes('<g data-name="A">') && shifted.includes('translate(454 0)'), 'the board starts at the top-left screen')
}
assert.equal(odTreesToSvg([{ tree: tree('Solo'), x: 10, y: 10 }]), odToSvg(tree('Solo')), 'one screen is the plain single-screen SVG')

// Photos are fetched once per URL and replaced in place.
{
  const asked: string[] = []
  const out = await embedImages(tree('Home'), async (url, width) => {
    asked.push(`${url}@${width}`)
    return 'data:image/jpeg;base64,AAA'
  })
  assert.deepEqual(asked, ['https://images.pexels.com/photos/1/x.jpeg@120'], 'asked at the size it is drawn')
  assert.ok(odToSvg(out).includes('href="data:image/jpeg;base64,AAA"'))
  assert.ok(odToSvg(tree('Home')).includes('href="https://'), 'the original tree is untouched')
}
console.log('ok')
