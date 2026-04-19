import React from 'react';
import Button from './Button';

export default function EmptyState({ icon: Icon, message, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
      {Icon ? <Icon className="w-12 h-12 text-gray-300 mb-4" /> : null}
      <p className="text-gray-600 font-medium mb-4 max-w-sm">{message}</p>
      {actionLabel && onAction ? (
        <Button variant="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
