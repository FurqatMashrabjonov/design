import { useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from 'konsta/react'
import './styles.css'
import { StoreProvider, useStore } from './store.jsx'
import { Navigator } from './nav.jsx'
import { Welcome, Goals, Permissions } from './screens/onboarding.jsx'
import { SignUp, LogIn, Forgot } from './screens/auth.jsx'
import { Today } from './screens/today.jsx'
import { Habits, Habit, AddHabit } from './screens/habits.jsx'
import { Steps, Water } from './screens/body.jsx'
import { Insights, Awards, Profile, EditProfile, Settings, NotifSettings, Appearance, Premium, Inbox } from './screens/me.jsx'

const SCREENS = {
  welcome: Welcome, goals: Goals, permissions: Permissions, signup: SignUp, login: LogIn, forgot: Forgot,
  today: Today, habits: Habits, habit: Habit, addHabit: AddHabit, steps: Steps, water: Water,
  insights: Insights, awards: Awards, profile: Profile, editProfile: EditProfile, settings: Settings,
  notifSettings: NotifSettings, appearance: Appearance, premium: Premium, inbox: Inbox,
}

// The gallery: every screen, in the order a person meets them.
const GALLERY = [
  ['welcome', 'Onboarding 1', {}], ['welcome', 'Onboarding 2', { slide: 1 }], ['welcome', 'Onboarding 3', { slide: 2 }],
  ['signup', 'Sign up'], ['login', 'Log in'], ['forgot', 'Forgot password'], ['goals', 'Goals'], ['permissions', 'Permissions'],
  ['today', 'Today'], ['habits', 'Habits'], ['habit', 'Habit detail', { id: 'meditate' }], ['addHabit', 'New habit'],
  ['steps', 'Steps'], ['water', 'Water'], ['insights', 'Insights'], ['awards', 'Awards'], ['profile', 'Profile'],
  ['editProfile', 'Edit profile'], ['settings', 'Settings'], ['notifSettings', 'Notifications'], ['appearance', 'Appearance'],
  ['premium', 'Premium'], ['inbox', 'Activity'],
]

function Phone({ start, params, dark }) {
  const { state, dispatch } = useStore()
  useEffect(() => { if (dark != null) dispatch({ type: 'setting', key: 'dark', value: dark }) }, [dark])
  const isDark = state.settings.dark
  useEffect(() => { document.documentElement.classList.toggle('dark', isDark) }, [isDark])
  return (
    <App theme="ios" dark={isDark} safeAreas className={isDark ? 'dark' : ''} style={{ '--color-primary': state.settings.accent }}>
      <Navigator screens={SCREENS} initial={{ name: start, params }} />
    </App>
  )
}

const q = new URLSearchParams(location.search)
if (q.has('screen')) document.documentElement.classList.add('vs-static')
const root = createRoot(document.getElementById('root'))
if (q.get('screen') || q.get('live')) {
  const start = q.get('screen') || 'welcome'
  const params = q.get('p') ? JSON.parse(q.get('p')) : {}
  root.render(<StoreProvider><Phone start={start} params={params} dark={q.get('dark') === '1' ? true : null} /></StoreProvider>)
} else {
  document.body.style.cssText = 'margin:0;overflow:auto;background:#0f0e0d;color:#f2efe9;font:15px/1.5 -apple-system,system-ui,sans-serif'
  const frame = { width: 390, height: 844, border: 0, borderRadius: 48, background: '#fff', boxShadow: '0 0 0 10px #1c1b1a, 0 0 0 11px #3a3836, 0 30px 60px -20px rgba(0,0,0,.6)' }
  root.render(
    <main style={{ padding: '48px 40px 80px', maxWidth: 1800, margin: '0 auto' }}>
      <div style={{ display: 'flex', gap: 56, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 72 }}>
        <div style={{ maxWidth: 520, paddingTop: 40 }}>
          <div style={{ fontSize: 14, opacity: 0.55, letterSpacing: 0.3 }}>Konsta UI v5 · iOS 26 · React + Tailwind v4</div>
          <h1 style={{ fontSize: 52, lineHeight: 1.05, margin: '12px 0 16px', letterSpacing: -1 }}>Vita — habits, steps and water</h1>
          <p style={{ opacity: 0.7, fontSize: 17 }}>A complete app, onboarding to settings: 23 screens. The phone on the right is live — tap through it. Check off habits (finish them all for confetti), add water, switch to dark mode or a new accent in Profile → Appearance, open the menus and sheets.</p>
          <p style={{ opacity: 0.5, fontSize: 14 }}>Every screen is listed below as well.</p>
        </div>
        <iframe title="live" src="?live=1" style={frame} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, 390px)', gap: '64px 44px', justifyContent: 'center' }}>
        {GALLERY.map(([s, label, p], i) => (
          <figure key={i} style={{ margin: 0 }}>
            <iframe title={label} loading="lazy" src={`?screen=${s}${p ? `&p=${encodeURIComponent(JSON.stringify(p))}` : ''}`} style={frame} />
            <figcaption style={{ textAlign: 'center', marginTop: 20, opacity: 0.65 }}>{String(i + 1).padStart(2, '0')} · {label}</figcaption>
          </figure>
        ))}
      </div>
    </main>,
  )
}
