// Run with the alias hook and a throwaway database (see package.json "check"). DeepSeek is a stub.
import assert from 'node:assert'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

process.env.SCREEN_SHOTS = '0' // KON-10: no picture is warmed for every screen a test draws
delete process.env.PEXELS_API_KEY // image slots must not reach the network from a test
process.env.LLM_MODEL = 'deepseek-flash' // the stubs below answer in DeepSeek's shape and the credit tests price its profile
process.env.RENDER_AUDIT = "0" // KON-13: no headless Chrome per stub screen; the audit has its own test below
process.env.DEEPSEEK_API_KEY = 'test-key'
const { Project } = await import('../../Models/Project.ts')
const { Screen } = await import('../../Models/Screen.ts')
const { GenerateController } = await import('./GenerateController.ts')
const { PlanController } = await import('./PlanController.ts')
const { HistoryController } = await import('./HistoryController.ts')
const { Message } = await import('../../Models/Message.ts')

// KON-00: a screen is a Konsta component; `page` is one the compiler accepts, fenced as the model writes it.
const page = (title: string) => '```jsx\nimport { Page, Navbar, Block } from \'konsta/react\'\nexport default function Screen() {\n  return <Page><Navbar title="' + title + '" /><Block className="p-4">' + title + '</Block></Page>\n}\n```'
const sse = (text: string) => new Response(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\ndata: [DONE]\n`, { status: 200 })

type Sent = { system: string; user: string; json: boolean }
let sent: Sent[] = []
let reply: (req: Sent) => Response = () => sse(page('Screen'))
let lastAuth: string | undefined
globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
  lastAuth = (init?.headers as Record<string, string> | undefined)?.Authorization
  const body = JSON.parse(String(init?.body))
  const req = { system: body.messages[0].content, user: body.messages[1].content, json: Boolean(body.response_format) }
  sent.push(req)
  return reply(req)
}) as typeof fetch

const post = (controller: { stream(r: Request): Promise<Response> }, body: unknown) =>
  controller.stream(new Request('http://test/api', { method: 'POST', body: JSON.stringify(body) })).then((r) => r.text())


// --- KON-00: plan, draw, retry, edit, add, undo ---
const planJson = JSON.stringify({
  appName: 'Tasky', summary: 'Tasks for today', accent: '#ff375f',
  tabs: [{ id: 'today', label: 'Today', icon: 'ListChecks' }, { id: 'me', label: 'Me', icon: 'User' }],
  screens: [
    { id: 'today', name: 'Today', kind: 'tab', tab: 'today', spec: 'Greeting, task list' },
    { id: 'task', name: 'Task', kind: 'push', parent: 'today', spec: 'Title, notes' },
    { id: 'me', name: 'Me', kind: 'tab', tab: 'me', spec: 'Profile' },
  ],
  data: 'Tasks: Buy milk (due 9:00), Call mom (due 18:00)',
})
const planReply = (req: Sent) => (req.json ? new Response(JSON.stringify({ choices: [{ message: { content: planJson } }] }), { status: 200 }) : null)
{
  const { parsePlan, exampleFor, appContext } = await import('../../Services/JsxGenerator.ts')
  const p = parsePlan(JSON.stringify({ palette: { water: '#0A84FF', 'bad key': '#ffffff', steps: 'orange', sleep: '#5e5ce6' }, tabs: [{ id: 'Home', label: 'Home', icon: 'Nope' }, { id: 'x', label: 'X' }], screens: [{ name: 'A', kind: 'tab', tab: 'home' }, { name: 'B', kind: 'tab', tab: 'home' }, { name: 'C', kind: 'weird' }] }), 'Fallback')
  assert.deepEqual(p.tabs.map((t) => [t.id, t.icon]), [['home', 'House']], 'unknown icons fall back; a tab no screen opens is pruned')
  assert.deepEqual(p.screens.map((s) => [s.id, s.kind]), [['a', 'tab'], ['b', 'push'], ['c', 'push']], 'one root screen per tab; unknown kinds are pushes')
  assert.equal(p.screens[2]!.parent, 'a', 'a push with no parent goes back to the first tab')
  // A tab icon the set lacks comes from the label, and two tabs never wear the same icon (a Sleep tab was a house).
  const icons = parsePlan(JSON.stringify({ tabs: [{ id: 'today', label: 'Today', icon: 'House' }, { id: 'breathe', label: 'Breathe', icon: 'Wind' }, { id: 'sleep', label: 'Sleep', icon: 'BedDouble' }, { id: 'me', label: 'Profile', icon: 'House' }, { id: 'x', label: 'Stuff', icon: 'Nope' }], screens: ['today', 'breathe', 'sleep', 'me', 'x'].map((t) => ({ name: t, kind: 'tab', tab: t })) }), 'X').tabs.map((t) => t.icon)
  assert.deepEqual(icons, ['House', 'Wind', 'Moon', 'CircleUser', 'Sparkles'], 'unknown or repeated tab icons are chosen from the label, then a fallback no other tab wears')
  const { TAB_ICONS } = await import('../../Services/JsxGenerator.ts')
  const kitIcons = readFileSync('runtime/kit/nav.jsx', 'utf8').match(/const ICONS = \{([^}]*)\}/)![1]!.split(',').map((x) => x.trim())
  assert.deepEqual(kitIcons, TAB_ICONS, 'the planner offers exactly the icons the kit can draw')
  const { appLook } = await import('../../Services/JsxGenerator.ts')
  const old = appLook({ theme: null, navigation: JSON.stringify({ tabs: [{ id: 'today', label: 'Today', icon: 'House' }, { id: 'sleep', label: 'Sleep', icon: 'House' }] }) })
  assert.deepEqual(old.tabs.map((t) => t.icon), ['House', 'Moon'], 'an app stored with two house tabs draws the second from its label')
  assert.equal(p.appName, 'Fallback')
  assert.equal(p.accent, '#5e5ce6', 'an invalid accent falls back')
  assert.deepEqual(p.palette, { water: '#0a84ff', sleep: '#5e5ce6' }, 'the palette is pasted as code: identifiers and hex colours only')
  assert.ok(appContext(p).includes('const C = {"water":"#0a84ff","sleep":"#5e5ce6"}'), 'every screen gets the same palette line')
  assert.deepEqual(p.screens.map((s) => exampleFor(p, s)), ['dashboard', 'detail', 'detail'], 'the first tab is built like a dashboard, pushed screens like a detail')
  // PRM-05: a photo prop on any part (a BentoCard) is a photo query.
  {
    const { photoQueries: pq } = await import('../../Services/PhotoService.ts')
    assert.deepEqual(pq('<BentoCard tall photo="woman running at sunrise" />'), ['woman running at sunrise'])
  }
  // PRM-02: a paywall modal is built from the paywall example and survives the eight-screen cut.
  {
    const { exampleFor: ex, parsePlan: pp } = await import('../../Services/JsxGenerator.ts')
    assert.equal(ex(p, { id: 'paywall', name: 'Pacewell Premium', kind: 'modal', parent: 'home', spec: '' }), 'paywall')
    assert.equal(ex(p, { id: 'add-run', name: 'Log a run', kind: 'modal', parent: 'home', spec: '' }), 'sheet')
    const many = pp(JSON.stringify({ appName: 'X', tabs: [{ id: 'home', label: 'Home', icon: 'House' }, { id: 'me', label: 'Me', icon: 'User' }, { id: 'stats', label: 'Stats', icon: 'ChartColumn' }], screens: [
      { id: 'home', name: 'Home', kind: 'tab', tab: 'home', spec: '' }, { id: 'me', name: 'Me', kind: 'tab', tab: 'me', spec: '' }, { id: 'stats', name: 'Stats', kind: 'tab', tab: 'stats', spec: '' },
      ...[1, 2, 3, 4, 5, 6].map((i) => ({ id: `d${i}`, name: `D${i}`, kind: 'push', parent: 'home', spec: '' })),
      { id: 'paywall', name: 'X Premium', kind: 'modal', parent: 'me', spec: '' }] }), 'x', 'seed')
    assert.ok(many.screens.length === 8 && many.screens.some((s) => s.id === 'paywall'), many.screens.map((s) => s.id).join(','))
  }
  // KIT-21: a screen gets the kit blocks its own job asks for, two at most, and the brief says how to call them.
  {
    const { blocksFor, screenBrief: brief } = await import('../../Services/JsxGenerator.ts')
    const names = (name: string, spec: string, kind: 'tab' | 'push' | 'modal' = 'push') => blocksFor({ name, spec, kind }).map((b) => b.block)
    assert.deepEqual(names('Dates & guests', 'Pick check-in and check-out dates', 'modal'), ['MonthCalendar'])
    assert.deepEqual(names('Order status', 'Tracking: the courier is on the way'), ['StepTimeline'])
    assert.deepEqual(names('Order tracking', 'The courier on a map'), ['RouteMap', 'StepTimeline'])
    assert.deepEqual(names('Run detail', 'Route, splits and pace'), ['RouteMap'])
    assert.deepEqual(names('Today', 'Your habits for today', 'tab'), ['WeekStrip'])
    assert.deepEqual(names('Today', 'Your habits for today', 'push'), [], 'a week strip is for tab screens only')
    assert.deepEqual(names('Profile', 'Name, avatar, notifications, weekly reviews and settings', 'tab'), [], 'a word in the spec is not the screen\'s job')
    assert.deepEqual(names('Checkout', 'Pick a delivery date and pay'), [], 'only a screen named for dates gets the calendar')
    const b = brief(p, { ...p.screens[1]!, name: 'Reviews', spec: 'All guest reviews with ratings' })
    assert.ok(b.includes('RatingSummary(') && b.includes("ready-made blocks"), 'the brief names the block and how to call it')
  }
}
{
  const { compileScreen } = await import('../../Services/ScreenCompiler.ts')
  const ok = await compileScreen("import { Page } from 'konsta/react'\nexport default function Screen() { return <Page className=\"bg-red-500\">hi</Page> }")
  assert.ok(ok.ok && ok.js.includes('konsta/react') && ok.css.includes('bg-red-500'), 'JSX compiles to a module with its own Tailwind CSS')
  const bad = await compileScreen("import fs from 'node:fs'\nexport default function Screen() { return <div>{fetch('/x')}</div> }")
  const forgot = await compileScreen("import { Page } from 'konsta/react'\nexport default function Screen() { return <Page><BlockTitle>Hi</BlockTitle><Flame />{[1].map((Icon) => <Icon key={Icon} />)}</Page> }")
  assert.ok(forgot.ok && /import \{ BlockTitle \} from "konsta\/react"/.test(forgot.js) && forgot.js.includes('lucide-react/icons/flame') && !/import Icon/.test(forgot.js), 'a runtime name used without its import is imported; a local one is not')
  assert.ok(!bad.ok && bad.errors.some((e) => /node:fs/.test(e)) && bad.errors.some((e) => /fetch/.test(e)), 'imports outside the whitelist and network calls are refused')
  // HIG-10: a component that exists nowhere is refused (it would crash the frame); locals, params and built-ins are not.
  const ghost = await compileScreen("import { Page } from 'konsta/react'\nexport default function Screen() { return <Page><FancyHero /></Page> }")
  assert.ok(!ghost.ok && ghost.errors.some((e) => /FancyHero/.test(e)), 'a component that does not exist is refused, by name')
  const locals = await compileScreen("import { Page, List, ListItem } from 'konsta/react'\nconst { A: Big } = { A: () => null }\nfunction Row({ icon: Icon, label }) { return <ListItem title={String(label)} media={<Icon />} after={Number('2')} /> }\nexport default function Screen() { return <Page><Big /><List><Row icon={() => null} label='x' /></List></Page> }")
  assert.ok(locals.ok, `destructured names, params and Number()/String() are not missing components: ${locals.ok ? '' : locals.errors}`)
  const { lintJsx } = await import('../../../lib/jsx-lint.ts')
  const lint = lintJsx(`import { Page, Block, BlockTitle, List, ListItem, ListInput, Button, Card } from 'konsta/react'
import { ChevronRight } from 'lucide-react'
import { tint, AppTabbar } from '@od/kit'
export default function Screen() {
  return (
    <Page>
      <List strong inset>
        <ListItem link title="Steps" after={<ChevronRight className="w-4 h-4" />} />
        <ListItem link title="Water" after={<span>1.5 L <ChevronRight /></span>} />
      </List>
      <Block className="grid grid-cols-2 gap-3 px-4">
        <div className="rounded-2xl p-4 text-white bg-white" style={{ background: tint('#0a84ff', 20) }}><span className="text-[9px]">Active</span></div>
      </Block>
      <Block strong inset><BlockTitle>Oops</BlockTitle><ListInput label="Name" /><List><ListItem title="x" /></List></Block>
      <Button large>A</Button><Button large>B</Button><Button large>C 🎉</Button>
      <div className="fixed bottom-0 left-0 right-0">bar</div>
      <AppTabbar active="home" />
    </Page>
  )
}`)
  const src = lint.source
  assert.ok(!/<ChevronRight/.test(src) && /<ListItem link title="Steps"\s*\/>/.test(src), 'a ListItem link loses its second chevron (the whole after when it held only the chevron)')
  assert.ok(/<span>1\.5 L\s*<\/span>/.test(src), 'a chevron inside a richer after keeps the rest of the after')
  assert.ok(!/text-white/.test(src), 'white text on a tint() wash is dropped')
  assert.ok(/className="grid grid-cols-2 gap-3"/.test(src), 'px-4 on a Block is dropped (Block pads itself)')
  assert.ok(src.includes('bg-card') && !src.includes('bg-white ') && src.includes('text-[11px]'), 'a white box becomes the style card (bg-card); text under 11px is raised to 11px')
  const rules = lint.findings.map((f) => f.rule)
  for (const r of ['blocktitle-in-block', 'list-item-outside-list', 'list-in-block', 'prominent-buttons', 'emoji-in-control', 'fixed-bottom-under-tabbar']) assert.ok(rules.includes(r), `the lint reports ${r}`)
  assert.equal(lintJsx('this is not { valid').findings.length, 0, 'a source that does not parse is left to the compiler')
  // A BlockTitle over anything but a Block or List gets a gap, or the next card covers its descenders (LinguaBloom).
  const titled = lintJsx(`export default function Screen() { return <Page><BlockTitle className="!mt-8">Plan</BlockTitle><div className="px-4" /><BlockTitle>Rows</BlockTitle><List /><BlockTitle>Bare</BlockTitle>{[1].map((i) => <div key={i} />)}</Page> }`).source
  assert.ok(titled.includes('className="!mt-8 !mb-2">Plan') && titled.includes('<BlockTitle className="!mb-2">Bare') && titled.includes('<BlockTitle>Rows'), titled)
  // An icon-only Button would take the full row (Konsta's default) and push a centred title under the arrows.
  const arrows = lintJsx(`export default function Screen() { return <div className="flex"><Button clear rounded><ChevronLeft className="w-5" /></Button><div>Sep</div><Button inline><X /></Button><Button>Save</Button><Button className="w-full"><Plus /></Button></div> }`).source
  assert.ok(arrows.includes('<Button inline clear rounded><ChevronLeft') && arrows.includes('<Button inline><X') && arrows.includes('<Button>Save') && arrows.includes('<Button className="w-full"><Plus'), arrows)
  // FCT-01: XP or a streak that APP DATA does not have is a finding; a value it has, or the gap between two, is not.
  {
    const { factFindings, appDataOf } = await import('../../../lib/fact-check.ts')
    const data = 'Maya: Level 4, 640 XP, 5-day streak. Weekly goal: 160 of 200 XP.'
    assert.equal(factFindings(`<div>640 XP · 5-day streak · 40 XP to go</div>`, data).length, 0)
    const bad = factFindings(`const t = "Maya · 170 XP"; <span>7 day streak</span>`, data)
    assert.deepEqual(bad.map((f) => f.rule), ['fact-mismatch', 'fact-mismatch'], JSON.stringify(bad))
    assert.equal(appDataOf('x\n# APP DATA — the only source\nMaya 640 XP\n# THIS SCREEN\ny')?.trim(), 'Maya 640 XP')
  }
  // A raw <img> is reported: there are no image URLs, so it draws a broken picture.
  assert.ok(lintJsx('export default function S() { return <div><img src={x.image} alt="run" /></div> }').findings.some((f) => f.rule === 'raw-img'))
  // The owner's rule (2026-10-05): with apply: false the source is never changed; each fix becomes a finding.
  const kept = lintJsx(`export default function Screen() { return <Page><Block className="px-4"><div className="bg-white">x</div></Block></Page> }`, { apply: false })
  assert.ok(kept.source.includes('className="px-4"') && kept.source.includes('bg-white') && kept.fixed.length === 0, 'the source is left as written')
  assert.ok(['block-double-gutter', 'white-box'].every((r) => kept.findings.some((f) => f.rule === r && f.message.length > 20)), 'what used to be fixed is reported, with an instruction')
  const again = lintJsx(src)
  assert.equal(again.source, src, 'the lint is idempotent: fixing a fixed screen changes nothing')
  // HIG-12: named text styles compile to Apple's sizes; Hero picks its text colour; text-white on a Hero is dropped.
  const typed = await compileScreen("import { Page } from 'konsta/react'\nexport default function Screen() { return <Page><h1 className=\"text-large-title\">A</h1><p className=\"text-footnote\">b</p></Page> }")
  assert.ok(typed.ok && /\.text-large-title\{[^}]*font-size:var\(--text-large-title,34px\)/.test(typed.css) && typed.css.includes('.text-footnote'), 'the type scale is a set of Tailwind utilities on every screen')
  const { onColor } = await import('../../../../runtime/kit/on-color.js')
  assert.deepEqual(['#0a84ff', '#ffd60a', '#30d158', '#1c1c1e', '#fff', 'var(--color-primary)'].map(onColor), ['#ffffff', '#1c1c1e', '#1c1c1e', '#ffffff', '#1c1c1e', '#ffffff'], 'white on dark and saturated blue, ink on yellow, mint and white; an unmeasurable colour keeps white')
  assert.ok(!/text-white/.test(lintJsx('import { Hero } from \'@od/kit\'\nexport default function Screen() { return <Hero color="#ffd60a" className="text-white p-5">x</Hero> }').source), 'text-white on a Hero is dropped')
  const { photoQueries, cachedPhotos, pickIndex } = await import('../../Services/PhotoService.ts')
  // PRM-01: a person's portrait is a photo query, from <Avatar photo> and from an `avatar` data key.
  assert.deepEqual(photoQueries(`const P = [{ name: 'Leo', avatar: 'portrait bearded man' }]; export default function S() { return <Avatar name="Maya" photo="Portrait smiling woman" /> }`).sort(), ['portrait bearded man', 'portrait smiling woman'])
  // PHT-01: a query picks one of the five best results by its own hash — stable for a query, varied across near ones.
  assert.equal(pickIndex('Runner Portrait ', 5), pickIndex('runner portrait', 5), 'the same query (as normalised) picks the same photo')
  assert.ok(new Set(['runner portrait', 'smiling runner portrait', 'young runner portrait', 'runner portrait outdoors', 'portrait of a runner'].map((q) => pickIndex(q, 5))).size > 1 && pickIndex('x', 1) === 0 && pickIndex('x', 0) === 0, 'near queries spread over the results; one result is the only choice')
  const withPhotos = "const DISHES = [{ name: 'Salad', photo: 'Grilled  Chicken Salad' }, { name: 'x', photo: 'https://evil.example/a.jpg' }]\nexport default function Screen() { return <Page><Photo q=\"beach villa\" /><Photo q={DISHES[0].photo} /></Page> }"
  assert.deepEqual(photoQueries(withPhotos).sort(), ['beach villa', 'grilled chicken salad'], 'photo queries come from <Photo q> literals and photo data keys, normalised; URLs are never queries')
  const { ImageCache } = await import('../../Models/ImageCache.ts')
  await ImageCache.save('beach villa', 'https://images.pexels.com/photos/1/a.jpeg?w=800', '#aabbcc')
  await ImageCache.save('grilled chicken salad', '', null)
  assert.deepEqual(await cachedPhotos(withPhotos), { 'beach villa': { u: 'https://images.pexels.com/photos/1/a.jpeg?w=800', c: '#aabbcc' } }, 'the page gets cached photos only; a query with no photo is left out')
  const { screenDocument } = await import('../../Services/ScreenDocument.ts')
  const doc = await screenDocument("import { Page } from 'konsta/react'\nexport default function Screen() { return <Page>hi</Page> }", { accent: '#ff375f', dark: true, platform: 'material', tabs: [] }, { slug: 'home' })
  assert.ok(doc.includes('importmap') && doc.includes('"dark":true') && doc.includes('"platform":"material"') && doc.includes('#ff375f'), 'the page carries the import map and the look')
}
await Project.create({ id: 'p2', name: 'x', designSystem: 'konsta', device: 'mobile' })
sent = []
const which = (req: Sent) => req.user.match(/Write the (\w+) screen now/)?.[1] ?? ''
reply = (req) => planReply(req) ?? (which(req) === 'Task' ? sse('no code here') : sse(page(which(req))))
{
  const events = (await post(PlanController, { projectId: 'p2', brief: 'todo app' })).trim().split('\n').map((l) => JSON.parse(l))
  assert.equal(events[0].type, 'plan')
  assert.equal(events[0].screenIds.length, 3)
  assert.ok(events.some((e) => e.type === 'screen_error'), 'the client is told a screen failed')
  const project = (await Project.find('p2'))!
  assert.equal(project.name, 'Tasky')
  assert.deepEqual(JSON.parse(project.navigation!).tabs.map((t: { id: string }) => t.id), ['today', 'me'])
  // THM-01: the accent is the code's, from the style's set and the project id — not what the planner wrote.
  const { styleColors } = await import('../../../lib/app-theme.ts')
  const savedTheme = JSON.parse(project.theme!)
  assert.deepEqual([savedTheme.accent, savedTheme.style], [styleColors('clean', [], 'p2').accent, 'clean'])
  const rows = (await Screen.forProject('p2')).sort((a, z) => a.x - z.x)
  assert.deepEqual(rows.map((s) => [s.slug, Boolean(s.html), Boolean(s.error)]), [['today', true, false], ['me', true, false], ['task', false, true]], 'tabs first; the failed screen keeps its slot')
  assert.ok(rows[0]!.html.startsWith('import') && !rows[0]!.html.includes('```'), 'the stored screen is the bare component')
  assert.equal(rows[2]!.parentScreenName, 'Today')
  assert.ok(sent.filter((s) => !s.json && which(s) === 'Task').length === 2, 'a screen that did not build is tried once more with the errors')
  assert.ok(sent.some((s) => s.user.includes('Buy milk')), 'every screen gets the app data')

  // Retry in place, then edit, then undo the edit from the chat.
  reply = () => sse(page('Task'))
  const task = rows[2]!
  assert.ok(!(await post(GenerateController, { projectId: 'p2', regenerateScreenId: task.id })).includes('GEN_ERROR'))
  assert.ok((await Screen.find(task.id))!.html.includes('title="Task"') && (await Screen.find(task.id))!.error === null, 'the slot is filled')
  sent = []
  reply = () => sse(page('Task v2'))
  await post(GenerateController, { projectId: 'p2', editScreenId: task.id, prompt: 'make it red' })
  assert.ok(sent[0]!.user.includes('title="Task"') && sent[0]!.user.includes('make it red'), 'an edit hands the model the component and the change')
  assert.ok((await Screen.find(task.id))!.html.includes('Task v2'))
  const agent = (await Message.forProject('p2')).filter((m) => m.role === 'agent' && m.kind === 'edit').at(-1)!
  await HistoryController.revertMessage({ projectId: 'p2', messageId: agent.id })
  assert.ok(!(await Screen.find(task.id))!.html.includes('Task v2'), 'undo from the chat puts the component back')

  // An added screen joins the plan with its own slug.
  reply = () => sse(page('Settings'))
  await post(GenerateController, { projectId: 'p2', prompt: 'a settings screen' })
  const added = (await Screen.forProject('p2')).find((s) => s.name === 'Settings')!
  assert.ok(added?.slug?.startsWith('screen-'), 'named from its Navbar title, with a slug to push to')
  assert.ok(JSON.parse((await Project.find('p2'))!.plan!).screens.some((s: { id: string }) => s.id === added.slug), 'and it is in the plan')

  // A failure is reported, and nothing changes.
  reply = () => sse('still no code')
  assert.ok((await post(GenerateController, { projectId: 'p2', editScreenId: task.id, prompt: 'x' })).includes('GEN_ERROR'))
}

