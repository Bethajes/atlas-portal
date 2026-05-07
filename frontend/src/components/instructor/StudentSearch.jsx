import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, PlusCircle, UserRound, ChevronDown } from 'lucide-react';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import Badge from './ui/Badge';
import Card from './ui/Card';

function normalizeStr(v) {
  return String(v || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function paymentVariant(latestPayment) {
  const status = String(latestPayment?.status || '').toUpperCase();
  const paid = latestPayment?.isPaid || ['APPROVED', 'PAID', 'SUCCESS', 'SUCCESSFUL'].includes(status);
  if (paid) return { label: 'Paid', variant: 'success' };
  if (!status) return { label: 'Unknown', variant: 'default' };
  if (['OVERDUE', 'FAILED', 'REJECTED', 'EXPIRED'].includes(status)) return { label: status, variant: 'danger' };
  if (['PENDING', 'PROCESSING', 'SUBMITTED'].includes(status)) return { label: status, variant: 'warning' };
  return { label: status, variant: 'default' };
}

function riskFrom({ gpa, attendancePct, payment }) {
  const risks = [];
  const g = Number(gpa);
  if (!Number.isNaN(g) && g < 2.0) risks.push({ label: 'Low GPA', variant: 'danger' });
  if (attendancePct != null && Number(attendancePct) < 75) risks.push({ label: 'Low Attendance', variant: 'warning' });
  const status = String(payment?.status || '').toUpperCase();
  const paid = payment?.isPaid || ['APPROVED', 'PAID', 'SUCCESS', 'SUCCESSFUL'].includes(status);
  if (!paid && status) risks.push({ label: 'Unpaid Fees', variant: 'warning' });
  return risks;
}

function highlightParts(text, query) {
  const q = normalizeStr(query);
  if (!q) return [{ t: text, m: false }];
  const s = String(text || '');
  const ns = normalizeStr(s);
  const idx = ns.indexOf(q);
  if (idx < 0) return [{ t: s, m: false }];

  const before = s.slice(0, idx);
  const match = s.slice(idx, idx + q.length);
  const after = s.slice(idx + q.length);
  return [
    ...(before ? [{ t: before, m: false }] : []),
    ...(match ? [{ t: match, m: true }] : []),
    ...(after ? [{ t: after, m: false }] : []),
  ];
}

export default function StudentSearch({
  enrollments = [],
  attendanceByStudentId,
  initialQuery = '',
  queryValue,
  onQueryChange,
  onViewProfile,
  onAddGrade,
  onMessageStudent,
}) {
  const [internalQuery, setInternalQuery] = useState(initialQuery);
  const query = queryValue != null ? queryValue : internalQuery;
  const setQuery = (next) => {
    if (onQueryChange) onQueryChange(next);
    else setInternalQuery(next);
  };
  const debounced = useDebouncedValue(query, 160);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const students = useMemo(() => {
    const byStudentId = new Map();
    for (const row of enrollments || []) {
      const sid = row?.student?.id;
      if (!sid) continue;
      if (!byStudentId.has(sid)) {
        byStudentId.set(sid, {
          student: row.student,
          sections: [],
        });
      }
      byStudentId.get(sid).sections.push({
        sectionId: row.sectionId,
        sectionName: row.sectionName,
        courseId: row.courseId,
        courseCode: row.courseCode,
        courseTitle: row.courseTitle,
      });
    }
    return Array.from(byStudentId.values());
  }, [enrollments]);

  const filtered = useMemo(() => {
    const q = normalizeStr(query);
    if (!q) return students;
    return students.filter(({ student, sections }) => {
      const tokens = [
        student?.name,
        student?.studentId,
        student?.department?.name,
        student?.program?.name,
        ...sections.flatMap((s) => [s.courseCode, s.courseTitle, s.sectionName]),
      ].map(normalizeStr);
      return tokens.some((t) => t.includes(q));
    });
  }, [query, students]);

  const suggestions = useMemo(() => {
    const q = normalizeStr(debounced);
    if (!q) return [];
    return filtered.slice(0, 8);
  }, [debounced, filtered]);

  useEffect(() => {
    if (!debounced) setOpen(false);
    else setOpen(true);
  }, [debounced]);

  useEffect(() => {
    setActiveIndex(0);
  }, [debounced]);

  const openProfileFromIndex = (idx) => {
    const item = suggestions[idx] || filtered[idx];
    if (!item) return;
    onViewProfile?.(item);
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
      listRef.current?.querySelector(`[data-idx="${Math.min(activeIndex + 1, suggestions.length - 1)}"]`)?.scrollIntoView({ block: 'nearest' });
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
      listRef.current?.querySelector(`[data-idx="${Math.max(activeIndex - 1, 0)}"]`)?.scrollIntoView({ block: 'nearest' });
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      openProfileFromIndex(activeIndex);
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div className="w-full">
      <div className="relative">
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm shadow-slate-200/40 focus-within:ring-2 focus-within:ring-sky-500/60">
          <UserRound className="h-4 w-4 text-slate-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => query && setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder="Search by name, ID, department, program, course, section…"
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none"
            aria-label="Student search"
            role="combobox"
            aria-expanded={open}
            aria-controls="student-search-suggestions"
            aria-autocomplete="list"
          />
          <ChevronDown className={['h-4 w-4 text-slate-400 transition', open ? 'rotate-180' : 'rotate-0'].join(' ')} />
        </div>

        <AnimatePresence>
          {open && suggestions.length > 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.16 }}
              className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/70"
              id="student-search-suggestions"
              role="listbox"
            >
              <div ref={listRef} className="max-h-[360px] overflow-y-auto p-2">
                {suggestions.map((item, idx) => {
                  const att = attendanceByStudentId?.[item.student?.id];
                  const pay = paymentVariant(item.student?.latestPayment);
                  return (
                    <button
                      key={item.student?.id}
                      type="button"
                      data-idx={idx}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => openProfileFromIndex(idx)}
                      className={[
                        'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition',
                        idx === activeIndex ? 'bg-slate-900 text-white' : 'hover:bg-slate-100',
                      ].join(' ')}
                      role="option"
                      aria-selected={idx === activeIndex}
                    >
                      <div
                        className={[
                          'grid h-9 w-9 place-items-center rounded-xl text-xs font-bold',
                          idx === activeIndex ? 'bg-white/15 text-white' : 'bg-slate-900 text-white',
                        ].join(' ')}
                      >
                        {String(item.student?.name || 'S')
                          .trim()
                          .slice(0, 1)
                          .toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">
                          {highlightParts(item.student?.name || 'Unknown', debounced).map((p, i) => (
                            <span
                              key={i}
                              className={p.m ? (idx === activeIndex ? 'underline decoration-white/60' : 'text-sky-700') : undefined}
                            >
                              {p.t}
                            </span>
                          ))}
                        </div>
                        <div className={['truncate text-[11px] font-medium', idx === activeIndex ? 'text-white/70' : 'text-slate-500'].join(' ')}>
                          {item.student?.studentId} · {item.student?.program?.name || '—'} · {item.student?.department?.name || '—'}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {att != null ? (
                          <Badge variant={idx === activeIndex ? 'default' : 'teal'} className={idx === activeIndex ? 'bg-white/15 text-white ring-white/20' : ''}>
                            {Math.round(att)}% Att
                          </Badge>
                        ) : null}
                        <Badge variant={idx === activeIndex ? 'default' : pay.variant} className={idx === activeIndex ? 'bg-white/15 text-white ring-white/20' : ''}>
                          {pay.label}
                        </Badge>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <div className="mt-5">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">Students</div>
            <div className="text-xs font-medium text-slate-500">{filtered.length} results</div>
          </div>
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setOpen(false);
                inputRef.current?.focus();
              }}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60"
            >
              Clear
            </button>
          ) : null}
        </div>

        {filtered.length === 0 ? (
          <Card className="p-10 text-center">
            <div className="text-sm font-semibold text-slate-800">No students found</div>
            <div className="mt-1 text-xs font-medium text-slate-500">Try a different name, ID, program, or section.</div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.slice(0, 60).map(({ student, sections }) => {
              const att = attendanceByStudentId?.[student?.id];
              const pay = paymentVariant(student?.latestPayment);
              const risks = riskFrom({ gpa: student?.cumulativeGPA, attendancePct: att, payment: student?.latestPayment });
              return (
                <motion.div key={student?.id} whileHover={{ y: -2 }} transition={{ duration: 0.15 }}>
                  <Card className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-slate-900 text-sm font-extrabold text-white">
                        {String(student?.name || 'S')
                          .trim()
                          .slice(0, 1)
                          .toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-slate-900">
                          {highlightParts(student?.name || 'Unknown', query).map((p, i) => (
                            <span key={i} className={p.m ? 'text-sky-700' : undefined}>
                              {p.t}
                            </span>
                          ))}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] font-medium text-slate-500">
                          <span>{student?.studentId}</span>
                          <span className="text-slate-300">•</span>
                          <span className="truncate">{student?.department?.name || '—'}</span>
                          <span className="text-slate-300">•</span>
                          <span className="truncate">{student?.program?.name || '—'}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {student?.cumulativeGPA != null ? <Badge variant="info">GPA {Number(student.cumulativeGPA).toFixed(2)}</Badge> : null}
                          {att != null ? <Badge variant="teal">{Math.round(att)}% Attendance</Badge> : null}
                          <Badge variant={pay.variant}>{pay.label}</Badge>
                          {risks.slice(0, 2).map((r) => (
                            <Badge key={r.label} variant={r.variant}>
                              {r.label}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 text-[11px] font-medium text-slate-500">
                      <span className="font-semibold text-slate-700">Sections:</span>{' '}
                      {sections.length ? sections.map((s) => `${s.courseCode} · ${s.sectionName}`).slice(0, 2).join(' · ') : '—'}
                      {sections.length > 2 ? ` +${sections.length - 2}` : ''}
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => onViewProfile?.({ student, sections })}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm shadow-slate-200/40 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60"
                      >
                        <UserRound className="h-4 w-4" />
                        Profile
                      </button>
                      <button
                        type="button"
                        onClick={() => onAddGrade?.({ student, sections })}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-sm shadow-slate-300/40 transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60"
                      >
                        <PlusCircle className="h-4 w-4" />
                        Grade
                      </button>
                      <button
                        type="button"
                        onClick={() => onMessageStudent?.({ student, sections })}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm shadow-slate-200/40 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60"
                      >
                        <MessageSquare className="h-4 w-4" />
                        Message
                      </button>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
