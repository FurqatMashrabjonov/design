import { useState, useEffect } from 'react'
import { Page, Navbar, Block, BlockTitle, List, ListItem, Chip, Stepper, Range, Toggle, Button, Toast, Actions, ActionsGroup, ActionsLabel, ActionsButton, Link } from 'konsta/react'
import { Ruler, Bell, ShoppingBag, Settings, Check, Users, Flame, Leaf } from 'lucide-react'
import { useNav, AppTabbar, Avatar, Photo, Tile, tint, CountUp } from '@od/kit'

const C = {"breakfast":"#047857","lunch":"#6b21a8","dinner":"#be185d","produce":"#0e7490","dairy":"#111111","pantry":"#b91c1c"}

const USER = { name: 'Maya Okafor', city: 'Brooklyn' }
const STATS = [
  { label: 'Cooked', value: 42, unit: 'recipes', color: C.dinner },
  { label: 'Streak', value: 6, unit: 'weeks planned', color: C.breakfast },
  { label: 'Saved', value: 24, unit: 'recipes', color: C.lunch },
]
const DIETS = [
  { id: 'pescatarian', label: 'Pescatarian', emoji: '🐟' },
  { id: 'vegetarian', label: 'Vegetarian', emoji: '🥕' },
  { id: 'vegan', label: 'Vegan', emoji: '🌱' },
  { id: 'flexitarian', label: 'Flexitarian', emoji: '🍽️' },
]
const ALLERGIES = [
  { id: 'treenuts', label: 'Tree nuts', emoji: '🌰' },
  { id: 'peanuts', label: 'Peanuts', emoji: '🥜' },
  { id: 'gluten', label: 'Gluten', emoji: '🌾' },
  { id: 'shellfish', label: 'Shellfish', emoji: '🦐' },
  { id: 'lactose', label: 'Lactose', emoji: '🥛' },
]
const DISLIKES = [
  { id: 'cilantro', label: 'Cilantro', emoji: '🌿' },
  { id: 'olives', label: 'Olives', emoji: '🫒' },
  { id: 'mushrooms', label: 'Mushrooms', emoji: '🍄' },
  { id: 'anchovies', label: 'Anchovies', emoji: '🐟' },
]

function ChipRow({ items, selected, onToggle, color }) {
  return (
    <div className="flex gap-2 overflow-x-auto px-4 pb-1">
      {items.map((it) => {
        const on = selected.includes(it.id)
        return (
          <Chip
            key={it.id}
            outline={!on}
            onClick={() => onToggle(it.id)}
            className={`shrink-0 min-h-[36px] cursor-pointer ${on ? 'vs-bounce font-semibold' : ''}`}
            style={on ? { background: tint(color, 18), color: color === C.dairy ? undefined : color } : undefined}
            media={<span className="text-base">{it.emoji}</span>}
          >
            {it.label}
            {on && <Check className="w-4 h-4 ml-1 inline" />}
          </Chip>
        )
      })}
    </div>
  )
}

