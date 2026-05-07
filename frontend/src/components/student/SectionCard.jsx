import { createElement } from 'react';

export default function SectionCard({ title, icon, action, children, tone = 'neutral' }) {
  const toneRing = {
    neutral: 'ring-slate-200 dark:ring-slate-700/60',
    info: 'ring-indigo-200/70 dark:ring-indigo-900/40',
    success: 'ring-emerald-200/70 dark:ring-emerald-900/40',
    danger: 'ring-rose-200/70 dark:ring-rose-900/40',
    warning: 'ring-amber-200/70 dark:ring-amber-900/40',
  }[tone];

  const iconWrap = {
    neutral: 'bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-200',
    info: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200',
    success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200',
    danger: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200',
    warning: 'bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
  }[tone];

  return (
    <section className={`rounded-2xl bg-white dark:bg-slate-800 shadow-sm ring-1 ${toneRing || 'ring-slate-200 dark:ring-slate-700/60'}`}>
      <header className="px-5 pt-5 pb-4 flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-700/60">
        <div className="flex items-center gap-3 min-w-0">
          {icon ? (
            <div className={`h-10 w-10 rounded-2xl flex items-center justify-center ${iconWrap || ''}`}>
              {createElement(icon, { className: 'w-5 h-5' })}
            </div>
          ) : null}
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-950 dark:text-slate-50 truncate">{title}</h2>
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

