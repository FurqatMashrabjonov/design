import { Credit } from '@/app/Models/Credit'
import { Subscription } from '@/app/Models/Subscription'
import { CreditService } from '@/app/Services/CreditService'
import { PolarService } from '@/app/Services/PolarService'
import { BusinessService } from '@/app/Services/BusinessService'
import { PAYMENTS_CLOSED, productOf, type ProductKey } from '@/lib/credit-prices'
import { Waitlist } from '@/app/Models/Waitlist'
import { SecretService } from '@/app/Services/SecretService'
import { TelescopeService } from '@/app/Services/TelescopeService'
import { verify } from '@/lib/standard-webhooks'
import { PaymentsService, PAYMENTS_OFF } from '@/app/Services/PaymentsService'

// BIL-09/10/11. Checkout and the portal are the provider's pages; what they cause arrives as webhooks,
// already verified by the route. Every grant carries a ref from the provider's own ids, so an event
// delivered twice grants once.

type Obj = Record<string, any>
const sec = (iso: unknown) => (typeof iso === 'string' ? Math.floor(Date.parse(iso) / 1000) : null)
const userOf = (o: Obj): string | undefined => o.customer?.external_id ?? o.metadata?.user_id ?? undefined

async function saveSubscription(s: Obj, product: Obj | undefined) {
  const userId = userOf(s)
  const key = (product ?? s.product)?.metadata?.od
  if (!userId || !productOf(key)?.plan || !s.id) return null
  await Subscription.upsert({
    id: s.id,
    userId,
    productKey: key,
    status: String(s.status),
    startedAt: sec(s.started_at) ?? sec(s.current_period_start) ?? Math.floor(Date.now() / 1000),
    currentPeriodEnd: sec(s.current_period_end),
    cancelAtPeriodEnd: s.cancel_at_period_end === true,
  })
  await CreditService.refresh(userId)
  return userId
}

