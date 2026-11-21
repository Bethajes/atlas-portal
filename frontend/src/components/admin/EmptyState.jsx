import React from 'react';
import Button from './Button';

export default function EmptyState({ icon: Icon, message, actionLabel, onAction, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 ${className}`.trim()}>
      {Icon && (
        <div className="mb-4 p-3 bg-slate-100 rounded-full">
          <Icon className="w-8 h-8 text-slate-400" />
        </div>
      )}
      <p className="text-slate-500 text-center mb-4">{message}</p>
      {actionLabel && onAction && (
        <Button variant="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
