import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { CalendarDays, CheckCircle2, Search, ToggleLeft, ToggleRight, Users } from 'lucide-react';
import Card from './ui/Card';
import Badge from './ui/Badge';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function readStore(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeStore(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export default function AttendanceTable({ section, enrollments = [] }) {
  const [date, setDate] = useState(todayIso());
  const [search, setSearch] = useState('');
  const storeKey = section?.id ? `instructorAttendance:${section.id}` : null;

  const [presence, setPresence] = useState({});

  useEffect(() => {
    if (!storeKey) return;
    const store = readStore(storeKey);
    const day = store?.[date] || {};
    const next = {};
    for (const e of enrollments) {
      next[e.studentId] = day[e.studentId] ?? true;
    }
    setPresence(next);
  }, [storeKey, date, enrollments]);

  const saveDay = (nextPresence) => {
    if (!storeKey) return;
    const store = readStore(storeKey);
    const nextStore = { ...store, [date]: nextPresence };
    writeStore(storeKey, nextStore);
  };

  const filtered = useMemo(() => {
    const q = String(search || '').toLowerCase().trim();
    if (!q) return enrollments;
    return enrollments.filter((e) => {
      const name = String(e.student?.user?.name || '').toLowerCase();
      const sid = String(e.student?.studentId || '').toLowerCase();
      return name.includes(q) || sid.includes(q);
    });
  }, [enrollments, search]);

  const presentCount = useMemo(() => Object.values(presence).filter(Boolean).length, [presence]);
  const totalCount = enrollments.length;
  const percent = totalCount ? Math.round((presentCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-base font-semibold text-slate-900">Attendance</div>
          <div className="mt-0.5 text-sm font-medium text-slate-500">
            {section ? `${section.course?.code} · Section ${section.name}` : 'Select a section'}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm shadow-slate-200/40">
            <CalendarDays className="h-4 w-4 text-slate-400" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent text-sm font-semibold text-slate-800 focus:outline-none"
              aria-label="Attendance date"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              const next = {};
              for (const e of enrollments) next[e.studentId] = true;
              setPresence(next);
              saveDay(next);
              toast.success('Marked all present');
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-sm shadow-slate-300/40 transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60"
            disabled={!section || !enrollments.length}
          >
            <CheckCircle2 className="h-4 w-4" />
            Mark All Present
          </button>
          <Badge variant={percent >= 90 ? 'success' : percent >= 75 ? 'warning' : 'danger'}>{percent}% present</Badge>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 px-4 py-4">
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm shadow-slate-200/40 focus-within:ring-2 focus-within:ring-sky-500/60">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student…"
              className="bg-transparent text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none"
              aria-label="Search students in attendance table"
            />
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <Users className="h-4 w-4 text-slate-400" />
            {filtered.length} of {enrollments.length}
          </div>
        </div>

        <div className="max-h-[560px] overflow-auto">
          <table className="w-full text-left">
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="border-b border-slate-200/70 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Present</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60">
              {filtered.length ? (
                filtered.map((e) => {
                  const isPresent = presence[e.studentId] ?? true;
                  return (
                    <tr key={e.id} className="transition hover:bg-slate-50/70">
                      <td className="px-4 py-4">
                        <div className="text-sm font-semibold text-slate-900">{e.student?.user?.name}</div>
                        <div className="mt-0.5 text-xs font-medium text-slate-500">{e.student?.studentId}</div>
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant={String(e.status || '').toUpperCase() === 'ENROLLED' ? 'info' : 'default'}>{String(e.status || 'ENROLLED')}</Badge>
                      </td>
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() => {
                            const next = { ...presence, [e.studentId]: !isPresent };
                            setPresence(next);
                            saveDay(next);
                          }}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm shadow-slate-200/40 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60"
                          aria-label={`Toggle attendance for ${e.student?.user?.name || 'student'}`}
                        >
                          {isPresent ? <ToggleRight className="h-4 w-4 text-emerald-600" /> : <ToggleLeft className="h-4 w-4 text-rose-600" />}
                          {isPresent ? 'Present' : 'Absent'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={3} className="px-4 py-16 text-center text-sm font-medium text-slate-500">
                    No students match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

