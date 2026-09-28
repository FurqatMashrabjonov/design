import { createContext, useContext } from 'react'
import { Tabbar, TabbarLink, ToolbarPane } from 'konsta/react'
import { House, Search, Heart, User, CircleUser, Settings, Bell, Calendar, ChartColumn, ListChecks, ShoppingBag, ShoppingCart, MessageCircle, Map, Compass, Wallet, CreditCard, BookOpen, Dumbbell, Utensils, Music, Play, Camera, Image, Star, Bookmark, Inbox, Layers, Grid2x2, Sparkles, Activity, Target, Plane, Ticket, Users, Briefcase, GraduationCap, Leaf, Droplets, Footprints } from 'lucide-react'

// One screen is drawn per frame; the host (canvas, preview) owns the app's navigation. A tap asks the
// host to move — push, pop or a tab — and the host shows that screen's frame. `tabs` come from the plan.
const Ctx = createContext({ tabs: [], screen: '', photos: {}, nav: null })
export const AppContext = Ctx.Provider
/** The photos the host looked up for this screen, by normalised query (PhotoService.photoKey). */
export const usePhotos = () => useContext(Ctx).photos ?? {}

const ask = (action, id, params) => window.parent !== window && window.parent.postMessage({ type: 'od:nav', action, id, params }, '*')
/** push / pop / reset between the app's screens. In the studio a tap asks the host (the frame posts od:nav);
 *  in an exported app the Navigator puts its own stack in the context, and the same screen code drives it. */
export function useNav() {
  const { screen, nav } = useContext(Ctx)
  if (nav) return nav
  return {
    push: (id, params = {}) => ask('push', id, params),
    pop: () => ask('pop'),
    reset: (id) => ask('reset', id),
    current: { name: screen, params: {} },
  }
}

// The planner names each tab's icon from this set (TAB_ICONS); an unknown name falls back to House.
const ICONS = { House, Search, Heart, User, CircleUser, Settings, Bell, Calendar, ChartColumn, ListChecks, ShoppingBag, ShoppingCart, MessageCircle, Map, Compass, Wallet, CreditCard, BookOpen, Dumbbell, Utensils, Music, Play, Camera, Image, Star, Bookmark, Inbox, Layers, Grid2x2, Sparkles, Activity, Target, Plane, Ticket, Users, Briefcase, GraduationCap, Leaf, Droplets, Footprints }
export const TAB_ICONS = Object.keys(ICONS)
const iconOf = (name) => ICONS[name] ?? House
export function AppTabbar({ active }) {
  const { tabs } = useContext(Ctx)
  const nav = useNav()
  if (!tabs.length) return null
  return (
    <Tabbar labels icons className="left-0 bottom-0 fixed">
      <ToolbarPane>
        {tabs.map((t) => {
          const I = iconOf(t.icon)
          return <TabbarLink key={t.id} active={active === t.id} onClick={() => active !== t.id && nav.reset(t.id)}
            icon={<I className="w-6 h-6" strokeWidth={active === t.id ? 2.4 : 1.8} />} label={t.label} />
        })}
      </ToolbarPane>
    </Tabbar>
  )
}
