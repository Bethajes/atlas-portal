import React from 'react';

const STATUS_COLORS = {
  ACTIVE: 'bg-green-100 text-green-800',
  PROBATION: 'bg-amber-100 text-amber-800',
  SUSPENDED: 'bg-red-100 text-red-800',
  GRADUATED: 'bg-blue-100 text-blue-800',
  DECLARED: 'bg-green-100 text-green-800',
  UNDECLARED: 'bg-amber-100 text-amber-800',
  INSTRUCTOR: 'bg-indigo-100 text-indigo-800',
  ADMIN: 'bg-rose-100 text-rose-800',
  STAFF: 'bg-purple-100 text-purple-800',
  PENDING: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-green-100 text-green-800',
  PAID: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
};

export default function Badge({ status, variant, className = '' }) {
  const colorClass = variant || STATUS_COLORS[status] || 'bg-gray-100 text-gray-800';
  
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass} ${className}`.trim()}
    >
      {status}
    </span>
  );
}