// B1: ownership, orphan adoption, account deletion cascades
{
  const { db } = await import('../../../database/connection.ts')
  const { user } = await import('../../../database/schema.ts')
  const { AccountController } = await import('./AccountController.ts')
  const now = new Date()
  await db.insert(user).values([{ id: 'u1', name: 'A', email: 'a@x.uz', createdAt: now, updatedAt: now }, { id: 'u2', name: 'B', email: 'b@x.uz', createdAt: now, updatedAt: now }])
  await Project.create({ id: 'own-1', name: 'Mine', designSystem: 'minimal', device: 'mobile', userId: 'u1' })
  await Project.create({ id: 'orphan-1', name: 'Old', designSystem: 'minimal', device: 'mobile' })
  assert.ok(await Project.findOwned('own-1', 'u1') && !await Project.findOwned('own-1', 'u2'), 'only the owner finds a project')
  assert.deepEqual((await Project.forUser('u2')).map((p) => p.id), [], 'nobody else lists it')
  await Project.adoptOrphans('u2')
  assert.equal((await Project.find('orphan-1'))!.userId, 'u2', 'projects from before accounts go to the first person who signs in')
  assert.equal((await Project.find('own-1'))!.userId, 'u1', 'owned projects are not adopted')
  await Screen.create({ id: 's-own', projectId: 'own-1', name: 'S', prompt: 'p', html: '<html></html>', x: 0, y: 0 })
  await AccountController.destroy('u1')
  assert.ok(!await Project.find('own-1') && !await Screen.find('s-own'), 'deleting the account deletes its projects and screens')
  assert.ok(await Project.find('orphan-1'), "and nobody else's")
}


// GQ-07: a planned run outlives its page; only Stop ends it
{
  const { PlanRuns } = await import('../../Services/PlanRuns.ts')
  reply = (req) => planReply(req) ?? sse(page('Drawn'))
  await Project.create({ id: 'p-detach', name: 'x', designSystem: 'konsta', device: 'mobile' })
  let finished = 0
  const res = await PlanController.stream(new Request('http://test/api', { method: 'POST', body: JSON.stringify({ projectId: 'p-detach', brief: 'todo app' }) }), { onFinish: () => finished++ })
  assert.equal(res.headers.get('X-OD-Detached'), '1')
  await res.body!.cancel() // the tab closed before anything arrived
  for (let i = 0; i < 50 && (finished === 0 || PlanRuns.running('p-detach')); i++) await new Promise((r) => setTimeout(r, 20))
  assert.equal(finished, 1, 'the run reports its own end')
  assert.equal((await Screen.forProject('p-detach')).filter((s) => s.html).length, 3, 'every planned screen was still drawn and saved')
  assert.ok(!(await Message.forProject('p-detach')).some((m) => /Stopped/.test(m.text)), 'and the chat does not say it stopped')

  // Stop reaches the run on the server.
  let release!: () => void
  const gate = new Promise<void>((r) => (release = r))
  reply = (req) => (req.json ? new Response(JSON.stringify({ choices: [{ message: { content: planJson } }] }), { status: 200 }) : new Response(new ReadableStream({ async start(c) { await gate; c.close() } })))
  await Project.create({ id: 'p-stop', name: 'x', designSystem: 'konsta', device: 'mobile' })
  const res2 = await PlanController.stream(new Request('http://test/api', { method: 'POST', body: JSON.stringify({ projectId: 'p-stop', brief: 'todo app' }) }))
  const reader = res2.body!.getReader()
  await reader.read() // the plan event: the anchor screen is now waiting on the model
  assert.equal(PlanRuns.stop('p-stop'), true, 'Stop finds the run')
  release()
  while (!(await reader.read()).done) {}
  assert.equal(PlanRuns.running('p-stop'), false)
  assert.equal((await Screen.forProject('p-stop')).filter((s) => s.html).length, 0, 'nothing more is drawn after Stop')
  assert.ok((await Message.forProject('p-stop')).some((m) => m.role === 'agent' && /Stopped/i.test(m.text)), 'and the chat says it stopped')
  reply = () => sse(page('Screen'))
}


// ADM-01/04/08: admins, bans, runtime settings, audit trail
{
  const { isAdmin } = await import('../../Services/AuthService.ts')
  const { AdminController } = await import('./AdminController.ts')
  const { UsageService } = await import('../../Services/UsageService.ts')
  const { AdminStatsService } = await import('../../Services/AdminStatsService.ts')
  const { Setting } = await import('../../Models/Setting.ts')
  const { db } = await import('../../../database/connection.ts')
  const { user, session } = await import('../../../database/schema.ts')
  const { eq } = await import('drizzle-orm')
  process.env.ADMIN_EMAILS = 'Boss@x.uz, other@x.uz'
  assert.ok(isAdmin({ email: 'boss@x.uz' }) && isAdmin({ email: 'z@x.uz', role: 'admin' }) && !isAdmin({ email: 'z@x.uz', role: 'user' }), 'admins come from ADMIN_EMAILS or the role')
  const now = new Date()
  await db.insert(user).values({ id: 'adm', name: 'Boss', email: 'boss@x.uz', createdAt: now, updatedAt: now })
  await db.insert(session).values({ id: 'sess-u2', token: 't-u2', userId: 'u2', expiresAt: new Date(Date.now() + 1e7), createdAt: now, updatedAt: now })
  await AdminController.ban('adm', { userId: 'u2', reason: 'spam' })
  const banned = (await db.select().from(user).where(eq(user.id, 'u2')))[0]!
  assert.ok(banned.banned && banned.banReason === 'spam', 'a ban is saved with its reason')
  assert.equal((await db.select().from(session).where(eq(session.userId, 'u2'))).length, 0, 'and signs the user out everywhere')
  await assert.rejects(async () => await AdminController.ban('adm', { userId: 'adm', reason: '' }), /yourself/)
  await AdminController.unban('adm', 'u2')
  assert.equal((await db.select().from(user).where(eq(user.id, 'u2')))[0]!.banned, false)
  await assert.rejects(async () => await AdminController.setRole('adm', { userId: 'adm', role: 'user' }), /own admin role/)

  await AdminController.setSetting('adm', { key: 'generation.paused', value: '1' })
  assert.equal((await UsageService.refusal('u2'))?.status, 503, 'a pause set in the panel stops generation without a deploy')
  await AdminController.setSetting('adm', { key: 'generation.paused', value: null })
  assert.equal((await UsageService.limits()).paused, false)
  await assert.rejects(async () => await AdminController.setSetting('adm', { key: 'limits.callsPerDay', value: '-3' }), /Invalid value/)
  await AdminController.setSetting('adm', { key: 'limits.callsPerDay', value: '40' })
  await AdminController.setUserLimit('adm', { userId: 'u2', limit: 500 })
  assert.deepEqual([(await UsageService.limits()).callsPerDay, (await UsageService.limits('u2')).callsPerDay, (await UsageService.limits('adm')).callsPerDay], [40, 500, 40], 'a per-user limit beats the global one')
  await AdminController.setUserLimit('adm', { userId: 'u2', limit: null })
  await AdminController.setSetting('adm', { key: 'limits.callsPerDay', value: null })
  assert.equal((await Setting.all()).length, 0, 'clearing a setting falls back to the default')

  const trail = (await AdminStatsService.controls()).actions.map((a) => a.action)
  assert.deepEqual(trail.slice(0, 3), ['set-setting', 'set-user-limit', 'set-user-limit'], 'every admin write is logged, newest first')
  assert.ok(trail.includes('ban') && trail.includes('unban'))

  // BIL-04: credits are a ledger — the balance is the sum, a ref happens once, an admin grant is logged.
  const { Credit } = await import('../../Models/Credit.ts')
  assert.equal(await Credit.balance('u2'), 0, 'no rows, no credits')
  assert.equal(await Credit.add({ userId: 'u2', delta: 60, kind: 'signup', ref: 'signup:u2' }), true)
  assert.equal(await Credit.add({ userId: 'u2', delta: 60, kind: 'signup', ref: 'signup:u2' }), false, 'the same ref twice grants once (a webhook delivered twice)')
  await Credit.add({ userId: 'u2', delta: -15, kind: 'hold', actionId: 'a1' })
  await Credit.add({ userId: 'u2', delta: 4, kind: 'refund', actionId: 'a1' })
  assert.equal(await Credit.balance('u2'), 49, 'balance = sum of rows')
  assert.equal(await Credit.ofAction('u2', 'a1'), -11, 'an action nets its hold and refunds')
  await assert.rejects(async () => await Credit.add({ userId: 'u2', delta: 1.5, kind: 'admin' }), /whole/)
  await AdminController.grantCredits('adm', { userId: 'u2', amount: 100, note: 'beta tester' })
  assert.equal(await Credit.balance('u2'), 149)
  assert.equal((await AdminStatsService.controls()).actions[0]!.action, 'grant-credits', 'a grant is in the admin log')
  assert.equal((await AdminStatsService.user('u2'))!.user.credits, 149, 'the user page shows the balance')
  assert.equal((await AdminStatsService.user('u2'))!.credits[0]!.note, 'beta tester', 'newest movement first')
}

// BIL-05: every action's credit price, at the cheapest a credit is sold, covers what the action
// really costs at its worst: DeepSeek's peak hours and the 90th percentile of logged calls
// (llm_calls, 174 calls, measured 2026-09-24, off-peak p90 doubled). Under peak-p90 × 1.25 a heavy
// user would cost more than they pay. Element edits are not yet in the log; theirs is an estimate
// (a whole-screen prompt, a few hundred tokens out) until LLM-06 measures it.
{
  const { CreditService, CREDIT_PRICES, CHEAPEST_CREDIT_USD } = await import('../../Services/CreditService.ts')
  const PEAK_P90_USD = { plan: 0.0045, screen: 0.0114, element: 0.006 }
  const { PRICES, MODELS, costOf } = await import('../../Services/LlmService.ts')
  // LLM-07: every other model is held to the same rule. Its worst cost is DeepSeek's token profile
  // (plan 2k in/2k out, screen 10k in of which 7k cached/6k out, element 15k in/0.5k out), priced at
  // that model's rates and scaled by what DeepSeek's log measured over the same profile.
  const PROFILE = {
    plan: { promptTokens: 2000, cachedTokens: 0, completionTokens: 2000 },
    screen: { promptTokens: 10000, cachedTokens: 7000, completionTokens: 6000 },
    element: { promptTokens: 15000, cachedTokens: 0, completionTokens: 500 },
  }
  const peak = new Date('2026-09-23T07:00:00Z') // a Wednesday, in DeepSeek's peak hours
  const worstAt = (m: string, k: keyof typeof PROFILE) => {
    const u = { ...PROFILE[k], cacheWriteTokens: 0 }
    // Claude writes its cache before it reads it: the worst case pays the write.
    if (PRICES[m]!.cacheWrite) Object.assign(u, { cacheWriteTokens: u.cachedTokens, cachedTokens: 0 })
    return costOf(u, m, peak) * (PEAK_P90_USD[k] / costOf(PROFILE[k], 'deepseek-flash', peak))
  }
  for (const m of Object.keys(MODELS)) {
    assert.ok(CREDIT_PRICES[m], `${m} can be picked, so it needs credit prices`)
    const worst = { plan: worstAt(m, 'plan'), draw: 6.5 * worstAt(m, 'screen'), screen: worstAt(m, 'screen'), element: worstAt(m, 'element') }
    for (const kind of ['plan', 'draw', 'screen', 'element'] as const) {
      const credits = await CreditService.priceOf(kind, m)
      const usd = credits * CHEAPEST_CREDIT_USD
      assert.ok(usd >= worst[kind] * 1.25 - 1e-9, `${m} ${kind}: ${credits} credits = $${usd.toFixed(4)}, under 1.25 × its worst cost $${worst[kind].toFixed(4)}`)
    }
  }
  assert.equal(await CreditService.priceOf('app'), 15, 'an app is 15 credits: the plan and its drawing (BIL-02)')
  assert.deepEqual(CREDIT_PRICES['deepseek-flash'], { plan: 1, draw: 14, screen: 2, element: 1 })
  await assert.rejects(() => CreditService.priceOf('screen', 'gpt-imaginary'), /No credit price/)
  for (const m of Object.keys(CREDIT_PRICES)) assert.ok(PRICES[m], `${m} has credit prices, so it needs a token price too`)
  // Which action a request is.
  assert.equal(CreditService.kindOf('/api/generate-plan', { brief: 'x', gate: true }), 'plan')
  assert.equal(CreditService.kindOf('/api/generate-plan', { approve: {} }), 'draw')
  assert.equal(CreditService.kindOf('/api/generate-plan', { brief: 'x' }), 'app')
  assert.equal(CreditService.kindOf('/api/generate', { prompt: 'x' }), 'screen')
  assert.equal(CreditService.kindOf('/api/generate', { editScreenId: 's', prompt: 'x' }), 'screen')
  assert.equal(CreditService.kindOf('/api/generate', { editScreenId: 's', editElementId: 'button-3', prompt: 'x' }), 'element')
}

// BIL-06: the price is held before the model runs; an action that produced nothing gives it all
// back, a planned run pays back its undrawn screens, and no action returns more than it took.
{
  const { CreditService } = await import('../../Services/CreditService.ts')
  const { UsageService } = await import('../../Services/UsageService.ts')
  const { Credit } = await import('../../Models/Credit.ts')
  await Credit.add({ userId: 'buyer', delta: 20, kind: 'admin' })
  assert.equal(await CreditService.hold('buyer', 'act-a', 15), true)
  assert.equal(await CreditService.hold('buyer', 'act-b', 15), false, 'a hold the balance cannot cover is refused')
  assert.equal(await Credit.balance('buyer'), 5, 'a refused hold writes nothing')
  // act-a made no successful call (none at all): settling gives all 15 back, and a second settle nothing.
  await CreditService.settle('buyer', 'act-a')
  await CreditService.settle('buyer', 'act-a')
  assert.equal(await Credit.balance('buyer'), 20, 'nothing generated, nothing paid — once')
  // A planned run inside an action: 2 of its screens undrawn come back at 2 each, capped by the hold.
  await CreditService.hold('buyer', 'act-c', 14)
  assert.equal(await UsageService.run({ userId: 'buyer', actionId: 'act-c' }, () => CreditService.refundScreens(2)), 4)
  assert.equal(await UsageService.run({ userId: 'buyer', actionId: 'act-c' }, () => CreditService.refundScreens(50)), 10, 'never more than the action still holds')
  assert.equal(await Credit.ofAction('buyer', 'act-c'), 0)
  assert.equal(await CreditService.refundScreens(3), 0, 'outside an action (the eval) there is nothing to refund')
  // BIL-07: a new account's free start, granted once.
  const { SIGNUP_CREDITS } = await import('../../Services/CreditService.ts')
  assert.equal(await CreditService.signupGrant('newbie'), true)
  assert.equal(await CreditService.signupGrant('newbie'), false, 'the start is granted once')
  assert.equal(await Credit.balance('newbie'), SIGNUP_CREDITS)
  assert.equal(SIGNUP_CREDITS, 4 * (await CreditService.priceOf('app')), 'the free start is four apps (BIL-02)')
}

