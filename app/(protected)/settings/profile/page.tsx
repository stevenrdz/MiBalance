import { ProfileForm } from "@/components/forms/profile-form";
import { Card } from "@/components/ui/card";
import { getProfile } from "@/lib/data/queries";

export default async function ProfilePage() {
  const profile = await getProfile();

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Perfil</h1>
        <p className="text-sm text-ink-600">
          Configura datos básicos de la cuenta para MiBalance EC.
        </p>
      </div>
      <Card>
        <ProfileForm
          initialData={{
            display_name: profile.display_name ?? "",
            monthly_income_goal: profile.monthly_income_goal,
            email: profile.email ?? ""
          }}
        />
      </Card>
    </section>
  );
}

