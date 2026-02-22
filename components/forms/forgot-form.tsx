"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { forgotSchema, type ForgotInput } from "@/lib/schemas/auth";
import { createClient } from "@/lib/supabase/browser";

export function ForgotForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const form = useForm<ForgotInput>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" }
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setServerError(null);
    setSuccessMessage(null);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/auth/reset`
    });

    if (error) {
      setServerError(error.message);
      return;
    }

    setSuccessMessage("Revisa tu correo para continuar con la recuperación.");
    form.reset();
  });

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div>
        <label className="mb-1 block text-sm font-medium text-ink-700" htmlFor="email">
          Correo electrónico
        </label>
        <Input id="email" type="email" {...form.register("email")} />
        {form.formState.errors.email && (
          <p className="mt-1 text-xs text-red-600">{form.formState.errors.email.message}</p>
        )}
      </div>

      {serverError && <p className="text-sm text-red-600">{serverError}</p>}
      {successMessage && <p className="text-sm text-brand-700">{successMessage}</p>}

      <Button className="w-full" isLoading={form.formState.isSubmitting} type="submit">
        Enviar enlace de recuperación
      </Button>

      <p className="text-sm text-ink-600">
        <Link className="text-brand-700 hover:text-brand-800" href="/auth/login">
          Volver al login
        </Link>
      </p>
    </form>
  );
}

