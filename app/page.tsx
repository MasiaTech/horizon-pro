import Link from 'next/link'
import Logo from '@/components/Logo'
import { Button } from '@/components/ui/button'

/**
 * Page d'accueil : liens vers login / register pour les visiteurs.
 * Les utilisateurs connectés sont redirigés vers /dashboard par le middleware.
 */
export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <Logo size={120} />
      <h1 className="text-3xl font-bold tracking-tight">Horizon</h1>
      <p className="max-w-md text-center text-muted-foreground">
        Gérez vos revenus, dépenses et objectifs d&apos;épargne en un seul endroit.
      </p>
      <div className="flex gap-4">
        <Button asChild>
          <Link href="/login">Connexion</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/register">Inscription</Link>
        </Button>
      </div>
    </main>
  )
}
