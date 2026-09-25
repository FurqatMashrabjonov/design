// LP-06: a saved screen carries its CSS and its icons ready-made, so no frame (canvas, preview,
// thumbnail, export) downloads the Tailwind Play CDN (~400 KB of JS that compiles CSS in the page on
// every load) or the Lucide UMD build (~400 KB) again. Server-only: it runs on every path that saves
// generated HTML, after the normalizer and resolveImages, and it is idempotent.
//
// Nothing here may change how a screen looks, so both halves reproduce what the scripts did in the
// page rather than doing something "equivalent":
// - Tailwind is compiled by the engine the CDN runs (v3.4.17, pinned under the `tailwindcss-v3` alias —
//   v4 draws borders, shadows, rings and the palette differently), with the CDN's inputs (the class
//   names on the page), its plugins (autoprefixer) and its placement (appended to the end of <head>,
//   so it follows the page's own head styles in the cascade, as the CDN's did).
// - Each `<i data-lucide>` becomes the <svg> lucide.createIcons would put there (lucide 1.47.0, the
//   version LUCIDE_CDN pins), with the attributes of the call that would have run first.
// A screen this cannot reproduce exactly (a config that is code, a Tailwind plugin, a script that uses
// the lucide API beyond createIcons) keeps its CDN script for that half.
import postcss from 'postcss'
import autoprefixer from 'autoprefixer'
import tailwind from 'tailwindcss-v3'
import { icons } from 'lucide'
import { attr, parseTree, walk, type El } from './html-tree.ts'

type IconNode = [string, Record<string, string | number>][]
const ICONS = icons as unknown as Record<string, IconNode>

const TW_CDN = /<script\b[^>]*\bsrc\s*=\s*["']?https:\/\/cdn\.tailwindcss\.com[^>]*>\s*<\/script>/gi
const TW_SHEET = /<style data-od-tw>[\s\S]*?<\/style>/i
const SVG_NS = 'http://www.w3.org/2000/svg'

// --- a static object literal, never evaluated -----------------------------------------------------

/**
 * Reads a JS object/array literal made only of strings, numbers, booleans, null, arrays and objects
 * (keys bare or quoted, trailing commas and comments allowed). Anything else — a call, a spread, a
 * variable, a template string — returns undefined: model-written JS is never run on the server.
 */
export function parseLiteral(src: string): unknown {
  let i = 0
  const fail = Symbol()
  const ws = () => {
    for (;;) {
      const m = /^(?:\s+|\/\/[^\n]*|\/\*[\s\S]*?\*\/)/.exec(src.slice(i))
      if (!m) return
      i += m[0].length
    }
  }
  const value = (): unknown => {
    ws()
    const c = src[i]
    if (c === '{' || c === '[') {
      const obj = c === '{'
      const out: Record<string, unknown> | unknown[] = obj ? {} : []
      i++
      for (;;) {
        ws()
        if (src[i] === (obj ? '}' : ']')) return i++, out
        if (obj) {
          const key = /^(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|([A-Za-z_$][\w$]*|\d+))/.exec(src.slice(i))
          if (!key) throw fail
          i += key[0].length
          ws()
          if (src[i++] !== ':') throw fail
          const k = key[3] ?? unescape(key[1] ?? key[2]!)
          if (k === '__proto__' || k === 'constructor' || k === 'prototype') throw fail
          ;(out as Record<string, unknown>)[k] = value()
        } else (out as unknown[]).push(value())
        ws()
        if (src[i] === ',') i++
        else if (src[i] !== (obj ? '}' : ']')) throw fail
      }
    }
    const m = /^(?:"((?:\\.|[^"\\\n])*)"|'((?:\\.|[^'\\\n])*)'|(-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)(?![\w$])|(true|false|null)(?![\w$]))/.exec(src.slice(i))
    if (!m) throw fail
    i += m[0].length
    if (m[3] !== undefined) return Number(m[3])
    if (m[4] !== undefined) return m[4] === 'null' ? null : m[4] === 'true'
    return unescape(m[1] ?? m[2]!)
  }
  const unescape = (s: string) => s.replace(/\\(u\{?[0-9a-fA-F]+\}?|x[0-9a-fA-F]{2}|.)/g, (_, e: string) => {
    if (e[0] === 'u' || (e[0] === 'x' && e.length === 3)) return String.fromCodePoint(parseInt(e.replace(/[ux{}]/g, ''), 16))
    return ({ n: '\n', t: '\t', r: '\r' } as Record<string, string>)[e] ?? e
  })
  try {
    const v = value()
    ws()
    return i === src.length ? v : undefined
  } catch (e) {
    if (e === fail) return undefined
    throw e
  }
}

