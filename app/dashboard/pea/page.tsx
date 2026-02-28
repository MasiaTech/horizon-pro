"use client";

import { useEffect, useRef, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useProfileContext } from "@/components/ProfileProvider";
import { updatePEAHolding } from "@/lib/useProfile";
import { useSortableSensors } from "@/lib/dnd-sensors";
import {
  getExpenseAmount,
  getIncomeAmount,
  getPEAHoldingValue,
  type PEAHolding,
} from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { GripVertical, Info, X } from "lucide-react";

const PEA_PLAFOND_EUR = 150_000;

const EMPTY_HOLDING: PEAHolding = {
  name: "",
  quantity: 0,
  price: 0,
  dividendEnabled: false,
};

/** Part du reste à investir allouée au PEA (depuis le dashboard), en €/mois */
function getMonthlyPEA(
  resteAInvestir: number,
  placementAllocation: { name: string; percentage: number }[],
): number {
  const pea = placementAllocation.find((p) => p.name.toUpperCase() === "PEA");
  if (!pea) return 0;
  return (resteAInvestir * (pea.percentage || 0)) / 100;
}

/**
 * Total des dividendes par an (€) pour toutes les lignes du portefeuille.
 */
function getTotalAnnualDividends(holdings: PEAHolding[]): number {
  return holdings.reduce((s, h) => s + getPEAHoldingAnnualDividend(h), 0);
}

/**
 * ROE moyen pondéré par la valeur des lignes qui ont un ROE > 0.
 * Les lignes sans ROE (0 ou vide) ne diluent pas la moyenne : on applique le taux
 * des positions "à croissance" à tout le solde (évite que l'ajout d'une action sans ROE
 * renseigné fasse augmenter le temps pour atteindre 150 k€).
 */
function getWeightedAverageROE(holdings: PEAHolding[]): number {
  let totalValueWithRoe = 0;
  let weightedSum = 0;
  for (const h of holdings) {
    const value = getPEAHoldingValue(h);
    const roe = h.roePercent ?? 0;
    if (value <= 0 || roe <= 0) continue;
    totalValueWithRoe += value;
    weightedSum += value * roe;
  }
  return totalValueWithRoe > 0 ? weightedSum / totalValueWithRoe : 0;
}

/** Prélèvements sociaux (17,2 %) : coefficient pour passer du brut au net. */
const PEA_NET_COEFFICIENT = 1 - 17.2 / 100; // 0.828

/**
 * Données mensuelles jusqu'au plafond 150 k€.
 * Chaque mois : solde = solde × (1 + ROE%/100)^(1/12) + versement + (dividendes/an ÷ 12).
 * netBalance = balance après prélèvements sociaux (17,2 %).
 */
function getPEAProjectionData(
  initialBalance: number,
  monthlyContribution: number,
  monthlyDividendEuro: number,
  plafond: number,
  extraMonthsAfterGoal: number,
  annualRoePercent: number,
): { month: number; balance: number; netBalance: number; label: string }[] {
  const data: {
    month: number;
    balance: number;
    netBalance: number;
    label: string;
  }[] = [
    {
      month: 0,
      balance: initialBalance,
      netBalance: initialBalance * PEA_NET_COEFFICIENT,
      label: "Aujourd'hui",
    },
  ];
  if (initialBalance >= plafond) {
    const netPlafond = plafond * PEA_NET_COEFFICIENT;
    for (let m = 1; m <= extraMonthsAfterGoal; m++) {
      data.push({
        month: m,
        balance: plafond,
        netBalance: netPlafond,
        label: `Mois ${m}`,
      });
    }
    return data;
  }
  const monthlyRoeFactor =
    annualRoePercent > 0 ? Math.pow(1 + annualRoePercent / 100, 1 / 12) : 1;
  const totalMonthly = monthlyContribution + monthlyDividendEuro;
  if (totalMonthly <= 0 && monthlyRoeFactor <= 1) {
    data.push({
      month: 12,
      balance: initialBalance,
      netBalance: initialBalance * PEA_NET_COEFFICIENT,
      label: "1 an",
    });
    return data;
  }
  let balance = initialBalance;
  let month = 1;
  const maxMonths = 600;
  while (balance < plafond && month <= maxMonths) {
    balance = balance * monthlyRoeFactor + totalMonthly;
    balance = Math.min(plafond, balance);
    data.push({
      month,
      balance,
      netBalance: balance * PEA_NET_COEFFICIENT,
      label: month === 0 ? "Aujourd'hui" : `Mois ${month}`,
    });
    if (balance >= plafond) break;
    month++;
  }
  for (let m = 1; m <= extraMonthsAfterGoal && month + m <= maxMonths; m++) {
    data.push({
      month: month + m,
      balance: plafond,
      netBalance: plafond * PEA_NET_COEFFICIENT,
      label: `Mois ${month + m}`,
    });
  }
  return data;
}

