import React from 'react';

/**
 * ResponsiveTable — renders <table> on desktop, card list on mobile.
 *
 * Props:
 *   columns: [{ key, label, render?, className? }]
 *   rows: array of data objects
 *   onRowClick?: (row) => void
 *   keyField: string (default 'id')
 */
export default function ResponsiveTable({ columns, rows, onRowClick, keyField = 'id' }) {
  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block glass-card rounded-xl overflow-x-auto">
        <table className="table-dark">
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col.key} className={col.className}>{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr
                key={row[keyField]}
                onClick={() => onRowClick?.(row)}
                className={onRowClick ? 'cursor-pointer' : ''}
              >
                {columns.map(col => (
                  <td key={col.key} className={col.className}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-8">No data found</p>
        )}
      </div>

      {/* Mobile card list */}
      <div className="md:hidden space-y-3">
        {rows.map(row => (
          <div
            key={row[keyField]}
            onClick={() => onRowClick?.(row)}
            className={`glass-card rounded-xl p-4 ${onRowClick ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''}`}
          >
            {columns.map((col, i) => {
              const value = col.render ? col.render(row) : row[col.key];
              // First column is the "title" — render it larger
              if (i === 0) {
                return (
                  <div key={col.key} className="font-medium text-white mb-2">
                    {value}
                  </div>
                );
              }
              return (
                <div key={col.key} className="flex items-center justify-between py-0.5">
                  <span className="text-xs text-gray-500">{col.label}</span>
                  <span className="text-sm text-gray-300">{value}</span>
                </div>
              );
            })}
          </div>
        ))}
        {rows.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-8">No data found</p>
        )}
      </div>
    </>
  );
}
