import { readdirSync, readFileSync } from 'node:fs'
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

const DS_DIR = join(process.cwd(), 'design-systems')

// Label = first "# " heading of DESIGN.md
export function listDesignSystems() {
  return readdirSync(DS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => ({ id: d.name, name: readDesignSystem(d.name).match(/^#\s+(.+)$/m)?.[1] ?? d.name }))
}

function readDesignSystem(id: string) {
  return readFileSync(join(DS_DIR, id, 'DESIGN.md'), 'utf8')
}

// Callers must pass a validated id (see listDesignSystems) — it becomes a file path.
export function systemPrompt(designSystem: string, device: string) {
  const deviceRule = DEVICE[device as keyof typeof DEVICE] ?? DEVICE.desktop
  return `${BASE_PROMPT}\n\n${deviceRule}\n\n# Design system\n\n${readDesignSystem(designSystem)}`
}

// Yields text deltas from DeepSeek's OpenAI-compatible SSE stream.
export async function* streamCompletion(system: string, user: string) {
  const key = process.env.DEEPSEEK_API_KEY
  if (!key) throw new Error('DEEPSEEK_API_KEY is not set in .env')

  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
      max_tokens: 8192,
      stream: true,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  })
  if (!res.ok || !res.body) throw new Error(`DeepSeek ${res.status}: ${await res.text()}`)

  let buf = ''
  for await (const chunk of res.body.pipeThrough(new TextDecoderStream())) {
    buf += chunk
    const lines = buf.split('\n')
    buf = lines.pop()!
    for (const line of lines) {
      if (!line.startsWith('data:')) continue // skips ": keep-alive" comments and blank lines
      const payload = line.slice(5).trim()
      if (payload === '[DONE]') return
      const choice = JSON.parse(payload).choices?.[0]
      if (choice?.delta?.content) yield choice.delta.content as string
      if (choice?.finish_reason === 'length') throw new Error('Output hit max_tokens, HTML is incomplete. Try a simpler screen.')
    }
  }
}
