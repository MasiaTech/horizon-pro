/**
 * Types partagés pour le dashboard (table profiles Supabase).
 */

/** Type de montant pour une source de revenu (fixe ou fourchette min-max) */
export type IncomeAmountType = "fixed" | "range";

/** Une source de revenu (ex. Salaire, Freelance) */
export interface IncomeSource {
  name: string;
  /** Catégorie pour ranger (ex. Revenus perso, Revenus pro) */
  group?: string;
  /** Type : fixe ou fourchette (min-max) pour les revenus variables */
  type?: IncomeAmountType;
  /** Montant fixe en € (si type === 'fixed' ou ancien format) */
  amount?: number;
  /** Minimum en € (si type === 'range') */
  min?: number;
  /** Maximum en € (si type === 'range') */
  max?: number;
  /** Pourcentage à déduire du montant (ex. 25 pour URSSAF auto-entrepreneur), optionnel */
  deductionPercent?: number;
}

/** Calcule le montant effectif d'une source (brut puis moins déduction % si renseignée) */
export function getIncomeAmount(source: IncomeSource): number {
  let raw: number;
  if (source.type === "range") {
    const min = Number(source.min) || 0;
    const max = Number(source.max) || 0;
    raw = (min + max) / 2;
  } else {
    raw = Number(source.amount) || 0;
  }
  const pct = Number(source.deductionPercent) || 0;
  if (pct <= 0 || pct >= 100) return raw;
  return raw * (1 - pct / 100);
}

/** Normalise une source chargée (ancien format sans type → fixe avec amount) */
export function normalizeIncomeSource(
  raw: Record<string, unknown>,
): IncomeSource {
  const base = {
    name: String(raw.name ?? ""),
    group: raw.group != null ? String(raw.group) : undefined,
  };
  if (raw.type === "fixed" || raw.type === "range") {
    return {
      ...base,
      type: raw.type,
      amount: raw.amount != null ? Number(raw.amount) : 0,
      min: raw.min != null ? Number(raw.min) : undefined,
      max: raw.max != null ? Number(raw.max) : undefined,
      deductionPercent:
        raw.deductionPercent != null ? Number(raw.deductionPercent) : undefined,
    };
  }
  return {
    ...base,
    type: "fixed",
    amount: raw.amount != null ? Number(raw.amount) : 0,
    deductionPercent:
      raw.deductionPercent != null ? Number(raw.deductionPercent) : undefined,
  };
}

/** Type de montant pour une dépense */
export type ExpenseAmountType = "fixed" | "range" | "percentage";

/** Une catégorie de dépense (ex. Loyer, Nourriture) */
export interface ExpenseCategory {
  name: string;
  /** Catégorie pour ranger (ex. Dépenses perso, Dépenses pro) */
  group?: string;
  /** Type de montant : fixe, fourchette (min-max), ou % des revenus */
  type: ExpenseAmountType;
  /** Montant fixe en € (si type === 'fixed') */
  amount?: number;
  /** Minimum en € (si type === 'range') */
  min?: number;
  /** Maximum en € (si type === 'range') */
  max?: number;
  /** Pourcentage (ex. 20 pour 20%) (si type === 'percentage') */
  percentage?: number;
  /**
   * Base du pourcentage (si type === 'percentage').
   * - "total" ou non défini : total des revenus
   * - "category:NomCatégorie" : total de la catégorie de revenus
   * - "source:NomCatégorie|Libellé" : montant de la ligne de revenu
   */
  percentageOf?: string;
}

