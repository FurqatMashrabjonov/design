import { createFileRoute } from '@tanstack/react-router'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { mcpServer } from '@/app/Services/McpService'
import { userFromApiKey } from '@/server/auth'
import { publicOrigin } from '@/server/guard'

// MCP-01: POST /api/mcp — Streamable HTTP, stateless (a server and transport per request; nothing is kept between
// calls), JSON answers. The caller is the owner of the `Authorization: Bearer ss_…` key made on /connect.
async function handle(request: Request): Promise<Response> {
  const user = await userFromApiKey(request)
  if (!user) return Response.json({ jsonrpc: '2.0', error: { code: -32001, message: 'Missing or invalid API key. Make one at /connect.' }, id: null }, { status: 401, headers: { 'www-authenticate': 'Bearer realm="screenspell"' } })
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true })
  await mcpServer(user, publicOrigin(request)).connect(transport)
  return transport.handleRequest(request)
}

const notAllowed = () => new Response('Method not allowed', { status: 405, headers: { allow: 'POST' } })

export const Route = createFileRoute('/api/mcp')({
  server: { handlers: { POST: ({ request }) => handle(request), GET: notAllowed, DELETE: notAllowed } },
})