function getMonthPlafondReached(
  data: { month: number; balance: number }[],
  plafond: number,
): number | null {
  const row = data.find((d) => d.month > 0 && d.balance >= plafond);
  return row ? row.month : null;
}

function formatYearAxisLabel(month: number): string {
  if (month === 0) return "Aujourd'hui";
  if (month === 12) return "1 an";
  if (month % 12 === 0) return `${month / 12} ans`;
  const years = Math.floor(month / 12);
  const months = month % 12;
  if (years === 0) return `${months} mois`;
  return `${years} an${years > 1 ? "s" : ""} ${months} m`;
}

function isDraftEmpty(d: PEAHolding): boolean {
  return (
    d.name.trim() === "" && (d.quantity ?? 0) === 0 && (d.price ?? 0) === 0
  );
}

/** Montant des dividendes par an pour une ligne (valeur × taux % / 100). */
/** Montant dividendes/an pour une ligne. Vide ou 0 % = pas de dividende. */
function getPEAHoldingAnnualDividend(h: PEAHolding): number {
  if ((h.dividendPercentPerYear ?? 0) <= 0) return 0;
  return getPEAHoldingValue(h) * ((h.dividendPercentPerYear ?? 0) / 100);
}

/** Ligne déplaçable (drag handle + contenu) */
function SortableHoldingRow({
  h,
  index,
  setItems,
  onRequestRemove,
}: {
  h: PEAHolding;
  index: number;
  setItems: React.Dispatch<React.SetStateAction<PEAHolding[]>>;
  onRequestRemove: (index: number, label: string) => void;
}) {
  const id = `holding-${index}`;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <tr
      ref={setNodeRef}
      style={style}
      className="border-b border-border last:border-b-0 hover:bg-muted/30"
    >
      <td
        className="w-8 cursor-grab touch-none px-1 py-2 text-muted-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </td>
      <td className="px-4 py-2">
        <Input
          value={h.name}
          onChange={(e) =>
            updatePEAHolding(setItems, index, "name", e.target.value)
          }
          placeholder="Ex. TotalEnergies"
          className="h-9 min-w-[120px] border-0 bg-transparent shadow-none focus-visible:ring-1"
        />
      </td>
      <td className="px-4 py-2 text-right align-middle">
        <div className="flex justify-end">
          <NumberInput
            value={h.quantity}
            onChange={(n) =>
              updatePEAHolding(setItems, index, "quantity", n)
            }
            placeholder="0"
            className="h-9 w-20 border-0 bg-transparent text-right shadow-none focus-visible:ring-1"
          />
        </div>
      </td>
      <td className="px-4 py-2 text-right align-middle">
        <div className="flex justify-end">
          <NumberInput
            value={h.price}
            onChange={(n) => updatePEAHolding(setItems, index, "price", n)}
            placeholder="0"
            className="h-9 w-24 border-0 bg-transparent text-right shadow-none focus-visible:ring-1"
          />
        </div>
      </td>
      <td className="px-4 py-2 text-right align-middle">
        <div className="flex justify-end">
          <NumberInput
            value={h.dividendPercentPerYear ?? 0}
            onChange={(n) =>
              updatePEAHolding(setItems, index, "dividendPercentPerYear", n)
            }
            placeholder="0"
            className="h-9 w-16 border-0 bg-transparent text-right shadow-none focus-visible:ring-1"
          />
        </div>
      </td>
      <td className="px-4 py-2 text-right align-middle">
        <div className="flex justify-end">
          <NumberInput
            value={h.roePercent ?? 0}
            onChange={(n) =>
              updatePEAHolding(setItems, index, "roePercent", n)
            }
            placeholder="0"
            className="h-9 w-16 border-0 bg-transparent text-right shadow-none focus-visible:ring-1"
          />
        </div>
      </td>
      <td className="px-4 py-2 text-right align-middle text-muted-foreground">
        {getPEAHoldingValue(h).toLocaleString("fr-FR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}{" "}
        €
      </td>
      <td className="px-4 py-2 text-right align-middle text-muted-foreground">
        {(h.dividendPercentPerYear ?? 0) > 0
          ? getPEAHoldingAnnualDividend(h).toLocaleString("fr-FR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }) + " €"
          : "—"}
      </td>
      <td className="px-2 py-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() =>
            onRequestRemove(index, h.name || `Ligne ${index + 1}`)
          }
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
          title="Supprimer"
          aria-label="Supprimer"
        >
          <X className="h-4 w-4" />
        </Button>
      </td>
    </tr>
  );
}

/** Tableau des lignes (Actions ou ETF) avec ligne brouillon et suppression avec confirmation */
function HoldingsTable({
  title,
  items,
  setItems,
}: {
  title: string;
  items: PEAHolding[];
  setItems: React.Dispatch<React.SetStateAction<PEAHolding[]>>;
}) {
  const [draft, setDraft] = useState<PEAHolding>(EMPTY_HOLDING);
  const [confirmDelete, setConfirmDelete] = useState<{
    index: number;
    label: string;
  } | null>(null);

  const handleDraftChange = (
    field: keyof PEAHolding,
    value: string | number | boolean,
  ) => {
    setDraft((prev) => {
      const next = { ...prev };
      if (field === "name") next.name = String(value);
      else if (field === "quantity") next.quantity = Number(value) || 0;
      else if (field === "price") next.price = Number(value) || 0;
      else if (field === "dividendEnabled")
        next.dividendEnabled = Boolean(value);
      else if (field === "dividendPercentPerYear")
        next.dividendPercentPerYear =
          value === "" || value == null ? undefined : Number(value) || 0;
      else if (field === "roePercent")
        next.roePercent =
          value === "" || value == null ? undefined : Number(value) || 0;
      return next;
    });
  };

  const handleDraftBlur = () => {
    if (isDraftEmpty(draft)) return;
    setItems((prev) => [
      ...prev,
      { ...draft, name: draft.name.trim() || draft.name },
    ]);
    setDraft(EMPTY_HOLDING);
  };

  const removeAt = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
    setConfirmDelete(null);
  };

  const sensors = useSortableSensors();
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeStr = String(active.id);
    const overStr = String(over.id);
    if (!activeStr.startsWith("holding-") || !overStr.startsWith("holding-"))
      return;
    const oldIndex = parseInt(activeStr.replace("holding-", ""), 10);
    const newIndex = parseInt(overStr.replace("holding-", ""), 10);
    if (Number.isNaN(oldIndex) || Number.isNaN(newIndex)) return;
    setItems((prev) => arrayMove(prev, oldIndex, newIndex));
  };

  const rowIds = items.map((_, i) => `holding-${i}`);

  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            Nom, quantité, prix. Dividendes %/an : laisser vide si pas de
            dividende. ROE (%/an) : estimation de croissance (composition
            annuelle).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[640px] table-fixed text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="w-8 px-1 py-2" aria-hidden />
                  <th className="w-[30%] px-4 py-2 text-left font-medium">
                    Nom
                  </th>
                  <th className="w-[80px] px-4 py-2 text-right font-medium">
                    Quantité
                  </th>
                  <th className="w-[100px] px-4 py-2 text-right font-medium">
                    Prix (€)
                  </th>
                  <th className="w-[80px] px-4 py-2 text-right font-medium">
                    <span className="inline-flex items-center justify-end gap-1">
                      Dividendes %/an
                      <HoverCard openDelay={200} closeDelay={100}>
                        <HoverCardTrigger asChild>
                          <span
                            className="inline-flex text-muted-foreground hover:text-foreground"
                            aria-label="Explication Dividendes %/an"
                          >
                            <Info
                              className="h-3.5 w-3.5 shrink-0"
                              aria-hidden
                            />
                          </span>
                        </HoverCardTrigger>
                        <HoverCardContent
                          side="top"
                          align="center"
                          className="w-72 text-sm"
                        >
                          <p className="text-muted-foreground">
                            Taux de dividende annuel estimé en %. Si ce titre
                            verse des dividendes, indiquez le rendement annuel
                            (ex. 4 pour 4 %). Laisser vide ou 0 si pas de
                            dividende.
                          </p>
                        </HoverCardContent>
                      </HoverCard>
                    </span>
                  </th>
                  <th className="w-[80px] px-4 py-2 text-right font-medium">
                    <span className="inline-flex items-center justify-end gap-1">
                      ROE (%/an)
                      <HoverCard openDelay={200} closeDelay={100}>
                        <HoverCardTrigger asChild>
                          <span
                            className="inline-flex text-muted-foreground hover:text-foreground"
                            aria-label="Explication ROE"
                          >
                            <Info
                              className="h-3.5 w-3.5 shrink-0"
                              aria-hidden
                            />
                          </span>
                        </HoverCardTrigger>
                        <HoverCardContent
                          side="top"
                          align="center"
                          className="w-72 text-sm"
                        >
                          <p className="text-muted-foreground">
                            <strong className="text-foreground">
                              Return on Equity
                            </strong>{" "}
                            : taux de croissance annuel estimé de
                            l&apos;investissement (composition). Ex. 20 % : 1
                            000 € deviennent 1 200 € après 1 an, puis 1 440 €
                            après 2 ans.
                          </p>
                        </HoverCardContent>
                      </HoverCard>
                    </span>
                  </th>
                  <th className="w-[100px] px-4 py-2 text-right font-medium">
                    Valeur
                  </th>
                  <th className="w-[100px] px-4 py-2 text-right font-medium">
                    Dividendes/an (€)
                  </th>
                  <th className="w-10 px-2 py-2" aria-hidden />
                </tr>
              </thead>
              <tbody>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={rowIds}
                    strategy={verticalListSortingStrategy}
                  >
                    {items.map((h, index) => (
                      <SortableHoldingRow
                        key={`${h.name}-${index}`}
                        h={h}
                        index={index}
                        setItems={setItems}
                        onRequestRemove={(idx, label) =>
                          setConfirmDelete({ index: idx, label })
                        }
                      />
                    ))}
                  </SortableContext>
                </DndContext>
                <tr className="border-b border-border last:border-b-0 hover:bg-muted/30">
                  <td className="w-8 px-1 py-2" aria-hidden />
                  <td className="px-4 py-2">
                    <Input
                      value={draft.name}
                      onChange={(e) =>
                        handleDraftChange("name", e.target.value)
                      }
                      onBlur={handleDraftBlur}
                      placeholder="Ex. TotalEnergies"
                      className="h-9 min-w-[120px] border-0 bg-transparent shadow-none focus-visible:ring-1"
                    />
                  </td>
                  <td className="px-4 py-2 text-right align-middle">
                    <div className="flex justify-end">
                      <NumberInput
                        value={draft.quantity}
                        onChange={(n) => handleDraftChange("quantity", n)}
                        onBlur={handleDraftBlur}
                        placeholder="0"
                        className="h-9 w-20 border-0 bg-transparent text-right shadow-none focus-visible:ring-1"
                      />
                    </div>
                  </td>
                  <td className="px-4 py-2 text-right align-middle">
                    <div className="flex justify-end">
                      <NumberInput
                        value={draft.price}
                        onChange={(n) => handleDraftChange("price", n)}
                        onBlur={handleDraftBlur}
                        placeholder="0"
                        className="h-9 w-24 border-0 bg-transparent text-right shadow-none focus-visible:ring-1"
                      />
                    </div>
                  </td>
                  <td className="px-4 py-2 text-right align-middle">
                    <div className="flex justify-end">
                      <NumberInput
                        value={draft.dividendPercentPerYear ?? 0}
                        onChange={(n) =>
                          handleDraftChange("dividendPercentPerYear", n)
                        }
                        onBlur={handleDraftBlur}
                        placeholder="0"
                        className="h-9 w-16 border-0 bg-transparent text-right shadow-none focus-visible:ring-1"
                      />
                    </div>
                  </td>
                  <td className="px-4 py-2 text-right align-middle">
                    <div className="flex justify-end">
                      <NumberInput
                        value={draft.roePercent ?? 0}
                        onChange={(n) => handleDraftChange("roePercent", n)}
                        onBlur={handleDraftBlur}
                        placeholder="0"
                        className="h-9 w-16 border-0 bg-transparent text-right shadow-none focus-visible:ring-1"
                      />
                    </div>
                  </td>
                  <td className="px-4 py-2 text-right align-middle text-muted-foreground">
                    —
                  </td>
                  <td className="px-4 py-2 text-right align-middle text-muted-foreground">
                    —
                  </td>
                  <td className="w-10 px-2 py-2" aria-hidden />
                </tr>
                {items.length > 0 &&
                  (() => {
                    const totalDividends = items.reduce(
                      (s, h) => s + getPEAHoldingAnnualDividend(h),
                      0,
                    );
                    if (totalDividends <= 0) return null;
                    return (
                      <tr className="border-t-2 border-border bg-muted/40 font-medium">
                        <td className="px-4 py-2" colSpan={6} />
                        <td className="px-4 py-2 text-right text-foreground">
                          Total dividendes/an :
                        </td>
                        <td className="px-4 py-2 text-right text-foreground">
                          {totalDividends.toLocaleString("fr-FR", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{" "}
                          €
                        </td>
                        <td className="w-10 px-2 py-2" aria-hidden />
                      </tr>
                    );
                  })()}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={confirmDelete !== null}
        onOpenChange={() => setConfirmDelete(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Supprimer la ligne</DialogTitle>
            <DialogDescription>
              Supprimer « {confirmDelete?.label} » ? Cette action est
              irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmDelete(null)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() =>
                confirmDelete != null && removeAt(confirmDelete.index)
              }
            >
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function PEAPage() {
  const router = useRouter();
  const {
    loading,
    incomeSources,
    expenseCategories,
    placementAllocation,
    peaActions,
    setPeaActions,
    peaEtfs,
    setPeaEtfs,
    saveProfile,
    skipNextAutoSave,
    autoSaveDelayMs,
  } = useProfileContext();

  const dataRef = useRef({ peaActions, peaEtfs });
  dataRef.current = { peaActions, peaEtfs };

  const totalIncome = incomeSources.reduce(
    (sum, s) => sum + getIncomeAmount(s),
    0,
  );
  const totalExpenses = expenseCategories.reduce(
    (sum, c) => sum + getExpenseAmount(c, totalIncome, incomeSources),
    0,
  );
  const resteAInvestir = totalIncome - totalExpenses;
  const monthlyPEA = getMonthlyPEA(resteAInvestir, placementAllocation);

  /** Redirection vers le dashboard si les conditions d'accès ne sont pas remplies */
  useEffect(() => {
    if (loading) return;
    if (totalIncome <= 0 || totalExpenses <= 0 || resteAInvestir < 0) {
      router.replace("/dashboard");
    }
  }, [loading, totalIncome, totalExpenses, resteAInvestir, router]);

  const balance = useMemo(() => {
    const fromActions = peaActions.reduce(
      (s, h) => s + getPEAHoldingValue(h),
      0,
    );
    const fromEtfs = peaEtfs.reduce((s, h) => s + getPEAHoldingValue(h), 0);
    return fromActions + fromEtfs;
  }, [peaActions, peaEtfs]);

  const cappedBalance = Math.max(0, Math.min(PEA_PLAFOND_EUR, balance));
  const remainingCap = Math.max(0, PEA_PLAFOND_EUR - cappedBalance);

  /** Total dividendes/an : cumul de toutes les lignes Actions + toutes les lignes ETF */
  const totalAnnualDividends = useMemo(() => {
    const fromActions = getTotalAnnualDividends(peaActions);
    const fromEtfs = getTotalAnnualDividends(peaEtfs);
    return fromActions + fromEtfs;
  }, [peaActions, peaEtfs]);

  const monthlyDividendEuro = totalAnnualDividends / 12;

  /** ROE moyen pondéré (Actions + ETF) pour la courbe : composition annuelle. */
  const weightedAverageROE = useMemo(() => {
    const allHoldings = [...peaActions, ...peaEtfs];
    return getWeightedAverageROE(allHoldings);
  }, [peaActions, peaEtfs]);

  const chartData = useMemo(
    () =>
      getPEAProjectionData(
        cappedBalance,
        monthlyPEA,
        monthlyDividendEuro,
        PEA_PLAFOND_EUR,
        24,
        weightedAverageROE,
      ),
    [cappedBalance, monthlyPEA, monthlyDividendEuro, weightedAverageROE],
  );
  const monthPlafondReached = useMemo(
    () => getMonthPlafondReached(chartData, PEA_PLAFOND_EUR),
    [chartData],
  );
  const yearsToPlafond =
    monthPlafondReached != null ? Math.floor(monthPlafondReached / 12) : null;
  const monthsRemainingToPlafond =
    monthPlafondReached != null ? monthPlafondReached % 12 : null;

  const savePeaHoldings = useCallback(() => {
    saveProfile({
      pea_actions: dataRef.current.peaActions,
      pea_etfs: dataRef.current.peaEtfs,
    });
  }, [saveProfile]);

  useEffect(() => {
    if (loading) return;
    if (skipNextAutoSave.current) {
      skipNextAutoSave.current = false;
      return;
    }
    const timeoutId = setTimeout(savePeaHoldings, autoSaveDelayMs);
    return () => clearTimeout(timeoutId);
  }, [
    loading,
    peaActions,
    peaEtfs,
    savePeaHoldings,
    skipNextAutoSave,
    autoSaveDelayMs,
  ]);

  useEffect(() => {
    const flush = () => {
      const payload = JSON.stringify({
        pea_actions: dataRef.current.peaActions,
        pea_etfs: dataRef.current.peaEtfs,
      });
      navigator.sendBeacon(
        "/api/profile/save",
        new Blob([payload], { type: "application/json" }),
      );
    };
    window.addEventListener("beforeunload", flush);
    return () => window.removeEventListener("beforeunload", flush);
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-full w-full p-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Plan d&apos;épargne en actions (PEA)</CardTitle>
          <CardDescription>
            Un seul PEA par personne. Plafond des versements :{" "}
            {PEA_PLAFOND_EUR.toLocaleString("fr-FR")} €. Le solde est calculé à
            partir de vos lignes Actions et ETF (quantité × prix). Le versement
            mensuel correspond à la part PEA du reste à investir (dashboard).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Versement mensuel PEA
            </p>
            <p className="text-2xl font-bold text-primary">
              {monthlyPEA.toLocaleString("fr-FR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              €{" "}
              <span className="text-sm font-normal text-muted-foreground">
                / mois
              </span>
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Solde PEA (calculé)
            </p>
            <p className="text-2xl font-bold text-foreground">
              {cappedBalance.toLocaleString("fr-FR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              €
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Plafond : {PEA_PLAFOND_EUR.toLocaleString("fr-FR")} €. Il vous
              reste{" "}
              <span className="font-medium text-foreground">
                {remainingCap.toLocaleString("fr-FR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                €
              </span>{" "}
              de capacité de versement.
            </p>
          </div>
          <div className="mt-4">
            <p className="mb-2 text-sm font-medium text-muted-foreground">
              Évolution du solde jusqu&apos;au plafond de 150 000 €
            </p>
            {(monthlyPEA > 0 ||
              monthlyDividendEuro > 0 ||
              weightedAverageROE > 0) &&
              (() => {
                const fmt = (n: number) =>
                  n.toLocaleString("fr-FR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  });
                const total = monthlyPEA + monthlyDividendEuro;
                const parts: string[] = [];
                if (monthlyPEA > 0)
                  parts.push(`${fmt(monthlyPEA)} € (versement)`);
                if (monthlyDividendEuro > 0) {
                  parts.push(
                    `${fmt(monthlyDividendEuro)} € (total dividendes/an Actions + ETF : ${fmt(totalAnnualDividends)} € ÷ 12)`,
                  );
                }
                const formula = parts.join(" + ");
                return (
                  <p className="mb-2 text-xs text-muted-foreground">
                    Chaque mois :{" "}
                    {weightedAverageROE > 0 && (
                      <>
                        solde × (1 + ROE {fmt(weightedAverageROE)} %)^(1/12) —
                        composition.{" "}
                      </>
                    )}
                    {formula ? (
                      <>
                        Puis +{" "}
                        <strong className="text-foreground">{formula}</strong> ={" "}
                        <strong className="text-foreground">
                          {fmt(total)} €
                        </strong>{" "}
                        / mois.
                      </>
                    ) : null}
                  </p>
                );
              })()}
            {yearsToPlafond !== null &&
              monthsRemainingToPlafond !== null &&
              (monthlyPEA + monthlyDividendEuro > 0 ||
                weightedAverageROE > 0) && (
                <p className="mb-2 text-sm text-muted-foreground">
                  Plafond atteint en{" "}
                  {yearsToPlafond > 0 && (
                    <span className="font-medium text-foreground">
                      {yearsToPlafond} an{yearsToPlafond > 1 ? "s" : ""}{" "}
                    </span>
                  )}
                  <span className="font-medium text-foreground">
                    {monthsRemainingToPlafond} mois
                  </span>
                </p>
              )}
            {cappedBalance >= PEA_PLAFOND_EUR && (
              <p className="mb-2 text-sm font-medium text-primary">
                Plafond déjà atteint.
              </p>
            )}
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 28, right: 8, left: 0, bottom: 0 }}
                >
                  <defs>
                    {/* Brut : vert */}
                    <linearGradient
                      id="fillPEABalance"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="hsl(142, 60%, 42%)"
                        stopOpacity={0.4}
                      />
                      <stop
                        offset="95%"
                        stopColor="hsl(142, 60%, 42%)"
                        stopOpacity={0}
                      />
                    </linearGradient>
                    {/* Net : bleu (couleur distincte) */}
                    <linearGradient
                      id="fillPEANet"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="hsl(210, 65%, 45%)"
                        stopOpacity={0.4}
                      />
                      <stop
                        offset="95%"
                        stopColor="hsl(210, 65%, 45%)"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                    vertical={false}
                    horizontal={true}
                  />
                  <XAxis
                    dataKey="month"
                    type="number"
                    domain={[0, "dataMax"]}
                    ticks={(() => {
                      const max =
                        chartData.length > 0
                          ? (chartData[chartData.length - 1]?.month ?? 0)
                          : 0;
                      const t: number[] = [0];
                      for (let m = 12; m <= max; m += 12) t.push(m);
                      return t;
                    })()}
                    tickFormatter={(m) => formatYearAxisLabel(Number(m))}
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <YAxis
                    tickFormatter={(v) => `${v} €`}
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    width={50}
                  />
                  <ReferenceLine
                    y={PEA_PLAFOND_EUR}
                    stroke="hsl(var(--destructive))"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    label={{
                      value: "Plafond 150 000 €",
                      position: "right",
                      fill: "hsl(var(--destructive))",
                      fontSize: 11,
                    }}
                  />
                  {monthPlafondReached != null && monthPlafondReached > 0 && (
                    <ReferenceLine
                      x={monthPlafondReached}
                      stroke="rgba(255, 255, 255, 0.85)"
                      strokeWidth={2.5}
                      strokeDasharray="6 6"
                      label={{
                        value: `Plafond (${formatYearAxisLabel(monthPlafondReached)})`,
                        position: "insideTopRight",
                        fill: "hsl(var(--muted-foreground))",
                        fontSize: 11,
                      }}
                    />
                  )}
                  <Tooltip
                    cursor={false}
                    content={({ active, payload }) => {
                      if (!active || !payload?.[0]) return null;
                      const d = payload[0].payload;
                      const brut = Math.round(d.balance * 100) / 100;
                      const net = Math.round((d.netBalance ?? 0) * 100) / 100;
                      return (
                        <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-md">
                          <p className="font-medium">
                            {formatYearAxisLabel(d.month)}
                          </p>
                          <p className="font-mono text-foreground text-green-600 dark:text-green-400">
                            Brut :{" "}
                            {brut.toLocaleString("fr-FR", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}{" "}
                            €
                          </p>
                          <p className="font-mono text-foreground text-blue-600 dark:text-blue-400">
                            Net (−17,2 %) :{" "}
                            {net.toLocaleString("fr-FR", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}{" "}
                            €
                          </p>
                        </div>
                      );
                    }}
                    allowEscapeViewBox={{ x: false, y: false }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "11px" }}
                    formatter={(value) => (
                      <span className="text-muted-foreground">{value}</span>
                    )}
                  />
                  <Area
                    type="monotone"
                    dataKey="netBalance"
                    stroke="hsl(210, 65%, 45%)"
                    strokeWidth={2}
                    fill="url(#fillPEANet)"
                    isAnimationActive={true}
                    connectNulls={false}
                    name="Net (−17,2 %)"
                  />
                  <Area
                    type="monotone"
                    dataKey="balance"
                    stroke="hsl(142, 60%, 42%)"
                    name="Brut"
                    strokeWidth={2}
                    fill="url(#fillPEABalance)"
                    isAnimationActive={true}
                    connectNulls={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      <HoldingsTable
        title="Actions"
        items={peaActions}
        setItems={setPeaActions}
      />
      <HoldingsTable title="ETF" items={peaEtfs} setItems={setPeaEtfs} />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Avantages fiscaux du PEA</CardTitle>
          <CardDescription>
            Après 5 ans de détention, les gains (plus-values et revenus) sont
            exonérés d&apos;impôt sur le revenu.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <ul className="list-inside list-disc space-y-2 text-muted-foreground">
            <li>
              <strong className="text-foreground">
                Exonération d&apos;impôt sur le revenu
              </strong>{" "}
              : après 5 ans, les plus-values et dividendes ne sont pas imposés à
              l&apos;IR.
            </li>
            <li>
              <strong className="text-foreground">Prélèvements sociaux</strong>{" "}
              : les prélèvements sociaux (17,2 %) peuvent s&apos;appliquer au
              moment du retrait selon la date d&apos;ouverture du PEA. À
              vérifier selon votre situation.
            </li>
            <li>
              <strong className="text-foreground">Un seul PEA</strong> : vous ne
              pouvez avoir qu&apos;un seul PEA. Le plafond de 150 000 € est
              global (versements cumulés depuis l&apos;ouverture).
            </li>
            <li>
              <strong className="text-foreground">
                Pas de sortie avant 5 ans
              </strong>{" "}
              : un retrait avant 5 ans entraîne la clôture du PEA et une
              imposition des gains. Au-delà de 5 ans, vous pouvez effectuer des
              retraits sans clôturer le plan.
            </li>
          </ul>
          <p className="text-xs text-muted-foreground">
            Ces informations sont données à titre indicatif. Consultez le site
            des impôts ou un conseiller pour votre situation.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
