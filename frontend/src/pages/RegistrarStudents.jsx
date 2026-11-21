import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { 
  Users, 
  Search, 
  Filter, 
  ChevronLeft, 
  User, 
  GraduationCap, 
  Mail, 
  Phone, 
  MapPin, 
  CheckCircle, 
  AlertCircle,
  MoreVertical,
  ExternalLink,
  BookOpen,
  ArrowRight,
  UserCheck,
  Calendar,
  CreditCard,
  FileText
} from 'lucide-react';

const RegistrarStudents = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [filterProgram, setFilterProgram] = useState('');
  const [programs, setPrograms] = useState([]);

  useEffect(() => {
    fetchStudents();
    fetchPrograms();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await api.get('/registrar/students');
      setStudents(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch students:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPrograms = async () => {
    try {
      const response = await api.get('/academic/programs');
      setPrograms(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch programs:', error);
    }
  };

  const filteredStudents = students.filter(s => {
    const name = s.user?.name || '';
    const studentId = s.studentId || '';
    const email = s.user?.institutionalEmail || '';
    
    const matchesSearch = 
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProgram = !filterProgram || s.programId === filterProgram;
    return matchesSearch && matchesProgram;
  });

  if (loading && students.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 text-gray-500 mb-2 cursor-pointer hover:text-brand-600 transition" onClick={() => navigate('/dashboard/registrar')}>
              <ChevronLeft className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Registrar Dashboard</span>
            </div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-3">
              <Users className="w-8 h-8 text-brand-600" />
              Student Directory
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search students..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-4 focus:ring-blue-50 outline-none transition-all w-64 shadow-sm"
              />
            </div>
            <select 
              value={filterProgram}
              onChange={(e) => setFilterProgram(e.target.value)}
              className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold text-gray-600 focus:ring-4 focus:ring-blue-50 outline-none transition-all shadow-sm"
            >
              <option value="">All Programs</option>
              {programs.map(p => <option key={p.id} value={p.id}>{p.code}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Student List */}
          <div className="lg:col-span-1 space-y-4 overflow-y-auto max-h-[calc(100vh-250px)] pr-2 custom-scrollbar">
            {filteredStudents.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 border border-dashed border-gray-200 text-center">
                <Users className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <p className="text-gray-400 font-medium">No students found matching your criteria.</p>
              </div>
            ) : (
              filteredStudents.map((student) => (
                <div 
                  key={student.id}
                  onClick={() => setSelectedStudent(student)}
                  className={`bg-white p-5 rounded-2xl border transition-all cursor-pointer group hover:shadow-lg ${
                    selectedStudent?.id === student.id ? 'border-brand-600 ring-4 ring-blue-50 shadow-md' : 'border-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center overflow-hidden border border-gray-100 shadow-sm">
                      {student.user?.profileImage ? (
                        <img src={`${import.meta.env.VITE_API_URL}${student.user.profileImage}`} alt="profile" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-6 h-6 text-gray-300" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 group-hover:text-brand-600 transition truncate">{student.user?.name}</h3>
                      <p className="text-[10px] font-black text-brand-600 uppercase tracking-widest mt-1">{student.studentId}</p>
                    </div>
                    <ArrowRight className={`w-4 h-4 transition ${selectedStudent?.id === student.id ? 'text-brand-600 translate-x-1' : 'text-gray-200 group-hover:text-gray-400'}`} />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Details Panel */}
          <div className="lg:col-span-2">
            {selectedStudent ? (
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                {/* Profile Header */}
                <div className="bg-gradient-to-r from-blue-700 to-indigo-800 p-8 text-white">
                  <div className="flex flex-col md:flex-row md:items-center gap-8">
                    <div className="w-24 h-24 rounded-3xl bg-white/20 backdrop-blur-md border-2 border-white/30 overflow-hidden shadow-2xl flex-shrink-0">
                      {selectedStudent.user?.profileImage ? (
                        <img src={`${import.meta.env.VITE_API_URL}${selectedStudent.user.profileImage}`} alt="profile" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-12 h-12 text-white/50 mx-auto mt-6" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-3xl font-black">{selectedStudent.user?.name}</h2>
                        <span className="bg-white/10 text-white text-[10px] font-black px-2 py-1 rounded-lg border border-white/20 uppercase tracking-widest">
                          {selectedStudent.status}
                        </span>
                      </div>
                      <p className="text-blue-100 font-medium flex items-center gap-2">
                        <GraduationCap className="w-4 h-4" /> {selectedStudent.program?.name} • Year {selectedStudent.currentYear}
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2">
                        <FileText className="w-4 h-4" /> Academic Record
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    {/* Contact & Personal */}
                    <div className="space-y-8">
                      <div>
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Identity & Contact</h4>
                        <div className="space-y-4 bg-gray-50 p-6 rounded-3xl border border-gray-100">
                          <div className="flex items-center gap-3 text-sm text-gray-600 font-medium">
                            <Mail className="w-4 h-4 text-brand-500" /> {selectedStudent.user?.institutionalEmail}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-600 font-medium">
                            <UserCheck className="w-4 h-4 text-brand-500" /> Student ID: <span className="font-black text-gray-900 ml-1">{selectedStudent.studentId}</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-600 font-medium">
                            <Calendar className="w-4 h-4 text-brand-500" /> Enrolled Since: <span className="font-bold text-gray-900 ml-1">{selectedStudent.enrollmentYear}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Academic Performance</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-brand-50 p-4 rounded-2xl border border-brand-100">
                            <p className="text-[10px] font-black text-brand-600 uppercase tracking-wider mb-1">Cumulative GPA</p>
                            <p className="text-2xl font-black text-blue-900">{selectedStudent.cumulativeGPA?.toFixed(2) || '0.00'}</p>
                          </div>
                          <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-wider mb-1">Total Credits</p>
                            <p className="text-2xl font-black text-indigo-900">{selectedStudent.totalCredits || 0}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Department & Program */}
                    <div className="space-y-8">
                      <div>
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Academic Unit</h4>
                        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-4">
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0">
                              <BookOpen className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">Department</p>
                              <p className="text-sm font-bold text-gray-900">{selectedStudent.department?.name}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 flex-shrink-0">
                              <GraduationCap className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-purple-600 uppercase tracking-wider">Program</p>
                              <p className="text-sm font-bold text-gray-900">{selectedStudent.program?.name} ({selectedStudent.program?.code})</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Current Status</h4>
                        <div className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                          <div className={`w-3 h-3 rounded-full ${selectedStudent.status === 'ACTIVE' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-gray-400'}`} />
                          <span className="text-sm font-bold text-gray-700">{selectedStudent.status} Student</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-dashed border-gray-200 p-24 text-center">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Users className="w-10 h-10 text-gray-300" />
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-2">Select a Student</h3>
                <p className="text-gray-400 max-w-xs mx-auto text-sm font-medium">Choose a student from the directory to view their academic records, contact info, and current status.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegistrarStudents;
