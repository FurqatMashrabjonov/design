import { useState } from 'react'
import { Page, Button, Block, Link } from 'konsta/react'
import { Clock, Flame, Check } from 'lucide-react'
import { useNav, Photo, Dots, Tile, tint } from '@od/kit'

const C = {"breakfast":"#047857","lunch":"#6b21a8","dinner":"#be185d","produce":"#0e7490","dairy":"#111111","pantry":"#b91c1c"}

const FRIDGE = [
  { e: '🐟', n: 'salmon' },
  { e: '🥬', n: 'spinach' },
  { e: '🥚', n: 'eggs' },
  { e: '🫘', n: 'chickpeas' },
  { e: '🧀', n: 'feta' },
  { e: '🍋', n: 'lemon' },
]

const WEEK = [
  { d: 'M', m: [1, 1, 1] },
  { d: 'T', m: [1, 1, 1] },
  { d: 'W', m: [1, 1, 1] },
  { d: 'T', m: [1, 1, 1], today: true },
  { d: 'F', m: [1, 1, 1] },
  { d: 'S', m: [1, 1, 0] },
  { d: 'S', m: [0, 0, 1] },
]
const MEAL_COLORS = [C.breakfast, C.lunch, C.dinner]

const AISLES = [
  { n: 'Produce', c: C.produce, done: 4, total: 9 },
  { n: 'Fish', c: C.dinner, done: 1, total: 3 },
  { n: 'Dairy', c: C.dairy, done: 2, total: 5 },
  { n: 'Pantry', c: C.pantry, done: 1, total: 6 },
  { n: 'Bakery', c: C.breakfast, done: 0, total: 2 },
]

const DIETS = ['Pescatarian', 'Vegetarian', 'Vegan', 'Everything']
const HOUSEHOLD = ['1', '2', '3', '4+']

function Choice({ on, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`h-11 px-4 rounded-full text-subhead font-medium border shrink-0 transition-colors ${
        on ? 'bg-primary text-white border-transparent' : 'border-line text-black/80 dark:text-white/80'
      }`}
    >
      {children}
    </button>
  )
}

