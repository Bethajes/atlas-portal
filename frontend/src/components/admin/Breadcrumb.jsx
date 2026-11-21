import React from 'react';
import { ChevronRight } from 'lucide-react';

export default function Breadcrumb({ items = [] }) {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <nav className="flex items-center space-x-2 text-sm text-slate-500">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        
        return (
          <React.Fragment key={index}>
            {index > 0 && (
              <ChevronRight className="w-4 h-4 text-slate-400" />
            )}
            {isLast ? (
              <span className="text-slate-900 font-medium">
                {item.label}
              </span>
            ) : (
              <button
                onClick={item.onClick}
                className="hover:text-brand-600 transition-colors focus:outline-none focus:underline"
              >
                {item.label}
              </button>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
