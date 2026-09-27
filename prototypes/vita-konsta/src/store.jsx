import { createContext, useContext, useReducer } from 'react'

export const COLORS = { steps: '#ff9f0a', water: '#0a84ff', habits: '#30d158', sleep: '#5e5ce6', mind: '#bf5af2', pink: '#ff375f' }
export const ACCENTS = [
  ['Indigo', '#5e5ce6'], ['Blue', '#0a84ff'], ['Green', '#30d158'], ['Orange', '#ff9f0a'], ['Pink', '#ff375f'], ['Purple', '#bf5af2'],
]

const initial = {
  user: { name: 'Aziza Karimova', email: 'aziza@vita.app', city: 'Tashkent', joined: 'March 2026', avatarColor: '#ff9f0a' },
  settings: { dark: false, accent: '#5e5ce6', reminders: true, dailySummary: true, streakAlerts: true, sound: false, units: 'metric', weekStart: 'Monday' },
  steps: { today: 7843, goal: 10000, week: [6210, 9120, 10432, 5480, 11206, 8120, 7843], distance: 5.8, kcal: 312, minutes: 64 },
  water: { ml: 1500, goal: 2500, log: [['07:40', 250], ['09:15', 500], ['12:30', 250], ['15:05', 500]] },
  habits: [
    { id: 'meditate', name: 'Meditate', emoji: '🧘', color: COLORS.mind, goal: '10 min', total: 1, done: 1, streak: 41, best: 41, part: 'Morning', week: [1, 1, 1, 1, 1, 1, 1] },
    { id: 'run', name: 'Morning run', emoji: '🏃', color: COLORS.pink, goal: '5 km', total: 1, done: 1, streak: 23, best: 31, part: 'Morning', week: [1, 1, 0, 1, 1, 1, 1] },
    { id: 'vitamins', name: 'Vitamins', emoji: '💊', color: COLORS.steps, goal: '1 time', total: 1, done: 0, streak: 12, best: 20, part: 'Morning', week: [1, 1, 1, 0, 1, 1, 0] },
    { id: 'read', name: 'Read', emoji: '📖', color: COLORS.sleep, goal: '20 pages', total: 20, done: 12, streak: 8, best: 19, part: 'Evening', week: [1, 0, 1, 1, 1, 0, 0] },
    { id: 'journal', name: 'Journal', emoji: '✍️', color: COLORS.water, goal: '1 entry', total: 1, done: 0, streak: 3, best: 14, part: 'Evening', week: [0, 1, 1, 0, 0, 1, 0] },
    { id: 'nosugar', name: 'No sugar', emoji: '🍭', color: COLORS.habits, goal: 'all day', total: 1, done: 0, streak: 5, best: 9, part: 'Anytime', week: [1, 1, 1, 1, 1, 0, 0] },
  ],
  inbox: [
    { id: 1, icon: '🔥', title: '41-day streak!', text: 'Meditate is your longest streak yet. Keep it going.', time: '8m' },
    { id: 2, icon: '💧', title: 'Time for water', text: 'You are 1,000 ml away from today’s goal.', time: '1h' },
    { id: 3, icon: '🏅', title: 'New award: Early Bird', text: 'Five morning runs before 7 AM this month.', time: 'Yesterday' },
    { id: 4, icon: '📈', title: 'Weekly summary is ready', text: 'You completed 86% of your habits — up 9% from last week.', time: 'Mon' },
  ],
  premium: false,
}

function reducer(s, a) {
  switch (a.type) {
    case 'toggleHabit':
      return { ...s, habits: s.habits.map((h) => (h.id === a.id ? { ...h, done: h.done >= h.total ? 0 : h.total, streak: h.done >= h.total ? h.streak - 1 : h.streak + 1 } : h)) }
    case 'stepHabit':
      return { ...s, habits: s.habits.map((h) => (h.id === a.id ? { ...h, done: Math.max(0, Math.min(h.total, h.done + a.by)) } : h)) }
    case 'addHabit':
      return { ...s, habits: [...s.habits, { streak: 0, best: 0, done: 0, total: 1, week: [0, 0, 0, 0, 0, 0, 0], part: 'Anytime', ...a.habit }] }
    case 'deleteHabit':
      return { ...s, habits: s.habits.filter((h) => h.id !== a.id) }
    case 'addWater': {
      const now = new Date(2026, 8, 27, 16, 20 + s.water.log.length * 7)
      return { ...s, water: { ...s.water, ml: Math.max(0, s.water.ml + a.ml), log: a.ml > 0 ? [...s.water.log, [now.toTimeString().slice(0, 5), a.ml]] : s.water.log.slice(0, -1) } }
    }
    case 'setting':
      return { ...s, settings: { ...s.settings, [a.key]: a.value } }
    case 'user':
      return { ...s, user: { ...s.user, ...a.user } }
    case 'premium':
      return { ...s, premium: true }
    case 'clearInbox':
      return { ...s, inbox: s.inbox.filter((n) => n.id !== a.id) }
    default:
      return s
  }
}

const Ctx = createContext(null)
export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initial)
  return <Ctx.Provider value={{ state, dispatch }}>{children}</Ctx.Provider>
}
export const useStore = () => useContext(Ctx)
export const fmt = (n) => n.toLocaleString('en-US')
export const TODAY = 'Sunday, September 27'
