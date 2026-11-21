import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { 
  ClipboardCheck, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Clock, 
  Search, 
  Filter, 
  FileText, 
  ExternalLink,
  ChevronLeft,
  Calendar,
  Mail,
  User,
  GraduationCap,
  CreditCard,
  AlertCircle,
  ArrowRight,
  Receipt,
  ShieldCheck,
  Check
} from 'lucide-react';

const RegistrarApproval = () => {
  const navigate = useNavigate();
  const [pendingRegistrations, setPendingRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReg, setSelectedReg] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchPendingRegistrations();
  }, []);

  const fetchPendingRegistrations = async () => {
    try {
      setLoading(true);
      const response = await api.get('/registrar/registrations/pending');
      setPendingRegistrations(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch registrations:', error);
      showMessage('error', 'Failed to load pending registrations');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleProcess = async (id, status) => {
    if (status === 'REJECTED' && !rejectionReason.trim()) {
      showMessage('error', 'Please provide a reason for rejection');
      return;
    }

    const action = status === 'APPROVED' ? 'approve' : 'reject';
    if (!window.confirm(`Are you sure you want to ${action} this registration?`)) return;

    setProcessing(true);
    try {
      await api.put(`/registrar/registrations/${id}/status`, { 
        status,
        rejectionReason: status === 'REJECTED' ? rejectionReason : null
      });
      
      showMessage('success', `Registration ${status.toLowerCase()} successfully!`);
      setSelectedReg(null);
      setRejectionReason('');
      fetchPendingRegistrations();
    } catch (error) {
      showMessage('error', error.response?.data?.message || `Failed to ${action} registration`);
    } finally {
      setProcessing(false);
    }
  };

  const filteredRegs = pendingRegistrations.filter(reg => 
    reg.student?.user?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    reg.student?.studentId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && pendingRegistrations.length === 0) {
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
              <ClipboardCheck className="w-8 h-8 text-brand-600" />
              Semester Approvals
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search student..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-4 focus:ring-blue-50 focus:border-brand-500 outline-none transition-all w-64 shadow-sm"
              />
            </div>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Pending List */}
          <div className="lg:col-span-1 space-y-4 overflow-y-auto max-h-[calc(100vh-250px)] pr-2 custom-scrollbar">
            {filteredRegs.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 border border-dashed border-gray-200 text-center">
                <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-400 font-medium">No pending registrations found.</p>
              </div>
            ) : (
              filteredRegs.map((reg) => (
                <div 
                  key={reg.id}
                  onClick={() => setSelectedReg(reg)}
                  className={`bg-white p-5 rounded-2xl border transition-all cursor-pointer group hover:shadow-lg ${
                    selectedReg?.id === reg.id ? 'border-brand-600 ring-4 ring-blue-50 shadow-md' : 'border-gray-100'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-black text-brand-600 uppercase tracking-widest bg-brand-50 px-2 py-1 rounded">
                      {reg.student?.studentId}
                    </span>
                    <span className="text-[10px] text-gray-400 font-bold">
                      {new Date(reg.registrationDate).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 group-hover:text-brand-600 transition">{reg.student?.user?.name}</h3>
                  <p className="text-xs text-gray-500 font-medium mt-1 mb-4">{reg.academicSemester?.name}</p>
                  
                  <div className="flex items-center justify-between border-t border-gray-50 pt-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${reg.isPaid ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      <span className="text-[10px] font-black uppercase tracking-tighter text-gray-400">
                        {reg.isPaid ? 'Paid' : 'Payment Pending'}
                      </span>
                    </div>
                    <ArrowRight className={`w-4 h-4 transition ${selectedReg?.id === reg.id ? 'text-brand-600 translate-x-1' : 'text-gray-300 group-hover:text-gray-500'}`} />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Details Panel */}
          <div className="lg:col-span-2">
            {selectedReg ? (
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                <div className="bg-gradient-to-r from-blue-700 to-indigo-800 p-8 text-white">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-xl">
                        <User className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-black">{selectedReg.student?.user?.name}</h2>
                        <p className="text-blue-100 font-medium flex items-center gap-2 mt-1">
                          <GraduationCap className="w-4 h-4" /> {selectedReg.student?.program?.name || 'Student'} • {selectedReg.academicSemester?.name}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => handleProcess(selectedReg.id, 'REJECTED')}
                        disabled={processing}
                        className="bg-white/10 hover:bg-red-500 hover:text-white border border-white/20 px-5 py-2.5 rounded-xl text-sm font-bold transition flex items-center gap-2"
                      >
                        <XCircle className="w-4 h-4" /> Reject
                      </button>
                      <button 
                        onClick={() => handleProcess(selectedReg.id, 'APPROVED')}
                        disabled={processing}
                        className="bg-white text-brand-700 hover:bg-brand-50 px-6 py-2.5 rounded-xl text-sm font-black transition flex items-center gap-2 shadow-lg"
                      >
                        <CheckCircle className="w-4 h-4" /> Approve
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    {/* Course Selection */}
                    <div>
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                        <FileText className="w-4 h-4" /> Selected Courses
                      </h4>
                      <div className="space-y-3">
                        {selectedReg.registrationCourse?.map((rc) => (
                          <div key={rc.id} className="p-4 rounded-2xl border border-gray-100 bg-gray-50/50 flex justify-between items-center group hover:border-brand-200 transition-all">
                            <div>
                              <p className="text-xs font-black text-brand-600 mb-1">{rc.course?.code}</p>
                              <p className="text-sm font-bold text-gray-800">{rc.course?.title}</p>
                            </div>
                            <span className="text-[10px] font-black bg-white px-2 py-1 rounded-lg border border-gray-100 text-gray-500">
                              {rc.course?.credits} CR
                            </span>
                          </div>
                        ))}
                        <div className="mt-6 pt-6 border-t border-dashed border-gray-200 flex justify-between items-center">
                          <span className="text-sm font-bold text-gray-500">Total Credits</span>
                          <span className="text-lg font-black text-gray-900">{selectedReg.totalCredits} Credits</span>
                        </div>
                      </div>
                    </div>

                    {/* Payment & Status */}
                    <div className="space-y-8">
                      <div>
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                          <Receipt className="w-4 h-4" /> Payment Details
                        </h4>
                        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-500">Total Amount</span>
                            <span className="text-lg font-black text-gray-900">{selectedReg.totalFee?.toLocaleString()} ETB</span>
                          </div>
                          
                          <div className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                            {selectedReg.isPaid ? (
                              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                                <ShieldCheck className="w-6 h-6" />
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                                <Clock className="w-6 h-6" />
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-black text-gray-900">{selectedReg.isPaid ? 'Payment Verified' : 'Awaiting Payment'}</p>
                              <p className="text-[10px] text-gray-400 font-bold uppercase">{selectedReg.isPaid ? 'Automatic Check Passed' : 'Verification Required'}</p>
                            </div>
                          </div>

                          {selectedReg.invoice && (
                            <div className="pt-4 space-y-2">
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-400 font-bold uppercase tracking-wider">Paid Amount</span>
                                <span className="font-black text-emerald-600">{selectedReg.invoice.paidAmount?.toLocaleString()} ETB</span>
                              </div>
                              <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className="bg-emerald-500 h-full transition-all duration-1000" 
                                  style={{ width: `${(selectedReg.invoice.paidAmount / selectedReg.invoice.totalAmount) * 100}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Rejection Notes</h4>
                        <textarea 
                          placeholder="If rejecting, please state the reason here..."
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-4 focus:ring-red-50 focus:border-red-200 outline-none transition-all resize-none h-32"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-dashed border-gray-200 p-24 text-center">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ClipboardCheck className="w-10 h-10 text-gray-300" />
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-2">Select a Registration</h3>
                <p className="text-gray-400 max-w-xs mx-auto text-sm font-medium">Choose a pending semester registration from the left to review and approve.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegistrarApproval;
