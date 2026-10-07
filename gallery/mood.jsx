import { useState } from 'react'
import { Page, Navbar, Block, BlockTitle, Button, List, ListInput, Toast } from 'konsta/react'
import { AppTabbar, MoodPicker } from '@od/kit'
export default function Screen() {
  const [mood, setMood] = useState(4)
  const [note, setNote] = useState('')
  const [saved, setSaved] = useState(false)
  return (
    <Page className="pb-32">
      <Navbar large title="Check-in" />
      <Block><div className="text-title2 font-bold">How are you feeling?</div><div className="text-subhead opacity-60 mt-1">Wednesday evening</div></Block>
      <MoodPicker value={mood} onChange={(v) => setMood(v)} />
      <BlockTitle>What’s on your mind?</BlockTitle>
      <List strong inset><ListInput type="textarea" placeholder="A few words…" value={note} onInput={(e) => setNote(e.target.value)} /></List>
      <Block><Button large rounded onClick={() => setSaved(true)}>Save check-in</Button></Block>
      <Toast opened={saved}>Saved · see your week in Insights</Toast>
      <AppTabbar active="mood" />
    </Page>
  )
}
