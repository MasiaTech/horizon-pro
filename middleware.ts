/**
 * Middleware Next.js : protection des routes et rafraîchissement de la session Supabase.
 * - /dashboard exige une session valide (sinon → /login)
 * - /login et /register redirigent vers /dashboard si déjà connecté
 */

import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabaseMiddleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
