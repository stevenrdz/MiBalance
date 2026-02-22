import Link from "next/link";

type PaginationProps = {
  basePath: string;
  page: number;
  pageSize: number;
  total: number;
  query: Record<string, string | undefined>;
};

function withPage(basePath: string, query: Record<string, string | undefined>, page: number) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  params.set("page", String(page));
  return `${basePath}?${params.toString()}`;
}

export function Pagination({ basePath, page, pageSize, total, query }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const prevPage = Math.max(1, page - 1);
  const nextPage = Math.min(totalPages, page + 1);

  return (
    <div className="flex items-center justify-between rounded-xl border border-ink-100 bg-white p-3">
      <p className="text-sm text-ink-600">
        Página {page} de {totalPages}
      </p>
      <div className="flex gap-2">
        <Link
          className="inline-flex items-center justify-center rounded-lg bg-ink-100 px-3 py-1.5 text-sm font-semibold text-ink-800 hover:bg-ink-200"
          href={withPage(basePath, query, prevPage)}
        >
          Anterior
        </Link>
        <Link
          className="inline-flex items-center justify-center rounded-lg bg-ink-100 px-3 py-1.5 text-sm font-semibold text-ink-800 hover:bg-ink-200"
          href={withPage(basePath, query, nextPage)}
        >
          Siguiente
        </Link>
      </div>
    </div>
  );
}
