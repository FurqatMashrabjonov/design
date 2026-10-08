import { useState } from 'react'
import { Page, Navbar, NavbarBackLink, Link, Segmented, SegmentedButton, Block, Button, Actions, ActionsGroup, ActionsLabel, ActionsButton, Sheet, Toast } from 'konsta/react'
import { Ellipsis, MapPin, Link2, Grid3x3, Bookmark, Heart } from 'lucide-react'
import { useNav, Avatar, AvatarStack, Photo } from '@od/kit'

// EXM-01: a profile (a person, a creator, a host, a seller), built the way the social apps build theirs: a cover photo
// with the portrait overlapping it, the name and handle, a one-line bio with a place and a link, three counts that are
// tappable, Follow + Message side by side with Follow flipping its state, "followed by" with a stack of portraits, a
// segment over the content (Posts · Tagged · Saved) and a three-column photo grid. "…" opens the actions sheet.
const USER = { name: 'Mina Reyes', handle: '@mina.r', bio: 'Shooting film, mostly. Coffee first.', place: 'Lisbon', link: 'mina.photo', posts: 148, followers: '12.4k', following: 302, photo: 'portrait smiling woman short hair', cover: 'lisbon tram street sunset' }
const GRID = ['lisbon alley tiles', 'coffee latte art table', 'film camera on wooden desk', 'ocean pier golden hour', 'street market colourful fruit', 'friends laughing cafe', 'tram window reflection', 'rooftop sunset city friends', 'cat on windowsill sunlight']
const MUTUAL = [{ name: 'Omar', photo: 'portrait young man beard smiling' }, { name: 'Theo', photo: 'portrait man glasses outdoors' }, { name: 'Sara', photo: 'portrait woman long dark hair' }]

export default function Screen() {
  const nav = useNav()
  const [following, setFollowing] = useState(false)
  const [tab, setTab] = useState('posts')
  const [menu, setMenu] = useState(false)
  const [share, setShare] = useState(false)
  const [toast, setToast] = useState(null)
  const say = (t) => { setToast(t); setTimeout(() => setToast(null), 2000) }
  return (
    <Page className="pb-12">
      <Navbar transparent title="" left={<NavbarBackLink onClick={() => nav.pop()} />} right={<Link iconOnly onClick={() => setMenu(true)} aria-label="More"><Ellipsis className="w-6 h-6" /></Link>} />

      <div className="-mt-[calc(44px+var(--k-safe-area-top,0px))] relative">
        <Photo q={USER.cover} className="h-44 w-full" />
        <div className="absolute -bottom-10 left-4 rounded-full bg-page p-1"><Avatar name={USER.name} photo={USER.photo} size={88} /></div>
      </div>

      <div className="mx-4 mt-12 vs-rise">
        <h1 className="text-title2">{USER.name}</h1>
        <div className="text-subhead opacity-60">{USER.handle}</div>
        <p className="mt-2 text-body">{USER.bio}</p>
        <div className="mt-1.5 flex flex-wrap gap-x-4 text-footnote opacity-70">
          <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{USER.place}</span>
          <button onClick={() => say('Opens mina.photo')} className="flex min-h-9 items-center gap-1 text-primary opacity-100"><Link2 className="w-3.5 h-3.5" />{USER.link}</button>
        </div>
        <div className="mt-3 flex gap-6">
          {[[USER.posts, 'posts', 'posts'], [USER.followers, 'followers', 'followers'], [USER.following, 'following', 'following']].map(([n, l, to]) => (
            <button key={l} onClick={() => nav.push(to)} className="min-h-11 text-left"><span className="block text-headline tabular-nums">{n}</span><span className="block text-footnote opacity-60">{l}</span></button>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <Button rounded tonal={following} className="flex-1" onClick={() => { setFollowing(!following); say(following ? 'Unfollowed' : 'Following Mina') }}>{following ? 'Following' : 'Follow'}</Button>
          <Button rounded tonal className="flex-1" onClick={() => nav.push('chat', { id: 'mina' })}>Message</Button>
          <Button rounded tonal inline className="!px-3" aria-label="Share profile" onClick={() => setShare(true)}><Link2 className="w-5 h-5" /></Button>
        </div>
        <button onClick={() => nav.push('followers')} className="mt-4 flex min-h-11 items-center gap-2 text-footnote opacity-70"><AvatarStack people={MUTUAL} size={24} />Followed by Omar, Theo and 14 others</button>
      </div>

      <Block className="!mb-3">
        <Segmented strong rounded>
          <SegmentedButton active={tab === 'posts'} onClick={() => setTab('posts')}><Grid3x3 className="w-4 h-4" /></SegmentedButton>
          <SegmentedButton active={tab === 'liked'} onClick={() => setTab('liked')}><Heart className="w-4 h-4" /></SegmentedButton>
          <SegmentedButton active={tab === 'saved'} onClick={() => setTab('saved')}><Bookmark className="w-4 h-4" /></SegmentedButton>
        </Segmented>
      </Block>
      <div className="mx-4 grid grid-cols-3 gap-1">
        {(tab === 'posts' ? GRID : GRID.slice(3, 7)).map((q, i) => (
          <button key={q} onClick={() => nav.push('post', { id: i })} className="aspect-square overflow-hidden rounded-lg"><Photo q={q} className="h-full w-full" /></button>
        ))}
      </div>

      <Actions opened={menu} onBackdropClick={() => setMenu(false)}>
        <ActionsGroup>
          <ActionsLabel>{USER.handle}</ActionsLabel>
          <ActionsButton onClick={() => { setMenu(false); say('Muted') }}>Mute</ActionsButton>
          <ActionsButton onClick={() => { setMenu(false); say('Added to Close friends') }}>Add to close friends</ActionsButton>
          <ActionsButton className="!text-red-500" onClick={() => { setMenu(false); say('Reported') }}>Report</ActionsButton>
        </ActionsGroup>
        <ActionsGroup><ActionsButton onClick={() => setMenu(false)}>Cancel</ActionsButton></ActionsGroup>
      </Actions>
      <Sheet opened={share} onBackdropClick={() => setShare(false)} className="pb-safe">
        <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-black/15 dark:bg-white/25" />
        <h3 className="px-4 pt-4 text-title3">Share profile</h3>
        <Block className="text-subhead opacity-60">loop.app/{USER.handle.slice(1)}</Block>
        <Block><Button large rounded onClick={() => { setShare(false); say('Link copied') }}>Copy link</Button></Block>
      </Sheet>
      <Toast position="center" opened={!!toast} className="bottom-24"><div className="shrink">{toast}</div></Toast>
    </Page>
  )
}
