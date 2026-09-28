import { useState } from 'react'
import { Page, Navbar, NavbarBackLink, Block, BlockTitle, List, ListItem, ListInput, ListButton, Link, Segmented, SegmentedButton, Toggle, Radio, Button, Card, Dialog, DialogButton, Notification } from 'konsta/react'
import { Bell, Moon, Palette, Ruler, CalendarDays, HeartPulse, Lock, CircleHelp, Star, LogOut, Crown, Mail, User, MapPin, Volume2, Trophy, Flame, Download, Trash2 } from 'lucide-react'
import { useNav, AppTabbar, Ring, Bars, Area, Avatar, Tile, CountUp } from '@od/kit'

const COLORS = { steps: '#ff9f0a', water: '#0a84ff', habits: '#30d158', sleep: '#5e5ce6', mind: '#bf5af2', pink: '#ff375f' }
const ACCENTS = [
  ['Indigo', '#5e5ce6'], ['Blue', '#0a84ff'], ['Green', '#30d158'], ['Orange', '#ff9f0a'], ['Pink', '#ff375f'], ['Purple', '#bf5af2'],
]
const state = {
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
const fmt = (n) => n.toLocaleString('en-US')
const TODAY = 'Sunday, September 27'
const dispatch = () => {}

const AWARDS = [
  ['🔥', 'On Fire', '7-day streak', 1], ['🌅', 'Early Bird', '5 runs before 7 AM', 1], ['💧', 'Hydrated', 'Water goal 7 days', 1], ['🧘', 'Zen', '30 days of meditation', 1],
  ['👟', '100K Club', '100,000 steps in a week', 1], ['📚', 'Bookworm', '500 pages read', 1], ['⚡', 'Perfect Week', 'Every habit, 7 days', 1], ['🏔️', 'Summit', '20,000 steps in a day', 1],
  ['🎯', 'Sharpshooter', '90% for a month', 1], ['🌙', 'Night Owl', '30 evening check-ins', 0], ['🏆', 'Legend', '100-day streak', 0], ['💎', 'Diamond', 'A full year', 0],
]
export default function Profile() {
  const nav = useNav()
  const u = state.user
  return (
    <Page className="pb-32">
      <Navbar large transparent title="Profile" right={<Link onClick={() => nav.push('editProfile')}>Edit</Link>} />
      <Block className="flex items-center gap-4 !mt-2">
        <Avatar name={u.name} color={u.avatarColor} size={72} />
        <div>
          <div className="text-xl font-bold">{u.name}</div>
          <div className="opacity-60 text-sm">{u.city} · since {u.joined}</div>
          {state.premium ? <span className="inline-flex items-center gap-1 text-xs font-semibold mt-1 px-2 py-0.5 rounded-full text-white" style={{ background: 'linear-gradient(90deg,#ff9f0a,#ff375f)' }}><Crown className="w-3 h-3" /> Premium</span> : null}
        </div>
      </Block>
      <div className="grid grid-cols-3 gap-3 px-4">
        {[['41', 'Best streak', Flame, COLORS.pink], ['1.2M', 'Total steps', null, COLORS.steps], ['9', 'Awards', Trophy, '#ff9f0a']].map(([v, k, I, c]) => (
          <div key={k} className="rounded-2xl p-3 bg-white dark:bg-[#1c1c1e] text-center">
            <div className="text-2xl font-bold" style={{ color: c }}>{v}</div>
            <div className="text-xs opacity-60">{k}</div>
          </div>
        ))}
      </div>
      {!state.premium && (
        <button onClick={() => nav.push('premium')} className="mx-4 mt-4 w-[calc(100%-2rem)] rounded-[24px] p-4 text-left text-white flex items-center gap-3 active:scale-[.98] transition" style={{ background: 'linear-gradient(120deg, #5e5ce6, #bf5af2 60%, #ff375f)' }}>
          <Crown className="w-8 h-8" />
          <div className="flex-1"><div className="font-bold">Try Vita Premium</div><div className="text-white/80 text-sm">7 days free, then $3.99/month</div></div>
        </button>
      )}
      <List strong inset dividers className="!mt-6">
        <ListItem link title="Settings" media={<Tile color="#8e8e93"><SettingsGlyph /></Tile>} linkProps={{ onClick: () => nav.push('settings') }} />
        <ListItem link title="Notifications" media={<Tile color="#ff375f"><Bell className="w-4 h-4" /></Tile>} linkProps={{ onClick: () => nav.push('notifSettings') }} />
        <ListItem link title="Appearance" media={<Tile color="#5e5ce6"><Palette className="w-4 h-4" /></Tile>} linkProps={{ onClick: () => nav.push('appearance') }} />
        <ListItem link title="Awards" media={<Tile color="#ff9f0a"><Trophy className="w-4 h-4" /></Tile>} after="9" linkProps={{ onClick: () => nav.push('awards') }} />
      </List>
      <List strong inset dividers>
        <ListItem link title="Help & feedback" media={<Tile color="#0a84ff"><CircleHelp className="w-4 h-4" /></Tile>} />
        <ListItem link title="Rate Vita" media={<Tile color="#30d158"><Star className="w-4 h-4" /></Tile>} />
      </List>
      <AppTabbar active="profile" />
    </Page>
  )
}
function SettingsGlyph() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>
}
