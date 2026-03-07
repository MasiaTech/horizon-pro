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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronsUpDown, LayoutDashboard, Wallet, CreditCard, PiggyBank, TrendingUp, Calculator } from "lucide-react";
import { useProfileContext } from "@/components/ProfileProvider";
import { getExpenseAmount, getIncomeAmount } from "@/lib/types";

type User = {
  id: string;
  email?: string;
  user_metadata?: { full_name?: string; name?: string };
};

const linkClass = (active: boolean) =>
  `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    active ? "bg-card text-primary" : "text-muted-foreground hover:bg-muted/40 hover:text-primary/70"
  }`;

/**
 * Contenu commun de la sidebar (menu + profil), réutilisé dans la sidebar desktop et le Sheet mobile.
 */
function DashboardSidebarContent({ onLinkClick }: { onLinkClick?: () => void }) {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [skeletonMinElapsed, setSkeletonMinElapsed] = useState(false);
  const { loading, incomeSources, expenseCategories, incomeGroupNames } = useProfileContext();
  const totalIncome = incomeSources.reduce((sum, s) => sum + getIncomeAmount(s), 0);
  const totalExpenses = expenseCategories.reduce(
    (sum, c) => sum + getExpenseAmount(c, totalIncome, incomeSources, incomeGroupNames),
    0,
  );
  const resteAInvestir = totalIncome - totalExpenses;
  const showEpargne =
    !loading &&
    totalIncome > 0 &&
    totalExpenses > 0 &&
    resteAInvestir > 0;
  const showSimulateurImpot = incomeSources.some((s) => s.taxIndexed === true);

  // Afficher les skeletons au moins 800 ms après le montage (visible quand on ouvre le menu mobile après chargement)
  useEffect(() => {
    const t = setTimeout(() => setSkeletonMinElapsed(true), 800);
    return () => clearTimeout(t);
  }, []);

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

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "Profil";

  return (
    <>
      <div className="flex h-14 shrink-0 items-center gap-2 px-4">
        <Logo size={32} href="/" />
        <span className="font-semibold tracking-tight">Horizon</span>
      </div>
      <nav className="flex-1 space-y-1 overflow-auto px-2 pb-2 pt-4 sm:pt-6">
        <Link href="/dashboard" className={linkClass(pathname === "/dashboard")} onClick={onLinkClick}>
          <LayoutDashboard className="size-4 shrink-0" />
          <span>Dashboard</span>
        </Link>
        <Link href="/dashboard/revenus" className={linkClass(pathname === "/dashboard/revenus")} onClick={onLinkClick}>
          <Wallet className="size-4 shrink-0" />
          <span>Revenus</span>
        </Link>
        {loading || !skeletonMinElapsed ? (
          <>
            {["Dépenses", "Simulateur impôt", "Épargne", "PEA"].map((label) => (
              <div key={label} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm">
                <Skeleton className="size-4 shrink-0 rounded bg-muted" />
                <Skeleton className="h-4 w-24 shrink-0 rounded bg-muted" />
              </div>
            ))}
          </>
        ) : (
          <>
            {totalIncome > 0 && (
              <Link href="/dashboard/depenses" className={linkClass(pathname === "/dashboard/depenses")} onClick={onLinkClick}>
                <CreditCard className="size-4 shrink-0" />
                <span>Dépenses</span>
              </Link>
            )}
            {showSimulateurImpot && (
              <Link href="/dashboard/simulateur-impot" className={linkClass(pathname === "/dashboard/simulateur-impot")} onClick={onLinkClick}>
                <Calculator className="size-4 shrink-0" />
                <span>Simulateur impôt</span>
              </Link>
            )}
            {showEpargne && (
              <>
                <Link href="/dashboard/epargne" className={linkClass(pathname === "/dashboard/epargne")} onClick={onLinkClick}>
                  <PiggyBank className="size-4 shrink-0" />
                  <span>Épargne</span>
                </Link>
                <Link href="/dashboard/pea" className={linkClass(pathname === "/dashboard/pea")} onClick={onLinkClick}>
                  <TrendingUp className="size-4 shrink-0" />
                  <span>PEA</span>
                </Link>
              </>
            )}
          </>
        )}
      </nav>
      <div className="p-2">
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
          <DropdownMenuContent align="start" side="top" className="w-56 border-0 bg-card shadow-sm">
            <DropdownMenuItem asChild>
              <Link href="/dashboard/parametres" className="cursor-pointer" onClick={onLinkClick}>
                Paramètres
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/20" />
            <DropdownMenuItem
              onClick={handleLogout}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}

/**
 * Sidebar desktop : visible uniquement à partir de lg. Sur mobile, le menu est dans un Sheet (voir layout).
 */
export default function DashboardSidebar() {
  return (
    <aside className="hidden h-[100dvh] w-56 shrink-0 flex-col bg-transparent lg:flex lg:h-screen">
      <DashboardSidebarContent />
    </aside>
  );
}

export { DashboardSidebarContent };
