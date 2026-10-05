import { useState } from 'react'
import { Page, Sheet, Block, BlockTitle, List, ListItem, ListInput, Toggle, Button, Link, Segmented, SegmentedButton } from 'konsta/react'
import { X } from 'lucide-react'
import { useNav, Tile, tint } from '@od/kit'

const C = { food: '#ff9f0a', transport: '#0a84ff', fun: '#bf5af2', home: '#30d158' }
const CATEGORIES = [
  { id: 'food', name: 'Food', emoji: '🍜' },
  { id: 'transport', name: 'Taxi', emoji: '🚕' },
  { id: 'fun', name: 'Fun', emoji: '🎟️' },
  { id: 'home', name: 'Home', emoji: '🏠' },
]

// A modal screen: the open Sheet is the screen — a page sheet, nearly full height over the dimmed page. Closing it goes back.
export default function Screen() {
  const nav = useNav()
  const [cat, setCat] = useState('food')
  const [when, setWhen] = useState('Today')
  const [split, setSplit] = useState(false)
  return (
    <Page>
      <Sheet className="pb-safe h-[calc(100%-3rem)] overflow-y-auto" opened onBackdropClick={() => nav.pop()}>
        <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-black/15 dark:bg-white/25" />
        <div className="flex items-center justify-between px-4 pt-3">
          <span className="text-headline">New expense</span>
          <Link iconOnly onClick={() => nav.pop()}><X className="w-5 h-5" /></Link>
        </div>

        <Block className="!mt-4 text-center">
          <div className="text-footnote opacity-60">Amount</div>
          <div className="text-figure leading-none mt-1" style={{ color: C[cat] }}>$24.50</div>
        </Block>

        <div className="grid grid-cols-4 gap-2 px-4">
          {CATEGORIES.map((c) => (
            <button key={c.id} onClick={() => setCat(c.id)}
              className="flex flex-col items-center gap-1.5 rounded-2xl py-3 transition active:scale-[.96]"
              style={{ background: cat === c.id ? tint(C[c.id], 22) : 'transparent', outline: cat === c.id ? `2px solid ${C[c.id]}` : 'none' }}>
              <Tile tinted color={C[c.id]} size={40}>{c.emoji}</Tile>
              <span className="text-footnote font-medium">{c.name}</span>
            </button>
          ))}
        </div>

        <Block className="!my-4">
          <Segmented strong rounded>
            {['Today', 'Yesterday', 'Pick a date'].map((w) => <SegmentedButton key={w} rounded active={when === w} onClick={() => setWhen(w)}>{w}</SegmentedButton>)}
          </Segmented>
        </Block>

        <BlockTitle>Details</BlockTitle>
        <List strong inset>
          <ListInput label="Note" type="text" placeholder="Ramen with Dilnoza" />
          <ListItem title="Split with friends" after={<Toggle checked={split} onChange={() => setSplit(!split)} />} />
        </List>

        <Block className="!mb-4">
          <Button large rounded onClick={() => nav.pop()}>Add expense</Button>
        </Block>
      </Sheet>
    </Page>
  )
}