export const BillingController = {
  async checkout(user: { id: string; email: string }, key: ProductKey, origin: string) {
    const product = productOf(key)
    if (!product) throw new Error('Unknown product')
    // PAY-01: while nothing is sold no checkout opens, whatever page or script asks.
    if (!(await PaymentsService.on())) throw new Error(PAYMENTS_OFF)
    if (!product.plan && !await Subscription.activeFor(user.id)) throw new Error('Credit packs are for Starter and Pro subscribers')
    // BIL-25: until the provider takes payments (an account under review, no token, a product missing) a checkout
    // fails; the person is told plainly and may ask to hear when it opens. The provider's reply stays in the log.
    try {
      return { url: await PolarService.checkout({ userId: user.id, email: user.email, key, successUrl: `${origin}/?checkout=success` }) }
    } catch (e) {
      console.error('[billing] checkout failed:', e instanceof Error ? e.message : e)
      throw new Error(PAYMENTS_CLOSED)
    }
  },

  /** BIL-21: the billing page — the plan in force, what this month's grant has left, the balance, and the last
   *  credit movements. Plan credits are spent first, so "left" is the last grant minus what was used since. */
  async page(userId: string, admin = false) {
    await CreditService.refresh(userId)
    const [sub, balance, grant, history, limits] = await Promise.all([Subscription.activeFor(userId), Credit.balance(userId), Credit.lastPlanGrant(userId), Credit.history(userId, 20), CreditService.limitsFor(userId, admin)])
    const product = productOf(sub?.productKey)
    const planLeft = grant ? Math.max(0, grant.delta - grant.usedSince) : 0
    return {
      plan: limits.plan,
      interval: product?.interval ?? null,
      renews: sub?.currentPeriodEnd ?? null,
      cancelling: sub?.cancelAtPeriodEnd ?? false,
      balance,
      month: grant ? { granted: grant.delta, left: planLeft } : null,
      packCredits: Math.max(0, balance - planLeft),
      canExport: limits.export,
      exportsLeft: await CreditService.exportsLeft(userId, admin),
      projects: limits.projects,
      history: history.map((h) => ({ id: h.id, at: h.createdAt, delta: h.delta, kind: h.kind, note: h.note })),
    }
  },

  /** BIL-25: "tell me when payments open" — the signed-in person joins the waitlist with the plan they wanted. */
  async notifyWhenOpen(user: { email: string }, key: ProductKey) {
    await Waitlist.join({ email: user.email.toLowerCase(), ref: 'payments', projectId: null, note: `wants ${key}` })
    return { ok: true }
  },

  async portal(userId: string, origin: string) {
    if (!(await PaymentsService.on())) throw new Error(PAYMENTS_OFF)
    return { url: await PolarService.portal(userId, `${origin}/`) }
  },

  /** One verified webhook event. Returns what it did, for the log and the tests. */
  async webhook(event: { type?: string; data?: Obj }): Promise<string> {
    const d = event.data ?? {}
    if (event.type?.startsWith('subscription.')) return (await saveSubscription(d, undefined)) ? 'subscription saved' : 'ignored'
    if (event.type === 'order.paid') {
      const product = productOf(d.product?.metadata?.od)
      const userId = userOf(d)
      if (!product || !userId || !d.id) return 'ignored'
      // ADM-15: revenue is what the order says it charged; the list price only when the payload has no amount.
      const cents = [d.total_amount, d.amount].find((v) => Number.isInteger(v) && v >= 0) ?? product.cents
      await BusinessService.recordOrder({
        id: String(d.id), userId, productKey: product.key, amountCents: cents,
        currency: typeof d.currency === 'string' && d.currency ? d.currency.toLowerCase() : 'usd',
        billingReason: typeof d.billing_reason === 'string' ? d.billing_reason : null,
        subscriptionId: d.subscription_id ?? d.subscription?.id ?? null,
        createdAt: sec(d.created_at) ?? Math.floor(Date.now() / 1000),
      })
      if (!product.plan) {
        return (await Credit.add({ userId, delta: product.credits, kind: 'purchase', ref: `order:${d.id}`, note: product.name })) ? 'pack granted' : 'duplicate'
      }
      // A plan's order: its credits follow the subscription (monthly, once each).
      if (d.subscription) await saveSubscription(d.subscription, d.product)
      else await CreditService.refresh(userId)
      return 'plan order'
    }
    return 'ignored'
  },

  /**
   * BIL-10 + OBS-12: a POST to /api/polar-webhook. Nothing is trusted before the signature is: a forged
   * or replayed request is refused with 403 and changes nothing. A 2xx tells the provider to stop
   * retrying. Every POST lands in webhook_events (fire-and-forget); the body only once verified.
   */
  async receivePolar(request: Request): Promise<Response> {
    const body = await request.text()
    const h = request.headers
    const verified = verify((await SecretService.get('POLAR_WEBHOOK_SECRET')) ?? '', { id: h.get('webhook-id'), timestamp: h.get('webhook-timestamp'), signature: h.get('webhook-signature') }, body)
    let event: { type?: string; data?: Obj } | null = null
    const answer = (result: string, status: number, text = result) => {
      void TelescopeService.recordWebhook({ provider: 'polar', eventType: typeof event?.type === 'string' ? event.type : null, eventId: h.get('webhook-id'), verified, result, httpStatus: status, payload: event ? body : null })
      return new Response(text, { status })
    }
    if (!verified) return answer('invalid signature', 403, 'Invalid signature')
    try {
      const parsed = JSON.parse(body)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) event = parsed
    } catch {}
    if (!event) return answer('invalid body', 400, 'Invalid body')
    let did: string
    try {
      did = await BillingController.webhook(event)
    } catch (e) {
      answer(`error: ${e instanceof Error ? e.message : String(e)}`, 500)
      throw e
    }
    console.log(`[polar] ${event.type}: ${did}`)
    return answer(did, 202)
  },
}
