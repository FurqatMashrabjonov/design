import { createFileRoute } from '@tanstack/react-router'
import { PlanController } from '@/app/Http/Controllers/PlanController'

export const Route = createFileRoute('/api/generate-plan')({
  server: {
    handlers: {
      POST: ({ request }) => PlanController.stream(request),
    },
  },
})
