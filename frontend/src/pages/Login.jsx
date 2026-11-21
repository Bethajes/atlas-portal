import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Eye,
  EyeOff,
  Fingerprint,
  Lock,
  Mail,
  ShieldAlert,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BrandLogo } from '../components/BrandLogo';
import { BRAND } from '../config/brand';

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

const FEATURES = [
  {
    icon: BookOpen,
    title: 'Academic Management',
    text: 'Programs, courses, registration, and academic records.',
  },
  {
    icon: Fingerprint,
    title: 'Secure & Role-Based Access',
    text: 'Secure access for administrators, staff, instructors, and students.',
  },
  {
    icon: Users,
    title: 'Unified Experience',
    text: 'Essential university services in one integrated platform.',
  },
];

function HeroCard({ icon: Icon, title, text, accentClass }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 transition duration-300 ease-out hover:border-white/30 hover:bg-white/10">
      <div className="absolute -inset-1 rounded-xl bg-gradient-to-br from-transparent via-white/5 to-transparent opacity-0 transition group-hover:opacity-100" />
      <div className={`mb-3.5 grid h-11 w-11 place-items-center rounded-xl ${accentClass}`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <h3 className="font-semibold text-white">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-200">{text}</p>
    </div>
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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="grid place-items-center">
          <div className="grid place-items-center">
            <div className="grid place-items-center">
              <BrandLogo showName={false} logoClassName="h-10 w-10 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (user) return null;

  return (
    <div className="min-h-screen bg-white">
      <div className="md:grid md:min-h-screen md:grid-cols-[1fr_1.15fr] md:gap-0">
        {/* ───────────────── LEFT: University identity ───────────────── */}
        <div
          className={[
            'hidden md:relative md:flex md:min-h-screen md:w-full md:items-center md:px-10 md:py-12 lg:px-14 xl:px-20',
          ].join(' ')}
          style={mounted ? { animationDelay: '120ms' } : undefined}
        >
          <div className="relative z-10 w-full overflow-hidden rounded-3xl bg-gradient-to-br from-brand-950 via-brand-800 to-brand-700 px-8 py-12 text-white shadow-2xl sm:px-12 md:min-h-[620px] md:rounded-[2rem] lg:px-14">
            {/* Subtle decorative texture */}
            <div className="pointer-events-none absolute inset-0 -m-8 opacity-40">
              <div className="absolute -top-28 -right-28 h-64 w-64 rounded-full bg-accent-300/20 blur-3xl" />
              <div className="absolute bottom-4 left-0 h-32 w-full rounded-full border-t-2 border-white/10 border-dashed opacity-50" />
              <svg className="absolute inset-0 h-full w-full opacity-[0.035]" viewBox="0 0 260 160" preserveAspectRatio="none">
                <path d="M0 40 Q80 20 160 40 T260 20" stroke="white" strokeWidth="1" fill="none" />
                <path d="M0 80 Q120 90 240 60" stroke="white" strokeWidth="1" fill="none" />
                <path d="M0 110 Q200 120 260 80" stroke="white" strokeWidth="1" fill="none" />
              </svg>
            </div>

            {/* Header */}
            <div className="relative z-10">
              <div className="flex items-center gap-3">
                <BrandLogo showName={false} logoClassName="h-12 w-12" />
                <div>
                  <p className="text-sm font-semibold tracking-wide text-white/85">{BRAND.name}</p>
                  <p className="text-xs font-medium text-white/55">{BRAND.tagline}</p>
                </div>
              </div>
              <p className="mt-6 text-sm font-medium text-white/60">{BRAND.portalName}</p>
            </div>

            {/* Hero content */}
            <div className="relative z-10 mt-10 md:mt-12">
              <p className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-[11px] font-semibold tracking-[0.22em] text-white">
                {BRAND.tagline.toUpperCase()}
              </p>
              <h1 className="mt-5 max-w-2xl text-3xl font-bold tracking-tight leading-tight sm:text-4xl md:text-5xl">
                Empowering the Future Through Education.
              </h1>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-white/80">
                An integrated digital platform for managing academic activities, student services,
                financial operations, and institutional administration.
              </p>
            </div>

            {/* Feature cards */}
            <div className="relative z-10 mt-10 grid gap-3 sm:grid-cols-1 md:grid-cols-3">
              <HeroCard icon={BookOpen} title="Academic Management" text="Programs, courses, registration, and academic records." accentClass="bg-white/12 ring-1 ring-white/15" />
              <HeroCard icon={Fingerprint} title="Secure & Role-Based Access" text="Secure access for administrators, staff, instructors, and students." accentClass="bg-accent-400/20 ring-1 ring-white/15" />
              <HeroCard icon={Users} title="Unified Experience" text="Essential university services in one integrated platform." accentClass="bg-white/12 ring-1 ring-white/15" />
            </div>

            {/* Security message */}
            <div className="relative z-10 mt-10 flex items-center gap-2 text-sm text-white/55">
              <ShieldCheck className="h-4 w-4 shrink-0 text-accent-300" />
              <span>Secure authentication and role-based access control.</span>
            </div>
          </div>
        </div>

        {/* ───────────────── RIGHT: Login form ───────────────── */}
        <div className="relative z-10 flex min-h-screen items-center justify-center bg-white px-4 py-8 sm:px-6 md:px-10 lg:px-12">
          {/* Mobile hero condensed header */}
          <div className="mb-8 w-full text-slate-900 md:hidden">
            <div className="flex justify-center">
              <BrandLogo showName={false} logoClassName="mx-auto h-14 w-14" />
            </div>
            <h2 className="mt-5 text-2xl font-bold tracking-tight text-center text-slate-900">
              Empowering the Future Through Education.
            </h2>
            <p className="mt-3 text-center text-sm text-slate-500 max-w-sm">
              Manage academic activities, student services, and institutional administration in one unified platform.
            </p>
          </div>

          <div
            className={[
              'w-full max-w-md rounded-2xl rounded-[1.75rem] border border-slate-200 bg-white shadow-panel',
              mounted ? 'transition-all duration-500 ease-out opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
            ].join(' ')}
          >
            <div className="px-7 pb-7 sm:px-9 sm:pb-9">
              {/* Card header */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand-600">Sign in</p>
                  <h2 className="mt-2.5 text-2xl font-bold tracking-tight text-slate-900">Welcome back</h2>
                  <p className="mt-1 text-sm text-slate-500">Sign in to your institutional account to continue.</p>
                </div>
                <BrandLogo showName={false} logoClassName="h-11 w-11 shrink-0" />
              </div>

              {formError ? (
                <div role="alert" className="mt-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              ) : null}

              <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                    Email address
                  </label>
                  <div className="relative mt-2">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setFormError(''); }}
                      onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                      aria-invalid={emailError ? 'true' : 'false'}
                      aria-describedby={emailError ? 'email-error' : undefined}
                      placeholder={`name@${BRAND.emailDomain}`}
                      className={[
                        'w-full rounded-xl bg-slate-50 py-3 pl-10 pr-3 text-sm text-slate-900',
                        'ring-1 ring-inset transition outline-none',
                        emailError
                          ? 'ring-red-300 focus:ring-2 focus:ring-red-500/30'
                          : 'ring-slate-200 focus:ring-2 focus:ring-brand-500/30',
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
                      className="text-sm font-medium text-brand-600 transition-colors hover:text-brand-700"
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
                      onChange={(e) => { setPassword(e.target.value); setFormError(''); }}
                      onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                      aria-invalid={passwordError ? 'true' : 'false'}
                      aria-describedby={passwordError ? 'password-error' : undefined}
                      placeholder="Enter your password"
                      className={[
                        'w-full rounded-xl bg-slate-50 py-3 pl-10 pr-11 text-sm text-slate-900',
                        'ring-1 ring-inset transition outline-none',
                        passwordError
                          ? 'ring-red-300 focus:ring-2 focus:ring-red-500/30'
                          : 'ring-slate-200 focus:ring-2 focus:ring-brand-500/30',
                      ].join(' ')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <FieldError id="password-error">{passwordError}</FieldError>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none" htmlFor="remember-me">
                    <span className="relative grid h-5 w-5 place-items-center rounded border border-slate-300 bg-white transition">
                      {rememberMe && (
                        <svg className="h-3 w-3 text-white" viewBox="0 0 10 10" fill="none">
                          <path d="M2 5L4.5 7.5L8 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                      <input
                        id="remember-me"
                        type="checkbox"
                        className="absolute inset-0 opacity-0"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        aria-label="Remember me on this device"
                      />
                    </span>
                    <span className="text-sm font-medium text-slate-600">Remember me</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="mt-1 flex h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-brand-600 text-base font-semibold text-white shadow-lg shadow-brand-600/20 transition-all duration-150 hover:bg-brand-700 active:scale-[0.995] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      Signing in…
                    </>
                  ) : (
                    <>
                      Sign in
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Security note */}
              <p className="mt-6 text-center text-xs text-slate-400">
                Secure authentication and role-based access control.
              </p>

              {/* Footer */}
              <div className="mt-7 border-t border-slate-100 px-2 pt-7 pb-1">
                <p className="text-center text-sm text-slate-600">
                  New student?{' '}
                  <Link to="/apply" className="font-semibold text-brand-600 transition-colors hover:text-brand-700">
                    Apply for admission
                  </Link>
                </p>
                <p className="mt-3 text-center text-[11px] text-slate-400">
                  {BRAND.shortName} · {BRAND.name}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
