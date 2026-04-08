import { useState, useMemo } from 'react';

export default function useTableSort(data, defaultSortBy = null, defaultDir = 'asc') {
  const [sortBy, setSortBy] = useState(defaultSortBy);
  const [sortDir, setSortDir] = useState(defaultDir);

  const onSort = (column) => {
    if (sortBy === column) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDir('asc');
    }
  };

  const sorted = useMemo(() => {
    if (!sortBy || !data) return data || [];
    return [...data].sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      // Handle nested paths like "client.companyName"
      if (sortBy.includes('.')) {
        const parts = sortBy.split('.');
        aVal = parts.reduce((obj, key) => obj?.[key], a);
        bVal = parts.reduce((obj, key) => obj?.[key], b);
      }

      // Nulls last
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      // String comparison
      if (typeof aVal === 'string') {
        const cmp = aVal.localeCompare(bVal, undefined, { sensitivity: 'base' });
        return sortDir === 'asc' ? cmp : -cmp;
      }

      // Number / Date comparison
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortBy, sortDir]);

  return { sorted, sortBy, sortDir, onSort };
}

// Sortable table header helper
export function SortHeader({ label, column, sortBy, sortDir, onSort }) {
  const active = sortBy === column;
  return (
    <th
      onClick={() => onSort(column)}
      className="cursor-pointer select-none hover:text-pg-purple transition-colors"
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active && (
          <span className="text-pg-purple text-[10px]">{sortDir === 'asc' ? '▲' : '▼'}</span>
        )}
      </span>
    </th>
  );
}
