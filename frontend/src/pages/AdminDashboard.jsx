import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
  LayoutDashboard, Users, Briefcase, BookOpen, Building2, GraduationCap, Calendar,
  AlertCircle, LogOut, ChevronLeft, ChevronRight, Search, Plus, Menu, X,
  Pencil, Trash2, MoreVertical, Download, FileText,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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

const TAB_LABELS = {
  overview: 'Overview',
  students: 'Students',
  instructors: 'Instructors',
  courses: 'Courses',
  departments: 'Departments',
  programs: 'Programs',
  semesters: 'Semesters',
  notifications: 'Notifications',
  audit: 'Audit Log',
};

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

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const { isSuperAdmin, isRegistrarAdmin, isStaff, can } = useAdminRole();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('overview');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');
  const [programTypeFilter, setProgramTypeFilter] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [loading, setLoading] = useState(true);
  const [tableBusy, setTableBusy] = useState(false);
  const [stats, setStats] = useState({});
  const [students, setStudents] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [courses, setCourses] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [deletedDepts, setDeletedDepts] = useState([]);
  const [deletedProgs, setDeletedProgs] = useState([]);
  const [deptView, setDeptView] = useState('active');
  const [progView, setProgView] = useState('active');

  const [auditLogs, setAuditLogs] = useState([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditSkip, setAuditSkip] = useState(0);

  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignProgramId, setAssignProgramId] = useState('');

  const tableScrollRef = useRef(null);
  const asArray = (v) => (Array.isArray(v) ? v : []);

  const visibleTabs = useMemo(() => {
    if (isRegistrarAdmin) return ['students'];
    const base = ['overview', 'students', 'instructors', 'courses', 'departments', 'programs', 'semesters', 'notifications'];
    if (isSuperAdmin) base.push('audit');
    return base;
  }, [isRegistrarAdmin, isSuperAdmin]);

  useEffect(() => {
    if (!visibleTabs.includes(activeTab)) setActiveTab(visibleTabs[0] || 'overview');
  }, [visibleTabs, activeTab]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, searchTerm, programTypeFilter, deptView, progView]);

  useEffect(() => {
    tableScrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [page, pageSize]);

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
      const studentList = asArray(s?.data?.data);
      const instructorList = asArray(i?.data?.data);
      const courseList = asArray(c?.data?.data);
      const semesterList = asArray(sem?.data?.data);
      const deptList = asArray(d?.data?.data);
      const progList = asArray(p?.data?.data);
      const notifList = asArray(n?.data?.data);

      setStudents(studentList);
      setInstructors(instructorList);
      setCourses(courseList);
      setSemesters(semesterList);
      setDepartments(deptList);
      setPrograms(progList);
      setNotifications(notifList);

      setStats({
        totalStudents: studentList.length,
        activeStudents: studentList.filter((x) => x.status === 'ACTIVE').length,
        totalInstructors: instructorList.length,
        totalCourses: courseList.length,
        totalPrograms: progList.length,
        activeSemester: semesterList.find((x) => x.isActive)?.name || 'None',
        totalDepartments: deptList.length,
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

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  useEffect(() => {
    if (isSuperAdmin && activeTab === 'departments' && deptView === 'trash') fetchDeleted();
    if (isSuperAdmin && activeTab === 'programs' && progView === 'trash') fetchDeleted();
  }, [isSuperAdmin, activeTab, deptView, progView, fetchDeleted]);

  useEffect(() => {
    if (activeTab === 'audit' && isSuperAdmin) fetchAudit(0);
  }, [activeTab, isSuperAdmin, fetchAudit]);

  const openModal = (type, data = {}) => {
    if (type === 'department' || type === 'editDepartment') {
      setForm({ name: '', code: '', description: '', foundedYear: '', ...(data || {}) });
    } else if (type === 'program' || type === 'editProgram') {
      setForm({
        name: '', code: '', type: 'DECLARED', departmentId: '', durationYears: 4, totalCredits: 120, degreeLevel: 'BACHELOR', ...(data || {}),
      });
    } else if (type === 'semester') {
      const year = new Date().getFullYear();
      setForm({
        name: `Fall ${year}`, type: 'FALL', year: String(year),
        startDate: `${year}-09-01`, endDate: `${year}-12-31`,
        registrationStart: `${year}-08-01`, registrationEnd: `${year}-08-31`,
        dropDeadline: `${year}-09-15`, addDeadline: `${year}-09-10`, ...(data || {}),
      });
    } else {
      setForm(data || {});
    }
    setModal(type);
  };

  const closeModal = () => { setModal(null); setForm({}); };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/courses', {
        ...form,
        credits: Number(form.credits) || 3,
        maxStudents: Number(form.maxStudents) || 40,
      });
      toast.success('Course created');
      closeModal();
      fetchAllData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create course');
    } finally { setSaving(false); }
  };

  const handleCreateDepartment = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/admin/departments', {
        name: form.name,
        code: form.code,
        description: form.description,
        foundedYear: form.foundedYear ? parseInt(form.foundedYear, 10) : undefined,
      });
      toast.success('Department created');
      closeModal();
      fetchAllData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  const handleUpdateDepartment = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/admin/departments/${form.id}`, {
        name: form.name,
        code: form.code,
        description: form.description,
        foundedYear: form.foundedYear ? parseInt(form.foundedYear, 10) : undefined,
      });
      toast.success('Department updated');
      closeModal();
      fetchAllData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  const handleDeleteDepartment = async (departmentId) => {
    try {
      await api.delete(`/admin/departments/${departmentId}`);
      toast.success('Department archived');
      fetchAllData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleCreateProgram = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/admin/programs', {
        name: form.name,
        code: form.code,
        type: form.type,
        departmentId: form.type === 'DECLARED' ? form.departmentId : (form.departmentId || null),
        duration: Number(form.durationYears) || 4,
        durationYears: Number(form.durationYears) || 4,
        totalCredits: Number(form.totalCredits) || 120,
        degreeLevel: form.degreeLevel || 'BACHELOR',
      });
      toast.success('Program created');
      closeModal();
      fetchAllData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  const handleUpdateProgram = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/admin/programs/${form.id}`, {
        name: form.name,
        code: form.code,
        type: form.type,
        departmentId: form.type === 'DECLARED' ? form.departmentId : (form.departmentId || null),
        durationYears: Number(form.durationYears) || 4,
        totalCredits: Number(form.totalCredits) || 120,
        degreeLevel: form.degreeLevel || 'BACHELOR',
      });
      toast.success('Program updated');
      closeModal();
      fetchAllData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  const handleDeleteProgram = async (programId) => {
    try {
      await api.delete(`/admin/programs/${programId}`);
      toast.success('Program archived');
      fetchAllData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleCreateSemester = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/academic/semesters', {
        name: form.name,
        type: form.type,
        year: parseInt(form.year, 10),
        startDate: form.startDate,
        endDate: form.endDate,
        registrationStart: form.registrationStart,
        registrationEnd: form.registrationEnd,
        dropDeadline: form.dropDeadline,
        addDeadline: form.addDeadline,
      });
      toast.success('Semester created');
      closeModal();
      fetchAllData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  const handleActivateSemester = async (semesterId) => {
    try {
      await api.patch(`/academic/semesters/${semesterId}/activate`);
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
      fetchDeleted();
      fetchAllData();
    } catch {
      toast.error('Restore failed');
    }
  };

  const restoreProg = async (id) => {
    try {
      await api.put(`/admin/programs/${id}/restore`);
      toast.success('Program restored');
      fetchDeleted();
      fetchAllData();
    } catch {
      toast.error('Restore failed');
    }
  };

  const markNotificationRead = async (id) => {
    try {
      await api.put(`/users/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      setStats((prev) => ({ ...prev, unreadNotifications: Math.max(0, prev.unreadNotifications - 1) }));
    } catch { /* ignore */ }
  };

  const studentsFiltered = filteredItems(students, ['user.name', 'studentId'], searchTerm);
  const instructorsFiltered = filteredItems(instructors, ['user.name', 'employeeId'], searchTerm);
  const coursesFiltered = filteredItems(courses, ['code', 'title'], searchTerm);
  const departmentsFiltered = filteredItems(departments, ['name', 'code'], searchTerm);
  let programsFiltered = filteredItems(programs, ['name', 'code', 'department.name'], searchTerm);
  if (programTypeFilter) {
    programsFiltered = programsFiltered.filter((p) => p.type === programTypeFilter);
  }
  const semestersFiltered = filteredItems(semesters, ['name'], searchTerm);

  const currentList = useMemo(() => {
    switch (activeTab) {
      case 'students': return studentsFiltered;
      case 'instructors': return instructorsFiltered;
      case 'courses': return coursesFiltered;
      case 'departments': return deptView === 'trash' ? deletedDepts : departmentsFiltered;
      case 'programs': return progView === 'trash' ? deletedProgs : programsFiltered;
      case 'semesters': return semestersFiltered;
      default: return [];
    }
  }, [activeTab, studentsFiltered, instructorsFiltered, coursesFiltered, departmentsFiltered, programsFiltered, semestersFiltered, deptView, progView, deletedDepts, deletedProgs]);

  const pagedRows = paginatedItems(currentList, page, pageSize);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllPage = () => {
    const ids = pagedRows.map((r) => r.id);
    const allOn = ids.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOn) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  };

  const runBulkDeletePrograms = async () => {
    if (!can('delete')) {
      toast.error('Unauthorized');
      return;
    }
    let ok = 0;
    for (const id of selectedIds) {
      try {
        await api.delete(`/admin/programs/${id}`);
        ok += 1;
      } catch { /* skip */ }
    }
    toast.success(`Archived ${ok} program(s)`);
    setSelectedIds(new Set());
    fetchAllData();
  };

  const runBulkDeleteStudents = async () => {
    if (!isSuperAdmin) {
      toast.error('Unauthorized');
      return;
    }
    let ok = 0;
    for (const id of selectedIds) {
      try {
        await api.delete(`/admin/students/${id}`);
        ok += 1;
      } catch { /* skip */ }
    }
    toast.success(`Removed ${ok} student record(s)`);
    setSelectedIds(new Set());
    fetchAllData();
  };

  const runBulkAssignProgram = async () => {
    if (!assignProgramId) {
      toast.error('Choose a program');
      return;
    }
    let ok = 0;
    for (const id of selectedIds) {
      try {
        await api.put(`/admin/students/${id}`, { programId: assignProgramId });
        ok += 1;
      } catch { /* skip */ }
    }
    toast.success(`Updated ${ok} student(s)`);
    setAssignOpen(false);
    setSelectedIds(new Set());
    fetchAllData();
  };

  const showRowCheckbox =
    activeTab === 'students' || (activeTab === 'programs' && progView === 'active');

  const globalSearchOpen = searchFocused && searchTerm.trim().length >= 3;
  const globalGroups = useMemo(() => {
    const q = searchTerm.toLowerCase();
    if (!globalSearchOpen) return { students: [], programs: [], departments: [] };
    return {
      students: students.filter((s) => s.user?.name?.toLowerCase().includes(q) || s.studentId?.toLowerCase().includes(q)).slice(0, 5),
      programs: programs.filter((p) => p.name?.toLowerCase().includes(q) || p.code?.toLowerCase().includes(q)).slice(0, 5),
      departments: departments.filter((d) => d.name?.toLowerCase().includes(q) || d.code?.toLowerCase().includes(q)).slice(0, 5),
    };
  }, [globalSearchOpen, searchTerm, students, programs, departments]);

  const breadcrumbItems = useMemo(() => {
    const items = [{ label: 'Admin', onClick: () => setActiveTab('overview') }];
    if (activeTab !== 'overview') items.push({ label: TAB_LABELS[activeTab] || activeTab });
    if (modal === 'course') items.push({ label: 'Add Course' });
    if (modal === 'department') items.push({ label: 'Add Department' });
    if (modal === 'editDepartment') items.push({ label: 'Edit Department' });
    if (modal === 'program') items.push({ label: 'Add Program' });
    if (modal === 'editProgram') items.push({ label: 'Edit Program' });
    if (modal === 'semester') items.push({ label: 'Add Semester' });
    return items;
  }, [activeTab, modal]);

  if (loading && !stats.totalStudents && activeTab === 'overview') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900" />
      </div>
    );
  }

  const NavBtn = ({ tab, Icon, label, badge }) => (
    <button
      type="button"
      onClick={() => { setActiveTab(tab); setMobileMenuOpen(false); }}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition ${
        activeTab === tab ? 'bg-slate-900 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      <Icon className="w-5 h-5" />
      {!sidebarCollapsed && label}
      {!sidebarCollapsed && badge > 0 && (
        <span className="ml-auto text-[10px] bg-white/20 px-1.5 rounded-full">{badge}</span>
      )}
    </button>
  );

  const sidebarInner = (
    <>
      <div className="p-6 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white font-bold text-xl">A</div>
          {!sidebarCollapsed && (
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-tight">Atlas Portal</h1>
              <p className="text-xs text-gray-500 font-medium">System Admin</p>
            </div>
          )}
        </div>
        <button type="button" className="lg:hidden p-2 rounded-lg hover:bg-gray-100" onClick={() => setMobileMenuOpen(false)} aria-label="Close menu">
          <X className="w-5 h-5" />
        </button>
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {visibleTabs.includes('overview') && <NavBtn tab="overview" Icon={LayoutDashboard} label="Overview" />}
        {visibleTabs.includes('students') && <NavBtn tab="students" Icon={Users} label="Students" />}
        {visibleTabs.includes('instructors') && <NavBtn tab="instructors" Icon={Briefcase} label="Instructors" />}
        {visibleTabs.includes('courses') && <NavBtn tab="courses" Icon={BookOpen} label="Courses" />}
        {visibleTabs.includes('departments') && <NavBtn tab="departments" Icon={Building2} label="Departments" />}
        {visibleTabs.includes('programs') && <NavBtn tab="programs" Icon={GraduationCap} label="Programs" />}
        {visibleTabs.includes('semesters') && <NavBtn tab="semesters" Icon={Calendar} label="Semesters" />}
        {visibleTabs.includes('notifications') && (
          <NavBtn tab="notifications" Icon={AlertCircle} label="Notifications" badge={stats.unreadNotifications} />
        )}
        {visibleTabs.includes('audit') && isSuperAdmin && (
          <NavBtn tab="audit" Icon={FileText} label="Audit Log" />
        )}
        <button
          type="button"
          onClick={() => { logout(); navigate('/login'); }}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 transition mt-4"
        >
          <LogOut className="w-5 h-5" />
          {!sidebarCollapsed && 'Logout'}
        </button>
        <button
          type="button"
          onClick={() => setSidebarCollapsed((v) => !v)}
          className="hidden lg:flex w-full items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-50"
        >
          {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          {!sidebarCollapsed && 'Collapse'}
        </button>
      </nav>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className={`${sidebarCollapsed ? 'w-20' : 'w-64'} bg-white border-r border-gray-200 hidden lg:flex flex-col transition-all duration-300`}>
        {sidebarInner}
      </aside>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close overlay" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-xl flex flex-col animate-in slide-in-from-left duration-200">
            {sidebarInner}
          </div>
        </div>
      )}

      <main className="flex-1 overflow-y-auto">
        <header className="bg-white border-b border-gray-100 min-h-[5rem] flex flex-wrap items-center justify-between gap-4 px-4 lg:px-8 py-3 sticky top-0 z-20">
          <div className="flex items-center gap-2 lg:hidden">
            <button type="button" className="p-2 rounded-lg border border-gray-200" onClick={() => setMobileMenuOpen(true)} aria-label="Open menu">
              <Menu className="w-5 h-5" />
            </button>
          </div>
          <div className="relative flex-1 min-w-[200px] max-w-xl">
            <div className="flex items-center bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
              <Search className="w-5 h-5 text-gray-400 shrink-0" />
              <input
                type="text"
                placeholder="Search system..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                className="bg-transparent border-none focus:ring-0 text-sm ml-3 w-full"
              />
            </div>
            {globalSearchOpen && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-30 p-3 text-sm max-h-80 overflow-y-auto">
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Global results</p>
                {['students', 'programs', 'departments'].map((g) => (
                  <div key={g} className="mb-2">
                    <p className="text-xs font-semibold text-gray-500 capitalize mb-1">{g}</p>
                    {globalGroups[g].length === 0 && <p className="text-xs text-gray-400 pl-2">No matches</p>}
                    {globalGroups[g].map((row) => (
                      <div key={row.id} className="py-1 px-2 rounded hover:bg-gray-50 text-gray-800">
                        {row.user?.name || row.name || row.code}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-500 uppercase tracking-wider">{user?.adminRole || 'ADMIN'}</p>
            </div>
            <div className="w-10 h-10 bg-slate-100 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-slate-900 font-bold">
              {user?.name?.charAt(0)}
            </div>
          </div>
        </header>

        <div className="p-4 lg:p-8" ref={tableScrollRef}>
          <Breadcrumb items={breadcrumbItems} />

          {activeTab === 'overview' && (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div>
                  <h2 className="text-3xl font-black text-gray-900">System Overview</h2>
                  <p className="text-gray-500 mt-1 font-medium">Global statistics and health monitor.</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {can('create') && (
                    <>
                      <Button variant="secondary" onClick={() => openModal('department')}><Plus className="w-4 h-4" /> New Dept</Button>
                      <Button variant="primary" onClick={() => openModal('course')}><Plus className="w-4 h-4" /> New Course</Button>
                    </>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
                <StatCard label="Total Students" value={stats.totalStudents} icon={Users} color="text-blue-600" bg="bg-blue-50" />
                <StatCard label="Instructors" value={stats.totalInstructors} icon={Briefcase} color="text-indigo-600" bg="bg-indigo-50" />
                <StatCard label="Courses" value={stats.totalCourses} icon={BookOpen} color="text-amber-600" bg="bg-amber-50" />
                <StatCard label="Departments" value={stats.totalDepartments} icon={Building2} color="text-emerald-600" bg="bg-emerald-50" />
                <StatCard label="Programs" value={stats.totalPrograms} icon={GraduationCap} color="text-violet-600" bg="bg-violet-50" />
              </div>
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-black text-gray-900 mb-4">Active Semester</h3>
                <p className="text-2xl font-bold text-slate-800">{stats.activeSemester}</p>
              </div>
            </div>
          )}

          {(activeTab === 'students' || activeTab === 'instructors' || activeTab === 'courses' || activeTab === 'departments' || activeTab === 'programs' || activeTab === 'semesters') && (
            <div>
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
                <h2 className="text-3xl font-black text-gray-900 capitalize">{TAB_LABELS[activeTab]}</h2>
                <div className="flex flex-wrap gap-2 items-center">
                  {activeTab === 'programs' && (
                    <select
                      value={programTypeFilter}
                      onChange={(e) => setProgramTypeFilter(e.target.value)}
                      className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white"
                    >
                      <option value="">All program types</option>
                      <option value="DECLARED">DECLARED</option>
                      <option value="UNDECLARED">UNDECLARED</option>
                    </select>
                  )}
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
                  {isSuperAdmin && activeTab === 'departments' && (
                    <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-bold">
                      <button type="button" className={`px-3 py-2 ${deptView === 'active' ? 'bg-slate-900 text-white' : 'bg-white'}`} onClick={() => setDeptView('active')}>Active</button>
                      <button type="button" className={`px-3 py-2 ${deptView === 'trash' ? 'bg-slate-900 text-white' : 'bg-white'}`} onClick={() => setDeptView('trash')}>Trash</button>
                    </div>
                  )}
                  {isSuperAdmin && activeTab === 'programs' && (
                    <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-bold">
                      <button type="button" className={`px-3 py-2 ${progView === 'active' ? 'bg-slate-900 text-white' : 'bg-white'}`} onClick={() => setProgView('active')}>Active</button>
                      <button type="button" className={`px-3 py-2 ${progView === 'trash' ? 'bg-slate-900 text-white' : 'bg-white'}`} onClick={() => setProgView('trash')}>Trash</button>
                    </div>
                  )}
                  {can('create') && (
                    <Button
                      variant="primary"
                      onClick={() => {
                        if (activeTab === 'courses') openModal('course');
                        else if (activeTab === 'departments') openModal('department');
                        else if (activeTab === 'programs') openModal('program');
                        else if (activeTab === 'semesters') openModal('semester');
                        else toast('Use registrar tools for new records', { icon: 'ℹ️' });
                      }}
                    >
                      <Plus className="w-4 h-4" /> Add
                    </Button>
                  )}
                </div>
              </div>

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

              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50/50">
                      <tr>
                        <th className="px-4 py-3 w-10">
                          {showRowCheckbox ? (
                            <input
                              type="checkbox"
                              aria-label="Select all on page"
                              checked={pagedRows.length > 0 && pagedRows.every((r) => selectedIds.has(r.id))}
                              onChange={selectAllPage}
                            />
                          ) : null}
                        </th>
                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase">Primary</th>
                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase">Secondary</th>
                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase text-center">Status</th>
                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase text-right">Actions</th>
                      </tr>
                    </thead>
                    {tableBusy ? (
                      <TableSkeleton rows={5} cols={5} />
                    ) : (
                      <tbody className="divide-y divide-gray-50">
                        {activeTab === 'students' && pagedRows.map((s) => (
                          <tr key={s.id} className="hover:bg-blue-50/40">
                            <td className="px-4 py-3">
                              <input type="checkbox" checked={selectedIds.has(s.id)} onChange={() => toggleSelect(s.id)} />
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-sm font-bold text-gray-900">{s.user?.name}</p>
                              <p className="text-[10px] text-gray-400">{s.studentId}</p>
                            </td>
                            <td className="px-4 py-3 text-xs font-semibold text-gray-500">{s.program?.code}</td>
                            <td className="px-4 py-3 text-center"><Badge status={s.status} /></td>
                            <td className="px-4 py-3 text-right"><MoreVertical className="w-5 h-5 text-gray-300 inline" /></td>
                          </tr>
                        ))}
                        {activeTab === 'instructors' && pagedRows.map((i) => (
                          <tr key={i.id} className="hover:bg-blue-50/40">
                            <td className="px-4 py-3" />
                            <td className="px-4 py-3">
                              <p className="text-sm font-bold text-gray-900">{i.user?.name}</p>
                              <p className="text-[10px] text-gray-400">{i.employeeId}</p>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-500">{i.department?.code}</td>
                            <td className="px-4 py-3 text-center"><Badge status="INSTRUCTOR" /></td>
                            <td className="px-4 py-3 text-right"><MoreVertical className="w-5 h-5 text-gray-300 inline" /></td>
                          </tr>
                        ))}
                        {activeTab === 'courses' && pagedRows.map((c) => (
                          <tr key={c.id} className="hover:bg-blue-50/40">
                            <td className="px-4 py-3" />
                            <td className="px-4 py-3">
                              <p className="text-sm font-bold text-gray-900">{c.title}</p>
                              <p className="text-[10px] text-gray-500">{c.code}</p>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-500">{c.department?.name}</td>
                            <td className="px-4 py-3 text-center text-xs text-gray-500">{c.credits} cr</td>
                            <td className="px-4 py-3 text-right"><MoreVertical className="w-5 h-5 text-gray-300 inline" /></td>
                          </tr>
                        ))}
                        {activeTab === 'departments' && pagedRows.map((d) => (
                          <tr key={d.id} className="hover:bg-blue-50/40">
                            <td className="px-4 py-3" />
                            <td className="px-4 py-3 font-bold text-gray-900">{d.name}</td>
                            <td className="px-4 py-3 text-xs font-mono text-gray-500">{d.code}</td>
                            <td className="px-4 py-3 text-center text-xs">{deptView === 'trash' ? <Badge status="SUSPENDED" /> : <span className="text-emerald-600 font-bold">{d.programs?.length ?? 0} programs</span>}</td>
                            <td className="px-4 py-3 text-right">
                              {deptView === 'trash' && isSuperAdmin ? (
                                <Button variant="secondary" className="!py-1 !text-xs" onClick={() => restoreDept(d.id)}>Restore</Button>
                              ) : (
                                <div className="flex justify-end gap-2">
                                  {can('create') && <button type="button" className="text-blue-600" onClick={() => openModal('editDepartment', d)}><Pencil className="w-4 h-4" /></button>}
                                  {can('delete') && <button type="button" className="text-red-600" onClick={() => setDeleteTarget({ type: 'department', id: d.id, name: d.name })}><Trash2 className="w-4 h-4" /></button>}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                        {activeTab === 'programs' && pagedRows.map((p) => (
                          <tr key={p.id} className="hover:bg-blue-50/40">
                            <td className="px-4 py-3">
                              {progView === 'active' ? (
                                <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleSelect(p.id)} />
                              ) : null}
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-sm font-bold text-gray-900">{p.name}</p>
                              <p className="text-[10px] text-gray-500">{p.code}</p>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-500">{p.department?.name || '—'}</td>
                            <td className="px-4 py-3 text-center">{progView === 'trash' ? <Badge status="SUSPENDED" /> : <Badge status={p.type} />}</td>
                            <td className="px-4 py-3 text-right">
                              {progView === 'trash' && isSuperAdmin ? (
                                <Button variant="secondary" className="!py-1 !text-xs" onClick={() => restoreProg(p.id)}>Restore</Button>
                              ) : (
                                <div className="flex justify-end gap-2">
                                  {can('create') && <button type="button" className="text-blue-600" onClick={() => openModal('editProgram', p)}><Pencil className="w-4 h-4" /></button>}
                                  {can('delete') && <button type="button" className="text-red-600" onClick={() => setDeleteTarget({ type: 'program', id: p.id, name: p.name })}><Trash2 className="w-4 h-4" /></button>}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                        {activeTab === 'semesters' && pagedRows.map((sem) => (
                          <tr key={sem.id} className="hover:bg-blue-50/40">
                            <td className="px-4 py-3" />
                            <td className="px-4 py-3 font-bold text-gray-900">{sem.name}</td>
                            <td className="px-4 py-3 text-xs text-gray-500">{new Date(sem.startDate).toLocaleDateString()} – {new Date(sem.endDate).toLocaleDateString()}</td>
                            <td className="px-4 py-3 text-center">{sem.isActive ? <Badge status="ACTIVE" /> : <span className="text-gray-400 text-xs font-bold">Inactive</span>}</td>
                            <td className="px-4 py-3 text-right">
                              {!sem.isActive && (
                                <Button variant="secondary" className="!py-1 !text-xs" onClick={() => handleActivateSemester(sem.id)}>Set active</Button>
                              )}
                            </td>
                          </tr>
                        ))}
                        {pagedRows.length === 0 && (
                          <tr>
                            <td colSpan={5} className="p-0">
                              <EmptyState
                                icon={GraduationCap}
                                message="No records match your filters."
                                actionLabel={can('create') ? 'Add' : undefined}
                                onAction={can('create') ? () => openModal(activeTab === 'programs' ? 'program' : 'department') : undefined}
                              />
                            </td>
                          </tr>
                        )}
                      </tbody>
                    )}
                  </table>
                </div>
                <Pagination
                  total={currentList.length}
                  page={page}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}
                />
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div>
              <h2 className="text-3xl font-black text-gray-900 mb-6">Notifications</h2>
              <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
                {notifications.length === 0 ? (
                  <EmptyState icon={AlertCircle} message="No notifications yet." />
                ) : (
                  <div className="divide-y divide-gray-50">
                    {notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`p-6 flex gap-4 ${!notif.isRead ? 'bg-blue-50/30' : ''}`}
                        onMouseEnter={() => !notif.isRead && markNotificationRead(notif.id)}
                      >
                        <AlertCircle className="w-6 h-6 text-blue-500 shrink-0" />
                        <div>
                          <p className="font-bold text-gray-900">{notif.title}</p>
                          <p className="text-sm text-gray-500">{notif.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'audit' && isSuperAdmin && (
            <div>
              <h2 className="text-3xl font-black text-gray-900 mb-6">Audit Log</h2>
              <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3">Actor</th>
                      <th className="px-4 py-3">Action</th>
                      <th className="px-4 py-3">Entity</th>
                      <th className="px-4 py-3">Details</th>
                      <th className="px-4 py-3">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {auditLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="px-4 py-3">{log.User?.name}</td>
                        <td className="px-4 py-3"><Badge status={log.action} /></td>
                        <td className="px-4 py-3 font-mono text-xs">{log.resource}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{JSON.stringify(log.details)}</td>
                        <td className="px-4 py-3 text-xs">{new Date(log.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Pagination
                  total={auditTotal}
                  page={Math.floor(auditSkip / pageSize) + 1}
                  pageSize={pageSize}
                  onPageChange={(p) => fetchAudit((p - 1) * pageSize)}
                  onPageSizeChange={(n) => { setPageSize(n); fetchAudit(0); }}
                />
              </div>
            </div>
          )}
        </div>
      </main>

      <Modal isOpen={assignOpen} onClose={() => setAssignOpen(false)} title="Assign program" subtitle="Apply to all selected students" accentColor="blue">
        <select
          value={assignProgramId}
          onChange={(e) => setAssignProgramId(e.target.value)}
          className="w-full border rounded-xl px-3 py-2 mb-4 text-sm"
        >
          <option value="">Select program</option>
          {programs.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
        </select>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => setAssignOpen(false)}>Cancel</Button>
          <Button variant="primary" className="flex-1" onClick={runBulkAssignProgram}>Apply</Button>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          setSaving(true);
          try {
            if (deleteTarget.type === 'department') await handleDeleteDepartment(deleteTarget.id);
            if (deleteTarget.type === 'program') await handleDeleteProgram(deleteTarget.id);
            setDeleteTarget(null);
          } finally { setSaving(false); }
        }}
        itemName={deleteTarget?.name || ''}
        entityType={deleteTarget?.type}
        loading={saving}
      />

      {modal === 'course' && (
        <Modal isOpen onClose={closeModal} title="Create course" accentColor="slate">
          <form onSubmit={handleCreateCourse} className="space-y-4">
            <Input label="Code" name="code" required value={form.code || ''} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            <Input label="Title" name="title" required value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Input label="Credits" name="credits" type="number" value={form.credits || ''} onChange={(e) => setForm({ ...form, credits: e.target.value })} />
            <div>
              <label className="text-xs font-semibold text-gray-600">Department</label>
              <select required value={form.departmentId || ''} onChange={(e) => setForm({ ...form, departmentId: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">Select</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="secondary" className="flex-1" onClick={closeModal}>Cancel</Button>
              <Button type="submit" variant="primary" className="flex-1" loading={saving}>Create</Button>
            </div>
          </form>
        </Modal>
      )}

      {(modal === 'department' || modal === 'editDepartment') && (
        <Modal isOpen onClose={closeModal} title={modal === 'editDepartment' ? 'Edit department' : 'Add department'} accentColor="emerald">
          <form onSubmit={modal === 'editDepartment' ? handleUpdateDepartment : handleCreateDepartment} className="space-y-4">
            <Input label="Name" name="name" required value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="Code" name="code" required value={form.code || ''} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            <div>
              <label className="text-xs font-semibold text-gray-600">Description</label>
              <textarea value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" rows={3} />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" className="flex-1" onClick={closeModal}>Cancel</Button>
              <Button type="submit" variant="primary" className="flex-1" loading={saving}>Save</Button>
            </div>
          </form>
        </Modal>
      )}

      {(modal === 'program' || modal === 'editProgram') && (
        <Modal isOpen onClose={closeModal} title={modal === 'editProgram' ? 'Edit program' : 'Add program'} accentColor="amber">
          <form onSubmit={modal === 'editProgram' ? handleUpdateProgram : handleCreateProgram} className="space-y-4">
            <Input label="Name" name="name" required value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="Code" name="code" required value={form.code || ''} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            <div>
              <label className="text-xs font-semibold text-gray-600">Type</label>
              <select value={form.type || 'DECLARED'} onChange={(e) => setForm({ ...form, type: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm">
                <option value="DECLARED">DECLARED</option>
                <option value="UNDECLARED">UNDECLARED</option>
              </select>
            </div>
            {form.type === 'DECLARED' && (
              <div>
                <label className="text-xs font-semibold text-gray-600">Department</label>
                <select required value={form.departmentId || ''} onChange={(e) => setForm({ ...form, departmentId: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">Select</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            )}
            <Input label="Duration (years)" name="dur" type="number" value={String(form.durationYears ?? 4)} onChange={(e) => setForm({ ...form, durationYears: e.target.value })} />
            <Input label="Total credits" name="tc" type="number" value={String(form.totalCredits ?? 120)} onChange={(e) => setForm({ ...form, totalCredits: e.target.value })} />
            <div className="flex gap-2">
              <Button type="button" variant="secondary" className="flex-1" onClick={closeModal}>Cancel</Button>
              <Button type="submit" variant="primary" className="flex-1" loading={saving}>Save</Button>
            </div>
          </form>
        </Modal>
      )}

      {modal === 'semester' && (
        <Modal isOpen onClose={closeModal} title="Create semester" accentColor="blue">
          <form onSubmit={handleCreateSemester} className="space-y-3">
            <Input label="Name" name="n" required value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-600">Type</label>
                <select value={form.type || 'FALL'} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full border rounded-lg px-2 py-2 text-sm">
                  <option value="FALL">FALL</option>
                  <option value="SPRING">SPRING</option>
                  <option value="SUMMER">SUMMER</option>
                </select>
              </div>
              <Input label="Year" name="y" type="number" value={form.year || ''} onChange={(e) => setForm({ ...form, year: e.target.value })} />
            </div>
            <Input label="Start" name="sd" type="date" value={form.startDate || ''} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            <Input label="End" name="ed" type="date" value={form.endDate || ''} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            <Input label="Reg start" name="rs" type="date" value={form.registrationStart || ''} onChange={(e) => setForm({ ...form, registrationStart: e.target.value })} />
            <Input label="Reg end" name="re" type="date" value={form.registrationEnd || ''} onChange={(e) => setForm({ ...form, registrationEnd: e.target.value })} />
            <Input label="Add deadline" name="ad" type="date" value={form.addDeadline || ''} onChange={(e) => setForm({ ...form, addDeadline: e.target.value })} />
            <Input label="Drop deadline" name="dd" type="date" value={form.dropDeadline || ''} onChange={(e) => setForm({ ...form, dropDeadline: e.target.value })} />
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="secondary" className="flex-1" onClick={closeModal}>Cancel</Button>
              <Button type="submit" variant="primary" className="flex-1" loading={saving}>Create</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
