import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { ErrorPage, NotFound } from './components/NotFound'

export function getRouter() {
  // UI-15: a missing route, a notFound() thrown by a loader (a stranger's project, /admin for a
  // non-admin) and an uncaught error all render in the product's own look.
  return createRouter({ routeTree, scrollRestoration: true, defaultNotFoundComponent: NotFound, defaultErrorComponent: ErrorPage })
}
