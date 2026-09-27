import { useState } from 'react'
import { Page, Navbar, NavbarBackLink, List, ListInput, Block, Button, Link, Preloader, Toast } from 'konsta/react'
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react'
import { useNav } from '../nav.jsx'

function Social() {
  const btn = 'flex-1 h-12 rounded-full flex items-center justify-center gap-2 font-semibold text-[15px] active:scale-[.97] transition'
  return (
    <div className="flex gap-3 px-4">
      <button className={`${btn} bg-black text-white dark:bg-white dark:text-black`}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16.37 12.62c-.02-2.3 1.88-3.4 1.96-3.46-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.14-2.76.83-3.47.83-.72 0-1.82-.81-2.99-.79-1.54.02-2.96.9-3.75 2.27-1.6 2.78-.41 6.89 1.15 9.14.76 1.1 1.67 2.34 2.86 2.3 1.15-.05 1.58-.74 2.97-.74 1.38 0 1.77.74 2.98.72 1.23-.02 2.01-1.12 2.76-2.23.87-1.28 1.23-2.52 1.25-2.58-.03-.01-2.39-.92-2.4-3.66zM14.1 5.86c.63-.77 1.06-1.83.94-2.89-.91.04-2.01.6-2.66 1.37-.58.67-1.09 1.76-.95 2.8 1.01.08 2.04-.51 2.67-1.28z" /></svg>
        Apple
      </button>
      <button className={`${btn} bg-black/5 dark:bg-white/10`}>
        <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C37 38.3 44 33 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
        Google
      </button>
    </div>
  )
}

function Divider() {
  return (
    <div className="flex items-center gap-3 px-4 my-6 text-sm opacity-50">
      <span className="flex-1 h-px bg-current opacity-30" />or<span className="flex-1 h-px bg-current opacity-30" />
    </div>
  )
}

export function SignUp() {
  const nav = useNav()
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const go = () => {
    setBusy(true)
    setTimeout(() => nav.push('goals'), 900)
  }
  return (
    <Page className="pb-10">
      <Navbar transparent left={<NavbarBackLink showText={false} onClick={nav.pop} />} />
      <Block className="!mt-0">
        <h1 className="text-[32px] font-bold tracking-tight">Create account</h1>
        <p className="opacity-60 mt-1">It takes less than a minute.</p>
      </Block>
      <Social />
      <Divider />
      <List strong inset>
        <ListInput label="Name" type="text" placeholder="Your name" defaultValue="Aziza Karimova" media={<User className="w-5 h-5 opacity-50" />} />
        <ListInput label="Email" type="email" placeholder="you@example.com" defaultValue="aziza@vita.app" media={<Mail className="w-5 h-5 opacity-50" />} />
        <ListInput label="Password" type={show ? 'text' : 'password'} placeholder="At least 8 characters" defaultValue="strongpass1" media={<Lock className="w-5 h-5 opacity-50" />}
          info="Use 8+ characters with a number." inputClassName="pr-10" />
      </List>
      <div className="flex justify-end px-8 -mt-3 mb-2">
        <button onClick={() => setShow(!show)} className="text-sm flex items-center gap-1 opacity-60">{show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}{show ? 'Hide' : 'Show'} password</button>
      </div>
      <Block>
        <Button large rounded onClick={go} disabled={busy}>{busy ? <Preloader className="w-6 h-6 text-white" /> : 'Create account'}</Button>
        <p className="text-center text-xs opacity-50 mt-4 leading-relaxed">By continuing you agree to our <Link>Terms</Link> and <Link>Privacy Policy</Link>.</p>
        <div className="text-center mt-4 text-[15px]"><span className="opacity-60">Have an account? </span><Link onClick={() => nav.push('login')}>Log in</Link></div>
      </Block>
    </Page>
  )
}

export function LogIn() {
  const nav = useNav()
  const [busy, setBusy] = useState(false)
  return (
    <Page className="pb-10">
      <Navbar transparent left={<NavbarBackLink showText={false} onClick={nav.pop} />} />
      <Block className="!mt-0">
        <div className="w-14 h-14 rounded-[18px] flex items-center justify-center text-3xl mb-5" style={{ background: 'linear-gradient(145deg, var(--color-primary), #bf5af2)' }}>🌿</div>
        <h1 className="text-[32px] font-bold tracking-tight">Welcome back</h1>
        <p className="opacity-60 mt-1">Your streaks missed you.</p>
      </Block>
      <List strong inset>
        <ListInput label="Email" type="email" placeholder="you@example.com" defaultValue="aziza@vita.app" media={<Mail className="w-5 h-5 opacity-50" />} clearButton />
        <ListInput label="Password" type="password" placeholder="Password" defaultValue="strongpass1" media={<Lock className="w-5 h-5 opacity-50" />} />
      </List>
      <div className="flex justify-end px-8 -mt-3"><Link onClick={() => nav.push('forgot')}>Forgot password?</Link></div>
      <Block>
        <Button large rounded disabled={busy} onClick={() => { setBusy(true); setTimeout(() => nav.reset('today'), 800) }}>{busy ? <Preloader className="w-6 h-6 text-white" /> : 'Log in'}</Button>
      </Block>
      <Divider />
      <Social />
      <div className="text-center mt-8 text-[15px]"><span className="opacity-60">New to Vita? </span><Link onClick={() => nav.push('signup')}>Create account</Link></div>
    </Page>
  )
}

export function Forgot() {
  const nav = useNav()
  const [sent, setSent] = useState(false)
  return (
    <Page>
      <Navbar title="Reset password" left={<NavbarBackLink showText={false} onClick={nav.pop} />} />
      <Block className="text-center !mt-10">
        <div className="text-6xl vs-float">🔑</div>
        <h2 className="text-2xl font-bold mt-4">Forgot your password?</h2>
        <p className="opacity-60 mt-2">Enter the email you signed up with and we will send you a link to set a new one.</p>
      </Block>
      <List strong inset>
        <ListInput label="Email" type="email" placeholder="you@example.com" defaultValue="aziza@vita.app" media={<Mail className="w-5 h-5 opacity-50" />} />
      </List>
      <Block>
        <Button large rounded onClick={() => { setSent(true); setTimeout(() => setSent(false), 2600) }}>Send reset link</Button>
      </Block>
      <Toast position="center" opened={sent} button={<Button rounded clear small inline onClick={() => setSent(false)}>OK</Button>}>
        <div className="shrink">Check your inbox — the link is valid for 30 minutes.</div>
      </Toast>
    </Page>
  )
}
