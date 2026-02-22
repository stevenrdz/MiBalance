"use client";

import { Input } from "@/components/ui/input";

type DateRangePickerProps = {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
};

export function DateRangePicker({ from, to, onFromChange, onToChange }: DateRangePickerProps) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <label className="text-sm text-ink-700">
        <span className="mb-1 block text-xs font-semibold uppercase text-ink-500">Desde</span>
        <Input type="date" value={from} onChange={(event) => onFromChange(event.target.value)} />
      </label>
      <label className="text-sm text-ink-700">
        <span className="mb-1 block text-xs font-semibold uppercase text-ink-500">Hasta</span>
        <Input type="date" value={to} onChange={(event) => onToChange(event.target.value)} />
      </label>
    </div>
  );
}

