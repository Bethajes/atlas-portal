import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
  BadgeCheck,
  BadgeX,
  BookOpen,
  CalendarDays,
  CreditCard,
  GraduationCap,
  TrendingUp,
  Wallet,
  ArrowRight,
} from 'lucide-react';
import StudentPortalLayout from '../components/StudentPortalLayout';
import MetricCard from '../components/student/MetricCard';
import SectionCard from '../components/student/SectionCard';
import { SkeletonBlock, SkeletonLine } from '../components/student/Skeleton';

function currency(amount) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'ETB',
    maximumFractionDigits: 2,
  }).format(value);
}

function isPaidStatus(status) {
  const raw = String(status || '').toUpperCase();
  return raw === 'PAID' || raw === 'SUCCESS' || raw === 'SUCCESSFUL';
}

function formatGpa(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toFixed(2);
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const [lifecycle, setLifecycle] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [courses, setCourses] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [lifecycleRes, invoicesRes, coursesRes] = await Promise.allSettled([
          api.get('/student/lifecycle'),
          api.get('/payments/my-invoices'),
          api.get('/student/courses'),
        ]);

        if (cancelled) return;

        const issues = [];

        if (lifecycleRes.status === 'fulfilled') {
          setLifecycle(lifecycleRes.value.data?.data ?? null);
        } else {
          setLifecycle(null);
          issues.push('Academic status is unavailable right now.');
        }

        if (invoicesRes.status === 'fulfilled') {
          setInvoices(Array.isArray(invoicesRes.value.data?.invoices) ? invoicesRes.value.data.invoices : []);
        } else {
          setInvoices([]);
          issues.push('Payment summary is unavailable right now.');
        }

        if (coursesRes.status === 'fulfilled') {
          setCourses(coursesRes.value.data?.data ?? null);
        } else {
          setCourses(null);
          issues.push('Courses summary is unavailable right now.');
        }

        setError(issues.join(' '));
      } catch (e) {
        if (!cancelled) setError(e.response?.data?.message || 'Could not load your dashboard');
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
  const activeSemesterName = lifecycle?.activeSemester?.name ?? '—';
  const activeInvoice = invoices.find((inv) => inv.semesterName === activeSemesterName) || invoices[0] || null;
  const hasInvoice = Boolean(activeInvoice);
  const paid = hasInvoice && isPaidStatus(activeInvoice?.status);
  const paymentStatusLabel = !hasInvoice ? '—' : paid ? 'Success' : 'Pending';
  const paymentTone = !hasInvoice ? 'neutral' : paid ? 'success' : 'danger';
  const registrationLabel = !hasInvoice ? '—' : paid ? 'PAID' : 'NOT PAID';
  const balance = !hasInvoice ? null : activeInvoice?.dueAmount ?? 0;
  const headerPaymentLabel = !hasInvoice || paid ? 'View payments' : 'Pay now';
  const headerPaymentClass = !hasInvoice || paid
    ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700/60 dark:text-slate-200 dark:hover:bg-slate-700'
    : 'bg-indigo-600 text-white hover:bg-indigo-700';

  const currentCourses = Array.isArray(courses?.current) ? courses.current : [];
  const courseCards = currentCourses.map((e) => ({
    id: e.id,
    code: e.course?.code ?? '—',
    title: e.course?.title ?? 'Untitled',
    credits: e.course?.credits ?? 0,
    instructor: e.course?.instructor?.user?.name ?? 'TBA',
    semester: e.academicSemester?.name ?? null,
  }));
  const totalCredits = courseCards.reduce((sum, c) => sum + (Number(c.credits) || 0), 0);

  return (
    <StudentPortalLayout
      eyebrow="Student dashboard"
      title={`Welcome, ${displayName}`}
      subtitle={programLabel}
      actions={
        <Link
          to="/payment"
          className={`hidden sm:inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition ${headerPaymentClass}`}
        >
          {headerPaymentLabel} <ArrowRight className="w-4 h-4" />
        </Link>
      }
    >
      <div className="space-y-5">
        {error ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
            <div className="text-sm font-semibold">Couldn’t load everything</div>
            <div className="mt-1 text-sm">{error}</div>
          </div>
        ) : null}

        {loading ? (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <SkeletonBlock key={i} className="h-[120px]" />
              ))}
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <SkeletonBlock className="h-[280px]" />
              <SkeletonBlock className="h-[280px]" />
            </div>
          </>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <MetricCard
                icon={paid ? BadgeCheck : BadgeX}
                label="Registration Status"
                value={registrationLabel}
                helper={
                  !hasInvoice
                    ? 'No invoice issued for the active semester yet.'
                    : paid
                      ? 'You’re cleared for the semester.'
                      : 'Payment required to complete registration.'
                }
                badge={!hasInvoice ? null : paid ? 'Paid' : 'Unpaid'}
                tone={!hasInvoice ? 'neutral' : paid ? 'success' : 'danger'}
              />
              <MetricCard
                icon={CalendarDays}
                label="Current Semester"
                value={activeSemesterName}
                helper={lifecycle?.registration?.state === 'OPEN' ? 'Registration is open.' : lifecycle?.registration?.message || 'Registration not open.'}
                tone="info"
              />
              <MetricCard
                icon={Wallet}
                label="Total Balance"
                value={balance == null ? '—' : currency(balance)}
                helper={activeInvoice?.invoiceNumber ? `Invoice ${activeInvoice.invoiceNumber}` : 'No invoice issued yet.'}
                tone={paymentTone}
              />
            </div>

            <SectionCard
              title="Academic Summary"
              icon={GraduationCap}
              tone="info"
              action={
                <Link
                  to="/student/transcript"
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-700/60 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                >
                  View transcript <ArrowRight className="w-4 h-4" />
                </Link>
              }
            >
              {!lifecycle ? (
                <div className="grid gap-3 sm:grid-cols-3">
                  <SkeletonBlock className="h-20 rounded-xl" />
                  <SkeletonBlock className="h-20 rounded-xl" />
                  <SkeletonBlock className="h-20 rounded-xl" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                          SGPA
                        </div>
                        <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-300" />
                      </div>
                      <div className="mt-2 text-2xl font-extrabold text-slate-950 dark:text-slate-50">
                        {formatGpa(lifecycle.sgpa)}
                      </div>
                      <div className="mt-1 text-sm text-slate-600 dark:text-slate-400 truncate">
                        Current semester
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                          CGPA
                        </div>
                        <GraduationCap className="w-4 h-4 text-indigo-600 dark:text-indigo-300" />
                      </div>
                      <div className="mt-2 text-2xl font-extrabold text-slate-950 dark:text-slate-50">
                        {formatGpa(lifecycle.cgpa)}
                      </div>
                      <div className="mt-1 text-sm text-slate-600 dark:text-slate-400 truncate">
                        Cumulative
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800 p-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                        Level
                      </div>
                      <div className="mt-2 text-lg font-extrabold text-slate-950 dark:text-slate-50 truncate">
                        {lifecycle.academicLevelLabel ?? '—'}
                      </div>
                      <div className="mt-2">
                        <span className="inline-flex items-center rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200 px-3 py-1 text-xs font-bold">
                          {lifecycle.status ?? '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-900/30 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Credit progress
                      </div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {lifecycle.completedCredits ?? 0} / {lifecycle.requiredCredits ?? '—'}
                      </div>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-slate-200 dark:bg-slate-700/60 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-sky-500"
                        style={{ width: `${Math.min(100, Number(lifecycle.progressPct) || 0)}%` }}
                      />
                    </div>
                    <div className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                      {Number.isFinite(Number(lifecycle.progressPct)) ? `${lifecycle.progressPct}% completed` : 'Progress unavailable'}
                    </div>
                  </div>
                </div>
              )}
            </SectionCard>

            <div className="grid gap-4 lg:grid-cols-2">
              <SectionCard
                title="Payments"
                icon={CreditCard}
                tone={paymentTone}
                action={
                  <Link
                    to="/payment"
                    className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition ${
                      !hasInvoice || paid
                        ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700/60 dark:text-slate-200 dark:hover:bg-slate-700'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                  >
                    {!hasInvoice || paid ? 'Open payments' : 'Pay Now'} <ArrowRight className="w-4 h-4" />
                  </Link>
                }
              >
                <div className="flex flex-col gap-4">
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-900/30 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Payment status</div>
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${
                          !hasInvoice
                            ? 'bg-slate-100 text-slate-700 dark:bg-slate-700/60 dark:text-slate-200'
                            : paid
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200'
                        }`}
                      >
                        {paymentStatusLabel}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                          Due amount
                        </div>
                        <div className="mt-1 text-sm font-extrabold text-slate-950 dark:text-slate-50">
                          {activeInvoice ? currency(activeInvoice.dueAmount ?? 0) : '—'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                          Due date
                        </div>
                        <div className="mt-1 text-sm font-semibold text-slate-950 dark:text-slate-50">
                          {activeInvoice?.dueDate ? new Date(activeInvoice.dueDate).toLocaleDateString() : '—'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {!hasInvoice ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-900 dark:border-slate-700/60 dark:bg-slate-900/30 dark:text-slate-100">
                      <div className="text-sm font-bold">No invoice yet</div>
                      <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                        Once your semester invoice is issued, you’ll see your due amount and status here.
                      </div>
                    </div>
                  ) : !paid ? (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-900 dark:border-rose-900/40 dark:bg-rose-900/15 dark:text-rose-100">
                      <div className="text-sm font-bold">Action required</div>
                      <div className="mt-1 text-sm">
                        Settle your semester invoice to unlock full access to registration and services.
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-900/15 dark:text-emerald-100">
                      <div className="text-sm font-bold">You’re all set</div>
                      <div className="mt-1 text-sm">Payments are up to date for the active semester.</div>
                    </div>
                  )}
                </div>
              </SectionCard>

              <SectionCard
                title="Courses Overview"
                icon={BookOpen}
                tone="neutral"
                action={
                  <Link
                    to="/registration"
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-700/60 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                  >
                    Manage courses <ArrowRight className="w-4 h-4" />
                  </Link>
                }
              >
                {!courses ? (
                  <div className="space-y-3">
                    <SkeletonLine className="h-4 w-1/2" />
                    <SkeletonBlock className="h-14 rounded-xl" />
                    <SkeletonBlock className="h-14 rounded-xl" />
                    <SkeletonBlock className="h-14 rounded-xl" />
                  </div>
                ) : courseCards.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-900/30 p-4">
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">No enrolled courses</div>
                    <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                      When you enroll, your courses will appear here with instructor and credit details.
                    </div>
                    <Link
                      to="/registration"
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
                    >
                      Browse courses <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        {courseCards.length} active course{courseCards.length === 1 ? '' : 's'}
                      </div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {totalCredits} credits
                      </div>
                    </div>

                    <div className="divide-y divide-slate-100 dark:divide-slate-700/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 overflow-hidden">
                      {courseCards.slice(0, 6).map((c) => (
                        <div
                          key={c.id}
                          className="flex items-start justify-between gap-4 px-4 py-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200 px-2 py-1 text-xs font-bold">
                                {c.code}
                              </span>
                              <span className="text-sm font-semibold text-slate-950 dark:text-slate-50 truncate">
                                {c.title}
                              </span>
                            </div>
                            <div className="mt-1 text-xs text-slate-600 dark:text-slate-400 truncate">
                              Instructor: {c.instructor}
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <div className="text-sm font-extrabold text-slate-950 dark:text-slate-50">
                              {c.credits}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">credits</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </SectionCard>
            </div>
          </>
        )}
      </div>
    </StudentPortalLayout>
  );
}
