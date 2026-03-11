import RegisterForm from "./RegisterForm";
import { AuthRightPanel } from "@/components/AuthRightPanel";

/**
 * Page d'inscription : même layout que login — formulaire à gauche (40 %), panneau à droite (60 %).
 * Mobile : uniquement le formulaire en pleine largeur.
 */
export default function RegisterPage() {
  return (
    <main className="grid min-h-[100dvh] sm:min-h-screen md:grid-cols-[40%_60%]">
      <section className="flex flex-col items-center justify-center px-4 py-10 sm:px-6 md:px-8 lg:px-12">
        <RegisterForm />
      </section>
      <AuthRightPanel />
    </main>
  );
}
