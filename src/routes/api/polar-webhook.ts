import { createFileRoute } from '@tanstack/react-router'
import { BillingController } from '@/app/Http/Controllers/BillingController'

// BIL-10: the payment provider's events — verified, applied and stored (OBS-12) by the controller.
export const Route = createFileRoute('/api/polar-webhook')({
  server: {
    handlers: {
      POST: ({ request }) => BillingController.receivePolar(request),
    },
  },
})
