"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import type {
  ExpenseAmountType,
  ExpenseCategory,
  IncomeSource,
} from "@/lib/types";
import { getExpenseAmount, getIncomeAmount } from "@/lib/types";
import { useProfileContext } from "@/components/ProfileProvider";
import { updateExpenseCategory } from "@/lib/useProfile";
import { useSortableSensors } from "@/lib/dnd-sensors";
import { Plus, X, GripVertical } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const EMPTY_DRAFT: ExpenseCategory = { name: "", type: "fixed", amount: 0 };

/** Card avec gros + et bordure en pointillés : ouvre une dialog pour créer une catégorie */
function CreateCategoryCard({
  onAdd,
  existing,
}: {
  onAdd: (name: string) => void;
  existing: string[];
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) {
      setValue("");
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);
  const submit = () => {
    const trimmed = value.trim();
    if (trimmed && !existing.includes(trimmed)) {
      onAdd(trimmed);
      setOpen(false);
    }
  };
  return (
    <>
      <Card
        role="button"
        tabIndex={0}
        className="mb-6 cursor-pointer border-2 border-dashed border-muted-foreground/30 bg-transparent transition-colors hover:border-primary/50 hover:bg-muted/20"
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        <CardContent className="flex min-h-[140px] items-center justify-center p-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/40">
              <Plus className="h-8 w-8 text-muted-foreground" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">
              Créer une catégorie
            </span>
          </div>
        </CardContent>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nouvelle catégorie</DialogTitle>
            <DialogDescription>
              Nom de la catégorie de dépenses (ex. Dépenses pro).
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 pt-2">
            <Input
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              placeholder="Ex. Dépenses pro"
              className="h-10"
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button type="button" onClick={submit}>
                Ajouter
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function isDraftEmpty(d: ExpenseCategory): boolean {
  if (d.name.trim() !== "") return false;
  if (d.type === "fixed" && (d.amount ?? 0) !== 0) return false;
  if (d.type === "range" && ((d.min ?? 0) !== 0 || (d.max ?? 0) !== 0))
    return false;
  if (d.type === "percentage" && (d.percentage ?? 0) !== 0) return false;
  return true;
}

/** Libellé éditable pour le nom de la catégorie. pendingRenameRef permet de sauvegarder au beforeunload si l'utilisateur n'a pas quitté l'input. */
function EditableCategoryTitle({
  value,
  onRename,
  existingNames,
  pendingRenameRef,
}: {
  value: string;
  onRename: (oldName: string, newName: string) => void;
  existingNames: string[];
  /** Ref pour exposer le rename en cours afin de sauvegarder au beforeunload */
  pendingRenameRef?: React.MutableRefObject<Record<string, string> | null>;
}) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  useEffect(() => {
    if (!pendingRenameRef) return;
    if (local.trim() && local !== value) {
      pendingRenameRef.current = pendingRenameRef.current ?? {};
      pendingRenameRef.current[value] = local.trim();
    } else {
      if (pendingRenameRef.current) {
        delete pendingRenameRef.current[value];
        if (Object.keys(pendingRenameRef.current).length === 0)
          pendingRenameRef.current = null;
      }
    }
  }, [value, local, pendingRenameRef]);
  const commit = () => {
    const trimmed = local.trim();
    if (!trimmed || trimmed === value) {
      setLocal(value);
      return;
    }
    if (existingNames.includes(trimmed) && trimmed !== value) {
      setLocal(value);
      return;
    }
    if (pendingRenameRef?.current) {
      delete pendingRenameRef.current[value];
      if (Object.keys(pendingRenameRef.current).length === 0)
        pendingRenameRef.current = null;
    }
    onRename(value, trimmed);
  };
  return (
    <Input
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && commit()}
      className="h-auto border-0 bg-transparent px-0 text-lg font-semibold shadow-none focus-visible:ring-0"
    />
  );
}

