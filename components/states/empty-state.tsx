export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-ink-200 bg-white p-6 text-center text-sm text-ink-600">
      {message}
    </div>
  );
}

