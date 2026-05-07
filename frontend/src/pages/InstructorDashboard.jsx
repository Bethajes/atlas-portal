
import { useEffect, useMemo, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  Award,
  BarChart2,
  BarChart3,
  Bell,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Eye,
  FileText,
  GraduationCap,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Plus,
  Save,
  Search,
  Settings,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import AttendanceTable from '../components/instructor/AttendanceTable';
import GradebookTable from '../components/instructor/GradebookTable';
import InstructorAnalytics from '../components/instructor/InstructorAnalytics';
import MessagingCenter from '../components/instructor/MessagingCenter';
import StudentSearch from '../components/instructor/StudentSearch';
import StudentProfileModal from '../components/instructor/StudentProfileModal';
import {
  createAnnouncement,
  fetchInstructorAnnouncements,
  fetchMyStudents,
  fetchNotifications,
  markNotificationRead,
  sendStudentMessage,
  assignSectionGrade,
  fetchSection,
} from '../services/instructor';

// ─── Constants ───────────────────────────────────────────────
const GRADES = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'F', 'I', 'W'];

const GRADE_COLOR = (g) => {
  if (!g) return 'bg-gray-100 text-gray-400';
  if (['A+','A','A-'].includes(g)) return 'bg-emerald-100 text-emerald-700';
  if (['B+','B','B-'].includes(g)) return 'bg-blue-100 text-blue-700';
  if (['C+','C','C-'].includes(g)) return 'bg-amber-100 text-amber-700';
  if (['D+','D'].includes(g))      return 'bg-orange-100 text-orange-700';
  return 'bg-red-100 text-red-700';
};

// ─── Mini bar chart (pure CSS) ────────────────────────────────
const MiniBar = ({ value, max, color = 'bg-indigo-500' }) => (
  <div className="flex items-end gap-0.5 h-8">
    {[...Array(7)].map((_, i) => {
      const h = Math.max(15, Math.round((value / max) * 100 * (0.4 + Math.random() * 0.6)));
      return <div key={i} className={`w-2 rounded-sm ${color} opacity-${60 + i * 5}`} style={{ height: `${Math.min(h, 100)}%` }} />;
    })}
  </div>
);

