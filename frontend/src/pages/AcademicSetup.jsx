import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { 
  BookOpen, 
  ChevronLeft, 
  Plus, 
  Settings, 
  Calendar, 
  DollarSign, 
  CheckCircle, 
  AlertCircle,
  Clock,
  Trash2,
  ChevronRight,
  Info
} from 'lucide-react';

const AcademicSetup = () => {
  const navigate = useNavigate();
  const [semesters, setSemesters] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeTab, setActiveTab] = useState('semesters');

  // Form states
  const [feeForm, setFeeForm] = useState({
    programId: '',
    semesterId: '',
    tuitionFee: '',
    registrationFee: 500,
    libraryFee: 200,
    labFee: 300,
    activityFee: 150,
    otherFees: 0,
    academicYear: new Date().getFullYear().toString()
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [semRes, progRes] = await Promise.all([
        api.get('/academic/semesters'),
        api.get('/academic/programs')
      ]);
      setSemesters(semRes.data.data || []);
      setPrograms(progRes.data.data || []);
    } catch (error) {
      console.error('Failed to fetch academic data:', error);
      showMessage('error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleOpenRegistration = async (id) => {
    if (!window.confirm('Opening registration will deactivate other semesters. Proceed?')) return;
    try {
      await api.put(`/registrar/semesters/${id}/open-registration`);
      showMessage('success', 'Registration opened for this semester!');
      fetchInitialData();
    } catch (error) {
      showMessage('error', 'Failed to open registration');
    }
  };

  const handleFeeSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/registrar/fee-structures', {
        ...feeForm,
        tuitionFee: parseFloat(feeForm.tuitionFee),
        registrationFee: parseFloat(feeForm.registrationFee),
        libraryFee: parseFloat(feeForm.libraryFee),
        labFee: parseFloat(feeForm.labFee),
        activityFee: parseFloat(feeForm.activityFee),
        otherFees: parseFloat(feeForm.otherFees),
      });
      showMessage('success', 'Fee structure created successfully!');
      setFeeForm({ ...feeForm, tuitionFee: '' });
    } catch (error) {
      showMessage('error', error.response?.data?.message || 'Failed to create fee structure');
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
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 text-gray-500 mb-2 cursor-pointer hover:text-blue-600 transition" onClick={() => navigate('/registrar')}>
              <ChevronLeft className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Registrar Dashboard</span>
            </div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-blue-600" />
              Academic Setup
            </h1>
          </div>
        </div>

        {message.text && (
          <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 border ${
            message.type === 'success' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'
          }`}>
            {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="text-sm font-medium">{message.text}</span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-white p-1 rounded-2xl border border-gray-100 shadow-sm mb-8 w-fit">
          <button 
            onClick={() => setActiveTab('semesters')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition ${activeTab === 'semesters' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            Semester Control
          </button>
          <button 
            onClick={() => setActiveTab('fees')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition ${activeTab === 'fees' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            Fee Structures
          </button>
        </div>

        {/* Content */}
        <div className="animate-in fade-in duration-500">
          {activeTab === 'semesters' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {semesters.map((sem) => (
                <div key={sem.id} className={`bg-white p-6 rounded-3xl border transition-all ${sem.isActive ? 'border-blue-200 ring-4 ring-blue-50' : 'border-gray-100'}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div className={`p-3 rounded-2xl ${sem.isActive ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                      <Calendar className="w-6 h-6" />
                    </div>
                    {sem.isActive ? (
                      <span className="bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-emerald-100">
                        Registration Open
                      </span>
                    ) : (
                      <span className="bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                        Inactive
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-black text-gray-900">{sem.name}</h3>
                  <p className="text-sm text-gray-500 font-medium mb-6">{sem.year} Academic Year</p>
                  
                  <div className="space-y-3 mb-8">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Start Date</span>
                      <span className="font-bold text-gray-700">{new Date(sem.startDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">End Date</span>
                      <span className="font-bold text-gray-700">{new Date(sem.endDate).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {!sem.isActive && (
                    <button 
                      onClick={() => handleOpenRegistration(sem.id)}
                      className="w-full bg-blue-600 text-white py-3 rounded-2xl font-black text-sm hover:bg-blue-700 transition shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
                    >
                      <Clock className="w-4 h-4" /> Open Registration
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Fee Form */}
              <div className="lg:col-span-1">
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm sticky top-8">
                  <h3 className="text-lg font-black text-gray-900 mb-6">Create Fee Structure</h3>
                  <form onSubmit={handleFeeSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Program</label>
                      <select 
                        required 
                        value={feeForm.programId} 
                        onChange={(e) => setFeeForm({...feeForm, programId: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 focus:ring-4 focus:ring-blue-50 focus:bg-white outline-none transition-all text-sm font-bold"
                      >
                        <option value="">Select Program</option>
                        {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Semester</label>
                      <select 
                        required 
                        value={feeForm.semesterId} 
                        onChange={(e) => setFeeForm({...feeForm, semesterId: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 focus:ring-4 focus:ring-blue-50 focus:bg-white outline-none transition-all text-sm font-bold"
                      >
                        <option value="">Select Semester</option>
                        {semesters.map(s => <option key={s.id} value={s.id}>{s.name} {s.year}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Tuition Fee (ETB)</label>
                      <input 
                        type="number" 
                        required 
                        value={feeForm.tuitionFee}
                        onChange={(e) => setFeeForm({...feeForm, tuitionFee: e.target.value})}
                        placeholder="e.g. 15000"
                        className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 focus:ring-4 focus:ring-blue-50 focus:bg-white outline-none transition-all text-sm font-bold"
                      />
                    </div>
                    
                    <div className="pt-4">
                      <button className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black text-sm hover:bg-black transition shadow-xl shadow-gray-200 flex items-center justify-center gap-2">
                        <Plus className="w-4 h-4" /> Create Structure
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Fee List/Info */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-blue-600 rounded-3xl p-8 text-white shadow-xl shadow-blue-100">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                      <Info className="w-6 h-6" />
                    </div>
                    <h4 className="text-xl font-black">Fee Breakdown Rules</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
                      <p className="text-blue-100 text-[10px] font-black uppercase tracking-wider mb-1">Registration</p>
                      <p className="text-lg font-bold">500 ETB</p>
                    </div>
                    <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
                      <p className="text-blue-100 text-[10px] font-black uppercase tracking-wider mb-1">Library</p>
                      <p className="text-lg font-bold">200 ETB</p>
                    </div>
                    <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
                      <p className="text-blue-100 text-[10px] font-black uppercase tracking-wider mb-1">Lab Fee</p>
                      <p className="text-lg font-bold">300 ETB</p>
                    </div>
                    <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
                      <p className="text-blue-100 text-[10px] font-black uppercase tracking-wider mb-1">Activity</p>
                      <p className="text-lg font-bold">150 ETB</p>
                    </div>
                  </div>
                  <p className="mt-8 text-xs text-blue-100 font-medium italic opacity-70">
                    * These are base fees automatically added to the tuition fee for every structure.
                  </p>
                </div>

                <div className="bg-white rounded-3xl border border-gray-100 p-8">
                  <h4 className="font-black text-gray-900 mb-6">Active Fee Structures</h4>
                  <div className="text-center py-12">
                    <DollarSign className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                    <p className="text-gray-400 text-sm font-medium">Use the form to define fees for each program and semester.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AcademicSetup;
