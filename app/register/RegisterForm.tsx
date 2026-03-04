"use client";

/* eslint-disable react/no-children-prop -- TanStack Form uses children as render prop */
import { useForm } from "@tanstack/react-form";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import Logo from "@/components/Logo";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/PasswordInput";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/Spinner";
import {
  getPasswordMissingChecks,
  getPasswordStrength,
  registerSchema,
} from "@/lib/authValidation";
import { useState } from "react";

/**
 * Formulaire d'inscription : email + mot de passe + confirmation, TanStack Form + Zod.
 * Politique mot de passe : 12 caractères min, majuscule, minuscule, chiffre, caractère spécial.
 * Après succès : affiche la card "Vérifiez votre email".
 */
export default function RegisterForm() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
      passwordConfirm: "",
    },
    validators: {
      onSubmit: ({ value }) => {
        const result = registerSchema.safeParse(value);
        if (result.success) return undefined;
        const fieldErrors = result.error.flatten().fieldErrors as Record<
          string,
          string[] | undefined
        >;
        return { fields: fieldErrors };
      },
    },
    onSubmit: async ({ value }) => {
      setSubmitError(null);
      setIsLoading(true);
      try {
        const supabase = createClient();
        const origin =
          typeof window !== "undefined" ? window.location.origin : "";
        const { data, error } = await supabase.auth.signUp({
          email: value.email,
          password: value.password,
          options: {
            emailRedirectTo: `${origin}/login`,
          },
        });
        if (error) {
          const isEmailTaken =
            error.message?.toLowerCase().includes("already") ||
            error.message?.toLowerCase().includes("déjà") ||
            error.message?.toLowerCase().includes("already registered") ||
            error.code === "user_already_exists";
          setSubmitError(
            isEmailTaken
              ? "Cette adresse email est déjà utilisée."
              : error.message
          );
          return;
        }
        const identityCreated =
          data?.user?.identities && data.user.identities.length > 0;
        if (!identityCreated) {
          setSubmitError("Cette adresse email est déjà utilisée.");
          return;
        }
        setEmailSent(true);
        router.refresh();
      } finally {
        setIsLoading(false);
      }
    },
  });

  const showSpinner = isLoading || form.state.isSubmitting;

  if (emailSent) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-col items-center gap-3 text-center">
          <Logo size={64} href="/" />
          <CardTitle className="text-2xl">Vérifiez votre email</CardTitle>
          <CardDescription>
            Un lien de confirmation a été envoyé à votre adresse email.
            Cliquez sur le lien dans le mail pour activer votre compte.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="rounded-md border border-border bg-muted/50 p-4 text-center text-sm text-foreground">
            Allez dans vos mails pour confirmer le compte.
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link href="/login">Retour à la connexion</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="flex flex-col items-center gap-3 text-center">
        <Logo size={64} href="/" />
        <CardTitle className="text-2xl">Inscription</CardTitle>
        <CardDescription>Créez votre compte Horizon</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <FieldGroup>
            <form.Field
              name="email"
              children={(field) => {
                const hasErrors =
                  Array.isArray(field.state.meta.errors) &&
                  field.state.meta.errors.length > 0;
                const isInvalid =
                  hasErrors ||
                  (field.state.meta.isTouched && !field.state.meta.isValid);
                return (
                  <Field data-invalid={isInvalid}>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="email"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      autoComplete="email"
                      placeholder="Email"
                    />
                    {(hasErrors || isInvalid) && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
            />
            <form.Field
              name="password"
              children={(field) => {
                const hasErrors =
                  Array.isArray(field.state.meta.errors) &&
                  field.state.meta.errors.length > 0;
                const isInvalid =
                  hasErrors ||
                  (field.state.meta.isTouched && !field.state.meta.isValid);
                const pwd = field.state.value;
                const strength = getPasswordStrength(pwd);
                const missing = getPasswordMissingChecks(pwd);
                const showStrength = pwd.length > 0;
                return (
                  <Field data-invalid={isInvalid}>
                    <PasswordInput
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      autoComplete="new-password"
                      placeholder="Mot de passe"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Au moins 12 caractères, une majuscule, une minuscule, un
                      chiffre et un caractère spécial.
                    </p>
                    {showStrength && (
                      <div className="mt-2 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
                            role="progressbar"
                            aria-valuenow={strength.percent}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`Force du mot de passe : ${strength.label || "vide"}`}
                          >
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{
                                width: `${strength.percent}%`,
                                backgroundColor:
                                  strength.level === "weak"
                                    ? "hsl(var(--destructive))"
                                    : strength.level === "medium"
                                      ? "hsl(30, 90%, 50%)"
                                      : "hsl(var(--primary))",
                              }}
                            />
                          </div>
                          {strength.label && (
                            <span
                              className="text-xs font-medium tabular-nums"
                              style={{
                                color:
                                  strength.level === "weak"
                                    ? "hsl(var(--destructive))"
                                    : strength.level === "medium"
                                      ? "hsl(30, 90%, 50%)"
                                      : "hsl(var(--primary))",
                              }}
                            >
                              {strength.label}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    {(hasErrors || isInvalid) && (
                      <>
                        <FieldError errors={field.state.meta.errors} />
                        {missing.length > 0 && (
                          <ul className="mt-1 list-inside list-disc text-xs text-destructive">
                            {missing.map((m) => (
                              <li key={m}>{m}</li>
                            ))}
                          </ul>
                        )}
                      </>
                    )}
                  </Field>
                );
              }}
            />
            <form.Field
              name="passwordConfirm"
              children={(field) => {
                const hasErrors =
                  Array.isArray(field.state.meta.errors) &&
                  field.state.meta.errors.length > 0;
                const isInvalid =
                  hasErrors ||
                  (field.state.meta.isTouched && !field.state.meta.isValid);
                return (
                  <Field data-invalid={isInvalid}>
                    <PasswordInput
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      autoComplete="new-password"
                      placeholder="Confirmation du mot de passe"
                    />
                    {(hasErrors || isInvalid) && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
            />
          </FieldGroup>
          {submitError && (
            <p className="mt-3 rounded-md bg-destructive/15 p-3 text-sm text-destructive">
              {submitError}
            </p>
          )}
          <Button
            type="submit"
            className="mt-4 w-full"
            disabled={showSpinner}
          >
            {showSpinner ? (
              <>
                <Spinner className="size-5 shrink-0" size={20} />
                Inscription...
              </>
            ) : (
              "Créer un compte"
            )}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Déjà un compte ?{" "}
          <Link
            href="/login"
            className="font-medium text-primary underline underline-offset-4 hover:text-primary/90"
          >
            Se connecter
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
