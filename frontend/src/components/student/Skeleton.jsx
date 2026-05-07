export function SkeletonBlock({ className = '' }) {
  return <div className={`animate-pulse rounded-2xl bg-slate-200/70 dark:bg-slate-700/50 ${className}`} />;
}

export function SkeletonLine({ className = '' }) {
  return <div className={`animate-pulse rounded-full bg-slate-200/70 dark:bg-slate-700/50 ${className}`} />;
}

