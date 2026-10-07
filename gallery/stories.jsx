import { useState } from 'react'
import { Page, Navbar, BlockTitle } from 'konsta/react'
import { AppTabbar, Stories, StoryViewer, FeedPost } from '@od/kit'
const STORIES = [
  { photo: 'runner sunrise bridge', author: { name: 'Aziza', photo: 'portrait smiling young woman headscarf' }, time: '2h', text: 'Sunrise 10K done ☀️' },
  { photo: 'trail running mountains', author: { name: 'Sam', photo: 'portrait smiling young man' }, time: '4h', text: 'Hill repeats with the club' },
  { photo: 'marathon finish line crowd', author: { name: 'Diego', photo: 'portrait bearded man outdoors' }, time: '6h', text: 'First half marathon!' },
]
export default function Screen() {
  const [open, setOpen] = useState(false)
  return (
    <Page className="pb-32">
      <Navbar large title="Friends" />
      <div onClick={() => setOpen(true)}><Stories items={STORIES.map((s, i) => ({ id: String(i), name: s.author.name, photo: s.author.photo }))} /></div>
      <BlockTitle className="!mb-2">Latest</BlockTitle>
      <FeedPost author={STORIES[0].author} time="2h ago" photo={STORIES[0].photo} text="Sunrise 10K along the river." likes={42} comments={5} />
      <StoryViewer opened={open} stories={STORIES} onClose={() => setOpen(false)} />
      <AppTabbar active="stories" />
    </Page>
  )
}
