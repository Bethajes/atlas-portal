import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { Camera, User, Mail, Shield, Book, CreditCard, ChevronRight, AlertCircle, CheckCircle2 } from 'lucide-react';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    institutionalEmail: '',
    recoveryEmail: '',
    password: '',
    confirmPassword: '',
    studentId: '',
    departmentId: '',
    programId: '',
  });
  
  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  
  const fileInputRef = useRef(null);
  const { register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const response = await api.get('/academic/departments');
        setDepartments(response.data.data || []);
      } catch (err) {
        console.error('Failed to fetch departments:', err);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const endpoint = formData.departmentId
          ? `/academic/programs?departmentId=${formData.departmentId}`
          : '/academic/programs';
        const response = await api.get(endpoint);
        setPrograms(response.data.data || []);
      } catch (err) {
        console.error('Failed to fetch programs:', err);
      }
    };
    fetchPrograms();
  }, [formData.departmentId]);

  const selectedProgram = programs.find((p) => p.id === formData.programId);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('Image size must be less than 2MB');
        return;
      }
      setProfileImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const validateStep1 = () => {
    if (formData.name.length < 3) {
      setError('Name must be at least 3 characters');
      return false;
    }
    const emailPattern = /^[a-zA-Z0-9._-]+@(ngu\.edu\.et|atlas\.edu\.et)$/;
    if (!emailPattern.test(formData.institutionalEmail)) {
      setError('Institutional email must be @ngu.edu.et format');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.programId) {
      setError('Please select a program');
      return false;
    }
    if (selectedProgram?.type === 'DECLARED' && !formData.departmentId) {
      setError('Please select a department for declared programs');
      return false;
    }
    return true;
  };

  const validateFinal = () => {
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateFinal()) return;

    setLoading(true);

    try {
      const data = new FormData();
      Object.keys(formData).forEach(key => {
        if (formData[key]) data.append(key, formData[key]);
      });
      if (profileImage) {
        data.append('profileImage', profileImage);
      }

      const result = await register(data);
      
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-100">
        {/* Header with Progress */}
        <div className="bg-brand-600 p-8 text-white relative">
          <div className="relative z-10">
            <h1 className="text-3xl font-black tracking-tight">NGUC Portal</h1>
            <p className="text-blue-100 mt-2 font-medium">Join our healthcare community</p>
          </div>
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Shield size={120} />
          </div>
          
          {/* Progress Bar */}
          <div className="mt-8 flex gap-2">
            {[1, 2, 3].map(i => (
              <div 
                key={i} 
                className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${step >= i ? 'bg-white' : 'bg-blue-400/50'}`}
              />
            ))}
          </div>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm font-bold flex items-center gap-3 animate-shake">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* STEP 1: Personal Info */}
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex flex-col items-center mb-8">
                  <div 
                    onClick={() => fileInputRef.current.click()}
                    className="w-24 h-24 bg-gray-100 rounded-3xl border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-brand-500 hover:bg-brand-50 transition-all group relative overflow-hidden"
                  >
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="text-gray-400 group-hover:text-brand-500" size={32} />
                    )}
                    <div className="absolute bottom-0 inset-x-0 bg-black/50 py-1 text-[10px] text-white text-center opacity-0 group-hover:opacity-100 transition-opacity font-bold">
                      UPLOAD PHOTO
                    </div>
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleImageChange} 
                  />
                  <p className="text-xs text-gray-400 mt-3 font-bold uppercase tracking-widest">Profile Picture</p>
                </div>

                <div className="space-y-4">
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Full Name (e.g. Abebe Kebede)"
                      className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-brand-500 transition-all outline-none font-medium"
                      required
                    />
                  </div>

                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="email"
                      name="institutionalEmail"
                      value={formData.institutionalEmail}
                      onChange={handleChange}
                      placeholder="Institutional Email (@ngu.edu.et)"
                      className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-brand-500 transition-all outline-none font-medium"
                      required
                    />
                  </div>

                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="email"
                      name="recoveryEmail"
                      value={formData.recoveryEmail}
                      onChange={handleChange}
                      placeholder="Personal Recovery Email"
                      className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-brand-500 transition-all outline-none font-medium"
                      required
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (validateStep1()) {
                      setError('');
                      setStep(2);
                    }
                  }}
                  className="w-full bg-brand-600 text-white py-4 rounded-2xl font-black hover:bg-brand-700 transition flex items-center justify-center gap-2 shadow-lg shadow-blue-100"
                >
                  Continue <ChevronRight size={20} />
                </button>
              </div>
            )}

            {/* STEP 2: Academic Info */}
            {step === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="space-y-4">
                  <div className="relative">
                    <Book className="absolute left-4 top-4 text-gray-400" size={18} />
                    <select
                      name="departmentId"
                      value={formData.departmentId}
                      onChange={handleChange}
                      className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-brand-500 transition-all outline-none font-medium appearance-none"
                      required
                    >
                      <option value="">Select Department</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="relative">
                    <Book className="absolute left-4 top-4 text-gray-400" size={18} />
                    <select
                      name="programId"
                      value={formData.programId}
                      onChange={handleChange}
                      className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-brand-500 transition-all outline-none font-medium appearance-none"
                      required
                    >
                      <option value="">Select Program</option>
                      {programs.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.type === 'UNDECLARED' ? 'Undeclared' : 'Declared'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="relative">
                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      name="studentId"
                      value={formData.studentId}
                      onChange={handleChange}
                      placeholder="Student ID (Optional)"
                      className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-brand-500 transition-all outline-none font-medium"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 bg-gray-100 text-gray-600 py-4 rounded-2xl font-black hover:bg-gray-200 transition"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (validateStep2()) {
                        setError('');
                        setStep(3);
                      }
                    }}
                    className="flex-[2] bg-brand-600 text-white py-4 rounded-2xl font-black hover:bg-brand-700 transition flex items-center justify-center gap-2 shadow-lg shadow-blue-100"
                  >
                    Continue <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Security */}
            {step === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="space-y-4">
                  <div className="relative">
                    <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Create Secure Password"
                      className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-brand-500 transition-all outline-none font-medium"
                      required
                    />
                  </div>

                  <div className="relative">
                    <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Confirm Password"
                      className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-brand-500 transition-all outline-none font-medium"
                      required
                    />
                  </div>
                </div>

                <div className="bg-brand-50 p-4 rounded-2xl border border-brand-100 flex gap-3">
                  <CheckCircle2 className="text-brand-600 shrink-0" size={20} />
                  <p className="text-xs text-brand-700 font-medium leading-relaxed">
                    By creating an account, you agree to the New Generation University College terms of service and student code of conduct.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex-1 bg-gray-100 text-gray-600 py-4 rounded-2xl font-black hover:bg-gray-200 transition"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-[2] bg-brand-600 text-white py-4 rounded-2xl font-black hover:bg-brand-700 transition flex items-center justify-center gap-2 shadow-lg shadow-blue-100 disabled:opacity-50"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Creating Account...
                      </span>
                    ) : (
                      'Complete Registration'
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>

          <p className="text-center text-gray-500 mt-8 text-sm font-medium">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-600 hover:underline font-bold">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
