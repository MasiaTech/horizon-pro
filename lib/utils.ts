import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Affiche un nombre pour un input : vide si 0, sinon virgule comme décimal */
export function formatNumberForInput(n: number | undefined | null): string {
  if (n === undefined || n === null) return ""
  if (Number(n) === 0) return ""
  return String(n).replace(".", ",")
}

/** Garde uniquement chiffres et virgule ; point remplacé par virgule ; au plus une virgule */
export function sanitizeNumberInput(s: string): string {
  s = s.replace(/\./g, ",")
  s = s.replace(/[^\d,]/g, "")
  const firstComma = s.indexOf(",")
  if (firstComma !== -1) {
    s = s.slice(0, firstComma + 1) + s.slice(firstComma + 1).replace(/,/g, "")
  }
  return s
}

/** Parse une chaîne "12,5" en nombre 12.5 */
export function parseNumberInput(s: string): number {
  if (s.trim() === "") return 0
  const n = parseFloat(s.replace(",", "."))
  return Number.isNaN(n) ? 0 : n
}
