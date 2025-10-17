import { useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
} from '@tanstack/react-table';
import { ChevronUp, ChevronDown, ChevronsUpDown, CheckCircle, MinusCircle } from 'lucide-react';

// Inlined to resolve import issues
const CATEGORY_COLORS = {
  INJECTION: 'bg-blue-100 text-blue-800',
  BLOW: 'bg-green-100 text-green-800',
  ROTO: 'bg-purple-100 text-purple-800',
  PE_FILM: 'bg-yellow-100 text-yellow-800',
  SHEET: 'bg-red-100 text-red-800',
  PIPE: 'bg-indigo-100 text-indigo-800',
  TUBE_HOSE: 'bg-pink-100 text-pink-800',
  PROFILE: 'bg-orange-100 text-orange-800',
  CABLE: 'bg-teal-100 text-teal-800',
  COMPOUNDER: 'bg-cyan-100 text-cyan-800',
};

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
  onSort,
  currentSort = ''
}) => {

  const getSortState = (columnId) => {
    if (currentSort === columnId) return 'asc';
    if (currentSort === `-${columnId}`) return 'desc';
    return false;
  };

  const handleSort = (columnId) => {
    const currentState = getSortState(columnId);
    let newSort = '';
    if (currentState === false) {
      newSort = columnId;
    } else if (currentState === 'asc') {
      newSort = `-${columnId}`;
    } else {
      newSort = '';
    }
    onSort?.(newSort);
  };

  const columns = useMemo(() => {
    const baseFields = ['company_name', 'category'];
    let dynamicColumns = [];

    if (data.length > 0 && data[0].display_fields && data[0].field_labels) {
      const { display_fields, field_labels } = data[0];

      dynamicColumns = display_fields
        .filter(field => !baseFields.includes(field))
        .map(field => ({
          accessorKey: field,
          header: field_labels[field] || field.replace(/_/g, ' '),
          enableSorting: true,
          minSize: 170,
          cell: ({ row }) => {
            const value = row.original[field];
            if (typeof value === 'boolean') {
              return value
                ? <CheckCircle className="w-5 h-5 text-green-500" />
                : <MinusCircle className="w-5 h-5 text-red-500" />;
            }
             if (field === 'last_updated' && value) {
              return new Date(value).toLocaleDateString();
             }
            return value || '-';
          },
        }));
    }

    return [
      ...(onSelectRecord && onSelectAll ? [{
        id: 'select',
        size: 60,
        minSize: 60,
        maxSize: 60,
        header: () => (
          <input
            type="checkbox"
            checked={data.length > 0 && selectedRecords.size === data.length}
            onChange={onSelectAll}
            className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={selectedRecords.has(row.original.factory_id)}
            onChange={() => onSelectRecord(row.original.factory_id)}
            onClick={(e) => e.stopPropagation()}
            className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
          />
        ),
        enableSorting: false,
      }] : []),
      {
        accessorKey: 'company_name',
        header: 'Company Name',
        minSize: 300,
        cell: ({ row }) => (
          <div className="font-medium text-gray-900 truncate">
            {isGuest ? '████████' : row.original.company_name}
          </div>
        ),
        enableSorting: true,
      },
      {
        accessorKey: 'category',
        header: 'Category',
        size: 180,
        cell: ({ row }) => {
          const category = row.original.category;
          const colorClass = CATEGORY_COLORS[category] || 'bg-gray-100 text-gray-800';
          return (
            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${colorClass}`}>
              {row.original.get_category_display || category}
            </span>
          );
        },
        enableSorting: true,
      },
      ...dynamicColumns,
      ...(showActions ? [{
        id: 'actions',
        header: () => <div className="text-right">Actions</div>,
        size: 100,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2">
            <button onClick={(e) => { e.stopPropagation(); onEdit?.(row.original); }} className="text-blue-600 hover:text-blue-700 p-1" title="Edit">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDelete?.(row.original); }} className="text-red-600 hover:text-red-700 p-1" title="Delete">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
            </button>
          </div>
        ),
        enableSorting: false,
      }] : []),
    ];
  }, [data, isGuest, onSelectRecord, onSelectAll, showActions, onEdit, onDelete, selectedRecords]);

  const sorting = useMemo(() => {
    if (!currentSort) return [];
    const desc = currentSort.startsWith('-');
    const id = desc ? currentSort.substring(1) : currentSort;
    return [{ id, desc }];
  }, [currentSort]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualSorting: true,
    enableRowSelection: true,
  });

  return (
    <div className="relative border rounded-lg overflow-auto h-[70vh]">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50 sticky top-0 z-20">
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => {
                const isSticky = header.column.id === 'select' || header.column.id === 'company_name';
                const canSort = header.column.getCanSort() && header.column.columnDef.enableSorting;
                const sortState = getSortState(header.column.id);

                return (
                  <th
                    key={header.id}
                    className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${canSort ? 'cursor-pointer hover:bg-gray-100' : ''} ${isSticky ? 'sticky bg-gray-50' : ''}`}
                    style={{
                        width: header.column.getSize(),
                        minWidth: header.column.columnDef.minSize,
                        left: header.column.id === 'select' ? 0 : (header.column.id === 'company_name' ? '60px' : undefined),
                        zIndex: isSticky ? 20 : 10
                    }}
                    onClick={() => canSort && handleSort(header.column.id)}
                  >
                    <div className="flex items-center gap-2">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {canSort && (
                        <span>
                          {sortState === 'asc' ? <ChevronUp className="w-4 h-4 text-indigo-600" /> : sortState === 'desc' ? <ChevronDown className="w-4 h-4 text-indigo-600" /> : <ChevronsUpDown className="w-4 h-4 text-gray-400" />}
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
          {table.getRowModel().rows.map((row, index) => (
            <tr
              key={row.id}
              className={`transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-gray-100 cursor-pointer`}
              onClick={() => onRowClick(row.original)}
            >
              {row.getVisibleCells().map(cell => {
                const isSticky = cell.column.id === 'select' || cell.column.id === 'company_name';
                const baseBg = index % 2 === 0 ? 'bg-white' : 'bg-slate-50';
                return (
                    <td
                        key={cell.id}
                        className={`px-6 py-4 whitespace-nowrap ${isSticky ? `sticky ${baseBg}` : ''}`}
                        style={{
                            width: cell.column.getSize(),
                            minWidth: cell.column.columnDef.minSize,
                            left: cell.column.id === 'select' ? 0 : (cell.column.id === 'company_name' ? '60px' : undefined),
                            zIndex: isSticky ? 10 : 1
                        }}
                    >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;

