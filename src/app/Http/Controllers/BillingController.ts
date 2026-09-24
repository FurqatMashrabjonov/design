import { Credit } from '@/app/Models/Credit'
import { Subscription } from '@/app/Models/Subscription'
import { CreditService } from '@/app/Services/CreditService'
import { PolarService } from '@/app/Services/PolarService'
import { productOf, type ProductKey } from '@/lib/credit-prices'

// BIL-09/10/11. Checkout and the portal are the provider's pages; what they cause arrives as webhooks,
// already verified by the route. Every grant carries a ref from the provider's own ids, so an event
// delivered twice grants once.

type Obj = Record<string, any>
const sec = (iso: unknown) => (typeof iso === 'string' ? Math.floor(Date.parse(iso) / 1000) : null)
const userOf = (o: Obj): string | undefined => o.customer?.external_id ?? o.metadata?.user_id ?? undefined

function saveSubscription(s: Obj, product: Obj | undefined) {
  const userId = userOf(s)
  const key = (product ?? s.product)?.metadata?.od
  if (!userId || !productOf(key)?.plan || !s.id) return null
  Subscription.upsert({
    id: s.id,
    userId,
    productKey: key,
    status: String(s.status),
    startedAt: sec(s.started_at) ?? sec(s.current_period_start) ?? Math.floor(Date.now() / 1000),
    currentPeriodEnd: sec(s.current_period_end),
    cancelAtPeriodEnd: s.cancel_at_period_end === true,
  })
  CreditService.refresh(userId)
  return userId
}

export const BillingController = {
  async checkout(user: { id: string; email: string }, key: ProductKey, origin: string) {
    const product = productOf(key)
    if (!product) throw new Error('Unknown product')
    if (!product.plan && !Subscription.activeFor(user.id)) throw new Error('Credit packs are for Starter and Pro subscribers')
    return { url: await PolarService.checkout({ userId: user.id, email: user.email, key, successUrl: `${origin}/?checkout=success` }) }
  },

  async portal(userId: string, origin: string) {
    return { url: await PolarService.portal(userId, `${origin}/`) }
  },

  /** One verified webhook event. Returns what it did, for the log and the tests. */
  webhook(event: { type?: string; data?: Obj }): string {
    const d = event.data ?? {}
    if (event.type?.startsWith('subscription.')) return saveSubscription(d, undefined) ? 'subscription saved' : 'ignored'
    if (event.type === 'order.paid') {
      const product = productOf(d.product?.metadata?.od)
      const userId = userOf(d)
      if (!product || !userId || !d.id) return 'ignored'
      if (!product.plan) {
        return Credit.add({ userId, delta: product.credits, kind: 'purchase', ref: `order:${d.id}`, note: product.name }) ? 'pack granted' : 'duplicate'
      }
      // A plan's order: its credits follow the subscription (monthly, once each).
      if (d.subscription) saveSubscription(d.subscription, d.product)
      else CreditService.refresh(userId)
      return 'plan order'
    }
    return 'ignored'
  },
}
