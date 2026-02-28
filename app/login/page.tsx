import { Suspense } from 'react'
import LoginForm from './LoginForm'

/**
 * Page de connexion : email + mot de passe via Supabase Auth.
 * Redirection vers /dashboard ou vers redirectTo après succès.
 * useSearchParams est utilisé dans LoginForm, d'où le Suspense.
 */
export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <Suspense fallback={<div className="h-96 w-full max-w-md animate-pulse rounded-xl bg-card" />}>
        <LoginForm />
      </Suspense>
    </main>
  )
}
