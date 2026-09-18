import { createFileRoute } from '@tanstack/react-router'
import { GenerateController } from '@/app/Http/Controllers/GenerateController'

export const Route = createFileRoute('/api/generate')({
  server: {
    handlers: {
      POST: ({ request }) => GenerateController.stream(request),
    },
  },
})
