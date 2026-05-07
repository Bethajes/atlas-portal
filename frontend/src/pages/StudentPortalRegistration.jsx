import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import StudentPortalLayout from '../components/StudentPortalLayout';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Mail,
  Phone,
  Save,
  Trash2,
  User,
} from 'lucide-react';

const STORAGE_KEY = 'atlasHealthCollegePortal.studentRegistrationDraft.v1';

function normalizePhone(value) {
  return value.replace(/[^\d+]/g, '');
}

function validate(values) {
  const errors = {};

  const name = values.name.trim();
  if (!name) errors.name = 'Please enter your full name.';
  else if (name.length < 3) errors.name = 'Name must be at least 3 characters.';
  else if (name.split(/\s+/).length < 2) errors.name = 'Please enter first name and last name.';

  const email = values.email.trim();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) errors.email = 'Email is required.';
  else if (!emailPattern.test(email)) errors.email = 'Please enter a valid email address.';

  const phone = values.phone.trim();
  const phoneNormalized = normalizePhone(phone);
  if (!phone) errors.phone = 'Phone number is required.';
  else if (phoneNormalized.length < 9) errors.phone = 'Please enter a valid phone number.';

  if (!values.departmentId) errors.departmentId = 'Please select a department.';
  if (!values.programId) errors.programId = 'Please select a program.';

  return errors;
}

function StepPill({ index, currentStep, label }) {
  const isComplete = currentStep > index;
  const isActive = currentStep === index;

  return (
    <div className="flex items-center gap-3 min-w-0">
      <div
        className={[
          'w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-all',
          isComplete ? 'bg-emerald-500 text-white' : '',
          isActive ? 'bg-blue-600 text-white ring-4 ring-blue-100' : '',
          !isActive && !isComplete ? 'bg-gray-100 text-gray-500' : '',
        ].join(' ')}
        aria-hidden="true"
      >
        {isComplete ? <CheckCircle2 className="w-5 h-5" /> : <span className="text-sm font-black">{index}</span>}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-black text-gray-900 truncate">{label}</p>
        <p className="text-[11px] text-gray-500 truncate">
          {isComplete ? 'Done' : isActive ? 'In progress' : 'Next'}
        </p>
      </div>
    </div>
  );
}

function Field({ label, icon, input, error, success, hint, required }) {
  return (
    <div>
      <label className="block text-sm font-black text-gray-800 mb-2">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </label>
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">{icon}</div>
        {input}
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          {error ? <AlertCircle className="w-5 h-5 text-red-500" /> : success ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : null}
        </div>
      </div>
      {error ? (
        <p className="mt-2 text-xs font-bold text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-2 text-xs text-gray-500">{hint}</p>
      ) : null}
    </div>
  );
}

