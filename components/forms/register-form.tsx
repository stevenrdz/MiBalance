"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { registerSchema, type RegisterInput } from "@/lib/schemas/auth";
import { createClient } from "@/lib/supabase/browser";

export function RegisterForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: ""
    }
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setServerError(null);
    setSuccessMessage(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/reset`
      }
    });

    if (error) {
      setServerError(error.message);
      return;
    }

    setSuccessMessage(
      "Cuenta creada. Si la confirmación por correo está habilitada, revisa tu bandeja para activar la cuenta."
    );
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

      <div>
        <label className="mb-1 block text-sm font-medium text-ink-700" htmlFor="password">
          Contraseña
        </label>
        <Input id="password" type="password" {...form.register("password")} />
        {form.formState.errors.password && (
          <p className="mt-1 text-xs text-red-600">{form.formState.errors.password.message}</p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-ink-700" htmlFor="confirmPassword">
          Confirmar contraseña
        </label>
        <Input id="confirmPassword" type="password" {...form.register("confirmPassword")} />
        {form.formState.errors.confirmPassword && (
          <p className="mt-1 text-xs text-red-600">
            {form.formState.errors.confirmPassword.message}
          </p>
        )}
      </div>

      {serverError && <p className="text-sm text-red-600">{serverError}</p>}
      {successMessage && <p className="text-sm text-brand-700">{successMessage}</p>}

      <Button className="w-full" isLoading={form.formState.isSubmitting} type="submit">
        Crear cuenta
      </Button>

      <p className="text-sm text-ink-600">
        ¿Ya tienes cuenta?{" "}
        <Link className="text-brand-700 hover:text-brand-800" href="/auth/login">
          Inicia sesión
        </Link>
      </p>
    </form>
  );
}

