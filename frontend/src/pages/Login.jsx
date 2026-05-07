import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import atlasLogo from '../assets/atlaslogo.png';

const ROLE_ROUTES = {
  STUDENT: '/dashboard',
  INSTRUCTOR: '/instructor',
  ADMIN: '/admin',
  REGISTRAR: '/registrar',
};

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function FieldError({ id, children }) {
  if (!children) return null;
  return (
    <p id={id} className="mt-2 text-sm text-red-600">
      {children}
    </p>
  );
}

function AtlasPortalIllustration() {
  return (
    <svg
      viewBox="0 0 800 520"
      className="w-full max-w-xl"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="g1" x1="94" y1="40" x2="706" y2="500" gradientUnits="userSpaceOnUse">
          <stop stopColor="#14b8a6" stopOpacity="0.9" />
          <stop offset="0.55" stopColor="#60a5fa" stopOpacity="0.85" />
          <stop offset="1" stopColor="#a78bfa" stopOpacity="0.7" />
        </linearGradient>
        <linearGradient id="g2" x1="140" y1="120" x2="660" y2="440" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0f172a" stopOpacity="0.0" />
          <stop offset="1" stopColor="#0f172a" stopOpacity="0.35" />
        </linearGradient>
        <filter id="s1" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="18" stdDeviation="18" floodColor="#000" floodOpacity="0.35" />
        </filter>
      </defs>

      <path
        d="M122 92C170 36 272 14 356 36C446 60 502 32 576 34C680 38 744 118 736 222C728 326 636 388 550 420C472 450 440 498 350 488C258 478 206 446 162 404C108 354 50 294 58 220C66 146 88 132 122 92Z"
        fill="url(#g1)"
        opacity="0.35"
      />

      <g filter="url(#s1)">
        <rect x="170" y="160" width="460" height="260" rx="24" fill="rgba(255,255,255,0.08)" />
        <rect x="190" y="180" width="420" height="190" rx="18" fill="rgba(15,23,42,0.65)" />
        <rect x="190" y="380" width="420" height="20" rx="10" fill="rgba(255,255,255,0.10)" />
        <path d="M290 406H510" stroke="rgba(255,255,255,0.16)" strokeWidth="10" strokeLinecap="round" />
      </g>

      <g>
        <path
          d="M400 198C334 198 288 226 250 254C288 282 334 310 400 310C466 310 512 282 550 254C512 226 466 198 400 198Z"
          fill="rgba(255,255,255,0.10)"
        />
        <path
          d="M400 222C356 222 322 240 294 254C322 268 356 286 400 286C444 286 478 268 506 254C478 240 444 222 400 222Z"
          fill="rgba(20,184,166,0.45)"
        />
        <path
          d="M400 236C384 236 372 244 362 250C372 256 384 264 400 264C416 264 428 256 438 250C428 244 416 236 400 236Z"
          fill="rgba(255,255,255,0.85)"
        />
      </g>

      <g>
        <path
          d="M354 122L400 96L446 122V156C446 176 430 192 410 196L400 198L390 196C370 192 354 176 354 156V122Z"
          fill="rgba(255,255,255,0.10)"
        />
        <path d="M400 96L446 122L400 148L354 122L400 96Z" fill="rgba(96,165,250,0.55)" />
        <path d="M400 148V198" stroke="rgba(255,255,255,0.22)" strokeWidth="6" strokeLinecap="round" />
        <path
          d="M460 130C478 138 492 152 492 168C492 184 478 198 460 206"
          stroke="rgba(255,255,255,0.22)"
          strokeWidth="6"
          strokeLinecap="round"
        />
      </g>

      <g opacity="0.85">
        <path d="M612 114C612 92 630 74 652 74C674 74 692 92 692 114C692 136 674 154 652 154C630 154 612 136 612 114Z" fill="rgba(255,255,255,0.08)" />
        <path d="M652 90V138" stroke="rgba(20,184,166,0.9)" strokeWidth="10" strokeLinecap="round" />
        <path d="M628 114H676" stroke="rgba(20,184,166,0.9)" strokeWidth="10" strokeLinecap="round" />
      </g>

      <path d="M170 160H630V420H170V160Z" fill="url(#g2)" opacity="0.9" />
    </svg>
  );
}

