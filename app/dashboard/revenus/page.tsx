"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useProfileContext } from "@/components/ProfileProvider";
import { updateIncomeSource } from "@/lib/useProfile";
import type { IncomeAmountType, IncomeSource } from "@/lib/types";
import { getIncomeAmount } from "@/lib/types";
import { clampPercent } from "@/lib/utils";
import { Plus, Wallet, MoreVertical } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Skeleton } from "@/components/ui/skeleton";
import { SummaryCardRow } from "@/components/SummaryCardRow";

const EMPTY_SOURCE: IncomeSource = { name: "", type: "fixed", amount: 0 };

/** Dialog : créer ou modifier le nom d'une catégorie */
function CategoryDialog({
  open,
  onOpenChange,
  mode,
  initialName,
  existingNames,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initialName: string;
  existingNames: string[];
  onSubmit: (name: string) => void;
}) {
  const [value, setValue] = useState(initialName);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) {
      setValue(initialName);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open, initialName]);
  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (existingNames.includes(trimmed) && (mode === "create" || trimmed !== initialName)) return;
    onSubmit(trimmed);
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Nouvelle catégorie" : "Modifier le nom de la catégorie"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Nom de la catégorie de revenus (ex. Revenus pro)."
              : "Nouveau nom de la catégorie."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 pt-2">
          <Input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Ex. Revenus pro"
            className="h-10"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="button" onClick={submit}>
              {mode === "create" ? "Ajouter" : "Enregistrer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Formulaire commun pour une source de revenu (utilisé dans le dialog) */
function IncomeSourceForm({
  source,
  onChange,
  showGroup,
  groupName,
  groupNames,
}: {
  source: IncomeSource;
  onChange: (field: keyof IncomeSource, value: string | number | boolean | undefined) => void;
  showGroup?: boolean;
  groupName?: string;
  groupNames?: string[];
}) {
  const type = source.type ?? "fixed";
  const hasDeduction = (source.deductionPercent ?? 0) > 0;
  const showBrutNet = source.taxIndexed && hasDeduction;
  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Libellé</label>
        <Input
          value={source.name}
          onChange={(e) => onChange("name", e.target.value)}
          placeholder="Ex. Salaire"
          className="h-10"
        />
      </div>
      {showGroup && groupNames && groupNames.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Catégorie</label>
          <Select
            value={source.group ?? groupName ?? groupNames[0]}
            onValueChange={(v) => onChange("group", v)}
          >
            <SelectTrigger className="h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {groupNames.map((g) => (
                <SelectItem key={g} value={g}>
                  {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-2">
        <label className="text-sm font-medium">Type</label>
        <Select
          value={type}
          onValueChange={(v: IncomeAmountType) => {
            onChange("type", v);
            if (v === "fixed") onChange("amount", 0);
            else {
              onChange("min", 0);
              onChange("max", 0);
            }
          }}
        >
          <SelectTrigger className="h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fixed">Fixe</SelectItem>
            <SelectItem value="range">Fourchette</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {type === "fixed" && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Montant (€)</label>
          <NumberInput
            value={source.amount ?? 0}
            onChange={(n) => onChange("amount", n)}
            placeholder="0"
            className="h-10"
          />
        </div>
      )}
      {type === "range" && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Min (€)</label>
            <NumberInput
              value={source.min ?? 0}
              onChange={(n) => onChange("min", n)}
              placeholder="0"
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Max (€)</label>
            <NumberInput
              value={source.max ?? 0}
              onChange={(n) => onChange("max", n)}
              placeholder="0"
              className="h-10"
            />
          </div>
        </div>
      )}
      <div className="space-y-2">
        <label className="text-sm font-medium">Déduction % (optionnel)</label>
        <NumberInput
          value={source.deductionPercent ?? 0}
          onChange={(n) => onChange("deductionPercent", n === 0 ? undefined : clampPercent(n))}
          placeholder="0"
          className="h-10"
        />
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id="tax-indexed"
          checked={source.taxIndexed === true}
          onCheckedChange={(checked) => onChange("taxIndexed", checked === true)}
        />
        <label htmlFor="tax-indexed" className="text-sm cursor-pointer">
          Inclure dans le simulateur impôt sur le revenu
        </label>
      </div>
      {showBrutNet && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Base impôt</label>
          <Select
            value={source.taxBase ?? "net"}
            onValueChange={(v: "brut" | "net") => onChange("taxBase", v)}
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Base" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="brut">Brut</SelectItem>
              <SelectItem value="net">Net</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

/** Dialog : créer ou modifier une ligne de revenu */
function IncomeLineDialog({
  open,
  onOpenChange,
  mode,
  groupName,
  groupNames,
  initialSource,
  onSubmit,
  onUpdate,
  globalIndex,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  groupName: string;
  groupNames: string[];
  initialSource: IncomeSource;
  onSubmit?: (source: IncomeSource) => void;
  onUpdate?: (index: number, field: keyof IncomeSource & string, value: string | number | boolean) => void;
  globalIndex?: number;
}) {
  const [source, setSource] = useState<IncomeSource>(initialSource);
  useEffect(() => {
    if (open) setSource(initialSource);
  }, [open, initialSource]);
  const handleChange = (field: keyof IncomeSource, value: string | number | boolean | undefined) => {
    setSource((prev) => {
      const next = { ...prev };
      if (field === "name") next.name = String(value ?? "");
      else if (field === "group") next.group = value as string;
      else if (field === "type") {
        next.type = value as IncomeAmountType;
        if (value === "fixed") next.amount = 0;
        else { next.min = 0; next.max = 0; }
      } else if (field === "amount") next.amount = Number(value) || 0;
      else if (field === "min") next.min = Number(value) || 0;
      else if (field === "max") next.max = Number(value) || 0;
      else if (field === "deductionPercent") next.deductionPercent = value as number | undefined;
      else if (field === "taxIndexed") next.taxIndexed = value as boolean;
      else if (field === "taxBase") next.taxBase = value as "brut" | "net" | undefined;
      return next;
    });
  };
  const submit = () => {
    if (mode === "create" && onSubmit) {
      onSubmit({ ...source, group: groupName });
      onOpenChange(false);
    } else if (mode === "edit" && onUpdate && globalIndex !== undefined) {
      const s = source;
      onUpdate(globalIndex, "name", s.name);
      if (s.group != null) onUpdate(globalIndex, "group", s.group);
      onUpdate(globalIndex, "type", s.type ?? "fixed");
      onUpdate(globalIndex, "amount", s.amount ?? 0);
      onUpdate(globalIndex, "min", s.min ?? 0);
      onUpdate(globalIndex, "max", s.max ?? 0);
      onUpdate(globalIndex, "deductionPercent", s.deductionPercent ?? 0);
      onUpdate(globalIndex, "taxIndexed", s.taxIndexed ?? false);
      onUpdate(globalIndex, "taxBase", s.taxBase ?? "net");
      onOpenChange(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Nouvelle ligne de revenu" : "Modifier la ligne"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Ajoutez une source de revenu dans cette catégorie."
              : "Modifiez les champs ci-dessous."}
          </DialogDescription>
        </DialogHeader>
        <IncomeSourceForm
          source={source}
          onChange={handleChange}
          showGroup={mode === "edit"}
          groupName={groupName}
          groupNames={groupNames}
        />
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="button" onClick={submit}>
            {mode === "create" ? "Ajouter" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Page de configuration des revenus : catégories en cartes dépliables (style PEA),
 * menu "..." pour modifier/supprimer, dialogs pour créer/éditer.
 */
export default function RevenusPage() {
  const {
    loading,
    incomeSources,
    setIncomeSources,
    incomeGroupNames,
    setIncomeGroupNames,
    saveProfile,
    skipNextAutoSave,
    autoSaveDelayMs,
  } = useProfileContext();

  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [categoryDialog, setCategoryDialog] = useState<
    null | { mode: "create" } | { mode: "edit"; groupName: string }
  >(null);
  const [lineDialog, setLineDialog] = useState<
    null | { mode: "create"; groupName: string } | { mode: "edit"; globalIndex: number }
  >(null);
  const [confirmDelete, setConfirmDelete] = useState<
    | { type: "income"; globalIndex: number; label: string }
    | { type: "category"; groupName: string }
    | null
  >(null);

  const dataRef = useRef({ incomeSources, incomeGroupNames });
  dataRef.current.incomeSources = incomeSources;
  dataRef.current.incomeGroupNames = incomeGroupNames;

  useEffect(() => {
    if (loading) return;
    if (skipNextAutoSave.current) {
      skipNextAutoSave.current = false;
      return;
    }
    const timeoutId = setTimeout(() => {
      saveProfile({
        income_sources: dataRef.current.incomeSources,
        income_group_names: dataRef.current.incomeGroupNames,
      });
    }, autoSaveDelayMs);
    return () => clearTimeout(timeoutId);
  }, [loading, incomeSources, incomeGroupNames, saveProfile, skipNextAutoSave, autoSaveDelayMs]);

  const removeIncome = (globalIndex: number) => {
    setIncomeSources((prev) => prev.filter((_, i) => i !== globalIndex));
    setConfirmDelete(null);
  };

  const handleUpdate = (
    globalIndex: number,
    field: "name" | "group" | "type" | "amount" | "min" | "max" | "deductionPercent" | "taxIndexed" | "taxBase",
    value: string | number | boolean
  ) => {
    updateIncomeSource(setIncomeSources, globalIndex, field, value);
  };

  const addIncomeGroup = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || incomeGroupNames.includes(trimmed)) return;
    setIncomeGroupNames((prev) => [...prev, trimmed]);
  };

  const defaultGroup = incomeGroupNames[0] ?? "Revenus perso";
  const removeIncomeGroup = (name: string) => {
    if (incomeGroupNames.length <= 1) return;
    setIncomeGroupNames((prev) => prev.filter((g) => g !== name));
    setIncomeSources((prev) =>
      prev.filter((s) => (s.group ?? defaultGroup) !== name)
    );
  };

  const confirmRemoveIncomeGroup = (groupName: string) => {
    removeIncomeGroup(groupName);
    setConfirmDelete(null);
  };

  const renameIncomeGroup = (oldName: string, newName: string) => {
    if (!newName.trim() || newName === oldName) return;
    if (incomeGroupNames.includes(newName.trim())) return;
    const trimmed = newName.trim();
    const newGroupNames = incomeGroupNames.map((g) => (g === oldName ? trimmed : g));
    const newSources = incomeSources.map((s) =>
      s.group === oldName ? { ...s, group: trimmed } : s
    );
    setIncomeGroupNames(() => newGroupNames);
    setIncomeSources(() => newSources);
    saveProfile({ income_sources: newSources, income_group_names: newGroupNames });
  };

  const totalIncome = incomeSources.reduce((sum, s) => sum + getIncomeAmount(s), 0);
  const getItemsForGroup = (groupName: string) =>
    incomeSources
      .map((s, i) => ({ source: s, globalIndex: i }))
      .filter(({ source }) => (source.group ?? defaultGroup) === groupName);

  const addLineToGroup = (groupName: string, source: IncomeSource) => {
    setIncomeSources((prev) => [...prev, { ...source, group: groupName }]);
  };

  if (loading) {
    return (
      <div className="min-h-full w-full p-4 sm:p-6">
        <Skeleton className="h-8 w-48 rounded bg-muted" />
        <Skeleton className="mt-2 h-4 w-72 rounded bg-muted" />
        <div className="mt-6 space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-[72px] w-full rounded-xl bg-muted" />
          ))}
          <Skeleton className="h-12 w-40 rounded-lg bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full w-full p-4 sm:p-6">
      <div className="space-y-3">
        {incomeGroupNames.map((groupName) => {
          const items = getItemsForGroup(groupName);
          const groupTotal = items.reduce(
            (sum, { source }) => sum + getIncomeAmount(source),
            0
          );
          const expanded = expandedCategories[groupName] ?? true;
          const pct =
            totalIncome > 0
              ? ((groupTotal / totalIncome) * 100).toFixed(0) + " %"
              : undefined;
          return (
            <SummaryCardRow
              key={groupName}
              icon={<Wallet className="size-5" />}
              title={groupName}
              subtitle={`${items.length} ligne(s)`}
              value={`${groupTotal.toLocaleString("fr-FR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })} €`}
              percentage={pct}
              expandable
              expanded={expanded}
              onToggleExpand={() =>
                setExpandedCategories((prev) => ({
                  ...prev,
                  [groupName]: !prev[groupName],
                }))
              }
              expandAriaLabel={`Afficher le détail de la catégorie ${groupName}`}
              trailingAction={
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label="Menu catégorie"
                    >
                      <MoreVertical className="size-5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 border-0 bg-card shadow-sm">
                    <DropdownMenuItem
                      onClick={() => setCategoryDialog({ mode: "edit", groupName })}
                      className="cursor-pointer"
                    >
                      Modifier le nom de la catégorie
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-white/20" />
                    <DropdownMenuItem
                      onClick={() =>
                        setConfirmDelete({ type: "category", groupName })
                      }
                      disabled={incomeGroupNames.length <= 1}
                      className="cursor-pointer text-destructive focus:text-destructive"
                    >
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              }
            >
              <div className="space-y-2">
                {items.map(({ source, globalIndex }) => (
                  <div
                    key={globalIndex}
                    className="flex items-center justify-between gap-2 rounded-lg bg-muted/30 px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground truncate">
                        {source.name || "Sans nom"}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="tabular-nums text-muted-foreground">
                          {getIncomeAmount(source).toLocaleString("fr-FR", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{" "}
                          €
                        </span>
                        <span className="rounded bg-muted px-1.5 py-0.5 font-medium text-muted-foreground">
                          {source.type === "range" ? "Fourchette" : "Fixe"}
                        </span>
                        {source.taxIndexed === true && (
                          <span className="rounded bg-primary/15 px-1.5 py-0.5 font-medium text-primary">
                            Indexé impôt
                          </span>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground shrink-0"
                          aria-label="Menu ligne"
                        >
                          <MoreVertical className="size-5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 border-0 bg-card shadow-sm">
                        <DropdownMenuItem
                          onClick={() =>
                            setLineDialog({ mode: "edit", globalIndex })
                          }
                          className="cursor-pointer"
                        >
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-white/20" />
                        <DropdownMenuItem
                          onClick={() =>
                            setConfirmDelete({
                              type: "income",
                              globalIndex,
                              label: source.name || "cette source",
                            })
                          }
                          className="cursor-pointer text-destructive focus:text-destructive"
                        >
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setLineDialog({ mode: "create", groupName })
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted/30 hover:text-foreground"
                >
                  <Plus className="size-4" />
                  Ajouter une ligne
                </button>
              </div>
            </SummaryCardRow>
          );
        })}

        <button
          type="button"
          onClick={() => setCategoryDialog({ mode: "create" })}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-muted-foreground/30 bg-transparent py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted/20 hover:text-foreground"
        >
          <Plus className="size-5" />
          Créer une catégorie
        </button>
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        Total revenus :{" "}
        <span className="font-medium text-foreground">
          {totalIncome.toLocaleString("fr-FR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}{" "}
          €
        </span>
        {incomeSources.some((s) => s.taxIndexed === true) && (
          <>
            {" · "}
            <Link
              href="/dashboard/simulateur-impot"
              className="font-medium text-primary underline underline-offset-4 hover:text-primary/90"
            >
              Simulateur impôt sur le revenu
            </Link>
          </>
        )}
      </p>

      <CategoryDialog
        open={categoryDialog !== null}
        onOpenChange={(open) => !open && setCategoryDialog(null)}
        mode={categoryDialog?.mode ?? "create"}
        initialName={
          categoryDialog?.mode === "edit" ? categoryDialog.groupName : ""
        }
        existingNames={incomeGroupNames}
        onSubmit={(name) => {
          if (categoryDialog?.mode === "create") {
            addIncomeGroup(name);
          } else if (categoryDialog?.mode === "edit") {
            const oldName = categoryDialog.groupName;
            const wasExpanded = expandedCategories[oldName] ?? true;
            renameIncomeGroup(oldName, name);
            setExpandedCategories((prev) => {
              const next = { ...prev };
              delete next[oldName];
              next[name] = wasExpanded;
              return next;
            });
          }
          setCategoryDialog(null);
        }}
      />

      {(lineDialog?.mode === "create" || lineDialog?.mode === "edit") && (
        <IncomeLineDialog
          open={true}
          onOpenChange={(open) => !open && setLineDialog(null)}
          mode={lineDialog.mode}
          groupName={
            lineDialog.mode === "create"
              ? lineDialog.groupName
              : (incomeSources[lineDialog.globalIndex]?.group ?? defaultGroup)
          }
          groupNames={incomeGroupNames}
          initialSource={
            lineDialog.mode === "create"
              ? { ...EMPTY_SOURCE, group: lineDialog.groupName }
              : (incomeSources[lineDialog.globalIndex] ?? EMPTY_SOURCE)
          }
          onSubmit={
            lineDialog.mode === "create"
              ? (source) => addLineToGroup(lineDialog.groupName, source)
              : undefined
          }
          onUpdate={lineDialog.mode === "edit" ? handleUpdate : undefined}
          globalIndex={lineDialog.mode === "edit" ? lineDialog.globalIndex : undefined}
        />
      )}

      <Dialog
        open={confirmDelete !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {confirmDelete?.type === "income"
                ? "Supprimer cette ligne de revenu ?"
                : "Supprimer cette catégorie ?"}
            </DialogTitle>
            <DialogDescription>
              {confirmDelete?.type === "income" ? (
                <>
                  Êtes-vous sûr de vouloir supprimer la source
                  {confirmDelete.label ? ` « ${confirmDelete.label} »` : ""} ?
                  La ligne et toute sa configuration seront définitivement
                  supprimées.
                </>
              ) : confirmDelete?.type === "category" ? (
                <>
                  Êtes-vous sûr de vouloir supprimer la catégorie «{" "}
                  {confirmDelete.groupName} » ? Toutes les sources de revenu de
                  cette catégorie et leur configuration seront supprimées.
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
                if (confirmDelete?.type === "income")
                  removeIncome(confirmDelete.globalIndex);
                else if (confirmDelete?.type === "category")
                  confirmRemoveIncomeGroup(confirmDelete.groupName);
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
