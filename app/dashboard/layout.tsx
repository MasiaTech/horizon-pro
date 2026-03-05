import { ProfileProvider } from "@/components/ProfileProvider";
import DashboardLayoutClient from "@/components/DashboardLayoutClient";

/**
 * Layout dashboard : sidebar à gauche (desktop) ou menu tiroir (mobile), header + zone principale.
 * ProfileProvider partage l'état du profil pour que le menu (Épargne, PEA) se mette à jour sans recharger.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProfileProvider autoSaveDelayMs={600}>
      <DashboardLayoutClient>{children}</DashboardLayoutClient>
    </ProfileProvider>
  );
}
