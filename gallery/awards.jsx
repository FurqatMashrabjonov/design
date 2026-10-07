import { useState } from 'react'
import { Page, Navbar, Block, BlockTitle, Button } from 'konsta/react'
import { AppTabbar, AchievementUnlock, Medal } from '@od/kit'
const AWARDS = [{ emoji: '🔥', name: '7-day streak', on: true }, { emoji: '📚', name: '10 books', on: true }, { emoji: '🌙', name: 'Night owl', on: true }, { emoji: '🏔️', name: '30-day streak', on: false }, { emoji: '⚡', name: 'Speed reader', on: false }, { emoji: '🎯', name: 'Goal crusher', on: false }]
export default function Screen() {
  const [open, setOpen] = useState(false)
  return (
    <Page className="pb-32">
      <Navbar large title="Awards" />
      <BlockTitle className="!mb-3">3 of 6 earned</BlockTitle>
      <div className="grid grid-cols-3 gap-4 px-4">
        {AWARDS.map((a) => <div key={a.name} className="flex flex-col items-center text-center gap-2"><Medal emoji={a.emoji} size={64} locked={!a.on} /><span className="text-footnote">{a.name}</span></div>)}
      </div>
      <Block className="!mt-8"><Button large rounded onClick={() => setOpen(true)}>Log today’s reading</Button></Block>
      <AchievementUnlock opened={open} emoji="🔥" title="7-day streak" detail="You read every day this week. Keep the fire going!" color="#ff7a1a" onClose={() => setOpen(false)} onShare={() => setOpen(false)} />
      <AppTabbar active="awards" />
    </Page>
  )
}
