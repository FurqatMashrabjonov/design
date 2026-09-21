// Injected into a screen's iframe on the preview page. The shell marks every tab with
// data-od-tab and the back button with data-od-back, and the model marks in-content taps that
// open another screen with data-od-link, so wiring needs no per-app knowledge.
export const PREVIEW_BRIDGE = `
<style id="__od_preview_bridge">
  [data-od-tab], [data-od-back], [data-od-link] { cursor: pointer !important; }
  html { -webkit-tap-highlight-color: transparent; }
</style>
<script id="__od_nav_bridge">
  document.addEventListener('click', function (e) {
    var back = e.target.closest('[data-od-back]');
    if (back) {
      e.preventDefault();
      window.parent.postMessage({ type: 'od:navigate_back', parentName: back.getAttribute('data-od-back') }, '*');
      return;
    }
    var tab = e.target.closest('[data-od-tab]');
    if (tab) {
      e.preventDefault();
      window.parent.postMessage({ type: 'od:navigate_tab', tabId: tab.getAttribute('data-od-tab') }, '*');
      return;
    }
    var link = e.target.closest('[data-od-link]');
    if (!link) return;
    e.preventDefault();
    window.parent.postMessage({ type: 'od:navigate_link', name: link.getAttribute('data-od-link') }, '*');
  }, true);
</script>
`

export function withPreviewBridge(html: string): string {
  return html.includes('</body>') ? html.replace('</body>', `${PREVIEW_BRIDGE}</body>`) : html + PREVIEW_BRIDGE
}

export type PreviewScreen = {
  id: string
  name: string
  x: number
  screenType: string
  activeTabId: string | null
  parentScreenName: string | null
}

/** Left-to-right canvas order is the order the planner laid the app out in. */
export function orderScreens<T extends PreviewScreen>(screens: T[]): T[] {
  return [...screens].sort((a, b) => a.x - b.x)
}

/** Where a tab tap should land: the root screen that claims that tab. */
export function screenForTab<T extends PreviewScreen>(screens: T[], tabId: string): T | undefined {
  return screens.find((s) => s.screenType === 'root-tab' && s.activeTabId === tabId)
}

const norm = (s: string) => s.toLowerCase().replace(/&amp;/g, '&').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()

/**
 * A screen by the name the plan gave it. Stored names are the model's own titles ("Dish Detail —
 * GoBite"), so an exact match is tried first, then the planned name inside the title (or the
 * reverse), then the largest share of the wanted words.
 */
export function screenByName<T extends PreviewScreen>(screens: T[], name: string): T | undefined {
  const want = norm(name)
  if (!want) return undefined
  const exact = screens.find((s) => norm(s.name) === want)
  if (exact) return exact
  const contains = screens.filter((s) => norm(s.name).includes(want) || want.includes(norm(s.name)))
  if (contains.length > 0) return contains.sort((a, b) => a.name.length - b.name.length)[0]
  const words = want.split(' ')
  const scored = screens.map((s) => ({ s, hit: words.filter((w) => norm(s.name).split(' ').includes(w)).length / words.length }))
  const best = scored.sort((a, b) => b.hit - a.hit)[0]
  return best && best.hit >= 0.6 ? best.s : undefined
}

/** Where Back should land: the named parent, else the app's first root screen. */
export function screenForBack<T extends PreviewScreen>(screens: T[], parentName: string): T | undefined {
  return screenByName(screens, parentName) ?? screens.find((s) => s.screenType === 'root-tab')
}
