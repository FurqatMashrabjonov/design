import { useState } from 'react'
import { Page, Navbar, Link, Block, BlockTitle, List, ListItem, Segmented, SegmentedButton } from 'konsta/react'
import { Plus, Flame } from 'lucide-react'
import { useNav, AppTabbar, Ring } from '@od/kit'

const HABITS = [
  { id: 'meditate', name: 'Meditate', goal: '10 min', done: 1, total: 1, streak: 41, part: 'Morning', color: '#bf5af2', week: [1,1,1,1,1,1,1] },
  { id: 'morning-run', name: 'Morning run', goal: '5 km', done: 1, total: 1, streak: 23, part: 'Morning', color: '#ff375f', week: [1,1,0,1,1,1,1] },
  { id: 'vitamins', name: 'Vitamins', goal: '1 time', done: 0, total: 1, streak: 12, part: 'Morning', color: '#ff9f0a', week: [1,1,1,0,1,1,0] },
  { id: 'read', name: 'Read', goal: '20 pages', done: 12, total: 20, streak: 8, part: 'Evening', color: '#5e5ce6', week: [1,0,1,1,1,0,0] },
  { id: 'journal', name: 'Journal', goal: '1 entry', done: 0, total: 1, streak: 3, part: 'Evening', color: '#0a84ff', week: [0,1,1,0,0,1,0] },
  { id: 'no-sugar', name: 'No sugar', goal: 'all day', done: 0, total: 1, streak: 5, part: 'Anytime', color: '#30d158', week: [1,1,1,1,1,0,0] },
]
const PARTS = ['All', 'Morning', 'Evening', 'Anytime']

export default function Screen() {
  const nav = useNav()
  const [part, setPart] = useState('All')
  const filtered = HABITS.filter((h) => part === 'All' || h.part === part)
  const completed = HABITS.filter((h) => h.done === h.total).length
  
  const groupedByPart = {}
  filtered.forEach((h) => {
    if (!groupedByPart[h.part]) groupedByPart[h.part] = []
    groupedByPart[h.part].push(h)
  })
  const parts = ['Morning', 'Evening', 'Anytime'].filter((p) => groupedByPart[p])

  return (
    <Page className="pb-32">
      <Navbar large transparent title="Habits" subtitle={`${completed} of ${HABITS.length} done today`}
        right={<Link iconOnly onClick={() => nav.push('add-habit')}><Plus className="w-6 h-6" /></Link>} />
      <Block className="!my-3">
        <Segmented strong rounded>
          {PARTS.map((p) => <SegmentedButton key={p} rounded active={part === p} onClick={() => setPart(p)}>{p}</SegmentedButton>)}
        </Segmented>
      </Block>
      {parts.map((p) => (
        <div key={p}>
          <BlockTitle>{p}</BlockTitle>
          <List strong inset dividers>
            {groupedByPart[p].map((h) => (
              <ListItem key={h.id} link linkProps={{ onClick: () => nav.push('habit', { id: h.id }) }} title={h.name}
                subtitle={<span className="text-[13px] opacity-70">{h.goal}</span>}
                media={<Ring value={h.done / h.total} size={42} stroke={4} color={h.color}>
                  <span className="text-[12px] font-semibold" style={{ color: h.color }}>{h.done}</span>
                </Ring>}
                after={<div className="flex items-center gap-1">
                  <Flame className="w-4 h-4" style={{ color: h.color }} />
                  <span className="text-[15px] font-medium">{h.streak}</span>
                </div>} />
            ))}
          </List>
        </div>
      ))}
      <AppTabbar active="habits" />
    </Page>
  )
}
