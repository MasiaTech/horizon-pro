/**
 * Barème progressif de l'impôt sur le revenu.
 * Données chargées depuis resources/impot-bareme.json pour pouvoir
 * mettre à jour les tranches sans toucher au code (changement gouvernemental).
 */

import baremeJson from "@/resources/impot-bareme.json";

export interface TaxBracket {
  /** Seuil min de la tranche (€) */
  min: number;
  /** Seuil max de la tranche (€), null = pas de plafond */
  max: number | null;
  /** Taux d'imposition de la tranche (0-100) */
  ratePercent: number;
  /** Libellé court pour l'affichage */
  label: string;
}

interface BaremeJson {
  annee: number;
  label: string;
  tranches: {
    min: number;
    max: number | null;
    taux: number;
    label: string;
  }[];
}

function normalizeBrackets(data: BaremeJson): TaxBracket[] {
  return data.tranches.map((t) => ({
    min: t.min,
    max: t.max,
    ratePercent: t.taux,
    label: t.label,
  }));
}

/** Barème chargé depuis resources/impot-bareme.json (une part). */
const TAX_BRACKETS: TaxBracket[] = normalizeBrackets(
  baremeJson as BaremeJson,
);

/** Année et libellé du barème (pour l’affichage). */
export const BAREME_META = {
  annee: (baremeJson as BaremeJson).annee,
  label: (baremeJson as BaremeJson).label,
};

/** Tranches du barème en vigueur (lecture seule). */
export function getTaxBrackets(): TaxBracket[] {
  return TAX_BRACKETS;
}

export interface TaxResult {
  /** Revenu annuel imposable pris en compte (€) */
  annualIncome: number;
  /** Impôt total calculé (€) */
  totalTax: number;
  /** Indice de la tranche dans laquelle se situe le revenu (0-based) */
  bracketIndex: number;
  /** Tranche concernée */
  bracket: TaxBracket;
}

/**
 * Calcule l'impôt sur le revenu selon le barème progressif (une part).
 * Chaque tranche est imposée uniquement sur la part du revenu qui la concerne.
 */
export function computeIncomeTax(annualIncome: number): TaxResult {
  const brackets = TAX_BRACKETS;
  let totalTax = 0;
  let remaining = Math.max(0, annualIncome);
  let bracketIndex = 0;
  let prevMax = 0;

  for (let i = 0; i < brackets.length; i++) {
    const b = brackets[i];
    const bracketWidth =
      b.max == null ? Infinity : Math.max(0, b.max - prevMax);
    prevMax = b.max ?? prevMax;
    const amountInBracket = Math.min(remaining, bracketWidth);
    totalTax += amountInBracket * (b.ratePercent / 100);
    remaining -= amountInBracket;
    if (remaining <= 0) {
      bracketIndex = i;
      break;
    }
    bracketIndex = i;
  }

  return {
    annualIncome,
    totalTax: Math.round(totalTax * 100) / 100,
    bracketIndex,
    bracket: brackets[bracketIndex],
  };
}

/** Détail du calcul par tranche (pour affichage). */
export interface TaxBreakdownRow {
  bracket: TaxBracket;
  amountInBracket: number;
  taxInBracket: number;
}

export function getTaxBreakdown(annualIncome: number): TaxBreakdownRow[] {
  const brackets = TAX_BRACKETS;
  const rows: TaxBreakdownRow[] = [];
  let remaining = Math.max(0, annualIncome);
  let prevMax = 0;

  for (const b of brackets) {
    const bracketWidth =
      b.max == null ? Infinity : Math.max(0, b.max - prevMax);
    prevMax = b.max ?? prevMax;
    const amountInBracket = Math.min(remaining, bracketWidth);
    if (amountInBracket <= 0) break;
    const taxInBracket = Math.round(
      amountInBracket * (b.ratePercent / 100) * 100,
    ) / 100;
    rows.push({ bracket: b, amountInBracket, taxInBracket });
    remaining -= amountInBracket;
    if (remaining <= 0) break;
  }
  return rows;
}

/**
 * Plage de revenus pour le graphique : palier avant, actuel, palier au-dessus.
 */
export function getChartRange(bracketIndex: number): {
  minIncome: number;
  maxIncome: number;
} {
  const brackets = TAX_BRACKETS;
  const n = brackets.length;
  const minIncome =
    bracketIndex >= 1 ? brackets[bracketIndex - 1].min : 0;
  const maxIncome =
    bracketIndex < n - 1 && brackets[bracketIndex + 1].max != null
      ? brackets[bracketIndex + 1].max!
      : bracketIndex < n - 1
        ? (brackets[bracketIndex].max ?? 200_000)
        : (brackets[bracketIndex].max ?? brackets[bracketIndex].min + 80_000);
  return { minIncome, maxIncome };
}

const CHART_STEP = 10;

/**
 * Infos pour l’optimisation : proximité des seuils et gains possibles.
 */
