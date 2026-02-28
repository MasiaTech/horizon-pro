"use client";

import React, { createContext, useContext } from "react";
import { useProfile } from "@/lib/useProfile";

export type ProfileContextValue = ReturnType<typeof useProfile>;

const ProfileContext = createContext<ProfileContextValue | null>(null);

/**
 * Fournit le profil (revenus, dépenses, placements, etc.) à tout le dashboard.
 * Un seul état partagé : le menu (Épargne, PEA) se met à jour sans recharger
 * quand on modifie revenus ou dépenses.
 */
export function ProfileProvider({
  children,
  autoSaveDelayMs = 600,
}: {
  children: React.ReactNode;
  autoSaveDelayMs?: number;
}) {
  const value = useProfile(autoSaveDelayMs);
  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfileContext(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (ctx == null) {
    throw new Error("useProfileContext must be used within ProfileProvider");
  }
  return ctx;
}
