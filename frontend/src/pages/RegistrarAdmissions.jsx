import { API_ORIGIN } from '../config/api';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { 
  Users, 
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
  Phone,
  GraduationCap,
  Download,
  AlertCircle,
  MapPin,
  HeartPulse,
  User as UserIcon,
  ShieldCheck,
  Users as UsersIcon
} from 'lucide-react';

const RegistrarAdmissions = () => {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [filterStatus, setFilterStatus] = useState('SUBMITTED');

  useEffect(() => {
    fetchApplications();
  }, [filterStatus]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/registrar/admissions?status=${filterStatus}`);
      setApplications(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch applications:', error);
      showMessage('error', 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleProcess = async (id, status) => {
    const action = status === 'ACCEPTED' ? 'accept' : 'reject';
    if (!window.confirm(`Are you sure you want to ${action} this application?`)) return;

    setProcessing(true);
    try {
      await api.put(`/registrar/admissions/${id}/process`, { status });
      showMessage('success', `Application ${status.toLowerCase()} successfully!`);
      setSelectedApp(null);
      fetchApplications();
    } catch (error) {
      showMessage('error', error.response?.data?.message || 'Failed to process application');
    } finally {
      setProcessing(false);
    }
  };

  if (loading && applications.length === 0) {
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
              Admission Applications
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="bg-white p-1 rounded-xl border border-gray-200 flex shadow-sm">
              {['SUBMITTED', 'ACCEPTED', 'REJECTED'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    filterStatus === status 
                      ? 'bg-brand-600 text-white shadow-md' 
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {status}
                </button>
              ))}
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
          
          {/* Applications List */}
          <div className="lg:col-span-1 space-y-4 overflow-y-auto max-h-[calc(100vh-250px)] pr-2 custom-scrollbar">
            {applications.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 border border-dashed border-gray-200 text-center">
                <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-400 font-medium">No {filterStatus.toLowerCase()} applications found.</p>
              </div>
            ) : (
              applications.map((app) => (
                <div 
                  key={app.id}
                  onClick={() => setSelectedApp(app)}
                  className={`bg-white p-5 rounded-2xl border transition-all cursor-pointer group hover:shadow-lg ${
                    selectedApp?.id === app.id ? 'border-brand-600 ring-4 ring-blue-50 shadow-md' : 'border-gray-100'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-black text-brand-600 uppercase tracking-widest bg-brand-50 px-2 py-1 rounded">
                      {app.applicationNumber}
                    </span>
                    <span className="text-[10px] text-gray-400 font-bold">
                      {new Date(app.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 group-hover:text-brand-600 transition">{app.firstName} {app.lastName}</h3>
                  <p className="text-xs text-gray-500 font-medium mt-1 mb-4">{app.program?.name}</p>
                  <div className="flex items-center justify-between border-t border-gray-50 pt-3">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter flex items-center gap-1">
                      <GraduationCap className="w-3 h-3" /> GPA: {app.previousGrade || 'N/A'}
                    </span>
                    <Eye className={`w-4 h-4 transition ${selectedApp?.id === app.id ? 'text-brand-600' : 'text-gray-300 group-hover:text-gray-500'}`} />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Details Panel */}
          <div className="lg:col-span-2">
            {selectedApp ? (
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                <div className="bg-gradient-to-r from-brand-600 to-indigo-700 p-8 text-white">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                      <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center overflow-hidden border-2 border-white/30 shadow-xl">
                        {selectedApp.documents?.photoUrl ? (
                          <img src={`${API_ORIGIN}${selectedApp.documents.photoUrl}`} alt="photo" className="w-full h-full object-cover" />
                        ) : (
                          <Users className="w-10 h-10 text-white/50" />
                        )}
                      </div>
                      <div>
                        <h2 className="text-2xl font-black">{selectedApp.firstName} {selectedApp.lastName}</h2>
                        <p className="text-blue-100 font-medium flex items-center gap-2 mt-1">
                          <GraduationCap className="w-4 h-4" /> {selectedApp.program?.name}
                        </p>
                      </div>
                    </div>
                    {selectedApp.status === 'SUBMITTED' && (
                      <div className="flex gap-3">
                        <button 
                          onClick={() => handleProcess(selectedApp.id, 'REJECTED')}
                          disabled={processing}
                          className="bg-white/10 hover:bg-red-500 hover:text-white border border-white/20 px-5 py-2.5 rounded-xl text-sm font-bold transition flex items-center gap-2"
                        >
                          <XCircle className="w-4 h-4" /> Reject
                        </button>
                        <button 
                          onClick={() => handleProcess(selectedApp.id, 'ACCEPTED')}
                          disabled={processing}
                          className="bg-white text-brand-600 hover:bg-brand-50 px-6 py-2.5 rounded-xl text-sm font-black transition flex items-center gap-2 shadow-lg"
                        >
                          <CheckCircle className="w-4 h-4" /> Accept Student
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    {/* Information */}
                    <div className="space-y-8">
                      <div>
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Contact Information</h4>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3 text-sm text-gray-600 font-medium">
                            <Mail className="w-4 h-4 text-brand-500" /> {selectedApp.email}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-600 font-medium">
                            <Phone className="w-4 h-4 text-brand-500" /> {selectedApp.phone}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-600 font-medium">
                            <Calendar className="w-4 h-4 text-brand-500" /> DOB: {new Date(selectedApp.dateOfBirth).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-600 font-medium">
                            <MapPin className="w-4 h-4 text-brand-500" /> {selectedApp.address || 'No address provided'}
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Emergency Contact</h4>
                        <div className="bg-brand-50/50 rounded-2xl p-5 space-y-3 border border-brand-100/50">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">Name</span>
                            <span className="font-bold text-gray-900">{selectedApp.documents?.emergencyContact?.name || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">Phone</span>
                            <span className="font-bold text-gray-900">{selectedApp.documents?.emergencyContact?.phone || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">Relation</span>
                            <span className="font-bold text-gray-900">{selectedApp.documents?.emergencyContact?.relation || 'N/A'}</span>
                          </div>
                        </div>
                      </div>

                      {selectedApp.documents?.guardian?.name && (
                        <div>
                          <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Guardian Info</h4>
                          <div className="bg-gray-50 rounded-2xl p-5 space-y-3 border border-gray-100">
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-gray-500">Guardian Name</span>
                              <span className="font-bold text-gray-900">{selectedApp.documents.guardian.name}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-gray-500">Guardian Phone</span>
                              <span className="font-bold text-gray-900">{selectedApp.documents.guardian.phone}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Documents & Academic */}
                    <div className="space-y-8">
                      <div>
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Academic Background</h4>
                        <div className="bg-gray-50 rounded-2xl p-5 space-y-3 border border-gray-100">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">Previous School</span>
                            <span className="font-bold text-gray-900">{selectedApp.previousSchool || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">Previous Result</span>
                            <span className="font-bold text-brand-600">{selectedApp.previousGrade || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">Intake Semester</span>
                            <span className="font-bold text-gray-900">{selectedApp.academicSemester?.name}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Attached Documents</h4>
                        <div className="space-y-3">
                          {selectedApp.documents?.transcriptUrl && (
                            <a 
                              href={`${API_ORIGIN}${selectedApp.documents.transcriptUrl}`} 
                              target="_blank" 
                              rel="noreferrer"
                              className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 hover:border-brand-200 hover:bg-brand-50/30 transition group"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                  <FileText className="w-5 h-5" />
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-gray-900">Academic Transcript</p>
                                  <p className="text-[10px] text-gray-400 uppercase font-bold">PDF Document</p>
                                </div>
                              </div>
                              <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-brand-600" />
                            </a>
                          )}
                          {selectedApp.documents?.idDocumentUrl && (
                            <a 
                              href={`${API_ORIGIN}${selectedApp.documents.idDocumentUrl}`} 
                              target="_blank" 
                              rel="noreferrer"
                              className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 hover:border-brand-200 hover:bg-brand-50/30 transition group"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                                  <FileText className="w-5 h-5" />
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-gray-900">Identification ID</p>
                                  <p className="text-[10px] text-gray-400 uppercase font-bold">Document Proof</p>
                                </div>
                              </div>
                              <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-brand-600" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {selectedApp.personalStatement && (
                    <div className="mt-12 pt-12 border-t border-gray-100">
                      <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Personal Statement</h4>
                      <p className="text-sm text-gray-600 leading-relaxed italic bg-gray-50 p-6 rounded-3xl border border-gray-100">
                        "{selectedApp.personalStatement}"
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-dashed border-gray-200 p-24 text-center">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Users className="w-10 h-10 text-gray-200" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Select an application</h2>
                <p className="text-gray-400 text-sm max-w-xs mx-auto">Choose a student application from the left list to review their details and documents.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegistrarAdmissions;
