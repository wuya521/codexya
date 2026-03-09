"use client";

type PaginationControlsProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemLabel?: string;
};

export function PaginationControls({
  page,
  totalPages,
  onPageChange,
  itemLabel = "内容"
}: PaginationControlsProps) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.25rem] border border-line bg-panel/80 px-4 py-3">
      <p className="text-sm text-muted">
        第 <span className="font-semibold text-ink">{page}</span> /{" "}
        <span className="font-semibold text-ink">{totalPages}</span> 页
        <span className="ml-2">按页整理 {itemLabel}</span>
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          className="button-secondary px-4 py-2"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          上一页
        </button>
        <button
          type="button"
          className="button-secondary px-4 py-2"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          下一页
        </button>
      </div>
    </div>
  );
}
