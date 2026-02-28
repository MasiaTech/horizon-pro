import DashboardSidebar from "@/components/DashboardSidebar";
import DashboardHeader from "@/components/DashboardHeader";
import { ProfileProvider } from "@/components/ProfileProvider";

/**
 * Layout dashboard : sidebar à gauche (logo, menu, profil) + header + zone principale.
 * ProfileProvider partage l'état du profil pour que le menu (Épargne, PEA) se mette à jour sans recharger.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProfileProvider autoSaveDelayMs={600}>
      <div className="flex h-screen overflow-hidden">
        <DashboardSidebar />
        <div className="flex min-h-0 flex-1 flex-col">
          <DashboardHeader />
          <main className="min-h-0 flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </ProfileProvider>
  );
}
