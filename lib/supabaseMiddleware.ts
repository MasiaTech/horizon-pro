/**
 * Client Supabase pour le middleware Next.js.
 * Version légère qui ne lève pas d'erreur si les cookies ne peuvent pas être écrits.
 */

import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

type CookieToSet = { name: string; value: string; options: CookieOptions }

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Routes protégées : redirection vers /login si non connecté
  if (
    request.nextUrl.pathname.startsWith('/dashboard') &&
    !user
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectTo', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // [ABONNEMENT - désactivé - app 100% gratuite - à réactiver plus tard]
  // Vérification de l'abonnement pour les utilisateurs connectés accédant au dashboard
  // if (user && request.nextUrl.pathname.startsWith('/dashboard')) {
  //   const { data: profile } = await supabase
  //     .from('profiles')
  //     .select('subscription_expires_at')
  //     .eq('id', user.id)
  //     .single()
  //   if (profile) {
  //     const expiresAt = profile.subscription_expires_at
  //     const now = new Date()
  //     const isExpired = !expiresAt || new Date(expiresAt) < now
  //     if (isExpired) {
  //       const url = request.nextUrl.clone()
  //       url.pathname = '/abonnement'
  //       return NextResponse.redirect(url)
  //     }
  //   }
  // }

  // Si connecté : rediriger /, /login et /register vers dashboard
  // [ABONNEMENT - désactivé : on envoie toujours vers /dashboard, jamais vers /abonnement]
  if (user) {
    const path = request.nextUrl.pathname
    if (path === '/' || path === '/login' || path === '/register') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
