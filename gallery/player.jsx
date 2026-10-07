import { useState } from 'react'
import { Page, Navbar, Block, BlockTitle, List, ListItem } from 'konsta/react'
import { AppTabbar, MediaPlayer, MiniPlayer, Photo } from '@od/kit'
export default function Screen() {
  const [playing, setPlaying] = useState(true)
  return (
    <Page className="pb-48">
      <Navbar large title="Player" />
      <MediaPlayer photo="calm lake at sunrise" title="Morning Stillness" artist="Breathwork · Ana Ruiz" duration={720} position={194} playing={playing} onToggle={setPlaying} />
      <BlockTitle>Up next</BlockTitle>
      <List strong inset>
        {[['Evening Unwind', 'calm forest path'], ['Deep Sleep Body Scan', 'night sky stars']].map(([t, q]) => (
          <ListItem key={t} link title={t} subtitle="12 min" media={<Photo q={q} className="w-12 h-12 rounded-xl" />} />
        ))}
      </List>
      <MiniPlayer photo="calm lake at sunrise" title="Morning Stillness" subtitle="Ana Ruiz · 9:06 left" progress={0.27} playing={playing} onToggle={setPlaying} />
      <AppTabbar active="player" />
    </Page>
  )
}
