"use client";

import { useState, useEffect } from "react";
import { Check, Sparkles, CreditCard, TrendingUp, LogOut } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { SUBSCRIPTION_PLANS } from "@/lib/subscriptionPlans";
import { createClient } from "@/lib/supabaseClient";

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

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleSubscribe = async (planId: string) => {
    setSelectedPlan(planId);
    setLoading(true);

    try {
      // Vérifier si l'utilisateur a déjà un abonnement actif
      const statusResponse = await fetch("/api/subscription/status");
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        if (statusData.isActive) {
          // L'utilisateur a déjà un abonnement actif, rediriger vers le dashboard
          router.push("/dashboard");
          return;
        }
      }

      // Si pas d'abonnement actif, procéder au paiement
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

  // Afficher un skeleton pendant la vérification
  if (checking) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-background via-background to-horizon-primary/5 p-4 sm:p-6">
        <div className="mx-auto max-w-6xl">
          {/* Skeleton bouton de déconnexion */}
          <div className="mb-8 flex justify-end">
            <div className="h-9 w-36 bg-muted/20 rounded-md animate-pulse" />
          </div>

          <div className="mb-12 text-center space-y-4">
            <div className="mx-auto h-8 w-64 bg-muted/20 rounded-full animate-pulse" />
            <div className="mx-auto h-12 w-96 bg-muted/20 rounded-lg animate-pulse" />
            <div className="mx-auto h-6 w-full max-w-2xl bg-muted/20 rounded-lg animate-pulse" />
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            {[1, 2].map((i) => (
              <Card
                key={i}
                className="relative overflow-hidden border-border"
              >
                <CardHeader className="pb-6 pt-8">
                  <div className="space-y-4">
                    <div className="h-8 w-32 bg-muted/20 rounded animate-pulse" />
                    <div className="h-4 w-48 bg-muted/20 rounded animate-pulse" />
                    
                    <div className="mt-6 space-y-2">
                      <div className="h-16 w-40 bg-muted/20 rounded animate-pulse" />
                      <div className="h-4 w-36 bg-muted/20 rounded animate-pulse" />
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  <div className="h-14 w-full bg-muted/20 rounded-lg animate-pulse" />
                  
                  <div className="space-y-3 border-t border-border pt-6">
                    <div className="h-4 w-48 bg-muted/20 rounded animate-pulse" />
                    <div className="space-y-3">
                      {[1, 2, 3, 4, 5].map((j) => (
                        <div key={j} className="flex items-start gap-3">
                          <div className="mt-0.5 h-5 w-5 bg-muted/20 rounded-full animate-pulse" />
                          <div className="h-4 flex-1 bg-muted/20 rounded animate-pulse" />
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-12 space-y-4">
            <div className="mx-auto h-16 max-w-2xl bg-muted/20 rounded-lg animate-pulse" />
            <div className="mx-auto h-4 w-64 bg-muted/20 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-background via-background to-horizon-primary/5 p-4 sm:p-6">
      <div className="mx-auto max-w-6xl">
        {/* Header avec bouton de déconnexion */}
        <div className="mb-8 flex justify-end">
          <Button
            onClick={handleLogout}
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Se déconnecter
          </Button>
        </div>

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
          {SUBSCRIPTION_PLANS.map((plan) => {
            const pricePerMonth = plan.duration > 0 ? plan.price / (plan.duration / 30) : 0;
            
            return (
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
                    {plan.badge || "Recommandé"}
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
                        {pricePerMonth.toLocaleString("fr-FR", {
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
                      <li className="flex items-start gap-3">
                        <Check
                          className={`mt-0.5 h-5 w-5 shrink-0 ${
                            plan.popular
                              ? "text-horizon-primary"
                              : "text-muted-foreground"
                          }`}
                        />
                        <span className="text-sm text-foreground">
                          Accès complet à tous les outils
                        </span>
                      </li>
                      <li className="flex items-start gap-3">
                        <Check
                          className={`mt-0.5 h-5 w-5 shrink-0 ${
                            plan.popular
                              ? "text-horizon-primary"
                              : "text-muted-foreground"
                          }`}
                        />
                        <span className="text-sm text-foreground">
                          Gestion des revenus et dépenses
                        </span>
                      </li>
                      <li className="flex items-start gap-3">
                        <Check
                          className={`mt-0.5 h-5 w-5 shrink-0 ${
                            plan.popular
                              ? "text-horizon-primary"
                              : "text-muted-foreground"
                          }`}
                        />
                        <span className="text-sm text-foreground">
                          Suivi PEA et épargne
                        </span>
                      </li>
                      <li className="flex items-start gap-3">
                        <Check
                          className={`mt-0.5 h-5 w-5 shrink-0 ${
                            plan.popular
                              ? "text-horizon-primary"
                              : "text-muted-foreground"
                          }`}
                        />
                        <span className="text-sm text-foreground">
                          Simulateur d&apos;impôts
                        </span>
                      </li>
                      <li className="flex items-start gap-3">
                        <Check
                          className={`mt-0.5 h-5 w-5 shrink-0 ${
                            plan.popular
                              ? "text-horizon-primary"
                              : "text-muted-foreground"
                          }`}
                        />
                        <span className="text-sm text-foreground">
                          Mises à jour illimitées
                        </span>
                      </li>
                      {plan.popular && (
                        <li className="flex items-start gap-3">
                          <Check className="mt-0.5 h-5 w-5 shrink-0 text-horizon-primary" />
                          <span className="text-sm font-semibold text-horizon-primary">
                            Économisez 66% par rapport au mensuel
                          </span>
                        </li>
                      )}
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
            );
          })}
        </div>

        <div className="mt-12 space-y-4 text-center">
          <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-4 max-w-2xl mx-auto">
            <p className="text-sm font-medium text-green-500">
              ✅ Pas de renouvellement automatique
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Votre abonnement ne se renouvelle pas automatiquement. Vous devez créditer manuellement pour prolonger l&apos;accès. Aucune surprise sur votre carte bancaire !
            </p>
          </div>
          
          <p className="text-sm text-muted-foreground">
            💳 Paiement sécurisé • 🔒 Vos données sont protégées
          </p>
        </div>
      </div>
    </div>
  );
}
