import { LegalPageShell } from "@/components/legal/LegalPageShell";

/**
 * Pages légales : shell commun (header + nav) via composant réutilisable.
 */
export default function LegalPagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LegalPageShell>{children}</LegalPageShell>;
}
