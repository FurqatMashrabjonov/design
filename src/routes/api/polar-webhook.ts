import { createFileRoute } from '@tanstack/react-router'
import { BillingController } from '@/app/Http/Controllers/BillingController'
import { verify } from '@/lib/standard-webhooks'

// BIL-10: the payment provider's events. Nothing is trusted before the signature is: a forged or
// replayed request is refused with 403 and changes nothing. A 2xx tells the provider to stop retrying.
export const Route = createFileRoute('/api/polar-webhook')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.text()
        const h = request.headers
        const ok = verify(process.env.POLAR_WEBHOOK_SECRET ?? '', { id: h.get('webhook-id'), timestamp: h.get('webhook-timestamp'), signature: h.get('webhook-signature') }, body)
        if (!ok) return new Response('Invalid signature', { status: 403 })
        let event: { type?: string; data?: Record<string, unknown> }
        try {
          event = JSON.parse(body)
        } catch {
          return new Response('Invalid body', { status: 400 })
        }
        const did = await BillingController.webhook(event)
        console.log(`[polar] ${event.type}: ${did}`)
        return new Response(did, { status: 202 })
      },
    },
  },
})
