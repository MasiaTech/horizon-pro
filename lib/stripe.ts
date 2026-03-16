import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY manquante dans les variables d\'environnement');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia',
  typescript: true,
});

// Prix Stripe (à créer dans le Dashboard Stripe)
// Pour l'instant, on les définit ici, mais ils seront à remplacer par tes vrais Price IDs
export const STRIPE_PRICES = {
  yearly: process.env.STRIPE_PRICE_YEARLY || 'price_yearly_placeholder',
  monthly: process.env.STRIPE_PRICE_MONTHLY || 'price_monthly_placeholder',
  test: process.env.STRIPE_PRICE_TEST || 'price_test_placeholder',
};
