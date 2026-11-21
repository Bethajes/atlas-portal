import { createElement, useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import StudentPortalLayout from '../components/StudentPortalLayout';
import {
  BookOpen, CheckCircle, AlertCircle, Info, GraduationCap,
  Clock, FileText, Award, Lock, RefreshCw, ChevronRight,
  Printer, Calendar, Hash, Layers, Unlock, AlertTriangle,
  Timer, TrendingUp, Zap, ChevronDown,
} from 'lucide-react';

// ─── Utilities ────────────────────────────────────────────────

const fmt = (iso, opts = {}) =>
  iso ? new Date(iso).toLocaleDateString('en-US', opts) : '—';

const fmtLong = iso =>
  fmt(iso, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

const fmtShort = iso =>
  fmt(iso, { year: 'numeric', month: 'short', day: 'numeric' });

// ─── StatusPill ───────────────────────────────────────────────

const STATUS_STYLES = {
  DRAFT:     'bg-amber-50 text-amber-700 border-amber-200',
  SUBMITTED: 'bg-brand-50 text-brand-700 border-brand-200',
  APPROVED:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  REJECTED:  'bg-red-50 text-red-700 border-red-200',
};

const StatusPill = ({ status }) => (
  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border select-none ${STATUS_STYLES[status] ?? 'bg-gray-50 text-gray-500 border-gray-200'}`}>
    {status}
  </span>
);

// ─── Skeleton loader ──────────────────────────────────────────

const Pulse = ({ className }) => (
  <div className={`bg-gray-100 rounded animate-pulse ${className}`} />
);

function SkeletonPage() {
  return (
    <div className="max-w-5xl space-y-5 animate-pulse">
      <Pulse className="h-4 w-56" />
      <Pulse className="h-24 rounded-xl" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1,2,3,4].map(i => <Pulse key={i} className="h-16 rounded-lg" />)}
      </div>
      <Pulse className="h-14 rounded-xl" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Pulse className="h-72 rounded-xl" />
          <Pulse className="h-40 rounded-xl" />
        </div>
        <div className="space-y-4">
          <Pulse className="h-56 rounded-xl" />
          <Pulse className="h-28 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

// ─── CountdownBadge ───────────────────────────────────────────

function CountdownBadge({ days, urgent }) {
  return (
    <div className={`text-center rounded-xl px-4 py-2 shrink-0 transition-colors ${
      urgent ? 'bg-amber-100' : days === undefined ? 'bg-brand-100' : 'bg-emerald-100'
    }`}>
      <p className={`text-2xl font-bold tabular-nums ${
        urgent ? 'text-amber-700' : days === undefined ? 'text-brand-700' : 'text-emerald-700'
      }`}>{days ?? '—'}</p>
      <p className={`text-[10px] font-bold uppercase tracking-wider ${
        urgent ? 'text-amber-500' : days === undefined ? 'text-brand-500' : 'text-emerald-500'
      }`}>days{days !== undefined && (urgent ? ' left' : ' away')}</p>
    </div>
  );
}

// ─── RegistrationStateBanner ──────────────────────────────────

function RegistrationStateBanner({ registration, semester }) {
  if (!registration) return null;
  const { state, message, daysUntilOpen, daysUntilClose } = registration;

  if (state === 'UPCOMING') return (
    <div className="bg-brand-50 border border-brand-200 rounded-xl px-5 py-4 flex items-start gap-3">
      <Timer className="w-5 h-5 text-brand-600 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-brand-700">Registration Opening Soon</p>
        <p className="text-xs text-brand-700 mt-0.5">{message}</p>
        {semester?.registrationStart && (
          <p className="text-[11px] text-brand-600 mt-1">Opens: {fmtLong(semester.registrationStart)}</p>
        )}
      </div>
      <CountdownBadge days={daysUntilOpen} />
    </div>
  );

  if (state === 'OPEN') {
    const urgent = daysUntilClose <= 2;
    return (
      <div className={`rounded-xl px-5 py-4 flex items-start gap-3 border ${
        urgent ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'
      }`}>
        {urgent
          ? <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          : <Unlock className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-bold ${urgent ? 'text-amber-800' : 'text-emerald-800'}`}>
            {urgent ? 'Registration Closing Soon' : 'Registration is Open'}
          </p>
          <p className={`text-xs mt-0.5 ${urgent ? 'text-amber-700' : 'text-emerald-700'}`}>{message}</p>
          {semester?.registrationEnd && (
            <p className={`text-[11px] mt-1 ${urgent ? 'text-amber-600' : 'text-emerald-600'}`}>
              Closes: {fmtLong(semester.registrationEnd)}
            </p>
          )}
        </div>
        <CountdownBadge days={daysUntilClose} urgent={urgent} />
      </div>
    );
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl px-5 py-4 flex items-start gap-3">
      <Lock className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
      <div>
        <p className="text-sm font-bold text-gray-700">Registration Closed</p>
        <p className="text-xs text-gray-500 mt-0.5">{message}</p>
      </div>
    </div>
  );
}

