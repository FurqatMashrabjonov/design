import { useState } from 'react'
import { Page, Navbar, Link, Block, BlockTitle, List, ListItem, ListInput, Checkbox, Button, Toast } from 'konsta/react'
import { Plus, Share, Store, ChevronRight } from 'lucide-react'
import { useNav, AppTabbar, Meter, Tile, CountUp, Confetti, tint } from '@od/kit'

const C = {"breakfast":"#047857","lunch":"#6b21a8","dinner":"#be185d","produce":"#0e7490","dairy":"#111111","pantry":"#b91c1c"}

const SECTIONS = [
  { id: 'produce', name: 'Produce', emoji: '🥬', color: C.produce },
  { id: 'fish', name: 'Fish & Meat', emoji: '🐟', color: C.dinner },
  { id: 'dairy', name: 'Dairy & Eggs', emoji: '🧀', color: C.dairy },
  { id: 'pantry', name: 'Pantry', emoji: '🫙', color: C.pantry },
  { id: 'bakery', name: 'Bakery', emoji: '🍞', color: C.breakfast },
]

const ITEMS = [
  { id: 1, s: 'produce', name: 'Baby bok choy', qty: '2 heads', recipe: 'Miso Butter Salmon', done: true },
  { id: 2, s: 'produce', name: 'Spinach', qty: '200 g', recipe: 'Lemony Chickpea Stew', done: true },
  { id: 3, s: 'produce', name: 'Lemons', qty: '3', recipe: 'Lemony Chickpea Stew', done: true },
  { id: 4, s: 'produce', name: 'Cherry tomatoes', qty: '500 g', recipe: 'Crispy Gnocchi', done: false },
  { id: 5, s: 'produce', name: 'Scallions', qty: '1 bunch', recipe: 'Miso Butter Salmon', done: false },
  { id: 6, s: 'produce', name: 'Cremini mushrooms', qty: '300 g', recipe: 'Mushroom Risotto', done: false },
  { id: 7, s: 'produce', name: 'Avocados', qty: '2', recipe: 'Avocado Toast', done: false },
  { id: 8, s: 'produce', name: 'Garlic', qty: '1 bulb', recipe: 'Miso Butter Salmon', done: true },
  { id: 9, s: 'produce', name: 'Frozen peas', qty: '1 cup', recipe: 'Mushroom Risotto', done: false },
  { id: 10, s: 'fish', name: 'Salmon fillets', qty: '2 × 150 g', recipe: 'Miso Butter Salmon', done: true },
  { id: 11, s: 'fish', name: 'Cod fillets', qty: '2 × 170 g', recipe: 'Harissa Roasted Cod', done: false },
  { id: 12, s: 'fish', name: 'Shrimp', qty: '400 g', recipe: 'Shrimp Tacos', done: false },
  { id: 13, s: 'dairy', name: 'Eggs', qty: '12', recipe: 'Spinach Feta Egg Muffins', done: true },
  { id: 14, s: 'dairy', name: 'Feta', qty: '200 g', recipe: 'Spinach Feta Egg Muffins', done: true },
  { id: 15, s: 'dairy', name: 'Unsalted butter', qty: '250 g', recipe: 'Miso Butter Salmon', done: false },
  { id: 16, s: 'dairy', name: 'Parmesan', qty: '80 g', recipe: 'Mushroom Risotto', done: false },
  { id: 17, s: 'dairy', name: 'Cheddar', qty: '150 g', recipe: 'Tomato Soup & Grilled Cheese', done: false },
  { id: 18, s: 'pantry', name: 'White miso', qty: '1 tub', recipe: 'Miso Butter Salmon', done: true },
  { id: 19, s: 'pantry', name: 'Chickpeas', qty: '2 cans', recipe: 'Lemony Chickpea Stew', done: false },
  { id: 20, s: 'pantry', name: 'Arborio rice', qty: '300 g', recipe: 'Mushroom Risotto', done: false },
  { id: 21, s: 'pantry', name: 'Couscous', qty: '250 g', recipe: 'Harissa Roasted Cod', done: false },
  { id: 22, s: 'pantry', name: 'Harissa paste', qty: '1 jar', recipe: 'Harissa Roasted Cod', done: false },
  { id: 23, s: 'pantry', name: 'Rolled oats', qty: '500 g', recipe: 'Overnight Oats', done: false },
  { id: 24, s: 'bakery', name: 'Sourdough loaf', qty: '1', recipe: 'Tomato Soup & Grilled Cheese', done: false },
  { id: 25, s: 'bakery', name: 'Corn tortillas', qty: '8', recipe: 'Shrimp Tacos', done: false },
].slice(0, 25)

