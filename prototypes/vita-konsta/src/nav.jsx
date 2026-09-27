import { createContext, useContext, useRef, useState } from 'react'
import { Tabbar, TabbarLink, ToolbarPane } from 'konsta/react'
import { House, ListChecks, ChartColumn, CircleUser } from 'lucide-react'

// A stack navigator with the iOS push/pop motion. Screens are components looked up by name.
const NavCtx = createContext(null)
export const useNav = () => useContext(NavCtx)
let uid = 0

export function Navigator({ screens, initial }) {
  const [stack, setStack] = useState([{ ...initial, key: ++uid, anim: document.documentElement.classList.contains('vs-static') ? 'none' : 'fade' }])
  const [leaving, setLeaving] = useState(null)
  const busy = useRef(false)
  const nav = {
    push: (name, params = {}) => setStack((s) => [...s, { name, params, key: ++uid, anim: 'push' }]),
    pop: () => {
      if (busy.current) return
      setStack((s) => {
        if (s.length < 2) return s
        busy.current = true
        setLeaving(s[s.length - 1])
        setTimeout(() => {
          setLeaving(null)
          busy.current = false
        }, 340)
        return s.slice(0, -1)
      })
    },
    // A new flow (after onboarding, a tab): no history behind it.
    reset: (name, params = {}, anim = 'fade') => setStack([{ name, params, key: ++uid, anim }]),
    current: stack[stack.length - 1],
  }
  const render = (r, cls) => {
    const Screen = screens[r.name]
    return (
      <div key={r.key} className={`vs-screen ${cls}`}>
        <Screen {...r.params} />
      </div>
    )
  }
  return (
    <NavCtx.Provider value={nav}>
      <div className="vs-stack">
        {stack.map((r, i) => {
          const top = i === stack.length - 1
          if (i < stack.length - 2 && !top) return null // only the page underneath stays drawn
          return render(r, top ? (r.anim === 'push' ? 'vs-top vs-push' : r.anim === 'fade' ? 'vs-top vs-fade' : 'vs-top') : 'vs-under')
        })}
        {leaving && render(leaving, 'vs-pop')}
      </div>
    </NavCtx.Provider>
  )
}

export const TABS = [
  ['today', 'Today', House],
  ['habits', 'Habits', ListChecks],
  ['insights', 'Insights', ChartColumn],
  ['profile', 'Profile', CircleUser],
]

export function AppTabbar({ active }) {
  const nav = useNav()
  return (
    <Tabbar labels icons className="left-0 bottom-0 fixed">
      <ToolbarPane>
        {TABS.map(([id, label, I]) => (
          <TabbarLink key={id} active={active === id} onClick={() => active !== id && nav.reset(id, {}, 'none')}
            icon={<I className="w-6 h-6" strokeWidth={active === id ? 2.4 : 1.8} />} label={label} />
        ))}
      </ToolbarPane>
    </Tabbar>
  )
}
