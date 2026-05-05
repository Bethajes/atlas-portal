import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
  CreditCard,
  GraduationCap,
  TrendingUp,
  CalendarClock,
  ArrowRight,
} from 'lucide-react';
import StudentPortalLayout from '../components/StudentPortalLayout';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [lifecycle, setLifecycle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
    <StudentPortalLayout title={`Welcome, ${displayName}`} subtitle={programLabel}>
      <div className="space-y-6">
        {error && (
          <div className="portal-card p-4 bg-amber-50 border-amber-200 text-amber-900">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 rounded-[1.75rem] bg-slate-200 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <section className="portal-card overflow-hidden p-6 lg:p-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-blue-600">Today&apos;s overview</p>
                  <h2 className="mt-3 text-2xl font-bold text-slate-950">Academic progress at a glance</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                    Your student dashboard helps you stay on track with credits, payments, and registration deadlines.
                  </p>
                </div>
                <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm">
                  {lifecycle?.activeSemester ? `Current term: ${lifecycle.activeSemester.name}` : 'No active term assigned'}
                </div>
              </div>
            </section>

            <div className="grid gap-4 xl:grid-cols-2">
              <div className="portal-card p-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                    <TrendingUp className="w-4 h-4" />
                    Academic progress
                  </div>
                  <span className="portal-badge bg-blue-50 text-blue-600">{lifecycle?.status ? lifecycle.status : 'Active'}</span>
                </div>
                <div className="mt-6">
                  <p className="text-4xl font-extrabold text-slate-950">{lifecycle?.progressPct ?? 0}%</p>
                  <p className="mt-2 text-sm text-slate-500">{lifecycle?.completedCredits ?? 0} / {lifecycle?.requiredCredits ?? '—'} credits completed</p>
                  <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-sky-500 transition-all"
                      style={{ width: `${Math.min(100, lifecycle?.progressPct ?? 0)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="portal-card p-6">
                <div className="flex items-center gap-2 text-slate-500 text-sm font-medium mb-3">
                  <GraduationCap className="w-4 h-4" />
                  Standing
                </div>
                <p className="text-2xl font-semibold text-slate-950">{lifecycle?.academicLevelLabel ?? '—'}</p>
                <p className="mt-2 text-sm text-slate-500">CGPA: {lifecycle?.cgpa != null ? Number(lifecycle.cgpa).toFixed(2) : '—'}</p>
                <p className="mt-4 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
                  {lifecycle?.status?.toLowerCase() ?? 'Status unknown'}
                </p>
              </div>

              <div className="portal-card p-6">
                <div className="flex items-center gap-2 text-slate-500 text-sm font-medium mb-3">
                  <CreditCard className="w-4 h-4" />
                  Payments
                </div>
                <p className="text-xl font-semibold text-slate-950">{lifecycle?.paymentStatus || lifecycle?.payment?.status || 'Review balance'}</p>
                <p className="mt-2 text-sm text-slate-500">View semester invoices, receipts, and payment history.</p>
                <Link
                  to="/payment"
                  className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
                >
                  Open payments <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="portal-card p-6">
                <div className="flex items-center gap-2 text-slate-500 text-sm font-medium mb-3">
                  <CalendarClock className="w-4 h-4" />
                  Registration
                </div>
                {lifecycle?.activeSemester ? (
                  <p className="text-slate-700 text-sm">
                    Active term: <span className="font-semibold text-slate-900">{lifecycle.activeSemester.name}</span>
                  </p>
                ) : (
                  <p className="text-sm text-slate-500">No active semester on file.</p>
                )}
                <p className="mt-3 text-sm text-slate-600">
                  {lifecycle?.registration?.state === 'OPEN'
                    ? 'Registration window is open.'
                    : lifecycle?.registration?.message || 'Registration is not open right now.'}
                </p>
                {!lifecycle?.isGraduated && lifecycle?.canRegister && (
                  <Link
                    to="/registration"
                    className="mt-6 inline-flex rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition"
                  >
                    Register for courses
                  </Link>
                )}
              </div>
            </div>

            <div className="portal-card p-6 bg-slate-950 text-white shadow-xl">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Quick links</h2>
                  <p className="mt-2 text-sm text-slate-300">Go directly to your most important student actions.</p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-200">
                  Student gateway
                </div>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <Link to="/student/profile" className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-white/15">
                  Edit profile
                </Link>
                <Link to="/student/transcript" className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-white/15">
                  Transcript
                </Link>
                <Link to="/payment" className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-white/15">
                  Payments
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </StudentPortalLayout>
  );
}
