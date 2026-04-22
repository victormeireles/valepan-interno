'use client';

import { useState, ReactNode } from 'react';

interface AccordionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export default function Accordion({
  title,
  children,
  defaultOpen = false,
  className = '',
}: AccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm sm:rounded-xl ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-3 py-2.5 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset sm:px-5 sm:py-4"
      >
        <span className="text-left text-xs font-semibold text-gray-900 sm:text-sm">{title}</span>
        <span
          className={`material-icons text-gray-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        >
          expand_more
        </span>
      </button>
      {isOpen && (
        <div className="border-t border-gray-100 bg-gray-50 px-3 py-2.5 sm:px-5 sm:py-4">
          {children}
        </div>
      )}
    </div>
  );
}




