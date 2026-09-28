import { useState } from 'react'
import { Page, Navbar, Link, Block, List, ListItem, Segmented, SegmentedButton, Toggle } from 'konsta/react'
import { X, Clock } from 'lucide-react'
import { useNav, Tile } from '@od/kit'

const PARTS = ['Morning', 'Afternoon', 'Evening', 'Anytime']
const METRIC_COLOURS = [
  { name: 'Purple', value: '#bf5af2' },
  { name: 'Pink', value: '#ff375f' },
  { name: 'Orange', value: '#ff9f0a' },
  { name: 'Blue', value: '#0a84ff' },
  { name: 'Indigo', value: '#5e5ce6' },
  { name: 'Green', value: '#30d158' },
]

export default function Screen() {
  const nav = useNav()
  const [name, setName] = useState('Stretch')
  const [amount, setAmount] = useState('15')
  const [unit, setUnit] = useState('min')
  const [part, setPart] = useState('Morning')
  const [colour, setColour] = useState('#bf5af2')
  const [reminderOn, setReminderOn] = useState(true)
  const [reminderTime, setReminderTime] = useState('07:00')

  return (
    <Page>
      <Navbar title="New habit" left={<Link iconOnly onClick={nav.pop}><X className="w-6 h-6" /></Link>} />
      
      <Block strong inset>
        <List strong>
          <ListItem groupTitle header title="Habit name" />
          <ListItem innerChildren={
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Meditate"
              className="w-full outline-none text-[17px] bg-transparent"
            />
          } />
        </List>
      </Block>

      <Block strong inset>
        <List strong>
          <ListItem groupTitle header title="Goal" />
          <ListItem innerChildren={
            <div className="flex gap-2 w-full">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex-1 outline-none text-[17px] bg-transparent"
              />
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="outline-none text-[17px] bg-transparent text-black/55 dark:text-white/55"
              >
                <option value="min">min</option>
                <option value="km">km</option>
                <option value="pages">pages</option>
                <option value="time">time</option>
                <option value="ml">ml</option>
              </select>
            </div>
          } />
        </List>
      </Block>

      <Block strong inset>
        <List strong>
          <ListItem groupTitle header title="Part of day" />
          <ListItem innerChildren={
            <Segmented strong rounded className="w-full">
              {PARTS.map((p) => (
                <SegmentedButton key={p} rounded active={part === p} onClick={() => setPart(p)} className="flex-1">
                  {p}
                </SegmentedButton>
              ))}
            </Segmented>
          } />
        </List>
      </Block>

      <Block strong inset>
        <List strong>
          <ListItem groupTitle header title="Colour" />
          <ListItem innerChildren={
            <div className="flex gap-2 flex-wrap">
              {METRIC_COLOURS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setColour(c.value)}
                  className={`w-10 h-10 rounded-full transition-all ${colour === c.value ? 'ring-2 ring-offset-2 ring-black/20 dark:ring-white/20' : ''}`}
                  style={{ backgroundColor: c.value }}
                  aria-label={c.name}
                />
              ))}
            </div>
          } />
        </List>
      </Block>

      <Block strong inset>
        <List strong dividers>
          <ListItem
            title="Daily reminder"
            after={<Toggle checked={reminderOn} onChange={(e) => setReminderOn(e.target.checked)} />}
          />
          {reminderOn && (
            <ListItem innerChildren={
              <div className="flex items-center gap-2 w-full">
                <Clock className="w-5 h-5 text-black/55 dark:text-white/55" />
                <input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  className="flex-1 outline-none text-[17px] bg-transparent"
                />
              </div>
            } />
          )}
        </List>
      </Block>

      <Block className="mt-8 mb-32">
        <button
          onClick={() => nav.pop()}
          className="w-full bg-primary text-white rounded-lg py-4 text-[17px] font-semibold"
        >
          Create habit
        </button>
      </Block>
    </Page>
  )
}
