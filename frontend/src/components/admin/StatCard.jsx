import React from 'react';

export default function StatCard({ label, value, icon: Icon, color, bg, loading = false, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl shadow-card border border-slate-200/80 p-6 ${className}`.trim()}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          {loading ? (
            <div className="animate-pulse bg-slate-200 rounded h-8 w-16 mt-2" />
          ) : (
            <p className="text-3xl font-bold text-slate-900 mt-2">{value}</p>
          )}
        </div>
        {Icon && (
          <div className={`p-3 rounded-lg ${bg || 'bg-brand-50'}`}>
            <Icon className={`w-6 h-6 ${color || 'text-brand-600'}`} />
          </div>
        )}
      </div>
    </div>
  );
}
