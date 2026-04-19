import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  AlertCircle, 
  Plus, 
  Search, 
  ChevronRight, 
  ArrowUpRight, 
  Building2, 
  GraduationCap, 
  Calendar, 
  CheckCircle,
  MoreVertical,
  LogOut,
  ChevronLeft,
  Filter,
  Download,
  Clock,
  Briefcase,
  PieChart,
  UserCheck
} from 'lucide-react';

const Badge = ({ status }) => {
  const map = {
    ACTIVE:      'bg-emerald-50 text-emerald-600 border-emerald-100',
    UNASSIGNED:  'bg-amber-50 text-amber-600 border-amber-100',
    COMPLETED:   'bg-blue-50 text-blue-600 border-blue-100',
  };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest border ${map[status] || 'bg-gray-50 text-gray-400 border-gray-100'}`}>
      {status}
    </span>
  );
};

const DepartmentHeadDashboard = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [department, setDepartment] = useState(null);
  const [instructors, setInstructors] = useState([]);
  const [courses, setCourses] = useState([]);
  const [unassignedCourses, setUnassignedCourses] = useState([]);
  const [workload, setWorkload] = useState([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedInstructorId, setSelectedInstructorId] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [processing, setProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [deptRes, instRes, coursesRes, unassignedRes, workloadRes] = await Promise.all([
        api.get('/department-head/my-department'),
        api.get('/department-head/instructors'),
        api.get('/department-head/courses'),
        api.get('/department-head/courses/unassigned'),
        api.get('/department-head/instructors/workload'),
      ]);
      setDepartment(deptRes.data.data);
      setInstructors(instRes.data.data || []);
      setCourses(coursesRes.data.data || []);
      setUnassignedCourses(unassignedRes.data.data || []);
      setWorkload(workloadRes.data.data || []);
    } catch (error) {
      console.error('Failed to fetch department data:', error);
      showMessage('error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleAssignInstructor = async () => {
    if (!selectedInstructorId) {
      showMessage('error', 'Please select an instructor');
      return;
    }
    setProcessing(true);
    try {
      await api.post(`/department-head/courses/${selectedCourse.id}/assign`, {
        instructorId: selectedInstructorId,
      });
      showMessage('success', `Instructor assigned successfully!`);
      setShowAssignModal(false);
      setSelectedCourse(null);
      setSelectedInstructorId('');
      fetchAllData();
    } catch (error) {
      showMessage('error', error.response?.data?.message || 'Failed to assign instructor');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 hidden lg:flex flex-col">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-200">
              D
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-tight">Atlas Portal</h1>
              <p className="text-xs text-gray-500 font-medium">Dept. Head Panel</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition ${activeTab === 'overview' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
          >
            <LayoutDashboard className="w-5 h-5" />
            Overview
          </button>
          <button 
            onClick={() => setActiveTab('instructors')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition ${activeTab === 'instructors' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
          >
            <Briefcase className="w-5 h-5" />
            Instructors
          </button>
          <button 
            onClick={() => setActiveTab('courses')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition ${activeTab === 'courses' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
          >
            <BookOpen className="w-5 h-5" />
            Courses
          </button>
          <button 
            onClick={() => setActiveTab('unassigned')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition ${activeTab === 'unassigned' ? 'bg-amber-50 text-amber-600' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
          >
            <AlertCircle className="w-5 h-5" />
            Unassigned
            {unassignedCourses.length > 0 && (
              <span className="ml-auto bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full">{unassignedCourses.length}</span>
            )}
          </button>
          
          <div className="pt-8 pb-4 px-4">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Department</p>
          </div>
          
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition">
            <GraduationCap className="w-5 h-5" />
            Programs
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition">
            <PieChart className="w-5 h-5" />
            Workload
          </button>
          <button 
            onClick={() => { logout(); navigate('/login'); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 transition mt-auto"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="bg-white border-b border-gray-100 h-20 flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest">{department?.name}</h2>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-sm font-bold text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Department Head</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-blue-600 font-bold">
              {user.name?.charAt(0)}
            </div>
          </div>
        </header>

        <div className="p-8">
          {message.text && (
            <div className={`mb-8 p-4 rounded-2xl flex items-center gap-3 border animate-in slide-in-from-top duration-300 ${
              message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'
            }`}>
              {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              <span className="text-sm font-bold">{message.text}</span>
            </div>
          )}

          {activeTab === 'overview' && (
            <div className="animate-in fade-in duration-500">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-black text-gray-900">Department Overview</h2>
                  <p className="text-gray-500 mt-1 font-medium">Managing {department?.name} resources.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                  <div className="bg-blue-50 text-blue-600 p-4 rounded-2xl w-fit mb-6">
                    <Briefcase className="w-8 h-8" />
                  </div>
                  <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Instructors</p>
                  <p className="text-4xl font-black text-gray-900 mt-2">{instructors.length}</p>
                </div>
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                  <div className="bg-emerald-50 text-emerald-600 p-4 rounded-2xl w-fit mb-6">
                    <BookOpen className="w-8 h-8" />
                  </div>
                  <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Total Courses</p>
                  <p className="text-4xl font-black text-gray-900 mt-2">{courses.length}</p>
                </div>
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                  <div className="bg-amber-50 text-amber-600 p-4 rounded-2xl w-fit mb-6">
                    <AlertCircle className="w-8 h-8" />
                  </div>
                  <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Unassigned</p>
                  <p className="text-4xl font-black text-gray-900 mt-2">{unassignedCourses.length}</p>
                </div>
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                  <div className="bg-indigo-50 text-indigo-600 p-4 rounded-2xl w-fit mb-6">
                    <GraduationCap className="w-8 h-8" />
                  </div>
                  <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Programs</p>
                  <p className="text-4xl font-black text-gray-900 mt-2">{department?.programs?.length || 0}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between">
                    <h3 className="text-lg font-black text-gray-900">Recent Assignments</h3>
                    <button onClick={() => setActiveTab('courses')} className="text-blue-600 text-xs font-black uppercase tracking-widest hover:underline">View All</button>
                  </div>
                  <div className="p-4 space-y-2">
                    {courses.slice(0, 5).map(c => (
                      <div key={c.id} className="p-4 rounded-2xl border border-transparent hover:border-blue-100 hover:bg-blue-50/30 transition-all group flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-blue-600 font-black text-[10px]">
                            {c.code}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900">{c.title}</p>
                            <p className="text-xs text-gray-400 font-medium">
                              {c.instructor?.user?.name || <span className="text-amber-600 font-black uppercase tracking-tighter text-[10px]">Unassigned</span>}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-200 group-hover:text-blue-600 transition" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                  <h3 className="text-lg font-black text-gray-900 mb-6">Department Info</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-3 border-b border-gray-50">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Founded</span>
                      <span className="text-sm font-bold text-gray-700">{department?.foundedYear || '—'}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-gray-50">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Code</span>
                      <span className="text-sm font-mono font-bold text-blue-600">{department?.code}</span>
                    </div>
                    <div className="flex justify-between items-center py-3">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Head</span>
                      <span className="text-sm font-bold text-gray-700">{user.name}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {(activeTab === 'instructors' || activeTab === 'courses' || activeTab === 'unassigned') && (
            <div className="animate-in fade-in duration-500">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-black text-gray-900 capitalize">{activeTab}</h2>
                <div className="relative w-72">
                  <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text" 
                    placeholder="Search..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-100 rounded-xl text-sm focus:ring-4 focus:ring-blue-50 outline-none transition-all shadow-sm"
                  />
                </div>
              </div>

              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50/50">
                      <tr>
                        <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                          {activeTab === 'instructors' ? 'Instructor' : 'Course Info'}
                        </th>
                        <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                          {activeTab === 'instructors' ? 'Title / ID' : 'Instructor'}
                        </th>
                        <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                        <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {activeTab === 'instructors' && instructors.map(inst => (
                        <tr key={inst.id} className="hover:bg-blue-50/30 transition-all group">
                          <td className="px-8 py-4">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 font-bold text-xs">
                                {inst.user?.name.charAt(0)}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-gray-900">{inst.user?.name}</p>
                                <p className="text-[10px] text-gray-400 font-black tracking-widest">{inst.user?.institutionalEmail}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-4">
                            <p className="text-xs font-bold text-gray-600">{inst.title || 'Instructor'}</p>
                            <p className="text-[10px] text-gray-400 font-black tracking-widest uppercase">{inst.employeeId}</p>
                          </td>
                          <td className="px-8 py-4 text-center"><Badge status="ACTIVE" /></td>
                          <td className="px-8 py-4 text-right"><MoreVertical className="w-5 h-5 text-gray-200 ml-auto" /></td>
                        </tr>
                      ))}
                      {(activeTab === 'courses' ? courses : unassignedCourses).map(course => (
                        <tr key={course.id} className="hover:bg-blue-50/30 transition-all group">
                          <td className="px-8 py-4">
                            <div>
                              <p className="text-sm font-bold text-gray-900">{course.title}</p>
                              <p className="text-[10px] text-blue-500 font-black tracking-widest uppercase">{course.code}</p>
                            </div>
                          </td>
                          <td className="px-8 py-4">
                            {course.instructor?.user?.name ? (
                              <div className="flex items-center gap-2">
                                <UserCheck className="w-4 h-4 text-emerald-500" />
                                <span className="text-xs font-bold text-gray-700">{course.instructor.user.name}</span>
                              </div>
                            ) : (
                              <button 
                                onClick={() => { setSelectedCourse(course); setShowAssignModal(true); }}
                                className="flex items-center gap-2 text-amber-600 hover:text-amber-700 transition"
                              >
                                <Plus className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Assign Instructor</span>
                              </button>
                            )}
                          </td>
                          <td className="px-8 py-4 text-center">
                            <Badge status={course.instructorId ? 'ACTIVE' : 'UNASSIGNED'} />
                          </td>
                          <td className="px-8 py-4 text-right">
                            <button 
                              onClick={() => { setSelectedCourse(course); setShowAssignModal(true); }}
                              className="text-blue-600 hover:bg-blue-100 p-2 rounded-xl transition"
                            >
                              <Settings className="w-5 h-5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Assignment Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="bg-blue-600 p-8 text-white">
              <h3 className="text-2xl font-black">Assign Instructor</h3>
              <p className="text-blue-100 font-medium mt-1">Select an instructor for {selectedCourse?.title}</p>
            </div>
            <div className="p-8 space-y-6">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Select Instructor</label>
                <select 
                  value={selectedInstructorId}
                  onChange={(e) => setSelectedInstructorId(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-100 bg-gray-50 focus:ring-4 focus:ring-blue-50 focus:bg-white focus:border-blue-100 outline-none transition-all font-bold text-sm"
                >
                  <option value="">Select Instructor...</option>
                  {instructors.map(inst => (
                    <option key={inst.id} value={inst.id}>{inst.user?.name} ({inst.title})</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowAssignModal(false)} className="flex-1 px-6 py-4 rounded-2xl font-black text-sm text-gray-400 hover:bg-gray-50 transition">Cancel</button>
                <button 
                  onClick={handleAssignInstructor}
                  disabled={processing}
                  className="flex-1 bg-blue-600 text-white px-6 py-4 rounded-2xl font-black text-sm hover:bg-blue-700 transition shadow-xl shadow-blue-100 disabled:opacity-50"
                >
                  {processing ? 'Assigning...' : 'Confirm Assignment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentHeadDashboard;
