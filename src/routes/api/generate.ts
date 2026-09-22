import { createFileRoute } from '@tanstack/react-router'
import { GenerateController } from '@/app/Http/Controllers/GenerateController'
import { guardGeneration } from '@/server/guard'

export const Route = createFileRoute('/api/generate')({
  server: {
    handlers: {
      POST: ({ request }) => guardGeneration(request, (req, userId) => GenerateController.stream(req, { userId })),
    },
  },
})