/** Retourne le montant de référence pour un % (total, catégorie ou ligne de revenu) */
export function getPercentageBaseAmount(
  percentageOf: string | undefined,
  incomeSources: IncomeSource[],
): number {
  if (!percentageOf || percentageOf === "total") {
    return incomeSources.reduce((s, i) => s + getIncomeAmount(i), 0);
  }
  if (percentageOf.startsWith("category:")) {
    const groupName = percentageOf.slice("category:".length);
    return incomeSources
      .filter((s) => (s.group ?? "") === groupName)
      .reduce((s, i) => s + getIncomeAmount(i), 0);
  }
  if (percentageOf.startsWith("source:")) {
    const rest = percentageOf.slice("source:".length);
    const sep = rest.indexOf("|");
    const groupName = sep >= 0 ? rest.slice(0, sep) : "";
    const sourceName = sep >= 0 ? rest.slice(sep + 1) : rest;
    const src = incomeSources.find(
      (s) => (s.group ?? "") === groupName && s.name === sourceName,
    );
    return src ? getIncomeAmount(src) : 0;
  }
  return incomeSources.reduce((s, i) => s + getIncomeAmount(i), 0);
}

/** Calcule le montant effectif d'une dépense selon son type. Pour type "percentage", base = totalIncome ou (si incomeSources fourni) base selon percentageOf. */
export function getExpenseAmount(
  cat: ExpenseCategory,
  totalIncome: number,
  incomeSources?: IncomeSource[],
): number {
  switch (cat.type) {
    case "fixed":
      return Number(cat.amount) || 0;
    case "range": {
      const min = Number(cat.min) || 0;
      const max = Number(cat.max) || 0;
      return (min + max) / 2;
    }
    case "percentage": {
      const base =
        incomeSources != null
          ? getPercentageBaseAmount(cat.percentageOf, incomeSources)
          : totalIncome;
      return (base * (Number(cat.percentage) || 0)) / 100;
    }
    default:
      return Number((cat as { amount?: number }).amount) || 0;
  }
}

/** Normalise une catégorie chargée (ancien format sans type → fixe, sans group) */
export function normalizeExpenseCategory(
  raw: Record<string, unknown>,
): ExpenseCategory {
  const base = {
    name: String(raw.name ?? ""),
    group: raw.group != null ? String(raw.group) : undefined,
  };
  if (
    raw.type === "fixed" ||
    raw.type === "range" ||
    raw.type === "percentage"
  ) {
    return {
      ...base,
      type: raw.type,
      amount: raw.amount != null ? Number(raw.amount) : 0,
      min: raw.min != null ? Number(raw.min) : undefined,
      max: raw.max != null ? Number(raw.max) : undefined,
      percentage: raw.percentage != null ? Number(raw.percentage) : undefined,
      percentageOf:
        raw.percentageOf != null ? String(raw.percentageOf) : undefined,
    };
  }
  return {
    ...base,
    type: "fixed",
    amount: raw.amount != null ? Number(raw.amount) : 0,
  };
}

/** Noms des catégories pour ranger les revenus (ex. Revenus perso, Revenus pro) */
export const DEFAULT_INCOME_GROUP_NAMES: string[] = [
  "Revenus perso",
  "Revenus pro",
];

/** Valeurs par défaut pour un nouveau profil */
export const DEFAULT_INCOME_SOURCES: IncomeSource[] = [
  { name: "Salaire", type: "fixed", amount: 0 },
];

/** Noms des catégories pour ranger les dépenses (ex. Dépenses perso, Dépenses pro) */
export const DEFAULT_EXPENSE_GROUP_NAMES: string[] = [
  "Dépenses perso",
  "Dépenses pro",
];

export const DEFAULT_EXPENSE_CATEGORIES: ExpenseCategory[] = [
  { name: "Loyer Logement", type: "fixed", amount: 0 },
  { name: "Nourriture", type: "fixed", amount: 0 },
  { name: "Transport", type: "fixed", amount: 0 },
  { name: "Assurance Logement", type: "fixed", amount: 0 },
  { name: "Facture EDF", type: "fixed", amount: 0 },
];

/** Répartition des placements (total doit faire 100 %) */
export interface PlacementAllocation {
  name: string;
  percentage: number;
}

export const DEFAULT_PLACEMENT_ALLOCATION: PlacementAllocation[] = [
  { name: "Épargne", percentage: 60 },
  { name: "PEA", percentage: 40 },
];