// BIL-09/10: plans grant monthly (a yearly plan too), once per month; unused plan credits lapse at the
// next month, packs never do; every webhook may arrive twice and grants once.
{
  const { BillingController } = await import('./BillingController.ts')
  const { CreditService } = await import('../../Services/CreditService.ts')
  const { Credit } = await import('../../Models/Credit.ts')
  const { Subscription, monthIndex } = await import('../../Models/Subscription.ts')
  const t = (iso: string) => Math.floor(Date.parse(iso) / 1000)
  assert.equal(monthIndex(t('2026-01-31T10:00:00Z'), t('2026-02-27T10:00:00Z')), 0)
  assert.equal(monthIndex(t('2026-01-31T10:00:00Z'), t('2026-02-28T10:00:00Z')), 1, 'Jan 31 renews on Feb 28')
  assert.equal(monthIndex(t('2026-01-15T10:00:00Z'), t('2027-01-15T09:59:59Z')), 11)

  await assert.rejects(BillingController.checkout({ id: 'payer', email: 'p@x.uz' }, 'pack-500', 'http://x'), /subscribers/, 'packs are for subscribers only')
  // BIL-25: a checkout the provider cannot open (here: no token) reaches the browser as one plain marker, never the
  // provider's reply; "tell me when it opens" joins the waitlist with the plan wanted.
  {
    const { PAYMENTS_CLOSED } = await import('../../../lib/credit-prices.ts')
    const { sql } = await import('drizzle-orm')
    const { all } = await import('../../../database/query.ts')
    const err = await BillingController.checkout({ id: 'payer', email: 'p@x.uz' }, 'pro-month', 'http://x').then(() => null, (e: Error) => e)
    assert.equal(err?.message, PAYMENTS_CLOSED, 'the browser sees only the marker')
    await BillingController.notifyWhenOpen({ email: 'Waiting@X.uz' }, 'pro-month')
    const [row] = await all<{ ref: string; note: string }>(sql`SELECT ref, note FROM waitlist WHERE email = 'waiting@x.uz'`)
    assert.deepEqual(row, { ref: 'payments', note: 'wants pro-month' })
  }

  const sub = (status: string, extra: Record<string, unknown> = {}) => ({
    type: 'subscription.updated',
    data: { id: 'sub_1', status, started_at: new Date().toISOString(), current_period_end: new Date(Date.now() + 365 * 864e5).toISOString(), customer: { external_id: 'payer' }, product: { metadata: { od: 'starter-year' } }, ...extra },
  })
  assert.equal(await BillingController.webhook(sub('active')), 'subscription saved')
  await BillingController.webhook(sub('active'))
  assert.equal(await Credit.balance('payer'), 1200, 'the first month lands once, however often the event comes')
  assert.equal(await BillingController.webhook({ type: 'order.paid', data: { id: 'ord_9', product: { metadata: { od: 'pack-500' } }, customer: { external_id: 'payer' } } }), 'pack granted')
  assert.equal(await BillingController.webhook({ type: 'order.paid', data: { id: 'ord_9', product: { metadata: { od: 'pack-500' } }, customer: { external_id: 'payer' } } }), 'duplicate')
  assert.equal(await Credit.balance('payer'), 1700)
  // PRC-02: Free exports three times in all (counted on the server, two at once cannot both take the last try);
  // a plan exports without limit.
  {
    assert.equal(await CreditService.exportsLeft('free-x'), 3)
    assert.ok(await CreditService.useExport('free-x', false, 'react', null))
    const both = await Promise.all([CreditService.useExport('free-x', false, 'figma', null), CreditService.useExport('free-x', false, 'html', null), CreditService.useExport('free-x', false, 'figma', null)])
    assert.equal(both.filter(Boolean).length, 2, 'only the two tries left are granted, even at once')
    assert.equal(await CreditService.exportsLeft('free-x'), 0)
    assert.equal(await CreditService.useExport('free-x', false, 'react', null), false, 'the fourth is refused')
    assert.equal(await CreditService.exportsLeft('payer'), null, 'a plan is unlimited')
    for (let i = 0; i < 5; i++) assert.ok(await CreditService.useExport('payer', false, 'react', null))
  }
  // BIL-21: the billing page splits the balance into this month's plan credits and the pack credits that never lapse.
  {
    const page = await BillingController.page('payer')
    assert.deepEqual([page.plan, page.interval, page.balance, page.month, page.packCredits, page.canExport], ['starter', 'year', 1700, { granted: 1200, left: 1200 }, 500, true])
    assert.ok(page.renews && page.history[0]?.kind === 'purchase', 'it shows when the plan renews and the newest movement first')
  }
  assert.equal(await BillingController.webhook({ type: 'order.paid', data: { id: 'ord_x', product: { metadata: { od: 'something-else' } }, customer: { external_id: 'payer' } } }), 'ignored')

  // Spend 200 of the plan's 1 200, then a month passes: 1 000 unused lapse, the 500 pack stays, 1 200 arrive.
  await CreditService.hold('payer', 'act-p', 200)
  const nextMonth = Math.floor(Date.now() / 1000) + 31 * 86400
  await CreditService.refresh('payer', nextMonth)
  await CreditService.refresh('payer', nextMonth)
  assert.equal(await Credit.balance('payer'), 500 + 1200, 'unused plan credits lapse, the pack does not, the new month lands once')

  // Cancelled at period end: still the plan until the period ends; revoked: nothing more.
  await BillingController.webhook(sub('active', { cancel_at_period_end: true }))
  assert.ok(await Subscription.activeFor('payer'), 'a cancelled plan runs to the end of its period')
  await BillingController.webhook(sub('revoked'))
  assert.equal(await Subscription.activeFor('payer'), undefined)
  const before = await Credit.balance('payer')
  await CreditService.refresh('payer', nextMonth + 31 * 86400)
  assert.equal(await Credit.balance('payer'), before, 'a revoked plan grants nothing more')
}

// BIL-14: a plan's project count is enforced on the server; export follows the plan; admins are free.
{
  const { CreditService } = await import('../../Services/CreditService.ts')
  const { Subscription } = await import('../../Models/Subscription.ts')
  const { ProjectController } = await import('./ProjectController.ts')
  const { db } = await import('../../../database/connection.ts')
  const { user } = await import('../../../database/schema.ts')
  await db.insert(user).values({ id: 'freebie', name: 'F', email: 'f@x.uz', createdAt: new Date(), updatedAt: new Date() })
  assert.deepEqual(await CreditService.limitsFor('freebie'), { plan: 'free', projects: 1, export: false })
  assert.deepEqual(await CreditService.limitsFor('freebie', true), { plan: 'free', projects: null, export: true }, 'an admin is not limited')
  await ProjectController.store({ designSystem: 'nova', userId: 'freebie' })
  await assert.rejects(async () => await ProjectController.store({ designSystem: 'nova', userId: 'freebie' }), /plan-limit:projects:1/, 'Free makes one project')
  await ProjectController.store({ designSystem: 'nova', userId: 'freebie', admin: true })
  await Subscription.upsert({ id: 'sub_s', userId: 'freebie', productKey: 'starter-month', status: 'active', startedAt: Math.floor(Date.now() / 1000), currentPeriodEnd: null, cancelAtPeriodEnd: false })
  assert.deepEqual(await CreditService.limitsFor('freebie'), { plan: 'starter', projects: 5, export: true })
  for (let i = 0; i < 3; i++) await ProjectController.store({ designSystem: 'nova', userId: 'freebie' })
  await assert.rejects(async () => await ProjectController.store({ designSystem: 'nova', userId: 'freebie' }), /plan-limit:projects:5/, 'Starter makes five')
  await Subscription.upsert({ id: 'sub_s', userId: 'freebie', productKey: 'pro-month', status: 'active', startedAt: Math.floor(Date.now() / 1000), currentPeriodEnd: null, cancelAtPeriodEnd: false })
  await ProjectController.store({ designSystem: 'nova', userId: 'freebie' })
  assert.equal((await CreditService.limitsFor('freebie')).projects, null, 'Pro is unlimited')
  await ProjectController.store({ designSystem: 'nova' }) // the eval and tests make projects with no user: never limited
}

// ADM-13: a key saved in the panel wins over .env, is stored sealed, is shown only by its last four,
// and removing it falls back to .env. The test reports an outcome, never a response body.
{
  const { randomBytes } = await import('node:crypto')
  process.env.SECRETS_KEY = randomBytes(32).toString('base64')
  const { SecretService } = await import('../../Services/SecretService.ts')
  const { AdminController } = await import('./AdminController.ts')
  const { AdminStatsService } = await import('../../Services/AdminStatsService.ts')
  const { db } = await import('../../../database/connection.ts')
  const { secrets } = await import('../../../database/schema.ts')
  process.env.PEXELS_API_KEY = 'env-pexels-0000'
  assert.equal(await SecretService.get('PEXELS_API_KEY'), 'env-pexels-0000', 'no saved key: .env')
  await AdminController.setSecret('adm', { name: 'PEXELS_API_KEY', value: 'panel-pexels-9876' })
  assert.equal(await SecretService.get('PEXELS_API_KEY'), 'panel-pexels-9876', 'a saved key wins, at once (cache cleared)')
  const [row] = await db.select().from(secrets)
  assert.ok(row && !row.sealed.includes('panel-pexels') && row.last4 === '9876', 'stored sealed; only the last four in clear')
  const st = (await AdminController.secrets()).find((k) => k.name === 'PEXELS_API_KEY')!
  assert.deepEqual([st.source, st.last4], ['admin', '9876'])
  assert.ok(!JSON.stringify(await AdminController.secrets()).includes('panel-pexels'), 'the panel never receives a key')
  assert.equal((await AdminController.secrets()).find((k) => k.name === 'ANTHROPIC_API_KEY')!.source, 'missing')
  assert.equal((await AdminStatsService.controls()).actions[0]!.detail, '…9876', 'the log keeps the last four only')
  const llmFetch = globalThis.fetch
  let probe = { status: 401, headers: {} as Record<string, string> }
  globalThis.fetch = (async (_url: unknown, init?: RequestInit) => ((probe.headers = init?.headers as Record<string, string>), new Response('{"error":"invalid key sk-echo"}', { status: probe.status }))) as typeof fetch
  const bad = await AdminController.testSecret('PEXELS_API_KEY')
  assert.ok(!bad.ok && /Rejected/.test(bad.detail) && !bad.detail.includes('sk-echo'), 'a rejected key says so, without the body')
  assert.equal(probe.headers.Authorization, 'panel-pexels-9876', 'the test sends the key in force')
  probe.status = 200
  assert.equal((await AdminController.testSecret('PEXELS_API_KEY')).ok, true)
  globalThis.fetch = llmFetch
  // The model call takes the panel's DeepSeek key over .env (SecretService registers itself with LlmService).
  process.env.DEEPSEEK_API_KEY = 'env-deepseek-0000'
  await AdminController.setSecret('adm', { name: 'DEEPSEEK_API_KEY', value: 'panel-deepseek-1111' })
  await Project.create({ id: 'p-key', name: 'K', designSystem: 'minimal', device: 'mobile' })
  await post(GenerateController, { projectId: 'p-key', prompt: 'a settings screen' })
  assert.equal(lastAuth, 'Bearer panel-deepseek-1111', 'generation uses the key saved in the panel')
  await AdminController.setSecret('adm', { name: 'DEEPSEEK_API_KEY', value: null })
  await post(GenerateController, { projectId: 'p-key', prompt: 'another screen' })
  assert.equal(lastAuth, 'Bearer env-deepseek-0000', 'removed from the panel: .env again')
  await AdminController.setSecret('adm', { name: 'PEXELS_API_KEY', value: null })
  assert.equal(await SecretService.get('PEXELS_API_KEY'), 'env-pexels-0000', 'removed: back to .env')
  assert.deepEqual((await AdminController.testSecret('ANTHROPIC_API_KEY')), { ok: false, detail: 'No key set' })
}

// ADM-10: the admin command palette searches users and projects; % and _ match literally
{
  const { AdminController } = await import('./AdminController.ts')
  const { db } = await import('../../../database/connection.ts')
  const { user } = await import('../../../database/schema.ts')
  const now = new Date()
  await db.insert(user).values({ id: 'pal', name: 'Pal Ette', email: 'palette@x.uz', createdAt: now, updatedAt: now })
  await Project.create({ id: 'pal-p', name: 'Zeta 100% App', designSystem: 'minimal', device: 'mobile', userId: 'pal' })
  assert.ok((await AdminController.search('PALETTE')).users.some((u) => u.id === 'pal'), 'a user is found by email, any case')
  assert.ok((await AdminController.search('ette')).users.some((u) => u.id === 'pal'), 'and by name')
  const hit = (await AdminController.search('100%')).projects
  assert.deepEqual(hit.map((p) => [p.id, p.owner]), [['pal-p', 'palette@x.uz']], 'a project by name, with its owner')
  assert.deepEqual((await AdminController.search('%')).projects.map((p) => p.id), ['pal-p'], '% is a literal, not a wildcard')
  assert.deepEqual(await AdminController.search('  '), { users: [], projects: [] }, 'blank text finds nothing')
}

// OBS-10/OBS-11: the request log masks secrets and skips assets; errors group by fingerprint; logs carry their request
{
  const { TelescopeService, maskQuery, skipPath, fingerprint, installServerLogs } = await import('../../Services/TelescopeService.ts')
  const { RequestContext } = await import('../../Services/RequestContext.ts')
  const { db } = await import('../../../database/connection.ts')
  const { httpRequests, serverLogs, user } = await import('../../../database/schema.ts')
  const { eq } = await import('drizzle-orm')

  assert.equal(maskQuery(new URL('http://x/a?token=abc&page=2').search), 'token=***&page=2', 'a token is masked, page kept')
  assert.equal(maskQuery('?apiKey=1&sessionId=2&q=hi'), 'apiKey=***&sessionId=***&q=hi')
  assert.equal(maskQuery(''), null)
  for (const p of ['/@vite/client', '/@fs/x', '/@id/y', '/node_modules/z.js', '/src/styles.css', '/assets/app.js', '/a.css', '/a.map', '/logo.png', '/icon.svg', '/favicon.ico', '/f.woff2', '/showcase/x', '/api/thumb/s1', '/api/rt/v123/lucide/star'])
    assert.ok(skipPath(p), `${p} is not recorded`)
  for (const p of ['/', '/admin/requests', '/_serverFn/abc', '/api/generate', '/p/123']) assert.ok(!skipPath(p), `${p} is recorded`)

  const at = '    at load (/app/src/x.ts:10:5)\n    at run (/app/src/y.ts:1:1)'
  const e1 = fingerprint('Error', 'Screen 3f2a9c1e-1b2c-4d5e-8f90-123456789abc not found (attempt 2)', `Error: …\n${at}`)
  const e2 = fingerprint('Error', 'Screen 9aa0bb11-2222-4333-8444-555566667777 not found (attempt 7)', `Error: …\n${at}`)
  assert.equal(e1, e2, 'errors differing only by ids and numbers share a fingerprint')
  assert.notEqual(e1, fingerprint('Error', 'Project not found', `Error: …\n${at}`), 'a different message does not')
  assert.notEqual(e1, fingerprint('TypeError', 'Screen x not found (attempt 2)', `Error: …\n${at}`))

  const now = Math.floor(Date.now() / 1000)
  await db.insert(user).values({ id: 'tel-u', name: 'Tel', email: 'tele@x.uz', createdAt: new Date(), updatedAt: new Date() })
  const rows = [
    ...Array.from({ length: 55 }, (_, i) => ({ id: `tr-ok-${i}`, method: 'GET', path: `/p/${i}`, kind: 'page', status: 200, ms: 20, createdAt: now - i })),
    { id: 'tr-404', method: 'GET', path: '/missing', kind: 'page', status: 404, ms: 5, createdAt: now },
    { id: 'tr-500', method: 'POST', path: '/_serverFn/boom', kind: 'server-fn', status: 500, ms: 2500, userId: 'tel-u', createdAt: now },
    { id: 'tr-old', method: 'GET', path: '/old', kind: 'page', status: 200, ms: 1, createdAt: now - 8 * 86400 },
  ]
  await db.insert(httpRequests).values(rows)
  const all = await TelescopeService.requests({})
  assert.equal(all.total, 58)
  assert.equal(all.rows.length, 50, '50 a page')
  assert.equal((await TelescopeService.requests({ page: 1 })).rows.length, 8, 'the rest on page two')
  assert.deepEqual((await TelescopeService.requests({ status: '5xx' })).rows.map((r) => r.id), ['tr-500'])
  assert.deepEqual((await TelescopeService.requests({ status: '4xx' })).rows.map((r) => r.id), ['tr-404'])
  assert.deepEqual((await TelescopeService.requests({ slowMs: 1000 })).rows.map((r) => [r.id, r.email]), [['tr-500', 'tele@x.uz']], 'slow, with the user')
  assert.deepEqual((await TelescopeService.requests({ email: 'TELE@' })).rows.map((r) => r.id), ['tr-500'])
  assert.equal((await TelescopeService.requests({ path: '/p/' })).total, 55)
  assert.equal((await TelescopeService.requests({ path: '%' })).total, 0, '% is literal')
  assert.equal((await TelescopeService.requests({ method: 'POST', from: now - 60 })).total, 1)

  // A console.error inside a request is stored with that request's id (and still printed).
  installServerLogs()
  const stored = RequestContext.run({ requestId: 'tr-500' }, () => TelescopeService.log('error', ['boom:', new Error('Screen 42 not found')]))
  await stored
  console.error('[test] expected error line for tr-500', new Error('Screen 43 not found'))
  await RequestContext.run({ requestId: 'tr-500' }, async () => console.warn('a warning'))
  await new Promise((r) => setTimeout(r, 200))
  const logs = await db.select().from(serverLogs).where(eq(serverLogs.requestId, 'tr-500'))
  assert.ok(logs.some((l) => l.level === 'error' && l.message === 'boom: Error: Screen 42 not found' && l.stack?.includes('controllers.check') && l.fingerprint), 'stored with its request id, stack and fingerprint')
  assert.ok(logs.some((l) => l.level === 'warn' && l.message === 'a warning' && !l.fingerprint), 'the console wrapper stores within the context')
  assert.ok((await db.select().from(serverLogs).where(eq(serverLogs.message, '[test] expected error line for tr-500 Error: Screen 43 not found')))[0]?.requestId === null, 'outside a request: no request id')
  console.log('[auth] magic link: http://x/api/auth/magic-link/verify?token=SECRET123&callbackURL=/')
  await new Promise((r) => setTimeout(r, 200))
  assert.equal((await db.select().from(serverLogs).where(eq(serverLogs.level, 'log'))).filter((l) => l.message.includes('SECRET123')).length, 0, 'a token in a logged URL is masked')
  const detail = await TelescopeService.request('tr-500')
  assert.equal(detail?.request?.email, 'tele@x.uz')
  assert.ok(detail!.logs.length >= 2)
  assert.equal(await TelescopeService.request('nope'), null)
  const groups = await TelescopeService.errors()
  assert.ok(groups.some((g) => g.count >= 1 && g.requestId === 'tr-500'), 'errors grouped, with the last request')
  assert.ok((await TelescopeService.logs({ level: 'warn' })).rows.every((l) => l.level === 'warn'))
  const newest = (await TelescopeService.logs({})).rows[0]!.id
  assert.equal((await TelescopeService.logs({ afterId: newest })).rows.length, 0, 'live polling sees nothing newer')

  // Retention: older than 7 days goes.
  await db.insert(serverLogs).values({ level: 'info', message: 'ancient', createdAt: now - 8 * 86400 })
  await TelescopeService.cleanup()
  assert.equal((await db.select().from(httpRequests).where(eq(httpRequests.id, 'tr-old'))).length, 0, 'an old request is deleted')
  assert.equal((await db.select().from(serverLogs).where(eq(serverLogs.message, 'ancient'))).length, 0, 'an old log line is deleted')
  assert.equal((await TelescopeService.requests({})).total, 57, 'recent rows stay')
}

