import { useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { BarChart2, Check, Download, UploadCloud } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import Card from './ui/Card';
import Badge from './ui/Badge';
import Skeleton from './ui/Skeleton';

const GRADES = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'F', 'I', 'W'];

function gradeVariant(letter) {
  const g = String(letter || '').toUpperCase();
  if (!g) return 'default';
  if (['A+', 'A', 'A-'].includes(g)) return 'success';
  if (['B+', 'B', 'B-'].includes(g)) return 'info';
  if (['C+', 'C', 'C-'].includes(g)) return 'warning';
  if (['D+', 'D', 'F'].includes(g)) return 'danger';
  return 'default';
}

function parseCsv(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return [];

  const rows = [];
  for (let i = 0; i < lines.length; i += 1) {
    const parts = lines[i]
      .split(',')
      .map((x) => x.trim().replace(/^"|"$/g, ''));
    if (i === 0 && parts.some((p) => /student/i.test(p))) continue;
    const [studentId, letterGrade] = parts;
    if (!studentId) continue;
    rows.push({ studentId, letterGrade: String(letterGrade || '').toUpperCase() });
  }
  return rows;
}

function exportTemplateCsv(enrollments) {
  const header = ['Student ID', 'Letter Grade'];
  const lines = [header.join(',')];
  for (const e of enrollments || []) {
    lines.push([e.student?.studentId, ''].map((v) => `"${v ?? ''}"`).join(','));
  }
  const csv = `${lines.join('\n')}\n`;
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
    download: 'grade-upload-template.csv',
  });
  a.click();
}

