import { useState } from 'react'
import { Page, Navbar, Link, Segmented, SegmentedButton, Block, Sheet, List, ListItem, Button, Toast } from 'konsta/react'
import { Bell, MessageCircle, Plus, Radio } from 'lucide-react'
import { useNav, AppTabbar, Stories, StoryViewer, FeedPost, Avatar, Photo } from '@od/kit'

// EXM-01: a social home (a feed), built the way the social apps build theirs: a small wordmark-style title with the
// inbox and alerts on the right, the stories row (yours first, with a plus), a segment Friends · Discover, then the
// posts — each a person, a time, one photo, a line of text and the like / comment / share counts — with a live or
// featured card between them. Posting is a sheet from the plus. A story opens the kit's viewer.
const PEOPLE = [
  { id: 'me', name: 'You', photo: 'portrait smiling young woman' },
  { id: 'omar', name: 'Omar', photo: 'portrait young man beard smiling' },
  { id: 'mina', name: 'Mina', photo: 'portrait smiling woman short hair', seen: true },
  { id: 'theo', name: 'Theo', photo: 'portrait man glasses outdoors' },
  { id: 'sara', name: 'Sara', photo: 'portrait woman long dark hair' },
  { id: 'liam', name: 'Liam', photo: 'portrait man curly hair street' },
]
const POSTS = [
  { id: 'p1', who: PEOPLE[1], time: '12 min', photo: 'rooftop sunset city friends', text: 'Rooftop season is officially open 🌇', likes: 128, comments: 14 },
  { id: 'p2', who: PEOPLE[3], time: '1 h', photo: 'ramen bowl steam closeup', text: 'Found the ramen place. Will not be sharing the address.', likes: 302, comments: 41 },
  { id: 'p3', who: PEOPLE[4], time: '3 h', photo: 'trail run forest morning light', text: 'First 10K of the autumn. Legs: filing a complaint.', likes: 89, comments: 7 },
]

export default function Screen() {
  const nav = useNav()
  const [tab, setTab] = useState('friends')
  const [story, setStory] = useState(null)
  const [compose, setCompose] = useState(false)
  const [toast, setToast] = useState(null)
  const say = (t) => { setToast(t); setTimeout(() => setToast(null), 2000) }
  return (
    <Page className="pb-32">
      <Navbar transparent title={<span className="text-title2">Loop</span>}
        right={<><Link iconOnly onClick={() => nav.push('notifications')} aria-label="Notifications"><Bell className="w-6 h-6" /></Link><Link iconOnly onClick={() => nav.reset('inbox')} aria-label="Inbox"><MessageCircle className="w-6 h-6" /></Link></>} />

      <div className="mt-1">
        <Stories me={PEOPLE[0]} items={PEOPLE.slice(1)} onAdd={() => setCompose(true)} onOpen={(s) => setStory(s)} />
      </div>

      <Block className="!my-3">
        <Segmented strong rounded>
          <SegmentedButton active={tab === 'friends'} onClick={() => setTab('friends')}>Friends</SegmentedButton>
          <SegmentedButton active={tab === 'discover'} onClick={() => setTab('discover')}>Discover</SegmentedButton>
        </Segmented>
      </Block>

      {POSTS.map((p, i) => (
        <div key={p.id} className="vs-rise" style={{ animationDelay: `${i * 70}ms` }}>
          <div className="mx-4 mb-4">
            <FeedPost author={{ name: p.who.name, photo: p.who.photo }} time={p.time} photo={p.photo} text={p.text} likes={p.likes} comments={p.comments}
              onComment={() => nav.push('post', { id: p.id })} onShare={() => say('Link copied')} />
          </div>
          {i === 0 && (
            <button onClick={() => nav.push('live', { id: 'mina' })} className="relative mx-4 mb-4 block h-44 w-[calc(100%-2rem)] overflow-hidden rounded-[22px] text-left">
              <Photo q="concert crowd lights night" className="absolute inset-0 h-full w-full" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
              <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-red-500 px-2.5 py-1 text-caption1 font-bold text-white"><Radio className="w-3 h-3" />LIVE · 1.2k</span>
              <span className="absolute bottom-3 left-3 flex items-center gap-2 text-white"><Avatar name="Mina" photo={PEOPLE[2].photo} size={28} /><span className="text-headline">Mina is live from the show</span></span>
            </button>
          )}
        </div>
      ))}

      <button aria-label="New post" onClick={() => setCompose(true)} className="fixed bottom-28 right-4 z-30 grid size-14 place-items-center rounded-full bg-primary text-white shadow-lg active:scale-95 transition"><Plus className="w-6 h-6" /></button>

      <StoryViewer opened={!!story} stories={story ? [{ photo: 'rooftop sunset city friends', name: story.name }, { photo: 'coffee latte art table', name: story.name }] : []} onClose={() => setStory(null)} />

      <Sheet opened={compose} onBackdropClick={() => setCompose(false)} className="pb-safe">
        <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-black/15 dark:bg-white/25" />
        <h3 className="px-4 pt-4 text-title3">New post</h3>
        <Block><textarea rows={3} placeholder="What’s happening?" className="w-full resize-none rounded-2xl bg-card p-4 text-body outline-none placeholder:opacity-50" /></Block>
        <List strong inset><ListItem title="Add a photo" link linkProps={{ onClick: () => say('Photo picker') }} /><ListItem title="Who can see this" after="Friends" link linkProps={{ onClick: () => say('Audience') }} /></List>
        <Block><Button large rounded onClick={() => { setCompose(false); say('Posted') }}>Post</Button></Block>
      </Sheet>
      <Toast position="center" opened={!!toast} className="bottom-24"><div className="shrink">{toast}</div></Toast>
      <AppTabbar active="feed" />
    </Page>
  )
}
