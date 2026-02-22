import { CategoryForm } from "@/components/forms/category-form";
import { CategoryRowForm } from "@/components/forms/category-row-form";
import { Card } from "@/components/ui/card";
import { getCategories } from "@/lib/data/queries";

export default async function CategoriesPage() {
  const categories = await getCategories(true);
  const incomes = categories.filter((category) => category.type === "INCOME");
  const expenses = categories.filter((category) => category.type === "EXPENSE");

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Categorías</h1>
        <p className="text-sm text-ink-600">
          Crea y administra categorías de ingresos y egresos.
        </p>
      </div>

      <CategoryForm />

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-ink-900">Ingresos</h2>
        {incomes.length ? (
          incomes.map((category) => <CategoryRowForm category={category} key={category.id} />)
        ) : (
          <p className="text-sm text-ink-600">Sin categorías de ingreso.</p>
        )}
      </Card>

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-ink-900">Egresos</h2>
        {expenses.length ? (
          expenses.map((category) => <CategoryRowForm category={category} key={category.id} />)
        ) : (
          <p className="text-sm text-ink-600">Sin categorías de egreso.</p>
        )}
      </Card>
    </section>
  );
}

