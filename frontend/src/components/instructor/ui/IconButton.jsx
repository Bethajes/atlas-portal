export default function IconButton({ as: As = 'button', className = '', children, ...props }) {
  return (
    <As
      className={[
        'inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-slate-700 shadow-sm shadow-slate-200/40 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </As>
  );
}