/** Carte catégorie de dépenses déplaçable */
function SortableCategoryCard({
  groupName,
  headerContent,
  tableContent,
  onDelete,
  canDelete,
}: {
  groupName: string;
  headerContent: React.ReactNode;
  tableContent: React.ReactNode;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: groupName });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <Card ref={setNodeRef} style={style} className="mb-6">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span
              className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-5 w-5 shrink-0" />
            </span>
            {headerContent}
          </div>
          {canDelete && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onDelete}
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
              title="Supprimer la catégorie"
              aria-label={`Supprimer la catégorie ${groupName}`}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      {tableContent}
    </Card>
  );
}

/** Ligne de dépense sortable (drag handle + contenu) */
function SortableExpenseRow({
  cat,
  globalIndex,
  totalIncome,
  incomeSources,
  percentageRefOptions,
  onUpdate,
  onRequestRemove,
}: {
  cat: ExpenseCategory;
  globalIndex: number;
  totalIncome: number;
  incomeSources: IncomeSource[];
  percentageRefOptions: PercentageRefOption[];
  onUpdate: (index: number, field: keyof ExpenseCategory, value: string | number) => void;
  onRequestRemove: (index: number, expense: ExpenseCategory) => void;
}) {
  const id = `row-${globalIndex}`;
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
      <ExpenseRowCells
        cat={cat}
        globalIndex={globalIndex}
        totalIncome={totalIncome}
        incomeSources={incomeSources}
        percentageRefOptions={percentageRefOptions}
        onUpdate={onUpdate}
        onRequestRemove={onRequestRemove}
      />
    </tr>
  );
}

/** Option pour le Select "référence" du % (total / catégorie / ligne) */
export type PercentageRefOption = { value: string; label: string };