// --- page structure --------------------------------------------------------------------------------

type Script = { el: El; src?: string; body: string; module: boolean }

function scriptsOf(html: string, root: El): Script[] {
  const out: Script[] = []
  walk(root, (el) => {
    if (el.tag !== 'script') return
    const type = (attr(el, 'type') ?? '').trim().toLowerCase()
    // Only classic and module scripts run; a JSON or template block is data.
    if (type && type !== 'module' && !/^(text|application)\/(java|ecma)script$/.test(type)) return false
    out.push({ el, src: attr(el, 'src'), body: html.slice(el.openEnd, el.closeStart), module: type === 'module' })
    return false
  })
  return out
}

/** Every attribute of an element's opening tag in source order, the first of a repeated name winning (as in the DOM). */
function attrList(attrs: string): [string, string, string | null][] {
  const out: [string, string, string | null][] = [] // [name lowercased, raw source value, quote]
  const seen = new Set<string>()
  for (const m of attrs.matchAll(/([^\s"'>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
    const name = m[1]!.toLowerCase()
    if (seen.has(name)) continue
    seen.add(name)
    out.push([name, m[2] ?? m[3] ?? m[4] ?? '', m[2] !== undefined ? '"' : m[3] !== undefined ? "'" : null])
  }
  return out
}

const decode = (s: string) => s.replace(/&(amp|quot|#39|apos|lt|gt);/g, (_, e: string) => ({ amp: '&', quot: '"', '#39': "'", apos: "'", lt: '<', gt: '>' })[e]!)
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;')

function splice(html: string, edits: [number, number, string][]): string {
  let out = html
  for (const [from, to, text] of edits.sort((a, z) => z[0] - a[0])) out = out.slice(0, from) + text + out.slice(to)
  return out
}

// --- Lucide ----------------------------------------------------------------------------------------

// lucide's own toPascalCase: "bar-chart-2" -> "BarChart2".
function pascal(name: string): string {
  let out = ''
  let upper = false
  for (const ch of name) {
    if (ch === '-' || ch === '_' || ch <= ' ') {
      upper = out.length > 0
      continue
    }
    out += out.length === 0 ? ch.toLowerCase() : upper ? ch.toUpperCase() : ch
    upper = false
  }
  return out.charAt(0).toUpperCase() + out.slice(1)
}
const iconFor = (name: string): IconNode | undefined => (name ? ICONS[pascal(name)] : undefined)

const DEFAULTS: Record<string, string | number> = {
  xmlns: SVG_NS, width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
}

const nodeSvg = (tag: string, attrs: Record<string, string | number>, children: IconNode = []): string =>
  `<${tag}${Object.entries(attrs).map(([k, v]) => ` ${k}="${esc(String(v))}"`).join('')}>${children.map(([t, a]) => nodeSvg(t, a)).join('')}</${tag}>`

/** lucide's replaceElement, as markup: the same attributes, in the same order, the same merged class. */
function iconSvg(name: string, node: IconNode, rawAttrs: string, callAttrs: Record<string, string | number>): string {
  const el: Record<string, string> = {}
  for (const [k, v] of attrList(rawAttrs)) el[k] = decode(v)
  const a11y = Object.keys(el).some((k) => k.startsWith('aria-') || k === 'role' || k === 'title')
  const out: Record<string, string | number> = { ...DEFAULTS, 'data-lucide': name, ...(a11y ? {} : { 'aria-hidden': 'true' }), ...callAttrs, ...el }
  const classes = ['lucide', `lucide-${name}`, ...(el.class ?? '').split(' '), ...(typeof callAttrs.class === 'string' ? callAttrs.class.split(' ') : [])]
  const merged = classes.filter((c, i, all) => Boolean(c) && c.trim() !== '' && all.indexOf(c) === i).join(' ').trim()
  if (merged) out.class = merged
  return nodeSvg('svg', out, node)
}

/**
 * Where a createIcons call sits decides whether it runs while the page loads: at the top level, in a
 * plain block or an IIFE it does; in an event handler, a timer or an uncalled function it does not.
 * ponytail: brace scanning, not a JS parser — a brace inside a string can mislead it. Checked against
 * the lucide svgs Chrome drew on 1 800 eval screens (LP-06); a wrong guess shows as a stroke width.
 */
function runsOnLoad(script: string, at: number, depth = 0): boolean {
  const stack: number[] = [] // offsets of the open braces around `at`
  for (let i = 0; i < at; i++) {
    if (script[i] === '{') stack.push(i)
    else if (script[i] === '}') stack.pop()
  }
  // An arrow without braces handed to a listener or a timer: `on('load', () => lucide.createIcons())`.
  if (/(?:addEventListener|setTimeout|setInterval|requestAnimationFrame|\.then)\s*\([^;{}]*=>\s*[^;{}]*$/.test(script.slice(Math.max(0, at - 120), at))) return false
  for (const open of stack) {
    const head = script.slice(Math.max(0, open - 120), open).replace(/\s+/g, ' ')
    if (!/(?:function\b[^{};]*|=>\s*)$/.test(head)) continue // if/else/try/for: a plain block
    if (/\(\s*(?:async\s+)?(?:function\s*[\w$]*\s*\([^()]*\)|\([^()]*\)\s*=>|[\w$]+\s*=>)\s*$/.test(head) && !/(?:addEventListener|setTimeout|setInterval|requestAnimationFrame|\.then|forEach|map|filter|on\w+)\s*\(\s*(?:async\s+)?(?:function\s*[\w$]*\s*\([^()]*\)|\([^()]*\)\s*=>|[\w$]+\s*=>)\s*$/.test(head)) {
      continue // an IIFE's body runs now
    }
    const named = head.match(/function\s+([\w$]+)\s*\([^()]*\)\s*$/) ?? head.match(/(?:const|let|var)\s+([\w$]+)\s*=\s*(?:async\s+)?(?:function\b[^{};]*|\([^()]*\)\s*=>\s*|[\w$]+\s*=>\s*)$/)
    // A named function runs now when the script calls it, from somewhere that itself runs now.
    if (named && depth < 3) {
      const name = named[1]!.replace(/\$/g, '\\$')
      const calls = [...script.matchAll(new RegExp(`(?<![\\w$.])${name}\\s*\\(`, 'g'))].map((c) => c.index!).filter((i) => i > open || i < open - 120)
      if (calls.some((i) => !/function\s+$/.test(script.slice(Math.max(0, i - 12), i)) && runsOnLoad(script, i, depth + 1))) continue
    }
    return false
  }
  return true
}

type Call = { attrs: Record<string, string | number> | null; onLoad: boolean }

/** The createIcons calls of one script, with the attrs each passes (null: something we cannot read). */
function callsIn(script: string): Call[] {
  const out: Call[] = []
  for (const m of script.matchAll(/createIcons\s*\(/g)) {
    let depth = 1
    let j = m.index! + m[0].length
    while (j < script.length && depth > 0) depth += script[j] === '(' ? 1 : script[j] === ')' ? -1 : 0, j++
    const args = script.slice(m.index! + m[0].length, j - 1).trim()
    let attrs: Record<string, string | number> | null = null
    if (!args) attrs = {}
    else {
      const opts = parseLiteral(args) as Record<string, unknown> | undefined
      const a = opts && typeof opts === 'object' && !Array.isArray(opts) && Object.keys(opts).every((k) => k === 'attrs') ? (opts.attrs ?? {}) : undefined
      if (a && typeof a === 'object' && !Array.isArray(a) && Object.values(a).every((v) => typeof v === 'string' || typeof v === 'number')) attrs = a as Record<string, string | number>
    }
    out.push({ attrs, onLoad: runsOnLoad(script, m.index!) })
  }
  return out
}

// The part of lucide a screen's own scripts use: createIcons, for icons they insert after load. The
// table holds only the icons those scripts name, so this is a few KB instead of the whole library.
function lucideShim(table: Record<string, IconNode>): string {
  const t = JSON.stringify(table).replace(/</g, '\\u003c')
  return `<script data-od-lucide>window.lucide={createIcons:function(o){o=o||{};var I=${t},a=o.attrs||{},n=o.nameAttr||'data-lucide',S='${SVG_NS}';function mk(t,at,ch){var e=document.createElementNS(S,t);for(var k in at)e.setAttribute(k,String(at[k]));(ch||[]).forEach(function(c){e.appendChild(mk(c[0],c[1]))});return e}[].forEach.call((o.root||document).querySelectorAll('['+n+']'),function(el){if(el.namespaceURI===S)return;var name=el.getAttribute(n),node=I[name];if(!node)return;var ea={},y=false,k;[].forEach.call(el.attributes,function(x){ea[x.name]=x.value;if(x.name.indexOf('aria-')===0||x.name==='role'||x.name==='title')y=true});var at={xmlns:S,width:24,height:24,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':2,'stroke-linecap':'round','stroke-linejoin':'round','data-lucide':name};if(!y)at['aria-hidden']='true';for(k in a)at[k]=a[k];for(k in ea)at[k]=ea[k];var c=['lucide','lucide-'+name].concat((ea['class']||'').split(' '),typeof a['class']==='string'?a['class'].split(' '):[]).filter(function(v,i,r){return v&&v.trim()!==''&&r.indexOf(v)===i}).join(' ').trim();if(c)at['class']=c;el.parentNode&&el.parentNode.replaceChild(mk('svg',at,node),el)})}};</script>`
}

/** Icon names a script could insert: a data-lucide value written in a string, or a string that is an icon name. */
function scriptIconNames(script: string): string[] {
  const names = new Set<string>()
  for (const m of script.matchAll(/data-lucide\s*=\s*\\?["']([\w-]+)/g)) names.add(m[1]!)
  for (const m of script.matchAll(/(["'`])([a-z][a-z0-9-]{0,40})\1/gi)) names.add(m[2]!)
  return [...names].filter((n) => iconFor(n))
}

const BOOT = /^\s*lucide\.createIcons\(\{attrs:\{'stroke-width':[\d.]+\}\}\);?\s*$/

export function precompileIcons(html: string): string {
  const root = parseTree(html)
  const scripts = scriptsOf(html, root)
  // Only a UMD build defines window.lucide. A bare jsDelivr URL serves the CommonJS build, which throws
  // in a page (as does a dead host): those scripts never drew an icon and go with the rest.
  const libs = scripts.filter((s) => s.src && (/^https:\/\/[^/]+\/(?:npm\/)?lucide@[^/]+\/dist\/umd\//.test(s.src.trim()) || /^https:\/\/unpkg\.com\/lucide@[^/]+\/?$/.test(s.src.trim())))
  const dead = scripts.filter((s) => s.src && (/^https:\/\/cdn\.jsdelivr\.net\/npm\/lucide@[^/]+\/?$/.test(s.src.trim()) || /^https:\/\/cdn\.lucide\.dev\/?$/.test(s.src.trim())))
  if (libs.length === 0) return splice(html, dead.map((s): [number, number, string] => [s.el.start, s.el.end, '']))
  // A lucide from somewhere we do not recognise might be the one that runs first: left alone.
  if (scripts.some((s) => s.src && /lucide/i.test(s.src) && !libs.includes(s) && !dead.includes(s))) return html
  if (/\sicon-name\s*=/.test(html)) return html // lucide's deprecated attribute: left to the library
  const inline = scripts.filter((s) => s.src === undefined)
  const own = inline.filter((s) => !BOOT.test(s.body) && /\blucide\b/.test(s.body))
  // A script that reaches past createIcons (lucide.icons, lucide.createElement…) needs the library.
  if (own.some((s) => /\blucide\s*(?:\.\s*(?!createIcons\b)|\[)/.test(s.body.replace(/data-lucide|lucide-[\w-]+|['"]lucide['"]/g, '')))) return html
  // A script that looks the icons up while the page loads ran while they were still <i>; baked, it would
  // not find them. (A click handler looks after the library ran, and finds svgs either way.)
  const lookup = /\[data-lucide|['"]data-lucide['"]\s*[,)]|dataset\.lucide|getElementsByTagName\(\s*['"]i['"]|querySelector(?:All)?\(\s*['"`](?:[^'"`]*[\s>])?i(?:[.:[][^'"`]*)?['"`]\s*\)/g
  if (inline.some((s) => [...s.body.matchAll(lookup)].some((m) => runsOnLoad(s.body, m.index!)))) return html

  // The call that converts the icons already in the markup is the first one to run once a library is
  // loaded: the first on-load call after the first library tag, else the first call at all.
  const firstLib = libs[0]!.el.start
  const calls = inline.filter((s) => s.el.start > firstLib && !s.module).flatMap((s) => callsIn(s.body))
  const first = calls.find((c) => c.onLoad) ?? calls[0]
  if (!first) return html // a library nothing calls: the icons were never drawn
  if (!first.attrs || calls.some((c) => !c.attrs)) return html

  const edits: [number, number, string][] = []
  walk(root, (el) => {
    if (['script', 'style', 'template', 'noscript', 'textarea', 'title', 'svg'].includes(el.tag)) return false
    const name = attr(el, 'data-lucide')
    if (name === undefined) return
    const node = iconFor(decode(name))
    if (!node) return false // an unknown name: the library leaves it too
    edits.push([el.start, el.end, iconSvg(decode(name), node, el.attrs, first.attrs!)])
    return false
  })

  // Scripts that insert icons later get the shim in the first library's place, and the boot call stays
  // (it converts icons a load-time script inserted before it). Otherwise both go.
  const table: Record<string, IconNode> = {}
  // A script may also clone a <template>, whose icons the library would draw at that point.
  const templates = [...html.matchAll(/<template\b[\s\S]*?<\/template>/gi)].map((m) => m[0]).join('')
  for (const n of [...own.flatMap((s) => scriptIconNames(s.body)), ...[...templates.matchAll(/data-lucide\s*=\s*["']?([\w-]+)/g)].map((m) => m[1]!)]) if (iconFor(n)) table[n] = iconFor(n)!
  const shim = own.length > 0
  libs.forEach((lib, i) => edits.push([lib.el.start, lib.el.end, shim && i === 0 ? lucideShim(table) : '']))
  for (const s of dead) edits.push([s.el.start, s.el.end, ''])
  if (!shim) for (const s of inline) if (BOOT.test(s.body)) edits.push([s.el.start, s.el.end, ''])
  return splice(html, edits)
}

// --- Tailwind --------------------------------------------------------------------------------------

/** The class names the page carries, and the string literals of its scripts (classes they add at runtime). */
function twContent(html: string, root: El, scripts: Script[], skip: Script[]): { classes: string; scriptText: string } {
  const classes: string[] = []
  walk(root, (el) => {
    if (el.tag === 'script' || el.tag === 'style') return false
    const c = attr(el, 'class')
    if (c) classes.push(decode(c))
  })
  // Our own scripts (the icon shim, the icon boot, a config just read) hold no class names.
  const scriptText = scripts.filter((s) => s.src === undefined && !skip.includes(s) && attr(s.el, 'data-od-lucide') === undefined && !BOOT.test(s.body)).map((s) => s.body).join('\n')
  return { classes: classes.join(' '), scriptText }
}

async function compileTailwind(content: { classes: string; scriptText: string }, config: Record<string, unknown>): Promise<string> {
  const plugin = tailwind({
    ...config,
    // As the CDN does: the page's classes, split on whitespace, are the whole input.
    content: {
      files: [
        { raw: content.classes, extension: 'odclass' },
        { raw: content.scriptText, extension: 'js' },
      ],
      extract: { odclass: (s: string) => s.split(/\s+/) },
    },
    plugins: [],
  } as Parameters<typeof tailwind>[0])
  const result = await postcss([plugin, autoprefixer({ remove: false })]).process('@tailwind base;@tailwind components;@tailwind utilities;', { from: undefined })
  // Written compactly: whitespace between tokens only, values untouched.
  result.root.walkComments((c) => void c.remove())
  result.root.walk((node) => {
    node.raws.before = ''
    if (node.type === 'decl') node.raws.between = ':'
    if (node.type === 'rule' || node.type === 'atrule') {
      node.raws.after = ''
      node.raws.semicolon = false
    }
    if (node.type === 'rule') {
      node.raws.between = ''
      node.selector = node.selector.replace(/,\s*\n\s*/g, ',')
    }
  })
  result.root.raws.after = ''
  return result.root.toString().replace(/<\/(style)/gi, '<\\/$1')
}

/** An inline `tailwind.config = {…}` the CDN would have honoured, read as a literal; null when it is code. */
function readConfig(scripts: Script[], cdnAt: number): { config: Record<string, unknown>; scripts: Script[] } | null {
  const own = scripts.filter((s) => s.src === undefined && /\btailwind\b/.test(s.body))
  const config: Record<string, unknown> = {}
  const used: Script[] = []
  for (const s of own) {
    const m = /^\s*(?:window\.)?tailwind\.config\s*=\s*([\s\S]*?);?\s*$/.exec(s.body)
    if (!m) return null
    // Before the CDN script, `tailwind` is not defined yet: the assignment threw and was never seen.
    if (s.el.start < cdnAt) continue
    const v = parseLiteral(m[1]!)
    if (!v || typeof v !== 'object' || Array.isArray(v)) return null
    const plugins = (v as Record<string, unknown>).plugins
    if (plugins !== undefined && !(Array.isArray(plugins) && plugins.length === 0)) return null
    // The last assignment wins: each one replaces the whole config.
    for (const k of Object.keys(config)) delete config[k]
    Object.assign(config, v)
    used.push(s)
  }
  return { config, scripts: used }
}

export async function precompileTailwind(html: string): Promise<string> {
  const cdn = [...html.matchAll(TW_CDN)]
  const compiled = TW_SHEET.test(html)
  if (cdn.length === 0 && !compiled) return html
  // A plugin the CDN was asked for (?plugins=forms) is not reproduced here; that page keeps the CDN.
  if (cdn.some((m) => /cdn\.tailwindcss\.com[^"'\s>]*\?/.test(m[0]))) return html
  if (/type\s*=\s*["']?text\/tailwindcss/i.test(html)) return html
  const root = parseTree(html)
  const scripts = scriptsOf(html, root)
  const read = cdn.length ? readConfig(scripts, cdn[0]!.index!) : { config: {}, scripts: [] }
  if (!read) return html
  // An already compiled screen carries its config as a data attribute, since its script is gone.
  const kept = html.match(/<style data-od-tw data-od-tw-config="([^"]*)"/)
  const config = cdn.length ? read.config : kept ? (JSON.parse(decode(kept[1]!)) as Record<string, unknown>) : {}

  const css = await compileTailwind(twContent(html, root, scripts, read.scripts), config)
  const configAttr = Object.keys(config).length ? ` data-od-tw-config="${esc(JSON.stringify(config))}"` : ''
  const sheet = `<style data-od-tw${configAttr}>${css}</style>`

  const edits: [number, number, string][] = [...cdn.map((m): [number, number, string] => [m.index!, m.index! + m[0].length, '']), ...read.scripts.map((s): [number, number, string] => [s.el.start, s.el.end, ''])]
  let out = splice(html, edits).replace(/<style data-od-tw\b[^>]*>[\s\S]*?<\/style>/gi, '')
  // The CDN appends its sheet to the end of <head> once the body exists: after every head style.
  out = /<\/head>/i.test(out) ? out.replace(/<\/head>/i, () => `${sheet}</head>`) : /<body\b/i.test(out) ? out.replace(/<body\b/i, (m) => `${sheet}${m}`) : sheet + out
  return out
}

/** The whole step: ready icons, then ready CSS (which sees the icons' classes). */
export async function precompileScreen(html: string): Promise<string> {
  if (!html) return html
  return precompileTailwind(precompileIcons(html))
}

/**
 * The screen as the model wrote it, for a model to edit: the compiled sheet back to the CDN tag, the
 * icons back to `<i data-lucide>`, the shim back to the library. Saving the edit precompiles again.
 * Element ids agree with the stored HTML's (annotateElements skips style, script, svg and i alike).
 */
export function sourceView(html: string): string {
  let out = html.replace(/<style data-od-tw\b([^>]*)>[\s\S]*?<\/style>/gi, (_, attrs: string) => {
    const config = attrs.match(/data-od-tw-config="([^"]*)"/)
    return `<script src="https://cdn.tailwindcss.com"></script>${config ? `<script>tailwind.config = ${decode(config[1]!).replace(/</g, '\\u003c')}</script>` : ''}`
  })
  out = out.replace(/<script data-od-lucide>[\s\S]*?<\/script>/gi, '<script src="https://cdn.jsdelivr.net/npm/lucide@1.47.0/dist/umd/lucide.min.js"></script>')
  const root = parseTree(out)
  const edits: [number, number, string][] = []
  walk(root, (el) => {
    if (el.tag !== 'svg') return
    const name = attr(el, 'data-lucide')
    if (name === undefined || !/(^|\s)lucide(\s|$)/.test(attr(el, 'class') ?? '')) return false
    const list = attrList(el.attrs)
    const a11y = list.some(([k]) => (k.startsWith('aria-') && k !== 'aria-hidden') || k === 'role' || k === 'title')
    const keep = list.filter(([k, v]) => {
      if (k === 'data-lucide') return false
      if (k === 'stroke-width') return !(Number(v) >= 1 && Number(v) <= 3) // the normalizer sets these
      // A default createIcons adds again; a value the element set itself (fill="currentColor") stays.
      if (k !== 'stroke-width' && String(DEFAULTS[k === 'viewbox' ? 'viewBox' : k] ?? '') === decode(v)) return false
      if (k === 'aria-hidden') return a11y
      return true
    })
    const parts = keep.map(([k, v, q]) => {
      if (k === 'class') v = v.split(' ').filter((c) => c !== 'lucide' && c !== `lucide-${decode(name)}`).join(' ').trim()
      return k === 'class' && !v ? '' : q ? ` ${k}=${q}${v}${q}` : v ? ` ${k}=${v}` : ` ${k}`
    })
    edits.push([el.start, el.end, `<i data-lucide="${name}"${parts.join('')}></i>`])
    return false
  })
  return splice(out, edits)
}
