// ADM-14: the Providers page. Admin only (a 404 for anyone else); switching a model reuses adminSetSetting.
import { createServerFn } from '@tanstack/react-start'
import { AdminController } from '@/app/Http/Controllers/AdminController'
import { requireAdmin } from './auth'

export const providerOverview = createServerFn({ method: 'GET' }).handler(async () => (await requireAdmin(), AdminController.providers()))
