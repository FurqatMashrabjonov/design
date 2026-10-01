import { useState } from 'react'
import { Page, Navbar, Link, Block, BlockTitle, List, ListItem, ListInput, Button, Progressbar, Segmented, SegmentedButton, Chip, Toast } from 'konsta/react'
import { Droplets, SprayCan, Sprout, Shovel, Sun, Check, Tag, Sparkles, Thermometer } from 'lucide-react'
import { useNav, Photo, Tile, Ring, Confetti, tint } from '@od/kit'

const C = {"water":"#8a7bb0","mist":"#d0845a","fertilize":"#6f9e80","rotate":"#9b7bb8","repot":"#5f8fc0"}

const SPECIES = { name: 'Peace lily', latin: 'Spathiphyllum wallisii', emoji: '🌸', match: 94, photo: 'peace lily white flower' }
const ALTERNATES = [
  { name: 'Anthurium', pct: 4, emoji: '🌺' },
  { name: 'Calla lily', pct: 2, emoji: '🌷' },
]
const ROOMS = [
  { id: 'Living room', light: 'Bright indirect', window: 'South window', humidity: 48, plants: 3, photo: 'bright living room plants' },
  { id: 'Bedroom', light: 'Medium light', window: 'East window', humidity: 55, plants: 3, photo: 'cozy bedroom houseplants' },
  { id: 'Balcony', light: 'Full sun', window: 'Outdoor', humidity: null, plants: 1, photo: 'city balcony herbs' },
]
const POTS = [
  { id: 'Small', cm: '10 cm' },
  { id: 'Medium', cm: '15 cm' },
  { id: 'Large', cm: '22 cm' },
]
const WATERED = ['Today', 'Yesterday', '2–3 days ago', 'Not sure']
const SCHEDULE = [
  { key: 'water', title: 'Water', when: 'Every 7 days', next: 'Next Thu Oct 8', Icon: Droplets },
  { key: 'mist', title: 'Mist', when: 'Twice weekly', next: 'Peace lilies love humidity', Icon: SprayCan },
  { key: 'fertilize', title: 'Fertilize', when: 'Monthly', next: 'From Nov 1', Icon: Sprout },
  { key: 'repot', title: 'Repot', when: 'Spring 2027', next: 'When roots fill the pot', Icon: Shovel },
]
const STEPS = ['Species', 'Name & room', 'Care']

