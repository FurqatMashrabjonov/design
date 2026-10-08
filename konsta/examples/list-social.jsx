import { useState } from 'react'
import { Page, Navbar, NavbarBackLink, Link, Segmented, SegmentedButton, Block, List, ListItem, Button, Toast } from 'konsta/react'
import { Search, UserPlus, Users } from 'lucide-react'
import { useNav, AppTabbar, Avatar, AvatarStack, Photo } from '@od/kit'

// EXM-01: a people list (friends, followers, members, communities, who's live), built the way the social apps build
// theirs: a search, a segment Friends · Requests · Suggested, pending requests first with Accept / Decline, a row per
// person — portrait, name, handle, mutual friends — with one button on the right whose state flips, then the groups
// or communities as small photo cards with their member stacks. Everything answers in place.
const PEOPLE = [
  { id: 'omar', name: 'Omar Haddad', handle: '@omar', photo: 'portrait young man beard smiling', mutual: 12, following: true },
  { id: 'mina', name: 'Mina Reyes', handle: '@mina.r', photo: 'portrait smiling woman short hair', mutual: 8, following: true },
  { id: 'theo', name: 'Theo Lindqvist', handle: '@theo', photo: 'portrait man glasses outdoors', mutual: 3, following: false },
  { id: 'sara', name: 'Sara Okafor', handle: '@sarao', photo: 'portrait woman long dark hair', mutual: 21, following: false },
  { id: 'liam', name: 'Liam Chen', handle: '@liamc', photo: 'portrait man curly hair street', mutual: 5, following: false },
]
const REQUESTS = [{ id: 'nadia', name: 'Nadia Brooks', handle: '@nadiab', photo: 'portrait smiling woman braids', mutual: 4 }]
const GROUPS = [
  { id: 'g1', name: 'Sunday runners', members: 48, photo: 'group running park morning', people: PEOPLE.slice(0, 4) },
  { id: 'g2', name: 'Film club', members: 112, photo: 'cinema seats red', people: PEOPLE.slice(1, 5) },
]

export default function Screen() {
  const nav = useNav()
  const [tab, setTab] = useState('friends')
  const [following, setFollowing] = useState(PEOPLE.filter((p) => p.following).map((p) => p.id))
  const [requests, setRequests] = useState(REQUESTS)
  const [toast, setToast] = useState(null)
  const say = (t) => { setToast(t); setTimeout(() => setToast(null), 2000) }
  const toggle = (p) => { const on = !following.includes(p.id); setFollowing(on ? [...following, p.id] : following.filter((x) => x !== p.id)); say(on ? `Following ${p.name.split(' ')[0]}` : `Unfollowed ${p.name.split(' ')[0]}`) }
  const rows = tab === 'suggested' ? PEOPLE.filter((p) => !following.includes(p.id)) : PEOPLE
  return (
    <Page className="pb-32">
      <Navbar large transparent title="Friends" subtitle={`${following.length} following · 212 followers`}
        left={<NavbarBackLink onClick={() => nav.pop()} />}
        right={<><Link iconOnly onClick={() => nav.push('search')} aria-label="Search"><Search className="w-6 h-6" /></Link><Link iconOnly onClick={() => nav.push('invite')} aria-label="Invite"><UserPlus className="w-6 h-6" /></Link></>} />

      <Block className="!my-3">
        <Segmented strong rounded>
          <SegmentedButton active={tab === 'friends'} onClick={() => setTab('friends')}>Friends</SegmentedButton>
          <SegmentedButton active={tab === 'requests'} onClick={() => setTab('requests')}>Requests{requests.length ? ` · ${requests.length}` : ''}</SegmentedButton>
          <SegmentedButton active={tab === 'suggested'} onClick={() => setTab('suggested')}>Suggested</SegmentedButton>
        </Segmented>
      </Block>

      {tab === 'requests' ? (
        <List strong inset dividers>
          {requests.length === 0 && <ListItem title="No requests" subtitle="You’re all caught up." />}
          {requests.map((p) => (
            <ListItem key={p.id} media={<Avatar name={p.name} photo={p.photo} size={48} />} title={p.name} subtitle={`${p.handle} · ${p.mutual} mutual friends`}
              after={<span className="flex gap-2"><Button small rounded inline onClick={() => { setRequests([]); setFollowing([...following, p.id]); say(`You and ${p.name.split(' ')[0]} are friends`) }}>Accept</Button><Button small rounded inline tonal onClick={() => { setRequests([]); say('Declined') }}>Decline</Button></span>} />
          ))}
        </List>
      ) : (
        <List strong inset dividers>
          {rows.map((p) => (
            <ListItem key={p.id} link chevron={false} linkProps={{ onClick: () => nav.push('profile', { id: p.id }) }}
              media={<Avatar name={p.name} photo={p.photo} size={48} />}
              title={p.name} subtitle={`${p.handle} · ${p.mutual} mutual`}
              after={<Button small rounded inline tonal={following.includes(p.id)} onClick={(e) => { e.stopPropagation(); toggle(p) }}>{following.includes(p.id) ? 'Following' : 'Follow'}</Button>} />
          ))}
        </List>
      )}

      <div className="mx-4 mt-7 mb-3 flex items-end justify-between"><h2 className="text-title3">Your groups</h2><button onClick={() => nav.push('groups')} className="-my-3 min-h-11 px-1 text-subhead text-primary">See all</button></div>
      <div className="flex gap-3 overflow-x-auto px-4 pb-1">
        {GROUPS.map((g) => (
          <button key={g.id} onClick={() => nav.push('group', { id: g.id })} className="w-56 shrink-0 overflow-hidden rounded-[20px] bg-card text-left">
            <Photo q={g.photo} className="h-28 w-full" />
            <div className="p-3">
              <div className="text-headline">{g.name}</div>
              <div className="mt-1.5 flex items-center justify-between"><AvatarStack people={g.people} size={24} /><span className="flex items-center gap-1 text-footnote opacity-60"><Users className="w-3.5 h-3.5" />{g.members}</span></div>
            </div>
          </button>
        ))}
      </div>

      <Toast position="center" opened={!!toast} className="bottom-24"><div className="shrink">{toast}</div></Toast>
      <AppTabbar active="explore" />
    </Page>
  )
}
