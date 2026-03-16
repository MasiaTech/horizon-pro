"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Loader2 } from "lucide-react";
import { SUBSCRIPTION_PLANS } from "@/lib/subscriptionPlans";

interface ManageSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManageSubscriptionDialog({
  open,
  onOpenChange,
}: ManageSubscriptionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const handleSubscribe = async (planId: string) => {
    setLoading(true);
    setSelectedPlan(planId);

    try {
      const response = await fetch("/api/subscription/activate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ planId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de l'activation");
      }

      // Rediriger vers Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Erreur:", error);
      alert("Une erreur est survenue. Veuillez réessayer.");
      setLoading(false);
      setSelectedPlan(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Prolonger votre abonnement</DialogTitle>
          <DialogDescription>
            Choisissez une offre pour ajouter du temps à votre abonnement
          </DialogDescription>
          <div className="mt-3 rounded-lg bg-green-500/10 border border-green-500/20 p-3">
            <p className="text-sm font-medium text-green-500">
              ✅ Pas de renouvellement automatique
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Les jours s&apos;ajoutent à votre abonnement actuel. Aucun prélèvement automatique.
            </p>
          </div>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-3 py-4">
          {SUBSCRIPTION_PLANS.map((plan) => (
            <Card
              key={plan.id}
              className={`relative cursor-pointer transition-all hover:shadow-lg flex flex-col ${
                plan.popular
                  ? "border-horizon-primary border-2 shadow-md"
                  : "border-border"
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-1 rounded-full text-sm font-semibold whitespace-nowrap">
                  {plan.badge}
                </div>
              )}

              <CardContent className="p-6 flex flex-col flex-1">
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-bold text-foreground">
                    {plan.name}
                  </h3>
                  {plan.description && (
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                  )}
                </div>

                <div className="text-center py-4">
                  <div className="text-4xl font-bold text-foreground">
                    {plan.price === 0 ? (
                      "Gratuit"
                    ) : (
                      <>
                        {plan.price.toFixed(2)}
                        <span className="text-xl text-muted-foreground">€</span>
                      </>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">
                    +{plan.duration} jours
                  </div>
                </div>

                {/* Spacer pour pousser le contenu en bas */}
                <div className="flex-1" />

                {/* Avantages en bas */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Accès complet pendant {plan.duration} jours</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Mises à jour incluses</span>
                  </div>
                </div>

                {/* Bouton tout en bas */}
                <Button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={loading}
                  className={`w-full ${
                    plan.popular
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                      : ""
                  }`}
                >
                  {loading && selectedPlan === plan.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Chargement...
                    </>
                  ) : (
                    `Ajouter ${plan.duration} jours`
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
