// @od/kit — Vita's ui + nav plus a mount() for one screen. Seed of KON-02.
import { createRoot } from 'react-dom/client'
import { App } from 'konsta/react'
import { Navigator } from '../src/nav.jsx'
import './runtime.css'
export * from '../src/ui.jsx'
export { useNav, AppTabbar, TABS, Navigator } from '../src/nav.jsx'

/** Renders one screen component inside Konsta's <App>. Returns the React root. */
export function mount(Screen, { dark = false, accent = '#5e5ce6', theme = 'ios', el = document.getElementById('root') } = {}) {
  document.documentElement.classList.toggle('dark', dark)
  // ponytail: single-screen render — every push/reset lands on the same screen; a real navigator arrives with KON-07
  const screens = new Proxy({}, { get: () => Screen })
  const root = createRoot(el)
  root.render(
    <App theme={theme} dark={dark} safeAreas className={dark ? 'dark' : ''} style={{ '--color-primary': accent }}>
      <Navigator screens={screens} initial={{ name: 'screen', params: {} }} />
    </App>,
  )
  return root
}
