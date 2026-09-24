// BIL-09: creates the products of lib/credit-prices.ts with the payment provider — once per
// environment (sandbox, then production). Idempotent: products already tagged `metadata.od` are kept.
// Run: node --env-file=.env --import ./eval/alias-hook.mjs scripts/polar-products.ts
import { PolarService } from '../src/app/Services/PolarService.ts'

const made = await PolarService.ensureProducts()
const ids = await PolarService.productIds(true)
console.log(`${process.env.POLAR_SERVER ?? 'sandbox'}: created ${made.length ? made.join(', ') : 'nothing'}; ${ids.size} products tagged`)
for (const [key, id] of ids) console.log(`  ${key.padEnd(14)} ${id}`)
