import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, Activity, Stethoscope, Shield, Microscope, Mail, Lock, ChevronRight } from 'lucide-react';
import atlasLogo from '../assets/atlaslogo.png';

const ROLE_ROUTES = {
  STUDENT: '/dashboard',
  INSTRUCTOR: '/instructor',
  ADMIN: '/admin',
  REGISTRAR: '/registrar',
};

const MedicalCross = () => (
  <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
    <rect x="10" y="2" width="8" height="24" rx="2" fill="currentColor" />
    <rect x="2" y="10" width="24" height="8" rx="2" fill="currentColor" />
  </svg>
);

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login, user, authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const link = document.createElement('link');
    link.href =
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Libre+Baskerville:wght@400;600;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
      navigate(
        user.isFirstLogin
          ? '/change-password'
          : ROLE_ROUTES[user.role] || '/dashboard',
        { replace: true }
      );
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await login(email, password);
      if (result.success) {
        navigate(
          result.user.isFirstLogin
            ? '/change-password'
            : ROLE_ROUTES[result.user.role] || '/dashboard',
          { replace: true }
        );
      } else {
        setError(result.error);
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="text-[#003366] animate-pulse">
            <MedicalCross />
          </div>
          <div className="w-1 h-8 bg-[#003366]/30 rounded animate-pulse" />
        </div>
      </div>
    );

  if (user) return null;

  return (
    <div
      style={{ fontFamily: "'Inter', sans-serif" }}
      className="min-h-screen flex bg-gray-50"
    >
      {/* Left Panel - Medical Background Image with Overlay */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
        {/* Medical lab background image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1581093588401-fbb62a02f120?q=80&w=2070&auto=format&fit=crop')",
          }}
        />
        {/* Dark overlay with blur */}
        <div className="absolute inset-0 bg-[#001428]/75 backdrop-blur-[3px]" />
        {/* Gradient overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#003366]/40 via-[#001a33]/60 to-[#001428]/80" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between w-full p-12">
          {/* Top Logo */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/15 backdrop-blur-md rounded-2xl border border-white/20 flex items-center justify-center text-white">
              <Microscope className="w-6 h-6" />
            </div>
            <div>
              <p className="text-white font-bold text-base tracking-wide">
                ATLAS COLLEGE
              </p>
              <p className="text-blue-200/80 text-xs font-semibold tracking-widest uppercase">
                of Health Sciences
              </p>
            </div>
          </div>

          {/* Center Content */}
          <div className="flex-1 flex flex-col justify-center max-w-lg">
            <div className="mb-8">
              <span className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-blue-100 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full backdrop-blur-sm">
                <Activity className="w-3.5 h-3.5" /> Academic Year 2025–2026
              </span>
            </div>
            <h1
              style={{ fontFamily: "'Libre Baskerville', serif" }}
              className="text-5xl xl:text-6xl font-bold text-white leading-[1.15] mb-6"
            >
              Where Future
              <br />
              <span className="text-blue-200">Healers</span> Begin
            </h1>
            <p className="text-blue-100/80 text-lg leading-relaxed mb-10">
              Access your academic records, course registrations, and clinical
              resources through our unified health sciences portal.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { icon: Stethoscope, label: 'Health Programs', value: '14+' },
                { icon: Activity, label: 'Active Students', value: '3,200+' },
                { icon: Shield, label: 'Years of Excellence', value: '35+' },
              ].map(({ icon: Icon, label, value }) => (
                <div
                  key={label}
                  className="bg-white/8 border border-white/15 rounded-2xl p-5 backdrop-blur-sm"
                >
                  <Icon className="w-5 h-5 text-blue-300 mb-3" />
                  <p className="text-white font-bold text-xl">{value}</p>
                  <p className="text-blue-200/70 text-xs font-medium mt-1">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom quote */}
          <p className="text-blue-200/60 text-sm italic font-medium">
            "Excellence in medical education since 1989"
          </p>
        </div>
      </div>

      {/* Right Panel - Clean White Login Card */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 bg-white">
        <div className="w-full max-w-md">
          {/* Centered Logo */}
          <div className="flex flex-col items-center mb-10">
            <img
              src={atlasLogo}
              alt="Atlas College Logo"
              className="w-20 h-20 object-contain mb-3"
            />
            <h2
              style={{ fontFamily: "'Libre Baskerville', serif" }}
              className="text-2xl font-bold text-[#003366]"
            >
              Atlas College
            </h2>
            <p className="text-gray-500 text-sm font-medium">
              of Health Sciences
            </p>
          </div>

          {/* Welcome Text */}
          <div className="mb-8">
            <h3
              style={{ fontFamily: "'Libre Baskerville', serif" }}
              className="text-3xl font-bold text-gray-900 mb-1"
            >
              Welcome back
            </h3>
            <p className="text-gray-500 text-sm">
              Sign in with your institutional credentials to continue.
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-medium p-4 rounded-xl flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                {error}
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                Student / Staff Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 pl-11 pr-4 py-3.5 rounded-xl outline-none transition focus:border-[#003366] focus:ring-4 focus:ring-[#003366]/8 text-sm font-medium"
                  placeholder="name@atlas.edu.et"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-sky-500 hover:text-sky-600 font-semibold transition"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 pl-11 pr-4 py-3.5 rounded-xl outline-none transition focus:border-[#003366] focus:ring-4 focus:ring-[#003366]/8 text-sm font-medium"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#003366] hover:bg-[#00264d] text-white font-bold py-4 rounded-xl transition flex items-center justify-center gap-2 text-sm shadow-lg shadow-[#003366]/20 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  Sign In <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* SSO Option */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-3 text-gray-400 font-semibold tracking-wider">
                  or continue with
                </span>
              </div>
            </div>

            {/* Microsoft SSO Button */}
            <button
              type="button"
              className="w-full bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 font-semibold py-3.5 rounded-xl transition flex items-center justify-center gap-3 text-sm"
            >
              <svg
                className="w-5 h-5"
                viewBox="0 0 21 21"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M10 1H1V10H10V1Z" fill="#F25022" />
                <path d="M20 1H11V10H20V1Z" fill="#7FBA00" />
                <path d="M10 11H1V20H10V11Z" fill="#00A4EF" />
                <path d="M20 11H11V20H20V11Z" fill="#FFB900" />
              </svg>
              Login with Microsoft
            </button>

            {/* Apply Link */}
            <p className="text-center text-gray-500 text-sm pt-4">
              New student?{' '}
              <Link
                to="/apply"
                className="text-[#003366] hover:text-[#00264d] font-bold transition"
              >
                Apply for admission
                <ChevronRight className="inline w-3.5 h-3.5 ml-0.5" />
              </Link>
            </p>
          </form>

          {/* Test Credentials */}
          <div className="mt-8 bg-gray-50 border border-gray-200 rounded-2xl p-5">
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-[#003366]" /> Test Credentials
            </p>
            <div className="space-y-1.5">
              {[
                ['Admin', 'admin@atlas.edu', 'Test123!'],
                ['Registrar', 'registrar@atlas.edu', 'Test123!'],
                ['Instructor', 'dr.alem@atlas.edu', 'Test123!'],
                ['Student', 'abel.tesfaye@atlas.edu.et', 'Test123!'],
              ].map(([role, emailAddr, pass]) => (
                <div
                  key={role}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="text-[#003366] font-bold w-20">{role}</span>
                  <span className="text-gray-500 flex-1">{emailAddr}</span>
                  <span className="text-gray-400 font-mono">{pass}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;