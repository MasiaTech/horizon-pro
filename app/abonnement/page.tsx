"use client";

import { useState, useEffect } from "react";
import { Check, Sparkles, CreditCard, TrendingUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  duration: number;
  pricePerMonth: number;
  popular: boolean;
  features: string[];
}

const PLANS: SubscriptionPlan[] = [
  {
    id: "yearly",
    name: "Annuel",
    price: 59.4,
    duration: 365,
    pricePerMonth: 4.95,
    popular: true,
    features: [
      "Accès complet à tous les outils",
      "Gestion des revenus et dépenses",
      "Suivi PEA et épargne",
      "Simulateur d'impôts",
      "Mises à jour illimitées",
      "Économisez 66% par rapport au mensuel",
    ],
  },
  {
    id: "monthly",
    name: "Mensuel",
    price: 15.99,
    duration: 30,
    pricePerMonth: 15.99,
    popular: false,
    features: [
      "Accès complet à tous les outils",
      "Gestion des revenus et dépenses",
      "Suivi PEA et épargne",
      "Simulateur d'impôts",
      "Mises à jour illimitées",
    ],
  },
];

export default function AbonnementPage() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  // Vérifier si l'utilisateur a déjà un abonnement actif
  useEffect(() => {
    const checkSubscription = async () => {
      try {
        const response = await fetch("/api/subscription/status");
        if (response.ok) {
          const data = await response.json();
          if (data.isActive) {
            // Rediriger vers le dashboard si l'abonnement est actif
            router.push("/dashboard");
            return;
          }
        }
      } catch (error) {
        console.error("Erreur lors de la vérification de l'abonnement:", error);
      } finally {
        setChecking(false);
      }
    };

    checkSubscription();
  }, [router]);

  const handleSubscribe = async (planId: string) => {
    setSelectedPlan(planId);
    setLoading(true);

    try {
      const response = await fetch("/api/subscription/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });

      if (response.ok) {
        const { url } = await response.json();
        
        if (url) {
          // Rediriger vers Stripe Checkout
          window.location.href = url;
        } else {
          console.error("URL de paiement manquante");
          setLoading(false);
          setSelectedPlan(null);
        }
      } else {
        const error = await response.json();
        console.error("Erreur lors de la création de la session:", error);
        setLoading(false);
        setSelectedPlan(null);
      }
    } catch (error) {
      console.error("Erreur:", error);
      setLoading(false);
      setSelectedPlan(null);
    }
  };

  // Afficher un loader pendant la vérification
  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-horizon-primary/5">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-horizon-primary border-r-transparent"></div>
          <p className="text-sm text-muted-foreground">Vérification de votre abonnement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-background via-background to-horizon-primary/5 p-4 sm:p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-horizon-primary/10 px-4 py-2 text-sm font-medium text-horizon-primary">
            <Sparkles className="h-4 w-4" />
            Choisissez votre abonnement
          </div>
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Continuez votre parcours vers l&apos;indépendance financière
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Sélectionnez la formule qui vous correspond pour débloquer tous les
            outils d&apos;Horizon et prendre le contrôle de vos finances.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {PLANS.map((plan) => (
            <Card
              key={plan.id}
              className={`relative overflow-hidden transition-all duration-300 hover:scale-[1.02] ${
                plan.popular
                  ? "border-2 border-horizon-primary shadow-xl shadow-horizon-primary/20"
                  : "border-border"
              }`}
            >
              {plan.popular && (
                <div className="absolute right-4 top-4 rounded-full bg-horizon-primary px-3 py-1 text-xs font-semibold text-white shadow-lg">
                  Recommandé
                </div>
              )}

              <CardHeader className="pb-6 pt-8">
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription className="text-base">
                  {plan.duration === 365
                    ? "Engagement 1 an"
                    : "Sans engagement"}
                </CardDescription>

                <div className="mt-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold tabular-nums text-white">
                      {plan.price.toLocaleString("fr-FR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                    <span className="text-xl text-muted-foreground">€</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <span>
                      Soit{" "}
                      {plan.pricePerMonth.toLocaleString("fr-FR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      € / mois
                    </span>
                    {plan.popular && (
                      <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-semibold text-green-500">
                        -66%
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                <Button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={loading}
                  className={`w-full py-6 text-base font-semibold transition-all ${
                    plan.popular
                      ? "bg-horizon-primary text-white hover:bg-horizon-primary-hover shadow-lg shadow-horizon-primary/30"
                      : "bg-muted text-foreground hover:bg-muted/80"
                  }`}
                >
                  {loading && selectedPlan === plan.id ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Activation...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Choisir {plan.name}
                    </span>
                  )}
                </Button>

                <div className="space-y-3 border-t border-border pt-6">
                  <p className="text-sm font-medium text-muted-foreground">
                    Tout ce dont vous avez besoin :
                  </p>
                  <ul className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <Check
                          className={`mt-0.5 h-5 w-5 shrink-0 ${
                            plan.popular
                              ? "text-horizon-primary"
                              : "text-muted-foreground"
                          }`}
                        />
                        <span className="text-sm text-foreground">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {plan.popular && (
                  <div className="rounded-lg bg-horizon-primary/5 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-horizon-primary/20">
                        <TrendingUp className="h-5 w-5 text-horizon-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-horizon-primary">
                          Meilleure valeur !
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Économisez 131,88 € par an
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            💳 Paiement sécurisé • 🔒 Annulation possible à tout moment
          </p>
          
          {/* Lien de test pour la production */}
          <div className="mt-6">
            <button
              onClick={() => handleSubscribe("test")}
              disabled={loading}
              className="text-xs text-muted-foreground hover:text-horizon-primary underline transition-colors"
            >
              {loading && selectedPlan === "test" ? "Activation test..." : "🧪 Mode test (7 jours gratuit)"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
