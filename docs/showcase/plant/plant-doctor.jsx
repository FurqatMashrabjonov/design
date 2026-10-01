import { useState } from 'react'
import { Page, Navbar, NavbarBackLink, Block, BlockTitle, List, ListItem, Button, Checkbox, Toast, Link } from 'konsta/react'
import { Droplets, CalendarCheck, Info } from 'lucide-react'
import { useNav, Photo, Ring, Meter, Tile, tint, Confetti } from '@od/kit'

const C = {"water":"#8a7bb0","mist":"#d0845a","fertilize":"#6f9e80","rotate":"#9b7bb8","repot":"#5f8fc0"}

const PLANT = { name: 'Monty', species: 'Monstera deliciosa', emoji: '🌿', room: 'Living room', photo: 'monstera in white pot', lastWatered: 'Sep 24' }

const SYMPTOMS = [
  { id: 'yellow', emoji: '🟡', label: 'Yellow leaves' },
  { id: 'brown', emoji: '🤎', label: 'Brown tips' },
  { id: 'droop', emoji: '🥀', label: 'Drooping' },
  { id: 'spots', emoji: '⚫', label: 'Spots' },
  { id: 'pests', emoji: '🐛', label: 'Pests' },
  { id: 'drop', emoji: '🍂', label: 'Leaf drop' },
]

const OTHERS = [
  { name: 'Low light', pct: 12, color: C.rotate },
  { name: 'Nutrient deficiency', pct: 6, color: C.fertilize },
]

const STEPS = [
  'Check the top 5 cm of soil, and only water when it’s dry.',
  'Make sure the pot drains, and empty the saucer.',
  'Remove fully yellow leaves at the base.',
  'Stretch watering to every 10 days for 3 weeks.',
  'Check again on Thu Oct 22.',
]

export default function Screen() {
  const nav = useNav()
  const [selected, setSelected] = useState(['yellow'])
  const [checked, setChecked] = useState([false, false, false, false, false])
  const [added, setAdded] = useState(false)

  const toggleSymptom = (id) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  const toggleStep = (i) => setChecked((c) => c.map((v, j) => (j === i ? !v : v)))
  const doneCount = checked.filter(Boolean).length

  return (
    <Page className="pb-40">
      <Navbar title="Plant doctor" left={<NavbarBackLink showText={false} onClick={nav.pop} />} />

      <div className="px-4 mt-4 vs-rise">
        <Photo q={PLANT.photo} className="w-full h-44 rounded-card overflow-hidden" alt={PLANT.name}>
          <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/70 via-black/10 to-transparent p-4">
            <div className="min-w-0">
              <div className="text-caption1 text-white/80 uppercase tracking-wide">Checking</div>
              <div className="text-title2 text-white truncate">{PLANT.name}</div>
              <div className="text-subhead text-white/80 truncate">{PLANT.species} · {PLANT.room}</div>
            </div>
          </div>
        </Photo>
      </div>

      <BlockTitle className="!mb-2">What do you see?</BlockTitle>
      <div className="grid grid-cols-3 gap-2 px-4">
        {SYMPTOMS.map((s, i) => {
          const on = selected.includes(s.id)
          return (
            <button
              key={s.id}
              onClick={() => toggleSymptom(s.id)}
              className={`rounded-card min-h-[76px] p-2 flex flex-col items-center justify-center gap-1 vs-rise ${on ? 'ring-2' : 'bg-card'}`}
              style={{ animationDelay: `${i * 50}ms`, ...(on ? { background: tint(C.water, 20), '--tw-ring-color': C.water } : {}) }}
            >
              <span className={`text-2xl ${on ? 'vs-bounce' : ''}`}>{s.emoji}</span>
              <span className={`text-footnote ${on ? 'font-semibold' : 'text-black/60 dark:text-white/60'}`}>{s.label}</span>
            </button>
          )
        })}
      </div>

      <BlockTitle className="!mb-2">Likely cause</BlockTitle>
      <div className="mx-4 rounded-card bg-card p-4 vs-rise" style={{ animationDelay: '120ms' }}>
        <div className="flex items-center gap-4">
          <Ring value={0.82} size={84} stroke={9} color={C.water}>
            <div className="text-center">
              <div className="text-headline" style={{ color: C.water }}>82%</div>
              <div className="text-caption2 text-black/55 dark:text-white/55">match</div>
            </div>
          </Ring>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Tile color={C.water} tinted size={26}><Droplets className="w-4 h-4" style={{ color: C.water }} /></Tile>
              <div className="text-title3 truncate">Overwatering</div>
            </div>
            <p className="text-subhead text-black/60 dark:text-white/60 mt-1">
              Soggy soil starves roots of air, so lower leaves turn yellow first. Monstera prefer to dry out a little between drinks.
            </p>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-line space-y-3">
          <div className="text-caption1 uppercase tracking-wide text-black/55 dark:text-white/55">Also possible</div>
          {OTHERS.map((o) => (
            <div key={o.name}>
              <div className="flex justify-between text-subhead mb-1">
                <span>{o.name}</span>
                <span className="font-semibold" style={{ color: o.color }}>{o.pct}%</span>
              </div>
              <Meter value={o.pct / 100} color={o.color} height={6} />
            </div>
          ))}
        </div>
      </div>

      <BlockTitle>Recovery plan</BlockTitle>
      <List strong inset dividers>
        {STEPS.map((step, i) => (
          <ListItem
            key={i}
            media={
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-subhead font-semibold"
                style={{ background: tint(C.water, 18), color: C.water }}
              >
                {i + 1}
              </div>
            }
            title={<span className={`text-body whitespace-normal ${checked[i] ? 'line-through opacity-50' : ''}`}>{step}</span>}
            after={
              <span className={checked[i] ? 'vs-bounce inline-flex' : 'inline-flex'}>
                <Checkbox checked={checked[i]} onChange={() => toggleStep(i)} />
              </span>
            }
          />
        ))}
      </List>
      <div className="px-4 -mt-2 flex items-start gap-2 text-footnote text-black/55 dark:text-white/55">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <span>{doneCount} of {STEPS.length} done · last watered {PLANT.lastWatered}. Keep Monty away from the radiator while it recovers.</span>
      </div>

      <Confetti run={doneCount === STEPS.length} />

      <div className="fixed bottom-0 left-0 right-0 px-4 pt-3 pb-8 bg-page border-t border-line">
        <Button large rounded onClick={() => setAdded(true)} disabled={added}>
          <span className="flex items-center gap-2 justify-center">
            <CalendarCheck className="w-5 h-5" />
            {added ? 'Added to Today' : 'Add steps to Today'}
          </span>
        </Button>
      </div>

      <Toast
        opened={added}
        position="center"
        button={<Link onClick={() => { setAdded(false); nav.reset('today') }}>View</Link>}
      >
        <span className="text-subhead">5 recovery steps added to Today</span>
      </Toast>
    </Page>
  )
}
