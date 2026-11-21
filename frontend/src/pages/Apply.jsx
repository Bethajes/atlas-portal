import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  BookOpen, 
  Calendar, 
  Upload, 
  CheckCircle, 
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  FileText,
  Camera,
  ShieldCheck,
  ArrowRight,
  GraduationCap,
  Info,
  HeartPulse,
  Users as UsersIcon
} from 'lucide-react';

const Apply = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [initialDataLoading, setInitialDataLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [programLoading, setProgramLoading] = useState(false);
  const [semesters, setSemesters] = useState([]);
  const [loadError, setLoadError] = useState({ departments: false, semesters: false });
  const [message, setMessage] = useState({ type: '', text: '' });
  const [accountInfo, setAccountInfo] = useState(null);
  
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', fatherName: '', email: '', phone: '', 
    dateOfBirth: '', gender: '', nationality: 'Ethiopian', address: '',
    departmentId: '', programId: '', intakeSemesterId: '', previousSchool: '', previousGrade: '',
    emergencyContactName: '', emergencyContactPhone: '', emergencyContactRelation: '',
    guardianName: '', guardianPhone: '', guardianRelation: '', guardianAddress: '',
    religion: '', ethnicity: '', maritalStatus: 'SINGLE', personalStatement: ''
  });

  const [files, setFiles] = useState({
    photo: null,
    transcript: null,
    idDocument: null
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (formData.departmentId) {
      fetchPrograms(formData.departmentId);
    } else {
      setPrograms([]);
    }
  }, [formData.departmentId]);

  const fetchInitialData = async () => {
    setInitialDataLoading(true);
    // Don't let one failed request hide data that loaded successfully.
    const [deptRes, semRes] = await Promise.allSettled([
      api.get('/academic/departments'),
      api.get('/academic/semesters')
    ]);

    if (deptRes.status === 'fulfilled') {
      setDepartments(deptRes.value.data?.data || []);
    } else {
      console.error('Failed to fetch departments:', deptRes.reason);
    }

    if (semRes.status === 'fulfilled') {
      const semesterData = semRes.value.data?.data || [];
      const activeSemesters = semesterData.filter((s) => s.isActive);
      setSemesters(activeSemesters.length ? activeSemesters : semesterData);
    } else {
      console.error('Failed to fetch semesters:', semRes.reason);
    }

    setLoadError({
      departments: deptRes.status === 'rejected',
      semesters: semRes.status === 'rejected',
    });
    setInitialDataLoading(false);
  };

  const fetchPrograms = async (deptId) => {
    console.log('📌 Selected departmentId:', deptId);
    setProgramLoading(true);
    try {
      const response = await api.get(`/academic/programs?departmentId=${deptId}`);
      console.log('📥 Programs API response:', response.data);
      setPrograms(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch programs:', error);
      setPrograms([]);
      showMessage('error', error.response?.data?.message || 'Failed to load programs for selected department');
    } finally {
      setProgramLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      if (name === 'departmentId') {
        // Reset dependent fields when department changes
        return { ...prev, departmentId: value, programId: '' };
      }
      return { ...prev, [name]: value };
    });
  };

  const handleFileChange = (e) => {
    const { name, files: selectedFiles } = e.target;
    if (selectedFiles[0]) {
      setFiles({ ...files, [name]: selectedFiles[0] });
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);
  const canGoNext = () => {
    if (step === 1) {
      return (
        formData.firstName &&
        formData.lastName &&
        formData.email &&
        formData.phone &&
        formData.dateOfBirth &&
        formData.gender
      );
    }
    if (step === 2) {
      return formData.departmentId && formData.programId && formData.intakeSemesterId;
    }
    if (step === 3) {
      return formData.emergencyContactName && formData.emergencyContactPhone && formData.emergencyContactRelation;
    }
    if (step === 4) {
      return files.photo && files.transcript && files.idDocument;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });
    
    try {
      const data = new FormData();
      
      // Append form fields
      Object.keys(formData).forEach(key => {
        data.append(key, formData[key]);
      });
      
      // Append files
      if (files.photo) data.append('photo', files.photo);
      if (files.transcript) data.append('transcript', files.transcript);
      if (files.idDocument) data.append('idDocument', files.idDocument);

      const payloadLog = Object.fromEntries(data.entries());
      console.log('📤 Admission apply payload:', payloadLog);

      const response = await api.post('/registrar/admissions/apply', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setAccountInfo(response.data.data);
      console.log('📥 Admission apply response:', response.data);
      showMessage('success', 'Submission saved successfully. Application Submitted Successfully');
      setStep(6); // Success step
    } catch (error) {
      console.error('❌ Admission apply error:', error.response?.data || error.message);
      showMessage('error', error.response?.data?.message || 'Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  const StepIndicator = () => (
    <div className="flex items-center justify-center mb-12">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all shadow-sm ${
            step === i ? 'bg-brand-600 text-white ring-4 ring-blue-100' : 
            step > i ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500'
          }`}>
            {step > i ? <CheckCircle className="w-5 h-5" /> : i}
          </div>
          {i < 5 && (
            <div className={`w-12 h-1 mx-2 rounded ${step > i ? 'bg-emerald-500' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-600 rounded-2xl text-white shadow-xl shadow-brand-200 mb-6">
            <GraduationCap className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Admission Application</h1>
          <p className="mt-3 text-lg text-gray-500 max-w-md mx-auto">Join New Generation University College and start your journey towards excellence in healthcare.</p>
        </div>

        {message.text && step !== 5 && (
          <div className={`mb-8 p-4 rounded-2xl flex items-center gap-3 border ${
            message.type === 'success' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'
          }`}>
            {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="text-sm font-bold">{message.text}</span>
          </div>
        )}

        {(loadError.departments || loadError.semesters) && step !== 5 && (
          <div className="mb-8 p-4 rounded-2xl flex items-center justify-between gap-4 border border-red-100 bg-red-50 text-red-700">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span className="text-sm font-bold">
                Failed to load {[
                  loadError.departments && 'departments',
                  loadError.semesters && 'semesters',
                ].filter(Boolean).join(' and ')}. Check your connection and try again.
              </span>
            </div>
            <button
              type="button"
              onClick={fetchInitialData}
              disabled={initialDataLoading}
              className="shrink-0 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition disabled:opacity-50"
            >
              {initialDataLoading ? 'Retrying...' : 'Retry'}
            </button>
          </div>
        )}

        {step < 5 && <StepIndicator />}

        <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
          <form onSubmit={handleSubmit} className="p-8 md:p-12">
            
            {/* Step 1: Personal Information */}
            {step === 1 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                  <User className="w-6 h-6 text-brand-600" />
                  <h2 className="text-xl font-bold text-gray-900">Personal Details</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">First Name</label>
                    <input type="text" name="firstName" required value={formData.firstName} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-blue-50 focus:border-brand-500 transition-all outline-none" placeholder="Enter first name" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Father Name</label>
                    <input type="text" name="lastName" required value={formData.lastName} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-blue-50 focus:border-brand-500 transition-all outline-none" placeholder="Enter father name" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" /> Email Address
                    </label>
                    <input type="email" name="email" required value={formData.email} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-blue-50 focus:border-brand-500 transition-all outline-none" placeholder="name@example.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" /> Phone Number
                    </label>
                    <input type="tel" name="phone" required value={formData.phone} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-blue-50 focus:border-brand-500 transition-all outline-none" placeholder="+251 ..." />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" /> Date of Birth
                    </label>
                    <input type="date" name="dateOfBirth" required value={formData.dateOfBirth} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-blue-50 focus:border-brand-500 transition-all outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Gender</label>
                    <select name="gender" required value={formData.gender} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-blue-50 focus:border-brand-500 transition-all outline-none">
                      <option value="">Select Gender</option>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex justify-end pt-6">
                  <button type="button" disabled={!canGoNext()} onClick={nextStep} className="bg-brand-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-brand-700 transition flex items-center gap-2 shadow-lg shadow-blue-100 disabled:opacity-50 disabled:cursor-not-allowed">
                    Next: Academic Info <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Academic Info */}
            {step === 2 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                  <BookOpen className="w-6 h-6 text-brand-600" />
                  <h2 className="text-xl font-bold text-gray-900">Academic Background</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Select Department</label>
                    <select name="departmentId" required value={formData.departmentId} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-blue-50 focus:border-brand-500 transition-all outline-none bg-white">
                      <option value="">Choose a department...</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                    {!initialDataLoading && !loadError.departments && departments.length === 0 && (
                      <p className="text-xs text-amber-600 mt-2">No departments found yet. Ask admin to create departments first.</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Select Program</label>
                    <select name="programId" required value={formData.programId} onChange={handleInputChange} disabled={!formData.departmentId} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-blue-50 focus:border-brand-500 transition-all outline-none bg-white disabled:bg-gray-50 disabled:cursor-not-allowed">
                      <option value="">
                        {formData.departmentId ? (programLoading ? 'Loading programs...' : 'Choose a program...') : 'Select department first'}
                      </option>
                      {programs.map(p => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
                    </select>
                    {!programLoading && formData.departmentId && programs.length === 0 && (
                      <p className="text-xs text-amber-600 mt-2">No programs found for this department yet.</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Intake Semester</label>
                    <select name="intakeSemesterId" required value={formData.intakeSemesterId} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-blue-50 focus:border-brand-500 transition-all outline-none">
                      <option value="">Choose intake...</option>
                      {semesters.map(s => <option key={s.id} value={s.id}>{s.name} {s.year}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Previous School/College</label>
                    <input type="text" name="previousSchool" value={formData.previousSchool} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-blue-50 focus:border-brand-500 transition-all outline-none" placeholder="Name of school" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Previous Grade (GPA/Result)</label>
                    <input type="number" step="0.01" name="previousGrade" value={formData.previousGrade} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-blue-50 focus:border-brand-500 transition-all outline-none" placeholder="e.g. 3.5" />
                  </div>
                </div>

                <div className="flex justify-between pt-6">
                  <button type="button" onClick={prevStep} className="text-gray-500 font-bold hover:text-gray-700 transition flex items-center gap-2">
                    <ChevronLeft className="w-5 h-5" /> Back
                  </button>
                  <button type="button" disabled={!canGoNext()} onClick={nextStep} className="bg-brand-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-brand-700 transition flex items-center gap-2 shadow-lg shadow-blue-100 disabled:opacity-50 disabled:cursor-not-allowed">
                    Next: Documents <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Emergency & Guardian Info */}
            {step === 3 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                  <HeartPulse className="w-6 h-6 text-brand-600" />
                  <h2 className="text-xl font-bold text-gray-900">Emergency & Family</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Emergency Contact */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-black text-gray-400 uppercase tracking-wider">Emergency Contact</h3>
                    <div className="space-y-4">
                      <input type="text" name="emergencyContactName" required value={formData.emergencyContactName} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-blue-50 focus:border-brand-500 transition-all outline-none" placeholder="Full Name" />
                      <input type="tel" name="emergencyContactPhone" required value={formData.emergencyContactPhone} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-blue-50 focus:border-brand-500 transition-all outline-none" placeholder="Phone Number" />
                      <input type="text" name="emergencyContactRelation" required value={formData.emergencyContactRelation} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-blue-50 focus:border-brand-500 transition-all outline-none" placeholder="Relation (e.g. Mother, Brother)" />
                    </div>
                  </div>

                  {/* Guardian */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-black text-gray-400 uppercase tracking-wider">Guardian (if applicable)</h3>
                    <div className="space-y-4">
                      <input type="text" name="guardianName" value={formData.guardianName} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-blue-50 focus:border-brand-500 transition-all outline-none" placeholder="Guardian Name" />
                      <input type="tel" name="guardianPhone" value={formData.guardianPhone} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-blue-50 focus:border-brand-500 transition-all outline-none" placeholder="Guardian Phone" />
                      <input type="text" name="guardianRelation" value={formData.guardianRelation} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-blue-50 focus:border-brand-500 transition-all outline-none" placeholder="Relation" />
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-6">
                  <button type="button" onClick={prevStep} className="text-gray-500 font-bold hover:text-gray-700 transition flex items-center gap-2">
                    <ChevronLeft className="w-5 h-5" /> Back
                  </button>
                  <button type="button" disabled={!canGoNext()} onClick={nextStep} className="bg-brand-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-brand-700 transition flex items-center gap-2 shadow-lg shadow-blue-100 disabled:opacity-50 disabled:cursor-not-allowed">
                    Next: Documents <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Document Uploads */}
            {step === 4 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                  <Upload className="w-6 h-6 text-brand-600" />
                  <h2 className="text-xl font-bold text-gray-900">Required Documents</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className={`p-6 rounded-2xl border-2 border-dashed transition-all group ${files.photo ? 'border-emerald-500 bg-emerald-50/30' : 'border-gray-200 hover:border-blue-300'}`}>
                    <label className="flex flex-col items-center cursor-pointer">
                      <Camera className={`w-10 h-10 mb-3 ${files.photo ? 'text-emerald-500' : 'text-gray-300 group-hover:text-brand-500'}`} />
                      <span className="text-sm font-bold text-gray-700">Passport Photo</span>
                      <input type="file" name="photo" accept="image/*" required onChange={handleFileChange} className="hidden" />
                      {files.photo ? (
                        <p className="mt-3 text-xs font-bold text-emerald-600 truncate max-w-full">{files.photo.name}</p>
                      ) : (
                        <span className="text-xs text-gray-400 mt-1 text-center">JPEG or PNG, Max 2MB</span>
                      )}
                    </label>
                  </div>

                  <div className={`p-6 rounded-2xl border-2 border-dashed transition-all group ${files.transcript ? 'border-emerald-500 bg-emerald-50/30' : 'border-gray-200 hover:border-blue-300'}`}>
                    <label className="flex flex-col items-center cursor-pointer">
                      <FileText className={`w-10 h-10 mb-3 ${files.transcript ? 'text-emerald-500' : 'text-gray-300 group-hover:text-brand-500'}`} />
                      <span className="text-sm font-bold text-gray-700">Transcript</span>
                      <input type="file" name="transcript" accept=".pdf,image/*" required onChange={handleFileChange} className="hidden" />
                      {files.transcript ? (
                        <p className="mt-3 text-xs font-bold text-emerald-600 truncate max-w-full">{files.transcript.name}</p>
                      ) : (
                        <span className="text-xs text-gray-400 mt-1 text-center">PDF or Image, Max 5MB</span>
                      )}
                    </label>
                  </div>

                  <div className={`p-6 rounded-2xl border-2 border-dashed transition-all group ${files.idDocument ? 'border-emerald-500 bg-emerald-50/30' : 'border-gray-200 hover:border-blue-300'}`}>
                    <label className="flex flex-col items-center cursor-pointer">
                      <ShieldCheck className={`w-10 h-10 mb-3 ${files.idDocument ? 'text-emerald-500' : 'text-gray-300 group-hover:text-brand-500'}`} />
                      <span className="text-sm font-bold text-gray-700">ID Document</span>
                      <input type="file" name="idDocument" accept=".pdf,image/*" required onChange={handleFileChange} className="hidden" />
                      {files.idDocument ? (
                        <p className="mt-3 text-xs font-bold text-emerald-600 truncate max-w-full">{files.idDocument.name}</p>
                      ) : (
                        <span className="text-xs text-gray-400 mt-1 text-center">ID Card or Passport</span>
                      )}
                    </label>
                  </div>
                </div>

                <div className="flex justify-between pt-6">
                  <button type="button" onClick={prevStep} className="text-gray-500 font-bold hover:text-gray-700 transition flex items-center gap-2">
                    <ChevronLeft className="w-5 h-5" /> Back
                  </button>
                  <button type="button" disabled={!canGoNext()} onClick={nextStep} className="bg-brand-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-brand-700 transition flex items-center gap-2 shadow-lg shadow-blue-100 disabled:opacity-50 disabled:cursor-not-allowed">
                    Next: Final Review <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 5: Additional Info & Submit */}
            {step === 5 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                  <Info className="w-6 h-6 text-brand-600" />
                  <h2 className="text-xl font-bold text-gray-900">Final Information</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Marital Status</label>
                    <select name="maritalStatus" value={formData.maritalStatus} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-blue-50 focus:border-brand-500 transition-all outline-none">
                      <option value="SINGLE">Single</option>
                      <option value="MARRIED">Married</option>
                      <option value="DIVORCED">Divorced</option>
                      <option value="WIDOWED">Widowed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Religion (Optional)</label>
                    <input type="text" name="religion" value={formData.religion} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-blue-50 focus:border-brand-500 transition-all outline-none" />
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Personal Statement</label>
                    <textarea name="personalStatement" value={formData.personalStatement} onChange={handleInputChange} rows="4" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-blue-50 focus:border-brand-500 transition-all outline-none" placeholder="Tell us why you want to join New Generation University College..."></textarea>
                  </div>

                  <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 flex gap-4">
                    <ShieldCheck className="w-6 h-6 text-amber-600 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-amber-900 mb-1">Declaration</p>
                      <p className="text-xs text-amber-700 leading-relaxed">I certify that the information provided in this application is true and correct. I understand that any false statements may result in the rejection of my application.</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-6">
                  <button type="button" onClick={prevStep} className="text-gray-500 font-bold hover:text-gray-700 transition flex items-center gap-2">
                    <ChevronLeft className="w-5 h-5" /> Back
                  </button>
                  <button type="submit" disabled={loading} className="bg-brand-600 text-white px-10 py-4 rounded-xl font-black hover:bg-brand-700 transition flex items-center gap-2 shadow-xl shadow-brand-200 disabled:opacity-50">
                    {loading ? 'Processing...' : (
                      <>Submit Application <ArrowRight className="w-5 h-5" /></>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Step 6: Success */}
            {step === 6 && (
              <div className="text-center py-12 animate-in zoom-in duration-500">
                <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8">
                  <CheckCircle className="w-12 h-12" />
                </div>
                <h2 className="text-3xl font-black text-gray-900 mb-4">Application Submitted Successfully</h2>
                <p className="text-emerald-600 font-bold mb-3">Submission saved successfully</p>
                <p className="text-gray-500 text-lg mb-8 max-w-md mx-auto leading-relaxed">
                  Thank you for applying to New Generation University College. Your student account has been automatically created.
                </p>

                {accountInfo && (
                  <div className="bg-brand-50 border border-brand-100 rounded-3xl p-8 mb-10 max-w-lg mx-auto text-left">
                    <h3 className="text-blue-900 font-bold text-lg mb-4 flex items-center gap-2">
                      <ShieldCheck className="w-6 h-6 text-brand-600" /> Account Credentials
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs font-black text-blue-400 uppercase tracking-widest mb-1">Institutional Email</p>
                        <p className="text-lg font-bold text-blue-900 break-all">{accountInfo.institutionalEmail}</p>
                      </div>
                      <div>
                        <p className="text-xs font-black text-blue-400 uppercase tracking-widest mb-1">Temporary Password</p>
                        <div className="bg-white border border-brand-200 rounded-xl px-4 py-3 font-mono text-xl font-black text-brand-600 shadow-sm select-all">
                          {accountInfo.temporaryPassword}
                        </div>
                        <p className="text-[10px] text-blue-400 mt-2 font-bold italic">Please save this password securely. You will be required to change it on your first login.</p>
                      </div>
                      <div className="pt-2 border-t border-brand-100">
                        <p className="text-xs font-black text-blue-400 uppercase tracking-widest mb-1">Student ID</p>
                        <p className="text-lg font-bold text-blue-900">{accountInfo.studentId}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link to="/" className="bg-gray-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-gray-800 transition">Return Home</Link>
                  <Link to="/login" className="bg-brand-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-brand-700 transition shadow-lg shadow-blue-100">Proceed to Login</Link>
                </div>
              </div>
            )}

          </form>
        </div>
      </div>
    </div>
  );
};

export default Apply;
