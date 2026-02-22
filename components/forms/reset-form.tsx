"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resetSchema, type ResetInput } from "@/lib/schemas/auth";
import { createClient } from "@/lib/supabase/browser";

export function ResetForm() {
  const [sessionReady, setSessionReady] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const searchParams = useSearchParams();

  const form = useForm<ResetInput>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      password: "",
      confirmPassword: ""
    }
  });

  useEffect(() => {
    const initSession = async () => {
      const supabase = createClient();
      const tokenHash = searchParams.get("token_hash");
      const type = searchParams.get("type");

      if (tokenHash && type === "recovery") {
        const { error } = await supabase.auth.verifyOtp({
          type: "recovery",
          token_hash: tokenHash
        });

        if (error) {
          setServerError(error.message);
          return;
        }
      }

      setSessionReady(true);
    };

    void initSession();
  }, [searchParams]);

  const onSubmit = form.handleSubmit(async (values) => {
    setServerError(null);
    setSuccessMessage(null);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: values.password });

    if (error) {
      setServerError(error.message);
      return;
    }

    setSuccessMessage("Tu contraseña fue actualizada. Ya puedes iniciar sesión.");
    form.reset();
  });

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      {!sessionReady && !serverError && (
        <p className="text-sm text-ink-600">Validando enlace de recuperación...</p>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-ink-700" htmlFor="password">
          Nueva contraseña
        </label>
        <Input
          disabled={!sessionReady}
          id="password"
          type="password"
          {...form.register("password")}
        />
        {form.formState.errors.password && (
          <p className="mt-1 text-xs text-red-600">{form.formState.errors.password.message}</p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-ink-700" htmlFor="confirmPassword">
          Confirmar contraseña
        </label>
        <Input
          disabled={!sessionReady}
          id="confirmPassword"
          type="password"
          {...form.register("confirmPassword")}
        />
        {form.formState.errors.confirmPassword && (
          <p className="mt-1 text-xs text-red-600">
            {form.formState.errors.confirmPassword.message}
          </p>
        )}
      </div>

      {serverError && <p className="text-sm text-red-600">{serverError}</p>}
      {successMessage && <p className="text-sm text-brand-700">{successMessage}</p>}

      <Button
        className="w-full"
        disabled={!sessionReady}
        isLoading={form.formState.isSubmitting}
        type="submit"
      >
        Guardar nueva contraseña
      </Button>

      <p className="text-sm text-ink-600">
        <Link className="text-brand-700 hover:text-brand-800" href="/auth/login">
          Ir a login
        </Link>
      </p>
    </form>
  );
}

