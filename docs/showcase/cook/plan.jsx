import { useState, useRef } from 'react'
import { Page, Navbar, Link, Block, BlockTitle, List, ListItem, Button, Sheet, Toast } from 'konsta/react'
import { ChevronLeft, ChevronRight, Plus, Clock, ShoppingBasket, Flame, CalendarCheck, Sparkles } from 'lucide-react'
import { useNav, AppTabbar, Photo, Meter, Confetti, CountUp, tint } from '@od/kit'

const C = {"breakfast":"#047857","lunch":"#6b21a8","dinner":"#be185d","produce":"#0e7490","dairy":"#111111","pantry":"#b91c1c"}

const R = {
  salmon: { name: 'Miso Butter Salmon', time: 25, kcal: 520, photo: 'glazed salmon bok choy', type: 'dinner' },
  stew: { name: 'Lemony Chickpea Stew', time: 30, kcal: 430, photo: 'chickpea spinach stew bowl', type: 'dinner' },
  tacos: { name: 'Shrimp Tacos', time: 20, kcal: 480, photo: 'shrimp tacos lime slaw', type: 'dinner' },
  gnocchi: { name: 'Crispy Gnocchi', time: 20, kcal: 560, photo: 'crispy gnocchi cherry tomatoes', type: 'dinner' },
  cod: { name: 'Harissa Roasted Cod', time: 35, kcal: 510, photo: 'roasted cod couscous plate', type: 'dinner' },
  risotto: { name: 'Mushroom Risotto', time: 45, kcal: 590, photo: 'creamy mushroom risotto', type: 'dinner' },
  bowl: { name: 'Greek Grain Bowl', time: 15, kcal: 450, photo: 'greek grain bowl feta', type: 'lunch' },
  tuna: { name: 'Tuna White Bean Salad', time: 10, kcal: 390, photo: 'tuna white bean salad', type: 'lunch' },
  soup: { name: 'Tomato Soup & Grilled Cheese', time: 30, kcal: 620, photo: 'tomato soup grilled cheese', type: 'lunch' },
  muffins: { name: 'Spinach Feta Egg Muffins', time: 25, kcal: 210, photo: 'spinach egg muffins', type: 'breakfast' },
  oats: { name: 'Overnight Oats', time: 5, kcal: 340, photo: 'overnight oats berries jar', type: 'breakfast' },
  shakshuka: { name: 'Shakshuka with Feta', time: 25, kcal: 380, photo: 'shakshuka skillet feta', type: 'breakfast' },
  toast: { name: 'Avocado Toast', time: 10, kcal: 360, photo: 'avocado toast fried egg', type: 'breakfast' },
}

const MEALS = [
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'lunch', label: 'Lunch' },
  { id: 'dinner', label: 'Dinner' },
]

const WEEK = [
  { d: 'Mon', n: 28, long: 'Monday, Sep 28', meals: { breakfast: 'oats', lunch: 'tuna', dinner: 'stew' } },
  { d: 'Tue', n: 29, long: 'Tuesday, Sep 29', meals: { breakfast: 'muffins', lunch: 'bowl', dinner: 'tacos' } },
  { d: 'Wed', n: 30, long: 'Wednesday, Sep 30', meals: { breakfast: 'oats', lunch: 'stew', dinner: 'gnocchi' }, leftover: 'lunch' },
  { d: 'Thu', n: 1, long: 'Thursday, Oct 1', meals: { breakfast: 'toast', lunch: 'bowl', dinner: 'salmon' }, today: true },
  { d: 'Fri', n: 2, long: 'Friday, Oct 2', meals: { breakfast: 'muffins', lunch: 'tuna', dinner: 'cod' } },
  { d: 'Sat', n: 3, long: 'Saturday, Oct 3', meals: { breakfast: 'shakshuka', lunch: 'soup', dinner: null } },
  { d: 'Sun', n: 4, long: 'Sunday, Oct 4', meals: { breakfast: null, lunch: null, dinner: 'risotto' } },
]

