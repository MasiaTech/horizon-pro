"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2, Calendar, CreditCard } from "lucide-react";
import { ManageSubscriptionDialog } from "@/components/ManageSubscriptionDialog";

type User = {
  id: string;
  email?: string;
  user_metadata?: { full_name?: string; name?: string };
};

type SubscriptionStatus = {
  isActive: boolean;
  expiresAt: string | null;
  daysRemaining: number;
};

/**
 * Page Paramètres : infos personnelles et suppression du compte.
 * Prévue pour accueillir d’autres paramètres plus tard.
 */
export default function ParametresPage() {
  const [user, setUser] = useState<User | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(
    null,
  );
  const [loadingSubscription, setLoadingSubscription] = useState(true);
  const [manageSubDialogOpen, setManageSubDialogOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (u)
        setUser({
          id: u.id,
          email: u.email ?? undefined,
          user_metadata: u.user_metadata,
        });
    });
  }, []);

  useEffect(() => {
    const fetchSubscriptionStatus = async () => {
      try {
        const response = await fetch("/api/subscription/status");
        if (response.ok) {
          const data = await response.json();
          setSubscription(data);
        }
      } catch (error) {
        console.error(
          "Erreur lors de la récupération du statut d'abonnement:",
          error,
        );
      } finally {
        setLoadingSubscription(false);
      }
    };

    fetchSubscriptionStatus();
  }, []);

  const handleConfirmDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data?.error ?? "Erreur lors de la suppression du compte.");
        return;
      }
      const supabase = createClient();
      await supabase.auth.signOut();
      window.location.href = "/";
    } finally {
      setDeleteLoading(false);
      setDeleteDialogOpen(false);
    }
  };

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "—";

  return (
    <div className="space-y-8 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Paramètres</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gérez vos informations et les options de votre compte.
        </p>
      </div>

      {/* Abonnement */}
      <Card>
        <CardHeader>
          <CardTitle>Abonnement</CardTitle>
          <CardDescription>Gérez votre abonnement Horizon.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingSubscription ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Chargement...
            </div>
          ) : subscription?.isActive ? (
            <>
              <div className="flex items-center gap-3 rounded-lg bg-green-500/10 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-500/20">
                  <CreditCard className="h-5 w-5 text-green-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-500">
                    Abonnement actif
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Votre abonnement est valide
                  </p>
                </div>
              </div>
              <div className="grid gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Expire le :</span>
                  <span className="font-medium">
                    {subscription.expiresAt
                      ? new Date(subscription.expiresAt).toLocaleDateString(
                          "fr-FR",
                          {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          },
                        )
                      : "—"}
                  </span>
                </div>
                {subscription.daysRemaining > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {subscription.daysRemaining} jour
                    {subscription.daysRemaining > 1 ? "s" : ""} restant
                    {subscription.daysRemaining > 1 ? "s" : ""}
                  </p>
                )}
                {subscription.daysRemaining <= 7 &&
                  subscription.daysRemaining > 0 && (
                    <div className="mt-2 rounded-lg bg-yellow-500/10 p-3 text-sm text-yellow-500">
                      ⚠️ Votre abonnement expire bientôt. Pensez à le renouveler
                      !
                    </div>
                  )}
              </div>
              <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3">
                <p className="text-xs text-muted-foreground">
                  💡 <span className="font-medium text-blue-500">Pas de renouvellement automatique.</span> Vous contrôlez vos dépenses en créditant manuellement votre compte quand vous le souhaitez.
                </p>
              </div>
              <Button
                onClick={() => setManageSubDialogOpen(true)}
                variant="outline"
                className="w-full sm:w-auto"
              >
                Gérer l&apos;abonnement
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 rounded-lg bg-destructive/10 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/20">
                  <CreditCard className="h-5 w-5 text-destructive" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-destructive">
                    Abonnement expiré
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Renouvelez votre abonnement pour continuer
                  </p>
                </div>
              </div>
              <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3">
                <p className="text-xs text-muted-foreground">
                  💡 <span className="font-medium text-blue-500">Pas de renouvellement automatique.</span> Rechargez votre compte quand vous le souhaitez, sans engagement.
                </p>
              </div>
              <Button
                onClick={() => setManageSubDialogOpen(true)}
                className="w-full sm:w-auto"
              >
                Renouveler l&apos;abonnement
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Informations personnelles */}
      <Card>
        <CardHeader>
          <CardTitle>Informations personnelles</CardTitle>
          <CardDescription>
            Votre email et nom associés à ce compte.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <span className="text-sm font-medium text-muted-foreground">
              Email
            </span>
            <p className="text-sm font-medium">{user?.email ?? "—"}</p>
          </div>
          <div className="grid gap-2">
            <span className="text-sm font-medium text-muted-foreground">
              Nom
            </span>
            <p className="text-sm font-medium">{displayName}</p>
          </div>
        </CardContent>
      </Card>

      {/* Zone dangereuse : suppression du compte */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Zone de danger</CardTitle>
          <CardDescription>
            La suppression du compte est définitive. Toutes vos données
            (revenus, dépenses, épargne, PEA) seront perdues.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="destructive"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="mr-2 size-4" />
            Supprimer mon compte
          </Button>
        </CardContent>
      </Card>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Supprimer le compte</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr ? Cette action va supprimer définitivement toutes
              les données liées à votre compte (revenus, dépenses, épargne, PEA,
              etc.). Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteLoading}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDeleteAccount}
              disabled={deleteLoading}
            >
              {deleteLoading ? "Suppression…" : "Supprimer le compte"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ManageSubscriptionDialog
        open={manageSubDialogOpen}
        onOpenChange={setManageSubDialogOpen}
      />
    </div>
  );
}