export default function GradebookTable({ loading, section, enrollments = [], onAssignGrade }) {
  const [saving, setSaving] = useState({});
  const [uploaded, setUploaded] = useState(null);
  const fileRef = useRef(null);

  const distribution = useMemo(() => {
    const counts = new Map();
    for (const g of GRADES) counts.set(g, 0);
    for (const e of enrollments || []) {
      const lg = String(e?.letterGrade || '').toUpperCase();
      if (counts.has(lg)) counts.set(lg, counts.get(lg) + 1);
    }
    return GRADES.map((g) => ({ grade: g, count: counts.get(g) || 0 })).filter((x) => x.count > 0);
  }, [enrollments]);

  const pendingCount = useMemo(() => (enrollments || []).filter((e) => !e?.letterGrade && String(e?.status || '').toUpperCase() === 'ENROLLED').length, [enrollments]);

  const doAssign = async ({ sectionId, studentId, letterGrade }) => {
    if (!GRADES.includes(letterGrade)) {
      toast.error(`Invalid grade "${letterGrade}"`);
      return;
    }
    const key = `${sectionId}:${studentId}`;
    setSaving((s) => ({ ...s, [key]: true }));
    try {
      await onAssignGrade?.({ sectionId, studentId, letterGrade });
      toast.success('Saved');
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to save grade');
    } finally {
      setSaving((s) => ({ ...s, [key]: false }));
    }
  };

  const applyUpload = async () => {
    const rows = uploaded?.rows || [];
    const byStudentId = new Map((enrollments || []).map((e) => [String(e.student?.studentId || '').trim(), e]));
    const planned = rows
      .map((r) => ({ ...r, enrollment: byStudentId.get(String(r.studentId || '').trim()) }))
      .filter((x) => x.enrollment && GRADES.includes(x.letterGrade));

    if (!planned.length) {
      toast.error('No valid rows found for this section');
      return;
    }

    const ok = await toast.promise(
      (async () => {
        for (const row of planned) {
          await doAssign({
            sectionId: section.id,
            studentId: row.enrollment.studentId,
            letterGrade: row.letterGrade,
          });
        }
      })(),
      { loading: 'Uploading…', success: 'Bulk upload complete', error: 'Bulk upload failed' }
    );
    setUploaded(null);
    return ok;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-base font-semibold text-slate-900">Grades</div>
          <div className="mt-0.5 text-sm font-medium text-slate-500">
            {section ? `${section.course?.code} · Section ${section.name}` : 'Select a section'}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={pendingCount ? 'warning' : 'success'}>{pendingCount ? `${pendingCount} pending` : 'All graded'}</Badge>
          <button
            type="button"
            onClick={() => exportTemplateCsv(enrollments)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm shadow-slate-200/40 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60"
          >
            <Download className="h-4 w-4" />
            CSV Template
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-sm shadow-slate-300/40 transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60"
          >
            <UploadCloud className="h-4 w-4" />
            Bulk Upload
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const text = await file.text();
              const rows = parseCsv(text);
              setUploaded({ fileName: file.name, rows });
              e.target.value = '';
            }}
          />
        </div>
      </div>

      {uploaded ? (
        <Card className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">Ready to import</div>
              <div className="mt-0.5 text-xs font-medium text-slate-500">
                {uploaded.fileName} · {uploaded.rows.length} rows
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setUploaded(null)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm shadow-slate-200/40 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applyUpload}
                className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-sm shadow-slate-300/40 transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60"
              >
                Apply Upload
              </button>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="p-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-900">Grade Distribution</div>
            <BarChart2 className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-3 h-[220px]">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : distribution.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distribution}>
                  <XAxis dataKey="grade" tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip contentStyle={{ borderRadius: 12, borderColor: '#e2e8f0', fontSize: 12 }} />
                  <Bar dataKey="count" fill="#0f172a" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center text-sm font-medium text-slate-500">No grades yet.</div>
            )}
          </div>
        </Card>

        <Card className="overflow-hidden lg:col-span-3">
          <div className="flex items-center justify-between border-b border-slate-200/70 px-4 py-4">
            <div>
              <div className="text-sm font-semibold text-slate-900">Gradebook</div>
              <div className="mt-0.5 text-xs font-medium text-slate-500">Click a cell to update. Saves instantly.</div>
            </div>
            <Badge variant="default">{enrollments.length}</Badge>
          </div>

          <div className="max-h-[520px] overflow-auto">
            <table className="w-full text-left">
              <thead className="sticky top-0 z-10 bg-white">
                <tr className="border-b border-slate-200/70 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Program</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60">
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-4 py-4">
                        <Skeleton className="h-4 w-44" />
                        <Skeleton className="mt-2 h-3 w-20" />
                      </td>
                      <td className="px-4 py-4">
                        <Skeleton className="h-4 w-28" />
                      </td>
                      <td className="px-4 py-4">
                        <Skeleton className="h-6 w-20 rounded-full" />
                      </td>
                      <td className="px-4 py-4">
                        <Skeleton className="h-9 w-24" />
                      </td>
                    </tr>
                  ))
                ) : enrollments.length ? (
                  enrollments.map((e) => {
                    const key = `${section?.id}:${e.studentId}`;
                    const isSaving = Boolean(saving[key]);
                    const lg = String(e.letterGrade || '').toUpperCase();
                    return (
                      <tr key={e.id} className="transition hover:bg-slate-50/70">
                        <td className="px-4 py-4">
                          <div className="text-sm font-semibold text-slate-900">{e.student?.user?.name}</div>
                          <div className="mt-0.5 text-xs font-medium text-slate-500">{e.student?.studentId}</div>
                        </td>
                        <td className="px-4 py-4 text-sm font-medium text-slate-700">{e.student?.program?.name || '—'}</td>
                        <td className="px-4 py-4">
                          <Badge variant={String(e.status || '').toUpperCase() === 'COMPLETED' ? 'success' : 'default'}>
                            {String(e.status || 'ENROLLED')}
                          </Badge>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <select
                              value={lg}
                              onChange={(ev) => doAssign({ sectionId: section.id, studentId: e.studentId, letterGrade: ev.target.value })}
                              className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm shadow-slate-200/40 outline-none transition focus:ring-2 focus:ring-sky-500/60"
                              aria-label={`Set grade for ${e.student?.user?.name || 'student'}`}
                            >
                              <option value="">—</option>
                              {GRADES.map((g) => (
                                <option key={g} value={g}>
                                  {g}
                                </option>
                              ))}
                            </select>
                            <Badge variant={gradeVariant(lg)}>{lg || 'Ungraded'}</Badge>
                            {isSaving ? (
                              <span className="text-xs font-medium text-slate-400">Saving…</span>
                            ) : lg ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                                <Check className="h-4 w-4" />
                                Saved
                              </span>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-16 text-center text-sm font-medium text-slate-500">
                      No students found in this section.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

