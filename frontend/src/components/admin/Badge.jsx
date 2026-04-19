const MAP = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PROBATION: 'bg-amber-50 text-amber-700 border-amber-200',
  SUSPENDED: 'bg-red-50 text-red-700 border-red-200',
  GRADUATED: 'bg-blue-50 text-blue-700 border-blue-200',
  DECLARED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  UNDECLARED: 'bg-amber-50 text-amber-700 border-amber-200',
  INSTRUCTOR: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  ADMIN: 'bg-rose-50 text-rose-700 border-rose-200',
  STAFF: 'bg-purple-50 text-purple-700 border-purple-200',
  STUDENT: 'bg-blue-50 text-blue-700 border-blue-200',
  REGISTRAR: 'bg-teal-50 text-teal-700 border-teal-200',
};

export default function Badge({ status, className = '' }) {
  const s = String(status || '').toUpperCase();
  const cls = MAP[s] || 'bg-gray-50 text-gray-600 border-gray-200';
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${cls} ${className}`}>
      {status}
    </span>
  );
}
