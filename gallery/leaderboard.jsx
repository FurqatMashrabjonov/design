import { Page, Navbar, Segmented, SegmentedButton, Block, List, ListItem } from 'konsta/react'
import { AppTabbar, Podium, Avatar } from '@od/kit'
const BOARD = [
  { name: 'Aziza Karimova', photo: 'portrait smiling young woman headscarf', value: 2840 },
  { name: 'Sam Lee', photo: 'portrait smiling young man', value: 2610 },
  { name: 'Maya Chen', photo: 'portrait smiling young woman', value: 2475 },
  { name: 'Diego Alvarez', photo: 'portrait bearded man outdoors', value: 2190 },
  { name: 'Lena Novak', photo: 'portrait woman short hair', value: 1985 },
]
export default function Screen() {
  return (
    <Page className="pb-32">
      <Navbar large title="League" />
      <Block className="!my-2"><Segmented strong rounded><SegmentedButton rounded active>Week</SegmentedButton><SegmentedButton rounded>All time</SegmentedButton></Segmented></Block>
      <Podium people={BOARD} unit="XP" />
      <List strong inset className="!mt-4">
        {BOARD.slice(3).map((p, i) => <ListItem key={p.name} title={p.name} media={<div className="flex items-center gap-3"><span className="w-5 text-center text-subhead opacity-50">{i + 4}</span><Avatar name={p.name} photo={p.photo} size={36} /></div>} after={<span className="tabular-nums">{p.value.toLocaleString()} XP</span>} />)}
      </List>
      <AppTabbar active="league" />
    </Page>
  )
}
