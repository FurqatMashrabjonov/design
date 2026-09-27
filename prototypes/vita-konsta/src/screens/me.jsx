import { useState } from 'react'
import { Page, Navbar, NavbarBackLink, Block, BlockTitle, List, ListItem, ListInput, ListButton, Link, Segmented, SegmentedButton, Toggle, Radio, Button, Card, Dialog, DialogButton, Notification } from 'konsta/react'
import { Bell, Moon, Palette, Ruler, CalendarDays, HeartPulse, Lock, CircleHelp, Star, LogOut, Crown, Mail, User, MapPin, Volume2, Trophy, Flame, Download, Trash2 } from 'lucide-react'
import { useNav, AppTabbar } from '../nav.jsx'
import { useStore, COLORS, ACCENTS, fmt } from '../store.jsx'
import { Ring, Bars, Area, Avatar, Tile, CountUp } from '../ui.jsx'

export function Insights() {
  const { state } = useStore()
  const [range, setRange] = useState('Week')
  const nav = useNav()
  const rate = [72, 80, 64, 90, 86, 100, 83]
  return (
    <Page className="pb-32">
      <Navbar large transparent title="Insights" subtitle="Sep 21 – 27" />
      <Block className="!my-3">
        <Segmented strong rounded>{['Week', 'Month', 'Year'].map((r) => <SegmentedButton key={r} rounded active={range === r} onClick={() => setRange(r)}>{r}</SegmentedButton>)}</Segmented>
      </Block>
      <Card raised className="!mx-4 !rounded-[28px]">
        <div className="text-sm opacity-60">Habit completion</div>
        <div className="flex items-baseline gap-2"><span className="text-[40px] font-bold tracking-tight"><CountUp to={86} />%</span><span className="text-sm font-semibold" style={{ color: COLORS.habits }}>▲ 9%</span></div>
        <div className="mt-3"><Bars values={rate} goal={80} color={COLORS.habits} labels={['M', 'T', 'W', 'T', 'F', 'S', 'S']} height={110} /></div>
      </Card>
      <div className="grid grid-cols-2 gap-3 px-4 mt-4">
        <Card raised className="!m-0 !rounded-[24px]">
          <div className="text-sm opacity-60">Avg. steps</div>
          <div className="text-2xl font-bold" style={{ color: COLORS.steps }}>8,344</div>
          <Area values={state.steps.week} color={COLORS.steps} height={56} />
        </Card>
        <Card raised className="!m-0 !rounded-[24px]">
          <div className="text-sm opacity-60">Avg. water</div>
          <div className="text-2xl font-bold" style={{ color: COLORS.water }}>2.1 L</div>
          <Area values={[1.8, 2.4, 2.0, 2.6, 1.9, 2.2, 1.5]} color={COLORS.water} height={56} />
        </Card>
      </div>
      <BlockTitle>Best habits</BlockTitle>
      <List strong inset dividers>
        {[...state.habits].sort((a, b) => b.streak - a.streak).slice(0, 4).map((h, i) => (
          <ListItem key={h.id} link linkProps={{ onClick: () => nav.push('habit', { id: h.id }) }} title={h.name} media={<span className="text-2xl">{h.emoji}</span>}
            after={<span className="flex items-center gap-2"><span className="w-20 h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden"><span className="block h-full rounded-full" style={{ width: `${100 - i * 12}%`, background: h.color }} /></span><span className="text-sm w-9 text-right">{100 - i * 12}%</span></span>} />
        ))}
      </List>
      <Card className="!mx-4 !rounded-[24px]" raised>
        <div className="flex gap-3 items-start">
          <span className="text-3xl">💡</span>
          <div><div className="font-semibold">You finish more on weekends</div><div className="text-sm opacity-60 mt-0.5">Saturday is your strongest day. Try moving “Journal” to the morning on weekdays.</div></div>
        </div>
      </Card>
      <List strong inset>
        <ListItem link title="Awards" media={<Tile color="#ff9f0a"><Trophy className="w-4 h-4" /></Tile>} after="9 of 24" linkProps={{ onClick: () => nav.push('awards') }} />
      </List>
      <AppTabbar active="insights" />
    </Page>
  )
}

