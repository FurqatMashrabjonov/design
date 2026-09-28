import type { Migration } from '../migrate'

// KON-00: a screen written as a Konsta component opens another with nav.push('<slug>'); the slug is the
// id the plan gave the screen. `html` keeps holding the screen's source (now JSX), so versions, undo
// and the conversation work unchanged.
export default {
  name: '0007_screen_slug',
  up: `ALTER TABLE screens ADD COLUMN slug TEXT;`,
} satisfies Migration
