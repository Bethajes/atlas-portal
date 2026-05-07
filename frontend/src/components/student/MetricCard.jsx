import { createElement } from 'react';

const TONE_STYLES = {
  neutral: {
    ring: 'ring-slate-200 dark:ring-slate-700/60',
    icon: 'bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-200',
    value: 'text-slate-950 dark:text-slate-50',
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-700/60 dark:text-slate-200',
  },
  info: {
    ring: 'ring-indigo-200/70 dark:ring-indigo-900/40',
    icon: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200',
    value: 'text-slate-950 dark:text-slate-50',
    badge: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200',
  },
  success: {
    ring: 'ring-emerald-200/70 dark:ring-emerald-900/40',
    icon: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200',
    value: 'text-slate-950 dark:text-slate-50',
    badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200',
  },
  danger: {
    ring: 'ring-rose-200/70 dark:ring-rose-900/40',
    icon: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200',
    value: 'text-slate-950 dark:text-slate-50',
    badge: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200',
  },
  warning: {
    ring: 'ring-amber-200/70 dark:ring-amber-900/40',
    icon: 'bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
    value: 'text-slate-950 dark:text-slate-50',
    badge: 'bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
  },
};

export default function MetricCard({
  icon,
  label,
  value,
  helper,
  badge,
  tone = 'neutral',
}) {
  const styles = TONE_STYLES[tone] ?? TONE_STYLES.neutral;

  return (
    <div className={`rounded-2xl bg-white dark:bg-slate-800 shadow-sm ring-1 ${styles.ring} p-5`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            {label}
          </div>
          <div className={`mt-2 text-2xl font-extrabold tracking-tight ${styles.value} truncate`}>
            {value}
          </div>
          {helper ? (
            <div className="mt-1 text-sm text-slate-600 dark:text-slate-400 truncate">
              {helper}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className={`h-11 w-11 rounded-2xl flex items-center justify-center ${styles.icon}`}>
            {icon ? createElement(icon, { className: 'w-5 h-5' }) : null}
          </div>
          {badge ? (
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${styles.badge}`}>
              {badge}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

