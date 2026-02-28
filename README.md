# Financial Freedom Dashboard

Application SaaS minimaliste pour suivre ses indicateurs financiers (revenus, dépenses, épargne, investissement). Authentification et base de données via **Supabase**. Structure prête pour une future intégration Stripe.

## Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **shadcn/ui** (composants : Card, Input, Button, DropdownMenu — installés via le CLI)
- **Supabase** (auth + database)
- **@supabase/ssr** (session côté serveur/middleware)

## Prérequis

- Node.js 18+
- Compte [Supabase](https://supabase.com)

## Installation

```bash
npm install
```

## Configuration

1. Copier `.env.example` vers `.env`.
2. Dans le dashboard Supabase : **Settings > API** → récupérer l’URL et la clé **anon public**.
3. Renseigner dans `.env` :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Base de données Supabase

Exécuter le script SQL suivant **manuellement** dans le **SQL Editor** de Supabase :

```
supabase/migrations/001_create_profiles.sql
```

Cela crée la table `profiles` (avec RLS) et un trigger pour créer une ligne profil à l’inscription.

## Lancement

```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

## shadcn/ui

Les composants UI viennent de **shadcn/ui** et doivent être installés via le CLI (ne pas copier-coller le code à la main) :

```bash
# Ajouter un ou plusieurs composants
npx shadcn@latest add button
npx shadcn@latest add card input dropdown-menu
```

Composants actuellement utilisés dans le projet : `card`, `input`, `button`, `dropdown-menu`. Ils se trouvent dans `components/ui/`. Pour en ajouter d’autres (dialog, label, etc.), utiliser la commande ci-dessus.

## Structure

```
/app
  /login          # Connexion
  /register       # Inscription
  /dashboard      # Zone protégée (indicateurs + formulaire)
  layout.tsx
  page.tsx        # Accueil (liens login/register)
/components
  ui/             # Composants shadcn (installés via npx shadcn@latest add …)
  Logo.tsx
/lib
  supabaseClient.ts   # Client navigateur (Client Components)
  supabaseServer.ts   # Client serveur (Server Components, API)
  supabaseMiddleware.ts  # Session dans le middleware
  types.ts             # Types Profile
/middleware.ts         # Protection /dashboard, redirections auth
/supabase/migrations
  001_create_profiles.sql   # À exécuter à la main dans Supabase
```

## Comportement

- **/** : page d’accueil avec liens Connexion / Inscription.
- **/login** et **/register** : auth Supabase (email/mot de passe). Si déjà connecté → redirection vers `/dashboard`.
- **/dashboard** : protégé par le middleware ; si non connecté → redirection vers `/login?redirectTo=/dashboard`. Affichage et mise à jour de `monthly_income`, `monthly_expenses`, `savings_total`, `monthly_investment`.

## Stripe

Aucune intégration Stripe pour l’instant. Les variables d’environnement sont prévues dans `.env.example` pour plus tard.

## Scripts

- `npm run dev` : serveur de développement
- `npm run build` : build de production
- `npm run start` : serveur de production
- `npm run lint` : ESLint
