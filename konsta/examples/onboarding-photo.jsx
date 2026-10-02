import { Page, Button, Link } from 'konsta/react'
import { useNav, Photo } from '@od/kit'

// One full-bleed photo of the app's world, the promise over a dark gradient, one action. No slides, no dots.
export default function Screen() {
  const nav = useNav()
  return (
    <Page className="relative">
      <Photo q="mountain lake at sunrise" className="absolute inset-0" alt="A quiet lake at sunrise">
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/20 to-black/85" />
      </Photo>
      <div className="relative z-10 flex h-full min-h-[844px] flex-col justify-end px-6 pb-14 text-white">
        <p className="text-footnote font-semibold uppercase tracking-widest opacity-80 vs-rise">Wander</p>
        <h1 className="mt-3 text-large-title leading-tight vs-rise" style={{ animationDelay: '80ms' }}>
          Trips worth
          <br />
          remembering
        </h1>
        <p className="mt-3 text-body opacity-85 vs-rise" style={{ animationDelay: '160ms' }}>
          Plan every day, keep every place, and share the whole journey with the people you travel with.
        </p>
        <div className="mt-8 vs-rise" style={{ animationDelay: '240ms' }}>
          <Button large rounded onClick={() => nav.push('home')}>Plan my first trip</Button>
          <p className="mt-4 text-center text-subhead">
            <span className="opacity-75">Have an account? </span>
            <Link className="!text-white font-semibold" onClick={() => nav.push('log-in')}>Log in</Link>
          </p>
        </div>
      </div>
    </Page>
  )
}
