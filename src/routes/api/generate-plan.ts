import { createFileRoute } from '@tanstack/react-router'
import { PlanController } from '@/app/Http/Controllers/PlanController'
import { guardGeneration } from '@/server/guard'

export const Route = createFileRoute('/api/generate-plan')({
  server: {
    handlers: {
      POST: ({ request }) => guardGeneration(request, (req, _userId, finish) => PlanController.stream(req, { onFinish: finish })),
    },
  },
})
