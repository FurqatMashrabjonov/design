import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const BASE_PROMPT = `You are an expert product designer and front-end engineer, like Google Stitch.
Given a brief, you design ONE polished, production-quality UI screen.

Output rules:
- Reply with exactly one block: <artifact title="Short screen name">...full HTML document...</artifact>
- No text before or after the block.
- The HTML is a single self-contained file starting with <!doctype html>.
- Use Tailwind via <script src="https://cdn.tailwindcss.com"></script>. No other scripts or CSS files except Google Fonts.
- Icons: inline SVG only. Images: use https://placehold.co/WIDTHxHEIGHT or CSS gradients.
- Realistic content (real-sounding names, numbers, copy). Never lorem ipsum.
- Follow the design system below strictly: its colors, type, spacing, radius, and component rules.`

const DEVICE = {
  desktop: 'Target: desktop web, 1440px wide viewport.',
  mobile: 'Target: mobile app screen, 390px wide viewport, touch-sized controls, bottom navigation if it fits.',
}

export function systemPrompt(designSystem: string, device: string) {
  const ds = readFileSync(join(process.cwd(), 'design-systems', designSystem, 'DESIGN.md'), 'utf8')
  return `${BASE_PROMPT}\n\n${DEVICE[device as keyof typeof DEVICE] ?? DEVICE.desktop}\n\n# Design system\n\n${ds}`
}

export async function complete(system: string, user: string) {
  const key = process.env.DEEPSEEK_API_KEY
  if (!key) throw new Error('DEEPSEEK_API_KEY is not set in .env')

  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
      max_tokens: 8192,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  })
  if (!res.ok) throw new Error(`DeepSeek ${res.status}: ${await res.text()}`)
  const json = await res.json()
  return json.choices[0].message.content as string
}

// Pull the HTML out of the model reply. Models sometimes skip the <artifact> tag or use a ```html fence.
export function extractArtifact(text: string) {
  const tag = text.match(/<artifact(?:\s+title="([^"]*)")?[^>]*>([\s\S]*?)(?:<\/artifact>|$)/i)
  if (tag) return { title: tag[1] || 'Untitled', html: stripFence(tag[2]) }
  const fence = text.match(/```html\s*([\s\S]*?)(?:```|$)/i)
  const html = fence ? fence[1] : text
  const title = html.match(/<title>([^<]*)<\/title>/i)?.[1] || 'Untitled'
  return { title, html: html.trim() }
}

function stripFence(s: string) {
  return s.replace(/^\s*```html\s*/i, '').replace(/```\s*$/, '').trim()
}
