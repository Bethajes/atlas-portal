import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  BookOpen,
  User,
  FileText,
  CreditCard,
  LogOut,
  Menu,
  X,
  GraduationCap,
  TrendingUp,
  CalendarClock,
} from 'lucide-react';

const navItems = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, path: '/dashboard' },
  { id: 'registration', label: 'Course registration', icon: BookOpen, path: '/registration' },
  { id: 'profile', label: 'Profile', icon: User, path: '/student/profile' },
  { id: 'transcript', label: 'Transcript', icon: FileText, path: '/student/transcript' },
  { id: 'payment', label: 'Payments', icon: CreditCard, path: '/payment' },
];

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [lifecycle, setLifecycle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/student/lifecycle');
        if (!cancelled) setLifecycle(res.data?.data ?? null);
      } catch (e) {
        if (!cancelled) setError(e.response?.data?.message || 'Could not load your academic summary');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const displayName = user?.name || lifecycle?.studentId || 'Student';
  const programLabel = lifecycle?.program ? `${lifecycle.program.code} — ${lifecycle.program.name}` : 'Not assigned';

  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-800">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-col bg-white border-r border-slate-200 shadow-sm">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-2 text-indigo-600 font-semibold">
            <GraduationCap className="w-7 h-7" />
            <span>Student portal</span>
          </div>
          <p className="text-xs text-slate-500 mt-2 truncate" title={user?.institutionalEmail}>
            {user?.institutionalEmail}
          </p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ id, label, icon: Icon, path }) => (
            <Link
              key={id}
              to={path}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
            >
              <Icon className="w-5 h-5 shrink-0" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-72 max-w-[85vw] bg-white shadow-xl flex flex-col animate-in slide-in-from-left duration-200">
            <div className="p-4 flex items-center justify-between border-b border-slate-100">
              <span className="font-semibold text-slate-800">Menu</span>
              <button type="button" className="p-2 rounded-lg hover:bg-slate-100" onClick={() => setMobileOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {navItems.map(({ id, label, icon: Icon, path }) => (
                <Link
                  key={id}
                  to={path}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-indigo-50 hover:text-indigo-700"
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {label}
                </Link>
              ))}
            </nav>
            <div className="p-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50"
              >
                <LogOut className="w-5 h-5" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200 px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              className="lg:hidden p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-slate-900 truncate">Welcome, {displayName}</h1>
              <p className="text-xs text-slate-500 truncate">{programLabel}</p>
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full space-y-6">
          {error && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-sm px-4 py-3">{error}</div>
          )}

          {loading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-28 rounded-2xl bg-slate-200 animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-500 text-sm font-medium mb-2">
                    <TrendingUp className="w-4 h-4" />
                    Academic progress
                  </div>
                  <p className="text-3xl font-bold text-slate-900">{lifecycle?.progressPct ?? 0}%</p>
                  <p className="text-sm text-slate-500 mt-1">
                    {lifecycle?.completedCredits ?? 0} / {lifecycle?.requiredCredits ?? '—'} credits completed
                  </p>
                  <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all"
                      style={{ width: `${Math.min(100, lifecycle?.progressPct ?? 0)}%` }}
                    />
                  </div>
                </div>

                <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-500 text-sm font-medium mb-2">
                    <GraduationCap className="w-4 h-4" />
                    Standing
                  </div>
                  <p className="text-lg font-semibold text-slate-900">{lifecycle?.academicLevelLabel ?? '—'}</p>
                  <p className="text-sm text-slate-500 mt-1">CGPA: {lifecycle?.cgpa != null ? Number(lifecycle.cgpa).toFixed(2) : '—'}</p>
                  <p className="text-xs text-slate-400 mt-2 capitalize">Status: {lifecycle?.status?.toLowerCase() ?? '—'}</p>
                </div>

                <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm md:col-span-2">
                  <div className="flex items-center gap-2 text-slate-500 text-sm font-medium mb-2">
                    <CalendarClock className="w-4 h-4" />
                    Registration
                  </div>
                  {lifecycle?.activeSemester ? (
                    <p className="text-slate-700 text-sm">
                      Active term: <span className="font-medium">{lifecycle.activeSemester.name}</span>
                    </p>
                  ) : (
                    <p className="text-slate-500 text-sm">No active semester on file.</p>
                  )}
                  <p className="text-sm mt-2 text-slate-600">
                    {lifecycle?.registration?.state === 'OPEN'
                      ? 'Registration window is open.'
                      : lifecycle?.registration?.message || 'Registration is not open right now.'}
                  </p>
                  {!lifecycle?.isGraduated && lifecycle?.canRegister && (
                    <Link
                      to="/registration"
                      className="inline-flex mt-4 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
                    >
                      Register for courses
                    </Link>
                  )}
                </div>
              </div>

              <div className="rounded-2xl bg-indigo-600 text-white p-6 shadow-md">
                <h2 className="text-lg font-semibold mb-2">Quick links</h2>
                <p className="text-indigo-100 text-sm mb-4">Update your profile, view grades, or download your transcript when eligible.</p>
                <div className="flex flex-wrap gap-2">
                  <Link to="/student/profile" className="px-4 py-2 rounded-lg bg-white/15 hover:bg-white/25 text-sm font-medium">
                    Edit profile
                  </Link>
                  <Link to="/student/transcript" className="px-4 py-2 rounded-lg bg-white/15 hover:bg-white/25 text-sm font-medium">
                    Transcript
                  </Link>
                  <Link to="/payment" className="px-4 py-2 rounded-lg bg-white/15 hover:bg-white/25 text-sm font-medium">
                    Payments
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