// ADM-11: the admin tables page, sort, filter and export in SQL; the query parser whitelists everything
{
  const { AdminController } = await import('./AdminController.ts')
  const { parseCallsQuery, parseUsersQuery } = await import('../../../admin/table-query.ts')
  const { db } = await import('../../../database/connection.ts')
  const { user, llmCalls } = await import('../../../database/schema.ts')
  // Everything here lives in March 2001, so the date filter keeps other tests' rows out.
  const t0 = Date.parse('2001-03-01T00:00:00Z') / 1000
  await db.insert(user).values([
    { id: 'tbl-a', name: 'Alpha', email: 'alpha_tbl@x.uz', createdAt: new Date('2001-03-02T10:00:00Z'), updatedAt: new Date() },
    { id: 'tbl-b', name: 'Bravo', email: 'bravo@x.uz', createdAt: new Date('2001-03-20T10:00:00Z'), updatedAt: new Date() },
  ])
  await db.insert(llmCalls).values(Array.from({ length: 30 }, (_, i) => ({
    id: `tc-${String(i).padStart(2, '0')}`, userId: i % 2 ? 'tbl-b' : 'tbl-a', provider: 'deepseek', model: i % 3 === 0 ? 'tbl-m1' : 'tbl-m2',
    promptTokens: 100 + i, completionTokens: 10, costUsd: i / 100, ms: 1000 + i, ok: i % 5 !== 0,
    error: i === 0 ? 'boom, "quoted"\nline2' : i === 5 ? 'stopped at 100% done' : i % 5 === 0 ? 'timeout' : null,
    createdAt: t0 + i * 43200,
  })))
  const march = { from: '2001-03-01', to: '2001-03-31' }
  const calls = (q: Record<string, unknown>) => AdminController.callsPage(parseCallsQuery({ ...march, ...q }))
  const first = await calls({ size: 10 })
  assert.equal(first.rows.length, 10, 'a page holds `size` rows')
  assert.equal(first.total, 30, 'and the total counts every match')
  assert.equal(first.rows[0]!.id, 'tc-29', 'newest first by default')
  assert.deepEqual((await calls({ size: 10, page: 2 })).rows.map((r) => r.id).slice(-1), ['tc-00'], 'the last page ends with the oldest')
  assert.deepEqual((await calls({ sort: 'cost', dir: 'desc', size: 3 })).rows.map((r) => r.costUsd), [0.29, 0.28, 0.27], 'sort by cost')
  assert.deepEqual((await calls({ sort: 'cost', dir: 'asc', size: 1 })).rows.map((r) => r.id), ['tc-00'], 'and ascending')
  const errors = await calls({ result: 'error' })
  assert.equal(errors.total, 6, 'result=error keeps the failed calls')
  assert.ok(errors.rows.every((r) => !r.ok))
  assert.equal((await calls({ errors: true })).total, 6, 'the old ?errors=true link still means result=error')
  assert.equal((await calls({ result: 'ok' })).total, 24)
  assert.equal((await calls({ model: 'tbl-m1' })).total, 10, 'model filter')
  assert.ok((await calls({})).models.includes('tbl-m2'), 'the distinct models come with the page')
  assert.equal((await AdminController.callsPage(parseCallsQuery({ from: '2001-03-01', to: '2001-03-01' }))).total, 2, 'a one-day range covers that whole day')
  assert.equal((await calls({ minCost: 0.25 })).total, 5, 'min cost')
  assert.equal((await calls({ q: 'alpha_tbl' })).total, 15, 'q matches the email')
  assert.equal((await calls({ user: 'BRAVO' })).total, 15, 'user email contains, any case')
  assert.deepEqual((await calls({ q: '%' })).rows.map((r) => r.id), ['tc-05'], '% in the search is a literal, not a wildcard')
  const evil = parseCallsQuery({ ...march, sort: 'cost; DROP TABLE llm_calls', dir: 'sideways', page: -1, size: 5000, result: 'maybe', minCost: 'NaN' })
  assert.deepEqual(evil, march, 'unknown sort, dir, page, size and filters fall back to the defaults')
  assert.equal((await AdminController.callsPage(evil)).rows[0]!.id, 'tc-29', 'and the default sort applies')
  const csv = await AdminController.callsCsv(parseCallsQuery({ ...march, result: 'error', model: 'tbl-m1' }))
  const [head] = csv.split('\r\n')
  assert.equal(head, 'id,time,user,project,provider,model,action_id,ok,prompt_tokens,cached_tokens,cache_write_tokens,completion_tokens,cost_usd,ms,error', 'CSV header')
  assert.ok(csv.includes('"boom, ""quoted""\nline2"'), 'a comma, a quote and a newline are quoted and doubled')
  assert.equal(csv.match(/^tc-/gm)?.length, 2, 'the CSV is the current filter, unpaged')
  assert.ok(csv.includes('tc-15,2001-03-08T12:00:00.000Z,bravo@x.uz,'), 'one row per call')

  const users = (q: Record<string, unknown>) => AdminController.usersPage(parseUsersQuery({ from: '2001-01-01', to: '2001-12-31', ...q }))
  const u = await users({ size: 1 })
  assert.deepEqual([u.rows.length, u.total, u.rows[0]!.id], [1, 2, 'tbl-b'], 'users page: newest joined first, total counts all')
  assert.deepEqual((await users({ sort: 'joined', dir: 'asc' })).rows.map((r) => r.id), ['tbl-a', 'tbl-b'])
  assert.deepEqual((await users({ sort: 'spend' })).rows.map((r) => [r.id, Math.round(r.spend * 100)]), [['tbl-b', 225], ['tbl-a', 210]], 'sort by spend')
  assert.deepEqual((await users({ q: 'ALPHA_' })).rows.map((r) => r.id), ['tbl-a'], 'search by email')
  assert.equal((await users({ q: 'bra' })).total, 1, 'and by name')
  assert.equal((await users({ to: '2001-03-10' })).total, 1, 'joined date range')
  assert.equal((await users({ role: 'admin' })).total, 0)
  await db.update(user).set({ banned: true }).where((await import('drizzle-orm')).eq(user.id, 'tbl-b'))
  assert.deepEqual((await users({ status: 'banned' })).rows.map((r) => r.id), ['tbl-b'], 'status filter')
  assert.deepEqual((await users({ status: 'active' })).rows.map((r) => r.id), ['tbl-a'])
  assert.deepEqual(parseUsersQuery({ sort: 'password', role: 'root' }), {}, 'users: unknown sort and filter values are dropped')
  assert.ok((await AdminController.usersCsv(parseUsersQuery({ from: '2001-01-01', to: '2001-12-31' }))).startsWith('id,email,name,role,banned,joined'), 'users CSV header')
}

// LLM-07: the model a call site runs on is an admin setting — checked, read at call time, and it
// moves the credit price with it.
{
  const { AdminController } = await import('./AdminController.ts')
  const { CreditService } = await import('../../Services/CreditService.ts')
  await import('../../Services/SecretService.ts') // registers the settings source, as guard.ts does
  await assert.rejects(() => AdminController.setSetting('adm', { key: 'llm.model.screen', value: 'gpt-imaginary' }), /Invalid value/)
  await assert.rejects(() => AdminController.setSetting('adm', { key: 'llm.fallback', value: 'claude-opus-9' }), /Invalid value/)
  await AdminController.setSetting('adm', { key: 'llm.fallback', value: '' })
  await AdminController.setSetting('adm', { key: 'llm.model.screen', value: 'claude-haiku-4-5' })
  assert.equal(await CreditService.priceOf('screen'), 10, 'a screen costs the Claude row once screens run on Claude')
  assert.equal(await CreditService.priceOf('plan'), 1, 'the plan model is untouched')
  assert.ok((await AdminController.models()).some((m) => m.id === 'claude-haiku-4-5' && m.provider === 'anthropic' && m.credits?.screen === 10))
  const llmFetch = globalThis.fetch
  const realKey = process.env.ANTHROPIC_API_KEY
  process.env.ANTHROPIC_API_KEY = 'test-anthropic'
  const hits: { url: string; headers: Record<string, string>; body: any }[] = []
  const html = page('Claude screen')
  globalThis.fetch = (async (url: unknown, init?: RequestInit) => {
    hits.push({ url: String(url), headers: init?.headers as Record<string, string>, body: JSON.parse(String(init?.body)) })
    const ev = (o: unknown) => `event: x\ndata: ${JSON.stringify(o)}\n\n`
    return new Response(ev({ type: 'message_start', message: { usage: { input_tokens: 10, output_tokens: 1 } } }) + ev({ type: 'content_block_delta', delta: { type: 'text_delta', text: html } }) + ev({ type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 50 } }), { status: 200 })
  }) as typeof fetch
  try {
    await Project.create({ id: 'p-llm07', name: 'L', designSystem: 'minimal', device: 'mobile' })
    const out = await post(GenerateController, { projectId: 'p-llm07', prompt: 'a settings screen' })
    assert.ok(!out.includes('GEN_ERROR'), out)
    assert.equal(hits[0]?.url, 'https://api.anthropic.com/v1/messages', 'the screen call went to Anthropic')
    assert.equal(hits[0]!.body.model, 'claude-haiku-4-5-20251001')
    assert.equal(hits[0]!.headers['x-api-key'], 'test-anthropic')
    assert.ok((await Screen.forProject('p-llm07')).some((sc) => sc.html.includes('Claude screen')), 'the screen was drawn from its stream')
  } finally {
    globalThis.fetch = llmFetch
    if (realKey === undefined) delete process.env.ANTHROPIC_API_KEY
    else process.env.ANTHROPIC_API_KEY = realKey
    await AdminController.setSetting('adm', { key: 'llm.model.screen', value: null })
    await AdminController.setSetting('adm', { key: 'llm.fallback', value: null })
  }
  // LLM-08: a screen on GPT-6 Luna goes to OpenAI's Chat Completions as a reasoning model (max_completion_tokens,
  // no temperature, reasoning_effort "none"); a screen on Opus 5.5 keeps its thinking at low effort (it 400s on
  // thinking disabled).
  const realOpenAI = process.env.OPENAI_API_KEY
  process.env.OPENAI_API_KEY = 'test-openai'
  process.env.ANTHROPIC_API_KEY = 'test-anthropic'
  const sent: { url: string; headers: Record<string, string>; body: any }[] = []
  globalThis.fetch = (async (url: unknown, init?: RequestInit) => {
    sent.push({ url: String(url), headers: init?.headers as Record<string, string>, body: JSON.parse(String(init?.body)) })
    if (String(url).includes('openai.com')) {
      const chunk = (o: unknown) => `data: ${JSON.stringify(o)}\n\n`
      return new Response(chunk({ choices: [{ delta: { content: page('GPT screen') } }] }) + chunk({ choices: [], usage: { prompt_tokens: 12, completion_tokens: 40, prompt_tokens_details: { cached_tokens: 8 } } }) + 'data: [DONE]\n\n', { status: 200 })
    }
    const ev = (o: unknown) => `event: x\ndata: ${JSON.stringify(o)}\n\n`
    return new Response(ev({ type: 'message_start', message: { usage: { input_tokens: 10, output_tokens: 1 } } }) + ev({ type: 'content_block_delta', delta: { type: 'text_delta', text: page('Opus screen') } }) + ev({ type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 50 } }), { status: 200 })
  }) as typeof fetch
  try {
    await Project.create({ id: 'p-llm08', name: 'L', designSystem: 'minimal', device: 'mobile' })
    await AdminController.setSetting('adm', { key: 'llm.model.screen', value: 'gpt-6-luna' })
    assert.ok(!(await post(GenerateController, { projectId: 'p-llm08', prompt: 'a settings screen' })).includes('GEN_ERROR'))
    const gpt = sent.find((h) => h.url === 'https://api.openai.com/v1/chat/completions')!
    assert.ok(gpt, 'the screen call went to OpenAI')
    assert.deepEqual([gpt.body.model, gpt.body.reasoning_effort, gpt.headers.Authorization], ['gpt-6-luna', 'none', 'Bearer test-openai'])
    assert.ok(gpt.body.max_completion_tokens > 0 && !('max_tokens' in gpt.body) && !('temperature' in gpt.body), 'sent as a reasoning model')
    assert.ok((await Screen.forProject('p-llm08')).some((sc) => sc.html.includes('GPT screen')), 'the screen was drawn from its stream')
    await AdminController.setSetting('adm', { key: 'llm.model.screen', value: 'claude-opus-5-5' })
    sent.length = 0
    assert.ok(!(await post(GenerateController, { projectId: 'p-llm08', prompt: 'another screen' })).includes('GEN_ERROR'))
    const opus = sent.find((h) => h.url === 'https://api.anthropic.com/v1/messages')!
    assert.ok(opus && opus.body.model === 'claude-opus-5-5' && !('thinking' in opus.body) && opus.body.output_config?.effort === 'low', JSON.stringify(opus?.body ?? {}).slice(0, 200))
  } finally {
    globalThis.fetch = llmFetch
    if (realOpenAI === undefined) delete process.env.OPENAI_API_KEY
    else process.env.OPENAI_API_KEY = realOpenAI
    if (realKey === undefined) delete process.env.ANTHROPIC_API_KEY
    else process.env.ANTHROPIC_API_KEY = realKey
    await AdminController.setSetting('adm', { key: 'llm.model.screen', value: null })
  }
  assert.equal(await CreditService.priceOf('screen'), 2, 'reset: DeepSeek again')
}

// ADM-12 / ADM-20: MRR, the dashboard's money (sold from orders, LLM spend, profit, tokens in dollars) and every
// alert at its threshold. The clock is pinned in 2100, so the windows see only the rows seeded here.
{
  const { DashboardService: OverviewService } = await import('../../Services/DashboardService.ts')
  const { DashboardService } = await import('../../Services/DashboardService.ts')
  const { AdminController } = await import('./AdminController.ts')
  const { db } = await import('../../../database/connection.ts')
  const { subscriptions, creditLedger, llmCalls, serverLogs, screens, orders } = await import('../../../database/schema.ts')
  const { like } = await import('drizzle-orm')
  const T = Date.UTC(2100, 0, 15, 12) / 1000
  const has = async (key: string, now = T) => (await OverviewService.alerts(now)).some((a) => a.key === key)

  // MRR: starter-month $12 + pro-year $204/12 = $29; the canceled and the lapsed plan count for nothing.
  const before = await OverviewService.subscriptions(T)
  await db.insert(subscriptions).values([
    { id: 'o-s1', userId: 'o-u1', productKey: 'starter-month', status: 'active', startedAt: T - 5 * 86400, currentPeriodEnd: T + 86400, updatedAt: T - 5 * 86400 },
    { id: 'o-s2', userId: 'o-u2', productKey: 'pro-year', status: 'trialing', startedAt: T - 5 * 86400, currentPeriodEnd: T + 300 * 86400, updatedAt: T - 5 * 86400 },
    { id: 'o-s3', userId: 'o-u3', productKey: 'pro-month', status: 'canceled', startedAt: T - 40 * 86400, currentPeriodEnd: T - 3 * 86400, updatedAt: T - 2 * 86400 },
    { id: 'o-s4', userId: 'o-u4', productKey: 'pro-month', status: 'active', startedAt: T - 40 * 86400, currentPeriodEnd: T - 1, updatedAt: T - 40 * 86400 },
  ])
  const after = await OverviewService.subscriptions(T)
  assert.equal((after.mrr - before.mrr).toFixed(2), '29.00', 'MRR is monthly-equivalent over live plans')
  assert.equal(after.starter - before.starter, 1)
  assert.equal(after.pro - before.pro, 1, 'the canceled and the lapsed plan are not active')

  // Ledger: a Starter grant ($12), a yearly Pro grant ($17 a month), a 500 pack ($6); 300 held, 50 refunded.
  await db.insert(creditLedger).values([
    { id: 'o-l1', userId: 'o-u1', delta: 1200, kind: 'subscription', ref: 'sub:o-s1:0:starter-month', note: 'Starter (monthly)', createdAt: T - 5 * 86400 },
    { id: 'o-l2', userId: 'o-u2', delta: 3000, kind: 'subscription', ref: 'sub:o-s2:0:pro-year', note: 'Pro (yearly)', createdAt: T - 5 * 86400 },
    { id: 'o-l3', userId: 'o-u1', delta: 500, kind: 'purchase', ref: 'order:o-1', note: '500 credits', createdAt: T - 86400 },
    { id: 'o-l4', userId: 'o-u1', delta: -300, kind: 'hold', createdAt: T - 3600 },
    { id: 'o-l5', userId: 'o-u1', delta: 50, kind: 'refund', createdAt: T - 3600 },
    { id: 'o-l6', userId: 'o-u9', delta: 60, kind: 'signup', ref: 'signup:o-u9', createdAt: T - 3600 },
  ])
  // Sold is the provider's orders in dollars (a fact), not the ledger's grants; LLM spend is what the calls cost.
  await db.insert(llmCalls).values({ id: 'o-c0', provider: 'deepseek', model: 'deepseek-flash', actionId: 'o-a1', promptTokens: 10000, cachedTokens: 8000, completionTokens: 2000, costUsd: 1, ms: 4000, ok: true, createdAt: T - 7200 })
  await db.insert(orders).values([
    { id: 'o-ord1', userId: 'o-u1', productKey: 'pack-500', amountCents: 600, currency: 'usd', createdAt: T - 86400 },
    { id: 'o-ord2', userId: 'o-u2', productKey: 'pro-month', amountCents: 2400, currency: 'USD', createdAt: T - 2 * 86400 },
  ])
  const w = await DashboardService.window(T - 7 * 86400, T + 1)
  assert.deepEqual([w.sold, w.orders, w.payingUsers], [30, 2, 2], 'sold is the orders, in dollars')
  assert.equal(w.fees.toFixed(2), (30 * 0.04 + 2 * 0.4).toFixed(2), 'fees: 4% + $0.40 an order')
  assert.equal(w.profit.toFixed(2), (30 - 2 - 1).toFixed(2), 'profit = sold − fees − LLM')
  assert.deepEqual(w.tokens, { input: 2000, cached: 8000, cacheWrite: 0, output: 2000 })
  const m = (await DashboardService.byModel(T - 7 * 86400, T + 1)).find((r) => r.model === 'deepseek-flash')!
  assert.equal((m.inputUsd + m.outputUsd).toFixed(6), '1.000000', 'the parts add up to what was spent')
  assert.equal(m.outputUsd.toFixed(4), (1200 / (324 + 1200)).toFixed(4), 'split at the list rates (in 2000×0.15 + 8000×0.003, out 2000×0.6)')

  // Budget: 80% of today's budget fires, just under does not.
  await AdminController.setSetting('adm', { key: 'limits.dailyBudgetUsd', value: '10' })
  assert.ok(!(await has('budget')), '$1 of $10 is fine')
  await db.insert(llmCalls).values({ id: 'o-c1', provider: 'deepseek', model: 'o-cheap', costUsd: 6.75, ms: 10, ok: true, createdAt: T - 60 })
  assert.ok(!(await has('budget')), '$7.75 of $10 is under 80%')
  await db.insert(llmCalls).values({ id: 'o-c2', provider: 'deepseek', model: 'o-cheap', costUsd: 0.25, ms: 10, ok: true, createdAt: T - 60 })
  assert.ok(await has('budget'), '$8.00 of $10 is 80%')
  await AdminController.setSetting('adm', { key: 'limits.dailyBudgetUsd', value: null })

  // A model failing: ≥5 calls in 15 min and half of them failed.
  const calls = (from: number, total: number, failed: number) =>
    db.insert(llmCalls).values(Array.from({ length: total }, (_, i) => ({ id: `o-m${from + i}`, provider: 'deepseek', model: 'o-flaky', ms: 10, ok: i >= failed, createdAt: T - 100 })))
  await calls(0, 4, 2)
  assert.ok(!(await has('model')), '2 of 4 is too few calls')
  await calls(10, 1, 0)
  assert.ok(!(await has('model')), '2 of 5 is under half')
  await calls(20, 1, 1)
  assert.ok(await has('model'), '3 of 6 failed')
  assert.ok(!(await has('model', T + 900)), 'older than 15 minutes')

  // Error spike: > 3× the hourly average of the 24h before, and at least 5.
  const errs = (tag: string, count: number, at: number) =>
    db.insert(serverLogs).values(Array.from({ length: count }, () => ({ level: 'error', message: `o-${tag}`, fingerprint: tag, createdAt: at })))
  await errs('base', 48, T - 5 * 3600) // an average of 2 an hour
  await errs('hour', 6, T - 60)
  assert.ok(!(await has('errors')), '6 is exactly 3× the average')
  await errs('hour', 1, T - 60)
  assert.ok(await has('errors'), '7 is more than 3×')

  // Failed screens: ≥ 20% of at least 10 attempts in 24h.
  await Project.create({ id: 'o-p', name: 'O', designSystem: 'minimal', device: 'mobile' })
  const shots = (from: number, count: number, failed: boolean) =>
    db.insert(screens).values(Array.from({ length: count }, (_, i) => ({ id: `o-sc${from + i}`, projectId: 'o-p', name: 'S', prompt: 'p', html: failed ? '' : '<html></html>', error: failed ? 'boom' : null, createdAt: T - 600 })))
  await shots(0, 7, false)
  await shots(10, 2, true)
  assert.ok(!(await has('screens')), '2 of 9 is too few attempts')
  await shots(20, 1, false)
  assert.ok(await has('screens'), '2 of 10 is 20%')
  await shots(30, 1, false)
  assert.ok(!(await has('screens')), '2 of 11 is under 20%')

  // Paused.
  assert.ok(!(await has('paused')))
  await AdminController.setSetting('adm', { key: 'generation.paused', value: '1' })
  assert.ok(await has('paused'))
  await AdminController.setSetting('adm', { key: 'generation.paused', value: null })

  const dsh = await DashboardService.dashboard(7, T)
  assert.equal(dsh.series.length, 30)
  assert.equal(Number(dsh.series.at(-2)!.sold), 6, 'the $6 order is on its day')
  await db.delete(orders).where(like(orders.id, 'o-%'))
  // The rows are in 2100: left behind, they would count toward every later "today".
  await db.delete(serverLogs).where(like(serverLogs.message, 'o-%'))
  await db.delete(llmCalls).where(like(llmCalls.id, 'o-%'))
  await db.delete(creditLedger).where(like(creditLedger.id, 'o-%'))
  await db.delete(subscriptions).where(like(subscriptions.id, 'o-%'))
  await Project.delete('o-p')
}

