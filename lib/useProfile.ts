"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabaseClient";
import type {
  Profile,
  ProfileUpdate,
  IncomeSource,
  ExpenseCategory,
  ExpenseAmountType,
  PlacementAllocation,
  SavingsAccount,
  PEAHolding,
} from "@/lib/types";
import {
  DEFAULT_INCOME_SOURCES,
  DEFAULT_INCOME_GROUP_NAMES,
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_EXPENSE_GROUP_NAMES,
  DEFAULT_PLACEMENT_ALLOCATION,
  DEFAULT_SAVINGS_ACCOUNTS,
  DEFAULT_PEA_ACTIONS,
  DEFAULT_PEA_ETFS,
  normalizeExpenseCategory,
  normalizeIncomeSource,
  normalizePEAHolding,
} from "@/lib/types";

export type SaveMessage = {
  type: "success" | "error";
  text: string;
} | null;

/**
 * Hook partagé : charge le profil Supabase et expose revenus, dépenses, placements
 * avec sauvegarde (update partiel possible).
 */
export function useProfile(autoSaveDelayMs = 600) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<SaveMessage>(null);
  const skipNextAutoSave = useRef(true);
  const dataRef = useRef({
    incomeSources: DEFAULT_INCOME_SOURCES,
    incomeGroupNames: DEFAULT_INCOME_GROUP_NAMES,
    expenseCategories: DEFAULT_EXPENSE_CATEGORIES,
    expenseGroupNames: DEFAULT_EXPENSE_GROUP_NAMES,
    placementAllocation: DEFAULT_PLACEMENT_ALLOCATION,
    savingsAccounts: DEFAULT_SAVINGS_ACCOUNTS,
    peaActions: DEFAULT_PEA_ACTIONS,
    peaEtfs: DEFAULT_PEA_ETFS,
  });
  const profileRef = useRef<Profile | null>(null);
  profileRef.current = profile;

  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>(
    DEFAULT_INCOME_SOURCES,
  );
  const [incomeGroupNames, setIncomeGroupNames] = useState<string[]>(
    DEFAULT_INCOME_GROUP_NAMES,
  );
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>(
    DEFAULT_EXPENSE_CATEGORIES,
  );
  const [expenseGroupNames, setExpenseGroupNames] = useState<string[]>(
    DEFAULT_EXPENSE_GROUP_NAMES,
  );
  const [placementAllocation, setPlacementAllocation] = useState<
    PlacementAllocation[]
  >(DEFAULT_PLACEMENT_ALLOCATION);
  const [savingsAccounts, setSavingsAccounts] = useState<SavingsAccount[]>(
    DEFAULT_SAVINGS_ACCOUNTS,
  );
  const [peaActions, setPeaActions] = useState<PEAHolding[]>(DEFAULT_PEA_ACTIONS);
  const [peaEtfs, setPeaEtfs] = useState<PEAHolding[]>(DEFAULT_PEA_ETFS);

  dataRef.current = {
    incomeSources,
    incomeGroupNames,
    expenseCategories,
    expenseGroupNames,
    placementAllocation,
    savingsAccounts,
    peaActions,
    peaEtfs,
  };

  const loadProfile = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user: u },
    } = await supabase.auth.getUser();
    if (!u) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", u.id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        setProfile(null);
        setIncomeSources(DEFAULT_INCOME_SOURCES);
        setIncomeGroupNames(DEFAULT_INCOME_GROUP_NAMES);
        setExpenseCategories(DEFAULT_EXPENSE_CATEGORIES);
        setExpenseGroupNames(DEFAULT_EXPENSE_GROUP_NAMES);
        setPlacementAllocation(DEFAULT_PLACEMENT_ALLOCATION);
        setSavingsAccounts(DEFAULT_SAVINGS_ACCOUNTS);
        setPeaActions(DEFAULT_PEA_ACTIONS);
        setPeaEtfs(DEFAULT_PEA_ETFS);
        setLoading(false);
        return;
      }
      setMessage({ type: "error", text: error.message });
      setLoading(false);
      return;
    }

    setProfile(data as Profile);
    const incomes = (data as Profile).income_sources;
    const expenses = (data as Profile).expense_categories;

    const loadedIncomeSources =
      Array.isArray(incomes) && incomes.length > 0
        ? (incomes as unknown as Record<string, unknown>[]).map(
            normalizeIncomeSource,
          )
        : [];
    setIncomeSources(
      loadedIncomeSources.length > 0
        ? loadedIncomeSources
        : DEFAULT_INCOME_SOURCES,
    );

    const incomeGroups = (data as Profile).income_group_names;
    const savedIncomeGroupNames =
      Array.isArray(incomeGroups) && incomeGroups.length > 0
        ? (incomeGroups as string[]).map(String)
        : [];
    const groupsInIncomeSources = Array.from(
      new Set(
        loadedIncomeSources
          .map((s) => s.group ?? savedIncomeGroupNames[0])
          .filter((g): g is string => Boolean(g)),
      ),
    );
    const mergedIncomeGroupNames = Array.from(
      new Set([...savedIncomeGroupNames, ...groupsInIncomeSources]),
    );
    setIncomeGroupNames(
      mergedIncomeGroupNames.length > 0
        ? mergedIncomeGroupNames
        : DEFAULT_INCOME_GROUP_NAMES,
    );
    const loadedExpenseCategories =
      Array.isArray(expenses) && expenses.length > 0
        ? (expenses as unknown as Record<string, unknown>[]).map(
            normalizeExpenseCategory,
          )
        : [];
    setExpenseCategories(
      loadedExpenseCategories.length > 0
        ? loadedExpenseCategories
        : DEFAULT_EXPENSE_CATEGORIES,
    );
    const expenseGroups = (data as Profile).expense_group_names;
    const savedExpenseGroupNames =
      Array.isArray(expenseGroups) && expenseGroups.length > 0
        ? (expenseGroups as string[]).map(String)
        : [];
    const groupsInExpenseCategories = Array.from(
      new Set(
        loadedExpenseCategories
          .map((c) => c.group ?? savedExpenseGroupNames[0])
          .filter((g): g is string => Boolean(g)),
      ),
    );
    const mergedExpenseGroupNames = Array.from(
      new Set([...savedExpenseGroupNames, ...groupsInExpenseCategories]),
    );
    setExpenseGroupNames(
      mergedExpenseGroupNames.length > 0
        ? mergedExpenseGroupNames
        : DEFAULT_EXPENSE_GROUP_NAMES,
    );
    const placements = (data as Profile).placement_allocation;
    setPlacementAllocation(
      Array.isArray(placements) && placements.length > 0
        ? (placements as PlacementAllocation[])
        : DEFAULT_PLACEMENT_ALLOCATION,
    );
    const savings = (data as Profile).savings_accounts;
    if (Array.isArray(savings) && savings.length > 0) {
      const validFreq = (f: unknown) =>
        f === "daily" || f === "weekly" || f === "monthly" || f === "annual"
          ? f
          : "daily";
      const mapped = (savings as SavingsAccount[]).map((a, i) => ({
        name: String(a.name ?? ""),
        ratePercent: Number(a.ratePercent) ?? 0,
        interestFrequency: validFreq(a.interestFrequency) as SavingsAccount["interestFrequency"],
        allocationPercent:
          a.allocationPercent != null ? Number(a.allocationPercent) : i === 0 ? 100 : 0,
        currentBalance: a.currentBalance != null ? Number(a.currentBalance) : 0,
        goalAmount: a.goalAmount != null ? Number(a.goalAmount) : undefined,
      }));
      const sum = mapped.reduce((s, a) => s + a.allocationPercent!, 0);
      if (sum !== 100 && mapped.length > 0) {
        const n = mapped.length;
        const per = Math.round((100 / n) * 100) / 100;
        mapped.forEach((a, i) => {
          mapped[i] = {
            ...a,
            allocationPercent: i === n - 1 ? Math.max(0, 100 - (n - 1) * per) : per,
          };
        });
      }
      setSavingsAccounts(mapped);
    } else {
      setSavingsAccounts(DEFAULT_SAVINGS_ACCOUNTS);
    }
    const actions = (data as Profile).pea_actions;
    const etfs = (data as Profile).pea_etfs;
    if (Array.isArray(actions) && actions.length > 0) {
      setPeaActions(
        (actions as unknown as Record<string, unknown>[]).map(normalizePEAHolding),
      );
    } else {
      setPeaActions(DEFAULT_PEA_ACTIONS);
    }
    if (Array.isArray(etfs) && etfs.length > 0) {
      setPeaEtfs(
        (etfs as unknown as Record<string, unknown>[]).map(normalizePEAHolding),
      );
    } else {
      setPeaEtfs(DEFAULT_PEA_ETFS);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const saveProfile = useCallback(async (partial?: ProfileUpdate) => {
    setMessage(null);
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user: u },
    } = await supabase.auth.getUser();
    if (!u) {
      setSaving(false);
      return;
    }

    const ref = dataRef.current;
    const payload: ProfileUpdate = partial ?? {
      income_sources: ref.incomeSources,
      income_group_names: ref.incomeGroupNames,
      expense_categories: ref.expenseCategories,
      expense_group_names: ref.expenseGroupNames,
      placement_allocation: ref.placementAllocation,
      savings_accounts: ref.savingsAccounts,
      pea_actions: ref.peaActions,
      pea_etfs: ref.peaEtfs,
    };

    const currentProfile = profileRef.current;
    if (currentProfile) {
      const { error } = await supabase
        .from("profiles")
        .update(payload)
        .eq("id", u.id);
      if (error) {
        setMessage({ type: "error", text: error.message });
        setSaving(false);
        return;
      }
      setProfile((prev) => (prev ? { ...prev, ...payload } : null));
    } else {
      const { error } = await supabase
        .from("profiles")
        .insert({ id: u.id, ...payload });
      if (error) {
        setMessage({ type: "error", text: error.message });
        setSaving(false);
        return;
      }
      setProfile({
        id: u.id,
        created_at: new Date().toISOString(),
        monthly_income: null,
        monthly_expenses: null,
        savings_total: null,
        monthly_investment: null,
        ...payload,
      } as Profile);
    }

    setMessage({ type: "success", text: "Sauvegardé" });
    setSaving(false);
    setTimeout(() => setMessage(null), 2000);
  }, []);

  return {
    profile,
    loading,
    saving,
    message,
    setMessage,
    incomeSources,
    setIncomeSources,
    incomeGroupNames,
    setIncomeGroupNames,
    expenseCategories,
    setExpenseCategories,
    expenseGroupNames,
    setExpenseGroupNames,
    placementAllocation,
    setPlacementAllocation,
    savingsAccounts,
    setSavingsAccounts,
    peaActions,
    setPeaActions,
    peaEtfs,
    setPeaEtfs,
    loadProfile,
    saveProfile,
    skipNextAutoSave,
    autoSaveDelayMs,
  };
}

