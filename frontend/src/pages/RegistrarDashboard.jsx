import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
  Users, BookOpen, GraduationCap, CheckCircle, AlertCircle,
  Calendar, CreditCard, FileText, LayoutDashboard, Settings,
  Search, ArrowUpRight, TrendingUp, Clock, Lock, Unlock,
  ChevronRight, RefreshCw, X, AlertTriangle, Bell, LogOut, Menu
} from 'lucide-react';

const StatusPill = ({ status }) => {
  const map = {
    SUBMITTED: 'bg-amber-50 text-amber-700 border-amber-200',
    APPROVED:  'bg-emerald-50 text-emerald-700 border-emerald-200',
    REJECTED:  'bg-red-50 text-red-700 border-red-200',
    DRAFT:     'bg-gray-50 text-gray-500 border-gray-200',
  };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${map[status] || 'bg-gray-50 text-gray-400 border-gray-200'}`}>
      {status}
    </span>
  );
};

function toLocalInputValue(d) {
  if (!d) return '';
  const x = new Date(d);
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset());
  return x.toISOString().slice(0, 16);
}

function registrationBadge(sem) {
  const now = Date.now();
  const rs = new Date(sem.registrationStart).getTime();
  const re = new Date(sem.registrationEnd).getTime();
  if (now < rs) return { text: 'Window: upcoming', className: 'bg-brand-50 text-brand-700 border-brand-200' };
  if (now <= re) return { text: 'Window: open', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  return { text: 'Window: closed', className: 'bg-gray-50 text-gray-600 border-gray-200' };
}

const RegistrarDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [semesters, setSemesters] = useState([]);
  const [pendingRegs, setPendingRegs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState({});
  // Lifecycle
  const [allStudents, setAllStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  const [editSem, setEditSem] = useState(null);
  const [semForm, setSemForm] = useState({});
  const [semSaving, setSemSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '', type: 'SPRING', year: String(new Date().getFullYear()),
    startDate: '', endDate: '', registrationStart: '', registrationEnd: '',
    dropDeadline: '', addDeadline: '',
  });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [statsRes, semRes, regRes, notifRes] = await Promise.allSettled([
        api.get('/registrar/dashboard/stats'),
        api.get('/academic/semesters'),
        api.get('/registrar/registrations/pending'),
        api.get('/users/notifications'),
      ]);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data.data || {});
      if (semRes.status === 'fulfilled')   setSemesters(semRes.value.data.data || []);
      if (regRes.status === 'fulfilled')   setPendingRegs(regRes.value.data.data || []);
      if (notifRes.status === 'fulfilled') setNotifications(notifRes.value.data.data || []);
    } catch { toast.error('Failed to load dashboard'); }
    finally { setLoading(false); }
  };

  const openRegistration = async (semId) => {
    setActionLoading(a => ({ ...a, [semId]: true }));
    try {
      await api.put(`/registrar/semesters/${semId}/open-registration`);
      toast.success('Registration opened — students can now register');
      fetchAll();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setActionLoading(a => ({ ...a, [semId]: false })); }
  };

  const closeRegistration = async () => {
    try {
      await api.put('/registrar/semesters/close-registration');
      toast.success('Registration closed');
      fetchAll();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
  };

  const approveReg = async (id) => {
    setActionLoading(a => ({ ...a, [id]: 'approve' }));
    try {
      await api.put(`/registrar/registrations/${id}/approve`, { status: 'APPROVED' });
      toast.success('Registration approved — courses assigned automatically');
      fetchAll();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to approve'); }
    finally { setActionLoading(a => ({ ...a, [id]: null })); }
  };

  const rejectReg = async () => {
    if (!rejectModal) return;
    setActionLoading(a => ({ ...a, [rejectModal]: 'reject' }));
    try {
      await api.put(`/registrar/registrations/${rejectModal}/approve`, { status: 'REJECTED', rejectionReason: rejectReason });
      toast.success('Registration rejected');
      setRejectModal(null); setRejectReason('');
      fetchAll();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to reject'); }
    finally { setActionLoading(a => ({ ...a, [rejectModal]: null })); }
  };

  const markRead = async (id) => {
    try {
      await api.put(`/users/notifications/${id}/read`);
      setNotifications(n => n.map(x => x.id === id ? { ...x, isRead: true } : x));
    } catch {}
  };

  const fetchStudents = async () => {
    setStudentsLoading(true);
    try {
      const res = await api.get('/registrar/students');
      setAllStudents(res.data.data || []);
    } catch { toast.error('Failed to load students'); }
    finally { setStudentsLoading(false); }
  };

  const progressOne = async (studentId) => {
    setActionLoading(a => ({ ...a, [studentId]: 'progress' }));
    try {
      const res = await api.post(`/registrar/students/${studentId}/progress`);
      const r = res.data.data;
      if (r.promoted) toast.success(r.graduated ? `Student graduated!` : `Promoted to ${r.newLevel}`);
      else toast.error(r.reason);
      fetchStudents();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setActionLoading(a => ({ ...a, [studentId]: null })); }
  };

  const graduateOne = async (studentId) => {
    setActionLoading(a => ({ ...a, [studentId]: 'graduate' }));
    try {
      await api.post(`/registrar/students/${studentId}/graduate`);
      toast.success('Student graduated successfully');
      fetchStudents();
    } catch (e) { toast.error(e.response?.data?.message || 'Not eligible for graduation'); }
    finally { setActionLoading(a => ({ ...a, [studentId]: null })); }
  };

  const openSemesterEdit = (sem) => {
    setEditSem(sem);
    setSemForm({
      name: sem.name,
      type: sem.type,
      year: String(sem.year),
      startDate: toLocalInputValue(sem.startDate),
      endDate: toLocalInputValue(sem.endDate),
      registrationStart: toLocalInputValue(sem.registrationStart),
      registrationEnd: toLocalInputValue(sem.registrationEnd),
      dropDeadline: toLocalInputValue(sem.dropDeadline),
      addDeadline: toLocalInputValue(sem.addDeadline),
    });
  };

  const saveSemesterDates = async () => {
    if (!editSem) return;
    setSemSaving(true);
    try {
      await api.put(`/academic/semesters/${editSem.id}`, {
        name: semForm.name,
        type: semForm.type,
        year: parseInt(semForm.year, 10),
        startDate: new Date(semForm.startDate).toISOString(),
        endDate: new Date(semForm.endDate).toISOString(),
        registrationStart: new Date(semForm.registrationStart).toISOString(),
        registrationEnd: new Date(semForm.registrationEnd).toISOString(),
        dropDeadline: new Date(semForm.dropDeadline).toISOString(),
        addDeadline: new Date(semForm.addDeadline).toISOString(),
      });
      toast.success('Semester updated');
      setEditSem(null);
      fetchAll();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save semester');
    } finally {
      setSemSaving(false);
    }
  };

  const submitCreateSemester = async () => {
    setSemSaving(true);
    try {
      await api.post('/academic/semesters', {
        name: createForm.name,
        type: createForm.type,
        year: parseInt(createForm.year, 10),
        startDate: new Date(createForm.startDate).toISOString(),
        endDate: new Date(createForm.endDate).toISOString(),
        registrationStart: new Date(createForm.registrationStart).toISOString(),
        registrationEnd: new Date(createForm.registrationEnd).toISOString(),
        dropDeadline: new Date(createForm.dropDeadline).toISOString(),
        addDeadline: new Date(createForm.addDeadline).toISOString(),
      });
      toast.success('Semester created');
      setCreateOpen(false);
      fetchAll();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to create semester');
    } finally {
      setSemSaving(false);
    }
  };

  const bulkProgress = async () => {
    setActionLoading(a => ({ ...a, bulk: true }));
    try {
      const res = await api.post('/registrar/students/bulk-progress');
      const d = res.data.data;
      setBulkResult(d);
      toast.success(`Bulk progress: ${d.promoted}/${d.total} students promoted`);
      fetchStudents();
    } catch (e) { toast.error(e.response?.data?.message || 'Bulk progress failed'); }
    finally { setActionLoading(a => ({ ...a, bulk: false })); }
  };

  const unread = notifications.filter(n => !n.isRead).length;

  const navItems = [
    { id: 'overview',      label: 'Overview',       Icon: LayoutDashboard },
    { id: 'registrations', label: 'Registrations',  Icon: CheckCircle, badge: stats.pendingRegistrations || 0 },
    { id: 'semesters',     label: 'Semesters',      Icon: Calendar },
    { id: 'lifecycle',     label: 'Lifecycle',      Icon: GraduationCap },
    { id: 'notifications', label: 'Notifications',  Icon: Bell, badge: unread },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-700 mx-auto" />
          <p className="mt-3 text-sm text-gray-500 font-medium">Loading Registrar Dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden" 
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 flex flex-col shrink-0 transition-transform duration-300 lg:static lg:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="px-5 py-5 border-b border-slate-700/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-brand-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">A</div>
            <div>
              <p className="text-white font-bold text-sm leading-tight">NGUC Portal</p>
              <p className="text-slate-400 text-[11px]">Registrar</p>
            </div>
          </div>
          <button 
            className="lg:hidden p-1.5 text-slate-400 hover:text-white"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ id, label, Icon, badge }) => (
            <button key={id} onClick={() => { 
              setActiveTab(id); 
              if (id === 'lifecycle') fetchStudents(); 
              setIsMobileMenuOpen(false);
            }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                activeTab === id ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}>
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left">{label}</span>
              {badge > 0 && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === id ? 'bg-white/20 text-white' : 'bg-slate-700 text-slate-300'}`}>{badge}</span>}
            </button>
          ))}
          <div className="pt-4 border-t border-slate-700/50 mt-4">
            {[
              { label: 'Admissions',    to: '/registrar/admissions' },
              { label: 'Payments',      to: '/registrar/payments', badge: stats.unpaidStudentsCount },
              { label: 'Students',      to: '/registrar/students' },
              { label: 'Academic Setup',to: '/registrar/setup' },
            ].map(({ label, to, badge }) => (
              <Link key={to} to={to} onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-700/50 transition">
                <ChevronRight className="w-4 h-4 shrink-0" />
                <span className="flex-1">{label}</span>
                {badge > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500 text-white">
                    {badge}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </nav>
        <div className="px-4 py-4 border-t border-slate-700/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center text-white font-bold text-xs">{user?.name?.charAt(0)}</div>
            <div className="min-w-0">
              <p className="text-white text-xs font-semibold truncate">{user?.name}</p>
              <p className="text-slate-400 text-[10px]">Registrar</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 h-14 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button 
              className="lg:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-lg transition"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 w-48 md:w-64">
              <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <input type="text" placeholder="Search..." className="bg-transparent border-none focus:ring-0 text-sm ml-2 w-full outline-none text-gray-700 placeholder-gray-400" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchAll} className="p-2 rounded-lg hover:bg-gray-100 transition text-gray-400">
              <RefreshCw className="w-4 h-4" />
            </button>
            <div className="relative">
              <Bell className="w-4 h-4 text-gray-500" />
              {unread > 0 && <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold">{unread}</span>}
            </div>
            <div className="w-7 h-7 rounded-full bg-brand-700 flex items-center justify-center text-white font-bold text-xs">{user?.name?.charAt(0)}</div>
            <button 
              onClick={logout}
              className="flex items-center gap-2 text-gray-500 hover:text-red-600 transition text-xs font-medium border-l border-gray-200 pl-3"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-5 lg:p-6 space-y-6">

          {/* ── OVERVIEW ── */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Registrar Dashboard</h1>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Active Semester: <span className="font-semibold text-brand-700">{stats.activeSemester || 'None'}</span>
                    {stats.registrationOpen
                      ? <span className="ml-2 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">REGISTRATION OPEN</span>
                      : <span className="ml-2 text-[10px] font-bold text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full">REGISTRATION CLOSED</span>
                    }
                  </p>
                </div>
                <div className="flex gap-2">
                  {stats.registrationOpen
                    ? <button onClick={closeRegistration} className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition">
                        <Lock className="w-4 h-4" /> Close Registration
                      </button>
                    : null
                  }
                  <button onClick={() => setActiveTab('registrations')} className="flex items-center gap-2 bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-800 transition">
                    <CheckCircle className="w-4 h-4" /> Review Requests ({stats.pendingRegistrations || 0})
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                  { label: 'Total Students',        value: stats.totalStudents || 0,        Icon: Users,         color: 'text-brand-700',    bg: 'bg-brand-50' },
                  { label: 'Pending Registrations', value: stats.pendingRegistrations || 0, Icon: Clock,         color: 'text-amber-700',   bg: 'bg-amber-50' },
                  { label: 'New Applications',      value: stats.pendingApplications || 0,  Icon: GraduationCap, color: 'text-indigo-700',  bg: 'bg-indigo-50' },
                  { label: 'Unpaid Students',       value: stats.unpaidStudentsCount || 0,  Icon: AlertTriangle, color: 'text-red-700',     bg: 'bg-red-50', link: '/registrar/payments?status=UNPAID' },
                  { label: 'Revenue This Month',    value: `${(stats.paymentsThisMonth || 0).toLocaleString()} ETB`, Icon: TrendingUp, color: 'text-emerald-700', bg: 'bg-emerald-50' },
                ].map(({ label, value, Icon, color, bg, link }) => (
                  <div key={label} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                    <div className={`${bg} ${color} p-2.5 rounded-lg w-fit mb-3`}><Icon className="w-4 h-4" /></div>
                    <p className="text-xs font-medium text-gray-500">{label}</p>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-2xl font-bold text-gray-900">{value}</p>
                      {link && (
                        <Link to={link} className="text-brand-600 hover:text-brand-700">
                          <ArrowUpRight className="w-4 h-4" />
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pending registrations preview */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600" /> Pending Registration Requests
                  </h2>
                  <button onClick={() => setActiveTab('registrations')} className="text-xs text-brand-700 font-semibold hover:underline">View all</button>
                </div>
                {pendingRegs.length === 0 ? (
                  <div className="p-10 text-center text-sm text-gray-400">No pending registrations.</div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {pendingRegs.slice(0, 5).map(reg => (
                      <div key={reg.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-gray-50/50 transition">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center text-brand-700 font-bold text-xs shrink-0">
                            {reg.student?.user?.name?.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{reg.student?.user?.name}</p>
                            <p className="text-[11px] text-gray-400">{reg.student?.studentId} · {reg.student?.program?.code}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => approveReg(reg.id)} disabled={actionLoading[reg.id] === 'approve'}
                            className="flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-emerald-700 transition disabled:opacity-50">
                            {actionLoading[reg.id] === 'approve' ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                            Approve
                          </button>
                          <button onClick={() => setRejectModal(reg.id)}
                            className="flex items-center gap-1.5 bg-white border border-red-200 text-red-600 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-50 transition">
                            <X className="w-3.5 h-3.5" /> Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── REGISTRATIONS TAB ── */}
          {activeTab === 'registrations' && (
            <div className="space-y-5">
              <div>
                <h1 className="text-xl font-bold text-gray-900">Registration Requests</h1>
                <p className="text-sm text-gray-500 mt-0.5">{pendingRegs.length} pending approval</p>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        {['Student', 'Program', 'Year / Semester', 'Credits', 'Submitted', 'Status', 'Actions'].map(h => (
                          <th key={h} className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {pendingRegs.length === 0 ? (
                        <tr><td colSpan="7" className="px-5 py-14 text-center text-sm text-gray-400">No pending registration requests.</td></tr>
                      ) : pendingRegs.map(reg => (
                        <tr key={reg.id} className="hover:bg-gray-50/50 transition">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center text-brand-700 font-bold text-xs shrink-0">
                                {reg.student?.user?.name?.charAt(0)}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-gray-900">{reg.student?.user?.name}</p>
                                <p className="text-[10px] text-gray-400">{reg.student?.studentId}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-xs text-gray-600 font-medium">{reg.student?.program?.name}</td>
                          <td className="px-5 py-3.5 text-xs text-gray-600">
                            Year {reg.student?.currentYear} · {reg.student?.currentSemester}
                          </td>
                          <td className="px-5 py-3.5 text-center text-sm font-bold text-gray-900">{reg.totalCredits}</td>
                          <td className="px-5 py-3.5 text-xs text-gray-500">
                            {new Date(reg.registrationDate || reg.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-5 py-3.5"><StatusPill status={reg.status} /></td>
                          <td className="px-5 py-3.5">
                            {reg.status === 'SUBMITTED' && (
                              <div className="flex gap-2">
                                <button onClick={() => approveReg(reg.id)} disabled={actionLoading[reg.id] === 'approve'}
                                  className="flex items-center gap-1 bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-emerald-700 transition disabled:opacity-50">
                                  {actionLoading[reg.id] === 'approve' ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                                  Approve
                                </button>
                                <button onClick={() => setRejectModal(reg.id)}
                                  className="flex items-center gap-1 bg-white border border-red-200 text-red-600 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-50 transition">
                                  <X className="w-3 h-3" /> Reject
                                </button>
                              </div>
                            )}
                            {reg.status !== 'SUBMITTED' && <StatusPill status={reg.status} />}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── SEMESTERS TAB ── */}
          {activeTab === 'semesters' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Semester Management</h1>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Academic term dates and separate registration open/close windows. Students only register when the active semester’s window is open.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCreateOpen((o) => !o)}
                  className="shrink-0 px-4 py-2 rounded-lg bg-slate-800 text-white text-sm font-semibold hover:bg-slate-900 transition"
                >
                  {createOpen ? 'Cancel' : '+ New semester'}
                </button>
              </div>

              {createOpen && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
                  <h2 className="text-sm font-bold text-gray-900">Create semester</h2>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <label className="block text-xs font-semibold text-gray-600">Name
                      <input className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={createForm.name} onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))} placeholder="Spring 2026" />
                    </label>
                    <label className="block text-xs font-semibold text-gray-600">Type
                      <select className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={createForm.type} onChange={(e) => setCreateForm((f) => ({ ...f, type: e.target.value }))}>
                        {['FALL', 'SPRING', 'SUMMER'].map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </label>
                    <label className="block text-xs font-semibold text-gray-600">Year
                      <input type="number" className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={createForm.year} onChange={(e) => setCreateForm((f) => ({ ...f, year: e.target.value }))} />
                    </label>
                  </div>
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Academic term</p>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <label className="text-xs text-gray-600">Start <input type="datetime-local" className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={createForm.startDate} onChange={(e) => setCreateForm((f) => ({ ...f, startDate: e.target.value }))} /></label>
                    <label className="text-xs text-gray-600">End <input type="datetime-local" className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={createForm.endDate} onChange={(e) => setCreateForm((f) => ({ ...f, endDate: e.target.value }))} /></label>
                  </div>
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Registration window</p>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <label className="text-xs text-gray-600">Opens <input type="datetime-local" className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={createForm.registrationStart} onChange={(e) => setCreateForm((f) => ({ ...f, registrationStart: e.target.value }))} /></label>
                    <label className="text-xs text-gray-600">Closes <input type="datetime-local" className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={createForm.registrationEnd} onChange={(e) => setCreateForm((f) => ({ ...f, registrationEnd: e.target.value }))} /></label>
                  </div>
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Add / drop</p>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <label className="text-xs text-gray-600">Add deadline <input type="datetime-local" className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={createForm.addDeadline} onChange={(e) => setCreateForm((f) => ({ ...f, addDeadline: e.target.value }))} /></label>
                    <label className="text-xs text-gray-600">Drop deadline <input type="datetime-local" className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={createForm.dropDeadline} onChange={(e) => setCreateForm((f) => ({ ...f, dropDeadline: e.target.value }))} /></label>
                  </div>
                  <button type="button" disabled={semSaving} onClick={submitCreateSemester} className="bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-800 disabled:opacity-50">
                    {semSaving ? 'Saving…' : 'Create semester'}
                  </button>
                </div>
              )}

              {stats.registrationOpen && (
                <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4">
                  <Unlock className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-emerald-800">Registration is currently OPEN</p>
                    <p className="text-xs text-emerald-700 mt-0.5">Students can submit registration requests for {stats.activeSemester}.</p>
                  </div>
                  <button onClick={closeRegistration} className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-red-700 transition shrink-0">
                    <Lock className="w-3.5 h-3.5" /> Close Registration
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {semesters.map(sem => {
                  const rb = registrationBadge(sem);
                  return (
                  <div key={sem.id} className={`bg-white rounded-xl border shadow-sm p-5 ${sem.isActive ? 'border-emerald-300 ring-2 ring-emerald-100' : 'border-gray-200'}`}>
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-2.5 rounded-lg ${sem.isActive ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {sem.isActive
                          ? <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">ACTIVE</span>
                          : <span className="text-[10px] font-bold text-gray-400 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full">INACTIVE</span>
                        }
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${rb.className}`}>{rb.text}</span>
                      </div>
                    </div>
                    <h3 className="font-bold text-gray-900">{sem.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5 mb-4">{sem.type} · {sem.year}</p>
                    <div className="space-y-1.5 mb-4 text-xs">
                      <div className="flex justify-between gap-2"><span className="text-gray-400 shrink-0">Academic</span><span className="font-medium text-gray-700 text-right">{new Date(sem.startDate).toLocaleString()} — {new Date(sem.endDate).toLocaleString()}</span></div>
                      <div className="flex justify-between gap-2"><span className="text-gray-400 shrink-0">Reg. opens</span><span className="font-medium text-gray-700 text-right">{new Date(sem.registrationStart).toLocaleString()}</span></div>
                      <div className="flex justify-between gap-2"><span className="text-gray-400 shrink-0">Reg. closes</span><span className="font-medium text-gray-700 text-right">{new Date(sem.registrationEnd).toLocaleString()}</span></div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button type="button" onClick={() => openSemesterEdit(sem)} className="w-full py-2 rounded-lg text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition">
                        Edit dates & name
                      </button>
                      {!sem.isActive && (
                        <button onClick={() => openRegistration(sem.id)} disabled={actionLoading[sem.id]}
                          className="w-full flex items-center justify-center gap-2 bg-brand-700 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-800 transition disabled:opacity-50">
                          {actionLoading[sem.id] ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Unlock className="w-4 h-4" />}
                          Set as active semester
                        </button>
                      )}
                      {sem.isActive && (
                        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5">
                          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                          <p className="text-xs text-emerald-700 font-medium">This is the active catalog semester — registration follows the window above.</p>
                        </div>
                      )}
                    </div>
                  </div>
                );})}
              </div>
            </div>
          )}

          {/* ── LIFECYCLE TAB ── */}
          {activeTab === 'lifecycle' && (
            <div className="space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Student Lifecycle Management</h1>
                  <p className="text-sm text-gray-500 mt-0.5">Promote students to next year, check graduation eligibility, or bulk-progress all eligible students.</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={fetchStudents} className="flex items-center gap-2 bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 transition">
                    <RefreshCw className="w-4 h-4" /> Refresh
                  </button>
                  <button onClick={bulkProgress} disabled={actionLoading.bulk}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-50">
                    {actionLoading.bulk ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <GraduationCap className="w-4 h-4" />}
                    Bulk Progress All
                  </button>
                </div>
              </div>

              {bulkResult && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-5 py-4 flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-indigo-600 shrink-0" />
                  <p className="text-sm font-semibold text-indigo-800">
                    Bulk progress complete: <strong>{bulkResult.promoted}</strong> of <strong>{bulkResult.total}</strong> students promoted.
                  </p>
                  <button onClick={() => setBulkResult(null)} className="ml-auto text-indigo-400 hover:text-indigo-600"><X className="w-4 h-4" /></button>
                </div>
              )}

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                  <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-600" /> All Students
                  </h2>
                  <span className="text-xs text-gray-400">{allStudents.length} total</span>
                </div>
                {studentsLoading ? (
                  <div className="p-10 text-center text-sm text-gray-400">Loading students…</div>
                ) : allStudents.length === 0 ? (
                  <div className="p-10 text-center text-sm text-gray-400">No students found. Click Refresh to load.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50">
                          {['Student', 'Program', 'Year / Level', 'CGPA', 'Status', 'Actions'].map(h => (
                            <th key={h} className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {allStudents.map(s => {
                          const levelMap = { FRESHMAN:'Year 1', SOPHOMORE:'Year 2', JUNIOR:'Year 3', SENIOR:'Year 4', GRADUATED:'Graduated', ADMITTED:'Admitted' };
                          const levelLabel = levelMap[s.academicLevel] || `Year ${s.currentYear}`;
                          const isGrad = s.status === 'GRADUATED' || s.academicLevel === 'GRADUATED';
                          return (
                            <tr key={s.id} className="hover:bg-gray-50/50 transition">
                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-700 font-bold text-xs shrink-0">
                                    {s.user?.name?.charAt(0)}
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-gray-900">{s.user?.name}</p>
                                    <p className="text-[10px] text-gray-400">{s.studentId}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-3.5 text-xs text-gray-600">{s.program?.code || '—'}</td>
                              <td className="px-5 py-3.5">
                                <span className="text-xs font-semibold text-gray-700">{levelLabel}</span>
                                <p className="text-[10px] text-gray-400">{s.currentSemester}</p>
                              </td>
                              <td className="px-5 py-3.5 text-sm font-bold text-gray-900">{(s.cumulativeGPA || 0).toFixed(2)}</td>
                              <td className="px-5 py-3.5">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  s.status === 'ACTIVE'     ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                  s.status === 'PROBATION'  ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                  s.status === 'GRADUATED'  ? 'bg-brand-50 text-brand-700 border-brand-200' :
                                  s.status === 'SUSPENDED'  ? 'bg-red-50 text-red-700 border-red-200' :
                                  'bg-gray-50 text-gray-500 border-gray-200'
                                }`}>{s.status}</span>
                              </td>
                              <td className="px-5 py-3.5">
                                {!isGrad ? (
                                  <div className="flex gap-2">
                                    <button onClick={() => progressOne(s.id)} disabled={actionLoading[s.id] === 'progress'}
                                      className="flex items-center gap-1 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-indigo-700 transition disabled:opacity-50">
                                      {actionLoading[s.id] === 'progress' ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                                      Promote
                                    </button>
                                    <button onClick={() => graduateOne(s.id)} disabled={actionLoading[s.id] === 'graduate'}
                                      className="flex items-center gap-1 bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-emerald-700 transition disabled:opacity-50">
                                      Graduate
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-full">Graduated</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── NOTIFICATIONS TAB ── */}
          {activeTab === 'notifications' && (
            <div className="space-y-4">
              <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {notifications.length === 0 ? (
                  <div className="p-14 text-center text-sm text-gray-400">No notifications.</div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {notifications.map(n => (
                      <div key={n.id} onMouseEnter={() => !n.isRead && markRead(n.id)}
                        className={`px-5 py-4 flex items-start gap-3 transition ${!n.isRead ? 'bg-brand-50/30' : ''}`}>
                        <div className={`p-2 rounded-lg shrink-0 ${n.type === 'SUCCESS' ? 'bg-emerald-100 text-emerald-600' : n.type === 'ERROR' ? 'bg-red-100 text-red-600' : 'bg-brand-100 text-brand-600'}`}>
                          <Bell className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold ${!n.isRead ? 'text-gray-900' : 'text-gray-600'}`}>{n.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                          <p className="text-[10px] text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                        </div>
                        {!n.isRead && <div className="w-2 h-2 bg-brand-600 rounded-full mt-1.5 shrink-0" />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Semester edit modal */}
      {editSem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <h3 className="font-bold text-gray-900 text-lg mb-1">Edit semester</h3>
            <p className="text-xs text-gray-500 mb-4">{editSem.name}</p>
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-gray-600">Name
                <input className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={semForm.name || ''} onChange={(e) => setSemForm((f) => ({ ...f, name: e.target.value }))} />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs text-gray-600">Type
                  <select className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={semForm.type || 'SPRING'} onChange={(e) => setSemForm((f) => ({ ...f, type: e.target.value }))}>
                    {['FALL', 'SPRING', 'SUMMER'].map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </label>
                <label className="text-xs text-gray-600">Year
                  <input type="number" className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={semForm.year || ''} onChange={(e) => setSemForm((f) => ({ ...f, year: e.target.value }))} />
                </label>
              </div>
              <p className="text-[10px] font-bold text-gray-400 uppercase">Academic term</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-xs text-gray-600">Start <input type="datetime-local" className="mt-1 w-full border rounded-lg px-2 py-2 text-sm" value={semForm.startDate || ''} onChange={(e) => setSemForm((f) => ({ ...f, startDate: e.target.value }))} /></label>
                <label className="text-xs text-gray-600">End <input type="datetime-local" className="mt-1 w-full border rounded-lg px-2 py-2 text-sm" value={semForm.endDate || ''} onChange={(e) => setSemForm((f) => ({ ...f, endDate: e.target.value }))} /></label>
              </div>
              <p className="text-[10px] font-bold text-gray-400 uppercase">Registration window</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-xs text-gray-600">Opens <input type="datetime-local" className="mt-1 w-full border rounded-lg px-2 py-2 text-sm" value={semForm.registrationStart || ''} onChange={(e) => setSemForm((f) => ({ ...f, registrationStart: e.target.value }))} /></label>
                <label className="text-xs text-gray-600">Closes <input type="datetime-local" className="mt-1 w-full border rounded-lg px-2 py-2 text-sm" value={semForm.registrationEnd || ''} onChange={(e) => setSemForm((f) => ({ ...f, registrationEnd: e.target.value }))} /></label>
              </div>
              <p className="text-[10px] font-bold text-gray-400 uppercase">Add / drop</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-xs text-gray-600">Add deadline <input type="datetime-local" className="mt-1 w-full border rounded-lg px-2 py-2 text-sm" value={semForm.addDeadline || ''} onChange={(e) => setSemForm((f) => ({ ...f, addDeadline: e.target.value }))} /></label>
                <label className="text-xs text-gray-600">Drop deadline <input type="datetime-local" className="mt-1 w-full border rounded-lg px-2 py-2 text-sm" value={semForm.dropDeadline || ''} onChange={(e) => setSemForm((f) => ({ ...f, dropDeadline: e.target.value }))} /></label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => setEditSem(null)} className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200">Cancel</button>
              <button type="button" disabled={semSaving} onClick={saveSemesterDates} className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-brand-700 text-white hover:bg-blue-800 disabled:opacity-50">
                {semSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Reject Registration</h3>
                <p className="text-xs text-gray-500">Provide a reason for the student</p>
              </div>
            </div>
            <textarea rows="3" value={rejectReason} onChange={e => setRejectReason(e.target.value)}
              placeholder="Reason for rejection (e.g., incomplete documents, GPA below minimum)…"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none transition resize-none mb-4" />
            <div className="flex gap-3">
              <button onClick={() => { setRejectModal(null); setRejectReason(''); }}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition">Cancel</button>
              <button onClick={rejectReg} disabled={!rejectReason.trim()}
                className="flex-1 bg-red-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-red-700 transition disabled:opacity-50">
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegistrarDashboard;