// ─── Status badge ─────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const map = {
    ENROLLED:  'bg-blue-50 text-blue-600 border-blue-200',
    COMPLETED: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    FAILED:    'bg-red-50 text-red-600 border-red-200',
    DROPPED:   'bg-gray-50 text-gray-400 border-gray-200',
  };
  return (
    <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider border ${map[status] || 'bg-gray-50 text-gray-400 border-gray-200'}`}>
      {status}
    </span>
  );
};

// ─── CSV export ───────────────────────────────────────────────
function exportGradesCSV(name, students) {
  const rows = [['Student ID', 'Name', 'Email', 'Grade', 'Status']];
  students.forEach(s => rows.push([
    s.student?.studentId, s.student?.user?.name,
    s.student?.user?.institutionalEmail, s.letterGrade || '', s.status
  ]));
  const csv = rows.map(r => r.map(v => `"${v ?? ''}"`).join(',')).join('\n');
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
    download: `grades-${name}.csv`,
  });
  a.click();
}

export default function InstructorDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab]           = useState('dashboard');
  const [mobileSidebar, setMobileSidebar]   = useState(false);
  const [sections, setSections]             = useState([]);
  const [sectionsLoading, setSectionsLoading] = useState(true);
  const [selectedSection, setSelectedSection] = useState(null);
  const [sectionStudents, setSectionStudents] = useState([]);
  const [sectionLoading, setSectionLoading] = useState(false);
  const [pendingGrades, setPendingGrades]   = useState({});
  const [savingGrade, setSavingGrade]       = useState({});
  const [updatedRows, setUpdatedRows]       = useState(new Set());
  const [courses, setCourses]               = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [assignments, setAssignments]       = useState([]);
  const [submissions, setSubmissions]       = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [showNewAssignment, setShowNewAssignment]   = useState(false);
  const [assignForm, setAssignForm]         = useState({ title: '', description: '', dueDate: '', totalPoints: 100 });
  const [saving, setSaving]                 = useState(false);
  const [search, setSearch]                 = useState('');

  const [instructorStudents, setInstructorStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [announcements, setAnnouncements] = useState([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);

  const [notifOpen, setNotifOpen] = useState(false);
  const [studentProfile, setStudentProfile] = useState(null);
  const [messageTarget, setMessageTarget] = useState(null);
  const [messageDraft, setMessageDraft] = useState({ title: 'Message from your instructor', message: '', type: 'INFO' });

  useEffect(() => {
    fetchCourses();
    fetchSections();
    fetchStudents();
    fetchAnnouncements();
    fetchNotif();
  }, []);

  const fetchCourses = async () => {
    try { setCoursesLoading(true); const r = await api.get('/courses/teaching'); setCourses(r.data.courses || []); }
    catch { setCourses([]); } finally { setCoursesLoading(false); }
  };

  const fetchSections = async () => {
    try { setSectionsLoading(true); const r = await api.get('/sections/my-sections'); setSections(r.data.data || []); }
    catch { setSections([]); } finally { setSectionsLoading(false); }
  };

  const fetchStudents = async () => {
    setStudentsLoading(true);
    try {
      const data = await fetchMyStudents();
      setInstructorStudents(Array.isArray(data) ? data : []);
    } catch (e) {
      setInstructorStudents([]);
      toast.error(e?.response?.data?.message || 'Failed to load students');
    } finally {
      setStudentsLoading(false);
    }
  };

  const fetchAnnouncements = async () => {
    setAnnouncementsLoading(true);
    try {
      const data = await fetchInstructorAnnouncements();
      setAnnouncements(Array.isArray(data) ? data : []);
    } catch {
      setAnnouncements([]);
    } finally {
      setAnnouncementsLoading(false);
    }
  };

  const fetchNotif = async () => {
    setNotificationsLoading(true);
    try {
      const data = await fetchNotifications();
      setNotifications(Array.isArray(data) ? data : []);
    } catch {
      setNotifications([]);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const openSection = useCallback(async (sec) => {
    setSelectedSection(sec); setSectionStudents([]); setPendingGrades({}); setUpdatedRows(new Set()); setSectionLoading(true);
    try { const data = await fetchSection(sec.id); setSectionStudents(data?.enrollments || []); }
    catch (e) { toast.error(e.response?.data?.message || 'Failed to load students'); }
    finally { setSectionLoading(false); }
  }, []);

  const saveGrade = async (enrollment) => {
    const key = `${enrollment.studentId}-${enrollment.sectionId}`;
    const grade = pendingGrades[key];
    if (!grade) return toast.error('Select a grade first');
    setSavingGrade(s => ({ ...s, [key]: true }));
    try {
      await api.put(`/sections/${enrollment.sectionId}/students/${enrollment.studentId}/grade`, { grade: null, letterGrade: grade });
      toast.success(`✓ Grade ${grade} saved`);
      setUpdatedRows(r => new Set([...r, key]));
      const r = await api.get(`/sections/${enrollment.sectionId}`);
      setSectionStudents(r.data.data?.enrollments || []);
      setPendingGrades(p => { const n = { ...p }; delete n[key]; return n; });
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to save grade'); }
    finally { setSavingGrade(s => ({ ...s, [key]: false })); }
  };

  const loadAssignments = async (courseId) => {
    try { const r = await api.get(`/assignments/course/${courseId}`); setAssignments(r.data.assignments || []); }
    catch { setAssignments([]); }
  };

  const selectCourse = (c) => { setSelectedCourse(c); setSelectedAssignment(null); setSubmissions([]); loadAssignments(c.id); };

  const loadSubmissions = async (id) => {
    try { const r = await api.get(`/assignments/${id}/submissions`); setSubmissions(r.data.submissions || []); setSelectedAssignment(id); }
    catch { setSubmissions([]); }
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    if (!selectedCourse) return toast.error('Select a course first');
    setSaving(true);
    try {
      await api.post('/assignments', { ...assignForm, courseId: selectedCourse.id });
      toast.success('Assignment created');
      setAssignForm({ title: '', description: '', dueDate: '', totalPoints: 100 });
      setShowNewAssignment(false);
      loadAssignments(selectedCourse.id);
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const totalStudents = useMemo(() => {
    const ids = new Set();
    for (const row of instructorStudents || []) {
      if (row?.student?.id) ids.add(row.student.id);
    }
    return ids.size;
  }, [instructorStudents]);

  const pendingGradeSubmissions = useMemo(
    () => (instructorStudents || []).filter((r) => !r?.letterGrade && String(r?.status || '').toUpperCase() === 'ENROLLED').length,
    [instructorStudents]
  );

  const attendanceByStudentId = useMemo(() => {
    const sectionIds = (sections || []).map((s) => s.id).filter(Boolean);
    const totals = new Map();
    const presents = new Map();

    for (const sid of sectionIds) {
      try {
        const raw = localStorage.getItem(`instructorAttendance:${sid}`);
        const store = raw ? JSON.parse(raw) : {};
        for (const day of Object.values(store || {})) {
          for (const [studentId, present] of Object.entries(day || {})) {
            totals.set(studentId, (totals.get(studentId) || 0) + 1);
            presents.set(studentId, (presents.get(studentId) || 0) + (present ? 1 : 0));
          }
        }
      } catch {}
    }

    const out = {};
    for (const [studentId, total] of totals.entries()) {
      const p = presents.get(studentId) || 0;
      out[studentId] = total ? (p / total) * 100 : null;
    }
    return out;
  }, [sections]);

  const averageAttendance = useMemo(() => {
    const values = Object.values(attendanceByStudentId).filter((v) => typeof v === 'number' && !Number.isNaN(v));
    if (!values.length) return null;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }, [attendanceByStudentId]);
  const filteredStudents = sectionStudents.filter(e =>
    !search || e.student?.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
    e.student?.studentId?.toLowerCase().includes(search.toLowerCase())
  );

  // ── Sidebar nav items ─────────────────────────────────────────
  const navItems = [
    { id: 'overview',    label: 'Overview',      Icon: LayoutDashboard },
    { id: 'sections',    label: 'My Sections',   Icon: Layers,   badge: sections.length || null },
    { id: 'courses',     label: 'My Courses',    Icon: BookOpen, badge: courses.length || null },
    { id: 'assignments', label: 'Assignments',   Icon: FileText },
    { id: 'students',    label: 'Students',      Icon: Users,    badge: totalStudents || null },
  ];

  const SidebarContent = () => (
    <>
      <div className="px-6 py-5 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-500 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-lg">A</div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">Atlas Portal</p>
            <p className="text-slate-400 text-[11px]">Instructor Panel</p>
          </div>
        </div>
      </div>

      <div className="px-3 py-4 flex-1">
        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest px-3 mb-2">Navigation</p>
        <nav className="space-y-0.5">
          {navItems.map(({ id, label, Icon, badge }) => (
            <button key={id} onClick={() => { setActiveTab(id); setSelectedSection(null); setMobileSidebar(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === id
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}>
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left">{label}</span>
              {badge && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === id ? 'bg-white/20 text-white' : 'bg-slate-700 text-slate-300'}`}>{badge}</span>}
            </button>
          ))}
        </nav>

        <div className="mt-6 pt-4 border-t border-slate-700/50">
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest px-3 mb-2">Account</p>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-700/50 transition">
            <Settings className="w-4 h-4" />Settings
          </button>
          <button onClick={() => { logout(); navigate('/login'); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-900/20 transition">
            <LogOut className="w-4 h-4" />Sign Out
          </button>
        </div>
      </div>

      <div className="px-4 py-4 border-t border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
            {user?.name?.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-semibold truncate">{user?.name}</p>
            <p className="text-slate-400 text-[10px] truncate">Instructor</p>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">

      {/* ── Desktop Sidebar ── */}
      <aside className="w-56 bg-slate-900 hidden lg:flex flex-col shrink-0 sticky top-0 h-screen">
        <SidebarContent />
      </aside>

      {/* ── Mobile Sidebar Overlay ── */}
      {mobileSidebar && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileSidebar(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-56 bg-slate-900 flex flex-col">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 h-14 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileSidebar(true)} className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 transition">
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 w-56 lg:w-72">
              <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <input type="text" placeholder="Search students, courses…" value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-transparent border-none focus:ring-0 text-sm ml-2 w-full outline-none text-gray-700 placeholder-gray-400" />
              {search && <button onClick={() => setSearch('')}><X className="w-3.5 h-3.5 text-gray-400" /></button>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="relative p-2 rounded-lg hover:bg-gray-100 transition">
              <Bell className="w-4 h-4 text-gray-500" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
            </button>
            <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
              <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
                {user?.name?.charAt(0)}
              </div>
              <span className="text-sm font-medium text-gray-700 hidden sm:block">{user?.name?.split(' ')[0]}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">

          {/* ══════════════════════════════════════════════════
              OVERVIEW TAB
          ══════════════════════════════════════════════════ */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-in fade-in duration-300">

              {/* Page header */}
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Good morning, {user?.name?.split(' ')[0]} 👋</h1>
                  <p className="text-sm text-gray-500 mt-0.5">Here's what's happening in your classes today.</p>
                </div>
                <button onClick={() => { setActiveTab('assignments'); setShowNewAssignment(true); }}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition shadow-sm shadow-indigo-200">
                  <Plus className="w-4 h-4" /> New Assignment
                </button>
              </div>

              {/* Stat cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Sections',       value: sections.length,  Icon: Layers,      color: 'text-indigo-600', bg: 'bg-indigo-50',  border: 'border-indigo-100' },
                  { label: 'Total Students', value: totalStudents,    Icon: Users,       color: 'text-emerald-600',bg: 'bg-emerald-50', border: 'border-emerald-100' },
                  { label: 'Courses',        value: courses.length,   Icon: BookOpen,    color: 'text-amber-600',  bg: 'bg-amber-50',   border: 'border-amber-100' },
                  { label: 'Assignments',    value: assignments.length,Icon: FileText,   color: 'text-violet-600', bg: 'bg-violet-50',  border: 'border-violet-100' },
                ].map(({ label, value, Icon, color, bg, border }) => (
                  <div key={label} className={`bg-white rounded-xl border ${border} p-4 shadow-sm`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className={`${bg} ${color} p-2 rounded-lg`}><Icon className="w-4 h-4" /></div>
                      <TrendingUp className="w-3.5 h-3.5 text-gray-300" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{sectionsLoading ? '—' : value}</p>
                    <p className="text-xs text-gray-500 mt-0.5 font-medium">{label}</p>
                  </div>
                ))}
              </div>

              {/* Main grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Sections list */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-indigo-600" />
                      <h2 className="font-semibold text-gray-900 text-sm">My Sections</h2>
                    </div>
                    <button onClick={() => setActiveTab('sections')} className="text-indigo-600 text-xs font-semibold hover:underline">View all</button>
                  </div>
                  {sectionsLoading ? (
                    <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
                  ) : sections.length === 0 ? (
                    <div className="p-10 text-center">
                      <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                        <Layers className="w-6 h-6 text-gray-300" />
                      </div>
                      <p className="text-sm font-semibold text-gray-700 mb-1">No sections assigned</p>
                      <p className="text-xs text-gray-400">Contact your administrator to be assigned to course sections.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {sections.slice(0, 6).map(sec => (
                        <div key={sec.id} onClick={() => { setActiveTab('sections'); openSection(sec); }}
                          className="px-5 py-3.5 flex items-center justify-between hover:bg-indigo-50/40 cursor-pointer transition group">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-sm group-hover:bg-indigo-600 group-hover:text-white transition shrink-0">
                              {sec.name}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900 leading-tight">{sec.courseTitle}</p>
                              <p className="text-[11px] text-gray-400 mt-0.5">{sec.courseCode} · {sec.credits} cr</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right hidden sm:block">
                              <p className="text-sm font-bold text-gray-700">{sec.enrolledCount}</p>
                              <p className="text-[10px] text-gray-400">students</p>
                            </div>
                            <div className="w-px h-6 bg-gray-100 hidden sm:block" />
                            <div className="flex gap-1">
                              <button onClick={e => { e.stopPropagation(); openSection(sec); setActiveTab('sections'); }}
                                className="p-1.5 rounded-lg hover:bg-indigo-100 text-gray-400 hover:text-indigo-600 transition" title="Grade">
                                <Award className="w-3.5 h-3.5" />
                              </button>
                              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 transition" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right panel */}
                <div className="space-y-4">

                  {/* Quick actions */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-indigo-600" /> Quick Actions
                    </h3>
                    <div className="space-y-2">
                      {[
                        { label: 'Grade Students',    Icon: Award,         action: () => setActiveTab('sections'),    color: 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100' },
                        { label: 'Create Assignment', Icon: Plus,          action: () => { setActiveTab('assignments'); setShowNewAssignment(true); }, color: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' },
                        { label: 'View Courses',      Icon: BookOpen,      action: () => setActiveTab('courses'),     color: 'text-amber-600 bg-amber-50 hover:bg-amber-100' },
                        { label: 'Export Grades',     Icon: Download,      action: () => setActiveTab('sections'),    color: 'text-violet-600 bg-violet-50 hover:bg-violet-100' },
                      ].map(({ label, Icon, action, color }) => (
                        <button key={label} onClick={action}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${color}`}>
                          <Icon className="w-4 h-4 shrink-0" />{label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Alerts */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" /> Alerts
                    </h3>
                    <div className="space-y-2">
                      {sections.filter(s => s.enrolledCount > 0).slice(0, 3).map(sec => (
                        <div key={sec.id} className="flex items-start gap-2.5 p-2.5 bg-amber-50 rounded-lg border border-amber-100">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs font-semibold text-gray-800">{sec.courseCode} · Sec {sec.name}</p>
                            <p className="text-[11px] text-gray-500">{sec.enrolledCount} students pending grades</p>
                          </div>
                        </div>
                      ))}
                      {sections.filter(s => s.enrolledCount > 0).length === 0 && (
                        <p className="text-xs text-gray-400 text-center py-2">No pending alerts</p>
                      )}
                    </div>
                  </div>

                  {/* Workload summary */}
                  <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-xl p-4 text-white shadow-lg shadow-indigo-200">
                    <div className="flex items-center gap-2 mb-3">
                      <BarChart2 className="w-4 h-4 text-indigo-200" />
                      <h3 className="text-sm font-semibold">Semester Workload</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'Sections',  value: sections.length },
                        { label: 'Students',  value: totalStudents },
                        { label: 'Courses',   value: courses.length },
                        { label: 'Credits',   value: sections.reduce((s, sec) => s + (sec.credits || 0), 0) },
                      ].map(({ label, value }) => (
                        <div key={label} className="bg-white/10 rounded-lg p-2.5">
                          <p className="text-lg font-bold">{value}</p>
                          <p className="text-[11px] text-indigo-200">{label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════
              SECTIONS TAB
          ══════════════════════════════════════════════════ */}
          {activeTab === 'sections' && (
            <div className="animate-in fade-in duration-300">
              {!selectedSection ? (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-xl font-bold text-gray-900">My Sections</h1>
                      <p className="text-sm text-gray-500 mt-0.5">Click a section to view students and assign grades.</p>
                    </div>
                    <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">{sections.length} sections</span>
                  </div>

                  {sectionsLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {[1,2,3,4,5,6].map(i => <div key={i} className="bg-white rounded-xl h-44 animate-pulse border border-gray-100" />)}
                    </div>
                  ) : sections.length === 0 ? (
                    <div className="bg-white rounded-xl border border-dashed border-gray-300 p-16 text-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <GraduationCap className="w-8 h-8 text-gray-300" />
                      </div>
                      <h3 className="text-base font-bold text-gray-800 mb-1">No Sections Assigned</h3>
                      <p className="text-sm text-gray-400 max-w-xs mx-auto">You haven't been assigned to any course sections yet. Contact your department administrator.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {sections.map(sec => (
                        <div key={sec.id}
                          className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer group overflow-hidden">
                          {/* Card top accent */}
                          <div className="h-1 bg-gradient-to-r from-indigo-500 to-violet-500" />
                          <div className="p-5">
                            <div className="flex items-start justify-between mb-4">
                              <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-base group-hover:bg-indigo-600 group-hover:text-white transition">
                                {sec.name}
                              </div>
                              <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${sec.enrolledCount > 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
                                {sec.enrolledCount > 0 ? 'ACTIVE' : 'EMPTY'}
                              </span>
                            </div>
                            <h3 className="font-bold text-gray-900 text-sm leading-tight mb-1 group-hover:text-indigo-600 transition">{sec.courseTitle}</h3>
                            <p className="text-[11px] text-gray-400 mb-4">{sec.courseCode} · Section {sec.name} · {sec.credits} Credits</p>

                            <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                              <div className="flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5" />
                                <span className="font-semibold text-gray-700">{sec.enrolledCount}</span>
                                <span>/ {sec.maxStudents} students</span>
                              </div>
                              {/* Capacity bar */}
                              <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-500 rounded-full transition-all"
                                  style={{ width: `${Math.min(100, (sec.enrolledCount / sec.maxStudents) * 100)}%` }} />
                              </div>
                            </div>

                            <div className="flex gap-2 pt-3 border-t border-gray-100">
                              <button onClick={() => openSection(sec)}
                                className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-600 text-white py-2 rounded-lg text-xs font-semibold hover:bg-indigo-700 transition">
                                <Award className="w-3.5 h-3.5" /> Grade
                              </button>
                              <button onClick={() => openSection(sec)}
                                className="flex items-center justify-center gap-1.5 bg-gray-50 text-gray-600 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-gray-100 transition border border-gray-200">
                                <Eye className="w-3.5 h-3.5" /> View
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* ── Section Detail ── */
                <div className="space-y-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <button onClick={() => { setSelectedSection(null); setSearch(''); }}
                        className="flex items-center gap-1.5 text-indigo-600 text-xs font-semibold hover:bg-indigo-50 px-2 py-1.5 rounded-lg transition mb-2">
                        <ChevronLeft className="w-3.5 h-3.5" /> All Sections
                      </button>
                      <h1 className="text-xl font-bold text-gray-900">{selectedSection.courseTitle}</h1>
                      <p className="text-sm text-gray-500 mt-0.5">{selectedSection.courseCode} · Section {selectedSection.name} · {selectedSection.enrolledCount} students enrolled</p>
                    </div>
                    <button onClick={() => exportGradesCSV(`${selectedSection.courseCode}-${selectedSection.name}`, sectionStudents)}
                      className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 transition shadow-sm">
                      <Download className="w-4 h-4" /> Export CSV
                    </button>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Enrolled',  value: sectionStudents.length,                                                    color: 'text-blue-600',    bg: 'bg-blue-50' },
                      { label: 'Graded',    value: sectionStudents.filter(e => e.letterGrade).length,                         color: 'text-emerald-600', bg: 'bg-emerald-50' },
                      { label: 'Pending',   value: sectionStudents.filter(e => !e.letterGrade && e.status === 'ENROLLED').length, color: 'text-amber-600',   bg: 'bg-amber-50' },
                    ].map(({ label, value, color, bg }) => (
                      <div key={label} className={`${bg} rounded-xl p-3 text-center`}>
                        <p className={`text-xl font-bold ${color}`}>{sectionLoading ? '—' : value}</p>
                        <p className="text-xs text-gray-500 font-medium">{label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-3">
                      <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 flex-1 max-w-xs">
                        <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <input type="text" placeholder="Search student…" value={search}
                          onChange={e => setSearch(e.target.value)}
                          className="bg-transparent border-none focus:ring-0 text-sm ml-2 w-full outline-none" />
                      </div>
                      <span className="text-xs text-gray-400 font-medium ml-auto">{filteredStudents.length} of {sectionStudents.length}</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-100">
                            {['Student', 'Email', 'Status', 'Current Grade', 'Assign Grade', ''].map(h => (
                              <th key={h} className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {sectionLoading ? (
                            [...Array(5)].map((_, i) => (
                              <tr key={i}>{[...Array(6)].map((_, j) => (
                                <td key={j} className="px-5 py-3.5"><div className="h-3.5 bg-gray-100 rounded animate-pulse" /></td>
                              ))}</tr>
                            ))
                          ) : filteredStudents.length === 0 ? (
                            <tr><td colSpan="6" className="px-5 py-14 text-center">
                              <Users className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                              <p className="text-sm text-gray-400">{search ? 'No students match.' : 'No students enrolled.'}</p>
                            </td></tr>
                          ) : filteredStudents.map(enrollment => {
                            const key = `${enrollment.studentId}-${enrollment.sectionId}`;
                            const isUpdated = updatedRows.has(key);
                            const isSaving  = savingGrade[key];
                            return (
                              <tr key={enrollment.id} className={`transition ${isUpdated ? 'bg-emerald-50/50' : 'hover:bg-slate-50/60'}`}>
                                <td className="px-5 py-3.5">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs shrink-0">
                                      {enrollment.student?.user?.name?.charAt(0)}
                                    </div>
                                    <div>
                                      <p className="text-sm font-semibold text-gray-900 leading-tight">{enrollment.student?.user?.name}</p>
                                      <p className="text-[10px] text-gray-400">{enrollment.student?.studentId}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-5 py-3.5 text-xs text-gray-500">{enrollment.student?.user?.institutionalEmail}</td>
                                <td className="px-5 py-3.5"><StatusBadge status={enrollment.status} /></td>
                                <td className="px-5 py-3.5">
                                  {enrollment.letterGrade
                                    ? <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${GRADE_COLOR(enrollment.letterGrade)}`}>{enrollment.letterGrade}</span>
                                    : <span className="text-gray-300 text-sm">—</span>
                                  }
                                </td>
                                <td className="px-5 py-3.5">
                                  <select value={pendingGrades[key] || ''} onChange={e => setPendingGrades(p => ({ ...p, [key]: e.target.value }))}
                                    disabled={isSaving}
                                    className="px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition disabled:opacity-50 text-gray-700">
                                    <option value="">Select…</option>
                                    {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                                  </select>
                                </td>
                                <td className="px-5 py-3.5">
                                  <button onClick={() => saveGrade(enrollment)}
                                    disabled={isSaving || !pendingGrades[key]}
                                    className="flex items-center gap-1.5 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-indigo-700 transition disabled:opacity-40 disabled:cursor-not-allowed">
                                    {isSaving ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-3 h-3" />}
                                    {isSaving ? '…' : 'Save'}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════
              COURSES TAB
          ══════════════════════════════════════════════════ */}
          {activeTab === 'courses' && (
            <div className="space-y-5 animate-in fade-in duration-300">
              <div>
                <h1 className="text-xl font-bold text-gray-900">My Courses</h1>
                <p className="text-sm text-gray-500 mt-0.5">Courses you are assigned to teach this semester.</p>
              </div>

              {coursesLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1,2,3,4].map(i => <div key={i} className="bg-white rounded-xl h-48 animate-pulse border border-gray-100" />)}
                </div>
              ) : courses.length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed border-gray-300 p-16 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="w-8 h-8 text-gray-300" />
                  </div>
                  <h3 className="text-base font-bold text-gray-800 mb-1">No Courses Assigned</h3>
                  <p className="text-sm text-gray-400 max-w-xs mx-auto mb-4">You have no courses assigned this semester. Contact your department head to request course assignments.</p>
                  <button className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition">
                    <Plus className="w-4 h-4" /> Request Course Assignment
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {courses.map(c => (
                    <div key={c.id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group overflow-hidden">
                      <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
                      <div className="p-5">
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 font-bold text-xs group-hover:bg-amber-500 group-hover:text-white transition">
                            {c.code?.slice(0, 4)}
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full">{c.credits} Credits</span>
                          </div>
                        </div>
                        <h3 className="font-bold text-gray-900 mb-1 group-hover:text-indigo-600 transition">{c.title}</h3>
                        <p className="text-xs text-gray-400 mb-4 line-clamp-2">{c.description || 'No description provided.'}</p>
                        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                          <div className="flex items-center gap-1.5 text-gray-500">
                            <Users className="w-3.5 h-3.5" />
                            <span className="text-xs font-semibold">{c._count?.enrollment || 0} students</span>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => { selectCourse(c); setActiveTab('assignments'); }}
                              className="flex items-center gap-1.5 bg-gray-900 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-indigo-600 transition">
                              <FileText className="w-3.5 h-3.5" /> Assignments
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════
              ASSIGNMENTS TAB
          ══════════════════════════════════════════════════ */}
          {activeTab === 'assignments' && (
            <div className="space-y-5 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Assignments</h1>
                  <p className="text-sm text-gray-500 mt-0.5">{selectedCourse ? `Course: ${selectedCourse.title}` : 'Select a course to manage assignments'}</p>
                </div>
                {selectedCourse && (
                  <button onClick={() => setShowNewAssignment(true)}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition shadow-sm shadow-indigo-200">
                    <Plus className="w-4 h-4" /> New Assignment
                  </button>
                )}
              </div>

              {!selectedCourse ? (
                <div>
                  <p className="text-sm text-gray-500 mb-4 font-medium">Choose a course:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {courses.map(c => (
                      <button key={c.id} onClick={() => selectCourse(c)}
                        className="bg-white p-4 rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-md text-left transition group">
                        <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 font-bold text-xs mb-3 group-hover:bg-indigo-600 group-hover:text-white transition">
                          {c.code?.slice(0, 4)}
                        </div>
                        <p className="font-semibold text-gray-900 text-sm group-hover:text-indigo-600 transition">{c.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{c._count?.enrollment || 0} students</p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
                  {/* Assignment list */}
                  <div className="lg:col-span-2 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-700">Assignments</h3>
                      <button onClick={() => { setSelectedCourse(null); setAssignments([]); }}
                        className="text-xs text-indigo-600 font-semibold hover:underline">Change course</button>
                    </div>
                    {assignments.length === 0 ? (
                      <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center">
                        <FileText className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">No assignments yet.</p>
                        <button onClick={() => setShowNewAssignment(true)} className="text-indigo-600 text-xs font-semibold hover:underline mt-1">Create one →</button>
                      </div>
                    ) : assignments.map(a => (
                      <div key={a.id} onClick={() => loadSubmissions(a.id)}
                        className={`bg-white p-4 rounded-xl border transition cursor-pointer group hover:shadow-sm ${selectedAssignment === a.id ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-gray-200 hover:border-indigo-200'}`}>
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{a.totalPoints} pts</span>
                          <span className="text-[10px] text-gray-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />{new Date(a.dueDate).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="font-semibold text-gray-900 text-sm group-hover:text-indigo-600 transition">{a.title}</p>
                        {a.description && <p className="text-xs text-gray-400 mt-1 line-clamp-1">{a.description}</p>}
                      </div>
                    ))}
                  </div>

                  {/* Submissions */}
                  <div className="lg:col-span-3">
                    {selectedAssignment ? (
                      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
                          <h3 className="font-semibold text-gray-900 text-sm">Submissions</h3>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left">
                            <thead><tr className="border-b border-gray-100">
                              {['Student', 'Submitted', 'Score'].map(h => (
                                <th key={h} className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                              ))}
                            </tr></thead>
                            <tbody className="divide-y divide-gray-50">
                              {submissions.length === 0 ? (
                                <tr><td colSpan="3" className="px-5 py-10 text-center text-sm text-gray-400">No submissions yet.</td></tr>
                              ) : submissions.map(sub => (
                                <tr key={sub.id} className="hover:bg-gray-50/50 transition">
                                  <td className="px-5 py-3.5 font-semibold text-gray-900 text-sm">{sub.User?.name}</td>
                                  <td className="px-5 py-3.5 text-xs text-gray-500">{new Date(sub.submittedAt).toLocaleDateString()}</td>
                                  <td className="px-5 py-3.5 font-bold text-gray-900 text-sm">{sub.grade ?? '—'}<span className="text-xs text-gray-400 font-normal ml-1">/ {sub.maxScore}</span></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white rounded-xl border border-dashed border-gray-300 p-16 text-center h-full flex flex-col items-center justify-center">
                        <FileText className="w-10 h-10 text-gray-200 mb-3" />
                        <p className="text-sm text-gray-400">Select an assignment to view submissions.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════
              STUDENTS TAB
          ══════════════════════════════════════════════════ */}
          {activeTab === 'students' && (
            <div className="space-y-5 animate-in fade-in duration-300">
              <div>
                <h1 className="text-xl font-bold text-gray-900">All Students</h1>
                <p className="text-sm text-gray-500 mt-0.5">Search and manage students across all your sections.</p>
              </div>

              {studentsLoading ? (
                <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
                  <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-sm text-gray-500">Loading students...</p>
                </div>
              ) : (
                <StudentSearch
                  enrollments={instructorStudents}
                  attendanceByStudentId={attendanceByStudentId}
                  onViewProfile={(item) => setStudentProfile(item)}
                  onAddGrade={(item) => {
                    // Navigate to the first section this student is in
                    const firstSection = sections.find(s => 
                      item.sections?.some(sec => sec.sectionId === s.id)
                    );
                    if (firstSection) {
                      setActiveTab('sections');
                      openSection(firstSection);
                    } else {
                      toast.error('No section found for this student');
                    }
                  }}
                  onMessageStudent={(item) => {
                    setMessageTarget(item.student);
                    setMessageDraft({ 
                      title: 'Message from your instructor', 
                      message: '', 
                      type: 'INFO' 
                    });
                  }}
                />
              )}
            </div>
          )}

        </main>
      </div>

      {/* ── New Assignment Modal ── */}
      {showNewAssignment && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-indigo-600 px-6 py-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">New Assignment</h3>
                <p className="text-indigo-200 text-sm mt-0.5">{selectedCourse?.title}</p>
              </div>
              <button onClick={() => setShowNewAssignment(false)} className="p-1.5 hover:bg-white/10 rounded-lg transition">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <form onSubmit={handleCreateAssignment} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Title *</label>
                <input type="text" required value={assignForm.title} onChange={e => setAssignForm({ ...assignForm, title: e.target.value })}
                  placeholder="e.g. Midterm Project" className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Due Date *</label>
                  <input type="date" required value={assignForm.dueDate} onChange={e => setAssignForm({ ...assignForm, dueDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Points *</label>
                  <input type="number" required value={assignForm.totalPoints} onChange={e => setAssignForm({ ...assignForm, totalPoints: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Instructions</label>
                <textarea rows="3" value={assignForm.description} onChange={e => setAssignForm({ ...assignForm, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition resize-none"
                  placeholder="Describe the task…" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowNewAssignment(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition">Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Posting…</> : 'Post Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Student Profile Modal ── */}
      {studentProfile && (
        <StudentProfileModal
          studentData={studentProfile}
          attendancePercent={attendanceByStudentId[studentProfile?.student?.id]}
          onClose={() => setStudentProfile(null)}
        />
      )}
    </div>
  );
}