/** Mise à jour d'une source de revenu */
export function updateIncomeSource(
  setIncomeSources: React.Dispatch<React.SetStateAction<IncomeSource[]>>,
  index: number,
  field: "name" | "group" | "type" | "amount" | "min" | "max" | "deductionPercent",
  value: string | number,
) {
  setIncomeSources((prev) => {
    const next = [...prev];
    const cur = next[index];
    if (cur == null) return prev;
    if (field === "name") next[index] = { ...cur, name: String(value) };
    else if (field === "group") next[index] = { ...cur, group: String(value) };
    else if (field === "type") {
      const type = value as "fixed" | "range";
      next[index] = {
        ...cur,
        type,
        amount: type === "fixed" ? (cur.amount ?? 0) : undefined,
        min: type === "range" ? (cur.min ?? 0) : undefined,
        max: type === "range" ? (cur.max ?? 0) : undefined,
      };
    } else if (field === "amount")
      next[index] = { ...cur, amount: Number(value) || 0 };
    else if (field === "min") next[index] = { ...cur, min: Number(value) || 0 };
    else if (field === "max") next[index] = { ...cur, max: Number(value) || 0 };
    else if (field === "deductionPercent")
      next[index] = {
        ...cur,
        deductionPercent:
          value === "" || value == null || Number(value) === 0
            ? undefined
            : Number(value) || 0,
      };
    return next;
  });
}

