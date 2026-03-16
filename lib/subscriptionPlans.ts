/**
 * Configuration centralisée des offres d'abonnement
 */

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  duration: number; // en jours
  priceId: string | null; // Stripe Price ID (null pour test)
  badge?: string;
  description?: string;
  popular?: boolean;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "test",
    name: "Mode test (7 jours gratuit)",
    price: 0,
    duration: 7,
    priceId: process.env.STRIPE_PRICE_TEST || null,
    badge: "🧪 Test",
    description: "Pour tester l'application",
  },
  {
    id: "monthly_30",
    name: "30 jours",
    price: 15.99,
    duration: 30,
    priceId: process.env.STRIPE_PRICE_MONTHLY || null,
    description: "Accès pour 30 jours",
  },
  {
    id: "yearly",
    name: "1 an (365 jours)",
    price: 59.4,
    duration: 365,
    priceId: process.env.STRIPE_PRICE_YEARLY || null,
    badge: "⭐ Populaire",
    description: "Meilleur rapport qualité-prix",
    popular: true,
  },
];

/**
 * Récupère un plan par son ID
 */
export function getPlanById(planId: string): SubscriptionPlan | undefined {
  return SUBSCRIPTION_PLANS.find((plan) => plan.id === planId);
}

/**
 * Récupère le Stripe Price ID pour un plan
 */
export function getStripePriceId(planId: string): string | null {
  const plan = getPlanById(planId);
  return plan?.priceId || null;
}
