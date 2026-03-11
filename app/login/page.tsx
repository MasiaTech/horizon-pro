import { Suspense } from "react";
import LoginForm from "./LoginForm";
import { AuthRightPanel } from "@/components/AuthRightPanel";

/**
 * Page de connexion : formulaire à gauche (40 %), panneau à droite (60 %).
 * Mobile : uniquement le formulaire en pleine largeur.
 */
export default function LoginPage() {
  return (
    <main className="grid min-h-[100dvh] sm:min-h-screen md:grid-cols-[40%_60%]">
      <section className="flex flex-col items-center justify-center px-4 py-10 sm:px-6 md:px-8 lg:px-12">
        <Suspense
          fallback={
            <div className="h-96 w-full max-w-md animate-pulse rounded-xl bg-card" />
          }
        >
          <LoginForm />
        </Suspense>
      </section>
      <AuthRightPanel />
    </main>
  );
}
