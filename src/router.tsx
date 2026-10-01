import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { ErrorPage, NotFound } from './components/NotFound'

export function getRouter() {
  // UI-15: a missing route, a notFound() thrown by a loader (a stranger's project, /admin for a
  // non-admin) and an uncaught error all render in the product's own look.
  // UI-31: a link's page starts loading when the pointer rests on it, so on a slow connection the click finds it
  // half-way there.
  return createRouter({ routeTree, scrollRestoration: true, defaultPreload: 'intent', defaultNotFoundComponent: NotFound, defaultErrorComponent: ErrorPage })
}
