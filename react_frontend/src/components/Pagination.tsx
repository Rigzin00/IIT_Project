import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  isLoading?: boolean;
}

export default function Pagination({ page, limit, total, totalPages, onPageChange, onLimitChange, isLoading }: PaginationProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 py-3 px-4 border-t border-[#E5E7EB] bg-white text-[13px] text-[#555555]">
      <div>
        Showing <span className="font-semibold text-[#1F2937]">{total === 0 ? 0 : (page - 1) * limit + 1}</span> to <span className="font-semibold text-[#1F2937]">{Math.min(page * limit, total)}</span> of <span className="font-semibold text-[#1F2937]">{total}</span> entries
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <select 
            value={limit} 
            onChange={e => { onLimitChange(Number(e.target.value)); onPageChange(1); }}
            disabled={isLoading}
            className="border border-[#E5E7EB] rounded px-1 py-0.5 outline-none focus:border-[#C41212] bg-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {[10, 25, 50, 100].map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-1">
          <button onClick={() => onPageChange(1)} disabled={page <= 1 || isLoading} className="p-1 hover:bg-[#F3F4F6] rounded disabled:opacity-50 disabled:cursor-not-allowed text-[#1F2937] transition-colors" title="First Page">
            <ChevronsLeft size={16} />
          </button>
          <button onClick={() => onPageChange(page - 1)} disabled={page <= 1 || isLoading} className="p-1 hover:bg-[#F3F4F6] rounded disabled:opacity-50 disabled:cursor-not-allowed text-[#1F2937] transition-colors" title="Previous Page">
            <ChevronLeft size={16} />
          </button>
          
          <div className="px-2 font-semibold">Page {page} of {totalPages || 1}</div>

          <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages || isLoading} className="p-1 hover:bg-[#F3F4F6] rounded disabled:opacity-50 disabled:cursor-not-allowed text-[#1F2937] transition-colors" title="Next Page">
            <ChevronRight size={16} />
          </button>
          <button onClick={() => onPageChange(totalPages)} disabled={page >= totalPages || isLoading} className="p-1 hover:bg-[#F3F4F6] rounded disabled:opacity-50 disabled:cursor-not-allowed text-[#1F2937] transition-colors" title="Last Page">
            <ChevronsRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
