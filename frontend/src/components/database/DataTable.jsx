import { useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
} from '@tanstack/react-table';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { CATEGORY_COLORS } from '../../constants/categories';

const DataTable = ({
  data,
  onRowClick,
  isGuest,
  selectedRecords = new Set(),
  onSelectRecord,
  onSelectAll,
  showActions = false,
  onEdit,
  onDelete,
  onSort, // NEW: Callback to handle sorting
  currentSort = '' // NEW: Current sort state
}) => {
  const [sorting, setSorting] = useState([]);

  // Parse current sort from API format (e.g., "-company_name" or "company_name")
  const getSortState = (columnId) => {
    if (currentSort === columnId) return 'asc';
    if (currentSort === `-${columnId}`) return 'desc';
    return false;
  };

  // Handle sort click
  const handleSort = (columnId) => {
    const currentState = getSortState(columnId);
    let newSort = '';

    if (currentState === false) {
      newSort = columnId; // asc
    } else if (currentState === 'asc') {
      newSort = `-${columnId}`; // desc
    } else {
      newSort = ''; // remove sort
    }

    onSort?.(newSort);
  };

  const columns = [
    // Checkbox column
    ...(onSelectRecord && onSelectAll ? [{
      id: 'select',
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={selectedRecords.size === data.length && data.length > 0}
          onChange={onSelectAll}
          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={selectedRecords.has(row.original.factory_id)}
          onChange={() => onSelectRecord(row.original.factory_id)}
          onClick={(e) => e.stopPropagation()}
          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
      ),
      enableSorting: false,
    }] : []),

    {
      accessorKey: 'company_name',
      header: 'Company Name',
      cell: ({ row }) => (
        <div className="font-medium text-gray-900">
          {isGuest ? '████████' : row.original.company_name}
        </div>
      ),
      enableSorting: true,
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: ({ row }) => {
        const category = row.original.category;
        const colorClass = CATEGORY_COLORS[category] || 'bg-gray-100 text-gray-800';
        return (
          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${colorClass}`}>
            {row.original.get_category_display || category}
          </span>
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: 'country',
      header: 'Country',
      cell: ({ row }) => (
        <div className="text-gray-700">{row.original.country || '-'}</div>
      ),
      enableSorting: true,
    },
    {
      accessorKey: 'last_updated',
      header: 'Last Updated',
      cell: ({ row }) => (
        <div className="text-gray-600 text-sm">
          {row.original.last_updated
            ? new Date(row.original.last_updated).toLocaleDateString()
            : '-'}
        </div>
      ),
      enableSorting: true,
    },

    // Actions column
    ...(showActions ? [{
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.(row.original);
            }}
            className="text-blue-600 hover:text-blue-700 p-1"
            title="Edit"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.(row.original);
            }}
            className="text-red-600 hover:text-red-700 p-1"
            title="Delete"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      ),
      enableSorting: false,
    }] : []),
  ];

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualSorting: true, // Let server handle sorting
  });

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => {
                const canSort = header.column.columnDef.enableSorting !== false && onSort;
                const sortState = canSort ? getSortState(header.column.id) : false;

                return (
                  <th
                    key={header.id}
                    className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                      canSort ? 'cursor-pointer hover:bg-gray-100' : ''
                    }`}
                    onClick={() => canSort && handleSort(header.column.id)}
                  >
                    <div className="flex items-center gap-2">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {canSort && (
                        <span>
                          {sortState === 'asc' ? (
                            <ChevronUp className="w-4 h-4 text-indigo-600" />
                          ) : sortState === 'desc' ? (
                            <ChevronDown className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <ChevronsUpDown className="w-4 h-4 text-gray-400" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {table.getRowModel().rows.map(row => (
            <tr
              key={row.id}
              className="hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => onRowClick(row.original)}
            >
              {row.getVisibleCells().map(cell => (
                <td key={cell.id} className="px-6 py-4 whitespace-nowrap">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;