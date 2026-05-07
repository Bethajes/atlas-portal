import { Link, useLocation, useNavigate } from 'react-router-dom';
import { createElement, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  CreditCard,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Bell,
  LogOut,
  Menu,
  Moon,
  Sun,
  User,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../api/axios';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { id: 'registration', label: 'Registration', icon: FileText, path: '/student-registration' },
  { id: 'payments', label: 'Payments', icon: CreditCard, path: '/payment' },
  { id: 'courses', label: 'Courses', icon: BookOpen, path: '/registration' },
  { id: 'profile', label: 'Profile', icon: User, path: '/student/profile' },
];

function NavList({ onNavigate }) {
  const { pathname } = useLocation();

  return (
    <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
      <div className="px-3 pb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
        Student navigation
      </div>
      {navItems.map(({ id, label, icon, path }) => {
        const active = pathname === path || pathname.startsWith(path + '/');
        return (
          <Link
            key={id}
            to={path}
            onClick={onNavigate}
            className={`flex items-center gap-3 px-3 py-3 rounded-2xl text-sm font-medium transition-colors ${
              active
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700/50 dark:hover:text-slate-100'
            }`}
          >
            {createElement(icon, { className: 'w-5 h-5 shrink-0' })}
            <span className="truncate">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function ThemeToggle() {
  const { dark, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700
                 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400
                 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
    >
      {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}

export default function StudentPortalLayout({ children, eyebrow, title, subtitle, actions }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  const signOut = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/users/notifications');
        const data = res.data?.data ?? [];
        if (!cancelled) setNotifications(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setNotifications([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onMouseDown = (e) => {
      if (!notifRef.current) return;
      if (!notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  const markRead = async (id) => {
    try {
      await api.put(`/users/notifications/${id}/read`);
    } catch {
      setNotifications((prev) => prev);
    }
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  };

  const sidebarContent = (
    <>
      <div className="px-6 py-7 border-b border-slate-100 dark:border-slate-700/60">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Student Portal</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.name || 'Student'}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="portal-badge bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
            {user?.role || 'Student'}
          </span>
        </div>
      </div>

      <NavList />

      <div className="mt-auto p-4 border-t border-slate-100 dark:border-slate-700/60 space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Appearance</span>
          <ThemeToggle />
        </div>
        <button
          type="button"
          onClick={signOut}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700
                     bg-white dark:bg-slate-800 px-4 py-3 text-sm font-semibold text-red-600 dark:text-red-400
                     transition hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-72 shrink-0 flex-col bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700/60 shadow-sm fixed top-0 left-0 h-full z-20">
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-white dark:bg-slate-800 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-semibold">
                <GraduationCap className="w-5 h-5 text-blue-600" />
                Menu
              </div>
              <button
                type="button"
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <NavList onNavigate={() => setMobileOpen(false)} />

            <div className="border-t border-slate-200 dark:border-slate-700 p-4 space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Appearance</span>
                <ThemeToggle />
              </div>
              <button
                type="button"
                onClick={signOut}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700
                           bg-white dark:bg-slate-800 px-4 py-3 text-sm font-semibold text-red-600 dark:text-red-400
                           transition hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 min-w-0 lg:ml-72">
        <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-700/60
                           bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm px-4 py-4 shadow-sm">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
            {/* Mobile menu button */}
            <button
              type="button"
              className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 mr-1"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex-1 min-w-0">
              {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600 dark:text-blue-400">{eyebrow}</p> : null}
              <h1 className="text-2xl font-bold text-slate-950 dark:text-slate-50 truncate">{title}</h1>
              {subtitle ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 truncate">{subtitle}</p> : null}
            </div>

            <div className="flex items-center gap-2">
              {actions ? <div className="hidden sm:flex items-center gap-2">{actions}</div> : null}

              <div ref={notifRef} className="relative">
                <button
                  type="button"
                  onClick={() => setNotifOpen((v) => !v)}
                  className="relative flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700
                             bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400
                             hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  aria-label="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 ? (
                    <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-rose-600 text-white text-[10px] leading-4 font-bold text-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  ) : null}
                </button>

                {notifOpen ? (
                  <div className="absolute right-0 mt-2 w-[22rem] max-w-[80vw] overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Notifications</div>
                      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
                      </div>
                    </div>
                    <div className="max-h-72 overflow-auto">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-6 text-sm text-slate-500 dark:text-slate-400">
                          No notifications yet.
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
                          {notifications.slice(0, 6).map((n) => (
                            <button
                              key={n.id}
                              type="button"
                              onClick={() => markRead(n.id)}
                              className={`w-full text-left px-4 py-3 transition ${
                                n.isRead
                                  ? 'hover:bg-slate-50 dark:hover:bg-slate-700/40'
                                  : 'bg-indigo-50/60 dark:bg-indigo-900/20 hover:bg-indigo-50 dark:hover:bg-indigo-900/25'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <span className={`mt-1.5 w-2 h-2 rounded-full ${n.isRead ? 'bg-slate-300 dark:bg-slate-600' : 'bg-indigo-600'}`} />
                                <div className="min-w-0">
                                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                                    {n.title || 'Notification'}
                                  </div>
                                  <div className="mt-0.5 text-xs text-slate-600 dark:text-slate-400 truncate">
                                    {n.message || ''}
                                  </div>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          setNotifOpen(false);
                          navigate('/student/profile');
                        }}
                        className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition"
                      >
                        Account
                      </button>
                      <button
                        type="button"
                        onClick={() => setNotifOpen(false)}
                        className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:text-indigo-800 dark:hover:text-indigo-200 transition"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="hidden sm:flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white text-sm font-bold">
                  {(user?.name || 'S').slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{user?.name || 'Student'}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.role || 'STUDENT'}</div>
                </div>
              </div>

              <ThemeToggle />
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