// ADM-14: model health from llm_calls (error rate, percentiles, status), and the circuit breaker —
// a Down primary sends its site to the fallback for 5 minutes, then the primary is tried again.
// Rows are placed ten days back and read with that clock, so the rest of the file's calls stay out.
{
  const { db } = await import('../../../database/connection.ts')
  const { llmCalls } = await import('../../../database/schema.ts')
  const { like } = await import('drizzle-orm')
  const { ProviderStatsService, statusOf } = await import('../../Services/ProviderStatsService.ts')
  const { effectiveModel, CIRCUIT_MS } = await import('../../Services/LlmService.ts')
  const { AdminController } = await import('./AdminController.ts')
  const T = Math.floor(Date.now() / 1000) - 10 * 86400
  let n = 0
  const row = (model: string, ago: number, ok: boolean, ms: number, extra: { promptTokens?: number; cachedTokens?: number } = {}) =>
    ({ id: `adm14-${n++}`, provider: 'test', model, ok, ms, createdAt: T - ago, costUsd: 0.01, error: ok ? null : `boom ${n}`, requestId: ok ? null : 'req-adm14', ...extra })
  await db.insert(llmCalls).values([
    // Down: 6 calls in the last 15 minutes, 4 failed.
    ...[true, false, false, true, false, false].map((ok, i) => row('gemini-2.5-flash', 60 + i * 60, ok, 500)),
    // Healthy: 10 calls this hour at 100…1000 ms, all fine, a quarter of the prompt cached.
    ...Array.from({ length: 10 }, (_, i) => row('gemini-3.1-flash-lite', 120 + i * 60, true, (i + 1) * 100, { promptTokens: 1000, cachedTokens: 250 })),
    // Degraded by errors: 2 of 10 failed this hour, spread out (not Down).
    ...Array.from({ length: 10 }, (_, i) => row('claude-haiku-4-5', 1000 + i * 200, i >= 8 ? false : true, 300)),
    // Degraded by latency: this hour's p95 is 1 000 ms against a day's p95 of 100.
    ...Array.from({ length: 20 }, (_, i) => row('claude-sonnet-5', 2 * 3600 + i * 3000, true, 100)),
    row('claude-sonnet-5', 600, true, 1000),
    // Idle: nothing in the last hour.
    row('deepseek-flash', 3 * 3600, true, 200),
  ])
  const health = await ProviderStatsService.health(T * 1000)
  const of = (m: string) => health.find((h) => h.model === m)!
  const down = of('gemini-2.5-flash')
  assert.equal(down.status, 'down')
  assert.equal(down.hour.errorRate, 4 / 6)
  assert.equal(down.calls15m, 6)
  assert.equal(down.lastError?.requestId, 'req-adm14')
  assert.equal(down.lastError?.at, T - 120, 'the newest failure')
  const ok = of('gemini-3.1-flash-lite')
  assert.equal(ok.status, 'healthy')
  assert.equal(ok.hour.calls, 10)
  assert.equal(ok.hour.errorRate, 0)
  assert.equal(ok.hour.p50, 550)
  assert.equal(Math.round(ok.hour.p95!), 955)
  assert.equal(ok.hour.cacheHit, 0.25)
  assert.equal(ok.hourly.reduce((s, h) => s + h.calls, 0), 10)
  assert.equal(ok.hourly[23]!.calls, 10, 'the current hour is the last bucket')
  assert.equal(of('claude-haiku-4-5').status, 'degraded')
  assert.equal(of('claude-haiku-4-5').hour.errorRate, 0.2)
  const slow = of('claude-sonnet-5')
  assert.equal(slow.day.p95, 100)
  assert.equal(slow.status, 'degraded', 'p95 over twice the day’s')
  assert.equal(of('deepseek-flash').status, 'idle')
  assert.equal(statusOf({ hour: { ...ok.hour, calls: 0 }, day: ok.day, calls15m: 0, fails15m: 0 }), 'idle')

  // The circuit: plan runs on the Down model, the fallback is healthy.
  const now = T * 1000
  await AdminController.setSetting('adm', { key: 'llm.model.plan', value: 'gemini-2.5-flash' })
  await AdminController.setSetting('adm', { key: 'llm.fallback', value: 'gemini-3.1-flash-lite' })
  try {
    const open = await effectiveModel('plan', now)
    assert.equal(open.model, 'gemini-3.1-flash-lite', 'a Down primary goes straight to the fallback')
    assert.equal(open.circuit?.until, now + CIRCUIT_MS)
    assert.equal((await effectiveModel('plan', now + 60_000)).model, 'gemini-3.1-flash-lite', 'still open a minute later')
    assert.equal((await effectiveModel('screen', now)).model, 'deepseek-flash', 'another site is untouched')
    assert.equal((await effectiveModel('plan', now + CIRCUIT_MS + 1000)).model, 'gemini-2.5-flash', 'after 5 minutes the primary is tried again')
    await AdminController.setSetting('adm', { key: 'llm.fallback', value: null })
    assert.equal((await effectiveModel('plan', now + 30_000)).model, 'gemini-2.5-flash', 'with no fallback it stays on the primary')
  } finally {
    await AdminController.setSetting('adm', { key: 'llm.model.plan', value: null })
    await AdminController.setSetting('adm', { key: 'llm.fallback', value: null })
    await db.delete(llmCalls).where(like(llmCalls.id, 'adm14-%'))
  }
}

// ADM-15: every paid order is stored once; revenue, fees and margin are read from orders and llm_calls;
// the ledger and subscriptions tables filter, page and total on the server with whitelisted values.
{
  const { BillingController } = await import('./BillingController.ts')
  const { BusinessService, feeCents } = await import('../../Services/BusinessService.ts')
  const { Credit } = await import('../../Models/Credit.ts')
  const { parseLedgerQuery, parseSubsQuery } = await import('../../../admin/table-query.ts')
  const { productOf } = await import('../../../lib/credit-prices.ts')
  const { db } = await import('../../../database/connection.ts')
  const { user, llmCalls, orders } = await import('../../../database/schema.ts')
  const { eq } = await import('drizzle-orm')
  await db.insert(user).values([
    { id: 'biz-a', name: 'Buyer', email: 'biz-a@x.uz', createdAt: new Date(), updatedAt: new Date() },
    { id: 'biz-b', name: 'Burner', email: 'biz-b@x.uz', createdAt: new Date(), updatedAt: new Date() },
  ])
  const before = await BusinessService.revenue()

  const pack = { type: 'order.paid', data: { id: 'ord_biz1', product: { metadata: { od: 'pack-500' } }, customer: { external_id: 'biz-a' }, total_amount: 1234, currency: 'USD', billing_reason: 'purchase' } }
  assert.equal(await BillingController.webhook(pack), 'pack granted')
  assert.equal(await BillingController.webhook(pack), 'duplicate')
  const stored = await db.select().from(orders).where(eq(orders.id, 'ord_biz1'))
  assert.equal(stored.length, 1, 'a second delivery stores no second order')
  assert.deepEqual([stored[0]!.userId, stored[0]!.productKey, stored[0]!.amountCents, stored[0]!.currency, stored[0]!.billingReason], ['biz-a', 'pack-500', 1234, 'usd', 'purchase'], 'the amount is what the order charged')
  // A plan's order with no amount in the payload falls back to the product's price.
  assert.equal(await BillingController.webhook({ type: 'order.paid', data: { id: 'ord_biz2', product: { metadata: { od: 'starter-month' } }, customer: { external_id: 'biz-b' }, subscription_id: 'sub_biz', billing_reason: 'subscription_create' } }), 'plan order')
  const plan = (await db.select().from(orders).where(eq(orders.id, 'ord_biz2')))[0]!
  assert.deepEqual([plan.amountCents, plan.subscriptionId], [productOf('starter-month')!.cents, 'sub_biz'], 'a plan order is stored too')

  // Long ago, so the daily budget later tests check is not spent; margin counts all time.
  const longAgo = Date.parse('2001-06-01T00:00:00Z') / 1000
  await db.insert(llmCalls).values([
    { id: 'biz-c1', userId: 'biz-a', provider: 'deepseek', model: 'm', actionId: 'act-biz', costUsd: 2.5, ok: true, createdAt: longAgo },
    { id: 'biz-c2', userId: 'biz-b', provider: 'deepseek', model: 'm', costUsd: 500, ok: true, createdAt: longAgo },
  ])
  const r = await BusinessService.revenue()
  assert.equal(r.totals.orders - before.totals.orders, 2)
  assert.equal(Math.round((r.totals.gross - before.totals.gross) * 100), 1234 + productOf('starter-month')!.cents, 'gross is the sum of the stored amounts')
  assert.equal(r.totals.fees, feeCents(Math.round(r.totals.gross * 100), r.totals.orders) / 100, 'fees: 4% + $0.40 an order')
  assert.equal(Math.round(r.totals.net * 100), Math.round((r.totals.gross - r.totals.fees) * 100))
  assert.equal(feeCents(1000, 1), 80)
  assert.equal(r.byDay.length, 30, 'every one of 30 days')
  assert.ok(r.byDay.at(-1)!.revenue >= 12.34 + productOf('starter-month')!.cents / 100, "today's orders land on the last day")
  assert.ok(r.byProduct.some((p) => p.productKey === 'starter-month' && p.orders >= 1))
  const a = r.top.find((m) => m.userId === 'biz-a')!
  assert.deepEqual([a.email, a.revenue, a.spend, Math.round(a.margin * 100)], ['biz-a@x.uz', 12.34, 2.5, 984], 'margin = revenue − LLM spend')
  assert.equal(r.worst[0]!.userId, 'biz-b', 'the worst margin comes first')
  assert.deepEqual(await BusinessService.userRevenue('biz-a'), { orders: 1, revenue: 12.34 })

  // The ledger: biz-a has the +500 pack; add a hold, its partial refund, an admin grant and an expiry.
  await Credit.add({ userId: 'biz-a', delta: -30, kind: 'hold', actionId: 'act-biz' })
  await Credit.add({ userId: 'biz-a', delta: 10, kind: 'refund', actionId: 'act-biz' })
  await Credit.add({ userId: 'biz-a', delta: 7, kind: 'admin', note: 'sorry' })
  await Credit.add({ userId: 'biz-a', delta: -5, kind: 'expire' })
  const ledger = (q: Record<string, unknown>) => BusinessService.ledgerPage(parseLedgerQuery({ user: 'BIZ-A@', ...q }))
  const all = await ledger({})
  assert.equal(all.total, 5)
  assert.deepEqual(all.totals, { granted: 507, spent: 20, expired: 5 }, 'totals: granted, holds net of refunds, expired')
  assert.equal(all.rows[0]!.kind, 'expire', 'newest first')
  const p2 = await ledger({ size: 2, page: 2 })
  assert.deepEqual([p2.rows.length, p2.total, p2.rows[0]!.kind], [1, 5, 'purchase'], 'the last page holds the oldest row')
  assert.deepEqual((await ledger({ sort: 'delta', dir: 'asc', size: 1 })).rows.map((x) => x.delta), [-30], 'sort by delta')
  assert.deepEqual((await ledger({ kind: 'hold' })).rows.map((x) => x.actionId), ['act-biz'], 'kind filter')
  assert.deepEqual((await ledger({ sign: 'minus' })).totals, { granted: 0, spent: 30, expired: 5 }, 'sign filter, totals follow it')
  assert.equal((await ledger({ from: new Date().toISOString().slice(0, 10) })).total, 5)
  assert.equal((await ledger({ to: '2001-01-01' })).total, 0, 'date range')
  assert.equal((await ledger({ q: 'sorry' })).total, 1, 'search matches the note')
  assert.equal((await ledger({ q: '%' })).total, 0, '% is a literal')
  assert.deepEqual((await BusinessService.actionCalls('act-biz')).map((c) => c.id), ['biz-c1'], "a hold's model calls, by action id")
  const csv = await BusinessService.ledgerCsv(parseLedgerQuery({ user: 'biz-a@' }))
  assert.ok(csv.startsWith('id,time,user,kind,delta,action_id,ref,note\r\n') && csv.trim().split('\r\n').length === 6, 'CSV is the filter, unpaged')

  // Subscriptions.
  await BillingController.webhook({ type: 'subscription.updated', data: { id: 'sub_biz', status: 'past_due', started_at: new Date().toISOString(), customer: { external_id: 'biz-b' }, product: { metadata: { od: 'starter-month' } } } })
  const subs = (q: Record<string, unknown>) => BusinessService.subscriptionsPage(parseSubsQuery(q))
  assert.deepEqual((await subs({ status: 'past_due', plan: 'starter' })).rows.map((s) => [s.id, s.email]), [['sub_biz', 'biz-b@x.uz']], 'status and plan filters')
  assert.equal((await subs({ status: 'past_due', plan: 'pro' })).total, 0)
  assert.equal((await subs({ q: 'biz-b' })).total, 1, 'search by email')

  // Hand-edited URLs fall back to the defaults.
  assert.deepEqual(parseLedgerQuery({ sort: 'delta; DROP TABLE credit_ledger', dir: 'up', kind: 'free-money', sign: '±', page: -1, size: 1e9, from: 'yesterday' }), {}, 'ledger: unknown values are dropped')
  assert.deepEqual(parseSubsQuery({ sort: 'id; --', status: 'hacked', plan: 'enterprise' }), {}, 'subscriptions: unknown values are dropped')
  assert.equal((await BusinessService.ledgerPage(parseLedgerQuery({ user: 'biz-a@', sort: 'evil' }))).rows[0]!.kind, 'expire', 'and the default sort applies')
}

// OBS-12: outgoing calls are recorded (masked, no bodies), webhooks are stored (payload only when
// verified), and a stored verified event can be replayed without granting twice.
{
  const { TelescopeService, wrapFetch, purposeOf } = await import('../../Services/TelescopeService.ts')
  const { RequestContext } = await import('../../Services/RequestContext.ts')
  const { BillingController } = await import('./BillingController.ts')
  const { AdminController } = await import('./AdminController.ts')
  const { Credit } = await import('../../Models/Credit.ts')
  const { sign } = await import('../../../lib/standard-webhooks.ts')
  const { db } = await import('../../../database/connection.ts')
  const { outgoingRequests, webhookEvents, adminActions } = await import('../../../database/schema.ts')
  const { eq, desc } = await import('drizzle-orm')
  const settle = () => new Promise((r) => setTimeout(r, 150))
  const rowsFor = (rid: string) => db.select().from(outgoingRequests).where(eq(outgoingRequests.requestId, rid)).orderBy(outgoingRequests.id)

  assert.deepEqual(['api.deepseek.com', 'generativelanguage.googleapis.com', 'api.anthropic.com', 'api.openai.com', 'api.pexels.com', 'sandbox-api.polar.sh', 'oauth2.googleapis.com', 'example.org'].map(purposeOf), ['deepseek', 'gemini', 'anthropic', 'openai', 'pexels', 'polar', 'google', 'other'])

  // A stub underneath: no network. The body is streamed in two chunks and must arrive unchanged.
  const seen: string[] = []
  const stub = (async (input: RequestInfo | URL) => {
    const u = String(input instanceof Request ? input.url : input)
    seen.push(u)
    if (u.includes('down.example')) throw new TypeError('fetch failed', { cause: new Error('connect ECONNREFUSED') })
    const body = new ReadableStream<Uint8Array>({ start(c) { c.enqueue(new TextEncoder().encode('data: one\n\n')); c.enqueue(new TextEncoder().encode('data: two\n\n')); c.close() } })
    return new Response(body, { status: u.includes('missing') ? 404 : 200, headers: u.includes('sized') ? { 'content-length': '22' } : {} })
  }) as typeof fetch
  const f = wrapFetch(stub)
  await RequestContext.run({ requestId: 'out-req' }, async () => {
    const r = await f('https://generativelanguage.googleapis.com/v1beta/models/x:generate?key=AIzaSECRET&alt=sse', { method: 'post', body: 'PROMPT-BODY', headers: { Authorization: 'Bearer SK-SECRET' } })
    assert.equal(await r.text(), 'data: one\n\ndata: two\n\n', 'a streamed body passes through unchanged')
    await f(new URL('https://api.pexels.com/v1/search?query=cats&sized=1'))
    await f('https://api.deepseek.com/missing')
    await assert.rejects(f('https://down.example/x'), /fetch failed/, 'a network error is thrown on, as it was')
    await f('http://localhost:3000/_serverFn/x')
    await f('http://127.0.0.1:5173/y')
  })
  assert.equal(seen.length, 6, 'every call reached the real fetch')
  await settle()
  const out = await rowsFor('out-req')
  assert.equal(out.length, 4, 'localhost calls are not recorded')
  // Inserts are fire-and-forget on a pool, so their order is not the calls' order.
  const [gem, pex, ds, down] = ['generativelanguage.googleapis.com', 'api.pexels.com', 'api.deepseek.com', 'down.example'].map((h) => out.find((o) => o.host === h))
  assert.deepEqual([gem!.host, gem!.method, gem!.path, gem!.query, gem!.status, gem!.purpose], ['generativelanguage.googleapis.com', 'POST', '/v1beta/models/x:generate', 'key=***&alt=sse', 200, 'gemini'], "Gemini's key is masked")
  assert.ok(gem!.ms >= 0 && Number.isInteger(gem!.ms))
  assert.ok(!JSON.stringify(out).includes('SECRET') && !JSON.stringify(out).includes('PROMPT-BODY'), 'no key, header or body is stored')
  assert.deepEqual([pex!.purpose, pex!.size, pex!.method], ['pexels', 22, 'GET'], 'size from content-length')
  assert.deepEqual([ds!.status, ds!.purpose], [404, 'deepseek'])
  assert.deepEqual([down!.status, down!.purpose], [null, 'other'])
  assert.match(down!.error ?? '', /fetch failed \(connect ECONNREFUSED\)/, 'a network error is recorded with its cause')

  // Filters and paging.
  const now = Math.floor(Date.now() / 1000)
  await db.insert(outgoingRequests).values(Array.from({ length: 55 }, (_, i) => ({ requestId: 'out-bulk', method: 'GET', host: 'api.pexels.com', path: `/p/${i}`, purpose: 'pexels', status: 200, ms: i * 100, createdAt: now - i })))
  await db.insert(outgoingRequests).values({ requestId: 'out-old', method: 'GET', host: 'old.example', path: '/', purpose: 'other', status: 200, ms: 1, createdAt: now - 8 * 86400 })
  const pexAll = await TelescopeService.outgoing({ purpose: 'pexels' })
  assert.deepEqual([pexAll.total, pexAll.rows.length, (await TelescopeService.outgoing({ purpose: 'pexels', page: 1 })).rows.length], [56, 50, 6], '50 a page')
  assert.deepEqual((await TelescopeService.outgoing({ status: 'error' })).rows.map((r) => r.host), ['down.example'], 'network errors')
  assert.equal((await TelescopeService.outgoing({ status: '4xx' })).total, 1)
  assert.equal((await TelescopeService.outgoing({ host: 'GOOGLEAPIS' })).total, 1, 'host contains, any case')
  assert.equal((await TelescopeService.outgoing({ purpose: 'pexels', slowMs: 5000 })).total, 5)
  assert.equal((await TelescopeService.outgoing({ from: now - 10, to: now + 10, purpose: 'pexels' })).total, 56 - 44, 'date range')
  assert.equal((await TelescopeService.request('out-req'))?.outgoing.length, 4, "a request's page lists its outgoing calls")
  await TelescopeService.cleanup()
  assert.equal((await rowsFor('out-old')).length, 0, 'retention: an old outgoing call is deleted')

  // Webhooks: unsigned → stored, not verified, no payload; signed → stored with payload and result.
  const secret = `whsec_${Buffer.from('obs12-test-secret').toString('base64')}`
  const realSecret = process.env.POLAR_WEBHOOK_SECRET
  process.env.POLAR_WEBHOOK_SECRET = secret
  try {
    const hook = (body: string, signed: boolean, id = `msg_${Math.random().toString(36).slice(2)}`) => {
      const ts = String(Math.floor(Date.now() / 1000))
      const headers: Record<string, string> = { 'webhook-id': id, 'webhook-timestamp': ts, 'webhook-signature': signed ? `v1,${sign(secret, id, ts, body)}` : 'v1,forged' }
      return RequestContext.run({ requestId: 'wh-req' }, () => BillingController.receivePolar(new Request('http://x/api/polar-webhook', { method: 'POST', headers, body })))
    }
    const packPaid = (orderId: string) => JSON.stringify({ type: 'order.paid', data: { id: orderId, product: { metadata: { od: 'pack-500' } }, customer: { external_id: 'wh-payer' } } })
    const forged = await hook(packPaid('ord_forged'), false, 'msg_forged')
    assert.equal(forged.status, 403)
    const signed = await hook(packPaid('ord_wh1'), true, 'msg_signed')
    assert.deepEqual([signed.status, await signed.text()], [202, 'pack granted'])
    const junk = await hook('not json', true, 'msg_junk')
    assert.equal(junk.status, 400)
    await settle()
    const byId = async (id: string) => (await db.select().from(webhookEvents).where(eq(webhookEvents.eventId, id)))[0]!
    const f1 = await byId('msg_forged')
    assert.deepEqual([f1.verified, f1.payload, f1.result, f1.httpStatus, f1.eventType, f1.provider, f1.requestId], [false, null, 'invalid signature', 403, null, 'polar', 'wh-req'], 'unsigned: stored, no payload')
    const s1 = await byId('msg_signed')
    assert.deepEqual([s1.verified, s1.result, s1.httpStatus, s1.eventType], [true, 'pack granted', 202, 'order.paid'])
    assert.equal(JSON.parse(s1.payload!).data.id, 'ord_wh1', 'signed: the payload is stored')
    assert.deepEqual([(await byId('msg_junk')).result, (await byId('msg_junk')).payload], ['invalid body', null])
    assert.equal(await Credit.balance('wh-payer'), 500)

    // Replay: a stored verified event that was never applied grants once, then is a duplicate.
    const [stored] = await db.insert(webhookEvents).values({ provider: 'polar', eventType: 'order.paid', eventId: 'msg_replay', verified: true, result: 'error: db down', httpStatus: 500, payload: packPaid('ord_replay') }).returning()
    assert.deepEqual(await AdminController.replayWebhook('adm-wh', stored!.id), { result: 'pack granted' })
    assert.deepEqual(await AdminController.replayWebhook('adm-wh', stored!.id), { result: 'duplicate' }, 'the second replay grants nothing')
    assert.deepEqual(await AdminController.replayWebhook('adm-wh', s1.id), { result: 'duplicate' }, 'replaying an applied event grants nothing')
    assert.equal(await Credit.balance('wh-payer'), 1000, 'one pack per order, however often replayed')
    await assert.rejects(AdminController.replayWebhook('adm-wh', f1.id), /verified/, 'an unverified event cannot be replayed')
    const logged = await db.select().from(adminActions).where(eq(adminActions.adminId, 'adm-wh')).orderBy(desc(adminActions.createdAt))
    assert.equal(logged.filter((a) => a.action === 'replay-webhook').length, 3, 'each replay is in the admin log')

    // List filters and paging.
    await db.insert(webhookEvents).values(Array.from({ length: 52 }, (_, i) => ({ provider: 'polar', eventType: 'subscription.updated', eventId: `bulk-${i}`, verified: true, result: 'subscription saved', httpStatus: 202, payload: '{}' })))
    const list = await TelescopeService.webhooks({})
    assert.deepEqual([list.total, list.rows.length, (await TelescopeService.webhooks({ page: 1 })).rows.length], [56, 50, 6])
    assert.ok(!('payload' in list.rows[0]!) && list.rows[0]!.hasPayload === true, 'the list leaves payloads out')
    assert.deepEqual((await TelescopeService.webhooks({ verified: false })).rows.map((r) => r.eventId), ['msg_forged'])
    assert.equal((await TelescopeService.webhooks({ type: 'ORDER.' })).total, 2)
    assert.equal((await TelescopeService.webhooks({ result: 'invalid' })).total, 2)
    assert.equal((await TelescopeService.webhooks({ type: 'subscription', verified: true, result: 'saved' })).total, 52)
  } finally {
    if (realSecret === undefined) delete process.env.POLAR_WEBHOOK_SECRET
    else process.env.POLAR_WEBHOOK_SECRET = realSecret
  }
}

