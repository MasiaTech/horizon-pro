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
import { Trash2 } from "lucide-react";

type User = {
  id: string;
  email?: string;
  user_metadata?: { full_name?: string; name?: string };
};

/**
 * Page Paramètres : infos personnelles et suppression du compte.
 * Prévue pour accueillir d’autres paramètres plus tard.
 */
export default function ParametresPage() {
  const [user, setUser] = useState<User | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

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
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Paramètres</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gérez vos informations et les options de votre compte.
        </p>
      </div>

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
              les données liées à votre compte (revenus, dépenses, épargne,
              PEA, etc.). Cette action est irréversible.
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
    </div>
  );
}
