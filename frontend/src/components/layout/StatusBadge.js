import React from 'react';
import { motion } from 'framer-motion';

export default function StatusBadge({ status, color, pulse }) {
  const label = status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  return (
    <span
      className="status-badge"
      style={{
        backgroundColor: `${color}15`,
        color: color,
        border: `1px solid ${color}40`,
      }}
    >
      {pulse && (
        <motion.span
          animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-1.5 h-1.5 rounded-full mr-1.5 inline-block"
          style={{ backgroundColor: color }}
        />
      )}
      {label}
    </span>
  );
}

export function StatusDot({ color, size = 'sm' }) {
  const sizes = { sm: 'w-2 h-2', md: 'w-3 h-3', lg: 'w-4 h-4' };
  return (
    <span
      className={`${sizes[size]} rounded-full inline-block`}
      style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}60` }}
    />
  );
}