/** Fréquence de capitalisation des intérêts (selon la banque) */
export type InterestFrequency = "daily" | "weekly" | "monthly" | "annual";

/** Compte épargne (ex. Sécurité) avec taux annuel et solde actuel */
export interface SavingsAccount {
  name: string;
  /** Taux d'intérêt annuel en % (ex. 3.75) */
  ratePercent: number;
  /** Fréquence à laquelle les intérêts sont appliqués (par jour, semaine, mois ou an) */
  interestFrequency?: InterestFrequency;
  /** Part du versement mensuel Épargne allouée à ce compte (total des comptes = 100 %) */
  allocationPercent?: number;
  /** Solde actuel en € */
  currentBalance?: number;
  /** Objectif en € (optionnel ; pour Sécurité = 6 mois de dépenses) */
  goalAmount?: number;
}

export const DEFAULT_SAVINGS_ACCOUNTS: SavingsAccount[] = [
  {
    name: "Sécurité",
    ratePercent: 3.75,
    interestFrequency: "daily",
    allocationPercent: 100,
    currentBalance: 0,
  },
];

/** Une ligne Action ou ETF dans le PEA : nom, quantité, prix, option dividende, ROE */
export interface PEAHolding {
  name: string;
  /** Nombre de titres */
  quantity: number;
  /** Prix unitaire en € */
  price: number;
  /** Afficher / renseigner un taux de dividende annuel */
  dividendEnabled: boolean;
  /** Taux de dividende annuel en % (si dividendEnabled) */
  dividendPercentPerYear?: number;
  /** ROE en %/an : estimation de croissance (composition annuelle, ex. 20 % → 1000 € devient 1200 € puis 1440 €) */
  roePercent?: number;
}

/** Valeur d'une ligne (quantité × prix) */
export function getPEAHoldingValue(h: PEAHolding): number {
  return (Number(h.quantity) || 0) * (Number(h.price) || 0);
}

/** Normalise une ligne chargée depuis la DB */
export function normalizePEAHolding(raw: Record<string, unknown>): PEAHolding {
  return {
    name: String(raw.name ?? ""),
    quantity: Number(raw.quantity) || 0,
    price: Number(raw.price) || 0,
    dividendEnabled: Boolean(raw.dividendEnabled),
    dividendPercentPerYear:
      raw.dividendPercentPerYear != null
        ? Number(raw.dividendPercentPerYear)
        : undefined,
    roePercent:
      raw.roePercent != null ? Number(raw.roePercent) : undefined,
  };
}

export const DEFAULT_PEA_ACTIONS: PEAHolding[] = [];
export const DEFAULT_PEA_ETFS: PEAHolding[] = [];

export interface Profile {
  id: string;
  created_at: string;
  monthly_income: number | null;
  monthly_expenses: number | null;
  savings_total: number | null;
  monthly_investment: number | null;
  income_sources?: IncomeSource[];
  income_group_names?: string[];
  expense_categories?: ExpenseCategory[];
  expense_group_names?: string[];
  placement_allocation?: PlacementAllocation[];
  savings_accounts?: SavingsAccount[];
  /** Lignes Actions dans le PEA (solde = somme quantité × prix) */
  pea_actions?: PEAHolding[];
  /** Lignes ETF dans le PEA */
  pea_etfs?: PEAHolding[];
}

export interface ProfileUpdate {
  monthly_income?: number | null;
  monthly_expenses?: number | null;
  savings_total?: number | null;
  monthly_investment?: number | null;
  income_sources?: IncomeSource[];
  income_group_names?: string[];
  expense_categories?: ExpenseCategory[];
  expense_group_names?: string[];
  placement_allocation?: PlacementAllocation[];
  savings_accounts?: SavingsAccount[];
  pea_actions?: PEAHolding[];
  pea_etfs?: PEAHolding[];
}