const AWARDS = [
  ['🔥', 'On Fire', '7-day streak', 1], ['🌅', 'Early Bird', '5 runs before 7 AM', 1], ['💧', 'Hydrated', 'Water goal 7 days', 1], ['🧘', 'Zen', '30 days of meditation', 1],
  ['👟', '100K Club', '100,000 steps in a week', 1], ['📚', 'Bookworm', '500 pages read', 1], ['⚡', 'Perfect Week', 'Every habit, 7 days', 1], ['🏔️', 'Summit', '20,000 steps in a day', 1],
  ['🎯', 'Sharpshooter', '90% for a month', 1], ['🌙', 'Night Owl', '30 evening check-ins', 0], ['🏆', 'Legend', '100-day streak', 0], ['💎', 'Diamond', 'A full year', 0],
]
export function Awards() {
  const nav = useNav()
  const [open, setOpen] = useState(null)
  return (
    <Page className="pb-10">
      <Navbar title="Awards" left={<NavbarBackLink showText={false} onClick={nav.pop} />} />
      <Card raised className="!mx-4 !mt-4 !rounded-[28px] text-center">
        <div className="text-6xl vs-float">🏅</div>
        <div className="text-2xl font-bold mt-2">9 of 24 unlocked</div>
        <div className="opacity-60 text-sm">Next: 🌙 Night Owl — 22 of 30 check-ins</div>
        <div className="mt-3 h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden"><div className="h-full rounded-full bg-primary" style={{ width: '73%' }} /></div>
      </Card>
      <div className="grid grid-cols-3 gap-3 px-4 mt-4">
        {AWARDS.map(([e, t, d, got], i) => (
          <button key={t} onClick={() => setOpen([e, t, d, got])} className="rounded-3xl p-3 flex flex-col items-center text-center bg-white dark:bg-[#1c1c1e] vs-rise active:scale-95 transition" style={{ animationDelay: `${i * 40}ms` }}>
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl" style={{ background: got ? 'linear-gradient(145deg, #ffd60a, #ff9f0a)' : 'rgba(120,120,128,.15)', filter: got ? 'none' : 'grayscale(1)', opacity: got ? 1 : 0.5 }}>{e}</div>
            <div className="text-[13px] font-semibold mt-2 leading-tight">{t}</div>
          </button>
        ))}
      </div>
      <Dialog opened={!!open} onBackdropClick={() => setOpen(null)} title={open && `${open[0]} ${open[1]}`} content={open && (open[3] ? `Unlocked — ${open[2]}.` : `Locked — ${open[2]}.`)} buttons={<DialogButton strong onClick={() => setOpen(null)}>{open?.[3] ? 'Share' : 'OK'}</DialogButton>} />
    </Page>
  )
}