// DSH-04/08/11/12: dashboard cards count what is shown, point at the first screen, sort by last change
{
  const { UsageService } = await import('../../Services/UsageService.ts')
  await Project.create({ id: 'card-a', name: 'A', designSystem: 'minimal', device: 'mobile', userId: 'u2' })
  await Screen.create({ id: 'ca-1', projectId: 'card-a', name: 'First', prompt: 'p', html: '<html>1</html>', x: 0, y: 0 })
  await Screen.create({ id: 'ca-2', projectId: 'card-a', name: 'Failed', prompt: 'p', html: '', x: 0, y: 0 })
  await Screen.create({ id: 'ca-3', projectId: 'card-a', name: 'Gone', prompt: 'p', html: '<html>3</html>', x: 0, y: 0 })
  await Screen.delete('ca-3')
  await Message.add({ projectId: 'orphan-1', role: 'user', kind: 'plan', text: 'later change' })
  const cards = await Project.cardsForUser('u2')
  const a = cards.find((c) => c.id === 'card-a')!
  assert.equal(a.screenCount, 1, 'failed and deleted screens are not counted')
  assert.deepEqual(a.covers, ['ca-1'], 'the covers are the screens that show something')
  await Project.create({ id: 'card-b', name: 'B', designSystem: 'minimal', device: 'mobile', userId: 'u2' })
  for (const n of [1, 2, 3, 4]) await Screen.create({ id: `cb-${n}`, projectId: 'card-b', name: `S${n}`, prompt: 'p', html: `<html>${n}</html>`, x: 0, y: 0 })
  assert.deepEqual((await Project.cardsForUser('u2')).find((c) => c.id === 'card-b')!.covers, ['cb-1', 'cb-2', 'cb-3'], 'UI-12: a collage shows the first three screens, no more')
  assert.ok((await Promise.all(cards.map((c) => Project.find(c.id)))).every((p) => p!.userId === 'u2'), 'only this user’s projects')
  assert.ok((await Project.cardsForUser('nobody')).length === 0)
  await Project.setFavorite('card-a', true)
  assert.equal((await Project.cardsForUser('u2')).find((c) => c.id === 'card-a')!.favorite, true, 'a star is saved')
  assert.equal(typeof await UsageService.callsToday('u2'), 'number')
}
// CODE-01: the export is a React + Vite project that builds: the screens with the imports they forgot and the
// kit's ListItem, the kit, the navigator, the theme. Built here with Vite against the repo's node_modules.
{
  const { exportReact, withKitListItem } = await import('../../Services/ExportService.ts')
  const { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, readdirSync, readFileSync, rmSync } = await import('node:fs')
  const { tmpdir } = await import('node:os')
  const { join, dirname } = await import('node:path')
  assert.equal(withKitListItem("import { Page, ListItem, List } from 'konsta/react'\nx"), "import { Page, List } from 'konsta/react'\nimport { ListItem } from '@od/kit'\nx", 'a screen gets the ListItem the studio shows')
  const home = "import { Page, Navbar, List } from 'konsta/react'\nimport { useNav, AppTabbar } from '@od/kit'\nexport default function Screen() { const nav = useNav(); return <Page className=\"pb-32\"><Navbar large title=\"Home\" /><BlockTitle>Today</BlockTitle><List strong inset><ListItem link title=\"Open\" linkProps={{ onClick: () => nav.push('detail') }} after={<ChevronRight />} /></List><Ring value={0.5} /><AppTabbar active=\"home\" /></Page> }"
  const detail = "import { Page, Navbar, NavbarBackLink } from 'konsta/react'\nimport { useNav } from '@od/kit'\nexport default function Screen() { const nav = useNav(); return <Page><Navbar title=\"Detail\" left={<NavbarBackLink onClick={nav.pop} />} /></Page> }"
  const files = await exportReact(
    { name: 'Café Test', theme: JSON.stringify({ accent: '#ff375f', dark: true, platform: 'material' }), navigation: JSON.stringify({ tabs: [{ id: 'home', label: 'Home', icon: 'House' }] }), plan: JSON.stringify({ appName: 'x', summary: '', accent: '#ff375f', palette: {}, tabs: [], data: '', screens: [{ id: 'home', name: 'Home', kind: 'tab', tab: 'home', spec: '' }, { id: 'detail', name: 'Detail', kind: 'push', parent: 'home', spec: '' }] }) },
    [{ id: 's1', slug: 'home', name: 'Home', html: home, x: 0, y: 0, screenType: 'root-tab', activeTabId: 'home' }, { id: 's2', slug: 'detail', name: 'Detail', html: detail, x: 500, y: 0, screenType: 'detail-view', activeTabId: null }],
  )
  const names = files.map((f) => f.name)
  assert.ok(names.includes('cafe-test/package.json') && names.includes('cafe-test/src/screens/home.jsx') && names.includes('cafe-test/src/kit/nav.jsx'), 'one folder named after the app')
  const homeOut = files.find((f) => f.name.endsWith('screens/home.jsx'))!.data
  assert.ok(/import \{ BlockTitle \} from 'konsta\/react'/.test(homeOut) && /import \{ ChevronRight \} from 'lucide-react'/.test(homeOut) && /import \{ ListItem \} from '@od\/kit'/.test(homeOut), 'forgotten imports are written into the exported code')
  const app = JSON.parse(files.find((f) => f.name.endsWith('src/app.json'))!.data)
  assert.deepEqual(app.theme, { accent: '#ff375f', dark: true, platform: 'material', style: 'clean' })
  assert.ok(names.includes('cafe-test/src/kit/styles.js'), 'the export carries the style module (THM-01)')
  const dir = mkdtempSync(join(tmpdir(), 'od-export-'))
  for (const f of files) { mkdirSync(dirname(join(dir, f.name)), { recursive: true }); writeFileSync(join(dir, f.name), f.data) }
  const root = join(dir, 'cafe-test')
  symlinkSync(join(process.cwd(), 'node_modules'), join(root, 'node_modules'))
  const { build } = await import('vite')
  await build({ root, configFile: join(root, 'vite.config.js'), logLevel: 'silent' })
  const css = readdirSync(join(root, 'dist/assets')).find((a) => a.endsWith('.css'))!
  assert.ok(/--k-color-primary:#ff375f/.test(readFileSync(join(root, 'dist/assets', css), 'utf8')), 'the exported project builds, with the app accent as Konsta\'s brand colour')
  rmSync(dir, { recursive: true, force: true })
  // CODE-02: the same project as one self-contained HTML file.
  const { exportHtml } = await import('../../Services/ExportService.ts')
  const html = await exportHtml({ name: 'Café Test', theme: null, navigation: null, plan: null }, [{ id: 's1', slug: 'home', name: 'Home', html: home, x: 0, y: 0, screenType: 'root-tab', activeTabId: 'home' }])
  assert.ok(!/<script[^>]+src=/.test(html) && !/<link[^>]+stylesheet/.test(html) && /<style>/.test(html) && /<script type="module">/.test(html), 'the HTML prototype carries its script and styles inline')
}

// The app's look is validated wherever it comes from (a stored theme, a frame URL): only a hex accent,
// a boolean dark and one of two platforms reach the page.
{
  const { parseAppTheme, themeFromQuery, themeQuery } = await import('../../../lib/app-theme.ts')
  assert.deepEqual(parseAppTheme('{"accent":"#FF375F","dark":true,"platform":"material","style":"midnight"}'), { accent: '#ff375f', dark: true, platform: 'material', style: 'midnight' })
  assert.deepEqual(parseAppTheme({ accent: 'red;}</style>', dark: 'yes', platform: 'windows', style: 'x;}' }), { accent: '#5e5ce6', dark: false, platform: 'ios', style: 'clean' }, 'anything else falls back')
  const stored = parseAppTheme({ accent: '#ff9f0a', style: 'soft' })
  assert.deepEqual(themeFromQuery(new URLSearchParams('a=34c759&p=material&dark=1'), stored), { accent: '#34c759', dark: true, platform: 'material', style: 'soft' })
  assert.deepEqual(themeFromQuery(new URLSearchParams('a=zzz&p=x&s=editorial'), stored), { ...stored, style: 'editorial' }, 'a bad query keeps the stored look; a style it names wins')
  assert.equal(themeQuery({ accent: '#34c759', dark: true, platform: 'material', style: 'vivid' }), 'a=34c759&p=material&s=vivid&dark=1')
}
// PRV-02: on an open foldable a list sits left of what it opens; a screen that opens nothing fills the screen.
{
  const { splitPanes } = await import('../../../lib/devices.ts')
  const screens = [{ id: '1', slug: 'diary' }, { id: '2', slug: 'meal' }, { id: '3', slug: 'profile' }, { id: '4', slug: 'onboarding' }]
  const planned = new Map([['diary', { id: 'diary', kind: 'tab' }], ['meal', { id: 'meal', kind: 'push', parent: 'diary' }], ['profile', { id: 'profile', kind: 'tab' }], ['onboarding', { id: 'onboarding', kind: 'first-run' }]])
  assert.deepEqual(splitPanes(screens, planned, '1'), { left: '1', right: '2' }, 'a list shows its first detail beside it')
  assert.deepEqual(splitPanes(screens, planned, '2'), { left: '1', right: '2' }, 'a detail shows beside its parent')
  assert.deepEqual(splitPanes(screens, planned, '3'), { left: '3' })
  assert.deepEqual(splitPanes(screens, planned, '4'), { left: '4' })
  // Folded, only the cover is in view, over the right half; open, the panes sit either side of the hinge.
  const { foldLayout } = await import('../../../lib/devices.ts')
  const folded = foldLayout(0, { left: '1', right: '2' }, '1', 450)
  assert.deepEqual([...folded.frames.keys()], ['1'])
  assert.equal(folded.frames.get('1')!.left, 450)
  assert.equal(folded.clipLeft, 450, 'the left half is out of view')
  const swinging = foldLayout(0.25, { left: '1', right: '2' }, '1', 450)
  assert.equal(swinging.frames.get('1')!.angle, -45, 'the cover swings away about the hinge first')
  assert.equal(swinging.clipLeft, 450)
  const open = foldLayout(1, { left: '1', right: '2' }, '1', 450)
  assert.equal(open.frames.get('1')!.left, 0)
  assert.ok(!open.frames.get('1')!.angle && open.frames.get('2')!.left > 450, 'open: flat, the right pane beyond the hinge')
  assert.equal(open.clipLeft, 0)
  assert.equal(foldLayout(1, { left: '3' }, '3', 450).frames.get('3')!.width, 900, 'one screen fills the open phone')
}
// LLM-08: a 429 that says how long to wait is waited out and tried again on the same model.
{
  const L = await import('../../Services/LlmService.ts')
  assert.equal(L.retryAfterMs(new Headers({ 'retry-after-ms': '120' }), ''), 120)
  assert.equal(L.retryAfterMs(new Headers({ 'retry-after': '2' }), ''), 2000)
  assert.equal(L.retryAfterMs(new Headers(), 'Rate limit reached … Please try again in 902ms. Visit'), 902)
  assert.equal(L.retryAfterMs(new Headers(), 'try again in 1.5s'), 1500)
  assert.equal(L.retryAfterMs(new Headers(), 'no hint'), undefined)
  const saved = globalThis.fetch
  let calls = 0
  globalThis.fetch = (async () => {
    calls++
    if (calls === 1) return new Response('{"error":{"message":"Rate limit reached. Please try again in 20ms."}}', { status: 429 })
    return new Response(JSON.stringify({ choices: [{ message: { content: '{"ok":true}' } }], usage: { prompt_tokens: 5, completion_tokens: 3 } }), { status: 200 })
  }) as typeof fetch
  try {
    assert.equal(await L.completeJSON('s', 'u', 50), '{"ok":true}', 'the second try answers')
    assert.equal(calls, 2, 'one wait, one retry')
  } finally {
    globalThis.fetch = saved
  }
}
// THM-01: five styles. The planner picks one; the code picks the colours from that style's sets by the project id —
// never the model's hex — and every surface and accent stays readable.
{
  const { parsePlan } = await import('../../Services/JsxGenerator.ts')
  const { styleColors, readableOnWhite, APP_STYLES } = await import('../../../lib/app-theme.ts')
  const { styleTokens } = await import('../../../../runtime/kit/styles.js')
  const json = (style: string) => JSON.stringify({ appName: 'X', style, accent: '#ff9f0a', palette: ['steps', 'water'], tabs: [{ id: 'home', label: 'Home', icon: 'House' }], screens: [{ id: 'home', name: 'Home', kind: 'tab', tab: 'home', spec: '' }] })
  const p = parsePlan(json('midnight'), 'x', 'project-1')
  assert.equal(p.style, 'midnight')
  assert.deepEqual({ accent: p.accent, palette: p.palette }, styleColors('midnight', ['steps', 'water'], 'project-1'), "the colours are the style's, by the seed")
  assert.notEqual(parsePlan(json('midnight'), 'x', 'project-2').accent + JSON.stringify(parsePlan(json('midnight'), 'x', 'project-2').palette), p.accent + JSON.stringify(p.palette), 'another project, other colours')
  assert.equal(parsePlan(json('neon-goth'), 'x', 'p').style, 'clean', 'an unknown style falls back')
  const evalIds = ['habits', 'food', 'bank', 'travel', 'learn', 'meditate', 'shop', 'social'].map((b) => `eval-${b}`)
  assert.ok(new Set(evalIds.map((id) => styleColors('editorial', [], id).accent)).size >= 5, 'eight apps of one style get at least five accents (plain FNV gave eval-shop and eval-travel the same)')
  assert.notEqual(styleColors('vivid', ['a'], [...Array(200).keys()].map((i) => `s${i}`).find((id) => styleColors('vivid', ['a'], id).palette.a === '#d8a614')!).accent, readableOnWhite('#d8a614'), 'a yellow start is not darkened into mud; the next colour leads')
  assert.equal(parsePlan(JSON.stringify({ ...JSON.parse(json('soft')), palette: { steps: '#123456' } }), 'x').palette.steps, '#123456', 'without a seed an old plan keeps its colours')
  // ONB-01: the first-run layout is the code's too — by style and seed, stable per app, varied across apps, and the
  // screen gets that layout's example and its one-line description.
  {
    const { exampleFor, screenBrief, ONBOARDINGS } = await import('../../Services/JsxGenerator.ts')
    const { compileScreen } = await import('../../Services/ScreenCompiler.ts')
    const withIntro = (style: string, id: string) => parsePlan(JSON.stringify({ ...JSON.parse(json(style)), screens: [{ id: 'welcome', name: 'Welcome', kind: 'first-run', spec: 'Say hello.' }, { id: 'home', name: 'Home', kind: 'tab', tab: 'home', spec: '' }] }), 'x', id)
    assert.equal(withIntro('clean', 'eval-bank').onboarding, withIntro('clean', 'eval-bank').onboarding, 'one app, one layout every time')
    const picks = new Set(evalIds.flatMap((id) => ['clean', 'midnight', 'vivid', 'soft', 'editorial'].map((st) => withIntro(st, id).onboarding)))
    assert.equal(picks.size, 5, 'across apps and styles every layout is used')
    assert.ok(new Set(evalIds.map((id) => withIntro('vivid', id).onboarding)).size >= 2, 'apps of one style do not all get the same layout')
    const plan = { ...withIntro('editorial', 'eval-travel'), onboarding: 'quiz' as const }
    assert.equal(exampleFor(plan, plan.screens[0]!), 'onboarding-quiz')
    assert.ok(screenBrief(plan, plan.screens[0]!).includes(`Layout: ${ONBOARDINGS.quiz}`) && screenBrief(plan, plan.screens[0]!).includes('const QUESTIONS'), 'the brief names the layout and carries its example')
    assert.equal(exampleFor({ ...plan, onboarding: undefined }, plan.screens[0]!), 'onboarding', 'a plan from before ONB-01 keeps the carousel')
    assert.equal(parsePlan(json('soft'), 'x').onboarding, undefined, 'no seed, no choice')
    for (const o of Object.keys(ONBOARDINGS)) {
      const src = readFileSync(join(process.cwd(), 'konsta/examples', o === 'slides' ? 'onboarding.jsx' : `onboarding-${o}.jsx`), 'utf8')
      assert.ok((await compileScreen(src)).ok, `the ${o} example builds`)
    }
  }
  const lum = (hex: string) => { const n = parseInt(hex.slice(1), 16); const f = (v: number) => (v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; return 0.2126 * f((n >> 16) & 255) + 0.7152 * f((n >> 8) & 255) + 0.0722 * f(n & 255) }
  const ratio = (a: string, b: string) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05)
  for (const style of APP_STYLES) {
    for (const dark of [false, true]) {
      const t = styleTokens(style, '#2563eb', dark)
      for (const surface of [t.page, t.card, t.card2]) assert.ok(ratio(dark ? '#ffffff' : '#000000', surface) >= 7, `${style} ${dark ? 'dark' : 'light'}: text on ${surface}`)
    }
    for (let i = 0; i < 40; i++) {
      const { accent } = styleColors(style, [], `seed-${i}`)
      assert.ok(ratio('#ffffff', accent) >= 3.5, `${style}: white on its accent ${accent}`)
    }
  }
}
// HIG-17: over eight screens, what the brief asked for stays; a tab nobody asked for goes before an asked checkout.
{
  const { parsePlan } = await import('../../Services/JsxGenerator.ts')
  const tab = (id: string, asked = false) => ({ id, name: id, kind: 'tab', tab: id, asked, spec: '' })
  const push = (id: string, parent: string, asked = false) => ({ id, name: id, kind: 'push', parent, asked, spec: '' })
  const plan = parsePlan(JSON.stringify({
    appName: 'Shop', accent: '#ff375f', palette: { sneakers: '#ff375f', consistency: 'blue' },
    tabs: ['home', 'search', 'bag', 'saved', 'profile'].map((id) => ({ id, label: id, icon: 'House' })),
    screens: [{ id: 'welcome', name: 'Welcome', kind: 'first-run', spec: '' }, tab('home', true), tab('search'), tab('bag', true), tab('saved'), tab('profile'),
      push('product', 'home', true), push('checkout', 'bag', true), push('tracking', 'checkout', true), push('reviews', 'product'), push('settings', 'profile')],
  }), 'x')
  const ids = plan.screens.map((s) => s.id)
  assert.equal(ids.length, 8)
  for (const want of ['welcome', 'product', 'checkout', 'tracking']) assert.ok(ids.includes(want), `${want} was asked for: ${ids}`)
  assert.ok(!ids.includes('reviews') && !ids.includes('settings'), 'unasked pushed screens go first')
  assert.deepEqual(plan.tabs.map((t) => t.id).sort(), plan.screens.filter((s) => s.kind === 'tab').map((s) => s.tab).sort(), 'a dropped tab leaves the tab bar')
}
// KON-13: findings from a drawn page are validated before they reach a prompt, and each says what fixed means.
{
  const { parseAudit, auditBrief, AUDIT_SOURCE } = await import('../../../lib/render-audit.ts')
  // The page-side script is a template string: one unescaped backslash made it unparsable and every check silently empty.
  assert.doesNotThrow(() => new Function(AUDIT_SOURCE), 'the audit script parses')
  const found = parseAudit([{ rule: 'clipped-text', where: '"Speaking" (Button)', detail: 'is cut off' }, { rule: 'rm -rf', where: 'x' }, 'junk', { rule: 'sparse', where: '(Page)', detail: 'the lower 46% is empty' }])
  assert.deepEqual(found.map((f) => f.rule), ['clipped-text', 'sparse'], 'unknown rules and junk are dropped')
  const brief = auditBrief(found)
  assert.ok(brief.includes('"Speaking" (Button) is cut off → give the text room'), brief)
  assert.equal(parseAudit(Array.from({ length: 30 }, () => ({ rule: 'overlap', where: 'a', detail: 'b' }))).length, 12, 'capped')
}
// Two quick ⌘Z presses run their steps in order; run at once, the slower first step's save landed last.
{
  const { UndoStack, pairStep } = await import('../../../lib/undo-stack.ts')
  let value = 'c'
  const set = (v: string, ms: number) => new Promise<void>((ok) => setTimeout(() => ((value = v), ok()), ms))
  const h = new UndoStack()
  h.record(pairStep(() => set('a', 5), () => set('b', 5)))
  h.record(pairStep(() => set('b', 40), () => set('c', 40)))
  await Promise.all([h.undo(), h.undo()])
  assert.equal(value, 'a', 'undos are serialised')
  await Promise.all([h.redo(), h.redo()])
  assert.equal(value, 'c', 'and so are redos')
}
{
  const { str, idOf, num, oneOf, obj } = await import('../../../server/validate.ts')
  assert.throws(() => idOf('../x'), /Invalid id/)
  assert.throws(() => str('x'.repeat(11), 10), /Invalid text/)
  assert.throws(() => num(Number.NaN), /Invalid number/)
  assert.throws(() => oneOf('love', ['up', 'down']), /Invalid value/)
  assert.throws(() => obj(null), /Invalid request/)
  assert.equal(idOf('0mucc31f3-0001-896f'), '0mucc31f3-0001-896f', 'message ids pass')
}

// B2: every model call is logged with its user and project; limits read the log
{
  const { UsageService, LIMITS } = await import('../../Services/UsageService.ts')
  const { db } = await import('../../../database/connection.ts')
  const { llmCalls } = await import('../../../database/schema.ts')
  reply = () => new Response(`data: ${JSON.stringify({ choices: [{ delta: { content: page('Logged') } }] })}\n\ndata: ${JSON.stringify({ choices: [], usage: { prompt_tokens: 1000, prompt_cache_hit_tokens: 400, completion_tokens: 2000 } })}\n\ndata: [DONE]\n`, { status: 200 })
  await Project.create({ id: 'p-usage', name: 'U', designSystem: 'minimal', device: 'mobile' })
  const out = await UsageService.run({ userId: 'user-9', projectId: 'p-usage', actionId: 'act-1' }, () => post(GenerateController, { projectId: 'p-usage', prompt: 'a settings screen' }))
  assert.ok(!out.includes('GEN_ERROR'))
  const rows = (await db.select().from(llmCalls)).filter((r) => r.userId === 'user-9')
  assert.equal(rows.length, 1, 'one row per model call, attributed to the request\'s user')
  assert.equal(rows[0].projectId, 'p-usage')
  assert.deepEqual([rows[0].promptTokens, rows[0].cachedTokens, rows[0].completionTokens, rows[0].ok], [1000, 400, 2000, true])
  // The rate depends on the clock (DeepSeek peak is twice off-peak), so the row is checked against
  // both possibilities rather than pinned to one — the point is that it came from the price table.
  const offPeakCost = (600 * 0.15 + 400 * 0.003 + 2000 * 0.6) / 1e6
  assert.ok(
    Math.abs(rows[0].costUsd - offPeakCost) < 1e-9 || Math.abs(rows[0].costUsd - offPeakCost * 2) < 1e-9,
    'cost from the price table, at whichever rate was in force',
  )
  // LLM-05: the call knows its model and its action, and the action's real cost is their sum.
  assert.deepEqual([rows[0].model, rows[0].actionId], ['deepseek-flash', 'act-1'])
  assert.deepEqual(await UsageService.actionCost('act-1'), { calls: 1, ok: 1, usd: rows[0].costUsd })
  assert.deepEqual(await UsageService.actionCost('no-such-action'), { calls: 0, ok: 0, usd: 0 })
  reply = () => new Response('down', { status: 500 })
  await UsageService.run({ userId: 'user-9' }, () => post(GenerateController, { projectId: 'p-usage', prompt: 'again' }))
  const failed = (await db.select().from(llmCalls)).filter((r) => r.userId === 'user-9' && !r.ok)
  // With no fallback set, the same model gets one more try; each attempt is its own logged row.
  assert.ok(failed.length === 2 && failed.every((f) => /DeepSeek 500/.test(f.error ?? '')), 'a failed call and its one retry are logged with their error')

  assert.equal(await UsageService.refusal('user-9'), null, 'under the limits')
  UsageService.begin('user-9')
  assert.equal((await UsageService.refusal('user-9'))?.status, 429, 'one generation at a time')
  UsageService.end('user-9')
  const limit = LIMITS.callsPerDay
  LIMITS.callsPerDay = 2
  assert.match((await UsageService.refusal('user-9'))?.message ?? '', /today’s generation limit/, 'the daily call limit')
  LIMITS.callsPerDay = limit
  const budget = LIMITS.dailyBudgetUsd
  LIMITS.dailyBudgetUsd = 0.001
  assert.equal((await UsageService.refusal('someone-else'))?.status, 503, 'the service-wide daily budget pauses everyone')
  LIMITS.dailyBudgetUsd = budget
  process.env.GENERATION_PAUSED = '1'
  assert.equal((await UsageService.refusal('someone-else'))?.status, 503, 'the stop switch')
  delete process.env.GENERATION_PAUSED
}

// --- SHR-02 / WLT-01: a public preview link, its views by post, and the waitlist ---
{
  const { ShareController, cleanRef, EMAIL } = await import('./ShareController.ts')
  const { db } = await import('../../../database/connection.ts')
  const { sql } = await import('drizzle-orm')
  await Project.create({ id: 'shr-1', name: 'Shared', designSystem: 'konsta', device: 'mobile' })
  await Screen.create({ id: 'shr-s1', projectId: 'shr-1', name: 'Home', prompt: 'p', html: 'export default function S() { return null }', x: 0, y: 0 })
  await assert.rejects(ShareController.shared('nope', null), 'a token nobody has is not found')
  const { token } = await ShareController.share({ id: 'shr-1', on: true })
  assert.ok(token && /^[A-Za-z0-9_-]{11}$/.test(token), 'sharing makes a short unguessable token (8 random bytes)')
  assert.equal((await ShareController.share({ id: 'shr-1', on: true })).token, token, 'sharing again keeps the link')
  const view = await ShareController.shared(token!, 'reddit')
  assert.equal(view.screens.length, 1)
  assert.ok(!view.screens[0]!.html.includes('export'), 'a stranger never gets the source, only a version key')
  assert.ok(!('userId' in view.project) && view.project.id === '', 'no owner, no project id')
  assert.equal((await db.execute(sql`SELECT ref FROM share_views WHERE project_id = 'shr-1'`)).rows[0]?.ref, 'reddit', 'the view is counted by its post')
  // PRC-03: an owner on Free shares a branded link; a paid plan's link is clean.
  assert.equal(view.branded, true, 'no owner on a plan: branded')
  {
    const { user } = await import('../../../database/schema.ts')
    const { Subscription } = await import('../../Models/Subscription.ts')
    await db.insert(user).values({ id: 'shr-owner', name: 'O', email: 'o@x.uz', createdAt: new Date(), updatedAt: new Date() })
    await Subscription.upsert({ id: 'sub_shr', userId: 'shr-owner', productKey: 'pro-month', status: 'active', startedAt: Math.floor(Date.now() / 1000), currentPeriodEnd: Math.floor(Date.now() / 1000) + 86400 * 30, cancelAtPeriodEnd: false })
    await db.execute(sql`UPDATE projects SET user_id = 'shr-owner' WHERE id = 'shr-1'`)
    assert.equal((await ShareController.shared(token!, null)).branded, false, 'a paying owner shares it clean')
  }
  assert.equal((await ShareController.share({ id: 'shr-1', on: false })).token, null)
  await assert.rejects(ShareController.shared(token!, null), 'turning sharing off kills the old link')
  assert.equal(cleanRef('Reddit'), 'reddit')
  assert.equal(cleanRef('a b<script>'), null, 'a ref is short and plain or nothing')
  assert.ok(EMAIL.test('a@b.co') && !EMAIL.test('a@b') && !EMAIL.test('a b@c.de'))
  assert.equal((await ShareController.join({ token: null, email: 'A@x.io', ref: 'x', note: null })).joined, true)
  assert.equal((await ShareController.join({ token: null, email: 'a@x.io', ref: 'threads', note: 'a gym app' })).joined, false, 'one row per email')
  const w = (await db.execute(sql`SELECT ref, note FROM waitlist WHERE email = 'a@x.io'`)).rows[0]
  assert.deepEqual([w?.ref, w?.note], ['x', 'a gym app'], 'the first ref stays; a later note fills an empty one')
}

// --- EML-01/03: email through one service; logged, templated, bulk sends with unsubscribe ---
{
  const { EmailService, setEmailTransport, unsubscribeUrl, validUnsubscribe, CAMPAIGN_MAX } = await import('../../Services/EmailService.ts')
  const { renderEmail, SYSTEM_EMAILS } = await import('../../../lib/emails.ts')
  const { ShareController } = await import('./ShareController.ts')
  const { db } = await import('../../../database/connection.ts')
  const { sql } = await import('drizzle-orm')
  const rows = async (tag: string) => (await db.execute(sql`SELECT to_email AS "to", status FROM emails WHERE tag = ${tag} ORDER BY id`)).rows as { to: string; status: string }[]
  const waitlistMail = () => ({ to: 'a@b.co', tag: 'waitlist', ...renderEmail(SYSTEM_EMAILS.waitlist.content) })
  delete process.env.RESEND_API_KEY
  const was = process.env.EMAIL_FROM
  delete process.env.EMAIL_FROM
  const env = process.env.NODE_ENV
  process.env.NODE_ENV = 'development'
  assert.equal(await EmailService.ready(), false)
  assert.deepEqual(await EmailService.send(waitlistMail()), { logged: true }, 'no provider: logged in development')
  process.env.NODE_ENV = 'production'
  await assert.rejects(EmailService.send(waitlistMail()), /not set up/, 'no provider in production: refused, never pretended')
  assert.deepEqual((await rows('waitlist')).map((r) => r.status).slice(-2), ['logged', 'failed'], 'every mail is logged, whatever happened')
  process.env.NODE_ENV = 'development'

  const sent: { to: string; tag: string; from: string; subject: string; unsub?: string }[] = []
  setEmailTransport(async (m, _key, from) => (sent.push({ to: m.to, tag: m.tag, from, subject: m.subject, unsub: m.headers?.['List-Unsubscribe'] }), { id: 'em_1' }), async () => {})
  process.env.RESEND_API_KEY = 're_test_0000'
  process.env.EMAIL_FROM = 'Design <hello@example.com>'
  await db.execute(sql`DELETE FROM waitlist`)
  await ShareController.join({ token: null, email: 'New@Mail.io', ref: null, note: null })
  await ShareController.join({ token: null, email: 'new@mail.io', ref: null, note: null })
  assert.deepEqual(sent.map((m) => [m.to, m.tag, m.from]), [['new@mail.io', 'waitlist', 'Design <hello@example.com>']], 'a new sign-up is confirmed once')

  // A template an admin changed is what goes out; reset puts the default back.
  await EmailService.saveTemplate('waitlist', { subject: 'Hi from {{brand}}', heading: 'Hello', body: 'Soon.' })
  await ShareController.join({ token: null, email: 'second@mail.io', ref: null, note: null })
  assert.equal(sent.at(-1)!.subject, 'Hi from Screenspell', "the admin's words, {{brand}} filled in")
  await EmailService.saveTemplate('waitlist', null)
  assert.equal((await EmailService.template('waitlist')).subject, SYSTEM_EMAILS.waitlist.content.subject)

  // Unsubscribe: the link is signed for its address; an unsubscribed address gets no bulk mail.
  const link = new URL(unsubscribeUrl('new@mail.io'))
  assert.ok(validUnsubscribe('new@mail.io', link.searchParams.get('t')!))
  assert.ok(!validUnsubscribe('second@mail.io', link.searchParams.get('t')!), "one address's token does not unsubscribe another")
  await EmailService.suppress('NEW@mail.io')
  assert.deepEqual(await EmailService.recipients('waitlist'), ['second@mail.io'], 'who unsubscribed is left out')

  sent.length = 0
  const r = await EmailService.campaign('adm', { audience: 'waitlist', content: { subject: 'You are in', heading: 'Welcome', body: 'Come in.', button: 'Open' }, url: 'https://example.com' })
  assert.deepEqual([r.recipients, r.sent, r.failed], [1, 1, 0])
  assert.equal(sent[0]!.tag, 'campaign')
  assert.match(sent[0]!.unsub ?? '', /\/unsubscribe\?e=second%40mail\.io&t=/, 'a bulk mail carries its List-Unsubscribe header')
  const camp = (await db.execute(sql`SELECT sent, recipients FROM email_campaigns WHERE id = ${r.id}`)).rows[0] as { sent: number; recipients: number }
  assert.deepEqual([camp.sent, camp.recipients], [1, 1], 'the send is recorded with its counts')
  await assert.rejects(EmailService.campaign('adm', { audience: 'one', to: 'new@mail.io', content: { subject: 's', heading: 'h', body: 'b' } }), /Nobody/, 'not even one by one to someone who unsubscribed')
  assert.ok(CAMPAIGN_MAX <= 100)

  setEmailTransport(async () => { throw new Error('Email provider answered 500') })
  assert.equal((await ShareController.join({ token: null, email: 'third@mail.io', ref: null, note: null })).joined, true, 'a failed mail never fails the sign-up')
  assert.equal((await rows('waitlist')).at(-1)!.status, 'failed')

  const m = renderEmail(SYSTEM_EMAILS['magic-link'].content, { url: 'https://x.io/verify?token=a&b="<c>"' })
  assert.ok(m.html.includes('token=a&amp;b=&quot;&lt;c&gt;&quot;') && m.text.includes('token=a&b="<c>"'), 'the link is escaped in html, whole in text')
  assert.ok(!m.html.includes('Unsubscribe'), 'a sign-in link carries no unsubscribe link')
  delete process.env.RESEND_API_KEY
  if (was === undefined) delete process.env.EMAIL_FROM
  else process.env.EMAIL_FROM = was
  if (env === undefined) delete process.env.NODE_ENV // assigning undefined would leave the string 'undefined'
  else process.env.NODE_ENV = env
}

// --- CHAT: the plan reply reads like a person, never a log ---
{
  const { planReply } = await import('../../../lib/agent-messages.ts')
  const r = planReply({ appName: 'Sipwise', summary: 'A simple water tracker.', drawn: ['Today', 'History'], failed: ['Settings'], tabs: ['Today', 'History'] })
  assert.equal(r.split('\n\n')[0], "Here's Sipwise — a simple water tracker.")
  assert.match(r, /I designed 2 screens across 2 tabs\./)
  assert.match(r, /Settings didn't come out — use Try again on that frame\./)
  assert.ok(!/Tabs:|Designed|Tokens/.test(r), 'no log lines in the reply')
  assert.equal(planReply({ appName: 'X', summary: 'Mindloom helps founders', drawn: [], failed: [], tabs: [] }), "Here's X. Mindloom helps founders.", 'a name at the start keeps its capital')
  assert.equal(planReply({ appName: 'Palabrae', summary: 'Learn practical Spanish', drawn: [], failed: [], tabs: [] }), "Here's Palabrae. Learn practical Spanish.", 'never “— Learn”')
}

// --- REG-01: a reference picture reaches the planner and every screen call; bad ones are refused at the edge ---
{
  const { parseRefImages } = await import('../../../lib/ref-images.ts')
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
  assert.deepEqual(parseRefImages([png]), [{ dataUrl: png }])
  assert.equal(parseRefImages(undefined), undefined)
  assert.throws(() => parseRefImages(['https://evil.example/x.png']), /PNG, JPEG or WebP/, 'a remote URL never reaches a model')
  assert.throws(() => parseRefImages(['data:image/svg+xml;base64,PHN2Zz4=']), /PNG, JPEG or WebP/, 'no SVG')
  assert.throws(() => parseRefImages([png, png, png]), /At most 2/)
  await Project.create({ id: 'img-1', name: 'Img', designSystem: 'konsta', device: 'mobile' })
  sent = []
  reply = (req) => planReply(req) ?? sse(page('Drawn'))
  await post(PlanController, { projectId: 'img-1', brief: 'Like this, please', images: [png] })
  const withPic = (u: unknown) => Array.isArray(u) && u.some((part) => (part as { type?: string }).type === 'image_url')
  assert.ok(sent.length >= 2 && sent.every((r) => withPic(r.user)), 'the planner and every screen see the picture')
  assert.ok(sent.filter((r) => !r.json).every((r) => JSON.stringify(r.user).includes('REFERENCE IMAGE')), 'screens are told what the picture is for')
  const msg = (await Message.forProject('img-1')).find((m) => m.role === 'user')!
  assert.match(msg.meta ?? '', /"images":1/, 'the message says it had a picture; the picture is not stored')
  assert.ok(!(msg.meta ?? '').includes('base64'))
  assert.match(await post(PlanController, { projectId: 'img-1', brief: 'x', images: ['data:text/html;base64,PGgxPg=='] }), /PNG, JPEG or WebP/)
}

// --- REG-02: one element — the compiler marks where each is; the model writes that element alone and it is spliced ---
{
  const { compileScreen } = await import('../../Services/ScreenCompiler.ts')
  const { GenerateController } = await import('./GenerateController.ts')
  const src = "import { Page, Navbar, Block } from 'konsta/react'\nexport default function Screen() {\n  return <Page><Navbar title=\"Home\" /><Block className=\"p-4\">Hello</Block></Page>\n}\n"
  const start = src.indexOf('<Block'), end = src.indexOf('</Block>') + '</Block>'.length
  const built = await compileScreen(src)
  assert.ok(built.ok && built.js.includes(`"data-od-loc": "${start}:${end}"`), 'each element carries its place in the stored source')
  const noImport = src.replace("import { Page, Navbar, Block } from 'konsta/react'\n", '')
  const b2 = await compileScreen(noImport)
  const s2 = noImport.indexOf('<Block')
  assert.ok(b2.ok && b2.js.includes(`"data-od-loc": "${s2}:`), 'offsets are the stored text, not the one with imports added')

  await Project.create({ id: 'el-1', name: 'El', designSystem: 'konsta', device: 'mobile' })
  await Screen.create({ id: 'el-s1', projectId: 'el-1', name: 'Home', prompt: 'p', html: src, x: 0, y: 0 })
  sent = []
  reply = () => sse('```jsx\n<Block className="p-4">Hello, Maya</Block>\n```')
  await post(GenerateController, { projectId: 'el-1', prompt: 'greet Maya', editScreenId: 'el-s1', element: { loc: `${start}:${end}`, label: 'Element “Hello”' } })
  const after = (await Screen.find('el-s1'))!.html
  assert.equal(after, src.slice(0, start) + '<Block className="p-4">Hello, Maya</Block>' + src.slice(end), 'only that element changed; the rest is byte for byte')
  assert.ok(sent[0]!.user.includes('THE ONE ELEMENT TO CHANGE') && sent[0]!.user.includes('Hello</Block>'), 'the model is shown the element')
  const reply1 = (await Message.forProject('el-1')).filter((m) => m.role === 'agent').at(-1)!
  assert.equal(reply1.kind, 'element')
  assert.match(reply1.text, /Element “Hello” on “Home”/)

  const { reindent } = await import('./GenerateController.ts')
  assert.equal(reindent('<Button>\n  Go\n</Button>', '  x\n        <Button>', 12), '<Button>\n          Go\n        </Button>', 'a spliced element keeps the file\'s indentation')
  // A place that is not an element (or out of range) is not an element edit: the whole screen is changed instead.
  reply = () => sse(page('Whole'))
  await post(GenerateController, { projectId: 'el-1', prompt: 'x', editScreenId: 'el-s1', element: { loc: '1:5', label: 'x' } })
  assert.match((await Screen.find('el-s1'))!.html, /Whole/)
}

// --- An added screen gets a way in: the screen the request names (else the first tab) opens it, undone with it ---
{
  const { GenerateController } = await import('./GenerateController.ts')
  const { HistoryController } = await import('./HistoryController.ts')
  const plan = { appName: 'x', summary: '', accent: '#ff375f', style: 'clean', palette: {}, data: '', tabs: [{ id: 'home', label: 'Home', icon: 'House' }, { id: 'me', label: 'Profile', icon: 'User' }], screens: [{ id: 'home', name: 'Home', kind: 'tab', tab: 'home', spec: '' }, { id: 'profile', name: 'Profile', kind: 'tab', tab: 'me', spec: '' }] }
  await Project.create({ id: 'add-1', name: 'Add', designSystem: 'konsta', device: 'mobile' })
  await Project.savePlan('add-1', plan as never)
  const profileSrc = page('Profile').replace(/```(jsx)?\n?/g, '')
  await Screen.create({ id: 'add-home', projectId: 'add-1', name: 'Home', slug: 'home', prompt: 'p', html: page('Home').replace(/```(jsx)?\n?/g, ''), x: 0, y: 0 })
  await Screen.create({ id: 'add-profile', projectId: 'add-1', name: 'Profile', slug: 'profile', prompt: 'p', html: profileSrc, x: 400, y: 0 })
  sent = []
  // The new screen first; then the parent's edit, which must call push with the new screen's id.
  reply = (req) => {
    const id = /useNav\(\)\.push\('([^']+)'\)/.exec(req.user)?.[1]
    return sse(id ? page('Profile').replace('<Block className="p-4">Profile</Block>', `<Block onClick={() => useNav().push('${id}')}>Leaderboard</Block>`) : page('Leaderboard'))
  }
  await post(GenerateController, { projectId: 'add-1', prompt: 'add a leaderboard to Profile' })
  const added = (await Screen.forProject('add-1')).find((s) => s.name === 'Leaderboard')!
  const parent = (await Screen.find('add-profile'))!
  assert.ok(added && parent.html.includes(`push('${added.slug}')`), 'the named screen now opens the new one')
  assert.ok(!(await Screen.find('add-home'))!.html.includes('push('), 'the first tab is left alone when the request names another screen')
  const msg = (await Message.forProject('add-1')).filter((m) => m.role === 'agent').at(-1)!
  assert.match(msg.text, /Added “Leaderboard” — opened from “Profile”/)
  await HistoryController.revertMessage({ projectId: 'add-1', messageId: msg.id })
  assert.equal((await Screen.find('add-profile'))!.html, profileSrc, 'undo puts the parent back')
  assert.ok(!(await Screen.forProject('add-1')).some((s) => s.name === 'Leaderboard'), 'and removes the new screen')
}