export default function StudentPortalRegistration() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const saveTimerRef = useRef(null);
  const inStudentPortal = user?.role === 'STUDENT';

  const [step, setStep] = useState(1);
  const [departments, setDepartments] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [restoredDraft, setRestoredDraft] = useState(false);

  const [values, setValues] = useState({
    name: '',
    email: '',
    phone: '',
    departmentId: '',
    programId: '',
  });

  const [touched, setTouched] = useState({
    name: false,
    email: false,
    phone: false,
    departmentId: false,
    programId: false,
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed?.values || typeof parsed.values !== 'object') return;
      setValues((prev) => ({ ...prev, ...parsed.values }));
      if (parsed.step && [1, 2, 3].includes(parsed.step)) setStep(parsed.step);
      setRestoredDraft(true);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    const fetchDepartments = async () => {
      setLoadingDepartments(true);
      try {
        const response = await api.get('/academic/departments');
        setDepartments(response.data.data || []);
      } catch {
        setDepartments([]);
      } finally {
        setLoadingDepartments(false);
      }
    };
    fetchDepartments();
  }, []);

  useEffect(() => {
    const fetchPrograms = async () => {
      if (!values.departmentId) {
        setPrograms([]);
        return;
      }
      setLoadingPrograms(true);
      try {
        const response = await api.get(`/academic/programs?departmentId=${values.departmentId}`);
        setPrograms(response.data.data || []);
      } catch {
        setPrograms([]);
      } finally {
        setLoadingPrograms(false);
      }
    };
    fetchPrograms();
  }, [values.departmentId]);

  const errors = useMemo(() => validate(values), [values]);

  const step1Valid = !errors.name && !errors.email && !errors.phone;
  const step2Valid = !errors.departmentId && !errors.programId;
  const canContinue = step === 1 ? step1Valid : step === 2 ? step2Valid : step1Valid && step2Valid;

  const persistDraft = (nextValues, nextStep) => {
    const payload = { values: nextValues, step: nextStep, savedAt: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    setSavedAt(payload.savedAt);
  };

  const updateValue = (name, value) => {
    setValues((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'departmentId') next.programId = '';
      return next;
    });
  };

  useEffect(() => {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      persistDraft(values, step);
    }, 350);

    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [values, step]);

  const markStepTouched = () => {
    const stepFields = step === 1 ? ['name', 'email', 'phone'] : step === 2 ? ['departmentId', 'programId'] : ['name', 'email', 'phone', 'departmentId', 'programId'];
    setTouched((prev) => {
      const next = { ...prev };
      for (const f of stepFields) next[f] = true;
      return next;
    });
  };

  const goNext = () => {
    markStepTouched();
    if (!canContinue) return;
    setStep((s) => Math.min(3, s + 1));
  };

  const goBack = () => setStep((s) => Math.max(1, s - 1));

  const clearDraft = () => {
    localStorage.removeItem(STORAGE_KEY);
    setRestoredDraft(false);
    setSavedAt(null);
    setValues({ name: '', email: '', phone: '', departmentId: '', programId: '' });
    setTouched({ name: false, email: false, phone: false, departmentId: false, programId: false });
    setStep(1);
    toast.success('Saved progress cleared.');
  };

  const manualSave = () => {
    persistDraft(values, step);
    toast.success('Progress saved.');
  };

  const submit = async (e) => {
    e.preventDefault();
    setTouched({ name: true, email: true, phone: true, departmentId: true, programId: true });
    if (!step1Valid || !step2Valid) {
      toast.error('Please fix the highlighted fields.');
      return;
    }
    setSubmitting(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      localStorage.removeItem(STORAGE_KEY);
      toast.success('Registration submitted successfully.');
      navigate(inStudentPortal ? '/dashboard' : '/login');
    } finally {
      setSubmitting(false);
    }
  };

  const card = (
    <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/60 border border-gray-100 overflow-hidden">
          <div className="p-6 sm:p-8 bg-gradient-to-br from-blue-600 to-blue-700 text-white">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-blue-100 text-sm font-bold">Guided registration</p>
                <p className="text-white text-lg font-black">Step {step} of 3</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={manualSave}
                  className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white text-sm font-black px-4 py-2 rounded-2xl transition"
                >
                  <Save className="w-4 h-4" />
                  Save progress
                </button>
                <button
                  type="button"
                  onClick={clearDraft}
                  className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white text-sm font-black px-4 py-2 rounded-2xl transition"
                >
                  <Trash2 className="w-4 h-4" />
                  Reset
                </button>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StepPill index={1} currentStep={step} label="Personal Info" />
              <StepPill index={2} currentStep={step} label="Academic Info" />
              <StepPill index={3} currentStep={step} label="Review & Submit" />
            </div>
          </div>

          <div className="p-6 sm:p-8">
            {restoredDraft ? (
              <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 flex items-center justify-between gap-3">
                <p className="text-xs sm:text-sm font-bold text-blue-800">
                  We restored your saved progress so you can continue where you left off.
                </p>
                <button
                  type="button"
                  onClick={() => setRestoredDraft(false)}
                  className="text-xs font-black text-blue-700 hover:underline shrink-0"
                >
                  Dismiss
                </button>
              </div>
            ) : null}

            <div className="mb-6 flex items-center justify-between gap-3">
              <p className="text-xs text-gray-500 font-medium">
                {savedAt ? `Saved ${new Date(savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Saving…'}
              </p>
              {inStudentPortal ? (
                <Link to="/dashboard" className="text-xs font-black text-blue-600 hover:underline">
                  Back to dashboard
                </Link>
              ) : (
                <Link to="/login" className="text-xs font-black text-blue-600 hover:underline">
                  Already registered? Sign in
                </Link>
              )}
            </div>

            <form onSubmit={submit} className="space-y-8">
              {step === 1 ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                    <User className="w-5 h-5 text-blue-600" />
                    <h2 className="text-lg font-black text-gray-900">Personal Information</h2>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    <Field
                      label="Full Name"
                      required
                      icon={<User className="w-5 h-5" />}
                      error={touched.name ? errors.name : ''}
                      success={touched.name && !errors.name && values.name.trim().length > 0}
                      hint="Use the same name you use on official documents."
                      input={
                        <input
                          name="name"
                          value={values.name}
                          onChange={(e) => updateValue('name', e.target.value)}
                          onBlur={() => setTouched((p) => ({ ...p, name: true }))}
                          placeholder="e.g., Abebe Kebede"
                          className={[
                            'w-full pl-12 pr-12 py-4 rounded-2xl bg-gray-50 border outline-none transition text-base',
                            touched.name && errors.name ? 'border-red-200 focus:ring-4 focus:ring-red-50 focus:border-red-400' : 'border-gray-100 focus:ring-4 focus:ring-blue-50 focus:border-blue-500',
                          ].join(' ')}
                          autoComplete="name"
                        />
                      }
                    />

                    <Field
                      label="Email"
                      required
                      icon={<Mail className="w-5 h-5" />}
                      error={touched.email ? errors.email : ''}
                      success={touched.email && !errors.email && values.email.trim().length > 0}
                      hint="We’ll send confirmation and updates to this address."
                      input={
                        <input
                          name="email"
                          type="email"
                          value={values.email}
                          onChange={(e) => updateValue('email', e.target.value)}
                          onBlur={() => setTouched((p) => ({ ...p, email: true }))}
                          placeholder="name@example.com"
                          className={[
                            'w-full pl-12 pr-12 py-4 rounded-2xl bg-gray-50 border outline-none transition text-base',
                            touched.email && errors.email ? 'border-red-200 focus:ring-4 focus:ring-red-50 focus:border-red-400' : 'border-gray-100 focus:ring-4 focus:ring-blue-50 focus:border-blue-500',
                          ].join(' ')}
                          autoComplete="email"
                          inputMode="email"
                        />
                      }
                    />

                    <Field
                      label="Phone"
                      required
                      icon={<Phone className="w-5 h-5" />}
                      error={touched.phone ? errors.phone : ''}
                      success={touched.phone && !errors.phone && values.phone.trim().length > 0}
                      hint="Include country code if possible (e.g., +251…)."
                      input={
                        <input
                          name="phone"
                          value={values.phone}
                          onChange={(e) => updateValue('phone', e.target.value)}
                          onBlur={() => setTouched((p) => ({ ...p, phone: true }))}
                          placeholder="+251 9xx xxx xxx"
                          className={[
                            'w-full pl-12 pr-12 py-4 rounded-2xl bg-gray-50 border outline-none transition text-base',
                            touched.phone && errors.phone ? 'border-red-200 focus:ring-4 focus:ring-red-50 focus:border-red-400' : 'border-gray-100 focus:ring-4 focus:ring-blue-50 focus:border-blue-500',
                          ].join(' ')}
                          autoComplete="tel"
                          inputMode="tel"
                        />
                      }
                    />
                  </div>
                </div>
              ) : null}

              {step === 2 ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                    <BookOpen className="w-5 h-5 text-blue-600" />
                    <h2 className="text-lg font-black text-gray-900">Academic Information</h2>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    <Field
                      label="Department"
                      required
                      icon={<BookOpen className="w-5 h-5" />}
                      error={touched.departmentId ? errors.departmentId : ''}
                      success={touched.departmentId && !errors.departmentId && values.departmentId}
                      hint={loadingDepartments ? 'Loading departments…' : 'Choose your department to filter programs.'}
                      input={
                        <select
                          name="departmentId"
                          value={values.departmentId}
                          onChange={(e) => updateValue('departmentId', e.target.value)}
                          onBlur={() => setTouched((p) => ({ ...p, departmentId: true }))}
                          className={[
                            'w-full pl-12 pr-12 py-4 rounded-2xl bg-gray-50 border outline-none transition text-base appearance-none',
                            touched.departmentId && errors.departmentId ? 'border-red-200 focus:ring-4 focus:ring-red-50 focus:border-red-400' : 'border-gray-100 focus:ring-4 focus:ring-blue-50 focus:border-blue-500',
                          ].join(' ')}
                          disabled={loadingDepartments}
                        >
                          <option value="">{loadingDepartments ? 'Loading…' : 'Select a department'}</option>
                          {departments.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name}
                            </option>
                          ))}
                        </select>
                      }
                    />

                    <Field
                      label="Program"
                      required
                      icon={<GraduationCap className="w-5 h-5" />}
                      error={touched.programId ? errors.programId : ''}
                      success={touched.programId && !errors.programId && values.programId}
                      hint={
                        !values.departmentId
                          ? 'Select a department first.'
                          : loadingPrograms
                            ? 'Loading programs…'
                            : programs.length
                              ? 'Pick the program you are registering for.'
                              : 'No programs found for this department.'
                      }
                      input={
                        <select
                          name="programId"
                          value={values.programId}
                          onChange={(e) => updateValue('programId', e.target.value)}
                          onBlur={() => setTouched((p) => ({ ...p, programId: true }))}
                          className={[
                            'w-full pl-12 pr-12 py-4 rounded-2xl bg-gray-50 border outline-none transition text-base appearance-none',
                            touched.programId && errors.programId ? 'border-red-200 focus:ring-4 focus:ring-red-50 focus:border-red-400' : 'border-gray-100 focus:ring-4 focus:ring-blue-50 focus:border-blue-500',
                          ].join(' ')}
                          disabled={!values.departmentId || loadingPrograms}
                        >
                          <option value="">
                            {!values.departmentId ? 'Select a department first' : loadingPrograms ? 'Loading…' : 'Select a program'}
                          </option>
                          {programs.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      }
                    />
                  </div>
                </div>
              ) : null}

              {step === 3 ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                    <CheckCircle2 className="w-5 h-5 text-blue-600" />
                    <h2 className="text-lg font-black text-gray-900">Review & Submit</h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                      <p className="text-xs font-black text-gray-400 uppercase tracking-wider">Personal</p>
                      <div className="mt-3 space-y-2">
                        <div>
                          <p className="text-[11px] text-gray-500 font-bold">Name</p>
                          <p className="text-sm font-black text-gray-900">{values.name || '—'}</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-gray-500 font-bold">Email</p>
                          <p className="text-sm font-black text-gray-900 break-words">{values.email || '—'}</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-gray-500 font-bold">Phone</p>
                          <p className="text-sm font-black text-gray-900">{values.phone || '—'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                      <p className="text-xs font-black text-gray-400 uppercase tracking-wider">Academic</p>
                      <div className="mt-3 space-y-2">
                        <div>
                          <p className="text-[11px] text-gray-500 font-bold">Department</p>
                          <p className="text-sm font-black text-gray-900">
                            {departments.find((d) => d.id === values.departmentId)?.name || '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] text-gray-500 font-bold">Program</p>
                          <p className="text-sm font-black text-gray-900">
                            {programs.find((p) => p.id === values.programId)?.name || '—'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {!step1Valid || !step2Valid ? (
                    <div className="rounded-2xl border border-amber-100 bg-amber-50 px-5 py-4 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-black text-amber-900">A few things need attention</p>
                        <p className="text-xs text-amber-800 mt-1">
                          Go back to fix the highlighted fields so we can submit your registration.
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={goBack}
                  disabled={step === 1}
                  className="sm:flex-1 bg-gray-100 text-gray-700 py-4 rounded-2xl font-black hover:bg-gray-200 transition disabled:opacity-50 disabled:hover:bg-gray-100 inline-flex items-center justify-center gap-2"
                >
                  <ChevronLeft className="w-5 h-5" />
                  Back
                </button>

                {step < 3 ? (
                  <button
                    type="button"
                    onClick={goNext}
                    className={[
                      'sm:flex-[2] py-4 rounded-2xl font-black transition inline-flex items-center justify-center gap-2 shadow-lg',
                      canContinue ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100' : 'bg-blue-300 text-white/80 cursor-not-allowed shadow-transparent',
                    ].join(' ')}
                  >
                    Continue
                    <ChevronRight className="w-5 h-5" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={submitting || !step1Valid || !step2Valid}
                    className="sm:flex-[2] bg-blue-600 text-white py-4 rounded-2xl font-black hover:bg-blue-700 transition inline-flex items-center justify-center gap-2 shadow-lg shadow-blue-100 disabled:opacity-50 disabled:hover:bg-blue-600"
                  >
                    {submitting ? (
                      <span className="flex items-center gap-2">
                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Submitting…
                      </span>
                    ) : (
                      'Submit Registration'
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
    </div>
  );

  if (inStudentPortal) {
    return (
      <StudentPortalLayout
        eyebrow="Student registration"
        title="Student Registration"
        subtitle="Add or confirm your personal and academic details"
      >
        <div className="max-w-3xl">{card}</div>
      </StudentPortalLayout>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl text-white shadow-xl shadow-blue-200 mb-5">
            <GraduationCap className="w-9 h-9" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Atlas Health College Portal</h1>
          <p className="mt-3 text-gray-600 text-base">Student Registration</p>
        </div>
        {card}
      </div>
    </div>
  );
}
