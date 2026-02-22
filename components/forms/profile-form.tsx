"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { profileSchema, type ProfileInput } from "@/lib/schemas/domain";

type ProfileFormProps = {
  initialData: {
    display_name: string;
    monthly_income_goal: number | null;
    email: string;
  };
};

export function ProfileForm({ initialData }: ProfileFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      display_name: initialData.display_name ?? "",
      monthly_income_goal: initialData.monthly_income_goal ?? 0
    }
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setServerError(null);
    setSuccess(null);
    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(values)
    });
    const json = await response.json();
    if (!response.ok) {
      setServerError(json.error ?? "No se pudo actualizar el perfil.");
      return;
    }
    setSuccess("Perfil actualizado.");
    router.refresh();
  });

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div>
        <label className="mb-1 block text-sm font-medium text-ink-700">Correo</label>
        <Input disabled value={initialData.email} />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-ink-700">Nombre visible</label>
        <Input {...form.register("display_name")} />
        {form.formState.errors.display_name && (
          <p className="mt-1 text-xs text-red-600">{form.formState.errors.display_name.message}</p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-ink-700">
          Meta ingreso mensual (USD)
        </label>
        <Input min="0" step="0.01" type="number" {...form.register("monthly_income_goal")} />
        {form.formState.errors.monthly_income_goal && (
          <p className="mt-1 text-xs text-red-600">
            {form.formState.errors.monthly_income_goal.message}
          </p>
        )}
      </div>

      {serverError && <p className="text-sm text-red-600">{serverError}</p>}
      {success && <p className="text-sm text-brand-700">{success}</p>}

      <Button isLoading={form.formState.isSubmitting} type="submit">
        Guardar cambios
      </Button>
    </form>
  );
}

