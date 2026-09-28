import { useState } from 'react'
import { Page, Navbar, Link, Block, List, ListItem, Button, Toggle } from 'konsta/react'
import { ChevronLeft, Edit2 } from 'lucide-react'
import { useNav, Ring } from '@od/kit'

const HABIT = {
  id: 'meditate',
  name: 'Meditate',
  goal: '10 min',
  done: true,
  streak: 41,
  best: 41,
  part: 'Morning',
  color: '#bf5af2',
  week: [1, 1, 1, 1, 1, 1, 1],
  reminder: true,
  reminderTime: '07:30',
}

export default function Screen() {
  const nav = useNav()
  const [reminder, setReminder] = useState(HABIT.reminder)

  return (
    <Page>
      <Navbar title={HABIT.name} left={<Link iconOnly onClick={() => nav.pop()}><ChevronLeft className="w-6 h-6" /></Link>}
        right={<Link iconOnly onClick={() => nav.push('edit-habit', { id: HABIT.id })}><Edit2 className="w-6 h-6" /></Link>} />

      <Block className="flex flex-col items-center gap-6 mt-8 mb-8">
        <div className="flex flex-col items-center gap-3">
          <Ring value={HABIT.done ? 1 : 0} size={120} stroke={10} color={HABIT.color}>
            <div className="text-center">
              <div className="text-[28px] font-bold" style={{ color: HABIT.color }}>{HABIT.streak}</div>
              <div className="text-[11px] opacity-60 mt-1">day streak</div>
            </div>
          </Ring>
          <div className="text-center">
            <div className="text-[13px] opacity-70">Best: <span className="font-semibold">{HABIT.best} days</span></div>
          </div>
        </div>
      </Block>

      <Block className="mb-6">
        <div className="text-[13px] font-semibold opacity-70 mb-3">This week</div>
        <div className="grid grid-cols-7 gap-2">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
            <div key={day} className="text-center">
              <div className="text-[11px] opacity-60 mb-1">{day}</div>
              <div className={`w-8 h-8 rounded-md flex items-center justify-center text-[12px] font-semibold ${
                HABIT.week[i] === 1 ? 'bg-primary/20 text-primary' : 'bg-black/5 dark:bg-white/5 text-black/30 dark:text-white/30'
              }`}>
                {HABIT.week[i] === 1 ? '✓' : '—'}
              </div>
            </div>
          ))}
        </div>
      </Block>

      <List strong inset dividers>
        <ListItem title="Goal" after={<span className="text-[15px] opacity-70">{HABIT.goal}</span>} />
        <ListItem title="Part of day" after={<span className="text-[15px] opacity-70">{HABIT.part}</span>} />
        <ListItem title="Reminder" after={<Toggle checked={reminder} onChange={setReminder} />} />
        {reminder && <ListItem title="Time" after={<span className="text-[15px] opacity-70">{HABIT.reminderTime}</span>} />}
      </List>

      <Block className="mt-8 mb-32">
        <Button large rounded disabled className="w-full">
          {HABIT.done ? 'Done today' : 'Mark as done'}
        </Button>
      </Block>
    </Page>
  )
}
