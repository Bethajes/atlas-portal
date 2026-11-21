import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Menu, PanelLeftClose, Search, X } from 'lucide-react';
import IconButton from './ui/IconButton';
import { BrandLogo } from '../BrandLogo';
import { BRAND } from '../../config/brand';

function useClickOutside(ref, onOutside) {
  useEffect(() => {
    const onDown = (e) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) onOutside?.();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [onOutside, ref]);
}

export default function InstructorShell({
  brand = { name: BRAND.shortName, subtitle: 'Instructor Portal' },
  user,
  navItems,
  activeId,
  onNavigate,
  searchValue,
  onSearchChange,
  onSearchClear,
  headerRight,
  rightPanel,
  children,
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const mobileRef = useRef(null);
  useClickOutside(mobileRef, () => setMobileOpen(false));

  const primaryNav = useMemo(() => navItems?.filter((x) => !x.section) || [], [navItems]);
  const sectioned = useMemo(() => {
    const groups = new Map();
    for (const item of navItems || []) {
      const key = item.section || 'Navigation';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    }
    return Array.from(groups.entries());
  }, [navItems]);

  const SidebarInner = ({ dense }) => (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200/70 px-4 py-4">
        <button
          type="button"
          onClick={() => onNavigate?.('dashboard')}
          className="flex min-w-0 items-center gap-3 text-left"
        >
          <BrandLogo showName={!collapsed} logoClassName="h-10 w-10" subtitle={brand.subtitle} />
          {!collapsed && (
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-slate-900">{brand.name}</div>
              <div className="truncate text-[11px] font-medium text-slate-500">{brand.subtitle}</div>
            </div>
          )}
        </button>
        {!dense && (
          <IconButton
            type="button"
            className="hidden lg:inline-flex"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={() => setCollapsed((v) => !v)}
          >
            <PanelLeftClose className={['h-4 w-4 transition', collapsed ? 'rotate-180' : 'rotate-0'].join(' ')} />
          </IconButton>
        )}
      </div>

      <div className={['flex-1 overflow-y-auto px-3 py-4', collapsed ? 'px-2' : ''].join(' ')}>
        {sectioned.map(([section, items]) => (
          <div key={section} className="mb-5">
            {!collapsed && (
              <div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                {section}
              </div>
            )}
            <nav className="space-y-1">
              {items.map(({ id, label, icon: Icon, badge }) => {
                const active = id === activeId;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      onNavigate?.(id);
                      setMobileOpen(false);
                    }}
                    className={[
                      'group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium outline-none transition',
                      active
                        ? 'bg-brand-600 text-white shadow-sm shadow-brand-200/50'
                        : 'text-slate-700 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-brand-500/40',
                      collapsed ? 'justify-center px-2' : '',
                    ].join(' ')}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon className={['h-4 w-4 shrink-0', active ? 'text-white' : 'text-slate-500 group-hover:text-slate-700'].join(' ')} />
                    {!collapsed && <span className="flex-1 truncate text-left">{label}</span>}
                    {!collapsed && badge != null && (
                      <span
                        className={[
                          'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                          active ? 'bg-white/15 text-white' : 'bg-slate-200/70 text-slate-700',
                        ].join(' ')}
                      >
                        {badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-200/70 px-4 py-4">
        <div className={['flex items-center gap-3', collapsed ? 'justify-center' : ''].join(' ')}>
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-slate-900 text-xs font-bold text-white">
            {String(user?.name || 'U')
              .trim()
              .slice(0, 1)
              .toUpperCase()}
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-slate-900">{user?.name || 'Instructor'}</div>
              <div className="truncate text-[11px] font-medium text-slate-500">{user?.institutionalEmail || ' '}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex max-w-[1600px]">
        <aside
          className={[
            'sticky top-0 hidden h-screen shrink-0 border-r border-slate-200/70 bg-white/70 backdrop-blur lg:block',
            collapsed ? 'w-[76px]' : 'w-[280px]',
          ].join(' ')}
        >
          <SidebarInner />
        </aside>

        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" />
            <div ref={mobileRef} className="absolute left-0 top-0 h-full w-[86vw] max-w-[320px] bg-white shadow-2xl">
              <SidebarInner dense />
            </div>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/70 backdrop-blur">
            <div className="flex items-center justify-between gap-3 px-4 py-3 lg:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <IconButton type="button" className="lg:hidden" aria-label="Open navigation" onClick={() => setMobileOpen(true)}>
                  <Menu className="h-4 w-4" />
                </IconButton>

                <div className="flex min-w-0 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm shadow-slate-200/40 focus-within:ring-2 focus-within:ring-sky-500/60">
                  <Search className="h-4 w-4 shrink-0 text-slate-400" />
                  <input
                    value={searchValue || ''}
                    onChange={(e) => onSearchChange?.(e.target.value)}
                    placeholder="Search students, ID, program, section…"
                    className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none"
                    aria-label="Search students"
                  />
                  {searchValue ? (
                    <button
                      type="button"
                      onClick={() => onSearchClear?.()}
                      className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                      aria-label="Clear search"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center gap-2">{headerRight}</div>
            </div>
          </header>

          <div className="flex min-w-0 items-start gap-6 px-4 py-6 lg:px-6">
            <motion.main
              layout
              className="min-w-0 flex-1"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              {children}
            </motion.main>

            {rightPanel ? <aside className="hidden w-[360px] shrink-0 xl:block">{rightPanel}</aside> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

