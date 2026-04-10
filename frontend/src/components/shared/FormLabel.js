import React, { useState } from 'react';
import { HiOutlineInformationCircle } from 'react-icons/hi';

export default function FormLabel({ children, hint, required }) {
  const [show, setShow] = useState(false);

  return (
    <label className="label-text flex items-center gap-1.5 relative">
      <span>{children}{required && ' *'}</span>
      {hint && (
        <span
          className="relative"
          onMouseEnter={() => setShow(true)}
          onMouseLeave={() => setShow(false)}
        >
          <HiOutlineInformationCircle className="w-3.5 h-3.5 text-gray-500 hover:text-pg-purple cursor-help transition-colors" />
          {show && (
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-pg-card border border-pg-border rounded-lg text-xs text-gray-300 font-normal normal-case tracking-normal whitespace-normal w-48 shadow-lg z-50 pointer-events-none">
              {hint}
            </span>
          )}
        </span>
      )}
    </label>
  );
}