export default function Screen() {
  const nav = useNav()
  const [items, setItems] = useState(ITEMS.filter((it) => it.id !== 25 || true).slice(0, 24).concat([]))
  const [draft, setDraft] = useState('')
  const [bounced, setBounced] = useState(null)
  const [toast, setToast] = useState(false)

  const total = items.length
  const done = items.filter((i) => i.done).length
  const allDone = total > 0 && done === total

  const toggle = (id) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, done: !i.done } : i)))
    setBounced(id)
  }

  const add = () => {
    const name = draft.trim()
    if (!name) return
    setItems((prev) => [...prev, { id: Date.now(), s: 'pantry', name: name.charAt(0).toUpperCase() + name.slice(1), qty: '1', recipe: null, done: false }])
    setDraft('')
    setToast(true)
    setTimeout(() => setToast(false), 1800)
  }

  return (
    <Page className="pb-32">
      <Navbar large transparent title="Shopping list"
        right={<Link iconOnly onClick={() => setToast(true)}><Share className="w-6 h-6" /></Link>} />

      <div className="px-4 pt-2 pb-4 vs-rise">
        <div className="flex items-baseline gap-2">
          <span className="text-figure text-primary"><CountUp to={done} /></span>
          <span className="text-title3">of {total} items</span>
        </div>
        <div className="mt-3"><Meter value={total ? done / total : 0} height={6} /></div>
        <div className="mt-2 flex items-center justify-between text-footnote text-black/55 dark:text-white/55">
          <span>For 7 recipes this week · Sep 28 – Oct 4</span>
          <span>{total - done} to go</span>
        </div>
      </div>

      <List strong inset className="!my-2">
        <ListInput
          type="text"
          placeholder="Add an item — e.g. olive oil"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') add() }}
          media={<Tile color="#000" size={30} tinted><Plus className="w-4 h-4 text-primary" /></Tile>}
          after={null}
        />
      </List>
      <div className="px-4 pb-2 flex justify-end">
        <Button rounded small inline className="!w-auto px-5" onClick={add} disabled={!draft.trim()}>Add item</Button>
      </div>

      {SECTIONS.map((sec, si) => {
        const rows = items.filter((i) => i.s === sec.id).sort((a, b) => Number(a.done) - Number(b.done))
        if (!rows.length) return null
        const left = rows.filter((r) => !r.done).length
        return (
          <div key={sec.id} className="vs-rise" style={{ animationDelay: `${si * 60}ms` }}>
            <BlockTitle className="!mt-6 flex items-center gap-2 !mb-2">
              <Tile color={sec.color} tinted size={28}><span className="text-base">{sec.emoji}</span></Tile>
              <span className="flex-1">{sec.name}</span>
              <span className="text-footnote font-semibold rounded-full px-2.5 py-0.5"
                style={{ background: tint(sec.color, 14), color: sec.id === 'dairy' ? undefined : sec.color }}>
                {left === 0 ? 'Done' : `${left} left`}
              </span>
            </BlockTitle>
            <div className="mx-4 h-0.5 rounded-full mb-1" style={{ background: sec.color, opacity: 0.6 }} />
            <List strong inset dividers className="!mt-2">
              {rows.map((it) => (
                <ListItem
                  key={it.id}
                  label
                  media={
                    <span className={bounced === it.id ? 'vs-bounce inline-flex' : 'inline-flex'}>
                      <Checkbox checked={it.done} onChange={() => toggle(it.id)} />
                    </span>
                  }
                  title={
                    <span className={`text-body truncate ${it.done ? 'line-through text-black/40 dark:text-white/40' : ''}`}>{it.name}</span>
                  }
                  subtitle={
                    it.recipe ? (
                      <button
                        type="button"
                        className={`text-footnote inline-flex items-center gap-0.5 min-h-[28px] max-w-[200px] ${it.done ? 'opacity-40' : 'text-primary'}`}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); nav.push('recipe', { name: it.recipe }) }}
                      >
                        <span className="truncate">{it.recipe}</span>
                        <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                      </button>
                    ) : (
                      <span className="text-footnote text-black/55 dark:text-white/55">Added by you</span>
                    )
                  }
                  after={
                    <span className={`text-subhead tabular-nums ${it.done ? 'text-black/35 dark:text-white/35' : 'text-black/70 dark:text-white/70'}`}>{it.qty}</span>
                  }
                />
              ))}
            </List>
          </div>
        )
      })}

      <div className="mx-4 mt-6 pt-4 border-t border-line flex items-center gap-3 text-footnote text-black/55 dark:text-white/55">
        <Store className="w-5 h-5 shrink-0" />
        <span>Sorted for FreshMarket Park Slope · household of 2</span>
      </div>

      <Confetti run={allDone} />
      <Toast opened={toast} position="center">{draft ? 'List shared' : 'Added to Pantry'}</Toast>
      <AppTabbar active="list" />
    </Page>
  )
}
