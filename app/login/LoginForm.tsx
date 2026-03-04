"use client";

/* eslint-disable react/no-children-prop -- TanStack Form uses children as render prop */
import { useForm } from "@tanstack/react-form";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
import { loginSchema } from "@/lib/authValidation";
import { useState } from "react";

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

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="flex flex-col items-center gap-3 text-center">
        <Logo size={64} href="/" />
        <CardTitle className="text-2xl">Connexion</CardTitle>
        <CardDescription>Connectez-vous à votre compte Horizon</CardDescription>
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
                Connexion...
              </>
            ) : (
              "Se connecter"
            )}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Pas encore de compte ?{" "}
          <Link
            href="/register"
            className="font-medium text-primary underline underline-offset-4 hover:text-primary/90"
          >
            S&apos;inscrire
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
