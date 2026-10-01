import { useState } from 'react'
import { Page, Navbar, Block, BlockTitle, List, ListItem, ListButton, Button, Chip, Toggle, Segmented, SegmentedButton, Actions, ActionsGroup, ActionsLabel, ActionsButton, Dialog, DialogButton } from 'konsta/react'
import { Flame, Award, Ruler, AudioLines, HeartPulse, BellRing, Heart, Flag, Plus } from 'lucide-react'
import { useNav, AppTabbar, Avatar, Photo, Meter, Tile, tint } from '@od/kit'

const C = {"easyRun":"#3b82f6","tempo":"#10b981","intervals":"#f59e0b","longRun":"#8b5cf6","rest":"#ef4444"}

const SHOES = [
  { id: 'glide', name: 'Cloudrunner Glide 3', role: 'Daily trainer', km: 284, life: 700, photo: 'blue running shoes', color: C.easyRun },
  { id: 'flyer', name: 'Tempo Flyer', role: 'Speed days', km: 96, life: 600, photo: 'orange racing shoes', color: C.tempo },
]
const STATS = [
  { label: '2026', value: '412', unit: 'km run', color: C.longRun },
  { label: 'Streak', value: '9', unit: 'runs', color: C.intervals },
  { label: 'Race day', value: '164', unit: 'days to go', color: C.tempo },
]
const INTERVALS = ['Every 0.5 km', 'Every 1 km', 'Every 2 km', 'Every 5 min']

export default function Screen() {
  const nav = useNav()
  const [units, setUnits] = useState('km')
  const [cue, setCue] = useState('Every 1 km')
  const [cueOpen, setCueOpen] = useState(false)
  const [reminders, setReminders] = useState(true)
  const [health, setHealth] = useState(true)
  const [signOut, setSignOut] = useState(false)

  return (
    <Page className="pb-32">
      <Navbar large transparent title="Profile" />

      <div className="flex flex-col items-center px-4 pt-2 pb-4 vs-rise">
        <Avatar name="Maya Ferreira" color={C.easyRun} size={84} />
        <div className="text-title2 mt-3">Maya Ferreira</div>
        <div className="text-subhead text-black/55 dark:text-white/55">32 · Lisbon 🇵🇹</div>
        <div className="flex gap-2 mt-3">
          <Chip media={<Flame className="w-4 h-4" style={{ color: C.intervals }} />} style={{ background: tint(C.intervals) }}>9-run streak</Chip>
          <Chip media={<Award className="w-4 h-4" style={{ color: C.longRun }} />} style={{ background: tint(C.longRun) }}>Base Builder</Chip>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 px-4">
        {STATS.map((s, i) => (
          <div key={s.label} className="bg-card rounded-card p-3 vs-rise" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="text-caption1 text-black/55 dark:text-white/55">{s.label}</div>
            <div className="text-title2" style={{ color: s.color }}>{s.value}</div>
            <div className="text-caption2 text-black/55 dark:text-white/55 truncate">{s.unit}</div>
          </div>
        ))}
      </div>

      <div className="flex items-end justify-between px-4 mt-8 mb-2">
        <div className="text-title3">Shoes</div>
        <Button tonal small rounded inline className="!px-3" onClick={() => nav.push('profile')}>
          <Plus className="w-4 h-4 mr-1" /> Add Shoe
        </Button>
      </div>
      <List strong inset dividers className="!mt-0">
        {SHOES.map((s) => (
          <ListItem key={s.id} title={<span className="truncate">{s.name}</span>}
            media={<Photo q={s.photo} className="w-14 h-14 rounded-2xl" />}
            text={
              <div className="mt-1">
                <div className="flex justify-between text-footnote text-black/55 dark:text-white/55 mb-1.5">
                  <span>{s.role}</span>
                  <span><span className="font-semibold" style={{ color: s.color }}>{s.km}</span> / {s.life} km</span>
                </div>
                <Meter value={s.km / s.life} color={s.color} />
              </div>
            } />
        ))}
        <ListItem title={<span className="text-black/55 dark:text-white/55">Trail Pace 2</span>}
          media={<Tile color="#8e8e93" tinted size={56}><span className="text-2xl grayscale">👟</span></Tile>}
          footer="Retired" after={<span className="text-subhead text-black/55 dark:text-white/55">712 km</span>} />
      </List>

      <BlockTitle>Running</BlockTitle>
      <List strong inset dividers>
        <ListItem title="Units" media={<Tile color="#8e8e93"><Ruler className="w-4 h-4" /></Tile>}
          after={
            <Segmented strong rounded className="w-28">
              {['km', 'mi'].map((u) => <SegmentedButton key={u} small rounded active={units === u} onClick={() => setUnits(u)}>{u}</SegmentedButton>)}
            </Segmented>
          } />
        <ListItem link title="Audio coach" subtitle="Coach Ana" onClick={() => setCueOpen(true)}
          media={<Tile color={C.easyRun}><AudioLines className="w-4 h-4" /></Tile>}
          after={<span className="text-subhead">{cue}</span>} />
        <ListItem link title="Heart-rate strap" onClick={() => nav.push('profile')}
          media={<Tile color={C.rest}><HeartPulse className="w-4 h-4" /></Tile>}
          after={<span className="flex items-center gap-1.5 text-subhead"><span className="w-2 h-2 rounded-full" style={{ background: C.tempo }} />Polar H10</span>} />
        <ListItem link title="Race goal" subtitle="Lisbon Half · 2:05:00" onClick={() => nav.reset('plan')}
          media={<Tile color={C.longRun}><Flag className="w-4 h-4" /></Tile>}
          after={<span className="text-subhead">14 Mar</span>} />
      </List>

      <BlockTitle>Notifications & Sync</BlockTitle>
      <List strong inset dividers>
        <ListItem title="Rest-day reminders" subtitle={reminders ? 'Daily at 08:00' : 'Off'}
          media={<Tile color={C.intervals}><BellRing className="w-4 h-4" /></Tile>}
          after={<Toggle checked={reminders} onChange={() => setReminders(!reminders)} />} />
        <ListItem title="Apple Health sync"
          media={<Tile color="#ff2d55"><Heart className="w-4 h-4" /></Tile>}
          after={<Toggle checked={health} onChange={() => setHealth(!health)} />} />
      </List>

      <List strong inset>
        <ListButton className="!text-red-500" onClick={() => setSignOut(true)}>Sign out</ListButton>
      </List>
      <Block className="text-center text-footnote text-black/55 dark:text-white/55 !mt-2">Stride Half · 412 km logged this year</Block>

      <Actions opened={cueOpen} onBackdropClick={() => setCueOpen(false)}>
        <ActionsGroup>
          <ActionsLabel>Coach Ana speaks…</ActionsLabel>
          {INTERVALS.map((v) => (
            <ActionsButton key={v} bold={cue === v} onClick={() => { setCue(v); setCueOpen(false) }}>{v}</ActionsButton>
          ))}
        </ActionsGroup>
        <ActionsGroup>
          <ActionsButton onClick={() => setCueOpen(false)}>Cancel</ActionsButton>
        </ActionsGroup>
      </Actions>

      <Dialog opened={signOut} onBackdropClick={() => setSignOut(false)} title="Sign out?"
        content="Your plan and runs stay saved to your account."
        buttons={<>
          <DialogButton onClick={() => setSignOut(false)}>Cancel</DialogButton>
          <DialogButton strong onClick={() => { setSignOut(false); nav.reset('today') }}>Sign out</DialogButton>
        </>} />

      <AppTabbar active="profile" />
    </Page>
  )
}
