import { createClient } from "@/lib/supabaseServer";
import { stripe } from "@/lib/stripe";
import { getPlanById } from "@/lib/subscriptionPlans";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { planId } = await request.json();

    const plan = getPlanById(planId);
    
    if (!plan) {
      return NextResponse.json({ error: "Plan invalide" }, { status: 400 });
    }

    if (!plan.priceId) {
      return NextResponse.json({ error: "Prix Stripe manquant pour ce plan" }, { status: 500 });
    }

    // URL de base pour les redirections
    const baseUrl = process.env.SITE_URL || 
                    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
                    'http://localhost:3001');

    // Créer une session de paiement Stripe
    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      line_items: [
        {
          price: plan.priceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${baseUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/abonnement`,
      metadata: {
        userId: user.id,
        planId: plan.id,
        duration: plan.duration.toString(),
      },
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error("Erreur Stripe:", error);
    return NextResponse.json({ 
      error: "Erreur lors de la création de la session de paiement",
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}
