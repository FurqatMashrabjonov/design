import { useState } from 'react'
import { Page, Navbar, NavbarBackLink, Link, Segmented, SegmentedButton, Block, List, ListItem, Button, Sheet, Toast } from 'konsta/react'
import { Share, Bookmark, Play, Lock, Check, Users, Clock, Star } from 'lucide-react'
import { useNav, Photo, Avatar, Meter } from '@od/kit'

// EXM-01: a course detail (a class, a book, a podcast series), built the way the course apps build theirs: the cover
// with a play button over it, the title, the numbers (students, minutes, rating), the teacher row with Follow, the
// progress meter when started, a segment Lessons · Projects · Reviews, the lessons numbered with their length — done
// ones ticked, locked ones behind the paywall — "About" with Show more, and a bar pinned to the bottom with the one
// action, which opens the player (or the paywall sheet for a locked lesson).
const COURSE = { title: 'Always Drawing: how to start and keep a daily sketchbook', by: 'Mike Lowery', role: 'Illustrator and author', students: '36.5k', mins: 38, rating: 4.9, photo: 'sketchbook drawing hands pencils', teacher: 'portrait man beard smiling', done: 2 }
const LESSONS = [['Introduction', '1:10'], ['Class orientation', '2:14'], ['What is a sketchbook, and why keep one?', '3:31'], ['Sketchbook tour: Russia', '1:32'], ['Materials that travel', '4:05'], ['The 30-minute habit', '5:48'], ['Drawing from life', '6:20'], ['Your first week', '3:12'], ['Sharing your pages', '2:40'], ['Final thoughts', '1:58']]

export default function Screen() {
  const nav = useNav()
  const [following, setFollowing] = useState(false)
  const [saved, setSaved] = useState(false)
  const [tab, setTab] = useState('lessons')
  const [more, setMore] = useState(false)
  const [locked, setLocked] = useState(false)
  const [toast, setToast] = useState(null)
  const say = (t) => { setToast(t); setTimeout(() => setToast(null), 2000) }
  const open = (i) => (i < 3 || i < COURSE.done ? nav.push('lesson', { n: i + 1 }) : setLocked(true))
  return (
    <Page className="pb-32">
      <Navbar transparent title="" left={<NavbarBackLink onClick={() => nav.pop()} />}
        right={<><Link iconOnly onClick={() => say('Link copied')} aria-label="Share"><Share className="w-6 h-6" /></Link><Link iconOnly onClick={() => { setSaved(!saved); say(saved ? 'Removed' : 'Saved to your classes') }} aria-label="Save"><Bookmark className="w-6 h-6" fill={saved ? 'currentColor' : 'none'} /></Link></>} />

      <button onClick={() => open(COURSE.done)} className="relative mx-4 block h-52 w-[calc(100%-2rem)] overflow-hidden rounded-[22px]">
        <Photo q={COURSE.photo} className="absolute inset-0 h-full w-full" />
        <span className="absolute inset-0 grid place-items-center bg-black/20"><span className="grid size-16 place-items-center rounded-full bg-white/90 text-black shadow"><Play className="w-7 h-7" fill="currentColor" /></span></span>
      </button>

      <Block className="!mb-3 vs-rise">
        <h1 className="text-title2">{COURSE.title}</h1>
        <div className="mt-2 flex gap-4 text-footnote opacity-70">
          <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{COURSE.students} students</span>
          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{COURSE.mins} min · {LESSONS.length} lessons</span>
          <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5" fill="currentColor" />{COURSE.rating}</span>
        </div>
        <button onClick={() => nav.push('teacher')} className="mt-4 flex w-full items-center gap-3 text-left">
          <Avatar name={COURSE.by} photo={COURSE.teacher} size={44} />
          <span className="flex-1"><span className="block text-headline">{COURSE.by}</span><span className="block text-footnote opacity-60">{COURSE.role}</span></span>
          <Button small rounded inline tonal={following} onClick={(e) => { e.stopPropagation(); setFollowing(!following); say(following ? 'Unfollowed' : `Following ${COURSE.by.split(' ')[0]}`) }}>{following ? 'Following' : 'Follow'}</Button>
        </button>
        <div className="mt-4 flex items-center gap-3 text-footnote"><span className="flex-1"><Meter value={COURSE.done / LESSONS.length} /></span><span className="tabular-nums opacity-60">{COURSE.done} of {LESSONS.length} done</span></div>
      </Block>

      <Block className="!my-2">
        <Segmented strong rounded>
          {['lessons', 'projects', 'reviews'].map((k) => <SegmentedButton key={k} active={tab === k} onClick={() => setTab(k)}>{k[0].toUpperCase() + k.slice(1)}</SegmentedButton>)}
        </Segmented>
      </Block>

      {tab === 'lessons' ? (
        <List strong inset dividers>
          {LESSONS.map(([name, len], i) => {
            const isDone = i < COURSE.done, free = i < 3
            return <ListItem key={name} link chevron={false} linkProps={{ onClick: () => open(i) }} title={<span className={isDone ? 'opacity-60' : ''}>{name}</span>} subtitle={len}
              media={<span className={`grid size-8 place-items-center rounded-full text-footnote font-semibold tabular-nums ${isDone ? 'bg-primary text-white' : 'bg-page'}`}>{isDone ? <Check className="w-4 h-4" /> : i + 1}</span>}
              after={!free && !isDone ? <Lock className="w-4 h-4 opacity-40" /> : <Play className="w-4 h-4 opacity-40" />} />
          })}
        </List>
      ) : (
        <Block className="rounded-[22px] bg-card p-6 text-center text-subhead opacity-60">{tab === 'projects' ? '112 student projects — open one to see their sketchbook pages.' : '1,204 reviews · 4.9 average'}</Block>
      )}

      <h2 className="mx-4 mt-6 text-title3">About this class</h2>
      <p className={`mx-4 mt-2 text-body ${more ? '' : 'line-clamp-3'}`}>Want to start a daily sketchbook and actually keep it? Mike Lowery, a New York Times best-selling illustrator, shares the thirty-minute habit that fills a book a month — what to draw when nothing comes, which materials travel, and how to stop being precious about the page.</p>
      <button onClick={() => setMore(!more)} className="mx-4 mt-1 min-h-11 text-subhead font-semibold underline">{more ? 'Show less' : 'Show more'}</button>

      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-4 border-t border-line bg-card px-4 pt-3 pb-[max(12px,var(--k-safe-area-bottom))]">
        <span className="text-footnote opacity-60">Lesson {COURSE.done + 1} · {LESSONS[COURSE.done][1]}</span>
        <Button large rounded inline className="!px-8" onClick={() => open(COURSE.done)}>Continue</Button>
      </div>

      <Sheet opened={locked} onBackdropClick={() => setLocked(false)} className="pb-safe">
        <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-black/15 dark:bg-white/25" />
        <h3 className="px-4 pt-4 text-title3">Unlock every lesson</h3>
        <Block className="text-subhead opacity-60">The first three lessons are free. Premium opens all {LESSONS.length}, plus every class on the platform.</Block>
        <Block><Button large rounded onClick={() => { setLocked(false); nav.push('paywall') }}>Start a free trial</Button></Block>
      </Sheet>
      <Toast position="center" opened={!!toast} className="bottom-28"><div className="shrink">{toast}</div></Toast>
    </Page>
  )
}