function Slot({ meal, rid, leftover, onOpen, onAdd }) {
  const r = rid ? R[rid] : null
  return (
    <div className="min-w-0">
      <div className="text-caption2 font-semibold uppercase tracking-wide mb-1.5" style={{ color: C[meal.id] }}>
        {meal.label}
      </div>
      {r ? (
        <button className="block w-full text-left active:opacity-70" onClick={onOpen}>
          <Photo q={r.photo} className="w-full h-24 rounded-2xl">
            {leftover && (
              <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full bg-black/60 text-white text-caption2">Leftover</div>
            )}
          </Photo>
          <div className="text-footnote font-semibold mt-1.5 leading-tight line-clamp-2">{r.name}</div>
          <div className="flex items-center gap-1 text-caption1 text-black/55 dark:text-white/55 mt-0.5">
            <Clock className="w-3 h-3" /> {r.time} min
          </div>
        </button>
      ) : (
        <button
          onClick={onAdd}
          className="w-full h-24 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-1 active:opacity-70"
          style={{ borderColor: tint(C[meal.id], 55), background: tint(C[meal.id], 6) }}
        >
          <Plus className="w-5 h-5" style={{ color: C[meal.id] }} />
          <span className="text-footnote font-semibold" style={{ color: C[meal.id] }}>Add</span>
        </button>
      )}
    </div>
  )
}

