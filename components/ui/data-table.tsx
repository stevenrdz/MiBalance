import { Card } from "@/components/ui/card";

export type DataTableColumn<T> = {
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
  mobileHidden?: boolean;
  mobilePrimary?: boolean;
};

type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  rows: T[];
  keyExtractor: (row: T) => string;
  emptyMessage?: string;
  footer?: React.ReactNode;
};

export function DataTable<T>({
  columns,
  rows,
  keyExtractor,
  emptyMessage = "No hay datos para mostrar.",
  footer
}: DataTableProps<T>) {
  const mobileColumns = columns.filter((column) => !column.mobileHidden);
  const mobilePrimaryColumn =
    mobileColumns.find((column) => column.mobilePrimary) ?? mobileColumns[0] ?? null;
  const mobileDetailColumns = mobileColumns.filter((column) => column !== mobilePrimaryColumn);

  return (
    <Card className="overflow-hidden p-0">
      <div className="divide-y divide-ink-100 md:hidden">
        {rows.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-ink-500">{emptyMessage}</div>
        ) : (
          rows.map((row) => (
            <div className="bg-white px-4 py-3" key={keyExtractor(row)}>
              {mobilePrimaryColumn ? (
                <div className="mb-3 min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-500">
                    {mobilePrimaryColumn.header}
                  </p>
                  <div className="min-w-0 text-sm font-semibold text-ink-900 break-words">
                    {mobilePrimaryColumn.render
                      ? mobilePrimaryColumn.render(row)
                      : String(row[mobilePrimaryColumn.key as keyof T] ?? "")}
                  </div>
                </div>
              ) : null}
              <div className="grid grid-cols-[78px_1fr] gap-x-3 gap-y-1.5">
                {mobileDetailColumns.map((column) => (
                  <div className="contents" key={`${keyExtractor(row)}-${String(column.key)}`}>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-500">
                      {column.header}
                    </p>
                    <div className="min-w-0 text-sm text-ink-700 break-words">
                      {column.render ? column.render(row) : String(row[column.key as keyof T] ?? "")}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
      <div className="hidden overflow-x-auto md:block">
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
      {footer ? <div className="border-t border-ink-100 bg-white px-4 py-3">{footer}</div> : null}
    </Card>
  );
}
