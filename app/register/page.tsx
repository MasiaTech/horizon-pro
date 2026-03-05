import RegisterForm from "./RegisterForm";

/**
 * Page d'inscription : email + mot de passe + confirmation via Supabase Auth.
 * Après succès : le formulaire affiche la card "Vérifiez votre email".
 */
export default function RegisterPage() {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center p-8 sm:min-h-screen">
      <RegisterForm />
    </main>
  );
}
