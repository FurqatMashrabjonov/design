import { PRODUCTS, type ProductKey } from '@/lib/credit-prices'
import { SecretService } from './SecretService'

// BIL-09/11: the payment provider (Polar, BIL-01). Sandbox until the live account is approved:
// POLAR_SERVER=production switches the host; the token belongs to one organization, so no org id.
// Products are found by `metadata.od` (lib/credit-prices.ts PRODUCTS), never by a pasted id.

const BASE = () => (process.env.POLAR_SERVER === 'production' ? 'https://api.polar.sh' : 'https://sandbox-api.polar.sh')

async function api<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const token = await SecretService.get('POLAR_ACCESS_TOKEN')
  if (!token) throw new Error('Payments are not configured — add the Polar token in Admin → Settings → API keys')
  const res = await fetch(`${BASE()}${path}`, {
    method: init?.method ?? 'GET',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
  })
  if (!res.ok) throw new Error(`Polar ${res.status}: ${(await res.text()).slice(0, 300)}`)
  return (await res.json()) as T
}

type PolarProduct = { id: string; is_archived: boolean; metadata: Record<string, unknown> }
let cache: Map<string, string> | undefined

export const PolarService = {
  /** Our product key → the provider's product id (cached for the process). */
  async productIds(fresh = false): Promise<Map<string, string>> {
    if (cache && !fresh) return cache
    const r = await api<{ items: PolarProduct[] }>('/v1/products/?limit=100&is_archived=false')
    cache = new Map(r.items.filter((p) => typeof p.metadata?.od === 'string').map((p) => [p.metadata.od as string, p.id]))
    return cache
  },

  /** Creates every product in PRODUCTS that the provider does not have yet. Idempotent; returns the keys it made. */
  async ensureProducts(): Promise<ProductKey[]> {
    const have = await PolarService.productIds(true)
    const made: ProductKey[] = []
    for (const p of PRODUCTS.filter((x) => !have.has(x.key))) {
      await api('/v1/products/', {
        method: 'POST',
        body: {
          name: p.name,
          prices: [{ amount_type: 'fixed', price_amount: p.cents, price_currency: 'usd' }],
          recurring_interval: p.interval,
          metadata: { od: p.key, credits: p.credits },
        },
      })
      made.push(p.key)
    }
    if (made.length) await PolarService.productIds(true)
    return made
  },

  /** BIL-09: a hosted checkout for one product, tied to our user by `external_customer_id`. */
  async checkout(o: { userId: string; email: string; key: ProductKey; successUrl: string }): Promise<string> {
    const id = (await PolarService.productIds()).get(o.key)
    if (!id) throw new Error(`Product "${o.key}" is not set up with the payment provider`)
    const r = await api<{ url: string }>('/v1/checkouts/', {
      method: 'POST',
      body: { products: [id], external_customer_id: o.userId, customer_email: o.email, success_url: o.successUrl, metadata: { user_id: o.userId } },
    })
    return r.url
  },

  /** BIL-11: the provider's own billing portal (cards, invoices, cancel), for this user. */
  async portal(userId: string, returnUrl: string): Promise<string> {
    const r = await api<{ customer_portal_url: string }>('/v1/customer-sessions/', { method: 'POST', body: { external_customer_id: userId, return_url: returnUrl } })
    return r.customer_portal_url
  },
}