export default function Login() {
  const { login, user, authLoading } = useAuth();
  const navigate = useNavigate();

  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [touched, setTouched] = useState({ email: false, password: false });

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
      navigate(user.isFirstLogin ? '/change-password' : ROLE_ROUTES[user.role] || '/dashboard', {
        replace: true,
      });
    }
  }, [user, authLoading, navigate]);

  const errors = useMemo(() => {
    const next = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) next.email = 'Email is required.';
    else if (!isValidEmail(trimmedEmail)) next.email = 'Enter a valid email address.';

    if (!password) next.password = 'Password is required.';

    return next;
  }, [email, password]);

  const canSubmit = !loading && !authLoading && Object.keys(errors).length === 0;
  const emailError = touched.email ? errors.email : '';
  const passwordError = touched.password ? errors.password : '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setTouched({ email: true, password: true });

    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      const result = await login(email.trim(), password, { rememberMe });
      if (result.success) {
        navigate(
          result.user.isFirstLogin ? '/change-password' : ROLE_ROUTES[result.user.role] || '/dashboard',
          { replace: true }
        );
      } else {
        setFormError(result.error || 'Wrong email or password.');
      }
    } catch {
      setFormError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans">
        <div className="h-10 w-10 rounded-full border-2 border-slate-300 border-t-teal-600 animate-spin" />
      </div>
    );
  }

  if (user) return null;

  return (
    <div className="min-h-screen font-sans bg-slate-50">
      <div className="min-h-screen grid lg:grid-cols-2">
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-900 text-white px-6 py-12 sm:px-10">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-teal-500/20 blur-3xl" />
            <div className="absolute -bottom-28 -right-28 h-80 w-80 rounded-full bg-sky-500/20 blur-3xl" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(148,163,184,0.18)_1px,transparent_0)] [background-size:24px_24px] opacity-40" />
          </div>

          <div
            className={[
              'relative mx-auto flex h-full w-full max-w-xl flex-col',
              'transition duration-700 ease-out',
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2',
            ].join(' ')}
          >
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-white/10 ring-1 ring-white/15 flex items-center justify-center overflow-hidden">
                <img src={atlasLogo} alt="Atlas logo" className="h-8 w-8 object-contain" />
              </div>
              <div className="leading-tight">
                <p className="text-sm font-semibold tracking-wide text-white/90">
                  Atlas Health College Portal
                </p>
                <p className="text-xs text-slate-300">
                  Secure access for students, faculty, and staff
                </p>
              </div>
            </div>

            <div className="mt-10 flex-1 flex flex-col justify-center">
              <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
                Sign in to your academic workspace.
              </h1>
              <p className="mt-4 text-slate-300 leading-relaxed">
                Manage registrations, view results, and access college services in one place.
              </p>

              <div className="mt-10">
                <AtlasPortalIllustration />
              </div>
            </div>

            <div className="mt-10 flex items-center gap-2 text-xs text-slate-300">
              <ShieldCheck className="h-4 w-4 text-teal-300" />
              <span>Protected with secure authentication and role-based access.</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center px-6 py-12 sm:px-10">
          <div
            className={[
              'w-full max-w-md',
              'transition duration-700 ease-out',
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2',
            ].join(' ')}
          >
            <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
              <div className="px-6 py-7 sm:px-8 sm:py-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight text-slate-900">
                      Welcome back
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Use your institutional email to sign in.
                    </p>
                  </div>
                  <div className="h-10 w-10 rounded-2xl bg-slate-50 ring-1 ring-slate-200 flex items-center justify-center">
                    <img src={atlasLogo} alt="Atlas" className="h-7 w-7 object-contain" />
                  </div>
                </div>

                {formError ? (
                  <div
                    role="alert"
                    className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                  >
                    {formError}
                  </div>
                ) : null}

                <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                      Email
                    </label>
                    <div className="relative mt-2">
                      <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setFormError('');
                        }}
                        onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                        aria-invalid={emailError ? 'true' : 'false'}
                        aria-describedby={emailError ? 'email-error' : undefined}
                        placeholder="name@atlas.edu.et"
                        className={[
                          'w-full rounded-xl bg-white pl-10 pr-3.5 py-3 text-sm text-slate-900',
                          'ring-1 ring-inset outline-none transition',
                          emailError
                            ? 'ring-red-300 focus:ring-2 focus:ring-red-500/30'
                            : 'ring-slate-200 focus:ring-2 focus:ring-teal-600/30',
                        ].join(' ')}
                      />
                    </div>
                    <FieldError id="email-error">{emailError}</FieldError>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                        Password
                      </label>
                      <Link
                        to="/forgot-password"
                        className="text-sm font-medium text-teal-700 hover:text-teal-800"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <div className="relative mt-2">
                      <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setFormError('');
                        }}
                        onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                        aria-invalid={passwordError ? 'true' : 'false'}
                        aria-describedby={passwordError ? 'password-error' : undefined}
                        placeholder="Enter your password"
                        className={[
                          'w-full rounded-xl bg-white pl-10 pr-11 py-3 text-sm text-slate-900',
                          'ring-1 ring-inset outline-none transition',
                          passwordError
                            ? 'ring-red-300 focus:ring-2 focus:ring-red-500/30'
                            : 'ring-slate-200 focus:ring-2 focus:ring-teal-600/30',
                        ].join(' ')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <FieldError id="password-error">{passwordError}</FieldError>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-3 select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-600/30"
                      />
                      <span className="text-sm text-slate-600">Remember me</span>
                    </label>
                    <span className="text-xs text-slate-500">Shared device? Turn this off.</span>
                  </div>

                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className={[
                      'mt-1 w-full rounded-xl px-4 py-3.5 text-sm font-semibold text-white',
                      'bg-teal-600 hover:bg-teal-700 shadow-sm shadow-teal-600/20',
                      'transition disabled:cursor-not-allowed disabled:opacity-60',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/40',
                    ].join(' ')}
                  >
                    <span className="inline-flex items-center justify-center gap-2">
                      {loading ? (
                        <>
                          <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                          Signing in…
                        </>
                      ) : (
                        'Sign in'
                      )}
                    </span>
                  </button>

                  <p className="text-xs text-slate-500 leading-relaxed">
                    By signing in, you agree to keep your credentials private and follow campus IT policies.
                  </p>
                </form>
              </div>

              <div className="border-t border-slate-200 px-6 py-5 sm:px-8">
                <p className="text-sm text-slate-600">
                  New student?{' '}
                  <Link to="/apply" className="font-semibold text-teal-700 hover:text-teal-800">
                    Apply for admission
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
