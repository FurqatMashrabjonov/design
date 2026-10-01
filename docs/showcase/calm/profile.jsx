import { useState } from 'react'
import { Page, Navbar, Block, BlockTitle, List, ListItem, Toggle, Button, Actions, ActionsGroup, ActionsLabel, ActionsButton } from 'konsta/react'
import { Bell, Moon, CloudRain, Sparkles, CircleHelp, Play, Heart, Check } from 'lucide-react'
import { useNav, AppTabbar, Avatar, Tile, Glow, CountUp, tint } from '@od/kit'

const C = {"sleep":"#c99a3e","anxiety":"#c07580","focus":"#5f9e94","breathing":"#8a7bb0","stories":"#d0845a"}

const PERSON = {
  name: 'Maya Lindqvist',
  since: 'August 2026',
  goal: 'Sleep better',
  sessions: 47,
  minutes: 612,
  longest: 14,
  reminder: '9:30 PM',
  ambient: 'Rain',
  plusRenews: 'Nov 3, 2026',
}

const SAVED = [
  { id: 'falling-asleep-gently', title: 'Falling Asleep Gently', min: 20, by: 'Elena Ward', emoji: '🌙', cat: 'sleep', label: 'Sleep' },
  { id: 'box-breathing', title: 'Box Breathing', min: 5, by: 'Jonah Okafor', emoji: '🫁', cat: 'breathing', label: 'Breathing' },
  { id: 'lighthouse-keeper', title: 'The Lighthouse Keeper', min: 32, by: 'Thomas Reed', emoji: '🏮', cat: 'stories', label: 'Sleep story' },
]

const SOUNDS = [
  { name: 'Rain', emoji: '🌧️' },
  { name: 'Ocean', emoji: '🌊' },
  { name: 'Fireplace', emoji: '🔥' },
  { name: 'Brown noise', emoji: '🟤' },
]

const TOTALS = [
  { label: 'Sessions', value: PERSON.sessions, unit: 'total', color: C.focus },
  { label: 'Minutes', value: PERSON.minutes, unit: 'of calm', color: C.breathing },
  { label: 'Longest', value: PERSON.longest, unit: 'day streak', color: C.sleep },
]

