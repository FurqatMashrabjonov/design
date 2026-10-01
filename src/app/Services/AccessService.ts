import { Setting } from '@/app/Models/Setting'
export { WAITLIST_ONLY } from '@/lib/access'

// ACC-01: who may use the app. `waitlist` — the site is public, but only an admin signs in and works; everyone
// else joins the waitlist (until the promotion ends). `open` — everyone. An admin flips it in the panel
// (settings `access.mode`, logged); `ACCESS_MODE` in the environment wins over the panel, as GENERATION_PAUSED
// does. With neither, production starts in waitlist and development is open, so a fresh deploy is never open by
// accident and local work needs no switch.
export type AccessMode = 'waitlist' | 'open'
export const ACCESS_MODES: readonly AccessMode[] = ['waitlist', 'open']

const asMode = (v: string | null | undefined): AccessMode | null => (v === 'waitlist' || v === 'open' ? v : null)
const CACHE_MS = 10_000
let cached: { mode: AccessMode; at: number } | null = null

export const AccessService = {
  envMode: (): AccessMode | null => asMode(process.env.ACCESS_MODE),

  async mode(): Promise<AccessMode> {
    const env = AccessService.envMode()
    if (env) return env
    if (cached && Date.now() - cached.at < CACHE_MS) return cached.mode
    const mode = asMode(await Setting.get('access.mode')) ?? (process.env.NODE_ENV === 'production' ? 'waitlist' : 'open')
    cached = { mode, at: Date.now() }
    return mode
  },

  /** The panel changed the mode: this server reads the new one at once. */
  clear() {
    cached = null
  },

  /** May this person sign in and use the app? An admin always may. */
  async allows(admin: boolean): Promise<boolean> {
    return admin || (await AccessService.mode()) === 'open'
  },
}
