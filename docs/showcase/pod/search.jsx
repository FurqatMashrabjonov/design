import { useState } from 'react'
import { Page, Navbar, Searchbar, BlockTitle, List, ListItem, Chip, Block } from 'konsta/react'
import { Clock, Star, TrendingUp } from 'lucide-react'
import { useNav, AppTabbar, Hero, Photo, tint } from '@od/kit'

const C = {"tech":"#22d3ee","trueCrime":"#f97316","comedy":"#facc15","news":"#f472b6","science":"#34d399","business":"#818cf8"}

const SHOWS = [
  { id: 'signal-noise', name: 'Signal & Noise', host: 'Priya Raman', cat: 'Tech', key: 'tech', emoji: '💡', rating: 4.8, photo: 'neon circuit board' },
  { id: 'byte-sized', name: 'Byte Sized', host: 'Dev Malik', cat: 'Tech', key: 'tech', emoji: '⚡', rating: 4.6, photo: 'laptop glowing dark desk' },
  { id: 'the-stack', name: 'The Stack', host: 'Lena Brooks & Omar Haddad', cat: 'Tech', key: 'tech', emoji: '🧱', rating: 4.7, photo: 'server room blue lights' },
  { id: 'founders', name: 'Founders After Dark', host: 'Jules Moreau', cat: 'Business', key: 'business', emoji: '🌙', rating: 4.5, photo: 'city skyline at night' },
  { id: 'cold-ledger', name: 'Cold Ledger', host: 'Nora Quinn', cat: 'True Crime', key: 'trueCrime', emoji: '🔍', rating: 4.9, photo: 'foggy forest road night' },
  { id: 'vanished', name: 'Vanished in Vermont', host: 'Eli Carter', cat: 'True Crime', key: 'trueCrime', emoji: '🕯️', rating: 4.7, photo: 'abandoned farmhouse snow' },
  { id: 'missing-hour', name: 'The Missing Hour', host: 'Rosa Delgado', cat: 'True Crime', key: 'trueCrime', emoji: '⏳', rating: 4.6, photo: 'old clock dark room' },
  { id: 'deep-field', name: 'Deep Field', host: 'Dr. Amara Bello', cat: 'Science', key: 'science', emoji: '🔭', rating: 4.8, photo: 'galaxy night sky' },
  { id: 'half-joking', name: 'Half Joking', host: 'Sam Ortiz & Kat Lee', cat: 'Comedy', key: 'comedy', emoji: '😂', rating: 4.4, photo: 'microphone neon stage' },
  { id: 'morning-brief', name: 'Morning Brief', host: 'Daily News', cat: 'News', key: 'news', emoji: '📰', rating: 4.3, photo: 'newspaper coffee morning' },
]

const CATEGORIES = [
  { name: 'Tech', emoji: '💻', color: C.tech },
  { name: 'True Crime', emoji: '🔍', color: C.trueCrime },
  { name: 'Comedy', emoji: '😂', color: C.comedy },
  { name: 'News', emoji: '📰', color: C.news },
  { name: 'Science', emoji: '🔬', color: C.science },
  { name: 'Business', emoji: '💼', color: C.business },
  { name: 'Health', emoji: '🫀', color: C.science },
  { name: 'History', emoji: '🏛️', color: C.news },
]

const RECENT = ['semiconductors', 'Cold Ledger', 'space']
const TRENDING = ['the-stack', 'byte-sized', 'signal-noise']

export default function Screen() {
  const nav = useNav()
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const results = q
    ? SHOWS.filter((s) =>
        [s.name, s.host, s.cat].some((f) => f.toLowerCase().includes(q)) ||
        (q.includes('semi') && s.key === 'tech') ||
        (q.includes('space') && s.key === 'science'))
    : []
  const open = (id) => nav.push('show-page', { id })

  return (
    <Page className="pb-32">
      <Navbar
        large
        transparent
        title="Search"
        subnavbar={
          <Searchbar
            placeholder="Shows, episodes, people"
            value={query}
            clearButton
            disableButton
            onInput={(e) => setQuery(e.target.value)}
            onClear={() => setQuery('')}
            onDisable={() => setQuery('')}
          />
        }
      />

      <BlockTitle className="!mb-2">Recent searches</BlockTitle>
      <div className="flex gap-2 overflow-x-auto px-4 pb-1">
        {RECENT.map((r) => (
          <Chip
            key={r}
            className="shrink-0 cursor-pointer"
            media={<Clock className="w-4 h-4 opacity-60" />}
            onClick={() => setQuery(r)}
          >
            {r}
          </Chip>
        ))}
      </div>

      {q ? (
        <>
          <BlockTitle className="!mb-2">{results.length} {results.length === 1 ? 'result' : 'results'}</BlockTitle>
          {results.length ? (
            <List strong inset dividers>
              {results.map((s) => (
                <ListItem
                  key={s.id}
                  link
                  onClick={() => open(s.id)}
                  title={<span className="truncate">{s.name}</span>}
                  subtitle={<span className="text-footnote text-black/55 dark:text-white/55">{s.host}</span>}
                  media={<Photo q={s.photo} className="w-14 h-14 rounded-2xl" />}
                  after={<span className="text-footnote font-semibold" style={{ color: C[s.key] }}>{s.cat}</span>}
                />
              ))}
            </List>
          ) : (
            <Block className="text-center">
              <div className="text-5xl mb-2">🎧</div>
              <div className="text-headline">No matches</div>
              <div className="text-subhead text-black/55 dark:text-white/55">Try a show, host or topic.</div>
            </Block>
          )}
        </>
      ) : (
        <>
          <BlockTitle className="!mb-2">Browse categories</BlockTitle>
          <div className="grid grid-cols-2 gap-3 px-4">
            {CATEGORIES.map((c, i) => (
              <Hero
                key={c.name}
                as="button"
                color={c.color}
                onClick={() => nav.push('show-page', { category: c.name })}
                className="vs-rise relative h-32 overflow-hidden text-left flex flex-col justify-between"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <span className="text-4xl leading-none">{c.emoji}</span>
                <span className="text-title3 truncate">{c.name}</span>
              </Hero>
            ))}
          </div>

          <BlockTitle className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" style={{ color: C.tech }} /> Trending in Tech
          </BlockTitle>
          <List strong inset dividers>
            {TRENDING.map((id, i) => {
              const s = SHOWS.find((x) => x.id === id)
              return (
                <ListItem
                  key={s.id}
                  link
                  onClick={() => open(s.id)}
                  title={<span className="truncate">{s.name}</span>}
                  subtitle={<span className="text-footnote text-black/55 dark:text-white/55">{s.host}</span>}
                  media={
                    <div className="relative">
                      <Photo q={s.photo} className="w-14 h-14 rounded-2xl" />
                      <span
                        className="absolute -left-1 -top-1 w-6 h-6 rounded-full flex items-center justify-center text-caption1 font-bold bg-card"
                        style={{ color: C.tech, boxShadow: `0 0 0 2px ${tint(C.tech, 40)}` }}
                      >
                        {i + 1}
                      </span>
                    </div>
                  }
                  after={
                    <span className="flex items-center gap-1 text-subhead font-semibold" style={{ color: C.tech }}>
                      <Star className="w-4 h-4" fill="currentColor" /> {s.rating}
                    </span>
                  }
                />
              )
            })}
          </List>
        </>
      )}

      <AppTabbar active="search" />
    </Page>
  )
}