export default function Screen() {
  const nav = useNav()
  const [plan, setPlan] = useState(WEEK.map((w) => ({ ...w.meals })))
  const [sel, setSel] = useState(3)
  const [picker, setPicker] = useState(null)
  const [toast, setToast] = useState(false)
  const refs = useRef({})

  const planned = plan.reduce((s, p) => s + Object.values(p).filter(Boolean).length, 0)
  const dayKcal = (i) => Object.values(plan[i]).reduce((s, id) => s + (id ? R[id].kcal : 0), 0)

  const jump = (i) => {
    setSel(i)
    refs.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const showToast = () => {
    setToast(true)
    setTimeout(() => setToast(false), 2200)
  }
  const pick = (id) => {
    const next = plan.map((p, i) => (i === picker.day ? { ...p, [picker.meal]: id } : p))
    setPlan(next)
    setPicker(null)
  }
  const options = picker ? Object.entries(R).filter(([, r]) => r.type === picker.meal) : []

  return (
    <Page className="pb-32">
      <Navbar large transparent title="Meal Plan" />

      <div className="px-4 pt-1 flex items-center justify-between">
        <div className="min-w-0">
          <div className="text-caption1 uppercase tracking-wider text-black/55 dark:text-white/55">This week</div>
          <div className="text-title3 truncate">Sep 28 – Oct 4</div>
        </div>
        <div className="flex items-center gap-1">
          <Link iconOnly onClick={showToast}><ChevronLeft className="w-6 h-6" /></Link>
          <Link iconOnly onClick={showToast}><ChevronRight className="w-6 h-6" /></Link>
        </div>
      </div>

      <div className="px-4 mt-4 pb-4 border-b border-line">
        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-figure"><CountUp to={planned} /></span>
              <span className="text-title3 text-black/55 dark:text-white/55">/ 21</span>
            </div>
            <div className="text-footnote text-black/55 dark:text-white/55">meals planned</div>
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end gap-1 text-title3">
              <Flame className="w-5 h-5" style={{ color: C.dinner }} /> 1,840
            </div>
            <div className="text-footnote text-black/55 dark:text-white/55">avg kcal/day · goal 1,900</div>
          </div>
        </div>
        <div className="mt-3"><Meter value={planned / 21} height={6} /></div>
      </div>

      <div className="flex justify-between px-3 pt-4 pb-2">
        {WEEK.map((w, i) => {
          const count = Object.values(plan[i]).filter(Boolean).length
          const active = sel === i
          return (
            <button
              key={w.d}
              onClick={() => jump(i)}
              className={`w-12 py-2 rounded-2xl flex flex-col items-center gap-0.5 ${active ? 'bg-primary text-white' : ''}`}
            >
              <span className={`text-caption2 uppercase ${active ? 'opacity-90' : 'text-black/55 dark:text-white/55'}`}>{w.d}</span>
              <span className="text-headline">{w.n}</span>
              <span className="flex gap-0.5 h-1.5 items-center">
                {MEALS.map((m) => (
                  <span
                    key={m.id}
                    className="w-1 h-1 rounded-full"
                    style={{ background: plan[i][m.id] ? (active ? '#ffffff' : C[m.id]) : 'transparent', border: plan[i][m.id] ? 'none' : `1px solid ${active ? '#ffffffaa' : '#8884'}` }}
                  />
                ))}
              </span>
              {w.today && !active && <span className="text-caption2 text-primary font-semibold leading-none">Today</span>}
              {count === 0 && null}
            </button>
          )
        })}
      </div>

      <div className="px-4 mt-3 vs-rise">
        <Photo q={R.salmon.photo} className="w-full h-48 rounded-card overflow-hidden relative">
          <button
            onClick={() => nav.push('recipe', { id: 'salmon' })}
            className="absolute inset-0 flex flex-col justify-end p-4 text-left bg-gradient-to-t from-black/75 via-black/20 to-transparent"
          >
            <span className="text-caption1 uppercase tracking-wider text-white/85">Tonight · Thursday</span>
            <span className="text-title2 text-white">Miso Butter Salmon with Bok Choy</span>
            <span className="text-footnote text-white/80">25 min · Easy · 520 kcal</span>
          </button>
        </Photo>
      </div>

      <Block className="!mt-4 !mb-2">
        <Button large rounded onClick={() => nav.reset('list')}>
          <ShoppingBasket className="w-5 h-5 mr-2" /> Build shopping list
        </Button>
        <div className="text-footnote text-center mt-2 text-black/55 dark:text-white/55">
          {21 - planned} slots open · 24 items from 7 recipes
        </div>
      </Block>

      {WEEK.map((w, i) => {
        const count = Object.values(plan[i]).filter(Boolean).length
        return (
          <div
            key={w.d}
            ref={(el) => { refs.current[i] = el }}
            className="px-4 pt-5 pb-5 border-t border-line vs-rise scroll-mt-24"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-baseline justify-between mb-3">
              <div className="flex items-baseline gap-2 min-w-0">
                <span className="text-title3 truncate">{w.long}</span>
                {w.today && (
                  <span className="text-caption1 font-semibold px-2 py-0.5 rounded-full text-primary" style={{ background: tint('#888888', 14) }}>Today</span>
                )}
              </div>
              <span className="text-footnote text-black/55 dark:text-white/55 shrink-0">
                {count === 3 ? <CalendarCheck className="w-4 h-4 inline -mt-0.5 mr-1" style={{ color: C.breakfast }} /> : null}
                {dayKcal(i).toLocaleString()} kcal
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {MEALS.map((m) => (
                <Slot
                  key={m.id}
                  meal={m}
                  rid={plan[i][m.id]}
                  leftover={w.leftover === m.id}
                  onOpen={() => nav.push('recipe', { id: plan[i][m.id] })}
                  onAdd={() => setPicker({ day: i, meal: m.id })}
                />
              ))}
            </div>
          </div>
        )
      })}

      <div className="px-4 pt-4 border-t border-line flex items-center gap-2 text-footnote text-black/55 dark:text-white/55">
        <Sparkles className="w-4 h-4" /> 6-week planning streak — keep it going.
      </div>

      <Sheet className="pb-8" opened={!!picker} onBackdropClick={() => setPicker(null)}>
        {picker && (
          <>
            <div className="px-4 pt-5">
              <div className="text-caption1 uppercase tracking-wider font-semibold" style={{ color: C[picker.meal] }}>
                {MEALS.find((m) => m.id === picker.meal).label}
              </div>
              <div className="text-title2">{WEEK[picker.day].long}</div>
            </div>
            <BlockTitle>Suggestions</BlockTitle>
            <List strong inset dividers>
              {options.map(([id, r]) => (
                <ListItem
                  key={id}
                  link
                  onClick={() => pick(id)}
                  title={<span className="truncate">{r.name}</span>}
                  subtitle={<span className="text-footnote opacity-60">{r.time} min · {r.kcal} kcal</span>}
                  media={<Photo q={r.photo} className="w-14 h-14 rounded-2xl" />}
                />
              ))}
            </List>
          </>
        )}
      </Sheet>

      <Toast opened={toast} position="center">Only this week is planned so far</Toast>
      <Confetti run={planned === 21} />
      <AppTabbar active="plan" />
    </Page>
  )
}