/** Mise à jour d'une ligne PEA (action ou ETF) */
export function updatePEAHolding(
  setter: React.Dispatch<React.SetStateAction<PEAHolding[]>>,
  index: number,
  field: keyof PEAHolding,
  value: string | number | boolean,
) {
  setter((prev) => {
    const next = [...prev];
    const cur = next[index];
    if (cur == null) return prev;
    if (field === "name") next[index] = { ...cur, name: String(value) };
    else if (field === "quantity") next[index] = { ...cur, quantity: Number(value) || 0 };
    else if (field === "price") next[index] = { ...cur, price: Number(value) || 0 };
    else if (field === "dividendEnabled") next[index] = { ...cur, dividendEnabled: Boolean(value) };
    else if (field === "dividendPercentPerYear") next[index] = { ...cur, dividendPercentPerYear: value === "" || value == null ? undefined : Number(value) || 0 };
    else if (field === "roePercent") next[index] = { ...cur, roePercent: value === "" || value == null ? undefined : Number(value) || 0 };
    return next;
  });
}

/** Mise à jour d'une catégorie de dépense */
export function updateExpenseCategory(
  setExpenseCategories: React.Dispatch<React.SetStateAction<ExpenseCategory[]>>,
  index: number,
  field:
    | "name"
    | "group"
    | "type"
    | "amount"
    | "min"
    | "max"
    | "percentage"
    | "percentageOf",
  value: string | number,
) {
  setExpenseCategories((prev) => {
    const next = [...prev];
    const cur = next[index];
    if (field === "name") next[index] = { ...cur, name: String(value) };
    else if (field === "group") next[index] = { ...cur, group: String(value) };
    else if (field === "type") {
      const type = value as ExpenseAmountType;
      next[index] = {
        ...cur,
        type,
        amount: type === "fixed" ? (cur.amount ?? 0) : undefined,
        min: type === "range" ? (cur.min ?? 0) : undefined,
        max: type === "range" ? (cur.max ?? 0) : undefined,
        percentage:
          type === "percentage" ? (cur.percentage ?? 0) : undefined,
        percentageOf:
          type === "percentage"
            ? cur.percentageOf ?? "total"
            : undefined,
      };
    } else if (field === "percentageOf")
      next[index] = { ...cur, percentageOf: String(value) };
    else if (field === "amount")
      next[index] = { ...cur, amount: Number(value) || 0 };
    else if (field === "min")
      next[index] = { ...cur, min: Number(value) || 0 };
    else if (field === "max")
      next[index] = { ...cur, max: Number(value) || 0 };
    else if (field === "percentage")
      next[index] = { ...cur, percentage: Number(value) || 0 };
    return next;
  });
}
