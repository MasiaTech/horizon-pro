"use client";

import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";

export interface SummaryCardRowProps {
  /** Icône affichée dans le rond à gauche */
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  /** Montant ou valeur principale (ex. "3 458,00 €") */
  value: string;
  /** Pourcentage affiché sous la valeur (ex. "62 %") */
  percentage?: string;
  /** Lien : la zone principale devient un Link vers cette URL */
  href?: string;
  /** Affiche la flèche et permet d’ouvrir/fermer le détail */
  expandable?: boolean;
  /** État ouvert (quand expandable) */
  expanded?: boolean;
  /** Callback au clic sur la flèche (quand expandable) */
  onToggleExpand?: () => void;
  /** Label d’accessibilité du bouton flèche (ex. "Afficher le détail des actions") */
  expandAriaLabel?: string;
  /** Contenu affiché sous la ligne quand expandable et expanded */
  children?: React.ReactNode;
}

/**
 * Ligne type "sous-carte" : icône, titre, sous-titre, valeur et %.
 * Optionnel : lien (href), zone dépliable (expandable + expanded + onToggleExpand + children) avec transition.
 */
export function SummaryCardRow({
  icon,
  title,
  subtitle,
  value,
  percentage,
  href,
  expandable = false,
  expanded = false,
  onToggleExpand,
  expandAriaLabel,
  children,
}: SummaryCardRowProps) {
  const mainContent = (
    <>
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-foreground">{title}</p>
        {subtitle != null && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
      <div className="text-right">
        <p className="font-semibold tabular-nums text-foreground">{value}</p>
        {percentage != null && (
          <p className="text-xs tabular-nums text-muted-foreground">
            {percentage}
          </p>
        )}
      </div>
    </>
  );

  const rowContent = href ? (
    <Link
      href={href}
      className="flex min-w-0 flex-1 items-center gap-3"
    >
      {mainContent}
    </Link>
  ) : (
    <div className="flex min-w-0 flex-1 items-center gap-3">{mainContent}</div>
  );

  return (
    <div className="rounded-xl bg-muted/30 transition-colors hover:bg-muted/50">
      <div className="flex items-center gap-3 p-3">
        {rowContent}
        {expandable && onToggleExpand != null && (
          <button
            type="button"
            onClick={onToggleExpand}
            className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-expanded={expanded}
            aria-label={expandAriaLabel}
          >
            {expanded ? (
              <ChevronDown className="size-5" />
            ) : (
              <ChevronRight className="size-5" />
            )}
          </button>
        )}
      </div>
      {expandable && children != null && (
        <div
          className={`grid transition-[grid-template-rows] duration-300 ease-out ${
            expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="border-t border-border/50 px-3 pb-3 pt-2">
              {children}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
