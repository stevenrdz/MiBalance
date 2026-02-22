import { Card } from "@/components/ui/card";

export type DataTableColumn<T> = {
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
};

type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  rows: T[];
  keyExtractor: (row: T) => string;
  emptyMessage?: string;
};

export function DataTable<T>({
  columns,
  rows,
  keyExtractor,
  emptyMessage = "No hay datos para mostrar."
}: DataTableProps<T>) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-ink-100">
          <thead className="bg-ink-50">
            <tr>
              {columns.map((column) => (
                <th
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-500"
                  key={String(column.key)}
                  scope="col"
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100 bg-white">
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-sm text-ink-500" colSpan={columns.length}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr className="hover:bg-ink-50/70" key={keyExtractor(row)}>
                  {columns.map((column) => (
                    <td
                      className="px-4 py-3 text-sm text-ink-700"
                      key={`${keyExtractor(row)}-${String(column.key)}`}
                    >
                      {column.render ? column.render(row) : String(row[column.key as keyof T] ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