export function Profile() {
  const nav = useNav()
  const { state } = useStore()
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

export function EditProfile() {
  const nav = useNav()
  const { state, dispatch } = useStore()
  const [u, setU] = useState(state.user)
  const save = () => { dispatch({ type: 'user', user: u }); nav.pop() }
  return (
    <Page className="pb-10">
      <Navbar title="Edit profile" left={<Link onClick={nav.pop}>Cancel</Link>} right={<Link onClick={save}><b>Done</b></Link>} />
      <Block className="flex flex-col items-center !mt-6">
        <Avatar name={u.name || '?'} color={u.avatarColor} size={96} />
        <div className="flex gap-2 mt-4">
          {['#ff9f0a', '#0a84ff', '#30d158', '#ff375f', '#bf5af2'].map((c) => <button key={c} onClick={() => setU({ ...u, avatarColor: c })} className="w-7 h-7 rounded-full" style={{ background: c, boxShadow: c === u.avatarColor ? `0 0 0 2px white, 0 0 0 4px ${c}` : 'none' }} />)}
        </div>
      </Block>
      <List strong inset>
        <ListInput label="Name" type="text" value={u.name} onInput={(e) => setU({ ...u, name: e.target.value })} media={<User className="w-5 h-5 opacity-50" />} />
        <ListInput label="Email" type="email" value={u.email} onInput={(e) => setU({ ...u, email: e.target.value })} media={<Mail className="w-5 h-5 opacity-50" />} />
        <ListInput label="City" type="text" value={u.city} onInput={(e) => setU({ ...u, city: e.target.value })} media={<MapPin className="w-5 h-5 opacity-50" />} />
        <ListInput label="Birthday" type="date" defaultValue="1996-04-12" media={<CalendarDays className="w-5 h-5 opacity-50" />} />
      </List>
      <BlockTitle>Body</BlockTitle>
      <List strong inset dividers>
        <ListInput label="Height" type="text" defaultValue="168 cm" />
        <ListInput label="Weight" type="text" defaultValue="58 kg" />
      </List>
    </Page>
  )
}

export function Settings() {
  const nav = useNav()
  const { state, dispatch } = useStore()
  const s = state.settings
  const [logout, setLogout] = useState(false)
  const set = (key, value) => dispatch({ type: 'setting', key, value })
  return (
    <Page className="pb-10">
      <Navbar title="Settings" left={<NavbarBackLink showText={false} onClick={nav.pop} />} />
      <BlockTitle>General</BlockTitle>
      <List strong inset dividers>
        <ListItem link title="Notifications" media={<Tile color="#ff375f"><Bell className="w-4 h-4" /></Tile>} linkProps={{ onClick: () => nav.push('notifSettings') }} />
        <ListItem link title="Appearance" after={s.dark ? 'Dark' : 'Light'} media={<Tile color="#5e5ce6"><Palette className="w-4 h-4" /></Tile>} linkProps={{ onClick: () => nav.push('appearance') }} />
        <ListItem label title="Dark mode" media={<Tile color="#1c1c1e"><Moon className="w-4 h-4" /></Tile>} after={<Toggle checked={s.dark} onChange={() => set('dark', !s.dark)} />} />
        <ListItem label title="Sounds" media={<Tile color="#ff9f0a"><Volume2 className="w-4 h-4" /></Tile>} after={<Toggle checked={s.sound} onChange={() => set('sound', !s.sound)} />} />
      </List>
      <BlockTitle>Units</BlockTitle>
      <List strong inset dividers>
        <ListItem label title="Metric (km, ml)" media={<Tile color="#30d158"><Ruler className="w-4 h-4" /></Tile>} after={<Radio checked={s.units === 'metric'} onChange={() => set('units', 'metric')} />} />
        <ListItem label title="Imperial (mi, oz)" media={<Tile color="#30d158"><Ruler className="w-4 h-4" /></Tile>} after={<Radio checked={s.units === 'imperial'} onChange={() => set('units', 'imperial')} />} />
        <ListItem link title="Week starts on" after={s.weekStart} media={<Tile color="#0a84ff"><CalendarDays className="w-4 h-4" /></Tile>} />
      </List>
      <BlockTitle>Data</BlockTitle>
      <List strong inset dividers>
        <ListItem link title="Apple Health" after="Connected" media={<Tile color="#ff375f"><HeartPulse className="w-4 h-4" /></Tile>} />
        <ListItem link title="Privacy" media={<Tile color="#0a84ff"><Lock className="w-4 h-4" /></Tile>} />
        <ListItem link title="Export data" media={<Tile color="#8e8e93"><Download className="w-4 h-4" /></Tile>} />
      </List>
      <List strong inset>
        <ListButton onClick={() => setLogout(true)}><span className="flex items-center gap-2"><LogOut className="w-4 h-4" />Log out</span></ListButton>
        <ListButton><span className="text-red-500 flex items-center gap-2"><Trash2 className="w-4 h-4" />Delete account</span></ListButton>
      </List>
      <Block className="text-center text-xs opacity-40">Vita 2.4.0 (318)</Block>
      <Dialog opened={logout} onBackdropClick={() => setLogout(false)} title="Log out?" content="Your data stays in iCloud and comes back when you log in again."
        buttons={<><DialogButton onClick={() => setLogout(false)}>Cancel</DialogButton><DialogButton strong onClick={() => { setLogout(false); nav.reset('welcome') }}>Log out</DialogButton></>} />
    </Page>
  )
}

export function NotifSettings() {
  const nav = useNav()
  const { state, dispatch } = useStore()
  const s = state.settings
  const set = (key) => dispatch({ type: 'setting', key, value: !s[key] })
  const [preview, setPreview] = useState(false)
  return (
    <Page className="pb-10">
      <Navbar title="Notifications" left={<NavbarBackLink showText={false} onClick={nav.pop} />} />
      <List strong inset dividers className="!mt-6">
        <ListItem label title="Habit reminders" text="At the time you set for each habit" after={<Toggle checked={s.reminders} onChange={() => set('reminders')} />} />
        <ListItem label title="Daily summary" text="Every evening at 9:00 PM" after={<Toggle checked={s.dailySummary} onChange={() => set('dailySummary')} />} />
        <ListItem label title="Streak alerts" text="When a streak is about to break" after={<Toggle checked={s.streakAlerts} onChange={() => set('streakAlerts')} />} />
      </List>
      <BlockTitle>Quiet hours</BlockTitle>
      <List strong inset dividers>
        <ListInput label="From" type="time" defaultValue="22:30" />
        <ListInput label="To" type="time" defaultValue="07:00" />
      </List>
      <Block><Button tonal rounded onClick={() => { setPreview(true); setTimeout(() => setPreview(false), 3000) }}>Send a test notification</Button></Block>
      <Notification opened={preview} icon={<span className="text-xl">🌿</span>} title="Vita" titleRightText="now" subtitle="Time for your evening habits" text="Read 20 pages and write in your journal to keep your streaks." onClose={() => setPreview(false)} />
    </Page>
  )
}

export function Appearance() {
  const nav = useNav()
  const { state, dispatch } = useStore()
  const s = state.settings
  return (
    <Page className="pb-10">
      <Navbar title="Appearance" left={<NavbarBackLink showText={false} onClick={nav.pop} />} />
      <div className="grid grid-cols-2 gap-4 px-4 mt-6">
        {[[false, 'Light'], [true, 'Dark']].map(([d, k]) => (
          <button key={k} onClick={() => dispatch({ type: 'setting', key: 'dark', value: d })} className="flex flex-col items-center gap-2">
            <div className="w-full aspect-[3/4] rounded-2xl p-2 transition" style={{ background: d ? '#000' : '#f2f2f7', boxShadow: s.dark === d ? '0 0 0 3px var(--color-primary)' : '0 0 0 1px rgba(120,120,128,.25)' }}>
              <div className="h-3 w-14 rounded mb-2" style={{ background: d ? '#3a3a3c' : '#d1d1d6' }} />
              {[0, 1, 2].map((i) => <div key={i} className="h-7 rounded-lg mb-1.5" style={{ background: d ? '#1c1c1e' : '#fff' }} />)}
            </div>
            <span className="font-medium">{k}</span>
            <Radio checked={s.dark === d} onChange={() => dispatch({ type: 'setting', key: 'dark', value: d })} />
          </button>
        ))}
      </div>
      <BlockTitle>Accent color</BlockTitle>
      <Block strong inset className="!py-4">
        <div className="flex justify-between">
          {ACCENTS.map(([n, c]) => <button key={c} title={n} onClick={() => dispatch({ type: 'setting', key: 'accent', value: c })} className="w-10 h-10 rounded-full transition" style={{ background: c, boxShadow: s.accent === c ? `0 0 0 3px ${s.dark ? '#000' : '#fff'}, 0 0 0 5px ${c}` : 'none' }} />)}
        </div>
      </Block>
      <BlockTitle>App icon</BlockTitle>
      <Block strong inset className="!py-4">
        <div className="flex justify-between">
          {[['#5e5ce6', '#bf5af2'], ['#ff9f0a', '#ff375f'], ['#30d158', '#0a84ff'], ['#1c1c1e', '#3a3a3c']].map(([a, b], i) => (
            <div key={i} className="w-16 h-16 rounded-[18px] flex items-center justify-center text-3xl" style={{ background: `linear-gradient(145deg, ${a}, ${b})`, boxShadow: i === 0 ? '0 0 0 3px var(--color-primary)' : 'none' }}>🌿</div>
          ))}
        </div>
      </Block>
    </Page>
  )
}

export function Premium() {
  const nav = useNav()
  const { state, dispatch } = useStore()
  const [plan, setPlan] = useState('year')
  const perks = [['📊', 'Deep insights', 'Trends by month and year'], ['♾️', 'Unlimited habits', 'Free plan holds 6'], ['🧩', 'Home screen widgets', 'Rings on your lock screen'], ['☁️', 'iCloud sync', 'Across iPhone, iPad and Watch']]
  return (
    <Page className="pb-10" colors={{ bgIos: '' }} style={{ background: state.settings.dark ? '#000' : 'linear-gradient(180deg, color-mix(in oklab, var(--color-primary) 22%, #f2f2f7) 0%, #f2f2f7 45%)' }}>
      <Navbar transparent left={<NavbarBackLink showText={false} onClick={nav.pop} />} />
      <Block className="text-center !mt-0">
        <div className="mx-auto w-24 h-24 rounded-[30px] flex items-center justify-center vs-float" style={{ background: 'linear-gradient(135deg, #5e5ce6, #bf5af2 55%, #ff375f)', boxShadow: '0 20px 40px -12px rgba(94,92,230,.6)' }}><Crown className="w-12 h-12 text-white" /></div>
        <h1 className="text-[32px] font-bold tracking-tight mt-5">Vita Premium</h1>
        <p className="opacity-60 mt-1">Everything you need to make it stick.</p>
      </Block>
      <List strong inset dividers>
        {perks.map(([e, t, d]) => <ListItem key={t} title={t} text={d} media={<span className="text-2xl">{e}</span>} />)}
      </List>
      <div className="px-4 space-y-3">
        {[['year', 'Yearly', '$29.99 / year', '$2.50/mo · save 37%'], ['month', 'Monthly', '$3.99 / month', 'Cancel any time']].map(([id, t, p, sub]) => (
          <button key={id} onClick={() => setPlan(id)} className="w-full rounded-2xl p-4 flex items-center gap-3 text-left bg-white dark:bg-[#1c1c1e] transition" style={{ boxShadow: plan === id ? 'inset 0 0 0 2px var(--color-primary)' : 'none' }}>
            <Radio checked={plan === id} onChange={() => setPlan(id)} />
            <div className="flex-1"><div className="font-semibold">{t}</div><div className="text-sm opacity-60">{sub}</div></div>
            <div className="font-semibold">{p}</div>
          </button>
        ))}
      </div>
      <Block>
        <Button large rounded onClick={() => { dispatch({ type: 'premium' }); nav.pop() }}>{state.premium ? 'You are Premium ✓' : 'Start 7-day free trial'}</Button>
        <p className="text-center text-xs opacity-50 mt-3">Then {plan === 'year' ? '$29.99/year' : '$3.99/month'}. Cancel in Settings at least 24 hours before renewal.</p>
        <div className="text-center mt-2"><Link>Restore purchases</Link></div>
      </Block>
    </Page>
  )
}

export function Inbox() {
  const nav = useNav()
  const { state, dispatch } = useStore()
  return (
    <Page className="pb-10">
      <Navbar title="Activity" left={<NavbarBackLink showText={false} onClick={nav.pop} />} right={state.inbox.length ? <Link onClick={() => state.inbox.forEach((n) => dispatch({ type: 'clearInbox', id: n.id }))}>Clear</Link> : null} />
      {state.inbox.length ? (
        <List strong inset dividers className="!mt-6">
          {state.inbox.map((n) => (
            <ListItem key={n.id} title={n.title} after={n.time} text={n.text} media={<span className="w-11 h-11 rounded-full flex items-center justify-center text-2xl bg-black/5 dark:bg-white/10">{n.icon}</span>}
              linkProps={{ onClick: () => dispatch({ type: 'clearInbox', id: n.id }) }} link />
          ))}
        </List>
      ) : (
        <Block className="text-center !mt-24"><div className="text-6xl">🌤️</div><div className="text-xl font-semibold mt-4">All caught up</div><div className="opacity-60 mt-1">New streaks and reminders show up here.</div></Block>
      )}
    </Page>
  )
}
