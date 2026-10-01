import { useState } from 'react'
import { Page, Navbar, NavbarBackLink, Block, BlockTitle, List, ListItem, Link, Button, Toast } from 'konsta/react'
import { Play, Download, Check, ListPlus, ListChecks, AudioLines, Share, BookOpen, Globe, Star, ChevronRight } from 'lucide-react'
import { useNav, Meter, Avatar, Tile, Glow, tint } from '@od/kit'

const C = {"tech":"#22d3ee","trueCrime":"#f97316","comedy":"#facc15","news":"#f472b6","science":"#34d399","business":"#818cf8"}

const SHOW = { name: 'Signal & Noise', host: 'Priya Raman', emoji: '💡', photo: 'neon circuit board', rating: '4.8' }
const EP = {
  number: 214,
  title: 'The Chip War, Explained',
  date: 'Sep 30',
  released: 'Yesterday',
  duration: '58:38',
  durationLabel: '58 m',
  position: '32:10',
  positionSec: 32 * 60 + 10,
  totalSec: 58 * 60 + 38,
  left: '26 m left',
  size: '54 MB',
}
const NOTES = [
  "Priya talks with semiconductor analyst Dr. Kenji Watanabe about how a few factories became the world's most strategic assets.",
  'From the first tiny transistor to the race for 2nm, they trace how chips went from a niche industry to the centre of global politics — and what comes next.',
]
const GUEST = { name: 'Kenji Watanabe', role: "Semiconductor analyst · author of 'Silicon Borders'" }
const CHAPTERS = [
  { t: '00:00', s: 0, title: 'Intro' },
  { t: '04:12', s: 252, title: 'A tiny transistor' },
  { t: '15:40', s: 940, title: "Taiwan's foundry bet" },
  { t: '27:05', s: 1625, title: 'Why chips got political' },
  { t: '41:30', s: 2490, title: 'The race for 2nm' },
  { t: '52:18', s: 3138, title: "What's next" },
]

