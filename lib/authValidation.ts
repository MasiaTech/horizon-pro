import * as z from "zod";

/**
 * Liste d'au moins 37 caractères spéciaux autorisés pour le mot de passe.
 */
const SPECIAL_CHARS =
  '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~§¶ªº«»€£¥¿¡';

function hasSpecialChar(password: string): boolean {
  return SPECIAL_CHARS.split("").some((c) => password.includes(c));
}

/** Critères du mot de passe pour affichage (barre de force + messages). */
export function getPasswordChecks(password: string) {
  const len = password.length;
  const hasMinLength = len >= 12;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = hasSpecialChar(password);
  return {
    hasMinLength,
    hasUpper,
    hasLower,
    hasDigit,
    hasSpecial,
    length: len,
  };
}

export type PasswordStrengthLevel = "weak" | "medium" | "strong";

/**
 * Force du mot de passe : 0–3 (faible → fort).
 * - 0 : ne respecte pas les critères min (rouge)
 * - 1 : respecte le minimum mais court (orange)
 * - 2 : correct, 14+ caractères (orange)
 * - 3 : fort, 16+ et varié (vert)
 */
export function getPasswordStrength(
  password: string
): { level: PasswordStrengthLevel; score: number; label: string; percent: number } {
  const checks = getPasswordChecks(password);
  const meetsMinimum =
    checks.hasMinLength &&
    checks.hasUpper &&
    checks.hasLower &&
    checks.hasDigit &&
    checks.hasSpecial;

  if (!password.length) {
    return { level: "weak", score: 0, label: "", percent: 0 };
  }

  if (!meetsMinimum) {
    return { level: "weak", score: 0, label: "Faible", percent: 25 };
  }

  if (checks.length >= 16 && checks.hasSpecial) {
    return { level: "strong", score: 3, label: "Fort", percent: 100 };
  }
  if (checks.length >= 14) {
    return { level: "medium", score: 2, label: "Correct", percent: 66 };
  }
  return { level: "medium", score: 1, label: "Moyen", percent: 33 };
}

/** Liste des critères manquants pour l’affichage des erreurs. */
export function getPasswordMissingChecks(password: string): string[] {
  const checks = getPasswordChecks(password);
  const missing: string[] = [];
  if (!checks.hasMinLength)
    missing.push("Au moins 12 caractères");
  if (!checks.hasUpper) missing.push("Une majuscule");
  if (!checks.hasLower) missing.push("Une minuscule");
  if (!checks.hasDigit) missing.push("Un chiffre");
  if (!checks.hasSpecial) missing.push("Un caractère spécial");
  return missing;
}

export const loginSchema = z.object({
  email: z.string().min(1, "L'email est requis").email("Email invalide"),
  password: z.string().min(1, "Le mot de passe est requis"),
});

export const registerSchema = z
  .object({
    email: z.string().min(1, "L'email est requis").email("Email invalide"),
    password: z
      .string()
      .min(12, "Le mot de passe doit contenir au moins 12 caractères")
      .refine((v) => /[A-Z]/.test(v), {
        message: "Le mot de passe doit contenir au moins une majuscule",
      })
      .refine((v) => /[a-z]/.test(v), {
        message: "Le mot de passe doit contenir au moins une minuscule",
      })
      .refine((v) => /\d/.test(v), {
        message: "Le mot de passe doit contenir au moins un chiffre",
      })
      .refine((v) => hasSpecialChar(v), {
        message:
          "Le mot de passe doit contenir au moins un caractère spécial (" +
          SPECIAL_CHARS.split("").slice(0, 10).join("") +
          "...)",
      }),
    passwordConfirm: z.string().min(1, "Veuillez confirmer le mot de passe"),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Les mots de passe ne correspondent pas",
    path: ["passwordConfirm"],
  });

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