export default function Screen() {
  const nav = useNav()
  const [step, setStep] = useState(1)
  const [nick, setNick] = useState('Lily')
  const [room, setRoom] = useState('Bedroom')
  const [pot, setPot] = useState('Medium')
  const [watered, setWatered] = useState('Today')
  const [added, setAdded] = useState(false)

  const name = nick.trim() || 'Lily'
  const chosen = ROOMS.find((r) => r.id === room)

  const add = () => {
    setAdded(true)
    setTimeout(() => nav.pop(), 1200)
  }

  const primary = () => (step < 3 ? setStep(step + 1) : add())

  return (
    <Page className="pb-40">
      <Navbar
        title="Add plant"
        subtitle={`Step ${step} of 3 · ${STEPS[step - 1]}`}
        left={<Link onClick={nav.pop}>Cancel</Link>}
      />

      <div className="px-4 pt-3">
        <Progressbar progress={step / 3} />
        <div className="flex justify-between mt-2">
          {STEPS.map((s, i) => (
            <span key={s} className={`text-caption1 ${i + 1 <= step ? 'text-primary font-semibold' : 'text-black/45 dark:text-white/45'}`}>{s}</span>
          ))}
        </div>
      </div>

      {step === 1 && (
        <>
          <div className="px-4 mt-5 vs-rise">
            <Photo q={SPECIES.photo} className="w-full h-64 rounded-card overflow-hidden">
              <div className="absolute inset-0 flex flex-col justify-end p-5 bg-gradient-to-t from-black/70 to-transparent">
                <div className="text-caption1 font-semibold uppercase tracking-wide text-white/80">Identified · {SPECIES.match}% match</div>
                <div className="text-title1 text-white">{SPECIES.name}</div>
                <div className="text-subhead italic text-white/80">{SPECIES.latin}</div>
              </div>
            </Photo>
          </div>

          <BlockTitle className="!mb-2">Good to know</BlockTitle>
          <div className="grid grid-cols-3 gap-3 px-4">
            {[
              ['Water', 'Weekly', C.water, Droplets],
              ['Light', 'Medium', C.mist, Sun],
              ['Temp', '18–27°C', C.fertilize, Thermometer],
            ].map(([k, v, col, Icon], i) => (
              <div key={k} className="bg-card rounded-card p-3 vs-rise" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: tint(col), color: col }}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="text-caption1 text-black/55 dark:text-white/55 mt-2">{k}</div>
                <div className="text-headline" style={{ color: col }}>{v}</div>
              </div>
            ))}
          </div>

          <BlockTitle>Not quite right?</BlockTitle>
          <List strong inset dividers>
            {ALTERNATES.map((a) => (
              <ListItem
                key={a.name}
                link
                title={a.name}
                media={<Tile tinted color={C.rotate}>{a.emoji}</Tile>}
                after={<span className="text-subhead text-black/55 dark:text-white/55">{a.pct}%</span>}
                onClick={() => nav.push('identify')}
              />
            ))}
          </List>
        </>
      )}

      {step === 2 && (
        <>
          <div className="flex items-center gap-4 px-4 mt-5 vs-rise">
            <Photo q={SPECIES.photo} className="w-16 h-16 rounded-2xl" />
            <div className="min-w-0">
              <div className="text-title2 truncate">Meet {name} {SPECIES.emoji}</div>
              <div className="text-subhead text-black/55 dark:text-white/55">{SPECIES.name}</div>
            </div>
          </div>

          <BlockTitle>Nickname</BlockTitle>
          <List strong inset>
            <ListInput
              type="text"
              placeholder="Give it a name"
              value={nick}
              onChange={(e) => setNick(e.target.value)}
              clearButton
              onClear={() => setNick('')}
              media={<Tag className="w-5 h-5 text-primary" />}
            />
          </List>

          <BlockTitle className="!mb-2">Which room?</BlockTitle>
          <div className="flex flex-col gap-3 px-4">
            {ROOMS.map((r, i) => {
              const on = room === r.id
              return (
                <button
                  key={r.id}
                  onClick={() => setRoom(r.id)}
                  className={`flex items-center gap-3 p-3 rounded-card bg-card text-left border-2 vs-rise ${on ? 'border-primary' : 'border-transparent'}`}
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <Photo q={r.photo} className="w-16 h-16 rounded-2xl shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-headline truncate">{r.id}</div>
                    <div className="flex items-center gap-1 text-subhead text-black/55 dark:text-white/55">
                      <Sun className="w-3.5 h-3.5" /> {r.light}
                    </div>
                    <div className="text-caption1 text-black/45 dark:text-white/45 mt-0.5">
                      {r.window}{r.humidity ? ` · ${r.humidity}% humidity` : ''} · {r.plants} {r.plants === 1 ? 'plant' : 'plants'}
                    </div>
                  </div>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${on ? 'bg-primary text-white vs-bounce' : 'border-2 border-line'}`}>
                    {on && <Check className="w-4 h-4" />}
                  </div>
                </button>
              )
            })}
          </div>
          <Block className="!mt-3">
            <p className="text-footnote text-black/55 dark:text-white/55">
              {chosen.id === 'Balcony'
                ? 'Peace lilies scorch in full sun — an indoor room suits them better.'
                : chosen.id === 'Bedroom'
                  ? 'Medium light and 55% humidity — a lovely match for a peace lily.'
                  : 'Bright indirect light works well; keep it out of direct sun.'}
            </p>
          </Block>
        </>
      )}

      {step === 3 && (
        <>
          <BlockTitle className="!mb-2">Pot size</BlockTitle>
          <Block className="!my-2">
            <Segmented strong rounded>
              {POTS.map((p) => (
                <SegmentedButton key={p.id} rounded active={pot === p.id} onClick={() => setPot(p.id)}>
                  {p.id} · {p.cm}
                </SegmentedButton>
              ))}
            </Segmented>
          </Block>

          <BlockTitle className="!mb-2">Last watered</BlockTitle>
          <div className="flex gap-2 overflow-x-auto px-4 pb-1">
            {WATERED.map((w) => (
              <Chip
                key={w}
                onClick={() => setWatered(w)}
                className={watered === w ? '!bg-primary !text-white' : ''}
                style={watered === w ? undefined : { background: tint(C.water, 12) }}
              >
                {w}
              </Chip>
            ))}
          </div>

          <BlockTitle className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-primary" /> {name}'s care plan
          </BlockTitle>
          <List strong inset dividers>
            {SCHEDULE.map((s) => (
              <ListItem
                key={s.key}
                title={s.title}
                subtitle={s.next}
                media={
                  <Tile tinted color={C[s.key]} size={36}>
                    <s.Icon className="w-5 h-5" style={{ color: C[s.key] }} />
                  </Tile>
                }
                after={<span className="text-subhead font-semibold" style={{ color: C[s.key] }}>{s.when}</span>}
              />
            ))}
          </List>

          <div className="mx-4 mt-2 p-4 rounded-card flex items-center gap-4" style={{ background: tint(C.fertilize, 14) }}>
            <Ring value={4 / 8} size={56} stroke={6} color={C.fertilize}>
              <span className="text-xl">{SPECIES.emoji}</span>
            </Ring>
            <div className="min-w-0">
              <div className="text-headline truncate">{name} joins the {room}</div>
              <div className="text-subhead text-black/60 dark:text-white/60">
                {chosen.plants + 1} plants there · 8 in your home
              </div>
            </div>
          </div>
        </>
      )}

      <div className="fixed bottom-0 left-0 right-0 px-4 pt-3 pb-8 bg-page border-t border-line flex items-center gap-3">
        {step > 1 && (
          <Button clear rounded className="!w-24 !h-12" onClick={() => setStep(step - 1)}>Back</Button>
        )}
        <Button large rounded className="flex-1" onClick={primary}>
          {step < 3 ? 'Continue' : `Add ${name}`}
        </Button>
      </div>

      <Confetti run={added} />
      <Toast opened={added} position="center">
        {name} is home in the {room} 🌱
      </Toast>
    </Page>
  )
}
