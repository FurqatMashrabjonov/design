import { useState } from 'react'
import { Page, Navbar, Block, BlockTitle, Button, List, ListItem, Toggle, Toast } from 'konsta/react'
import { AppTabbar, WheelPicker } from '@od/kit'
const H = Array.from({ length: 12 }, (_, i) => String(i + 1)), M = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55']
export default function Screen() {
  const [time, setTime] = useState(['7', '30', 'AM'])
  const [on, setOn] = useState(true)
  const [saved, setSaved] = useState(false)
  return (
    <Page className="pb-32">
      <Navbar large title="Reminder" />
      <BlockTitle className="!mb-2">Remind me at</BlockTitle>
      <WheelPicker columns={[H, M, ['AM', 'PM']]} value={time} onChange={setTime} />
      <List strong inset><ListItem title="Every day" after={<Toggle checked={on} onChange={() => setOn(!on)} />} /></List>
      <Block><Button large rounded onClick={() => setSaved(true)}>Save · {time[0]}:{time[1]} {time[2]}</Button></Block>
      <Toast opened={saved}>Reminder set for {time[0]}:{time[1]} {time[2]}</Toast>
      <AppTabbar active="reminder" />
    </Page>
  )
}
