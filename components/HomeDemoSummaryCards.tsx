"use client";

import { useState } from "react";
import { PiggyBank, TrendingUp } from "lucide-react";
import { SummaryCardRow } from "@/components/SummaryCardRow";

/**
 * Mini-démo des lignes type dashboard (Total placements) pour la page d'accueil.
 * Affiche PEA, Épargne et une ligne dépliable "Actions" pour montrer l’interaction.
 */
export function HomeDemoSummaryCards() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mx-auto max-w-md space-y-2">
      <SummaryCardRow
        icon={<TrendingUp className="size-5" />}
        title="PEA"
        subtitle="3 lignes"
        value="2 450,00 €"
        percentage="62 %"
        href="/register"
      />
      <SummaryCardRow
        icon={<TrendingUp className="size-5" />}
        title="Actions"
        subtitle="2 lignes"
        value="1 800,00 €"
        percentage="45 %"
        href="/register"
        expandable
        expanded={expanded}
        onToggleExpand={() => setExpanded((prev) => !prev)}
        expandAriaLabel={
          expanded ? "Masquer le détail" : "Afficher le détail"
        }
      >
        <ul className="space-y-1 text-sm">
          <li className="flex justify-between gap-2 py-1">
            <span className="text-muted-foreground">Exemple Action A</span>
            <span className="font-medium tabular-nums text-foreground">
              1 200,00 €
            </span>
          </li>
          <li className="flex justify-between gap-2 py-1">
            <span className="text-muted-foreground">Exemple Action B</span>
            <span className="font-medium tabular-nums text-foreground">
              600,00 €
            </span>
          </li>
        </ul>
      </SummaryCardRow>
      <SummaryCardRow
        icon={<PiggyBank className="size-5" />}
        title="Épargne"
        subtitle="2 comptes"
        value="1 500,00 €"
        percentage="38 %"
        href="/register"
      />
    </div>
  );
}