// --- KON-10: a picture's key follows the source and the look, so a changed screen or theme is never shown stale ---
{
  const { ShotService } = await import('../../Services/ShotService.ts')
  const look = { accent: '#ff375f', dark: false, platform: 'ios' as const, style: 'clean' as const, tabs: [] }
  const k = ShotService.key('A', look)
  assert.equal(ShotService.key('A', { ...look }), k, 'the same screen in the same look is the same picture')
  assert.notEqual(ShotService.key('B', look), k, 'a changed screen is a new picture')
  assert.notEqual(ShotService.key('A', { ...look, dark: true }), k, 'dark is a new picture')
  assert.notEqual(ShotService.key('A', { ...look, style: 'midnight' as const }), k, 'a new style is a new picture')
}

{
  // SEC-01 behind a proxy: the request URL is internal, the browser's Origin is the public site.
  const { crossSite } = await import('../../../server/guard.ts')
  const req = (origin?: string) => new Request('http://localhost:8080/api/generate-plan', { method: 'POST', headers: origin ? { origin } : {} })
  assert.equal(crossSite(req('https://screenspell.app'), 'https://screenspell.app'), false, 'the public origin is this site')
  assert.equal(crossSite(req('http://localhost:8080'), 'https://screenspell.app'), false, 'the request URL origin is this site')
  assert.equal(crossSite(req(), 'https://screenspell.app'), false, 'no Origin header passes')
  assert.equal(crossSite(req('https://evil.example'), 'https://screenspell.app'), true, 'another site is refused')
  assert.equal(crossSite(req('https://screenspell.app.evil.example'), 'https://screenspell.app'), true, 'a look-alike host is refused')
  assert.equal(crossSite(req('https://screenspell.app'), 'not a url'), true, 'a malformed public URL adds nothing')
  const { publicOrigin } = await import('../../../server/guard.ts')
  assert.equal(publicOrigin(req(), 'https://screenspell.app/x'), 'https://screenspell.app', 'payment return URLs use the public origin')
  assert.equal(publicOrigin(req(), ''), 'http://localhost:8080', 'with no public URL (dev) the request origin')
}