export default function Screen() {
  const nav = useNav()
  const [i, setI] = useState(0)
  const [diet, setDiet] = useState('Pescatarian')
  const [people, setPeople] = useState('2')

  const slides = [
    {
      photo: 'glazed salmon bok choy',
      kicker: 'Discover',
      title: 'Cook what\nyou crave',
      text: 'Tell us what’s in your fridge and we’ll find dinners worth making tonight.',
      h: 'h-[400px]',
      art: (
        <div className="vs-float">
          <div className="flex items-center gap-3 py-3 border-y border-line">
            <Tile tinted color={C.dinner} size={44}><span className="text-xl">🐟</span></Tile>
            <div className="min-w-0 flex-1">
              <div className="text-headline truncate">Miso Butter Salmon</div>
              <div className="text-footnote text-black/55 dark:text-white/55 flex items-center gap-3">
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />25 min</span>
                <span className="flex items-center gap-1"><Flame className="w-3.5 h-3.5" />520 kcal</span>
                <span>★ 4.8</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto mt-3 -mx-4 px-4">
            {FRIDGE.map((f, k) => (
              <span
                key={f.n}
                className="vs-rise shrink-0 h-8 px-3 rounded-full flex items-center gap-1.5 text-footnote"
                style={{ background: tint(C.produce, 12), animationDelay: `${k * 60}ms` }}
              >
                <span>{f.e}</span>{f.n}
              </span>
            ))}
          </div>
        </div>
      ),
    },
    {
      photo: 'weekly meal prep table',
      kicker: 'Meal Plan',
      title: 'Plan your week\nin minutes',
      text: 'Breakfast, lunch and dinner for every day — leftovers counted, calories kept in check.',
      h: 'h-[380px]',
      art: (
        <div className="vs-float pt-3 border-t border-line">
          <div className="grid grid-cols-7 gap-2">
            {WEEK.map((day, k) => (
              <div key={k} className="flex flex-col items-center gap-1.5">
                <span className={`text-caption1 font-semibold ${day.today ? 'text-primary' : 'text-black/55 dark:text-white/55'}`}>{day.d}</span>
                {day.m.map((on, j) => (
                  <div
                    key={j}
                    className="vs-rise w-full h-5 rounded-md"
                    style={{
                      background: on ? MEAL_COLORS[j] : 'transparent',
                      border: on ? 'none' : `1.5px dashed ${tint(MEAL_COLORS[j], 60)}`,
                      animationDelay: `${(k * 3 + j) * 25}ms`,
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-3 text-footnote text-black/55 dark:text-white/55">
            <span><b className="text-black dark:text-white">18</b> of 21 meals planned</span>
            <span>1,840 kcal / day</span>
          </div>
        </div>
      ),
    },
    {
      photo: 'farmers market produce',
      kicker: 'Shopping List',
      title: 'Shop by aisle,\nwaste less',
      text: 'One list for the week, sorted the way your store is.',
      h: 'h-[290px]',
      art: (
        <div>
          <div className="flex gap-1.5 mb-4">
            {AISLES.map((a) => (
              <div key={a.n} className="flex-1 min-w-0">
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: tint(a.c, 20) }}>
                  <div className="h-full rounded-full" style={{ width: `${(a.done / a.total) * 100}%`, background: a.c }} />
                </div>
                <div className="text-caption2 mt-1 truncate text-black/55 dark:text-white/55">{a.n}</div>
              </div>
            ))}
          </div>
          <div className="text-footnote font-semibold uppercase tracking-wide text-black/55 dark:text-white/55 mb-2">How do you eat?</div>
          <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
            {DIETS.map((d) => (
              <Choice key={d} on={diet === d} onClick={() => setDiet(d)}>
                {diet === d && <Check className="w-4 h-4 inline -mt-0.5 mr-1" />}{d}
              </Choice>
            ))}
          </div>
          <div className="text-footnote font-semibold uppercase tracking-wide text-black/55 dark:text-white/55 mt-4 mb-2">Cooking for</div>
          <div className="flex gap-2">
            {HOUSEHOLD.map((h) => (
              <Choice key={h} on={people === h} onClick={() => setPeople(h)}>
                <span className="inline-block min-w-[24px] text-center">{h}</span>
              </Choice>
            ))}
          </div>
        </div>
      ),
    },
  ]

  const s = slides[i]
  const last = i === slides.length - 1

  return (
    <Page className="flex flex-col">
      <div key={i} className="flex-1 flex flex-col vs-rise">
        <Photo q={s.photo} className={`relative w-full ${s.h} shrink-0`}>
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/30" />
          <div className="absolute top-0 inset-x-0 flex justify-between items-center px-4 pt-14">
            <span className="text-footnote font-semibold tracking-[0.2em] uppercase text-white/90">Saffron &amp; Sage</span>
            {!last && (
              <button className="h-11 px-2 text-subhead font-medium text-white" onClick={() => setI(slides.length - 1)}>
                Skip
              </button>
            )}
          </div>
          <div className="absolute bottom-0 inset-x-0 px-4 pb-6 text-white">
            <div className="text-caption1 font-semibold uppercase tracking-[0.18em] text-white/75 mb-2">
              {String(i + 1).padStart(2, '0')} — {s.kicker}
            </div>
            <h1 className="text-large-title whitespace-pre-line leading-tight">{s.title}</h1>
          </div>
        </Photo>
        <div className="px-4 pt-4 flex-1">
          <p className="text-body text-black/60 dark:text-white/60 mb-4">{s.text}</p>
          {s.art}
        </div>
      </div>
      <div className="mt-4 mb-4"><Dots count={slides.length} active={i} /></div>
      <Block className="!mt-0 !mb-10">
        <Button large rounded onClick={() => (last ? nav.reset('discover') : setI(i + 1))}>
          {last ? 'Start cooking' : 'Continue'}
        </Button>
        <div className="text-center mt-3 text-subhead">
          {i > 0 ? (
            <Link onClick={() => setI(i - 1)}>Back</Link>
          ) : (
            <>
              <span className="text-black/55 dark:text-white/55">Already have an account? </span>
              <Link onClick={() => nav.reset('discover')}>Log in</Link>
            </>
          )}
        </div>
      </Block>
    </Page>
  )
}
