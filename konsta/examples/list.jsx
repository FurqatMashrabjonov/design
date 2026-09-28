import { useState } from 'react'
import { Page, Navbar, Link, Block, BlockTitle, List, ListItem, Segmented, SegmentedButton, Badge } from 'konsta/react'
import { Plus, BookOpen, Flame } from 'lucide-react'
import { useNav, AppTabbar, Ring } from '@od/kit'

const BOOKS = [
  { id: 'dune', title: 'Dune', author: 'Frank Herbert', pages: 688, read: 412, color: '#ff9f0a', shelf: 'Reading' },
  { id: 'atomic', title: 'Atomic Habits', author: 'James Clear', pages: 320, read: 320, color: '#30d158', shelf: 'Finished' },
  { id: 'stoner', title: 'Stoner', author: 'John Williams', pages: 288, read: 96, color: '#5e5ce6', shelf: 'Reading' },
  { id: 'sapiens', title: 'Sapiens', author: 'Yuval Noah Harari', pages: 512, read: 0, color: '#0a84ff', shelf: 'Want to read' },
]
const SHELVES = ['All', 'Reading', 'Finished', 'Want to read']

export default function Screen() {
  const nav = useNav()
  const [shelf, setShelf] = useState('All')
  const books = BOOKS.filter((b) => shelf === 'All' || b.shelf === shelf)
  const reading = BOOKS.filter((b) => b.read > 0 && b.read < b.pages).length
  return (
    <Page className="pb-32">
      <Navbar large transparent title="Library" subtitle={`${reading} in progress · 12-day streak`}
        right={<Link iconOnly onClick={() => nav.push('add-book')}><Plus className="w-6 h-6" /></Link>} />
      <Block className="!my-3">
        <Segmented strong rounded>
          {SHELVES.map((s) => <SegmentedButton key={s} rounded active={shelf === s} onClick={() => setShelf(s)}>{s}</SegmentedButton>)}
        </Segmented>
      </Block>
      <BlockTitle>{shelf === 'All' ? 'All books' : shelf}</BlockTitle>
      <List strong inset dividers>
        {books.map((b) => (
          <ListItem key={b.id} link linkProps={{ onClick: () => nav.push('book', { id: b.id }) }} title={b.title}
            subtitle={<span className="text-footnote opacity-70">{b.author} · {b.pages} pages</span>}
            media={<Ring value={b.read / b.pages} size={42} stroke={4} color={b.color}><BookOpen className="w-4 h-4" style={{ color: b.color }} /></Ring>}
            after={b.read === b.pages ? <Badge colors={{ bg: 'bg-green-500' }}>Done</Badge> : <span className="text-subhead opacity-60">{Math.round((b.read / b.pages) * 100)}%</span>} />
        ))}
      </List>
      <Block className="flex items-center gap-2 text-footnote opacity-60"><Flame className="w-4 h-4" /> You read 38 pages yesterday.</Block>
      <AppTabbar active="library" />
    </Page>
  )
}