{
  // ACC-01/02: waitlist-only — nobody but an admin signs in, new or old; open — everyone, as before.
  const { AccessService } = await import('../../Services/AccessService.ts')
  const { auth, devMail } = await import('../../Services/AuthService.ts')
  const { userFrom } = await import('../../../server/auth.ts')
  const { guardGeneration } = await import('../../../server/guard.ts')
  const { Setting } = await import('../../Models/Setting.ts')
  const setMode = async (m: 'waitlist' | 'open' | null) => (await Setting.set('access.mode', m), AccessService.clear())
  const nodeEnv = process.env.NODE_ENV
  process.env.NODE_ENV = 'production'
  await setMode(null)
  assert.equal(await AccessService.mode(), 'waitlist', 'production starts waitlist-only, so a fresh deploy is never open by accident')
  process.env.NODE_ENV = 'development' // magic links land in devMail, not in a mail provider
  AccessService.clear()
  assert.equal(await AccessService.mode(), 'open', 'development is open by default')
  process.env.ADMIN_EMAILS = `${process.env.ADMIN_EMAILS ?? ''},owner@acc.test`
  // Sign in by magic link and return the session cookie.
  const signIn = async (email: string) => {
    // The link is kept in devMail before it is mailed; this process has no mail provider, so the send fails after.
    await auth.api.signInMagicLink({ body: { email, callbackURL: '/' }, headers: new Headers() }).catch((e) => assert.match(String(e), /Email is not set up/))
    if (!devMail.lastLink) throw new Error(`no link for ${email}; NODE_ENV=${process.env.NODE_ENV}`)
    const token = new URL(devMail.lastLink.url).searchParams.get('token')!
    const res = await auth.api.magicLinkVerify({ query: { token, callbackURL: '/' }, headers: new Headers(), asResponse: true })
    const cookie = (res.headers.getSetCookie?.() ?? [res.headers.get('set-cookie') ?? '']).map((c) => c.split(';')[0]).join('; ')
    return new Request('http://localhost/x', { headers: { cookie } })
  }
  const early = await signIn('early@acc.test') // an account made while the site was open
  assert.equal((await userFrom(early))?.email, 'early@acc.test')

  await setMode('waitlist')
  assert.equal(await userFrom(early), null, 'in waitlist mode a session from before counts as signed out')
  const refusedGen = await guardGeneration(new Request('http://localhost/api/generate-plan', { method: 'POST', headers: early.headers, body: '{}' }), async () => new Response('ran'))
  assert.equal(refusedGen.status, 401, 'and cannot generate')
  await assert.rejects(auth.api.signInMagicLink({ body: { email: 'new@acc.test', callbackURL: '/' }, headers: new Headers() }), /invite-only/, 'no sign-in link is mailed to a non-admin')
  await assert.rejects(auth.api.signInMagicLink({ body: { email: 'early@acc.test', callbackURL: '/' }, headers: new Headers() }), /invite-only/, 'nor to an account from before')
  const ctx = await auth.$context
  await assert.rejects(ctx.internalAdapter.createUser({ email: 'google@acc.test', name: 'G', emailVerified: true }, { method: 'oauth' }), /invite-only/, 'no account is made (the path Google takes)')
  await assert.rejects(ctx.internalAdapter.createSession((await ctx.internalAdapter.findUserByEmail('early@acc.test'))!.user.id), /invite-only/, 'no session is made for an old account')
  const owner = await signIn('owner@acc.test')
  assert.equal((await userFrom(owner))?.admin, true, 'an admin signs in while waitlist-only')
  // AUTH-10: the email link is a switch — off in production unless MAGIC_LINK=1; when off the server refuses too.
  const { magicLinkOn, signInMethods } = await import('../../Services/AuthService.ts')
  assert.equal(magicLinkOn(), true, 'development keeps the email link (it is only logged)')
  process.env.NODE_ENV = 'production'
  assert.equal(signInMethods().magicLink, false, 'production: Google only')
  process.env.MAGIC_LINK = '1'
  assert.equal(magicLinkOn(), true, 'MAGIC_LINK=1 turns it back on')
  delete process.env.MAGIC_LINK
  process.env.NODE_ENV = 'development'
  process.env.MAGIC_LINK = '0'
  await assert.rejects(auth.api.signInMagicLink({ body: { email: 'owner@acc.test', callbackURL: '/' }, headers: new Headers() }), /Sign in with Google/, 'switched off: no link is made, even for an admin')
  delete process.env.MAGIC_LINK

  process.env.ACCESS_MODE = 'open'
  assert.equal((await userFrom(early))?.email, 'early@acc.test', 'ACCESS_MODE in the environment wins over the panel')
  delete process.env.ACCESS_MODE
  await setMode('open')
  assert.equal((await userFrom(early))?.email, 'early@acc.test', 'open again: everyone as before')
  await setMode(null)
  if (nodeEnv === undefined) delete process.env.NODE_ENV
  else process.env.NODE_ENV = nodeEnv
  // ACC-07: a shared preview offers the waitlist only in waitlist mode; open, it sends people to the product.
  const preview = readFileSync('src/components/AppPreview.tsx', 'utf8')
  assert.equal(preview.match(/<WaitlistButton\b/g)?.length, 1, 'the preview has one waitlist button')
  assert.ok(/if \(access === 'waitlist'\) return <WaitlistButton/.test(preview), 'and it is behind the access switch')
  assert.ok(/href="\/\?ref=preview"/.test(preview), 'open: the offer is the product itself')
}

{
  // PAY-01…04 + FDB-10: the free beta — nothing sold, plan limits open, the free start set by the admin, a request
  // for more credits, and feedback.
  const { PaymentsService, PAYMENTS_OFF } = await import('../../Services/PaymentsService.ts')
  const { CreditService } = await import('../../Services/CreditService.ts')
  const { BillingController } = await import('./BillingController.ts')
  const { ProjectController } = await import('./ProjectController.ts')
  const { AdminController } = await import('./AdminController.ts')
  const { BetaService } = await import('../../Services/BetaService.ts')
  const { Credit } = await import('../../Models/Credit.ts')
  const { Setting } = await import('../../Models/Setting.ts')
  const { db } = await import('../../../database/connection.ts')
  const { user } = await import('../../../database/schema.ts')
  const set = async (k: string, v: string | null) => (await Setting.set(k, v), PaymentsService.clear())
  const nodeEnv = process.env.NODE_ENV
  process.env.NODE_ENV = 'production'
  await set('payments.mode', null)
  assert.equal(await PaymentsService.mode(), 'off', 'production sells nothing until an admin turns payments on')
  process.env.NODE_ENV = 'development'
  PaymentsService.clear()
  assert.equal(await PaymentsService.mode(), 'on', 'development keeps the billing code in play')
  await db.insert(user).values([{ id: 'beta-u', name: 'Beta', email: 'beta@x.uz', createdAt: new Date(), updatedAt: new Date() }, { id: 'beta-adm', name: 'Adm', email: 'beta-adm@x.uz', createdAt: new Date(), updatedAt: new Date() }])

  assert.deepEqual(await CreditService.limitsFor('beta-u'), { plan: 'free', projects: 1, export: false }, 'payments on: Free is limited')
  await ProjectController.store({ userId: 'beta-u' })
  await assert.rejects(ProjectController.store({ userId: 'beta-u' }), /plan-limit:projects:1/, 'payments on: a second project is refused on Free')

  await set('payments.mode', 'off')
  assert.deepEqual(await CreditService.limitsFor('beta-u'), { plan: 'free', projects: null, export: true }, 'payments off: no plan limits, the plan is still Free')
  await ProjectController.store({ userId: 'beta-u' })
  assert.equal(await CreditService.exportsLeft('beta-u'), null, 'payments off: export is not counted down')
  await assert.rejects(BillingController.checkout({ id: 'beta-u', email: 'beta@x.uz' }, 'starter-month', 'https://x'), new RegExp(PAYMENTS_OFF), 'payments off: no checkout opens')
  await assert.rejects(BillingController.portal('beta-u', 'https://x'), new RegExp(PAYMENTS_OFF))
  process.env.PAYMENTS_MODE = 'on'
  assert.equal(await PaymentsService.mode(), 'on', 'PAYMENTS_MODE in the environment wins over the panel')
  delete process.env.PAYMENTS_MODE

  // PAY-02: the free start is the admin's number; an invalid value is refused by the panel.
  await AdminController.setSetting('beta-adm', { key: 'credits.signup', value: '100' })
  assert.equal(await PaymentsService.signupCredits(), 100)
  assert.equal(await CreditService.signupGrant('beta-u'), true)
  assert.equal(await Credit.balance('beta-u'), 100, 'a new account starts with what the admin set')
  await assert.rejects(AdminController.setSetting('beta-adm', { key: 'credits.signup', value: '5000' }), /Invalid/)
  await AdminController.setSetting('beta-adm', { key: 'credits.signup', value: null })
  assert.equal(await PaymentsService.signupCredits(), 60, 'cleared: the default')

  // PAY-03: one open request per person; a grant lands once, in the ledger.
  await BetaService.requestCredits('beta-u', 'a recipe app')
  await BetaService.requestCredits('beta-u', 'a recipe app, now with meal plans')
  const reqs = (await BetaService.requests()).filter((r) => r.userId === 'beta-u')
  assert.deepEqual(reqs.map((r) => [r.status, r.note, r.email, r.balance]), [['open', 'a recipe app, now with meal plans', 'beta@x.uz', 100]], 'asking again replaces the note of the open request')
  await AdminController.answerCreditRequest('beta-adm', { id: reqs[0]!.id, amount: 45 })
  assert.equal(await Credit.balance('beta-u'), 145, 'a granted request is a ledger row')
  await assert.rejects(AdminController.answerCreditRequest('beta-adm', { id: reqs[0]!.id, amount: 45 }), /already answered/, 'a request is answered once')
  assert.equal(await Credit.balance('beta-u'), 145)
  await BetaService.requestCredits('beta-u', null)
  const again = (await BetaService.requests()).find((r) => r.userId === 'beta-u' && r.status === 'open')!
  await AdminController.answerCreditRequest('beta-adm', { id: again.id, amount: null })
  assert.equal(await Credit.balance('beta-u'), 145, 'a dismissal grants nothing')
  assert.equal(await BetaService.openRequests(), 0)

  // FDB-10: the first-app question is asked once — an answer or a close ends it; closed prompts are not listed.
  assert.equal(await BetaService.firstAppDue('beta-u'), true)
  await BetaService.feedback('beta-u', { source: 'first-app', rating: null, text: null, projectId: null })
  assert.equal(await BetaService.firstAppDue('beta-u'), false, 'a closed prompt is not asked again')
  await BetaService.feedback('beta-u', { source: 'button', rating: 4, text: 'Loved the tab bar', projectId: null })
  assert.deepEqual((await BetaService.feedbackList()).filter((f) => f.userId === 'beta-u').map((f) => [f.source, f.rating, f.text, f.email]), [['button', 4, 'Loved the tab bar', 'beta@x.uz']])
  assert.deepEqual(await BetaService.feedbackSummary(), { n: 1, avg: 4 })

  await set('payments.mode', null)
  if (nodeEnv === undefined) delete process.env.NODE_ENV
  else process.env.NODE_ENV = nodeEnv
  PaymentsService.clear()
}

console.log('ok')