export interface OptimizationHint {
  /** € restants avant de passer au palier au-dessus (undefined si dernier palier) */
  eurosToNextBracket: number | undefined;
  /** Palier au-dessus (pour le message) */
  nextBracketLabel: string | undefined;
  nextBracketRatePercent: number | undefined;
  /** € au-dessus du seuil du palier actuel (0 si on est en dessous du min) */
  eurosAboveCurrentThreshold: number | undefined;
  /** Si on était juste en dessous du seuil, gain net (économie d’impôt) en € */
  netGainIfJustBelowThreshold: number | undefined;
  /** Taux du palier en dessous (pour le message « X % au lieu de Y % ») */
  prevBracketRatePercent: number | undefined;
  /** Taux marginal du palier au-dessus (pour « 1 € brut = X € net ») */
  marginalNetPerEuro: number | undefined;
  /** Seuil min du palier au-dessus (€) */
  nextBracketMin: number | undefined;
  /** Brut en plus minimum pour être dans le palier au-dessus sans avoir moins de net qu'actuellement (= 1 € si on est à 29 579) */
  minExtraGrossToNotLose: number | undefined;
}

export function getOptimizationHints(
  annualIncome: number,
  result: TaxResult,
): OptimizationHint {
  const brackets = TAX_BRACKETS;
  const idx = result.bracketIndex;
  const current = brackets[idx];
  const nextBracket =
    idx < brackets.length - 1 ? brackets[idx + 1] : null;

  const eurosToNextBracket =
    nextBracket != null
      ? Math.max(0, nextBracket.min - annualIncome)
      : undefined;
  const nextBracketLabel = nextBracket?.label;
  const nextBracketRatePercent = nextBracket?.ratePercent;

  const threshold = current.min;
  const eurosAboveCurrentThreshold =
    idx >= 1 && annualIncome >= threshold
      ? annualIncome - threshold + 1
      : undefined;
  let netGainIfJustBelowThreshold: number | undefined;
  if (
    eurosAboveCurrentThreshold != null &&
    eurosAboveCurrentThreshold > 0 &&
    threshold > 0
  ) {
    const incomeJustBelow = threshold - 1;
    const taxJustBelow = computeIncomeTax(incomeJustBelow).totalTax;
    netGainIfJustBelowThreshold = Math.round(
      (result.totalTax - taxJustBelow) * 100,
    ) / 100;
  } else {
    netGainIfJustBelowThreshold = undefined;
  }

  const marginalRate = nextBracket ? nextBracket.ratePercent / 100 : undefined;
  const marginalNetPerEuro =
    marginalRate != null ? 1 - marginalRate : undefined;
  const prevBracket =
    idx >= 1 ? brackets[idx - 1] : null;
  const prevBracketRatePercent = prevBracket?.ratePercent;

  const nextBracketMin = nextBracket?.min;
  const minExtraGrossToNotLose =
    nextBracketMin != null && annualIncome < nextBracketMin
      ? nextBracketMin - annualIncome
      : undefined;

  return {
    eurosToNextBracket,
    nextBracketLabel,
    nextBracketRatePercent,
    eurosAboveCurrentThreshold,
    netGainIfJustBelowThreshold,
    prevBracketRatePercent,
    marginalNetPerEuro,
    nextBracketMin,
    minExtraGrossToNotLose,
  };
}

/**
 * Calcule le supplément de brut minimum pour gagner au moins desiredNetGain € de net en plus.
 * Prend en compte tout le barème progressif (part dans la tranche actuelle + suivantes).
 */
export function getExtraGrossForNetGain(
  annualIncome: number,
  desiredNetGain: number,
): { extraGross: number; actualNetGain: number } {
  if (desiredNetGain <= 0) {
    return { extraGross: 0, actualNetGain: 0 };
  }
  const netCurrent = annualIncome - computeIncomeTax(annualIncome).totalTax;
  const minGross = Math.ceil(desiredNetGain);
  const maxGross = Math.ceil(desiredNetGain / 0.55) + 1000;
  let low = minGross;
  let high = maxGross;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    const taxNew = computeIncomeTax(annualIncome + mid).totalTax;
    const netNew = annualIncome + mid - taxNew;
    const actualNetGain = netNew - netCurrent;
    if (actualNetGain >= desiredNetGain) {
      high = mid;
    } else {
      low = mid + 1;
    }
  }
  const taxAtLow = computeIncomeTax(annualIncome + low).totalTax;
  const actualNetGain =
    annualIncome + low - taxAtLow - netCurrent;
  return { extraGross: low, actualNetGain: Math.round(actualNetGain * 100) / 100 };
}

/**
 * Données pour le graphique : impôt total par revenu, de 10 € en 10 €.
 */
export function getChartData(
  minIncome: number,
  maxIncome: number,
  step: number = CHART_STEP,
): { income: number; tax: number }[] {
  const points: { income: number; tax: number }[] = [];
  for (let income = minIncome; income <= maxIncome; income += step) {
    const { totalTax } = computeIncomeTax(income);
    points.push({ income, tax: Math.round(totalTax * 100) / 100 });
  }
  return points;
}
