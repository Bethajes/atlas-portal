import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
  BookOpen, CheckCircle, AlertCircle, Info, GraduationCap,
  Clock, FileText, Award, Lock, RefreshCw, ChevronRight,
  Printer, Calendar, Hash, Layers, Unlock, AlertTriangle, Timer
} from 'lucide-react';

const StatusPill = ({ status }) => {
  const map = {
    DRAFT:     'bg-amber-50 text-amber-700 border-amber-200',
    SUBMITTED: 'bg-blue-50 text-blue-700 border-blue-200',
    APPROVED:  'bg-emerald-50 text-emerald-700 border-emerald-200',
    REJECTED:  'bg-red-50 text-red-700 border-red-200',
  };
  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${map[status] || 'bg-gray-50 text-gray-500 border-gray-200'}`}>
      {status}
    </span>
  );
};

const SkRow = () => (
  <tr className="border-b border-gray-100">
    {[1,2,3,4,5].map(i => (
      <td key={i} className="px-5 py-4">
        <div className="h-3.5 bg-gray-100 rounded animate-pulse" style={{ width: `${40 + i * 10}%` }} />
      </td>
    ))}
  </tr>
);

// ─── Registration state banner ────────────────────────────────
function RegistrationStateBanner({ registration, semester }) {
  if (!registration) return null;
  const { state, message, daysUntilOpen, daysUntilClose } = registration;

  if (state === 'UPCOMING') {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 flex items-start gap-3">
        <Timer className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-bold text-blue-800">Registration Opening Soon</p>
          <p className="text-xs text-blue-700 mt-0.5">{message}</p>
          {semester && (
            <p className="text-[11px] text-blue-600 mt-1">
              Opens: {new Date(semester.registrationStart).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          )}
        </div>
        <div className="text-center bg-blue-100 rounded-xl px-4 py-2 shrink-0">
          <p className="text-2xl font-bold text-blue-700">{daysUntilOpen}</p>
          <p className="text-[10px] text-blue-500 font-bold uppercase tracking-wider">days</p>
        </div>
      </div>
    );
  }

  if (state === 'OPEN') {
    const urgent = daysUntilClose <= 2;
    return (
      <div className={`rounded-xl px-5 py-4 flex items-start gap-3 border ${urgent ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
        <Unlock className={`w-5 h-5 mt-0.5 shrink-0 ${urgent ? 'text-amber-600' : 'text-emerald-600'}`} />
        <div className="flex-1">
          <p className={`text-sm font-bold ${urgent ? 'text-amber-800' : 'text-emerald-800'}`}>
            {urgent ? '⚠ Registration Closing Soon' : 'Registration is Open'}
          </p>
          <p className={`text-xs mt-0.5 ${urgent ? 'text-amber-700' : 'text-emerald-700'}`}>{message}</p>
          {semester && (
            <p className={`text-[11px] mt-1 ${urgent ? 'text-amber-600' : 'text-emerald-600'}`}>
              Closes: {new Date(semester.registrationEnd).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          )}
        </div>
        <div className={`text-center rounded-xl px-4 py-2 shrink-0 ${urgent ? 'bg-amber-100' : 'bg-emerald-100'}`}>
          <p className={`text-2xl font-bold ${urgent ? 'text-amber-700' : 'text-emerald-700'}`}>{daysUntilClose}</p>
          <p className={`text-[10px] font-bold uppercase tracking-wider ${urgent ? 'text-amber-500' : 'text-emerald-500'}`}>days left</p>
        </div>
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

// ─── Registration slip ────────────────────────────────────────
function RegistrationSlip({ draft, data }) {
  const courses = data?.courses ?? [];
  const regDate = draft?.registrationDate || draft?.createdAt;
  return (
    <div className="space-y-5">
      <div className={`rounded-xl border p-4 flex items-start gap-3 ${
        draft.status === 'APPROVED' ? 'bg-emerald-50 border-emerald-200' :
        draft.status === 'REJECTED' ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'
      }`}>
        {draft.status === 'APPROVED' ? <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
          : draft.status === 'REJECTED' ? <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
          : <Clock className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />}
        <div>
          <p className="text-sm font-bold text-gray-900">
            {draft.status === 'APPROVED' && 'Registration Approved — You are fully enrolled'}
            {draft.status === 'SUBMITTED' && 'Registration Submitted — Awaiting Registrar Approval'}
            {draft.status === 'REJECTED' && 'Registration Rejected'}
          </p>
          <p className="text-xs text-gray-600 mt-0.5">
            {draft.status === 'APPROVED' && 'Your enrollment is confirmed. Access all course materials from your dashboard.'}
            {draft.status === 'SUBMITTED' && 'Your registration is under review. You will be notified once processed.'}
            {draft.status === 'REJECTED' && (draft.rejectionReason || 'Please contact the registrar\'s office for details.')}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-slate-800 px-6 py-5 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Atlas Health College</p>
              <h2 className="text-lg font-bold">Course Registration Slip</h2>
              <p className="text-slate-300 text-sm mt-0.5">{data?.semesterLabel}</p>
            </div>
            <div className="text-right">
              <StatusPill status={draft.status} />
              <p className="text-[10px] text-slate-400 mt-2">
                {regDate ? new Date(regDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { Icon: Hash,     label: 'Student ID',    value: data?.student?.studentId || '—' },
              { Icon: BookOpen, label: 'Program',       value: data?.student?.program?.name || '—' },
              { Icon: Calendar, label: 'Academic Year', value: `Year ${data?.student?.currentYear || '—'}` },
              { Icon: Layers,   label: 'Semester',      value: data?.student?.currentSemester || '—' },
            ].map(({ Icon, label, value }) => (
              <div key={label}>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1 mb-0.5">
                  <Icon className="w-3 h-3" />{label}
                </p>
                <p className="text-sm font-semibold text-gray-900 truncate">{value}</p>
              </div>
            ))}
          </div>
        </div>

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
                    <td className="px-5 py-3.5 text-xs text-gray-400">{idx + 1}</td>
                    <td className="px-5 py-3.5"><p className="text-sm font-semibold text-gray-900 leading-tight">{c.title}</p></td>
                    <td className="px-5 py-3.5"><span className="text-xs font-mono font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded">{c.code}</span></td>
                    <td className="px-5 py-3.5 text-xs text-gray-600">{c.instructor}</td>
                    <td className="px-5 py-3.5 text-center text-sm font-bold text-gray-900">{c.credits}</td>
                    <td className="px-5 py-3.5 text-center text-xs text-gray-600">{c.sections?.[0] ? `Sec ${c.sections[0].name}` : 'TBA'}</td>
                    <td className="px-5 py-3.5 text-center">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Registered</span>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Credits</p>
              <p className="text-xl font-bold text-gray-900">{draft.totalCredits} <span className="text-sm font-normal text-gray-500">cr</span></p>
            </div>
            <div className="w-px h-8 bg-gray-200" />
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Courses</p>
              <p className="text-xl font-bold text-gray-900">{courses.length}</p>
            </div>
            <div className="w-px h-8 bg-gray-200" />
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Semester</p>
              <p className="text-sm font-bold text-gray-900">{data?.semester?.name || '—'}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => window.print()}
              className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-xs font-semibold hover:bg-gray-50 transition">
              <Printer className="w-3.5 h-3.5" /> Print Slip
            </button>
            <Link to="/dashboard" className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-blue-800 transition">
              Dashboard <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StudentRegistration() {
  const [loading, setLoading]       = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [data, setData]             = useState(null);
  const [draft, setDraft]           = useState(null);
  const [showSlip, setShowSlip]     = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
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
    } catch { toast.error('Failed to load registration data'); }
    finally { setLoading(false); }
  };

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await api.post('/registration/confirm');
      toast.success('Registration confirmed!');
      await fetchData();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to confirm registration');
    } finally { setConfirming(false); }
  };

  const regState       = data?.registration;
  const eligibility    = data?.registrationEligibility;
  /** Window open AND student eligible (level/standing). */
  const regOpen        = data?.registrationOpen === true;
  const courses     = data?.courses ?? [];
  const required    = courses.filter(c => c.isRequired);
  const electives   = courses.filter(c => !c.isRequired);
  const alreadyAll  = courses.length > 0 && courses.every(c => c.alreadyEnrolled);
  const isRegistered = draft && draft.status !== 'DRAFT';

  if (loading) {
    return (
      <div className="bg-slate-50 min-h-screen p-4 lg:p-8">
        <div className="max-w-5xl mx-auto space-y-5">
          <div className="h-6 bg-gray-200 rounded w-40 animate-pulse" />
          <div className="h-24 bg-white rounded-xl border border-gray-200 animate-pulse" />
          <div className="h-96 bg-white rounded-xl border border-gray-200 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen pb-12">
      <div className="max-w-5xl mx-auto px-4 lg:px-8 pt-6 space-y-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link to="/dashboard" className="hover:text-blue-700 transition font-medium">Dashboard</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-gray-900 font-semibold">Course Registration</span>
        </div>

        {/* Page header */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-700 rounded-xl flex items-center justify-center text-white shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Semester Course Registration</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {data?.semesterLabel || '—'} · {data?.semester?.name || 'No semester configured'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {draft && <StatusPill status={draft.status} />}
            {isRegistered && (
              <button onClick={() => setShowSlip(s => !s)} className="text-xs font-semibold text-blue-700 hover:underline">
                {showSlip ? 'Hide Slip' : 'View Slip'}
              </button>
            )}
            <button onClick={fetchData} className="p-2 rounded-lg hover:bg-gray-100 transition text-gray-400">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Student context bar */}
        {data?.student && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Student ID', value: data.student.studentId },
              { label: 'Program',    value: data.student.program?.code },
              { label: 'Year',       value: `Year ${data.student.currentYear}` },
              { label: 'Semester',   value: data.student.currentSemester },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white rounded-lg border border-gray-200 px-4 py-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
                <p className="text-sm font-bold text-gray-900 mt-0.5">{value || '—'}</p>
              </div>
            ))}
          </div>
        )}

        {eligibility && !eligibility.ok && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-bold text-red-800">Registration not available</p>
              <p className="text-xs text-red-700 mt-0.5">{eligibility.reason}</p>
            </div>
          </div>
        )}

        {/* Time-based registration state banner */}
        <RegistrationStateBanner registration={regState} semester={data?.semester} />

        {/* Slip view */}
        {isRegistered && showSlip && <RegistrationSlip draft={draft} data={data} />}

        {/* Pre-registration view */}
        {!showSlip && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-5">

              {/* Required courses */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-blue-700" />
                    <h2 className="text-sm font-bold text-gray-900">
                      {isRegistered ? 'Registered Courses' : 'Your Curriculum Courses'}
                    </h2>
                    <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{required.length}</span>
                  </div>
                  <span className="text-xs text-gray-500 font-medium">{required.reduce((s, c) => s + c.credits, 0)} credits</span>
                </div>

                {required.length === 0 ? (
                  <div className="p-12 text-center">
                    <GraduationCap className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-gray-700 mb-1">No courses found</p>
                    <p className="text-xs text-gray-400">No curriculum courses are defined for your current year and semester.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50">
                          {['Course', 'Instructor', 'Credits', 'Section', 'Status'].map(h => (
                            <th key={h} className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {required.map(c => (
                          <tr key={c.courseId} className={`transition ${c.alreadyEnrolled ? 'bg-emerald-50/30' : 'hover:bg-blue-50/20'}`}>
                            <td className="px-5 py-3.5">
                              <p className="text-sm font-semibold text-gray-900 leading-tight">{c.title}</p>
                              <p className="text-[10px] text-gray-400 mt-0.5 font-mono">{c.code}</p>
                            </td>
                            <td className="px-5 py-3.5 text-xs text-gray-600 font-medium">{c.instructor}</td>
                            <td className="px-5 py-3.5 text-center text-sm font-bold text-gray-900">{c.credits}</td>
                            <td className="px-5 py-3.5 text-xs text-gray-600">
                              {c.sections?.[0] ? `Sec ${c.sections[0].name} (${c.sections[0].enrolledCount}/${c.sections[0].maxStudents})` : <span className="italic text-gray-400">TBA</span>}
                            </td>
                            <td className="px-5 py-3.5">
                              {c.alreadyEnrolled
                                ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Enrolled</span>
                                : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">Pending</span>
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Electives */}
              {electives.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
                    <Award className="w-4 h-4 text-violet-600" />
                    <h2 className="text-sm font-bold text-gray-900">Elective Courses</h2>
                    <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{electives.length}</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50">
                          {['Course', 'Instructor', 'Credits', 'Status'].map(h => (
                            <th key={h} className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {electives.map(c => (
                          <tr key={c.courseId} className="hover:bg-violet-50/20 transition">
                            <td className="px-5 py-3.5">
                              <p className="text-sm font-semibold text-gray-900">{c.title}</p>
                              <p className="text-[10px] text-gray-400 font-mono">{c.code}</p>
                            </td>
                            <td className="px-5 py-3.5 text-xs text-gray-600">{c.instructor}</td>
                            <td className="px-5 py-3.5 text-center text-sm font-bold text-gray-900">{c.credits}</td>
                            <td className="px-5 py-3.5">
                              {c.alreadyEnrolled
                                ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Enrolled</span>
                                : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200">Elective</span>
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-700" /> Registration Summary
                </h3>
                <div className="space-y-2.5 mb-5">
                  {[
                    { label: 'Program',         value: data?.student?.program?.name || '—' },
                    { label: 'Academic Year',    value: `Year ${data?.student?.currentYear || '—'}` },
                    { label: 'Semester',         value: data?.student?.currentSemester || '—' },
                    { label: 'Required Courses', value: required.length },
                    { label: 'Total Credits',    value: `${data?.totalCredits || 0} cr` },
                    { label: 'Reg. Status',      value: regState?.state || '—' },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <span className="text-xs text-gray-500">{label}</span>
                      <span className={`text-xs font-bold ${label === 'Reg. Status' ? (regState?.state === 'OPEN' ? 'text-emerald-700' : regState?.state === 'UPCOMING' ? 'text-blue-700' : 'text-gray-500') : 'text-gray-900'}`}>{value}</span>
                    </div>
                  ))}
                </div>

                {regOpen && !isRegistered && !alreadyAll && (
                  <button onClick={handleConfirm} disabled={confirming || courses.length === 0}
                    className="w-full flex items-center justify-center gap-2 bg-blue-700 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-800 transition disabled:opacity-50 disabled:cursor-not-allowed">
                    {confirming
                      ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Confirming…</>
                      : <><CheckCircle className="w-4 h-4" />Confirm Registration</>
                    }
                  </button>
                )}
                {!regOpen && regState?.state === 'UPCOMING' && (
                  <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5">
                    <Timer className="w-4 h-4 text-blue-600 shrink-0" />
                    <p className="text-xs text-blue-700 font-medium">Registration not yet open</p>
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
                  <button onClick={() => setShowSlip(true)}
                    className="w-full flex items-center justify-center gap-2 bg-slate-800 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-900 transition">
                    <FileText className="w-4 h-4" /> View Registration Slip
                  </button>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-blue-800 mb-1">How Registration Works</p>
                    <ul className="text-[11px] text-blue-700 space-y-1 leading-relaxed">
                      <li>• Courses are assigned by your program curriculum</li>
                      <li>• Click Confirm during the open window to enroll</li>
                      <li>• Registration is reviewed by the registrar</li>
                      <li>• You will be notified once approved</li>
                    </ul>
                  </div>
                </div>
              </div>

              {data?.semester && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Semester Timeline</h3>
                  <div className="space-y-2">
                    {[
                      { label: 'Semester',        value: data.semester.name },
                      { label: 'Reg. Opens',      value: new Date(data.semester.registrationStart).toLocaleDateString() },
                      { label: 'Reg. Closes',     value: new Date(data.semester.registrationEnd).toLocaleDateString() },
                      { label: 'Drop Deadline',   value: new Date(data.semester.dropDeadline).toLocaleDateString() },
                      { label: 'Semester Ends',   value: new Date(data.semester.endDate).toLocaleDateString() },
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
          </div>
        )}
      </div>
    </div>
  );
}
