// FIG-02: "Copy to Figma". Reads the screen's layer tree from its frame, puts the photos inside
// (so Figma does not have to fetch them), and copies the SVG as text — Figma turns pasted SVG
// markup into editable layers. Browser-only.
import { embedImages, odToSvg } from './figma-svg.ts'
import type { ODTree } from './figma-serialize.ts'

/** A photo as a data URL, or null (the SVG then keeps the link). Only Pexels photos are fetched,
 *  at twice the size they are drawn (sharp on retina, not a megabyte on the clipboard). */
export async function photoAsDataUrl(url: string, width = 400): Promise<string | null> {
  if (!/^https:\/\/images\.pexels\.com\//.test(url)) return null
  try {
    const u = new URL(url)
    u.searchParams.set('w', String(Math.min(800, Math.max(96, Math.ceil((width * 2) / 50) * 50))))
    const res = await fetch(u.href, { mode: 'cors' })
    if (!res.ok) return null
    const blob = await res.blob()
    return await new Promise((resolve) => {
      const r = new FileReader()
      r.onload = () => resolve(typeof r.result === 'string' ? r.result : null)
      r.onerror = () => resolve(null)
      r.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

export async function treeToFigmaSvg(tree: ODTree): Promise<string> {
  return odToSvg(await embedImages(tree, photoAsDataUrl))
}

export async function copyTreeToFigma(tree: ODTree): Promise<{ bytes: number }> {
  const svg = await treeToFigmaSvg(tree)
  await navigator.clipboard.writeText(svg)
  return { bytes: svg.length }
}
