import { createClient } from "@/lib/supabaseServer";
import { stripe } from "@/lib/stripe";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(request: NextRequest) {
  console.log("🔔 Webhook appelé !");
  
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  console.log("📝 Signature:", signature ? "présente" : "absente");

  if (!signature) {
    console.error("❌ Pas de signature Stripe");
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    console.log("🔑 Webhook secret:", webhookSecret ? "présent" : "absent");
    
    if (!webhookSecret) {
      throw new Error("STRIPE_WEBHOOK_SECRET manquant");
    }

    event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );
    
    console.log("✅ Événement vérifié:", event.type);
  } catch (err) {
    console.error("❌ Erreur de vérification du webhook:", err);
    return NextResponse.json({ 
      error: "Invalid signature",
      details: err instanceof Error ? err.message : 'Erreur inconnue'
    }, { status: 400 });
  }

  // Gérer l'événement
  console.log("🎯 Type d'événement:", event.type);
  
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const duration = session.metadata?.duration;

      console.log("💳 Paiement réussi pour l'utilisateur:", userId);
      console.log("⏱️ Durée:", duration, "jours");

      if (userId && duration) {
        const durationDays = parseInt(duration, 10);
        const now = new Date();
        const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

        try {
          const supabase = await createClient();
          const { error } = await supabase
            .from("profiles")
            .update({ 
              subscription_expires_at: expiresAt.toISOString() 
            })
            .eq("id", userId);

          if (error) {
            console.error("❌ Erreur lors de la mise à jour de l'abonnement:", error);
          } else {
            console.log("✅ Abonnement activé jusqu'au:", expiresAt.toISOString());
          }
        } catch (dbError) {
          console.error("❌ Erreur base de données:", dbError);
        }
      } else {
        console.error("❌ userId ou duration manquant dans les metadata");
      }
      break;
    }

    case "payment_intent.succeeded": {
      console.log("✅ PaymentIntent réussi");
      break;
    }

    case "payment_intent.payment_failed": {
      console.log("❌ Échec du paiement");
      break;
    }

    default:
      console.log("ℹ️ Événement non géré:", event.type);
  }

  return NextResponse.json({ received: true });
}
