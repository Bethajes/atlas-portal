import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
  LayoutDashboard, Users, Briefcase, BookOpen, Building2, GraduationCap, Calendar,
  AlertCircle, LogOut, ChevronLeft, ChevronRight, Search, Plus, Menu, X,
  Pencil, Trash2, MoreVertical, Download, FileText, BarChart2,
  Activity, Heart, Stethoscope, ClipboardList, Bell, ShieldCheck, Moon, Sun,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useAdminRole } from '../hooks/useAdminRole';
import Button from '../components/admin/Button';
import Input from '../components/admin/Input';
import Modal from '../components/admin/Modal';
import ConfirmModal from '../components/admin/ConfirmModal';
import Badge from '../components/admin/Badge';
import StatCard from '../components/admin/StatCard';
import EmptyState from '../components/admin/EmptyState';
import TableSkeleton from '../components/admin/TableSkeleton';
import Breadcrumb from '../components/admin/Breadcrumb';
import Pagination, { paginatedItems } from '../components/admin/Pagination';
import BulkToolbar from '../components/admin/BulkToolbar';
import { exportStudentsCsv, exportProgramsCsv } from '../utils/exportCsv';
import AnalyticsDashboard from './AnalyticsDashboard';

// ─── Constants ───────────────────────────────────────────────────────────────

const TAB_LABELS = {
  overview:      'Overview',
  students:      'Students',
  instructors:   'Faculty',
  courses:       'Courses',
  departments:   'Departments',
  programs:      'Programs',
  semesters:     'Semesters',
  notifications: 'Notifications',
  audit:         'Audit Log',
  analytics:     'Analytics',
};

const TAB_ICONS = {
  overview:      LayoutDashboard,
  students:      Users,
  instructors:   Briefcase,
  courses:       BookOpen,
  departments:   Building2,
  programs:      GraduationCap,
  semesters:     Calendar,
  notifications: Bell,
  audit:         FileText,
  analytics:     BarChart2,
};

const SUPER_ADMIN_TABS = [
  'overview','students','instructors','courses','departments',
  'programs','semesters','notifications','analytics','audit',
];
const STAFF_TABS = SUPER_ADMIN_TABS.filter((t) => t !== 'audit');
const REGISTRAR_TABS = ['students'];

const SEMESTER_DEFAULTS = () => {
  const year = new Date().getFullYear();
  return {
    name: `Fall ${year}`, type: 'FALL', year: String(year),
    startDate: `${year}-09-01`, endDate: `${year}-12-31`,
    registrationStart: `${year}-08-01`, registrationEnd: `${year}-08-31`,
    dropDeadline: `${year}-09-15`, addDeadline: `${year}-09-10`,
  };
};

const PROGRAM_DEFAULTS = {
  name: '', code: '', type: 'DECLARED', departmentId: '',
  durationYears: 4, totalCredits: 120, degreeLevel: 'BACHELOR',
};