export default function Screen() {
  const nav = useNav()
  const [downloaded, setDownloaded] = useState(true)
  const [queued, setQueued] = useState(true)
  const [toast, setToast] = useState('')

  const played = EP.positionSec / EP.totalSec
  const flash = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 1800)
  }

  return (
    <Page className="pb-12">
      <Navbar
        title={`Episode ${EP.number}`}
        left={<NavbarBackLink showText={false} onClick={nav.pop} />}
        right={<Link iconOnly onClick={() => flash('Link copied')}><Share className="w-6 h-6" /></Link>}
      />

      {/* Header */}
      <div className="relative px-4 pt-4 vs-rise">
        <div className="absolute left-1/2 top-10 -translate-x-1/2 pointer-events-none">
          <Glow color={C.tech} size={240} opacity={0.35} />
        </div>
        <div className="relative flex items-center gap-4">
          <button onClick={() => nav.push('show-page')} className="shrink-0">
            <span className="block w-24 h-24 rounded-2xl overflow-hidden shadow-lg">
              <span className="block w-full h-full">
                <PhotoCover />
              </span>
            </span>
          </button>
          <div className="min-w-0">
            <button
              onClick={() => nav.push('show-page')}
              className="flex items-center gap-1 text-subhead font-semibold min-h-[44px]"
              style={{ color: C.tech }}
            >
              <span className="truncate">{SHOW.name}</span>
              <ChevronRight className="w-4 h-4 shrink-0" />
            </button>
            <div className="text-footnote text-black/55 dark:text-white/55 flex items-center gap-1">
              <Star className="w-3.5 h-3.5" style={{ color: C.tech, fill: C.tech }} /> {SHOW.rating} · Tech · {SHOW.host}
            </div>
          </div>
        </div>

        <h1 className="relative text-title1 mt-5 leading-tight">{EP.title}</h1>
        <div className="relative text-subhead text-black/55 dark:text-white/55 mt-1">
          {EP.released}, {EP.date} · {EP.durationLabel} · Ep. {EP.number}
        </div>

        <div className="relative mt-4">
          <Meter value={played} color={C.tech} height={6} />
          <div className="flex justify-between text-caption1 text-black/55 dark:text-white/55 mt-1.5">
            <span>{EP.position}</span>
            <span>{EP.duration}</span>
          </div>
        </div>

        <div className="relative flex items-center gap-3 mt-4">
          <Button large rounded className="flex-1 gap-2" onClick={() => nav.push('now-playing', { at: EP.positionSec })}>
            <Play className="w-5 h-5 fill-current" /> Play · {EP.left}
          </Button>
          <button
            onClick={() => { setDownloaded(!downloaded); flash(downloaded ? 'Download removed' : `Downloaded · ${EP.size}`) }}
            className="w-12 h-12 rounded-full bg-card flex items-center justify-center shrink-0"
            aria-label="Download"
          >
            {downloaded
              ? <Check className="w-5 h-5 vs-bounce" style={{ color: C.tech }} />
              : <Download className="w-5 h-5" />}
          </button>
          <button
            onClick={() => { setQueued(!queued); flash(queued ? 'Removed from Up Next' : 'Added to Up Next') }}
            className="w-12 h-12 rounded-full bg-card flex items-center justify-center shrink-0"
            aria-label="Add to queue"
          >
            {queued
              ? <ListChecks className="w-5 h-5 vs-bounce" style={{ color: C.tech }} />
              : <ListPlus className="w-5 h-5" />}
          </button>
        </div>
        <div className="relative text-caption1 text-black/55 dark:text-white/55 mt-2 text-center">
          {downloaded ? `Downloaded · ${EP.size}` : 'Streaming'} · {queued ? 'In Up Next' : 'Not in queue'}
        </div>
      </div>

      {/* Show notes */}
      <BlockTitle>Show notes</BlockTitle>
      <Block strong inset className="vs-rise" style={{ animationDelay: '60ms' }}>
        {NOTES.map((p, i) => (
          <p key={i} className={`text-body ${i ? 'mt-3 text-black/70 dark:text-white/70' : ''}`}>{p}</p>
        ))}
      </Block>

      <BlockTitle>Guest & links</BlockTitle>
      <List strong inset dividers className="vs-rise" style={{ animationDelay: '120ms' }}>
        <ListItem
          title={GUEST.name}
          text={GUEST.role}
          media={<Avatar name={GUEST.name} color={C.tech} size={44} />}
        />
        <ListItem
          link
          title="Silicon Borders"
          subtitle="Kenji Watanabe's book"
          media={<Tile color={C.tech} tinted><BookOpen className="w-4 h-4" style={{ color: C.tech }} /></Tile>}
          onClick={() => flash('Opening link…')}
        />
        <ListItem
          link
          title="Episode transcript"
          subtitle="signalandnoise.fm/214"
          media={<Tile color={C.business} tinted><Globe className="w-4 h-4" style={{ color: C.business }} /></Tile>}
          onClick={() => flash('Opening link…')}
        />
      </List>

      {/* Chapters */}
      <BlockTitle>Chapters · {CHAPTERS.length}</BlockTitle>
      <List strong inset dividers>
        {CHAPTERS.map((ch, i) => {
          const end = i < CHAPTERS.length - 1 ? CHAPTERS[i + 1].s : EP.totalSec
          const current = EP.positionSec >= ch.s && EP.positionSec < end
          const past = EP.positionSec >= end
          const progress = current ? (EP.positionSec - ch.s) / (end - ch.s) : 0
          return (
            <ListItem
              key={ch.t}
              link
              className="vs-rise"
              style={{ animationDelay: `${180 + i * 60}ms` }}
              onClick={() => nav.push('now-playing', { at: ch.s })}
              media={
                <div
                  className="w-12 h-8 rounded-lg flex items-center justify-center text-footnote font-semibold tabular-nums"
                  style={current ? { background: tint(C.tech, 22), color: C.tech } : undefined}
                >
                  {ch.t}
                </div>
              }
              title={
                <span className={`truncate ${past ? 'opacity-50' : ''} ${current ? 'font-semibold' : ''}`}>{ch.title}</span>
              }
              text={current ? (
                <div className="mt-1.5 pr-2"><Meter value={progress} color={C.tech} height={4} /></div>
              ) : null}
              after={
                current
                  ? <span className="flex items-center gap-1 text-footnote font-semibold" style={{ color: C.tech }}><AudioLines className="w-4 h-4" /> Playing</span>
                  : past ? <Check className="w-4 h-4 opacity-40" /> : null
              }
            />
          )
        })}
      </List>
      <div className="px-8 -mt-2 text-footnote text-black/55 dark:text-white/55">
        Tap a chapter to jump straight to it.
      </div>

      <Toast opened={!!toast} position="center">{toast}</Toast>
    </Page>
  )
}

function PhotoCover() {
  return <PhotoInline />
}

import { Photo } from '@od/kit'

function PhotoInline() {
  return <Photo q={SHOW.photo} className="w-24 h-24 rounded-2xl" alt={SHOW.name} />
}
