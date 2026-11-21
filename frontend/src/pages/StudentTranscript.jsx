import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { FileText, Printer, GraduationCap } from 'lucide-react';
import StudentPortalLayout from '../components/StudentPortalLayout';

export default function StudentTranscript() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/student/transcript');
        if (!cancelled) setData(res.data.data);
      } catch (e) {
        if (!cancelled) {
          setErr(e.response?.data?.message || 'Unable to load transcript');
          toast.error(e.response?.data?.message || 'Transcript unavailable');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <StudentPortalLayout title="Academic transcript" subtitle="Official record of completed coursework">
        <div className="max-w-3xl space-y-4">
          <div className="h-12 rounded-xl bg-slate-200 animate-pulse" />
          <div className="h-[480px] rounded-2xl bg-white border border-slate-200 animate-pulse" />
        </div>
      </StudentPortalLayout>
    );
  }

  if (err || !data) {
    return (
      <StudentPortalLayout title="Academic transcript" subtitle="Official record of completed coursework">
        <div className="max-w-lg bg-white rounded-xl border border-gray-200 p-8 text-center">
          <GraduationCap className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-700 font-medium">{err || 'No data'}</p>
          <Link to="/dashboard" className="inline-flex items-center gap-2 mt-6 text-sm font-semibold text-indigo-700 hover:underline">
            Back to dashboard
          </Link>
        </div>
      </StudentPortalLayout>
    );
  }

  return (
    <StudentPortalLayout
      title="Academic transcript"
      subtitle={`${data.student?.name || 'Student'} · ${(data.cgpa ?? 0).toFixed(2)} CGPA`}
      actions={
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 bg-slate-800 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-slate-900"
        >
          <Printer className="w-4 h-4" />
          <span className="hidden sm:inline">Print</span>
        </button>
      }
    >
      <div className="max-w-3xl print:py-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden print:shadow-none print:border-gray-300">
          <div className="bg-slate-900 text-white px-8 py-8 print:bg-white print:text-gray-900 print:border-b">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 print:text-gray-500 mb-2">{data.institution}</p>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="w-7 h-7 opacity-90 print:text-gray-800" />
              Academic Transcript
            </h1>
            <p className="text-slate-300 text-sm mt-2 print:text-gray-600">Official record of completed coursework</p>
          </div>

          <div className="px-8 py-6 border-b border-gray-100 grid sm:grid-cols-2 gap-6">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Student</p>
              <p className="text-lg font-bold text-gray-900">{data.student?.name}</p>
              <p className="text-sm text-gray-600">{data.student?.studentId}</p>
              <p className="text-xs text-gray-500 mt-1">{data.student?.email}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Award</p>
              <p className="text-lg font-bold text-gray-900">{data.degree?.program}</p>
              <p className="text-sm text-gray-600">{data.degree?.department} · {data.degree?.code}</p>
              {data.graduatedAt && (
                <p className="text-xs text-gray-500 mt-1">
                  Graduated {new Date(data.graduatedAt).toLocaleDateString(undefined, { dateStyle: 'long' })}
                </p>
              )}
            </div>
          </div>

          <div className="px-8 py-4 bg-gray-50 flex justify-between text-sm print:bg-white">
            <span className="text-gray-600">Cumulative GPA</span>
            <span className="font-bold text-gray-900">{(data.cgpa ?? 0).toFixed(2)} / 4.00</span>
          </div>

          <div className="px-8 py-6 space-y-8">
            {(data.terms || []).map((term) => (
              <div key={term.label}>
                <h2 className="text-xs font-bold text-brand-700 uppercase tracking-wider border-b border-brand-100 pb-2 mb-3">
                  {term.label}
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <thead>
                      <tr className="text-[10px] text-gray-400 uppercase tracking-wider">
                        <th className="pb-2 pr-4">Course</th>
                        <th className="pb-2 pr-4">Title</th>
                        <th className="pb-2 w-12 text-center">Cr</th>
                        <th className="pb-2 w-14 text-center">Grade</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {term.courses.map((c, i) => (
                        <tr key={`${c.code}-${i}`}>
                          <td className="py-2 font-mono font-semibold text-gray-800">{c.code}</td>
                          <td className="py-2 text-gray-700">{c.title}</td>
                          <td className="py-2 text-center text-gray-800">{c.credits}</td>
                          <td className="py-2 text-center font-bold text-gray-900">{c.grade || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>

          <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 text-[11px] text-gray-500 print:bg-white">
            This document was generated from the student information system. For verification, contact the Office of the Registrar.
          </div>
        </div>
      </div>
    </StudentPortalLayout>
  );
}
