import { useEffect } from 'react';

export default function Modal({ isOpen, onClose, title, subtitle, accentColor = 'slate', children }) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const accentBar = {
    slate: 'bg-slate-900',
    emerald: 'bg-emerald-600',
    amber: 'bg-amber-600',
    blue: 'bg-blue-600',
    red: 'bg-red-600',
  }[accentColor] || 'bg-slate-900';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`${accentBar} p-6 text-white rounded-t-2xl`}>
          <h3 className="text-xl font-bold">{title}</h3>
          {subtitle ? <p className="text-sm opacity-90 mt-1">{subtitle}</p> : null}
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
