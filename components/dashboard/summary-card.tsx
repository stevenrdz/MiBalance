import { Card } from "@/components/ui/card";

type SummaryCardProps = {
  title: string;
  value: string;
  helper?: string;
};

export function SummaryCard({ title, value, helper }: SummaryCardProps) {
  return (
    <Card>
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{title}</p>
      <p className="mt-2 text-2xl font-bold text-ink-900">{value}</p>
      {helper && <p className="mt-1 text-xs text-ink-500">{helper}</p>}
    </Card>
  );
}

