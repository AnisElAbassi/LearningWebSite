import React from 'react';
import { HiOutlineInbox } from 'react-icons/hi';

export default function EmptyState({ icon: Icon = HiOutlineInbox, message = 'No data available', action, actionLabel }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Icon className="w-12 h-12 text-gray-600 mb-3" />
      <p className="text-sm text-gray-500">{message}</p>
      {action && actionLabel && (
        <button onClick={action} className="btn-pg-outline text-sm mt-4">{actionLabel}</button>
      )}
    </div>
  );
}
