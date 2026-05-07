import { useMemo, useState } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Activity, BarChart3 } from 'lucide-react';
import Card from './ui/Card';
import Badge from './ui/Badge';

const GRADE_COLORS = {
  A: '#10b981',
  B: '#0ea5e9',
  C: '#f59e0b',
  D: '#f97316',
  F: '#ef4444',
  OTHER: '#64748b',
};

function gradeBucket(letter) {
  const g = String(letter || '').toUpperCase();
  if (!g) return null;
  if (g.startsWith('A')) return 'A';
  if (g.startsWith('B')) return 'B';
  if (g.startsWith('C')) return 'C';
  if (g.startsWith('D')) return 'D';
  if (g.startsWith('F')) return 'F';
  return 'OTHER';
}

function paid(latestPayment) {
  const status = String(latestPayment?.status || '').toUpperCase();
  return Boolean(latestPayment?.isPaid) || ['APPROVED', 'PAID', 'SUCCESS', 'SUCCESSFUL'].includes(status);
}

function readAttendanceSeries(sectionId) {
  if (!sectionId) return [];
  try {
    const raw = localStorage.getItem(`instructorAttendance:${sectionId}`);
    const store = raw ? JSON.parse(raw) : {};
    const days = Object.entries(store || {})
      .map(([date, map]) => {
        const values = Object.values(map || {});
        const total = values.length;
        const present = values.filter(Boolean).length;
        const percent = total ? Math.round((present / total) * 100) : 0;
        return { date, percent };
      })
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));
    return days.slice(-14);
  } catch {
    return [];
  }
}

export default function InstructorAnalytics({ enrollments = [], sections = [] }) {
  const [sectionId, setSectionId] = useState(sections?.[0]?.id || '');

  const gradeDist = useMemo(() => {
    const buckets = { A: 0, B: 0, C: 0, D: 0, F: 0, OTHER: 0 };
    for (const e of enrollments || []) {
      const b = gradeBucket(e?.letterGrade);
      if (!b) continue;
      buckets[b] += 1;
    }
    const data = Object.entries(buckets)
      .map(([k, v]) => ({ name: k === 'OTHER' ? 'Other' : k, value: v, color: GRADE_COLORS[k] }))
      .filter((x) => x.value > 0);
    return data;
  }, [enrollments]);

  const risk = useMemo(() => {
    const byStudent = new Map();
    for (const row of enrollments || []) {
      const sid = row?.student?.id;
      if (!sid) continue;
      if (!byStudent.has(sid)) byStudent.set(sid, row.student);
    }
    let lowGpa = 0;
    let unpaidFees = 0;
    for (const s of byStudent.values()) {
      if (Number(s?.cumulativeGPA) < 2.0) lowGpa += 1;
      if (s?.latestPayment && !paid(s.latestPayment)) unpaidFees += 1;
    }
    return { lowGpa, unpaidFees, total: byStudent.size };
  }, [enrollments]);

  const attendance = useMemo(() => readAttendanceSeries(sectionId), [sectionId]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-base font-semibold text-slate-900">Analytics</div>
          <div className="mt-0.5 text-sm font-medium text-slate-500">Performance insights across your sections.</div>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-500">Attendance section</label>
          <select
            value={sectionId}
            onChange={(e) => setSectionId(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm shadow-slate-200/40 outline-none focus:ring-2 focus:ring-sky-500/60"
          >
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.courseCode} · {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-900">Grade Distribution</div>
            <BarChart3 className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-3 h-[260px]">
            {gradeDist.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={gradeDist} dataKey="value" nameKey="name" outerRadius={95} label>
                    {gradeDist.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, borderColor: '#e2e8f0', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center text-sm font-medium text-slate-500">No grade data yet.</div>
            )}
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-900">Risk Signals</div>
            <Badge variant={risk.total ? 'info' : 'default'}>{risk.total} students</Badge>
          </div>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
              <div className="text-sm font-semibold text-slate-800">Low GPA (&lt; 2.0)</div>
              <Badge variant={risk.lowGpa ? 'danger' : 'success'}>{risk.lowGpa}</Badge>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
              <div className="text-sm font-semibold text-slate-800">Unpaid fees</div>
              <Badge variant={risk.unpaidFees ? 'warning' : 'success'}>{risk.unpaidFees}</Badge>
            </div>
            <div className="text-xs font-medium text-slate-500">
              Attendance risk is tracked from the Attendance tool (local records) until the institution enables server-side attendance.
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-900">Attendance Trend</div>
            <Activity className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-3 h-[260px]">
            {attendance.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={attendance}>
                  <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip contentStyle={{ borderRadius: 12, borderColor: '#e2e8f0', fontSize: 12 }} />
                  <Line type="monotone" dataKey="percent" stroke="#0f172a" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center text-sm font-medium text-slate-500">No attendance data yet.</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

