"use client";

import { useEffect, useRef, useState } from "react";
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
import { useProfileContext } from "@/components/ProfileProvider";
import { updateIncomeSource } from "@/lib/useProfile";
import { useSortableSensors } from "@/lib/dnd-sensors";
import type { IncomeAmountType, IncomeSource } from "@/lib/types";
import { getIncomeAmount } from "@/lib/types";
import { Plus, X, GripVertical } from "lucide-react";
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

const EMPTY_DRAFT: IncomeSource = { name: "", type: "fixed", amount: 0 };

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
              Nom de la catégorie de revenus (ex. Revenus pro).
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
              placeholder="Ex. Revenus pro"
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

/** Carte catégorie de revenus déplaçable */
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

function isDraftEmpty(d: IncomeSource): boolean {
  if (d.name.trim() !== "") return false;
  if (d.type === "range")
    return (d.min ?? 0) === 0 && (d.max ?? 0) === 0;
  return (d.amount ?? 0) === 0;
}

/** Libellé éditable pour le nom de la catégorie. pendingRenameRef permet de sauvegarder au beforeunload si l'utilisateur n'a pas quitté l'input. */
function EditableCategoryTitle({
  value,
  onRename,
  existingNames,
  className,
  pendingRenameRef,
}: {
  value: string;
  onRename: (oldName: string, newName: string) => void;
  existingNames: string[];
  className?: string;
  /** Ref pour exposer le rename en cours (oldName -> newName) afin de sauvegarder au beforeunload */
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
      className={`h-auto border-0 bg-transparent px-0 text-lg font-semibold shadow-none focus-visible:ring-0 ${className ?? ""}`}
    />
  );
}

/** Ligne de revenu sortable (drag handle + contenu) */
function SortableIncomeRow({
  source,
  globalIndex,
  onUpdate,
  onRequestRemove,
}: {
  source: IncomeSource;
  globalIndex: number;
  onUpdate: (index: number, field: keyof IncomeSource & string, value: string | number) => void;
  onRequestRemove: (index: number, source: IncomeSource) => void;
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
      <IncomeRowCells
        source={source}
        globalIndex={globalIndex}
        onUpdate={onUpdate}
        onRequestRemove={onRequestRemove}
      />
    </tr>
  );
}

