import { createFileRoute } from '@tanstack/react-router'
import { auth } from '@/app/Services/AuthService'

// Better Auth's endpoints: sign-in, callbacks, session, sign-out (AUTH-02).
export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      GET: ({ request }) => auth.handler(request),
      POST: ({ request }) => auth.handler(request),
    },
  },
})
