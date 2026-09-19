// Injected into a screen's iframe on the preview page. The shell marks every tab with
// data-od-tab and the back button with data-od-back, so wiring needs no per-app knowledge.
export const PREVIEW_BRIDGE = `
<style id="__od_preview_bridge">
  [data-od-tab], [data-od-back] { cursor: pointer !important; }
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
    if (!tab) return;
    e.preventDefault();
    window.parent.postMessage({ type: 'od:navigate_tab', tabId: tab.getAttribute('data-od-tab') }, '*');
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

/** Where Back should land: the named parent, else the app's first root screen. */
export function screenForBack<T extends PreviewScreen>(screens: T[], parentName: string): T | undefined {
  return screens.find((s) => s.name === parentName) ?? screens.find((s) => s.screenType === 'root-tab')
}
