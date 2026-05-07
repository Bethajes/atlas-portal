import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { toast } from 'react-hot-toast';
import { ShieldCheck, CreditCard, Phone, Loader2, CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import StudentPortalLayout from '../components/StudentPortalLayout';
import { useAuth } from '../context/AuthContext';

/**
 * ArifPaymentPage handles the frontend flow for Awash Birr payments via ArifPay.
 * Features:
 * - Provider selection
 * - Phone number entry
 * - Payment initiation
 * - Real-time status polling
 * - Success/Failure/Expiration handling
 */
export default function ArifPaymentPage() {
  const [screen, setScreen] = useState('form'); // form | waiting | success | error
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState(1500);
  const [description, setDescription] = useState('Tuition fee payment');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [provider, setProvider] = useState('AWASH');
  const [paymentData, setPaymentData] = useState(null);
  const [status, setStatus] = useState(null);
  const [retryVisible, setRetryVisible] = useState(false);
  const [phoneError, setPhoneError] = useState('');

  const navigate = useNavigate();
  const { user } = useAuth();
  const pollingRef = useRef(null);
  const retryTimerRef = useRef(null);

  const studentName = useMemo(() => {
    const name = user?.name?.trim();
    if (name) return name;
    const fallback = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
    return fallback || 'Student';
  }, [user]);

  const normalizedPhone = useMemo(() => {
    const raw = (phoneNumber || '').trim();
    const cleaned = raw.replace(/[^\d+]/g, '');
    if (!cleaned) return '';
    if (cleaned.startsWith('+251')) return cleaned;
    if (cleaned.startsWith('251')) return `+${cleaned}`;
    if (cleaned.startsWith('0')) return `+251${cleaned.slice(1)}`;
    return cleaned;
  }, [phoneNumber]);

  const isPhoneValid = useMemo(() => {
    return /^\+2519\d{8}$/.test(normalizedPhone);
  }, [normalizedPhone]);

  useEffect(() => {
    if (!phoneNumber) {
      setPhoneError('');
      return;
    }
    setPhoneError(isPhoneValid ? '' : 'Enter a valid Ethiopian phone number (e.g. 0911223344)');
  }, [phoneNumber, isPhoneValid]);

  useEffect(() => {
    let isMounted = true;
    api.get('/payments/my-invoices')
      .then((res) => {
        if (!isMounted) return;
        const invoices = res.data?.invoices || [];
        const candidate = invoices.find((inv) => ['PENDING', 'OVERDUE'].includes(inv.status)) || invoices[0];
        if (!candidate) return;
        const due = Number(candidate.dueAmount ?? candidate.totalAmount);
        if (Number.isFinite(due) && due > 0) setAmount(due);
        const suffix = candidate.semesterName ? ` — ${candidate.semesterName}` : '';
        setDescription(`Tuition fee payment${suffix}`);
      })
      .catch((error) => {
        if (import.meta.env.DEV) console.error('Invoice fetch failed:', error);
      });

    return () => { isMounted = false; };
  }, []);

  // Poll for status every 3 seconds when waiting for confirmation
  useEffect(() => {
    const isTerminal = status === 'SUCCESS' || status === 'FAILED' || status === 'EXPIRED';
    if (screen !== 'waiting' || !paymentData?.reference || isTerminal) return;

    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      try {
        const res = await api.get(`/pay/status/${paymentData.reference}`);
        const currentStatus = res.data?.data?.status;

        if (!currentStatus) return;
        setStatus(currentStatus);

        if (currentStatus === 'SUCCESS') {
          toast.success('Payment Successful');
          setScreen('success');
        }
        if (currentStatus === 'FAILED' || currentStatus === 'EXPIRED') {
          toast.error(currentStatus === 'EXPIRED' ? 'Payment Expired' : 'Payment Failed');
          setScreen('error');
        }
      } catch (error) {
        if (import.meta.env.DEV) console.error('Payment status polling failed:', error);
      }
    }, 3000);

    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    retryTimerRef.current = setTimeout(() => setRetryVisible(true), 12000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      pollingRef.current = null;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    };
  }, [screen, paymentData?.reference, status]);

  const handleInitiate = async () => {
    if (!isPhoneValid) {
      setPhoneError('Enter a valid Ethiopian phone number (e.g. 0911223344)');
      return toast.error('Please enter a valid phone number');
    }
    
    setLoading(true);
    try {
      const res = await api.post('/pay/initiate', {
        amount,
        phoneNumber: normalizedPhone,
        provider
      });
      setPaymentData(res.data.data);
      setStatus(res.data?.data?.status || 'PENDING');
      setRetryVisible(false);
      setScreen('waiting');
      toast.success('Payment request sent');
    } catch (error) {
      setScreen('error');
      toast.error(error.response?.data?.message || 'Failed to initiate payment');
    } finally {
      setLoading(false);
    }
  };

  const resetPayment = () => {
    setScreen('form');
    setPaymentData(null);
    setStatus(null);
    setRetryVisible(false);
  };

  return (
    <StudentPortalLayout 
      title="Digital Payment" 
      subtitle="Complete your payment using Awash Birr"
    >
      <div className="max-w-3xl mx-auto mt-8">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 sm:p-8 border-b border-gray-100 bg-gradient-to-b from-gray-50 to-white">
            <div className="flex items-start justify-between gap-6">
              <div className="space-y-1">
                <p className="text-xs text-gray-400 uppercase tracking-wider">Payment Summary</p>
                <p className="text-lg font-semibold text-gray-900">{studentName}</p>
                <p className="text-sm text-gray-500">{description}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 uppercase tracking-wider">Amount</p>
                <p className="text-2xl font-black text-gray-900">ETB {Number(amount || 0).toLocaleString()}</p>
                <div className="mt-2 inline-flex items-center gap-2 text-xs text-gray-500 bg-white/70 border border-gray-200 px-2.5 py-1 rounded-full">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Secured by ArifPay
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            {screen === 'form' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-gray-900">Payment Method</h2>
                    <span className="text-xs text-gray-400">Step 1 of 2</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setProvider('AWASH')}
                    className={`w-full text-left p-4 rounded-2xl border transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      provider === 'AWASH'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                        <CreditCard className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900">Awash Birr</p>
                        <p className="text-sm text-gray-500">Mobile prompt → confirm with PIN</p>
                      </div>
                    </div>
                  </button>

                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div className="text-sm text-gray-600 leading-relaxed">
                        <p className="font-semibold text-gray-800">Before you pay</p>
                        <p className="text-gray-500">
                          Make sure your Awash Birr app is installed and your phone number is linked to your wallet.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-gray-900">Phone Number</h2>
                    <span className="text-xs text-gray-400">Step 2 of 2</span>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Awash Birr Phone</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        inputMode="tel"
                        autoComplete="tel"
                        type="tel"
                        placeholder="0911223344"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className={`w-full pl-12 pr-4 py-3.5 rounded-2xl border focus:ring-2 outline-none transition-all ${
                          phoneError ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-blue-200'
                        }`}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <p className={`text-xs ${phoneError ? 'text-red-600' : 'text-gray-400'}`}>
                        {phoneError || 'We’ll send a payment request to this number.'}
                      </p>
                      {isPhoneValid && (
                        <span className="text-xs text-gray-400 font-mono">{normalizedPhone}</span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleInitiate}
                    disabled={loading || !isPhoneValid}
                    className="w-full bg-blue-600 text-white py-4 rounded-2xl font-semibold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-100 disabled:opacity-50 disabled:hover:bg-blue-600"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                    {loading ? 'Processing…' : 'Pay Now'}
                  </button>

                  <p className="text-xs text-gray-400 leading-relaxed">
                    By clicking Pay Now, you’ll receive a secure Awash Birr prompt. Atlas Health College Portal never sees your PIN.
                  </p>
                </div>
              </div>
            )}

            {screen === 'waiting' && (
              <div className="text-center space-y-6">
                <div className="relative w-28 h-28 mx-auto">
                  <div className="absolute inset-0 border-4 border-blue-50 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-10 h-10 text-blue-600" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h2 className="text-xl font-semibold text-gray-900">⏳ Waiting for confirmation...</h2>
                  <p className="text-sm text-gray-600">📲 Check your Awash Birr app and enter your PIN</p>
                  <p className="text-sm text-gray-500">
                    Sent to <span className="font-semibold text-gray-800">{normalizedPhone || phoneNumber}</span>
                  </p>
                </div>

                <div className="bg-blue-50 p-5 rounded-2xl text-left border border-blue-100 space-y-3">
                  <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 shrink-0" />
                    <div className="text-sm text-blue-900 space-y-2 leading-relaxed">
                      <p className="font-semibold">What to do</p>
                      <ol className="list-decimal list-inside space-y-1 text-blue-800">
                        <li>Open Awash Birr</li>
                        <li>Find the payment request from Atlas Health College</li>
                        <li>Confirm with your PIN</li>
                      </ol>
                      <p className="text-xs text-blue-700">This page checks status automatically every 3 seconds.</p>
                    </div>
                  </div>
                </div>

                {retryVisible && (
                  <button
                    type="button"
                    onClick={handleInitiate}
                    disabled={loading || !isPhoneValid}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Retry
                  </button>
                )}

                <div className="pt-4 border-t border-gray-100">
                  <p className="text-[11px] text-gray-400 uppercase tracking-widest font-mono">
                    Ref: {paymentData?.reference}
                  </p>
                </div>
              </div>
            )}

            {screen === 'success' && (
              <div className="text-center space-y-6 py-2">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-gray-900">Payment Successful</h2>
                  <p className="text-gray-500">Your transaction has been confirmed.</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl text-sm space-y-2 border border-gray-100">
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-400">Transaction Reference</span>
                    <span className="font-mono font-medium text-gray-800">{paymentData?.reference}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-400">Amount</span>
                    <span className="font-semibold text-gray-800">ETB {Number(amount || 0).toLocaleString()}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="w-full bg-gray-900 text-white py-4 rounded-2xl font-semibold hover:bg-gray-800 transition"
                >
                  Back to Dashboard
                </button>
              </div>
            )}

            {screen === 'error' && (
              <div className="text-center space-y-6 py-2">
                <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
                  <XCircle className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {status === 'EXPIRED' ? 'Payment Expired' : 'Payment Failed'}
                  </h2>
                  <p className="text-gray-500">
                    If money was deducted but status didn’t update, keep the reference and contact support.
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl text-sm space-y-2 border border-gray-100">
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-400">Reference</span>
                    <span className="font-mono font-medium text-gray-800">{paymentData?.reference || '—'}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={resetPayment}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-semibold hover:bg-blue-700 transition"
                >
                  Retry Payment
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </StudentPortalLayout>
  );
}
