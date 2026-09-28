import { useState } from 'react'
import { Page, Navbar, Block, BlockTitle, List, ListItem, Segmented, SegmentedButton, Card } from 'konsta/react'
import { Flame, ChevronRight } from 'lucide-react'
import { useNav, AppTabbar, Area, CountUp } from '@od/kit'

const HABITS = [
  { id: 'meditate', name: 'Meditate', goal: '10 min', streak: 41, best: 41, color: '#bf5af2', week: [1, 1, 1, 1, 1, 1, 1] },
  { id: 'run', name: 'Morning run', goal: '5 km', streak: 23, best: 31, color: '#ff375f', week: [1, 1, 0, 1, 1, 1, 1] },
  { id: 'vitamins', name: 'Vitamins', goal: '1 time', streak: 12, best: 20, color: '#ff9f0a', week: [1, 1, 1, 0, 1, 1, 0] },
  { id: 'read', name: 'Read', goal: '20 pages', streak: 8, best: 19, color: '#5e5ce6', week: [1, 0, 1, 1, 1, 0, 0] },
  { id: 'journal', name: 'Journal', goal: '1 entry', streak: 3, best: 14, color: '#0a84ff', week: [0, 1, 1, 0, 0, 1, 0] },
  { id: 'sugar', name: 'No sugar', goal: 'all day', streak: 5, best: 9, color: '#30d158', week: [1, 1, 1, 1, 1, 0, 0] },
]

const WEEK_DATA = [75, 78, 82, 65, 88, 80, 86]

export default function Screen() {
  const nav = useNav()
  const [period, setPeriod] = useState('Week')
  const bestHabit = HABITS.reduce((max, h) => h.streak > max.streak ? h : max)

  return (
    <Page className="pb-32">
      <Navbar large transparent title="Insights" />
      <Block className="!my-3">
        <Segmented strong rounded>
          {['Week', 'Month', 'Year'].map((p) => <SegmentedButton key={p} rounded active={period === p} onClick={() => setPeriod(p)}>{p}</SegmentedButton>)}
        </Segmented>
      </Block>
      <Card raised className="!mx-4 mb-6">
        <div className="p-5">
          <div className="text-[13px] opacity-70 mb-2">Completion rate</div>
          <div className="flex items-baseline gap-2">
            <div className="text-4xl font-semibold"><CountUp to={86} format={(n) => `${n}%`} /></div>
            <div className="text-[15px] text-primary">+9% vs last week</div>
          </div>
        </div>
      </Card>
      <BlockTitle>Week trend</BlockTitle>
      <Block>
        <Area values={WEEK_DATA} color="text-primary" height={110} />
      </Block>
      <BlockTitle>Habits</BlockTitle>
      <List strong inset dividers>
        {HABITS.map((h) => (
          <ListItem
            key={h.id}
            link
            linkProps={{ onClick: () => nav.push('habit', { id: h.id }) }}
            title={h.name}
            subtitle={<span className="text-[13px] opacity-70">{h.goal}</span>}
            media={
              <div className="flex gap-1">
                {h.week.map((done, i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: done ? h.color : '#e5e5ea' }}
                  />
                ))}
              </div>
            }
            after={<ChevronRight className="w-5 h-5 opacity-40" />}
          />
        ))}
      </List>
      <Block className="flex items-center gap-3 p-4 mb-2">
        <Flame className="w-5 h-5 flex-shrink-0" style={{ color: bestHabit.color }} />
        <div>
          <div className="text-[15px] font-semibold">Best streak</div>
          <div className="text-[13px] opacity-70">{bestHabit.name} · {bestHabit.streak} days</div>
        </div>
      </Block>
      <AppTabbar active="insights" />
    </Page>
  )
}