/** Cellules d'une ligne de dépense (sans le tr) */
function ExpenseRowCells({
  cat,
  globalIndex,
  totalIncome,
  incomeSources,
  percentageRefOptions,
  onUpdate,
  onRequestRemove,
}: {
  cat: ExpenseCategory;
  globalIndex: number;
  totalIncome: number;
  incomeSources: IncomeSource[];
  percentageRefOptions: PercentageRefOption[];
  onUpdate: (index: number, field: keyof ExpenseCategory, value: string | number) => void;
  onRequestRemove: (index: number, expense: ExpenseCategory) => void;
}) {
  const percentageOfValue = cat.type === "percentage" ? (cat.percentageOf ?? "total") : "total";
  return (
    <>
      <td className="px-4 py-2">
        <Input
          value={cat.name}
          onChange={(e) => onUpdate(globalIndex, "name", e.target.value)}
          placeholder="Ex. Loyer"
          className="h-9 min-w-[120px] border-0 bg-transparent shadow-none focus-visible:ring-1"
        />
      </td>
      <td className="px-4 py-2">
        <Select
          value={cat.type ?? "fixed"}
          onValueChange={(v: ExpenseAmountType) => onUpdate(globalIndex, "type", v)}
        >
          <SelectTrigger className="h-9 w-[130px] border-0 bg-transparent shadow-none focus:ring-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fixed">Fixe</SelectItem>
            <SelectItem value="range">Fourchette</SelectItem>
            <SelectItem value="percentage">% revenus</SelectItem>
          </SelectContent>
        </Select>
      </td>
      <td className="px-4 py-2 text-right">
        <div className="flex flex-wrap items-center justify-end gap-1">
          {cat.type === "fixed" && (
            <>
              <NumberInput
                value={cat.amount ?? 0}
                onChange={(n) => onUpdate(globalIndex, "amount", n)}
                placeholder="0"
                className="h-9 w-20 border-0 bg-transparent text-right shadow-none focus-visible:ring-1"
              />
              <span className="text-muted-foreground">€</span>
            </>
          )}
          {cat.type === "range" && (
            <>
              <NumberInput
                value={cat.min ?? 0}
                onChange={(n) => onUpdate(globalIndex, "min", n)}
                placeholder="Min"
                className="h-9 w-16 border-0 bg-transparent text-right shadow-none focus-visible:ring-1"
              />
              <span className="text-muted-foreground">–</span>
              <NumberInput
                value={cat.max ?? 0}
                onChange={(n) => onUpdate(globalIndex, "max", n)}
                placeholder="Max"
                className="h-9 w-16 border-0 bg-transparent text-right shadow-none focus-visible:ring-1"
              />
              <span className="text-muted-foreground">€</span>
            </>
          )}
          {cat.type === "percentage" && (
            <>
              <NumberInput
                value={cat.percentage ?? 0}
                onChange={(n) => onUpdate(globalIndex, "percentage", n)}
                placeholder="%"
                className="h-9 w-14 border-0 bg-transparent text-right shadow-none focus-visible:ring-1"
              />
              <span className="text-muted-foreground">%</span>
            </>
          )}
        </div>
      </td>
      <td className="px-4 py-2">
        {cat.type === "percentage" ? (
          <Select
            value={percentageRefOptions.some((o) => o.value === percentageOfValue) ? percentageOfValue : "total"}
            onValueChange={(v) => onUpdate(globalIndex, "percentageOf", v)}
          >
            <SelectTrigger className="h-9 min-w-[140px] border-0 bg-transparent shadow-none focus:ring-1">
              <SelectValue placeholder="Référence" />
            </SelectTrigger>
            <SelectContent>
              {percentageRefOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-4 py-2 text-right text-muted-foreground">
        {getExpenseAmount(cat, totalIncome, incomeSources).toLocaleString("fr-FR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}{" "}
        €
        {cat.type === "percentage" &&
          cat.percentage != null &&
          cat.percentage > 0 && (
            <span className="ml-1 text-xs">
              ({cat.percentage} % de la référence)
            </span>
          )}
      </td>
      <td className="px-2 py-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onRequestRemove(globalIndex, cat)}
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
          title="Supprimer"
          aria-label="Supprimer"
        >
          <X className="h-4 w-4" />
        </Button>
      </td>
    </>
  );
}

/** Ligne brouillon (création au blur) */
function DraftRow({
  draft,
  totalIncome,
  incomeSources,
  percentageRefOptions,
  onChange,
  onBlur,
}: {
  draft: ExpenseCategory;
  totalIncome: number;
  incomeSources: IncomeSource[];
  percentageRefOptions: PercentageRefOption[];
  onChange: (field: keyof ExpenseCategory, value: string | number) => void;
  onBlur: () => void;
}) {
  const percentageOfValue = draft.type === "percentage" ? (draft.percentageOf ?? "total") : "total";
  return (
    <tr className="border-b border-border last:border-b-0 hover:bg-muted/30">
      <td className="w-8" aria-hidden />
      <td className="px-4 py-2">
        <Input
          value={draft.name}
          onChange={(e) => onChange("name", e.target.value)}
          placeholder="Ex. Loyer"
          className="h-9 min-w-[120px] border-0 bg-transparent shadow-none focus-visible:ring-1"
        />
      </td>
      <td className="px-4 py-2">
        <Select
          value={draft.type}
          onValueChange={(v: ExpenseAmountType) => onChange("type", v)}
        >
          <SelectTrigger className="h-9 w-[130px] border-0 bg-transparent shadow-none focus:ring-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fixed">Fixe</SelectItem>
            <SelectItem value="range">Fourchette</SelectItem>
            <SelectItem value="percentage">% revenus</SelectItem>
          </SelectContent>
        </Select>
      </td>
      <td className="px-4 py-2 text-right">
        <div className="flex flex-wrap items-center justify-end gap-1">
          {draft.type === "fixed" && (
            <>
              <NumberInput
                value={draft.amount ?? 0}
                onChange={(n) => onChange("amount", n)}
                onBlur={onBlur}
                placeholder="0"
                className="h-9 w-20 border-0 bg-transparent text-right shadow-none focus-visible:ring-1"
              />
              <span className="text-muted-foreground">€</span>
            </>
          )}
          {draft.type === "range" && (
            <>
              <NumberInput
                value={draft.min ?? 0}
                onChange={(n) => onChange("min", n)}
                onBlur={onBlur}
                placeholder="Min"
                className="h-9 w-16 border-0 bg-transparent text-right shadow-none focus-visible:ring-1"
              />
              <span className="text-muted-foreground">–</span>
              <NumberInput
                value={draft.max ?? 0}
                onChange={(n) => onChange("max", n)}
                onBlur={onBlur}
                placeholder="Max"
                className="h-9 w-16 border-0 bg-transparent text-right shadow-none focus-visible:ring-1"
              />
              <span className="text-muted-foreground">€</span>
            </>
          )}
          {draft.type === "percentage" && (
            <>
              <NumberInput
                value={draft.percentage ?? 0}
                onChange={(n) => onChange("percentage", n)}
                onBlur={onBlur}
                placeholder="%"
                className="h-9 w-14 border-0 bg-transparent text-right shadow-none focus-visible:ring-1"
              />
              <span className="text-muted-foreground">%</span>
            </>
          )}
        </div>
      </td>
      <td className="px-4 py-2">
        {draft.type === "percentage" ? (
          <Select
            value={percentageRefOptions.some((o) => o.value === percentageOfValue) ? percentageOfValue : "total"}
            onValueChange={(v) => onChange("percentageOf", v)}
          >
            <SelectTrigger className="h-9 min-w-[140px] border-0 bg-transparent shadow-none focus:ring-1">
              <SelectValue placeholder="Référence" />
            </SelectTrigger>
            <SelectContent>
              {percentageRefOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-4 py-2 text-right text-muted-foreground">
        {getExpenseAmount(draft, totalIncome, incomeSources).toLocaleString("fr-FR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}{" "}
        €
      </td>
      <td className="w-10 px-2 py-2" />
    </tr>
  );
}

/**
 * Page de configuration des dépenses : un bloc (card) par catégorie, chacun avec son tableau.
 */
export default function DepensesPage() {
  const {
    loading,
    incomeSources,
    incomeGroupNames,
    expenseCategories,
    setExpenseCategories,
    expenseGroupNames,
    setExpenseGroupNames,
    saveProfile,
    skipNextAutoSave,
    autoSaveDelayMs,
  } = useProfileContext();

  /** Options pour le Select "Référence" du % : total, catégorie de revenus, ou ligne de revenu */
  const percentageRefOptions = useMemo(() => {
    const opts: PercentageRefOption[] = [
      { value: "total", label: "Total des revenus" },
    ];
    for (const groupName of incomeGroupNames) {
      opts.push({
        value: `category:${groupName}`,
        label: `Catégorie : ${groupName}`,
      });
    }
    for (const src of incomeSources) {
      const group = src.group ?? incomeGroupNames[0] ?? "";
      opts.push({
        value: `source:${group}|${src.name}`,
        label: `Ligne : ${group || "—"} – ${src.name || "—"}`,
      });
    }
    return opts;
  }, [incomeGroupNames, incomeSources]);

  /** Un brouillon par catégorie */
  const [draftRows, setDraftRows] = useState<Record<string, ExpenseCategory>>(
    () => ({}),
  );

  /** Dialog de confirmation de suppression (ligne dépense ou catégorie) */
  const [confirmDelete, setConfirmDelete] = useState<
    | { type: "expense"; globalIndex: number; label: string }
    | { type: "category"; groupName: string }
    | null
  >(null);

  const dataRef = useRef({ expenseCategories, expenseGroupNames });
  dataRef.current.expenseCategories = expenseCategories;
  dataRef.current.expenseGroupNames = expenseGroupNames;

  /** Renames en cours (non encore validés par blur/Enter) pour sauvegarde au beforeunload */
  const pendingRenameRef = useRef<Record<string, string> | null>(null);

  const totalIncome = incomeSources.reduce(
    (sum, s) => sum + getIncomeAmount(s),
    0,
  );

  useEffect(() => {
    if (loading) return;
    if (skipNextAutoSave.current) {
      skipNextAutoSave.current = false;
      return;
    }
    const timeoutId = setTimeout(() => {
      saveProfile({
        expense_categories: dataRef.current.expenseCategories,
        expense_group_names: dataRef.current.expenseGroupNames,
      });
    }, autoSaveDelayMs);
    return () => clearTimeout(timeoutId);
  }, [
    loading,
    expenseCategories,
    expenseGroupNames,
    saveProfile,
    skipNextAutoSave,
    autoSaveDelayMs,
  ]);

  /** Sauvegarde au refresh/fermeture même si l'utilisateur n'a pas quitté l'input */
  useEffect(() => {
    const flush = () => {
      let names = dataRef.current.expenseGroupNames;
      let categories = [...dataRef.current.expenseCategories];
      const pending = pendingRenameRef.current;
      if (pending && Object.keys(pending).length > 0) {
        for (const [oldName, newName] of Object.entries(pending)) {
          const trimmed = newName.trim();
          if (!trimmed || trimmed === oldName) continue;
          names = names.map((g) => (g === oldName ? trimmed : g));
          categories = categories.map((c) =>
            c.group === oldName ? { ...c, group: trimmed } : c,
          );
        }
      }
      const payload = JSON.stringify({
        expense_categories: categories,
        expense_group_names: names,
      });
      navigator.sendBeacon(
        "/api/profile/save",
        new Blob([payload], { type: "application/json" }),
      );
    };
    window.addEventListener("beforeunload", flush);
    return () => window.removeEventListener("beforeunload", flush);
  }, []);

  const removeExpense = (globalIndex: number) => {
    setExpenseCategories((prev) => prev.filter((_, i) => i !== globalIndex));
    setConfirmDelete(null);
  };

  const confirmRemoveExpenseGroup = (groupName: string) => {
    removeExpenseGroup(groupName);
    setConfirmDelete(null);
  };

  const handleUpdate = (globalIndex: number, field: keyof ExpenseCategory, value: string | number) => {
    updateExpenseCategory(setExpenseCategories, globalIndex, field, value);
  };

  const getDraftForGroup = (groupName: string): ExpenseCategory =>
    draftRows[groupName] ?? { ...EMPTY_DRAFT, group: groupName };

  const setDraftForGroup = (groupName: string, updater: (prev: ExpenseCategory) => ExpenseCategory) => {
    setDraftRows((prev) => ({
      ...prev,
      [groupName]: updater(prev[groupName] ?? { ...EMPTY_DRAFT, group: groupName }),
    }));
  };

  const handleDraftChange = (groupName: string, field: keyof ExpenseCategory, value: string | number) => {
    if (field === "group") return;
    setDraftForGroup(groupName, (prev) => {
      const next = { ...prev };
      if (field === "name") next.name = String(value);
      else if (field === "type") {
        const type = value as ExpenseAmountType;
        next.type = type;
        next.amount = type === "fixed" ? (prev.amount ?? 0) : undefined;
        next.min = type === "range" ? (prev.min ?? 0) : undefined;
        next.max = type === "range" ? (prev.max ?? 0) : undefined;
        next.percentage = type === "percentage" ? (prev.percentage ?? 0) : undefined;
        next.percentageOf = type === "percentage" ? (prev.percentageOf ?? "total") : undefined;
      } else if (field === "amount") next.amount = Number(value) || 0;
      else if (field === "min") next.min = Number(value) || 0;
      else if (field === "max") next.max = Number(value) || 0;
      else if (field === "percentage") next.percentage = Number(value) || 0;
      else if (field === "percentageOf") next.percentageOf = String(value);
      return next;
    });
  };

  const handleDraftBlur = (groupName: string) => {
    const draft = getDraftForGroup(groupName);
    if (isDraftEmpty(draft)) return;
    setExpenseCategories((prev) => [...prev, { ...draft, group: groupName }]);
    setDraftForGroup(groupName, () => ({ ...EMPTY_DRAFT, group: groupName }));
  };

  const addExpenseGroup = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || expenseGroupNames.includes(trimmed)) return;
    setExpenseGroupNames((prev) => [...prev, trimmed]);
  };

  const removeExpenseGroup = (name: string) => {
    if (expenseGroupNames.length <= 1) return;
    const remaining = expenseGroupNames.filter((g) => g !== name);
    setExpenseGroupNames(() => remaining);
    const fallback = remaining[0];
    setExpenseCategories((prev) =>
      prev.map((c) => (c.group === name ? { ...c, group: fallback } : c)),
    );
    setDraftRows((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const renameExpenseGroup = (oldName: string, newName: string) => {
    if (!newName.trim() || newName === oldName) return;
    if (expenseGroupNames.includes(newName.trim())) return;
    const trimmed = newName.trim();
    const newGroupNames = expenseGroupNames.map((g) =>
      g === oldName ? trimmed : g,
    );
    const newCategories = expenseCategories.map((c) =>
      c.group === oldName ? { ...c, group: trimmed } : c,
    );
    setExpenseGroupNames(() => newGroupNames);
    setExpenseCategories(() => newCategories);
    setDraftRows((prev) => {
      if (prev[oldName] == null) return prev;
      const next = { ...prev };
      next[trimmed] = { ...next[oldName], group: trimmed };
      delete next[oldName];
      return next;
    });
    saveProfile({
      expense_categories: newCategories,
      expense_group_names: newGroupNames,
    });
  };

  const totalExpenses = expenseCategories.reduce(
    (sum, c) => sum + getExpenseAmount(c, totalIncome, incomeSources),
    0,
  );

  /** Pour chaque catégorie : dépenses dont group === groupName, avec index global */
  const getItemsForGroup = (groupName: string) =>
    expenseCategories
      .map((c, i) => ({ expense: c, globalIndex: i }))
      .filter(
        ({ expense }) =>
          (expense.group ?? expenseGroupNames[0]) === groupName,
      );

  const sensors = useSortableSensors();

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    if (
      typeof active.id === "string" &&
      typeof over.id === "string" &&
      expenseGroupNames.includes(active.id) &&
      expenseGroupNames.includes(over.id)
    ) {
      const oldIndex = expenseGroupNames.indexOf(active.id);
      const newIndex = expenseGroupNames.indexOf(over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        setExpenseGroupNames(
          arrayMove(expenseGroupNames, oldIndex, newIndex),
        );
      }
      return;
    }
    const activeStr = String(active.id);
    const overStr = String(over.id);
    if (!activeStr.startsWith("row-") || !overStr.startsWith("row-")) return;
    const oldIdx = parseInt(activeStr.replace("row-", ""), 10);
    const newIdx = parseInt(overStr.replace("row-", ""), 10);
    const groupName = expenseGroupNames.find((g) => {
      const items = getItemsForGroup(g);
      const indices = items.map((x) => x.globalIndex);
      return indices.includes(oldIdx) && indices.includes(newIdx);
    });
    if (!groupName) return;
    const items = getItemsForGroup(groupName);
    const groupIndices = items.map((x) => x.globalIndex);
    const oldIndexInGroup = groupIndices.indexOf(oldIdx);
    const newIndexInGroup = groupIndices.indexOf(newIdx);
    if (oldIndexInGroup === -1 || newIndexInGroup === -1) return;
    const newOrder = arrayMove(groupIndices, oldIndexInGroup, newIndexInGroup);
    setExpenseCategories((prev) => {
      const next = [...prev];
      for (let i = 0; i < groupIndices.length; i++) {
        next[groupIndices[i]] = prev[newOrder[i]];
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-full w-full p-6">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={expenseGroupNames}
          strategy={verticalListSortingStrategy}
        >
          {expenseGroupNames.map((groupName) => {
            const items = getItemsForGroup(groupName);
            const draft = getDraftForGroup(groupName);
            const groupTotal = items.reduce(
              (sum, { expense }) =>
                sum + getExpenseAmount(expense, totalIncome, incomeSources),
              0,
            );
            const rowIds = items.map(({ globalIndex }) => `row-${globalIndex}`);
            return (
              <SortableCategoryCard
                key={groupName}
                groupName={groupName}
                canDelete={expenseGroupNames.length > 1}
                onDelete={() =>
                  setConfirmDelete({ type: "category", groupName })
                }
                headerContent={
                  <div className="min-w-0">
                    <EditableCategoryTitle
                      value={groupName}
                      onRename={renameExpenseGroup}
                      existingNames={expenseGroupNames}
                      pendingRenameRef={pendingRenameRef}
                    />
                    <CardDescription>
                      Total :{" "}
                      {groupTotal.toLocaleString("fr-FR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      €
                    </CardDescription>
                  </div>
                }
                tableContent={
                  <CardContent>
                    <div className="overflow-x-auto rounded-md border border-border">
                      <table className="w-full min-w-[580px] border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-border bg-muted/50">
                            <th className="w-8 px-1 py-3" aria-label="Réordonner" />
                            <th className="px-4 py-3 text-left font-medium">
                              Libellé
                            </th>
                            <th className="px-4 py-3 text-left font-medium">Type</th>
                            <th className="px-4 py-3 text-right font-medium">
                              Valeur
                            </th>
                            <th className="px-4 py-3 text-left font-medium">
                              Référence
                            </th>
                            <th className="px-4 py-3 text-right font-medium">
                              Montant pris en compte
                            </th>
                            <th className="w-10 px-2 py-3" aria-label="Actions" />
                          </tr>
                        </thead>
                        <tbody>
                          <SortableContext
                            items={rowIds}
                            strategy={verticalListSortingStrategy}
                          >
                            {items.map(({ expense, globalIndex }) => (
                              <SortableExpenseRow
                                key={globalIndex}
                                cat={expense}
                                globalIndex={globalIndex}
                                totalIncome={totalIncome}
                                incomeSources={incomeSources}
                                percentageRefOptions={percentageRefOptions}
                                onUpdate={handleUpdate}
                                onRequestRemove={(index, exp) =>
                                  setConfirmDelete({
                                    type: "expense",
                                    globalIndex: index,
                                    label: exp.name || "cette dépense",
                                  })
                                }
                              />
                            ))}
                          </SortableContext>
                          <DraftRow
                            draft={draft}
                            totalIncome={totalIncome}
                            incomeSources={incomeSources}
                            percentageRefOptions={percentageRefOptions}
                            onChange={(field, value) =>
                              handleDraftChange(groupName, field, value)
                            }
                            onBlur={() => handleDraftBlur(groupName)}
                          />
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                }
              />
            );
          })}
        </SortableContext>
      </DndContext>

      <CreateCategoryCard
        onAdd={addExpenseGroup}
        existing={expenseGroupNames}
      />

      <p className="text-sm text-muted-foreground">
        Total dépenses :{" "}
        <span className="font-medium text-foreground">
          {totalExpenses.toLocaleString("fr-FR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}{" "}
          €
        </span>
        {totalIncome > 0 && (
          <span className="ml-1">
            (revenus totaux : {totalIncome.toLocaleString("fr-FR")} €)
          </span>
        )}
      </p>

      <Dialog
        open={confirmDelete !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {confirmDelete?.type === "expense"
                ? "Supprimer cette ligne de dépense ?"
                : "Supprimer cette catégorie ?"}
            </DialogTitle>
            <DialogDescription>
              {confirmDelete?.type === "expense" ? (
                <>
                  Êtes-vous sûr de vouloir supprimer la dépense
                  {confirmDelete.label ? ` « ${confirmDelete.label} »` : ""} ?
                  La ligne et toute sa configuration (type, montant, etc.)
                  seront définitivement supprimées.
                </>
              ) : confirmDelete?.type === "category" ? (
                <>
                  Êtes-vous sûr de vouloir supprimer la catégorie «{" "}
                  {confirmDelete.groupName} » ? Toutes les dépenses de cette
                  catégorie et leur configuration seront supprimées.
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
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
              onClick={() => {
                if (confirmDelete?.type === "expense")
                  removeExpense(confirmDelete.globalIndex);
                else if (confirmDelete?.type === "category")
                  confirmRemoveExpenseGroup(confirmDelete.groupName);
              }}
            >
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