export default function Screen() {
  const nav = useNav()
  const [diet, setDiet] = useState(['pescatarian'])
  const [allergies, setAllergies] = useState(['treenuts'])
  const [dislikes, setDislikes] = useState(['cilantro'])
  const [household, setHousehold] = useState(2)
  const [kcal, setKcal] = useState(1900)
  const [reminders, setReminders] = useState(true)
  const [units, setUnits] = useState('Metric')
  const [unitsOpen, setUnitsOpen] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!saved) return
    const t = setTimeout(() => setSaved(false), 2200)
    return () => clearTimeout(t)
  }, [saved])

  const toggleIn = (setter) => (id) =>
    setter((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))

  return (
    <Page className="pb-32">
      <Navbar large transparent title="Profile"
        right={<Link iconOnly onClick={() => setUnitsOpen(true)}><Settings className="w-6 h-6" /></Link>} />

      {/* Identity */}
      <div className="px-4 pt-2 vs-rise">
        <Photo q="bright kitchen herbs" className="w-full h-32 rounded-[24px]" />
        <div className="flex items-end gap-4 -mt-10 px-3">
          <div className="rounded-full ring-4 ring-[var(--tw-ring-offset-color)]" style={{ boxShadow: '0 0 0 4px rgb(var(--k-color-page, 255 255 255) / 0)' }}>
            <Avatar name={USER.name} color={C.dinner} size={80} />
          </div>
          <div className="min-w-0 pb-1">
            <div className="text-title2 truncate">{USER.name}</div>
            <div className="text-footnote text-black/55 dark:text-white/55">{USER.city} · Pescatarian · Household of 2</div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 mx-4 mt-6 border-y border-line">
        {STATS.map((s, i) => (
          <div key={s.label} className={`py-4 text-center vs-rise ${i > 0 ? 'border-l border-line' : ''}`}
            style={{ animationDelay: `${i * 60}ms` }}>
            <div className="text-caption1 uppercase tracking-wide text-black/55 dark:text-white/55">{s.label}</div>
            <div className="text-title1 leading-tight" style={{ color: s.color }}><CountUp to={s.value} /></div>
            <div className="text-caption2 text-black/55 dark:text-white/55">{s.unit}</div>
          </div>
        ))}
      </div>

      {/* Dietary preferences */}
      <BlockTitle className="!mb-2" large>Dietary preferences</BlockTitle>
      <div className="px-4 pb-2 text-footnote text-black/55 dark:text-white/55">We filter Discover and your plan with these.</div>

      <div className="px-4 pt-3 pb-2 flex items-center gap-2 text-subhead font-semibold">
        <Leaf className="w-4 h-4" style={{ color: C.breakfast }} /> Diet
      </div>
      <ChipRow items={DIETS} selected={diet} onToggle={(id) => setDiet([id])} color={C.breakfast} />

      <div className="px-4 pt-4 pb-2 flex items-center gap-2 text-subhead font-semibold">
        <span style={{ color: C.pantry }}>⚠︎</span> Allergies
      </div>
      <ChipRow items={ALLERGIES} selected={allergies} onToggle={toggleIn(setAllergies)} color={C.pantry} />

      <div className="px-4 pt-4 pb-2 flex items-center gap-2 text-subhead font-semibold">
        <span style={{ color: C.lunch }}>✕</span> Dislikes
      </div>
      <ChipRow items={DISLIKES} selected={dislikes} onToggle={toggleIn(setDislikes)} color={C.lunch} />

      {/* Household & goal */}
      <BlockTitle>Household & goal</BlockTitle>
      <List strong inset dividers>
        <ListItem
          title="Household size"
          subtitle={<span className="text-footnote opacity-60">Servings scale to {household} {household === 1 ? 'person' : 'people'}</span>}
          media={<Tile color={C.produce} tinted><Users className="w-4 h-4" style={{ color: C.produce }} /></Tile>}
          after={<Stepper small rounded value={household}
            onMinus={() => setHousehold(Math.max(1, household - 1))}
            onPlus={() => setHousehold(Math.min(8, household + 1))} />}
        />
        <ListItem
          title="Daily calorie goal"
          media={<Tile color={C.dinner} tinted><Flame className="w-4 h-4" style={{ color: C.dinner }} /></Tile>}
          after={<span className="text-headline" style={{ color: C.dinner }}>{kcal.toLocaleString('en-US')} kcal</span>}
          footer={
            <div className="pt-2 pr-1">
              <Range min={1200} max={3000} step={50} value={kcal} onChange={(e) => setKcal(Number(e.target.value))} />
              <div className="flex justify-between text-caption2 opacity-60">
                <span>1,200</span><span>This week avg 1,840</span><span>3,000</span>
              </div>
            </div>
          }
        />
      </List>

      {/* Settings */}
      <BlockTitle>Settings</BlockTitle>
      <List strong inset dividers>
        <ListItem link title="Units" onClick={() => setUnitsOpen(true)}
          media={<Tile color={C.produce}><Ruler className="w-4 h-4 text-white" /></Tile>}
          after={<span className="text-subhead opacity-60">{units}</span>} />
        <ListItem title="Meal reminders"
          subtitle={<span className="text-footnote opacity-60">Every day at 5:30 pm</span>}
          media={<Tile color={C.pantry}><Bell className="w-4 h-4 text-white" /></Tile>}
          after={<Toggle checked={reminders} onChange={() => setReminders(!reminders)} />} />
        <ListItem title="Grocery store"
          subtitle={<span className="text-footnote opacity-60 truncate">FreshMarket Park Slope</span>}
          media={<Tile color={C.breakfast}><ShoppingBag className="w-4 h-4 text-white" /></Tile>}
          after={<span className="text-footnote font-semibold flex items-center gap-1" style={{ color: C.breakfast }}><Check className="w-4 h-4" />Connected</span>} />
      </List>

      <Block className="!mt-6">
        <Button large rounded onClick={() => setSaved(true)}>Save preferences</Button>
        <div className="text-center text-footnote text-black/55 dark:text-white/55 mt-3">
          18 of 21 meals planned this week will be rechecked.
        </div>
      </Block>

      <Actions opened={unitsOpen} onBackdropClick={() => setUnitsOpen(false)}>
        <ActionsGroup>
          <ActionsLabel>Measurement units</ActionsLabel>
          {['Metric', 'Imperial'].map((u) => (
            <ActionsButton key={u} bold={units === u} onClick={() => { setUnits(u); setUnitsOpen(false) }}>{u}</ActionsButton>
          ))}
        </ActionsGroup>
        <ActionsGroup>
          <ActionsButton onClick={() => setUnitsOpen(false)}>Cancel</ActionsButton>
        </ActionsGroup>
      </Actions>

      <Toast position="center" opened={saved} className="bottom-28">
        <span className="flex items-center gap-2"><Check className="w-4 h-4" /> Preferences saved</span>
      </Toast>

      <AppTabbar active="profile" />
    </Page>
  )
}
