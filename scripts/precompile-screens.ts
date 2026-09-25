// LP-06 backfill: rewrites stored screens and their versions so they carry compiled Tailwind CSS and
// inline icon SVG instead of loading the Tailwind Play CDN and the Lucide script (lib/precompile.ts).
// Dry run by default — prints what would change; --write applies it. A row is only written if its
// html is still what was read (an edit meanwhile wins), and a screen the step cannot reproduce keeps
// its CDN script (counted under "kept").
// Run: node --env-file-if-exists=.env --import ./eval/alias-hook.mjs scripts/precompile-screens.ts [--write] [--limit n]
import { pool } from '../src/database/connection.ts'
import { precompileScreen } from '../src/lib/precompile.ts'

const write = process.argv.includes('--write')
const limitAt = process.argv.indexOf('--limit')
const limit = limitAt > 0 ? Number(process.argv[limitAt + 1]) : Infinity
const CDN = `html LIKE '%cdn.tailwindcss.com%' OR html LIKE '%lucide@%'`

for (const table of ['screens', 'screen_versions']) {
  const stats = { rows: 0, changed: 0, written: 0, skipped: 0, keptTailwind: 0, keptLucide: 0, bytesBefore: 0, bytesAfter: 0, ms: 0 }
  let after = ''
  for (;;) {
    const { rows } = await pool.query<{ id: string; html: string }>(`SELECT id, html FROM ${table} WHERE (${CDN}) AND id > $1 ORDER BY id LIMIT 50`, [after])
    if (rows.length === 0 || stats.rows >= limit) break
    for (const row of rows) {
      after = row.id
      if (stats.rows >= limit) break
      stats.rows++
      const t0 = performance.now()
      const html = await precompileScreen(row.html)
      stats.ms += performance.now() - t0
      if (/cdn\.tailwindcss\.com/.test(html)) stats.keptTailwind++
      if (/<script[^>]*src=[^>]*lucide@/.test(html)) stats.keptLucide++
      if (html === row.html) continue
      stats.changed++
      stats.bytesBefore += row.html.length
      stats.bytesAfter += html.length
      if (!write) continue
      const r = await pool.query(`UPDATE ${table} SET html = $1 WHERE id = $2 AND html = $3`, [html, row.id, row.html])
      if (r.rowCount) stats.written++
      else stats.skipped++
    }
  }
  console.log(table, JSON.stringify({ ...stats, ms: Math.round(stats.ms), mode: write ? 'write' : 'dry-run' }))
}
await pool.end()