/** Cellules d'une ligne (sans le tr) pour réutilisation dans la ligne brouillon */
function IncomeRowCells({
  source,
  globalIndex,
  onUpdate,
  onRequestRemove,
}: {
  source: IncomeSource;
  globalIndex: number;
  onUpdate: (index: number, field: keyof IncomeSource & string, value: string | number) => void;
  onRequestRemove: (index: number, source: IncomeSource) => void;
}) {
  const type = source.type ?? "fixed";
  return (
    <>
      <td className="px-4 py-2">
        <Input
          value={source.name}
          onChange={(e) => onUpdate(globalIndex, "name", e.target.value)}
          placeholder="Ex. Salaire"
          className="h-9 min-w-[120px] border-0 bg-transparent shadow-none focus-visible:ring-1"
        />
      </td>
      <td className="px-4 py-2">
        <Select
          value={type}
          onValueChange={(v: IncomeAmountType) => onUpdate(globalIndex, "type", v)}
        >
          <SelectTrigger className="h-9 w-[130px] border-0 bg-transparent shadow-none focus:ring-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fixed">Fixe</SelectItem>
            <SelectItem value="range">Fourchette</SelectItem>
          </SelectContent>
        </Select>
      </td>
      <td className="px-4 py-2 text-right">
        <div className="flex flex-wrap items-center justify-end gap-1">
          {type === "fixed" && (
            <>
              <NumberInput
                value={source.amount ?? 0}
                onChange={(n) => onUpdate(globalIndex, "amount", n)}
                placeholder="0"
                className="h-9 w-24 border-0 bg-transparent text-right shadow-none focus-visible:ring-1"
              />
              <span className="text-muted-foreground">€</span>
            </>
          )}
          {type === "range" && (
            <>
              <NumberInput
                value={source.min ?? 0}
                onChange={(n) => onUpdate(globalIndex, "min", n)}
                placeholder="Min"
                className="h-9 w-20 border-0 bg-transparent text-right shadow-none focus-visible:ring-1"
              />
              <span className="text-muted-foreground">–</span>
              <NumberInput
                value={source.max ?? 0}
                onChange={(n) => onUpdate(globalIndex, "max", n)}
                placeholder="Max"
                className="h-9 w-20 border-0 bg-transparent text-right shadow-none focus-visible:ring-1"
              />
              <span className="text-muted-foreground">€</span>
            </>
          )}
        </div>
      </td>
      <td className="px-4 py-2 text-right align-middle" title="Optionnel : ex. URSSAF auto-entrepreneur">
        <div className="flex items-center justify-end gap-1">
          <NumberInput
            value={source.deductionPercent ?? 0}
            onChange={(n) => onUpdate(globalIndex, "deductionPercent", n)}
            placeholder="0"
            className="h-9 w-14 border-0 bg-transparent text-right shadow-none focus-visible:ring-1"
          />
          <span className="text-muted-foreground">%</span>
        </div>
      </td>
      <td className="px-4 py-2 text-right text-muted-foreground">
        {getIncomeAmount(source).toLocaleString("fr-FR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}{" "}
        €
        {type === "range" && (
          <span className="ml-1 text-xs">(moyenne min–max)</span>
        )}
        {(source.deductionPercent ?? 0) > 0 && (
          <span className="ml-1 text-xs">(après −{source.deductionPercent} %)</span>
        )}
      </td>
      <td className="px-2 py-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onRequestRemove(globalIndex, source)}
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
  onChange,
  onBlur,
}: {
  draft: IncomeSource;
  onChange: (field: keyof IncomeSource & string, value: string | number) => void;
  onBlur: () => void;
}) {
  const type = draft.type ?? "fixed";
  return (
    <tr className="border-b border-border last:border-b-0 hover:bg-muted/30">
      <td className="w-8" aria-hidden />
      <td className="px-4 py-2">
        <Input
          value={draft.name}
          onChange={(e) => onChange("name", e.target.value)}
          onBlur={onBlur}
          placeholder="Ex. Salaire"
          className="h-9 min-w-[120px] border-0 bg-transparent shadow-none focus-visible:ring-1"
        />
      </td>
      <td className="px-4 py-2">
        <Select
          value={type}
          onValueChange={(v: IncomeAmountType) => onChange("type", v)}
        >
          <SelectTrigger className="h-9 w-[130px] border-0 bg-transparent shadow-none focus:ring-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fixed">Fixe</SelectItem>
            <SelectItem value="range">Fourchette</SelectItem>
          </SelectContent>
        </Select>
      </td>
      <td className="px-4 py-2 text-right">
        <div className="flex flex-wrap items-center justify-end gap-1">
          {type === "fixed" && (
            <>
              <NumberInput
                value={draft.amount ?? 0}
                onChange={(n) => onChange("amount", n)}
                onBlur={onBlur}
                placeholder="0"
                className="h-9 w-24 border-0 bg-transparent text-right shadow-none focus-visible:ring-1"
              />
              <span className="text-muted-foreground">€</span>
            </>
          )}
          {type === "range" && (
            <>
              <NumberInput
                value={draft.min ?? 0}
                onChange={(n) => onChange("min", n)}
                onBlur={onBlur}
                placeholder="Min"
                className="h-9 w-20 border-0 bg-transparent text-right shadow-none focus-visible:ring-1"
              />
              <span className="text-muted-foreground">–</span>
              <NumberInput
                value={draft.max ?? 0}
                onChange={(n) => onChange("max", n)}
                onBlur={onBlur}
                placeholder="Max"
                className="h-9 w-20 border-0 bg-transparent text-right shadow-none focus-visible:ring-1"
              />
              <span className="text-muted-foreground">€</span>
            </>
          )}
        </div>
      </td>
      <td className="px-4 py-2 text-right align-middle" title="Optionnel : ex. URSSAF">
        <div className="flex items-center justify-end gap-1">
          <NumberInput
            value={draft.deductionPercent ?? 0}
            onChange={(n) => onChange("deductionPercent", n)}
            onBlur={onBlur}
            placeholder="0"
            className="h-9 w-14 border-0 bg-transparent text-right shadow-none focus-visible:ring-1"
          />
          <span className="text-muted-foreground">%</span>
        </div>
      </td>
      <td className="px-4 py-2 text-right text-muted-foreground">
        {getIncomeAmount(draft).toLocaleString("fr-FR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}{" "}
        €
        {(draft.deductionPercent ?? 0) > 0 && (
          <span className="ml-1 text-xs">(après −{draft.deductionPercent} %)</span>
        )}
      </td>
      <td className="w-10 px-2 py-2" />
    </tr>
  );
}

/**
 * Page de configuration des revenus : un bloc (card) par catégorie, chacun avec son tableau.
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

  const [draftRows, setDraftRows] = useState<Record<string, IncomeSource>>(
    () => ({}),
  );

  const [confirmDelete, setConfirmDelete] = useState<
    | { type: "income"; globalIndex: number; label: string }
    | { type: "category"; groupName: string }
    | null
  >(null);

  const dataRef = useRef({ incomeSources, incomeGroupNames });
  dataRef.current.incomeSources = incomeSources;
  dataRef.current.incomeGroupNames = incomeGroupNames;

  /** Renames en cours (non encore validés par blur/Enter) pour sauvegarde au beforeunload */
  const pendingRenameRef = useRef<Record<string, string> | null>(null);

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
  }, [
    loading,
    incomeSources,
    incomeGroupNames,
    saveProfile,
    skipNextAutoSave,
    autoSaveDelayMs,
  ]);

  /** Sauvegarde au refresh/fermeture même si l'utilisateur n'a pas quitté l'input */
  useEffect(() => {
    const flush = () => {
      let names = dataRef.current.incomeGroupNames;
      let sources = [...dataRef.current.incomeSources];
      const pending = pendingRenameRef.current;
      if (pending && Object.keys(pending).length > 0) {
        for (const [oldName, newName] of Object.entries(pending)) {
          const trimmed = newName.trim();
          if (!trimmed || trimmed === oldName) continue;
          names = names.map((g) => (g === oldName ? trimmed : g));
          sources = sources.map((s) =>
            s.group === oldName ? { ...s, group: trimmed } : s,
          );
        }
      }
      const payload = JSON.stringify({
        income_sources: sources,
        income_group_names: names,
      });
      navigator.sendBeacon(
        "/api/profile/save",
        new Blob([payload], { type: "application/json" }),
      );
    };
    window.addEventListener("beforeunload", flush);
    return () => window.removeEventListener("beforeunload", flush);
  }, []);

  const removeIncome = (globalIndex: number) => {
    setIncomeSources((prev) => prev.filter((_, i) => i !== globalIndex));
    setConfirmDelete(null);
  };

  const handleUpdate = (
    globalIndex: number,
    field: "name" | "group" | "type" | "amount" | "min" | "max" | "deductionPercent",
    value: string | number,
  ) => {
    updateIncomeSource(setIncomeSources, globalIndex, field, value);
  };

  const getDraftForGroup = (groupName: string): IncomeSource =>
    draftRows[groupName] ?? { ...EMPTY_DRAFT, group: groupName };

  const setDraftForGroup = (groupName: string, updater: (prev: IncomeSource) => IncomeSource) => {
    setDraftRows((prev) => ({
      ...prev,
      [groupName]: updater(prev[groupName] ?? { ...EMPTY_DRAFT, group: groupName }),
    }));
  };

  const handleDraftChange = (
    groupName: string,
    field: keyof IncomeSource & string,
    value: string | number,
  ) => {
    setDraftForGroup(groupName, (prev) => {
      const next = { ...prev };
      if (field === "name") next.name = String(value);
      else if (field === "type") {
        const type = value as IncomeAmountType;
        next.type = type;
        next.amount = type === "fixed" ? (prev.amount ?? 0) : undefined;
        next.min = type === "range" ? (prev.min ?? 0) : undefined;
        next.max = type === "range" ? (prev.max ?? 0) : undefined;
      } else if (field === "amount") next.amount = Number(value) || 0;
      else if (field === "min") next.min = Number(value) || 0;
      else if (field === "max") next.max = Number(value) || 0;
      else if (field === "deductionPercent")
        next.deductionPercent =
          value === "" || value == null || Number(value) === 0
            ? undefined
            : Number(value) || 0;
      return next;
    });
  };

  const handleDraftBlur = (groupName: string) => {
    const draft = getDraftForGroup(groupName);
    if (isDraftEmpty(draft)) return;
    setIncomeSources((prev) => [...prev, { ...draft, group: groupName }]);
    setDraftForGroup(groupName, () => ({
      ...EMPTY_DRAFT,
      group: groupName,
    }));
  };

  const addIncomeGroup = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || incomeGroupNames.includes(trimmed)) return;
    setIncomeGroupNames((prev) => [...prev, trimmed]);
  };

  const removeIncomeGroup = (name: string) => {
    if (incomeGroupNames.length <= 1) return;
    const remaining = incomeGroupNames.filter((g) => g !== name);
    setIncomeGroupNames(() => remaining);
    const fallback = remaining[0];
    setIncomeSources((prev) =>
      prev.map((c) => (c.group === name ? { ...c, group: fallback } : c)),
    );
    setDraftRows((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const confirmRemoveIncomeGroup = (groupName: string) => {
    removeIncomeGroup(groupName);
    setConfirmDelete(null);
  };

  const renameIncomeGroup = (oldName: string, newName: string) => {
    if (!newName.trim() || newName === oldName) return;
    if (incomeGroupNames.includes(newName.trim())) return;
    const trimmed = newName.trim();
    const newGroupNames = incomeGroupNames.map((g) =>
      g === oldName ? trimmed : g,
    );
    const newSources = incomeSources.map((s) =>
      s.group === oldName ? { ...s, group: trimmed } : s,
    );
    setIncomeGroupNames(() => newGroupNames);
    setIncomeSources(() => newSources);
    setDraftRows((prev) => {
      if (prev[oldName] == null) return prev;
      const next = { ...prev };
      next[trimmed] = { ...next[oldName], group: trimmed };
      delete next[oldName];
      return next;
    });
    saveProfile({
      income_sources: newSources,
      income_group_names: newGroupNames,
    });
  };

  const totalIncome = incomeSources.reduce(
    (sum, s) => sum + getIncomeAmount(s),
    0,
  );

  const defaultGroup = incomeGroupNames[0] ?? "Revenus perso";
  const getItemsForGroup = (groupName: string) =>
    incomeSources
      .map((s, i) => ({ source: s, globalIndex: i }))
      .filter(
        ({ source }) =>
          (source.group ?? defaultGroup) === groupName,
      );

  const sensors = useSortableSensors();

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    if (
      typeof active.id === "string" &&
      typeof over.id === "string" &&
      incomeGroupNames.includes(active.id) &&
      incomeGroupNames.includes(over.id)
    ) {
      const oldIndex = incomeGroupNames.indexOf(active.id);
      const newIndex = incomeGroupNames.indexOf(over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        setIncomeGroupNames(arrayMove(incomeGroupNames, oldIndex, newIndex));
      }
      return;
    }
    const activeStr = String(active.id);
    const overStr = String(over.id);
    if (!activeStr.startsWith("row-") || !overStr.startsWith("row-")) return;
    const oldIdx = parseInt(activeStr.replace("row-", ""), 10);
    const newIdx = parseInt(overStr.replace("row-", ""), 10);
    const groupName = incomeGroupNames.find((g) => {
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
    setIncomeSources((prev) => {
      const next = [...prev];
      for (let i = 0; i < groupIndices.length; i++) {
        next[groupIndices[i]] = prev[newOrder[i]];
      }
      return next;
    });
  };

  return (
    <div className="min-h-full w-full p-6">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={incomeGroupNames}
          strategy={verticalListSortingStrategy}
        >
          {incomeGroupNames.map((groupName) => {
            const items = getItemsForGroup(groupName);
            const draft = getDraftForGroup(groupName);
            const groupTotal = items.reduce(
              (sum, { source }) => sum + getIncomeAmount(source),
              0,
            );
            const rowIds = items.map(({ globalIndex }) => `row-${globalIndex}`);
            return (
              <SortableCategoryCard
                key={groupName}
                groupName={groupName}
                canDelete={incomeGroupNames.length > 1}
                onDelete={() =>
                  setConfirmDelete({ type: "category", groupName })
                }
                headerContent={
                  <div className="min-w-0">
                    <EditableCategoryTitle
                      value={groupName}
                      onRename={renameIncomeGroup}
                      existingNames={incomeGroupNames}
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
                      <table className="w-full min-w-[640px] table-fixed border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-border bg-muted/50">
                            <th className="w-8 px-1 py-3" aria-label="Réordonner" />
                            <th className="px-4 py-3 text-left font-medium">
                              Libellé
                            </th>
                      <th className="px-4 py-3 text-left font-medium">
                        Type
                      </th>
                      <th className="px-4 py-3 text-right font-medium">
                        Valeur
                      </th>
                      <th
                        className="w-24 min-w-[6rem] px-4 py-3 text-right font-medium"
                        title="Optionnel : ex. URSSAF auto-entrepreneur"
                      >
                        Déduction %
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
                      {items.map(({ source, globalIndex }) => (
                        <SortableIncomeRow
                          key={globalIndex}
                          source={source}
                          globalIndex={globalIndex}
                          onUpdate={handleUpdate}
                          onRequestRemove={(index, src) =>
                            setConfirmDelete({
                              type: "income",
                              globalIndex: index,
                              label: src.name || "cette source",
                            })
                          }
                        />
                      ))}
                    </SortableContext>
                    <DraftRow
                      draft={draft}
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
        onAdd={addIncomeGroup}
        existing={incomeGroupNames}
      />

      <p className="text-sm text-muted-foreground">
        Total revenus :{" "}
        <span className="font-medium text-foreground">
          {totalIncome.toLocaleString("fr-FR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}{" "}
          €
        </span>
      </p>

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
