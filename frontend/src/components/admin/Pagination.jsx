/** @returns {T[]} */
export function paginatedItems(list, page, pageSize) {
  const p = Math.max(1, page);
  const ps = Math.max(1, pageSize);
  const start = (p - 1) * ps;
  return (list || []).slice(start, start + ps);
}

export function paginatedSlice(list, page, pageSize) {
  const total = list?.length ?? 0;
  const p = Math.max(1, page);
  const ps = Math.max(1, pageSize);
  const start = (p - 1) * ps;
  const slice = (list || []).slice(start, start + ps);
  const startIdx = total === 0 ? 0 : start + 1;
  const endIdx = Math.min(start + slice.length, total);
  return { slice, total, startIdx, endIdx };
}

export default function Pagination({
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = total === 0 ? 0 : (safePage - 1) * pageSize;
  const startIdx = total === 0 ? 0 : start + 1;
  const endIdx = Math.min(start + pageSize, total);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-t border-gray-100 bg-gray-50/50 text-sm">
      <p className="text-gray-600">
        Showing <span className="font-semibold text-gray-900">{startIdx}</span>
        –
        <span className="font-semibold text-gray-900">{endIdx}</span> of{' '}
        <span className="font-semibold text-gray-900">{total}</span>
      </p>
      <div className="flex items-center gap-3 flex-wrap">
        <label className="flex items-center gap-2 text-xs text-gray-500">
          Per page
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="border border-gray-200 rounded-lg px-2 py-1 text-sm bg-white"
          >
            {[10, 20, 50].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => onPageChange(safePage - 1)}
            className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Prev
          </button>
          <span className="text-xs text-gray-600 font-medium px-2">
            Page {safePage} / {totalPages}
          </span>
          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => onPageChange(safePage + 1)}
            className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
