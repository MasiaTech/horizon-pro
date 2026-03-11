"use client";

/* eslint-disable react/no-children-prop -- TanStack Form uses children as render prop */
import { useForm } from "@tanstack/react-form";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import Logo from "@/components/Logo";
import IconSvgGoogle from "@/resources/icons/icon-svg-google";
import { Field, FieldError, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/PasswordInput";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/Spinner";
import { loginSchema } from "@/lib/authValidation";
import { useEffect, useState } from "react";

/**
 * Formulaire de connexion (client). TanStack Form + Zod, champs sans placeholder,
 * mot de passe avec œil afficher/masquer.
 */
export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/dashboard";
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  /**
   * Au montage : si un utilisateur est déjà connecté, on le détecte et
   * on le redirige directement vers le dashboard (ou redirectTo).
   */
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        router.replace(redirectTo);
      }
    });
  }, [redirectTo, router]);

  /**
   * Lance un flux de connexion Google via Supabase OAuth.
   * Supabase gère la redirection vers Google puis retourne sur l'app.
   */
  const handleGoogleSignIn = async () => {
    setSubmitError(null);
    setOauthLoading(true);
    try {
      const supabase = createClient();
      const origin =
        typeof window !== "undefined" ? window.location.origin : undefined;
      const redirectUrl = origin ? `${origin}${redirectTo}` : redirectTo;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) {
        setSubmitError(
          error.message ||
            "La connexion avec Google a échoué. Merci de réessayer.",
        );
      }
      // En cas de succès, Supabase redirige automatiquement.
    } catch (e) {
      setSubmitError(
        e instanceof Error
          ? e.message
          : "Une erreur inattendue est survenue pendant la connexion Google.",
      );
    } finally {
      setOauthLoading(false);
    }
  };

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    validators: {
      onSubmit: ({ value }) => {
        const result = loginSchema.safeParse(value);
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
        const { error } = await supabase.auth.signInWithPassword({
          email: value.email,
          password: value.password,
        });
        if (error) {
          setSubmitError(error.message);
          return;
        }
        router.push(redirectTo);
        router.refresh();
      } finally {
        setIsLoading(false);
      }
    },
  });

  const showSpinner = isLoading || form.state.isSubmitting;
  const showOauthSpinner = oauthLoading;

  return (
    <div className="w-full max-w-[420px] text-base">
      <Logo size={48} href="/" className="mb-10 block" />
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">
        Connexion
      </h1>
      <p className="mt-2 text-base text-muted-foreground">
        Connectez-vous à votre compte Horizon pour accéder à votre tableau de
        bord.
      </p>

      <div className="mt-10 space-y-5">
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-12 w-full gap-2 text-base border-transparent bg-[#1a73e8] text-white hover:bg-[#1558c0]"
          onClick={handleGoogleSignIn}
          disabled={showOauthSpinner}
        >
          {showOauthSpinner ? (
            <>
              <Spinner className="size-5 shrink-0" size={20} />
              <span className="ml-2">Connexion avec Google...</span>
            </>
          ) : (
            <>
              <IconSvgGoogle className="h-5 w-5" />
              <span>Continuer avec Google</span>
            </>
          )}
        </Button>

        <div className="relative my-7">
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-sm text-muted-foreground">
            ou
          </span>
          <div className="h-px bg-border" />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="space-y-5"
        >
          <FieldGroup>
            <form.Field
              name="email"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
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
                      className="h-12 text-base"
                    />
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
            />
            <form.Field
              name="password"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <PasswordInput
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      autoComplete="current-password"
                      placeholder="Mot de passe"
                      className="h-12 text-base"
                    />
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
            />
          </FieldGroup>
          {submitError && (
            <p className="rounded-md bg-destructive/15 p-3 text-base text-destructive">
              {submitError}
            </p>
          )}
          <Button
            type="submit"
            className="h-12 w-full text-base"
            disabled={showSpinner}
          >
            {showSpinner ? (
              <>
                <Spinner className="size-5 shrink-0" size={20} />
                Connexion...
              </>
            ) : (
              "Se connecter"
            )}
          </Button>
        </form>
      </div>

      <p className="mt-10 text-center text-base text-muted-foreground">
        Pas encore de compte ?{" "}
        <Link
          href="/register"
          className="font-medium text-primary underline underline-offset-4 hover:text-primary/90"
        >
          S&apos;inscrire
        </Link>
      </p>
    </div>
  );
}
