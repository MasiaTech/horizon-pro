"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import Logo from "@/components/Logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, ChevronsUpDown, LayoutDashboard, Wallet, CreditCard, PiggyBank, TrendingUp, Trash2 } from "lucide-react";
import { useProfileContext } from "@/components/ProfileProvider";
import { getExpenseAmount, getIncomeAmount } from "@/lib/types";

type User = {
  id: string;
  email?: string;
  user_metadata?: { full_name?: string; name?: string };
};

/**
 * Sidebar type dashboard (shadcn-vue example) : logo + nom en haut, menu, profil en bas.
 */
export default function DashboardSidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { loading, incomeSources, expenseCategories } = useProfileContext();
  const totalIncome = incomeSources.reduce((sum, s) => sum + getIncomeAmount(s), 0);
  const totalExpenses = expenseCategories.reduce(
    (sum, c) => sum + getExpenseAmount(c, totalIncome, incomeSources),
    0,
  );
  const resteAInvestir = totalIncome - totalExpenses;
  const showEpargne =
    !loading &&
    totalIncome > 0 &&
    totalExpenses > 0 &&
    resteAInvestir > 0;

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

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

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
    "Profil";

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-border bg-card">
      {/* Haut : logo + nom de l'app */}
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
        <Logo size={32} href="/" />
        <span className="font-semibold tracking-tight">Horizon</span>
      </div>

      {/* Menu */}
      <nav className="flex-1 space-y-1 overflow-auto p-2">
        <Link
          href="/dashboard"
          className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            pathname === "/dashboard"
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
          }`}
        >
          <LayoutDashboard className="size-4 shrink-0" />
          <span>Dashboard</span>
        </Link>
        <Link
          href="/dashboard/revenus"
          className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            pathname === "/dashboard/revenus"
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
          }`}
        >
          <Wallet className="size-4 shrink-0" />
          <span>Revenus</span>
        </Link>
        <Link
          href="/dashboard/depenses"
          className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            pathname === "/dashboard/depenses"
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
          }`}
        >
          <CreditCard className="size-4 shrink-0" />
          <span>Dépenses</span>
        </Link>
        {showEpargne && (
          <>
            <Link
              href="/dashboard/epargne"
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                pathname === "/dashboard/epargne"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              }`}
            >
              <PiggyBank className="size-4 shrink-0" />
              <span>Épargne</span>
            </Link>
            <Link
              href="/dashboard/pea"
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                pathname === "/dashboard/pea"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              }`}
            >
              <TrendingUp className="size-4 shrink-0" />
              <span>PEA</span>
            </Link>
          </>
        )}
      </nav>

      {/* Bas : profil */}
      <div className="border-t border-border p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex w-full min-w-0 items-center gap-2 overflow-hidden rounded-md p-2 text-left transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background outline-none data-[state=open]:bg-accent data-[state=open]:text-accent-foreground"
              aria-haspopup="menu"
              aria-label="Menu profil"
            >
              <Avatar className="h-8 w-8 shrink-0 rounded-lg">
                <AvatarFallback className="rounded-lg bg-secondary text-xs font-normal">
                  {displayName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{displayName}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {user?.email ?? "—"}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 shrink-0 opacity-50" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" className="w-56">
            <DropdownMenuItem
              onClick={handleLogout}
              className="cursor-pointer focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Déconnexion
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setDeleteDialogOpen(true)}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Supprimer le compte
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

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
    </aside>
  );
}