// ─── EligibilityBanner ────────────────────────────────────────

function EligibilityBanner({ eligibility }) {
  if (!eligibility || eligibility.ok) return null;
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
      <div>
        <p className="text-sm font-bold text-red-800">Registration Not Available</p>
        <p className="text-xs text-red-700 mt-0.5">{eligibility.reason}</p>
      </div>
    </div>
  );
}

// ─── CreditWarningBanner ──────────────────────────────────────

const MAX_CREDITS = 24; // adjust to match your institution's rule

function CreditWarningBanner({ totalCredits }) {
  if (!totalCredits || totalCredits <= MAX_CREDITS) return null;
  return (
    <div className="bg-orange-50 border border-orange-200 rounded-xl px-5 py-3.5 flex items-center gap-3">
      <AlertCircle className="w-4 h-4 text-orange-600 shrink-0" />
      <p className="text-xs text-orange-800">
        <span className="font-bold">Credit overload:</span> {totalCredits} credits exceeds the {MAX_CREDITS}-credit limit. Please contact your advisor before confirming.
      </p>
    </div>
  );
}

// ─── CourseTable ──────────────────────────────────────────────

const COURSE_COLS = ['Course', 'Instructor', 'Credits', 'Section', 'Status'];

function CourseRow({ c, idx }) {
  return (
    <tr className={`transition-colors ${c.alreadyEnrolled ? 'bg-emerald-50/30' : 'hover:bg-brand-50/20'}`}>
      {idx !== undefined && (
        <td className="px-5 py-3.5 text-xs text-gray-400 tabular-nums">{idx + 1}</td>
      )}
      <td className="px-5 py-3.5">
        <p className="text-sm font-semibold text-gray-900 leading-tight">{c.title}</p>
        <p className="text-[10px] text-gray-400 mt-0.5 font-mono">{c.code}</p>
      </td>
      <td className="px-5 py-3.5 text-xs text-gray-600 font-medium">{c.instructor || '—'}</td>
      <td className="px-5 py-3.5 text-center text-sm font-bold text-gray-900">{c.credits}</td>
      <td className="px-5 py-3.5 text-xs text-gray-600">
        {c.sections?.[0]
          ? <span>{`Sec ${c.sections[0].name}`} <span className="text-gray-400">({c.sections[0].enrolledCount}/{c.sections[0].maxStudents})</span></span>
          : <span className="italic text-gray-400">TBA</span>}
      </td>
      <td className="px-5 py-3.5">
        {c.alreadyEnrolled
          ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Enrolled</span>
          : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">Pending</span>}
      </td>
    </tr>
  );
}

function CourseTable({ title, icon, courses, accentClass, badgeClass, emptyText, collapsible }) {
  const [open, setOpen] = useState(true);
  const totalCredits = courses.reduce((s, c) => s + (c.credits ?? 0), 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <button
        onClick={() => collapsible && setOpen(o => !o)}
        className={`w-full px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 ${collapsible ? 'cursor-pointer hover:bg-gray-100/60 transition' : 'cursor-default'}`}
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-sm font-bold text-gray-900">{title}</h2>
          <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{courses.length}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 font-medium">{totalCredits} credits</span>
          {collapsible && (
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? '' : '-rotate-90'}`} />
          )}
        </div>
      </button>

      {open && (
        courses.length === 0 ? (
          <div className="p-12 text-center">
            <GraduationCap className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-700 mb-1">No courses found</p>
            <p className="text-xs text-gray-400">{emptyText}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {COURSE_COLS.map(h => (
                    <th key={h} className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {courses.map(c => <CourseRow key={c.courseId} c={c} />)}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}

// ─── RegistrationSlip ─────────────────────────────────────────

function RegistrationSlip({ draft, data }) {
  const courses = data?.courses ?? [];
  const regDate = draft?.registrationDate || draft?.createdAt;

  const statusConfig = {
    APPROVED: {
      wrapClass: 'bg-emerald-50 border-emerald-200',
      icon: <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />,
      title: 'Registration Approved — You are fully enrolled',
      desc: 'Your enrollment is confirmed. Access all course materials from your dashboard.',
    },
    SUBMITTED: {
      wrapClass: 'bg-brand-50 border-brand-200',
      icon: <Clock className="w-5 h-5 text-brand-600 mt-0.5 shrink-0" />,
      title: 'Registration Submitted — Awaiting Registrar Approval',
      desc: 'Your registration is under review. You will be notified once processed.',
    },
    REJECTED: {
      wrapClass: 'bg-red-50 border-red-200',
      icon: <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />,
      title: 'Registration Rejected',
      desc: draft?.rejectionReason || "Please contact the registrar's office for details.",
    },
  };
  const cfg = statusConfig[draft.status] ?? statusConfig.SUBMITTED;

  return (
    <div className="space-y-5 print:space-y-3">
      {/* Status alert */}
      <div className={`rounded-xl border p-4 flex items-start gap-3 ${cfg.wrapClass}`}>
        {cfg.icon}
        <div>
          <p className="text-sm font-bold text-gray-900">{cfg.title}</p>
          <p className="text-xs text-gray-600 mt-0.5">{cfg.desc}</p>
        </div>
      </div>

      {/* Slip card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden print:shadow-none print:border-gray-400">
        {/* Header */}
        <div className="bg-slate-800 px-6 py-5 text-white print:bg-slate-800 print:text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">New Generation University College</p>
              <h2 className="text-lg font-bold">Course Registration Slip</h2>
              <p className="text-slate-300 text-sm mt-0.5">{data?.semesterLabel}</p>
            </div>
            <div className="text-right shrink-0">
              <StatusPill status={draft.status} />
              <p className="text-[10px] text-slate-400 mt-2">{fmtShort(regDate)}</p>
            </div>
          </div>
        </div>

        {/* Student meta */}
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { Icon: Hash,      label: 'Student ID',    value: data?.student?.studentId },
              { Icon: BookOpen,  label: 'Program',       value: data?.student?.program?.name },
              { Icon: Calendar,  label: 'Academic Year', value: `Year ${data?.student?.currentYear ?? '—'}` },
              { Icon: Layers,    label: 'Semester',      value: data?.student?.currentSemester },
            ].map(({ Icon, label, value }) => (
              <div key={label}>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1 mb-0.5">
                  {createElement(Icon, { className: 'w-3 h-3' })} {label}
                </p>
                <p className="text-sm font-semibold text-gray-900 truncate">{value || '—'}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Course list */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                {['#', 'Course', 'Code', 'Instructor', 'Cr', 'Section', 'Status'].map(h => (
                  <th key={h} className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {courses.length === 0
                ? <tr><td colSpan="7" className="px-5 py-10 text-center text-sm text-gray-400">No courses found.</td></tr>
                : courses.map((c, idx) => (
                  <tr key={c.courseId} className="hover:bg-gray-50/50 transition">
                    <td className="px-5 py-3.5 text-xs text-gray-400 tabular-nums">{idx + 1}</td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-semibold text-gray-900 leading-tight">{c.title}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-mono font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded">{c.code}</span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-600">{c.instructor || '—'}</td>
                    <td className="px-5 py-3.5 text-center text-sm font-bold text-gray-900">{c.credits}</td>
                    <td className="px-5 py-3.5 text-center text-xs text-gray-600">
                      {c.sections?.[0] ? `Sec ${c.sections[0].name}` : 'TBA'}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Registered</span>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-6">
            {[
              { label: 'Total Credits', value: `${draft.totalCredits ?? 0} cr` },
              { label: 'Courses',       value: courses.length },
              { label: 'Semester',      value: data?.semester?.name ?? '—' },
            ].map(({ label, value }, i, arr) => (
              <div key={label} className="flex items-center gap-6">
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{label}</p>
                  <p className="text-xl font-bold text-gray-900">{value}</p>
                </div>
                {i < arr.length - 1 && <div className="w-px h-8 bg-gray-200" />}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-xs font-semibold hover:bg-gray-50 transition"
            >
              <Printer className="w-3.5 h-3.5" /> Print Slip
            </button>
            <Link
              to="/dashboard"
              className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-blue-800 transition"
            >
              Dashboard <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────

function RegistrationSidebar({
  data, draft, regState, regOpen, isRegistered, alreadyAll, confirming, onConfirm, onViewSlip,
}) {
  const totalCredits = data?.totalCredits ?? 0;
  const overLimit    = totalCredits > MAX_CREDITS;

  return (
    <div className="space-y-4">
      {/* Summary card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4 text-brand-700" /> Registration Summary
        </h3>

        <div className="space-y-2.5 mb-5">
          {[
            { label: 'Program',         value: data?.student?.program?.name },
            { label: 'Academic Year',   value: `Year ${data?.student?.currentYear ?? '—'}` },
            { label: 'Semester',        value: data?.student?.currentSemester },
            { label: 'Required Courses',value: (data?.courses ?? []).filter(c => c.isRequired).length },
            { label: 'Total Credits',   value: `${totalCredits} cr` },
            { label: 'Reg. Status',     value: regState?.state ?? '—' },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <span className="text-xs text-gray-500">{label}</span>
              <span className={`text-xs font-bold ${
                label === 'Reg. Status'
                  ? regState?.state === 'OPEN'     ? 'text-emerald-700'
                  : regState?.state === 'UPCOMING' ? 'text-brand-700'
                  : 'text-gray-500'
                  : label === 'Total Credits' && overLimit ? 'text-orange-600' : 'text-gray-900'
              }`}>{value || '—'}</span>
            </div>
          ))}
        </div>

        {/* Primary action */}
        {regOpen && !isRegistered && !alreadyAll && (
          <button
            onClick={onConfirm}
            disabled={confirming || (data?.courses ?? []).length === 0 || overLimit}
            className="w-full flex items-center justify-center gap-2 bg-blue-700 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-800 active:bg-blue-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
            title={overLimit ? 'Cannot confirm: credit limit exceeded' : undefined}
          >
            {confirming
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Confirming…</>
              : <><CheckCircle className="w-4 h-4" />Confirm Registration</>}
          </button>
        )}
        {!regOpen && regState?.state === 'UPCOMING' && (
          <div className="flex items-center gap-2 bg-brand-50 border border-brand-200 rounded-lg px-3 py-2.5">
            <Timer className="w-4 h-4 text-brand-600 shrink-0" />
            <p className="text-xs text-brand-700 font-medium">Registration not yet open</p>
          </div>
        )}
        {!regOpen && regState?.state === 'CLOSED' && (
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
            <Lock className="w-4 h-4 text-gray-400 shrink-0" />
            <p className="text-xs text-gray-500 font-medium">Registration is closed</p>
          </div>
        )}
        {alreadyAll && !isRegistered && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <p className="text-xs text-emerald-700 font-medium">Already enrolled in all courses</p>
          </div>
        )}
        {isRegistered && (
          <button
            onClick={onViewSlip}
            className="w-full flex items-center justify-center gap-2 bg-slate-800 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-900 transition"
          >
            <FileText className="w-4 h-4" /> View Registration Slip
          </button>
        )}
      </div>

      {/* How it works */}
      <div className="bg-brand-50 border border-brand-200 rounded-xl p-4">
        <div className="flex items-start gap-2.5">
          <Info className="w-4 h-4 text-brand-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-bold text-brand-700 mb-1.5">How Registration Works</p>
            <ul className="text-[11px] text-brand-700 space-y-1 leading-relaxed">
              <li>• Courses are assigned by your program curriculum</li>
              <li>• Click <strong>Confirm</strong> during the open window to enroll</li>
              <li>• Registration is reviewed by the registrar's office</li>
              <li>• You'll be notified once your enrollment is approved</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Semester timeline */}
      {data?.semester && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" /> Semester Timeline
          </h3>
          <div className="space-y-2">
            {[
              { label: 'Semester',      value: data.semester.name },
              { label: 'Reg. Opens',   value: fmtShort(data.semester.registrationStart) },
              { label: 'Reg. Closes',  value: fmtShort(data.semester.registrationEnd) },
              { label: 'Drop Deadline',value: fmtShort(data.semester.dropDeadline) },
              { label: 'Semester Ends',value: fmtShort(data.semester.endDate) },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-xs">
                <span className="text-gray-500">{label}</span>
                <span className="font-semibold text-gray-800">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────

export default function StudentRegistration() {
  const [loading, setLoading]       = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [data, setData]             = useState(null);
  const [draft, setDraft]           = useState(null);
  const [showSlip, setShowSlip]     = useState(false);
  const slipRef                     = useRef(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, dRes] = await Promise.allSettled([
        api.get('/registration/available-courses'),
        api.get('/registration/my-draft'),
      ]);
      if (cRes.status === 'fulfilled') setData(cRes.value.data.data);
      if (dRes.status === 'fulfilled') {
        const d = dRes.value.data.data;
        setDraft(d);
        if (d && d.status !== 'DRAFT') setShowSlip(true);
      }
    } catch {
      toast.error('Failed to load registration data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await api.post('/registration/confirm');
      toast.success('Registration confirmed! Awaiting registrar review.');
      await fetchData();
      // Scroll to slip once shown
      setTimeout(() => slipRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to confirm registration. Please try again.');
    } finally {
      setConfirming(false);
    }
  };

  const handleViewSlip = () => {
    setShowSlip(true);
    setTimeout(() => slipRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  // Derived state
  const regState    = data?.registration;
  const eligibility = data?.registrationEligibility;
  const regOpen     = data?.registrationOpen === true;
  const courses     = data?.courses ?? [];
  const required    = courses.filter(c => c.isRequired);
  const electives   = courses.filter(c => !c.isRequired);
  /** True only when ALL courses across required+elective are already enrolled */
  const alreadyAll  = courses.length > 0 && courses.every(c => c.alreadyEnrolled);
  const isRegistered = !!draft && draft.status !== 'DRAFT';

  if (loading) {
    return (
      <StudentPortalLayout title="Course Registration" subtitle="Loading your registration details…">
        <SkeletonPage />
      </StudentPortalLayout>
    );
  }

  return (
    <StudentPortalLayout
      title="Course Registration"
      subtitle={`${data?.semesterLabel || 'Current term'} · ${data?.semester?.name || 'No semester configured'}`}
      actions={
        <button
          onClick={fetchData}
          className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition text-slate-500"
          aria-label="Refresh registration data"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      }
    >
      <div className="max-w-5xl space-y-6">

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-gray-500">
          <Link to="/dashboard" className="hover:text-brand-700 transition font-medium">Dashboard</Link>
          <ChevronRight className="w-3.5 h-3.5" aria-hidden />
          <span className="text-gray-900 font-semibold" aria-current="page">Course Registration</span>
        </nav>

        {/* Page header */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-700 rounded-xl flex items-center justify-center text-white shrink-0" aria-hidden>
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Semester Course Registration</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {data?.semesterLabel ?? '—'} · {data?.semester?.name ?? 'No semester configured'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {draft && <StatusPill status={draft.status} />}
            {isRegistered && (
              <button
                onClick={() => setShowSlip(s => !s)}
                className="text-xs font-semibold text-brand-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
              >
                {showSlip ? 'Hide Slip' : 'View Slip'}
              </button>
            )}
          </div>
        </div>

        {/* Student context bar */}
        {data?.student && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Student ID', value: data.student.studentId },
              { label: 'Program',    value: data.student.program?.code },
              { label: 'Year',       value: `Year ${data.student.currentYear ?? '—'}` },
              { label: 'Semester',   value: data.student.currentSemester },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white rounded-lg border border-gray-200 px-4 py-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
                <p className="text-sm font-bold text-gray-900 mt-0.5 truncate">{value || '—'}</p>
              </div>
            ))}
          </div>
        )}

        {/* Banners */}
        <EligibilityBanner eligibility={eligibility} />
        <CreditWarningBanner totalCredits={data?.totalCredits} />
        <RegistrationStateBanner registration={regState} semester={data?.semester} />

        {/* Slip */}
        {isRegistered && showSlip && (
          <div ref={slipRef}>
            <RegistrationSlip draft={draft} data={data} />
          </div>
        )}

        {/* Pre-registration / course view */}
        {!showSlip && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-5">
              <CourseTable
                title={isRegistered ? 'Registered Courses' : 'Curriculum Courses'}
                icon={<BookOpen className="w-4 h-4 text-brand-700" />}
                courses={required}
                emptyText="No curriculum courses are defined for your current year and semester."
              />
              {electives.length > 0 && (
                <CourseTable
                  title="Elective Courses"
                  icon={<Award className="w-4 h-4 text-violet-600" />}
                  courses={electives}
                  emptyText="No elective courses available."
                  collapsible
                />
              )}
            </div>

            <RegistrationSidebar
              data={data}
              draft={draft}
              regState={regState}
              regOpen={regOpen}
              isRegistered={isRegistered}
              alreadyAll={alreadyAll}
              confirming={confirming}
              onConfirm={handleConfirm}
              onViewSlip={handleViewSlip}
            />
          </div>
        )}
      </div>
    </StudentPortalLayout>
  );
}