export default function Screen() {
  const nav = useNav()
  const [reminderOn, setReminderOn] = useState(true)
  const [bedtime, setBedtime] = useState(true)
  const [ambient, setAmbient] = useState(PERSON.ambient)
  const [soundsOpen, setSoundsOpen] = useState(false)

  return (
    <Page className="pb-32">
      <Navbar large transparent title="Profile" />

      <div className="px-4 pt-2 vs-rise">
        <div className="relative overflow-hidden bg-card rounded-card p-6 flex flex-col items-center text-center">
          <div className="absolute inset-0 flex items-start justify-center pointer-events-none">
            <Glow color={C.sleep} size={220} opacity={0.35} />
          </div>
          <div className="relative">
            <Avatar name={PERSON.name} color={C.sleep} size={84} />
          </div>
          <div className="relative mt-3 text-title2">{PERSON.name}</div>
          <div className="relative mt-1 text-subhead text-black/55 dark:text-white/55">
            Member since {PERSON.since}
          </div>
          <div
            className="relative mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-subhead font-semibold"
            style={{ background: tint(C.sleep, 18) }}
          >
            <Moon className="w-4 h-4" style={{ color: C.sleep }} />
            Goal · {PERSON.goal}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 px-4 mt-3">
        {TOTALS.map((t, i) => (
          <div
            key={t.label}
            className="bg-card rounded-card p-3 vs-rise"
            style={{ animationDelay: `${(i + 1) * 60}ms` }}
          >
            <div className="text-caption1 text-black/55 dark:text-white/55">{t.label}</div>
            <div className="text-title2 mt-1" style={{ color: t.color }}>
              <CountUp to={t.value} format={(n) => Math.round(n).toLocaleString('en-US')} />
            </div>
            <div className="text-caption2 text-black/55 dark:text-white/55">{t.unit}</div>
          </div>
        ))}
      </div>

      <BlockTitle className="flex items-center gap-1.5">
        <Heart className="w-4 h-4" style={{ color: C.anxiety }} /> Saved
      </BlockTitle>
      <List strong inset dividers>
        {SAVED.map((s) => (
          <ListItem
            key={s.id}
            link
            onClick={() => nav.push('player', { id: s.id })}
            title={<span className="truncate">{s.title}</span>}
            subtitle={
              <span className="text-footnote text-black/55 dark:text-white/55">
                {s.label} · {s.min} min · {s.by}
              </span>
            }
            media={
              <Tile color={C[s.cat]} tinted size={44}>
                <span className="text-xl">{s.emoji}</span>
              </Tile>
            }
            after={
              <span
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: tint(C[s.cat], 18) }}
              >
                <Play className="w-4 h-4" style={{ color: C[s.cat], fill: C[s.cat] }} />
              </span>
            }
          />
        ))}
      </List>

      <BlockTitle>Settings</BlockTitle>
      <List strong inset dividers>
        <ListItem
          title="Daily reminder"
          subtitle={<span className="text-footnote text-black/55 dark:text-white/55">Every evening at {PERSON.reminder}</span>}
          media={<Tile color={C.sleep}><Bell className="w-4 h-4 text-white" /></Tile>}
          after={<Toggle checked={reminderOn} onChange={() => setReminderOn(!reminderOn)} />}
        />
        <ListItem
          title="Bedtime mode"
          subtitle={<span className="text-footnote text-black/55 dark:text-white/55">Dim screens, quiet alerts</span>}
          media={<Tile color={C.breathing}><Moon className="w-4 h-4 text-white" /></Tile>}
          after={<Toggle checked={bedtime} onChange={() => setBedtime(!bedtime)} />}
        />
        <ListItem
          link
          onClick={() => setSoundsOpen(true)}
          title="Ambient sound"
          media={<Tile color={C.focus}><CloudRain className="w-4 h-4 text-white" /></Tile>}
          after={<span className="text-subhead text-black/55 dark:text-white/55">{ambient}</span>}
        />
        <ListItem
          link
          title="Hushwell Plus"
          subtitle={<span className="text-footnote text-black/55 dark:text-white/55">Renews {PERSON.plusRenews}</span>}
          media={<Tile color={C.stories}><Sparkles className="w-4 h-4 text-white" /></Tile>}
          after={
            <span
              className="text-footnote font-semibold px-2.5 py-1 rounded-full"
              style={{ background: tint(C.focus, 18), color: C.focus }}
            >
              Active
            </span>
          }
        />
        <ListItem
          link
          title="Help"
          media={<Tile color={C.anxiety}><CircleHelp className="w-4 h-4 text-white" /></Tile>}
        />
      </List>

      <Block className="flex flex-col items-center text-center">
        <Button tonal rounded className="!w-auto px-8" onClick={() => nav.push('welcome', { step: 'goal' })}>
          Change goal
        </Button>
        <div className="mt-3 text-footnote text-black/55 dark:text-white/55">
          Your sessions and saved items stay with you.
        </div>
      </Block>

      <Actions opened={soundsOpen} onBackdropClick={() => setSoundsOpen(false)}>
        <ActionsGroup>
          <ActionsLabel>Default ambient sound</ActionsLabel>
          {SOUNDS.map((s) => (
            <ActionsButton
              key={s.name}
              bold={ambient === s.name}
              onClick={() => { setAmbient(s.name); setSoundsOpen(false) }}
            >
              <span className="flex items-center justify-center gap-2">
                <span>{s.emoji}</span> {s.name}
                {ambient === s.name && <Check className="w-4 h-4 text-primary" />}
              </span>
            </ActionsButton>
          ))}
        </ActionsGroup>
        <ActionsGroup>
          <ActionsButton onClick={() => setSoundsOpen(false)}>Cancel</ActionsButton>
        </ActionsGroup>
      </Actions>

      <AppTabbar active="profile" />
    </Page>
  )
}
