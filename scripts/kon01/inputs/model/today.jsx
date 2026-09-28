import { useState } from 'react'
import { Page, Navbar, Link, Block, BlockTitle, List, ListItem, Checkbox, Card } from 'konsta/react'
import { Bell, ChevronRight } from 'lucide-react'
import { useNav, AppTabbar, Ring } from '@od/kit'

const HABITS = [
  { id: 'meditate', name: 'Meditate', goal: '10 min', done: true, color: '#bf5af2' },
  { id: 'run', name: 'Morning run', goal: '5 km', done: true, color: '#ff375f' },
  { id: 'vitamins', name: 'Vitamins', goal: '1 time', done: false, color: '#ff9f0a' },
  { id: 'read', name: 'Read', goal: '20 pages', done: false, color: '#5e5ce6' },
  { id: 'journal', name: 'Journal', goal: '1 entry', done: false, color: '#0a84ff' },
  { id: 'sugar', name: 'No sugar', goal: 'all day', done: false, color: '#30d158' },
]

export default function Screen() {
  const nav = useNav()
  const [habits, setHabits] = useState(HABITS)
  const stepsValue = 7843 / 10000
  const waterValue = 1500 / 2500
  const habitsValue = habits.filter(h => h.done).length / habits.length
  
  const handleHabitToggle = (id) => {
    setHabits(habits.map(h => h.id === id ? { ...h, done: !h.done } : h))
  }

  return (
    <Page className="pb-32">
      <Navbar large transparent title="Today" subtitle="Sunday, September 27"
        right={<Link iconOnly onClick={() => nav.push('inbox')}><Bell className="w-6 h-6" /></Link>} />
      
      <Block className="!my-3">
        <Card raised>
          <div className="flex items-center justify-between px-4 py-6">
            <div className="flex gap-6">
              <div className="flex flex-col items-center gap-2">
                <Ring value={stepsValue} size={64} stroke={8} color="#ff9f0a">
                  <span className="text-[13px] font-semibold">7.8k</span>
                </Ring>
                <span className="text-[11px] opacity-60">Steps</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Ring value={waterValue} size={64} stroke={8} color="#0a84ff">
                  <span className="text-[13px] font-semibold">1.5L</span>
                </Ring>
                <span className="text-[11px] opacity-60">Water</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Ring value={habitsValue} size={64} stroke={8} color="#30d158">
                  <span className="text-[13px] font-semibold">{habits.filter(h => h.done).length}/{habits.length}</span>
                </Ring>
                <span className="text-[11px] opacity-60">Habits</span>
              </div>
            </div>
          </div>
        </Card>
      </Block>

      <BlockTitle>Today's habits</BlockTitle>
      <List strong inset dividers>
        {habits.map((h) => (
          <ListItem key={h.id} title={h.name} subtitle={<span className="text-[13px] opacity-70">{h.goal}</span>}
            media={<Checkbox checked={h.done} onChange={() => handleHabitToggle(h.id)} />}
            style={{ borderLeftColor: h.color, borderLeftWidth: 3 }} />
        ))}
      </List>

      <BlockTitle>Quick links</BlockTitle>
      <List strong inset dividers>
        <ListItem link linkProps={{ onClick: () => nav.push('steps') }} title="Steps" subtitle="7,843 of 10,000" after={<ChevronRight className="w-5 h-5 opacity-40" />} />
        <ListItem link linkProps={{ onClick: () => nav.push('water') }} title="Water" subtitle="1,500 ml of 2,500 ml" after={<ChevronRight className="w-5 h-5 opacity-40" />} />
      </List>

      <AppTabbar active="today" />
    </Page>
  )
}
