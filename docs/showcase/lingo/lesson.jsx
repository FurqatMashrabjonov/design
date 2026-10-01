import { useState } from 'react'
import { Page, Navbar, Link, Block, BlockTitle, Button } from 'konsta/react'
import { X, Heart, Volume2, Check, CircleCheck, Flag } from 'lucide-react'
import { useNav, Meter, Photo, Tile, Confetti, tint } from '@od/kit'

const C = {"xp":"#ffc300","streak":"#00c49a","hearts":"#7b61ff","gems":"#ff3d7f","crowns":"#00a8e8","words":"#58cc02"}

const LESSON = { title: 'Ordering at a café', step: 7, total: 10, hearts: 4, maxHearts: 5 }
const QUESTION = { prompt: 'la manzana', photo: 'red apple on table' }
const TILES = [
  { id: 'apple', emoji: '🍎', word: 'apple', correct: true },
  { id: 'banana', emoji: '🍌', word: 'banana' },
  { id: 'bread', emoji: '🥖', word: 'bread' },
  { id: 'cheese', emoji: '🧀', word: 'cheese' },
]
// Questions 1–6 answered: one miss (the lost heart), the rest right.
const ANSWERS = [true, true, true, false, true, true]

export default function Screen() {
  const nav = useNav()
  const [picked, setPicked] = useState('apple')
  const [checked, setChecked] = useState(false)
  const [playing, setPlaying] = useState(false)

  const progress = (checked ? LESSON.step : LESSON.step - 1) / LESSON.total
  const right = TILES.find((t) => t.id === picked)?.correct

  return (
    <Page className="pb-40">
      <Navbar
        left={<Link iconOnly onClick={nav.pop}><X className="w-6 h-6" /></Link>}
        title={
          <div className="w-44 sm:w-52">
            <Meter value={progress} color={C.words} height={14} />
          </div>
        }
        right={
          <div className="flex items-center gap-1 pr-2 font-semibold text-headline" style={{ color: C.hearts }}>
            <Heart className="w-6 h-6" fill={C.hearts} strokeWidth={0} />
            {LESSON.hearts}
          </div>
        }
      />

      <div className="px-4 pt-4 flex items-center gap-3 vs-rise">
        <button
          onClick={() => setPlaying(!playing)}
          className="shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center text-white active:scale-95 transition"
          style={{ background: C.crowns }}
          aria-label="Play audio"
        >
          <Volume2 className={`w-6 h-6 ${playing ? 'vs-bounce' : ''}`} />
        </button>
        <div className="min-w-0">
          <div className="text-footnote text-black/55 dark:text-white/55">Question {LESSON.step} of {LESSON.total} · Select the meaning</div>
          <div className="text-title2 leading-tight">
            Which one is <span style={{ color: C.crowns }}>“{QUESTION.prompt}”</span>?
          </div>
        </div>
      </div>

      <div className="px-4 mt-4 vs-rise" style={{ animationDelay: '60ms' }}>
        <Photo q={QUESTION.photo} className="w-full h-44 rounded-card">
          <div className="absolute inset-0 rounded-card bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
            <span className="text-white text-subhead font-semibold">🇪🇸 {LESSON.title}</span>
          </div>
        </Photo>
      </div>

      <div className="grid grid-cols-2 gap-3 px-4 mt-4">
        {TILES.map((t, i) => {
          const sel = picked === t.id
          const ring = checked && sel ? (t.correct ? C.words : C.gems) : sel ? C.crowns : 'transparent'
          return (
            <button
              key={t.id}
              disabled={checked}
              onClick={() => setPicked(t.id)}
              className={`bg-card rounded-card min-h-[120px] p-4 flex flex-col items-center justify-center gap-2 border-[3px] transition active:scale-95 vs-rise ${sel ? 'vs-bounce' : ''}`}
              style={{ borderColor: ring, background: sel ? tint(checked && t.correct ? C.words : C.crowns, 14) : undefined, animationDelay: `${(i + 2) * 60}ms` }}
            >
              <span className="text-5xl">{t.emoji}</span>
              <span className="text-headline" style={sel ? { color: checked && t.correct ? C.words : C.crowns } : undefined}>{t.word}</span>
            </button>
          )
        })}
      </div>

      <BlockTitle className="!mb-2">Your answers</BlockTitle>
      <div className="px-4">
        <div className="bg-card rounded-card p-4 flex items-center justify-between">
          {Array.from({ length: LESSON.total }, (_, i) => {
            const a = i < ANSWERS.length ? ANSWERS[i] : i === LESSON.step - 1 && checked ? right : null
            const current = i === LESSON.step - 1 && !checked
            return (
              <div
                key={i}
                className="w-6 h-6 rounded-full flex items-center justify-center text-white"
                style={{
                  background: a === true ? C.words : a === false ? C.gems : current ? tint(C.crowns, 30) : 'rgba(120,120,128,.18)',
                  outline: current ? `2px solid ${C.crowns}` : undefined,
                }}
              >
                {a === true && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                {a === false && <X className="w-3.5 h-3.5" strokeWidth={3} />}
              </div>
            )
          })}
        </div>
      </div>

      <Block className="!mt-4">
        <div className="flex gap-3 items-start rounded-card p-4" style={{ background: tint(C.xp, 18) }}>
          <Tile color={C.xp} tinted size={44}><span className="text-2xl">🦜</span></Tile>
          <div className="min-w-0">
            <div className="text-headline">Charlo’s tip</div>
            <div className="text-subhead text-black/70 dark:text-white/70">Most nouns ending in -a are feminine and take “la” — la manzana, la cuenta.</div>
          </div>
        </div>
      </Block>

      {!checked ? (
        <div className="fixed bottom-0 left-0 right-0 z-20 px-4 pt-3 pb-8 bg-page border-t border-line">
          <Button large rounded disabled={!picked} onClick={() => setChecked(true)}>Check</Button>
        </div>
      ) : (
        <div className="fixed bottom-0 left-0 right-0 z-20 px-4 pt-4 pb-8 rounded-t-[28px] vs-rise bg-card" style={{ boxShadow: '0 -8px 30px rgba(0,0,0,.12)' }}>
          <div className="absolute inset-0 rounded-t-[28px] pointer-events-none" style={{ background: tint(right ? C.words : C.gems, 18) }} />
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              {right
                ? <CircleCheck className="w-8 h-8 vs-bounce" style={{ color: C.words }} />
                : <Flag className="w-8 h-8" style={{ color: C.gems }} />}
              <div className="min-w-0">
                <div className="text-title3" style={{ color: right ? '#3f9a00' : C.gems }}>{right ? 'Correct! ¡Muy bien!' : 'Not quite'}</div>
                <div className="text-subhead text-black/60 dark:text-white/60 truncate">🍎 la manzana — apple</div>
              </div>
            </div>
            <Button large rounded style={{ background: right ? C.words : C.gems }} onClick={() => nav.push('lesson-result')}>Continue</Button>
          </div>
        </div>
      )}

      <Confetti run={checked && !!right} />
    </Page>
  )
}