const DEPARTMENT_DEFAULTS = {
  name: '', code: '', description: '', foundedYear: '',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const asArray = (v) => (Array.isArray(v) ? v : []);

function filteredItems(list, keys, term) {
  if (!term) return list || [];
  const q = term.toLowerCase();
  return (list || []).filter((item) =>
    keys.some((key) => {
      const val = key.split('.').reduce((o, i) => o?.[i], item);
      return val?.toString().toLowerCase().includes(q);
    })
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

/**
 * Pulse indicator shown next to the active semester card.
 */
function PulseIndicator() {
  return (
    <span className="relative flex h-3 w-3 ml-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-500" />
    </span>
  );
}

/**
 * Small role pill shown in the header.
 */
function RolePill({ role }) {
  const map = {
    SUPER_ADMIN:     { label: 'Super Admin',     cls: 'bg-indigo-100 text-indigo-700' },
    REGISTRAR_ADMIN: { label: 'Registrar',       cls: 'bg-amber-100 text-amber-700' },
    STAFF:           { label: 'Staff',            cls: 'bg-teal-100 text-teal-700' },
  };
  const { label, cls } = map[role] || { label: role || 'Admin', cls: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${cls}`}>
      {label}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const { dark, toggle: toggleTheme } = useTheme();
  const { isSuperAdmin, isRegistrarAdmin, isStaff, can } = useAdminRole();
  const navigate = useNavigate();

  // ── UI state ──
  const [activeTab, setActiveTab]           = useState('overview');
  const [page, setPage]                     = useState(1);
  const [pageSize, setPageSize]             = useState(20);
  const [searchTerm, setSearchTerm]         = useState('');
  const [programTypeFilter, setProgramTypeFilter] = useState('');
  const [searchFocused, setSearchFocused]   = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // ── Data state ──
  const [loading, setLoading]       = useState(true);
  const [tableBusy, setTableBusy]   = useState(false);
  const [stats, setStats]           = useState({});
  const [students, setStudents]     = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [courses, setCourses]       = useState([]);
  const [semesters, setSemesters]   = useState([]);
  const [departments, setDepartments] = useState([]);
  const [programs, setPrograms]     = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [deletedDepts, setDeletedDepts] = useState([]);
  const [deletedProgs, setDeletedProgs] = useState([]);
  const [deptView, setDeptView]     = useState('active');
  const [progView, setProgView]     = useState('active');
  const [auditLogs, setAuditLogs]   = useState([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditSkip, setAuditSkip]   = useState(0);

  // ── Modal / form state ──
  const [modal, setModal]             = useState(null);
  const [form, setForm]               = useState({});
  const [saving, setSaving]           = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [assignOpen, setAssignOpen]   = useState(false);
  const [assignProgramId, setAssignProgramId] = useState('');

  const tableScrollRef = useRef(null);

  // ── Role-based tab visibility ──────────────────────────────────────────────
  const visibleTabs = useMemo(() => {
    if (isRegistrarAdmin) return REGISTRAR_TABS;
    if (isSuperAdmin && !isStaff) return SUPER_ADMIN_TABS;
    return STAFF_TABS;
  }, [isRegistrarAdmin, isSuperAdmin, isStaff]);

  // ── Sync activeTab when role changes ──
  useEffect(() => {
    if (!visibleTabs.includes(activeTab)) setActiveTab(visibleTabs[0] || 'overview');
  }, [visibleTabs, activeTab]);

  // ── Reset page on filter/tab change ──
  useEffect(() => { setPage(1); }, [activeTab, searchTerm, programTypeFilter, deptView, progView]);

  // ── Auto-scroll table top on page change ──
  useEffect(() => {
    tableScrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [page, pageSize]);

  // ── Data fetching ─────────────────────────────────────────────────────────

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [s, i, c, sem, d, p, n] = await Promise.all([
        api.get('/academic/students'),
        api.get('/academic/instructors'),
        api.get('/courses'),
        api.get('/academic/semesters'),
        api.get('/admin/departments'),
        api.get('/admin/programs'),
        api.get('/users/notifications'),
      ]);

      const studentList    = asArray(s?.data?.data);
      const instructorList = asArray(i?.data?.data);
      const courseList     = asArray(c?.data?.data);
      const semesterList   = asArray(sem?.data?.data);
      const deptList       = asArray(d?.data?.data);
      const progList       = asArray(p?.data?.data);
      const notifList      = asArray(n?.data?.data);

      setStudents(studentList);
      setInstructors(instructorList);
      setCourses(courseList);
      setSemesters(semesterList);
      setDepartments(deptList);
      setPrograms(progList);
      setNotifications(notifList);

      setStats({
        totalStudents:      studentList.length,
        activeStudents:     studentList.filter((x) => x.status === 'ACTIVE').length,
        totalInstructors:   instructorList.length,
        totalCourses:       courseList.length,
        totalPrograms:      progList.length,
        activeSemester:     semesterList.find((x) => x.isActive)?.name || 'None',
        totalDepartments:   deptList.length,
        unreadNotifications: notifList.filter((x) => !x.isRead).length,
      });
    } catch (e) {
      console.error(e);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDeleted = useCallback(async () => {
    try {
      const [d, p] = await Promise.all([
        api.get('/admin/departments/deleted'),
        api.get('/admin/programs/deleted'),
      ]);
      setDeletedDepts(asArray(d?.data?.data));
      setDeletedProgs(asArray(p?.data?.data));
    } catch {
      toast.error('Failed to load trash');
    }
  }, []);

  const fetchAudit = useCallback(async (skip = 0) => {
    setTableBusy(true);
    try {
      const res = await api.get('/admin/audit-logs', { params: { skip, take: pageSize } });
      setAuditLogs(asArray(res?.data?.data));
      setAuditTotal(res?.data?.total ?? 0);
      setAuditSkip(skip);
    } catch {
      toast.error('Failed to load audit log');
    } finally {
      setTableBusy(false);
    }
  }, [pageSize]);

  useEffect(() => { fetchAllData(); }, [fetchAllData]);

  useEffect(() => {
    if (isSuperAdmin && activeTab === 'departments' && deptView === 'trash') fetchDeleted();
    if (isSuperAdmin && activeTab === 'programs'   && progView === 'trash') fetchDeleted();
  }, [isSuperAdmin, activeTab, deptView, progView, fetchDeleted]);

  useEffect(() => {
    if (activeTab === 'audit' && isSuperAdmin) fetchAudit(0);
  }, [activeTab, isSuperAdmin, fetchAudit]);

  // ── CRUD handlers ─────────────────────────────────────────────────────────

  const openModal = (type, data = {}) => {
    if (['department','editDepartment','program','editProgram','course','semester'].includes(type) && !can('create')) {
      toast.error('Unauthorized');
      return;
    }
    const defaults = {
      department:     DEPARTMENT_DEFAULTS,
      editDepartment: DEPARTMENT_DEFAULTS,
      program:        PROGRAM_DEFAULTS,
      editProgram:    PROGRAM_DEFAULTS,
      semester:       SEMESTER_DEFAULTS(),
    };
    setForm({ ...(defaults[type] || {}), ...(data || {}) });
    setModal(type);
  };

  const closeModal = () => { setModal(null); setForm({}); };

  const withSave = (fn) => async (e) => {
    e?.preventDefault();
    setSaving(true);
    try { await fn(); }
    finally { setSaving(false); }
  };

  const handleCreateCourse = withSave(async () => {
    await api.post('/courses', {
      ...form,
      credits:    Number(form.credits)    || 3,
      maxStudents: Number(form.maxStudents) || 40,
    });
    toast.success('Course created');
    closeModal();
    fetchAllData();
  });

  const handleCreateDepartment = withSave(async () => {
    await api.post('/admin/departments', {
      name: form.name, code: form.code, description: form.description,
      foundedYear: form.foundedYear ? parseInt(form.foundedYear, 10) : undefined,
    });
    toast.success('Department created');
    closeModal();
    fetchAllData();
  });

  const handleUpdateDepartment = withSave(async () => {
    await api.put(`/admin/departments/${form.id}`, {
      name: form.name, code: form.code, description: form.description,
      foundedYear: form.foundedYear ? parseInt(form.foundedYear, 10) : undefined,
    });
    toast.success('Department updated');
    closeModal();
    fetchAllData();
  });

  const handleDeleteDepartment = async (id) => {
    try {
      await api.delete(`/admin/departments/${id}`);
      toast.success('Department archived');
      fetchAllData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleCreateProgram = withSave(async () => {
    await api.post('/admin/programs', {
      name: form.name, code: form.code, type: form.type,
      departmentId:  form.type === 'DECLARED' ? form.departmentId : (form.departmentId || null),
      duration:      Number(form.durationYears) || 4,
      durationYears: Number(form.durationYears) || 4,
      totalCredits:  Number(form.totalCredits)  || 120,
      degreeLevel:   form.degreeLevel || 'BACHELOR',
    });
    toast.success('Program created');
    closeModal();
    fetchAllData();
  });

  const handleUpdateProgram = withSave(async () => {
    await api.put(`/admin/programs/${form.id}`, {
      name: form.name, code: form.code, type: form.type,
      departmentId:  form.type === 'DECLARED' ? form.departmentId : (form.departmentId || null),
      durationYears: Number(form.durationYears) || 4,
      totalCredits:  Number(form.totalCredits)  || 120,
      degreeLevel:   form.degreeLevel || 'BACHELOR',
    });
    toast.success('Program updated');
    closeModal();
    fetchAllData();
  });

  const handleDeleteProgram = async (id) => {
    try {
      await api.delete(`/admin/programs/${id}`);
      toast.success('Program archived');
      fetchAllData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleCreateSemester = withSave(async () => {
    await api.post('/academic/semesters', {
      name: form.name, type: form.type, year: parseInt(form.year, 10),
      startDate: form.startDate, endDate: form.endDate,
      registrationStart: form.registrationStart, registrationEnd: form.registrationEnd,
      dropDeadline: form.dropDeadline, addDeadline: form.addDeadline,
    });
    toast.success('Semester created');
    closeModal();
    fetchAllData();
  });

  const handleActivateSemester = async (id) => {
    try {
      await api.patch(`/academic/semesters/${id}/activate`);
      toast.success('Semester activated');
      fetchAllData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const restoreDept = async (id) => {
    try {
      await api.put(`/admin/departments/${id}/restore`);
      toast.success('Department restored');
      fetchDeleted(); fetchAllData();
    } catch { toast.error('Restore failed'); }
  };

  const restoreProg = async (id) => {
    try {
      await api.put(`/admin/programs/${id}/restore`);
      toast.success('Program restored');
      fetchDeleted(); fetchAllData();
    } catch { toast.error('Restore failed'); }
  };

  const markNotificationRead = async (id) => {
    try {
      await api.put(`/users/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      setStats((prev) => ({ ...prev, unreadNotifications: Math.max(0, prev.unreadNotifications - 1) }));
    } catch { /* silent */ }
  };

  // ── Bulk operations ───────────────────────────────────────────────────────

  const runBulkDeletePrograms = async () => {
    if (!can('delete')) { toast.error('Unauthorized'); return; }
    let ok = 0;
    for (const id of selectedIds) {
      try { await api.delete(`/admin/programs/${id}`); ok++; } catch { /* skip */ }
    }
    toast.success(`Archived ${ok} program(s)`);
    setSelectedIds(new Set());
    fetchAllData();
  };

  const runBulkDeleteStudents = async () => {
    if (!isSuperAdmin) { toast.error('Unauthorized'); return; }
    let ok = 0;
    for (const id of selectedIds) {
      try { await api.delete(`/admin/students/${id}`); ok++; } catch { /* skip */ }
    }
    toast.success(`Removed ${ok} student record(s)`);
    setSelectedIds(new Set());
    fetchAllData();
  };

  const runBulkAssignProgram = async () => {
    if (!assignProgramId) { toast.error('Choose a program'); return; }
    let ok = 0;
    for (const id of selectedIds) {
      try { await api.put(`/admin/students/${id}`, { programId: assignProgramId }); ok++; } catch { /* skip */ }
    }
    toast.success(`Updated ${ok} student(s)`);
    setAssignOpen(false);
    setSelectedIds(new Set());
    fetchAllData();
  };

  // ── Derived / memoised data ───────────────────────────────────────────────

  const studentsFiltered    = filteredItems(students,    ['user.name', 'studentId'], searchTerm);
  const instructorsFiltered = filteredItems(instructors, ['user.name', 'employeeId'], searchTerm);
  const coursesFiltered     = filteredItems(courses,     ['code', 'title'], searchTerm);
  const departmentsFiltered = filteredItems(departments, ['name', 'code'], searchTerm);
  let programsFiltered      = filteredItems(programs,    ['name', 'code', 'department.name'], searchTerm);
  if (programTypeFilter) programsFiltered = programsFiltered.filter((p) => p.type === programTypeFilter);
  const semestersFiltered   = filteredItems(semesters,   ['name'], searchTerm);

  const currentList = useMemo(() => {
    switch (activeTab) {
      case 'students':     return studentsFiltered;
      case 'instructors':  return instructorsFiltered;
      case 'courses':      return coursesFiltered;
      case 'departments':  return deptView === 'trash' ? deletedDepts : departmentsFiltered;
      case 'programs':     return progView === 'trash' ? deletedProgs : programsFiltered;
      case 'semesters':    return semestersFiltered;
      default:             return [];
    }
  }, [activeTab, studentsFiltered, instructorsFiltered, coursesFiltered, departmentsFiltered,
      programsFiltered, semestersFiltered, deptView, progView, deletedDepts, deletedProgs]);

  const pagedRows = paginatedItems(currentList, page, pageSize);

  // ── Selection helpers ──
  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAllPage = () => {
    const ids   = pagedRows.map((r) => r.id);
    const allOn = ids.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOn) ids.forEach((id) => next.delete(id));
      else        ids.forEach((id) => next.add(id));
      return next;
    });
  };

  const showRowCheckbox = activeTab === 'students' || (activeTab === 'programs' && progView === 'active');

  // ── Global search dropdown ──
  const globalSearchOpen = searchFocused && searchTerm.trim().length >= 3;
  const globalGroups = useMemo(() => {
    const q = searchTerm.toLowerCase();
    if (!globalSearchOpen) return { students: [], programs: [], departments: [] };
    return {
      students:    students.filter((s) => s.user?.name?.toLowerCase().includes(q) || s.studentId?.toLowerCase().includes(q)).slice(0, 5),
      programs:    programs.filter((p) => p.name?.toLowerCase().includes(q) || p.code?.toLowerCase().includes(q)).slice(0, 5),
      departments: departments.filter((d) => d.name?.toLowerCase().includes(q) || d.code?.toLowerCase().includes(q)).slice(0, 5),
    };
  }, [globalSearchOpen, searchTerm, students, programs, departments]);

  // ── Breadcrumbs ──
  const breadcrumbItems = useMemo(() => {
    const items = [{ label: 'Admin', onClick: () => setActiveTab('overview') }];
    if (activeTab !== 'overview') items.push({ label: TAB_LABELS[activeTab] || activeTab });
    const modalLabels = {
      course: 'Add Course', department: 'Add Department', editDepartment: 'Edit Department',
      program: 'Add Program', editProgram: 'Edit Program', semester: 'Add Semester',
    };
    if (modal && modalLabels[modal]) items.push({ label: modalLabels[modal] });
    return items;
  }, [activeTab, modal]);

  // ── Full-page spinner ──
  if (loading && !stats.totalStudents && activeTab === 'overview') {
    return (
      <div className={`flex flex-col items-center justify-center min-h-screen gap-4 ${dark ? 'bg-slate-950' : 'bg-slate-50'}`}>
        <div className="flex items-center gap-3">
          <Heart className="w-8 h-8 text-teal-500 animate-pulse" />
          <span className={`text-xl font-bold tracking-tight ${dark ? 'text-white' : 'text-slate-900'}`}>Atlas Medical College</span>
        </div>
        <div className={`w-48 h-1 rounded-full overflow-hidden mt-2 ${dark ? 'bg-slate-800' : 'bg-slate-200'}`}>
          <div className="h-full bg-teal-500 rounded-full animate-[loading_1.4s_ease-in-out_infinite]" style={{ width: '60%' }} />
        </div>
        <p className={`text-sm ${dark ? 'text-slate-500' : 'text-slate-400'}`}>Loading system data…</p>
        <style>{`
          @keyframes loading {
            0%   { transform: translateX(-100%); }
            100% { transform: translateX(300%); }
          }
        `}</style>
      </div>
    );
  }

  // ── Sidebar nav button ──
  const NavBtn = ({ tab, Icon, label, badge }) => {
    const active = activeTab === tab;
    return (
      <button
        type="button"
        onClick={() => { setActiveTab(tab); setMobileMenuOpen(false); }}
        title={sidebarCollapsed ? label : undefined}
        className={`
          w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150
          ${active
            ? 'bg-teal-500/15 text-teal-600 shadow-inner ring-1 ring-teal-500/30'
            : dark
              ? 'text-slate-400 hover:bg-white/5 hover:text-white'
              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}
        `}
      >
        <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-teal-500' : ''}`} />
        {!sidebarCollapsed && <span className="truncate">{label}</span>}
        {!sidebarCollapsed && badge > 0 && (
          <span className="ml-auto bg-teal-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
            {badge}
          </span>
        )}
        {sidebarCollapsed && badge > 0 && (
          <span className="absolute right-1 top-1 w-2 h-2 bg-teal-500 rounded-full" />
        )}
      </button>
    );
  };

  const sidebarInner = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`p-5 border-b flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} ${dark ? 'border-white/10' : 'border-slate-200'}`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 bg-teal-500 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-teal-500/30">
            <Stethoscope className="w-5 h-5 text-white" />
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <h1 className={`font-bold text-sm leading-tight truncate ${dark ? 'text-white' : 'text-slate-900'}`}>Atlas Medical</h1>
              <p className={`text-[10px] uppercase tracking-widest ${dark ? 'text-slate-500' : 'text-slate-400'}`}>Admin Portal</p>
            </div>
          )}
        </div>
        <button
          type="button"
          className={`lg:hidden p-1.5 rounded-lg ${dark ? 'text-slate-400 hover:bg-white/10' : 'text-slate-500 hover:bg-slate-100'}`}
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Close menu"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {!sidebarCollapsed && (
          <p className={`text-[9px] font-black uppercase tracking-widest px-3 pt-2 pb-1 ${dark ? 'text-slate-600' : 'text-slate-400'}`}>Navigation</p>
        )}
        {visibleTabs.map((tab) => {
          const Icon = TAB_ICONS[tab] || LayoutDashboard;
          return (
            <NavBtn
              key={tab}
              tab={tab}
              Icon={Icon}
              label={TAB_LABELS[tab]}
              badge={tab === 'notifications' ? stats.unreadNotifications : 0}
            />
          );
        })}
      </nav>

      {/* Footer */}
      <div className={`p-3 border-t space-y-1 ${dark ? 'border-white/10' : 'border-slate-200'}`}>
        {!sidebarCollapsed && (
          <div className={`px-3 py-2 rounded-xl mb-2 ${dark ? 'bg-white/5' : 'bg-slate-100'}`}>
            <p className={`text-xs font-semibold truncate ${dark ? 'text-white' : 'text-slate-900'}`}>{user?.name}</p>
            <RolePill role={user?.adminRole} />
          </div>
        )}
        <button
          type="button"
          onClick={() => { logout(); navigate('/login'); }}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition hover:bg-red-500/10 hover:text-red-500 ${dark ? 'text-slate-400' : 'text-slate-500'}`}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!sidebarCollapsed && 'Sign out'}
        </button>
        <button
          type="button"
          onClick={() => setSidebarCollapsed((v) => !v)}
          className={`hidden lg:flex w-full items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs transition ${dark ? 'text-slate-600 hover:bg-white/5 hover:text-slate-400' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <><ChevronLeft className="w-4 h-4" /><span>Collapse</span></>}
        </button>
      </div>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={`min-h-screen flex font-sans ${dark ? 'bg-slate-950' : 'bg-slate-50'}`}>

      {/* Desktop sidebar */}
      <aside
        className={`
          ${sidebarCollapsed ? 'w-[72px]' : 'w-64'} 
          ${dark ? 'bg-slate-900 border-white/5' : 'bg-white border-slate-200'} 
          border-r hidden lg:flex flex-col 
          transition-all duration-300 ease-in-out shrink-0
        `}
      >
        {sidebarInner}
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            aria-label="Close overlay"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-slate-900 flex flex-col shadow-2xl dark:bg-slate-900">
            {sidebarInner}
          </div>
        </div>
      )}

      {/* Main content area */}
      <main className="flex-1 overflow-y-auto min-w-0">

        {/* Header */}
        <header className={`backdrop-blur-md border-b sticky top-0 z-20 px-4 lg:px-6 py-3 flex items-center gap-4 ${dark ? 'bg-slate-900/80 border-white/5' : 'bg-white/95 border-slate-200 shadow-sm'}`}>
          {/* Mobile hamburger */}
          <button
            type="button"
            className={`lg:hidden p-2 rounded-lg border ${dark ? 'border-white/10 text-slate-400' : 'border-slate-200 text-slate-500'}`}
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Search */}
          <div className="relative flex-1 min-w-0 max-w-lg">
            <div className={`flex items-center border px-3 py-2 rounded-xl gap-2 focus-within:ring-2 focus-within:ring-teal-500/50 transition ${dark ? 'bg-slate-800 border-white/10' : 'bg-slate-100 border-slate-200'}`}>
              <Search className={`w-4 h-4 shrink-0 ${dark ? 'text-slate-500' : 'text-slate-400'}`} />
              <input
                type="text"
                placeholder="Search students, programs, departments…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                className={`bg-transparent border-none focus:ring-0 text-sm w-full outline-none ${dark ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'}`}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className={`transition ${dark ? 'text-slate-500 hover:text-white' : 'text-slate-400 hover:text-slate-700'}`}
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Global search dropdown */}
            {globalSearchOpen && (
              <div className={`absolute left-0 right-0 top-full mt-2 border rounded-xl shadow-2xl z-30 p-3 text-sm max-h-80 overflow-y-auto ${dark ? 'bg-slate-800 border-white/10' : 'bg-white border-slate-200'}`}>
                <p className={`text-[9px] font-black uppercase tracking-widest mb-2 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>Global results</p>
                {(['students', 'programs', 'departments']).map((g) => (
                  <div key={g} className="mb-3">
                    <p className="text-[10px] font-bold text-teal-500 uppercase tracking-wide mb-1 px-1">{g}</p>
                    {globalGroups[g].length === 0
                      ? <p className={`text-xs px-2 ${dark ? 'text-slate-600' : 'text-slate-400'}`}>No matches</p>
                      : globalGroups[g].map((row) => (
                          <div
                            key={row.id}
                            className={`py-1.5 px-2 rounded-lg text-xs cursor-pointer transition ${dark ? 'hover:bg-white/5 text-slate-300' : 'hover:bg-slate-50 text-slate-700'}`}
                          >
                            {row.user?.name || row.name || row.code}
                            {row.studentId && <span className={`ml-2 ${dark ? 'text-slate-600' : 'text-slate-400'}`}>{row.studentId}</span>}
                            {row.code && !row.studentId && <span className={`ml-2 ${dark ? 'text-slate-600' : 'text-slate-400'}`}>{row.code}</span>}
                          </div>
                        ))
                    }
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Header right */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Theme toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              className={`p-2 rounded-lg border transition ${dark ? 'bg-slate-800 border-white/10 text-slate-400 hover:text-white' : 'bg-white border-slate-200 text-slate-500 hover:text-slate-900 shadow-sm'}`}
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {stats.unreadNotifications > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('notifications')}
                className={`relative p-2 rounded-lg border transition ${dark ? 'bg-slate-800 border-white/10 text-slate-400 hover:text-white' : 'bg-white border-slate-200 text-slate-500 hover:text-slate-900 shadow-sm'}`}
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-teal-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                  {stats.unreadNotifications}
                </span>
              </button>
            )}
            <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-teal-500/20">
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className={`p-4 lg:p-6 space-y-6 ${dark ? 'text-slate-100' : 'text-slate-900'}`} ref={tableScrollRef}>
          <Breadcrumb items={breadcrumbItems} />

          {/* ── OVERVIEW ── */}
          {activeTab === 'overview' && (
            <section>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight">System Overview</h2>
                  <p className="text-slate-400 text-sm mt-1">Atlas Medical College · Academic Administration</p>
                </div>
                {can('create') && (
                  <div className="flex gap-2 flex-wrap">
                    <Button variant="secondary" onClick={() => openModal('department')}>
                      <Plus className="w-4 h-4" /> New Department
                    </Button>
                    <Button variant="primary" onClick={() => openModal('course')}>
                      <Plus className="w-4 h-4" /> New Course
                    </Button>
                  </div>
                )}
              </div>

              {/* Stat cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
                <StatCard label="Total Students"  value={stats.totalStudents}    icon={Users}          color="text-blue-400"   bg="bg-blue-500/10"   loading={loading} />
                <StatCard label="Faculty"          value={stats.totalInstructors} icon={Briefcase}      color="text-indigo-400" bg="bg-indigo-500/10" loading={loading} />
                <StatCard label="Courses"          value={stats.totalCourses}     icon={BookOpen}       color="text-amber-400"  bg="bg-amber-500/10"  loading={loading} />
                <StatCard label="Departments"      value={stats.totalDepartments} icon={Building2}      color="text-emerald-400" bg="bg-emerald-500/10" loading={loading} />
                <StatCard label="Programs"         value={stats.totalPrograms}    icon={GraduationCap}  color="text-violet-400" bg="bg-violet-500/10" loading={loading} />
              </div>

              {/* Active semester + quick metrics */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 bg-slate-900 border border-white/5 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Activity className="w-5 h-5 text-teal-400" />
                    <h3 className="text-white font-bold">Active Semester</h3>
                    {stats.activeSemester !== 'None' && <PulseIndicator />}
                  </div>
                  <p className="text-3xl font-black text-white">{stats.activeSemester}</p>
                  <p className="text-slate-500 text-sm mt-1">
                    {stats.activeStudents ?? 0} active students enrolled
                  </p>
                </div>
                <div className="bg-gradient-to-br from-teal-600/20 to-teal-500/5 border border-teal-500/20 rounded-2xl p-6 flex flex-col justify-between">
                  <ShieldCheck className="w-6 h-6 text-teal-400 mb-3" />
                  <div>
                    <p className="text-teal-300 font-bold text-sm">System Health</p>
                    <p className="text-white text-2xl font-black mt-1">Operational</p>
                    <p className="text-slate-500 text-xs mt-1">All services running normally</p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ── DATA TABLES ── */}
          {['students','instructors','courses','departments','programs','semesters'].includes(activeTab) && (
            <section>
              {/* Table header */}
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
                <h2 className="text-2xl font-black text-white tracking-tight">{TAB_LABELS[activeTab]}</h2>
                <div className="flex flex-wrap gap-2 items-center">
                  {/* Program type filter */}
                  {activeTab === 'programs' && (
                    <select
                      value={programTypeFilter}
                      onChange={(e) => setProgramTypeFilter(e.target.value)}
                      className="bg-slate-800 border border-white/10 text-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                    >
                      <option value="">All types</option>
                      <option value="DECLARED">Declared</option>
                      <option value="UNDECLARED">Undeclared</option>
                    </select>
                  )}
                  {/* Export buttons */}
                  {activeTab === 'students' && (
                    <Button variant="secondary" onClick={() => exportStudentsCsv(studentsFiltered)}>
                      <Download className="w-4 h-4" /> Export CSV
                    </Button>
                  )}
                  {activeTab === 'programs' && (
                    <Button variant="secondary" onClick={() => exportProgramsCsv(programsFiltered)}>
                      <Download className="w-4 h-4" /> Export CSV
                    </Button>
                  )}
                  {/* Trash toggle */}
                  {isSuperAdmin && activeTab === 'departments' && (
                    <TrashToggle view={deptView} onChange={setDeptView} />
                  )}
                  {isSuperAdmin && activeTab === 'programs' && (
                    <TrashToggle view={progView} onChange={setProgView} />
                  )}
                  {/* Add button */}
                  {can('create') && (
                    <Button
                      variant="primary"
                      onClick={() => {
                        if (activeTab === 'courses')     openModal('course');
                        else if (activeTab === 'departments') openModal('department');
                        else if (activeTab === 'programs')    openModal('program');
                        else if (activeTab === 'semesters')   openModal('semester');
                        else toast('Use registrar tools for new records', { icon: 'ℹ️' });
                      }}
                    >
                      <Plus className="w-4 h-4" /> Add
                    </Button>
                  )}
                </div>
              </div>

              {/* Bulk toolbars */}
              {activeTab === 'students' && (
                <BulkToolbar
                  selectedCount={selectedIds.size}
                  entityType="students"
                  canDelete={isSuperAdmin}
                  onDelete={runBulkDeleteStudents}
                  onAssignProgram={() => setAssignOpen(true)}
                />
              )}
              {activeTab === 'programs' && progView === 'active' && (
                <BulkToolbar
                  selectedCount={selectedIds.size}
                  entityType="programs"
                  canDelete={can('delete')}
                  onDelete={runBulkDeletePrograms}
                />
              )}

              {/* Table */}
              <div className="bg-slate-900 border border-white/5 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-800/60 border-b border-white/5">
                        <th className="px-4 py-3 w-10">
                          {showRowCheckbox && (
                            <input
                              type="checkbox"
                              aria-label="Select all on page"
                              checked={pagedRows.length > 0 && pagedRows.every((r) => selectedIds.has(r.id))}
                              onChange={selectAllPage}
                              className="rounded border-slate-600 bg-slate-700 text-teal-500 focus:ring-teal-500"
                            />
                          )}
                        </th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Name / ID</th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Details</th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-center">Status</th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    {tableBusy ? (
                      <TableSkeleton rows={5} cols={5} />
                    ) : (
                      <tbody className="divide-y divide-white/[0.03]">
                        {/* Students */}
                        {activeTab === 'students' && pagedRows.map((s) => (
                          <tr key={s.id} className="hover:bg-white/[0.02] transition">
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={selectedIds.has(s.id)}
                                onChange={() => toggleSelect(s.id)}
                                className="rounded border-slate-600 bg-slate-700 text-teal-500 focus:ring-teal-500"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-sm font-semibold text-white">{s.user?.name}</p>
                              <p className="text-[11px] text-slate-500 font-mono">{s.studentId}</p>
                            </td>
                            <td className="px-4 py-3 text-xs font-medium text-slate-400">
                              {s.program?.code || <span className="text-slate-600 italic">Unassigned</span>}
                            </td>
                            <td className="px-4 py-3 text-center"><Badge status={s.status} /></td>
                            <td className="px-4 py-3 text-right">
                              <button className="text-slate-600 hover:text-slate-400 transition p-1" aria-label="More options">
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}

                        {/* Instructors / Faculty */}
                        {activeTab === 'instructors' && pagedRows.map((i) => (
                          <tr key={i.id} className="hover:bg-white/[0.02] transition">
                            <td className="px-4 py-3" />
                            <td className="px-4 py-3">
                              <p className="text-sm font-semibold text-white">{i.user?.name}</p>
                              <p className="text-[11px] text-slate-500 font-mono">{i.employeeId}</p>
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-400">{i.department?.name || i.department?.code}</td>
                            <td className="px-4 py-3 text-center"><Badge status="INSTRUCTOR" /></td>
                            <td className="px-4 py-3 text-right">
                              <button className="text-slate-600 hover:text-slate-400 transition p-1" aria-label="More options">
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}

                        {/* Courses */}
                        {activeTab === 'courses' && pagedRows.map((c) => (
                          <tr key={c.id} className="hover:bg-white/[0.02] transition">
                            <td className="px-4 py-3" />
                            <td className="px-4 py-3">
                              <p className="text-sm font-semibold text-white">{c.title}</p>
                              <p className="text-[11px] text-slate-500 font-mono">{c.code}</p>
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-400">{c.department?.name}</td>
                            <td className="px-4 py-3 text-center">
                              <span className="text-xs font-bold text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-full">
                                {c.credits} cr
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              {can('create') && (
                                <button className="text-slate-600 hover:text-slate-400 transition p-1" aria-label="More options">
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}

                        {/* Departments */}
                        {activeTab === 'departments' && pagedRows.map((d) => (
                          <tr key={d.id} className="hover:bg-white/[0.02] transition">
                            <td className="px-4 py-3" />
                            <td className="px-4 py-3">
                              <p className="text-sm font-semibold text-white">{d.name}</p>
                            </td>
                            <td className="px-4 py-3 text-xs font-mono text-slate-500">{d.code}</td>
                            <td className="px-4 py-3 text-center">
                              {deptView === 'trash'
                                ? <Badge status="SUSPENDED" />
                                : <span className="text-xs font-bold text-emerald-400">{d.programs?.length ?? 0} programs</span>
                              }
                            </td>
                            <td className="px-4 py-3 text-right">
                              {deptView === 'trash' && isSuperAdmin
                                ? <Button variant="secondary" className="!py-1 !text-xs" onClick={() => restoreDept(d.id)}>Restore</Button>
                                : (
                                  <div className="flex justify-end gap-1.5">
                                    {can('create') && (
                                      <button
                                        className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
                                        onClick={() => openModal('editDepartment', d)}
                                        aria-label="Edit department"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                    {can('delete') && (
                                      <button
                                        className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition"
                                        onClick={() => setDeleteTarget({ type: 'department', id: d.id, name: d.name })}
                                        aria-label="Delete department"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                )
                              }
                            </td>
                          </tr>
                        ))}

                        {/* Programs */}
                        {activeTab === 'programs' && pagedRows.map((p) => (
                          <tr key={p.id} className="hover:bg-white/[0.02] transition">
                            <td className="px-4 py-3">
                              {progView === 'active' && (
                                <input
                                  type="checkbox"
                                  checked={selectedIds.has(p.id)}
                                  onChange={() => toggleSelect(p.id)}
                                  className="rounded border-slate-600 bg-slate-700 text-teal-500 focus:ring-teal-500"
                                />
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-sm font-semibold text-white">{p.name}</p>
                              <p className="text-[11px] text-slate-500 font-mono">{p.code}</p>
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-400">{p.department?.name || <span className="italic text-slate-600">—</span>}</td>
                            <td className="px-4 py-3 text-center">
                              {progView === 'trash' ? <Badge status="SUSPENDED" /> : <Badge status={p.type} />}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {progView === 'trash' && isSuperAdmin
                                ? <Button variant="secondary" className="!py-1 !text-xs" onClick={() => restoreProg(p.id)}>Restore</Button>
                                : (
                                  <div className="flex justify-end gap-1.5">
                                    {can('create') && (
                                      <button
                                        className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
                                        onClick={() => openModal('editProgram', p)}
                                        aria-label="Edit program"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                    {can('delete') && (
                                      <button
                                        className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition"
                                        onClick={() => setDeleteTarget({ type: 'program', id: p.id, name: p.name })}
                                        aria-label="Delete program"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                )
                              }
                            </td>
                          </tr>
                        ))}

                        {/* Semesters */}
                        {activeTab === 'semesters' && pagedRows.map((sem) => (
                          <tr key={sem.id} className="hover:bg-white/[0.02] transition">
                            <td className="px-4 py-3" />
                            <td className="px-4 py-3 font-semibold text-white">{sem.name}</td>
                            <td className="px-4 py-3 text-xs text-slate-400 font-mono">
                              {new Date(sem.startDate).toLocaleDateString()} – {new Date(sem.endDate).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {sem.isActive
                                ? <Badge status="ACTIVE" />
                                : <span className="text-slate-600 text-xs font-bold">Inactive</span>
                              }
                            </td>
                            <td className="px-4 py-3 text-right">
                              {!sem.isActive && (
                                <Button variant="secondary" className="!py-1 !text-xs" onClick={() => handleActivateSemester(sem.id)}>
                                  Set active
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}

                        {/* Empty state */}
                        {pagedRows.length === 0 && (
                          <tr>
                            <td colSpan={5} className="p-0">
                              <EmptyState
                                icon={GraduationCap}
                                message="No records match your filters."
                                actionLabel={can('create') ? 'Add new' : undefined}
                                onAction={can('create') ? () => openModal(activeTab === 'programs' ? 'program' : 'department') : undefined}
                              />
                            </td>
                          </tr>
                        )}
                      </tbody>
                    )}
                  </table>
                </div>
                <div className="border-t border-white/5">
                  <Pagination
                    total={currentList.length}
                    page={page}
                    pageSize={pageSize}
                    onPageChange={setPage}
                    onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}
                  />
                </div>
              </div>
            </section>
          )}

          {/* ── NOTIFICATIONS ── */}
          {activeTab === 'notifications' && (
            <section>
              <h2 className="text-2xl font-black text-white tracking-tight mb-4">Notifications</h2>
              <div className="bg-slate-900 border border-white/5 rounded-2xl overflow-hidden">
                {notifications.length === 0 ? (
                  <EmptyState icon={Bell} message="No notifications yet." />
                ) : (
                  <div className="divide-y divide-white/[0.04]">
                    {notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`p-5 flex gap-4 transition ${!notif.isRead ? 'bg-teal-500/5 hover:bg-teal-500/10' : 'hover:bg-white/[0.02]'}`}
                        onMouseEnter={() => !notif.isRead && markNotificationRead(notif.id)}
                      >
                        <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${!notif.isRead ? 'bg-teal-400' : 'bg-slate-700'}`} />
                        <div>
                          <p className={`font-semibold text-sm ${!notif.isRead ? 'text-white' : 'text-slate-300'}`}>{notif.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{notif.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ── ANALYTICS ── */}
          {activeTab === 'analytics' && <AnalyticsDashboard />}

          {/* ── AUDIT LOG ── */}
          {activeTab === 'audit' && isSuperAdmin && (
            <section>
              <h2 className="text-2xl font-black text-white tracking-tight mb-4">Audit Log</h2>
              <div className="bg-slate-900 border border-white/5 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-slate-800/60 border-b border-white/5">
                        {['Actor','Action','Entity','Details','Time'].map((h) => (
                          <th key={h} className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03]">
                      {tableBusy
                        ? <TableSkeleton rows={5} cols={5} />
                        : auditLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-white/[0.02] transition">
                              <td className="px-4 py-3 text-slate-300 text-xs font-medium">{log.User?.name}</td>
                              <td className="px-4 py-3"><Badge status={log.action} /></td>
                              <td className="px-4 py-3 font-mono text-xs text-slate-500">{log.resource}</td>
                              <td className="px-4 py-3 text-xs text-slate-600 max-w-xs truncate">{JSON.stringify(log.details)}</td>
                              <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                            </tr>
                          ))
                      }
                    </tbody>
                  </table>
                </div>
                <div className="border-t border-white/5">
                  <Pagination
                    total={auditTotal}
                    page={Math.floor(auditSkip / pageSize) + 1}
                    pageSize={pageSize}
                    onPageChange={(p) => fetchAudit((p - 1) * pageSize)}
                    onPageSizeChange={(n) => { setPageSize(n); fetchAudit(0); }}
                  />
                </div>
              </div>
            </section>
          )}
        </div>
      </main>

      {/* ── MODALS ──────────────────────────────────────────────────────────── */}

      {/* Assign program to students */}
      <Modal isOpen={assignOpen} onClose={() => setAssignOpen(false)} title="Assign Program" subtitle="Apply to all selected students" accentColor="teal">
        <p className="text-slate-400 text-sm mb-3">{selectedIds.size} student(s) selected</p>
        <select
          value={assignProgramId}
          onChange={(e) => setAssignProgramId(e.target.value)}
          className="w-full bg-slate-800 border border-white/10 text-white rounded-xl px-3 py-2 mb-4 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
        >
          <option value="">Select program…</option>
          {programs.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
        </select>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => setAssignOpen(false)}>Cancel</Button>
          <Button variant="primary"   className="flex-1" onClick={runBulkAssignProgram}>Apply</Button>
        </div>
      </Modal>

      {/* Confirm delete */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          setSaving(true);
          try {
            if (deleteTarget.type === 'department') await handleDeleteDepartment(deleteTarget.id);
            if (deleteTarget.type === 'program')    await handleDeleteProgram(deleteTarget.id);
            setDeleteTarget(null);
          } finally { setSaving(false); }
        }}
        itemName={deleteTarget?.name || ''}
        entityType={deleteTarget?.type}
        loading={saving}
      />

      {/* Create / edit course */}
      {modal === 'course' && (
        <Modal isOpen onClose={closeModal} title="Create Course" accentColor="amber">
          <form onSubmit={handleCreateCourse} className="space-y-4">
            <Input label="Course Code" name="code" required value={form.code || ''} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            <Input label="Title" name="title" required value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Input label="Credits" name="credits" type="number" min={1} max={12} value={form.credits || ''} onChange={(e) => setForm({ ...form, credits: e.target.value })} />
            <Input label="Max Students" name="maxStudents" type="number" value={form.maxStudents || ''} onChange={(e) => setForm({ ...form, maxStudents: e.target.value })} />
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wide block mb-1.5">Department</label>
              <select required value={form.departmentId || ''} onChange={(e) => setForm({ ...form, departmentId: e.target.value })} className="w-full bg-slate-800 border border-white/10 text-white rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none">
                <option value="">Select department…</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <ModalActions onCancel={closeModal} loading={saving} />
          </form>
        </Modal>
      )}

      {/* Create / edit department */}
      {(modal === 'department' || modal === 'editDepartment') && (
        <Modal isOpen onClose={closeModal} title={modal === 'editDepartment' ? 'Edit Department' : 'Add Department'} accentColor="emerald">
          <form onSubmit={modal === 'editDepartment' ? handleUpdateDepartment : handleCreateDepartment} className="space-y-4">
            <Input label="Department Name" name="name" required value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="Code" name="code" required value={form.code || ''} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. MED, SURG" />
            <Input label="Founded Year" name="foundedYear" type="number" min={1800} max={new Date().getFullYear()} value={form.foundedYear || ''} onChange={(e) => setForm({ ...form, foundedYear: e.target.value })} />
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wide block mb-1.5">Description</label>
              <textarea
                value={form.description || ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full bg-slate-800 border border-white/10 text-white rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none resize-none"
                rows={3}
                placeholder="Brief department overview…"
              />
            </div>
            <ModalActions onCancel={closeModal} loading={saving} />
          </form>
        </Modal>
      )}

      {/* Create / edit program */}
      {(modal === 'program' || modal === 'editProgram') && (
        <Modal isOpen onClose={closeModal} title={modal === 'editProgram' ? 'Edit Program' : 'Add Program'} accentColor="violet">
          <form onSubmit={modal === 'editProgram' ? handleUpdateProgram : handleCreateProgram} className="space-y-4">
            <Input label="Program Name" name="name" required value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="Code" name="code" required value={form.code || ''} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wide block mb-1.5">Type</label>
                <select value={form.type || 'DECLARED'} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full bg-slate-800 border border-white/10 text-white rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none">
                  <option value="DECLARED">Declared</option>
                  <option value="UNDECLARED">Undeclared</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wide block mb-1.5">Degree Level</label>
                <select value={form.degreeLevel || 'BACHELOR'} onChange={(e) => setForm({ ...form, degreeLevel: e.target.value })} className="w-full bg-slate-800 border border-white/10 text-white rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none">
                  <option value="BACHELOR">Bachelor</option>
                  <option value="MASTER">Master</option>
                  <option value="DOCTORATE">Doctorate</option>
                  <option value="CERTIFICATE">Certificate</option>
                </select>
              </div>
            </div>
            {form.type === 'DECLARED' && (
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wide block mb-1.5">Department</label>
                <select required value={form.departmentId || ''} onChange={(e) => setForm({ ...form, departmentId: e.target.value })} className="w-full bg-slate-800 border border-white/10 text-white rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none">
                  <option value="">Select department…</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Input label="Duration (years)" name="dur" type="number" min={1} max={10} value={String(form.durationYears ?? 4)} onChange={(e) => setForm({ ...form, durationYears: e.target.value })} />
              <Input label="Total Credits" name="tc" type="number" value={String(form.totalCredits ?? 120)} onChange={(e) => setForm({ ...form, totalCredits: e.target.value })} />
            </div>
            <ModalActions onCancel={closeModal} loading={saving} />
          </form>
        </Modal>
      )}

      {/* Create semester */}
      {modal === 'semester' && (
        <Modal isOpen onClose={closeModal} title="Create Semester" accentColor="blue">
          <form onSubmit={handleCreateSemester} className="space-y-3">
            <Input label="Name" name="n" required value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wide block mb-1.5">Type</label>
                <select value={form.type || 'FALL'} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full bg-slate-800 border border-white/10 text-white rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none">
                  <option value="FALL">Fall</option>
                  <option value="SPRING">Spring</option>
                  <option value="SUMMER">Summer</option>
                </select>
              </div>
              <Input label="Year" name="y" type="number" value={form.year || ''} onChange={(e) => setForm({ ...form, year: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Start Date"  name="sd" type="date" value={form.startDate || ''} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              <Input label="End Date"    name="ed" type="date" value={form.endDate || ''}   onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Reg. Start" name="rs" type="date" value={form.registrationStart || ''} onChange={(e) => setForm({ ...form, registrationStart: e.target.value })} />
              <Input label="Reg. End"   name="re" type="date" value={form.registrationEnd   || ''} onChange={(e) => setForm({ ...form, registrationEnd:   e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Add Deadline"  name="ad" type="date" value={form.addDeadline  || ''} onChange={(e) => setForm({ ...form, addDeadline:  e.target.value })} />
              <Input label="Drop Deadline" name="dd" type="date" value={form.dropDeadline || ''} onChange={(e) => setForm({ ...form, dropDeadline: e.target.value })} />
            </div>
            <ModalActions onCancel={closeModal} loading={saving} label="Create Semester" />
          </form>
        </Modal>
      )}
    </div>
  );
}

// ─── Tiny shared helpers ──────────────────────────────────────────────────────

/** Active / Trash toggle pill */
function TrashToggle({ view, onChange }) {
  return (
    <div className="flex rounded-xl border border-white/10 overflow-hidden text-xs font-bold">
      <button
        type="button"
        className={`px-3 py-2 transition ${view === 'active' ? 'bg-teal-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
        onClick={() => onChange('active')}
      >
        Active
      </button>
      <button
        type="button"
        className={`px-3 py-2 transition ${view === 'trash' ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
        onClick={() => onChange('trash')}
      >
        Trash
      </button>
    </div>
  );
}

/** Reusable Cancel / Save button pair at the bottom of modal forms */
function ModalActions({ onCancel, loading, label = 'Save' }) {
  return (
    <div className="flex gap-2 pt-2">
      <Button type="button" variant="secondary" className="flex-1" onClick={onCancel}>Cancel</Button>
      <Button type="submit"  variant="primary"   className="flex-1" loading={loading}>{label}</Button>
    </div>
  );
}