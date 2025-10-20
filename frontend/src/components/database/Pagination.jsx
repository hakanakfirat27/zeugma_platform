// frontend/src/components/database/Pagination.jsx
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

const Pagination = ({
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
  onPageSizeChange,
  showFirstLast = true
}) => {
  const pages = [];
  const maxVisiblePages = 5;

  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalCount);

  // Handle page change with event prevention
  const handlePageChange = (e, page) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Pagination: Changing to page', page);
    onPageChange(page);
  };

  // Handle page size change
  const handlePageSizeChange = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const newSize = Number(e.target.value);
    console.log('Pagination: Changing page size to', newSize);
    onPageSizeChange(newSize);
  };

  return (
    <div className="bg-white border-t px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-700">
          Showing <strong>{startItem}</strong> to <strong>{endItem}</strong> of{' '}
          <strong>{totalCount}</strong> results
        </span>

        <select
          value={pageSize}
          onChange={handlePageSizeChange}
          className="border border-gray-300 rounded-lg px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500"
        >
          <option value={10}>10 per page</option>
          <option value={25}>25 per page</option>
          <option value={50}>50 per page</option>
          <option value={100}>100 per page</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        {showFirstLast && (
          <button
            type="button"
            onClick={(e) => handlePageChange(e, 1)}
            disabled={currentPage === 1}
            className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            title="First page"
          >
            <ChevronsLeft className="w-5 h-5" />
          </button>
        )}

        <button
          type="button"
          onClick={(e) => handlePageChange(e, currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Previous page"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {startPage > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => handlePageChange(e, 1)}
              className="px-3 py-1 border rounded-lg hover:bg-gray-50"
            >
              1
            </button>
            {startPage > 2 && <span className="px-2 text-gray-500">...</span>}
          </>
        )}

        {pages.map(page => (
          <button
            key={page}
            type="button"
            onClick={(e) => handlePageChange(e, page)}
            className={`px-3 py-1 border rounded-lg ${
              currentPage === page
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'hover:bg-gray-50'
            }`}
          >
            {page}
          </button>
        ))}

        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="px-2 text-gray-500">...</span>}
            <button
              type="button"
              onClick={(e) => handlePageChange(e, totalPages)}
              className="px-3 py-1 border rounded-lg hover:bg-gray-50"
            >
              {totalPages}
            </button>
          </>
        )}

        <button
          type="button"
          onClick={(e) => handlePageChange(e, currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Next page"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {showFirstLast && (
          <button
            type="button"
            onClick={(e) => handlePageChange(e, totalPages)}
            disabled={currentPage === totalPages}
            className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Last page"
          >
            <ChevronsRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default Pagination;