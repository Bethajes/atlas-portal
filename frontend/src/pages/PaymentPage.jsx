import { useEffect, useState } from 'react';
import api from '../api/axios';
import { CheckCircle2, CreditCard, ReceiptText, RefreshCw, WalletCards } from 'lucide-react';
import StudentPortalLayout from '../components/StudentPortalLayout';

const StatusBadge = ({ status }) => {
  const map = {
    PENDING:    'bg-yellow-100 text-yellow-700',
    SUCCESSFUL: 'bg-green-100 text-green-700',
    FAILED:     'bg-red-100 text-red-600',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status] || 'bg-gray-100 text-gray-400'}`}>
      {status}
    </span>
  );
};

export default function PaymentPage() {
  const [payments, setPayments]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [activeSemester, setActiveSemester] = useState(null);
  const [pendingPayment, setPendingPayment] = useState(null);
  const [step, setStep]               = useState('overview'); // overview | initiated | verify
  const [bankTxId, setBankTxId]       = useState('');
  const [refNumber, setRefNumber]     = useState('');
  const [processing, setProcessing]   = useState(false);
  const [result, setResult]           = useState(null);
  const [error, setError]             = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/payments/my-payments'),
      api.get('/academic/semesters/active').catch(() => ({ data: { semester: null } })),
    ]).then(([pRes, sRes]) => {
      setPayments(pRes.data.payments || []);
      setActiveSemester(sRes.data.semester);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // ─── INITIATE PAYMENT ──────────────────────────────────────
  const handleInitiate = async () => {
    if (!activeSemester) return setError('No active semester found');
    setProcessing(true);
    setError('');
    try {
      const res = await api.post('/payments/initiate', {
        semesterId: activeSemester.id,
      });
      setPendingPayment(res.data.payment);
      setRefNumber(res.data.payment.referenceNumber);
      setStep('initiated');
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to initiate payment');
    } finally { setProcessing(false); }
  };

  // ─── VERIFY PAYMENT ───────────────────────────────────────
  const handleVerify = async () => {
    if (!bankTxId) return setError('Please enter your bank transaction ID');
    setProcessing(true);
    setError('');
    try {
      const res = await api.post('/payments/verify', {
        referenceNumber: refNumber,
        bankTransactionId: bankTxId,
      });
      setResult(res.data);
      setStep('done');
      // Refresh payment list
      const updated = await api.get('/payments/my-payments');
      setPayments(updated.data.payments || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Verification failed');
      if (e.response?.data?.tip) setError(
        `${e.response.data.message} — ${e.response.data.tip}`
      );
    } finally { setProcessing(false); }
  };

  const hasPaidThisSemester = payments.some(
    p => p.status === 'SUCCESSFUL' &&
    p.invoice?.semester?.name === activeSemester?.name
  );

  return (
    <StudentPortalLayout
      title="Tuition payment"
      subtitle="Pay via Awash Bank or Telebirr using your reference number"
    >
      <div className="max-w-4xl space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Active semester info */}
        {activeSemester && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Current semester</p>
              <p className="font-semibold text-gray-800">{activeSemester.name}</p>
              </div>
            </div>
            {hasPaidThisSemester ? (
              <span className="inline-flex items-center justify-center gap-2 text-sm bg-green-100 text-green-700 px-4 py-2 rounded-lg font-medium">
                <CheckCircle2 className="w-4 h-4" />
                Paid
              </span>
            ) : (
              <span className="inline-flex items-center justify-center gap-2 text-sm bg-yellow-100 text-yellow-700 px-4 py-2 rounded-lg font-medium">
                <WalletCards className="w-4 h-4" />
                Payment required
              </span>
            )}
          </div>
        )}

        {/* ── STEP: OVERVIEW ── */}
        {step === 'overview' && !hasPaidThisSemester && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
              <h2 className="font-medium text-gray-700 text-sm">How to pay</h2>
            </div>
            <div className="p-5 space-y-4">
              {[
                ['1', 'Click "Generate reference number" below'],
                ['2', 'Open Awash Bank or Telebirr app on your phone'],
                ['3', 'Select "School / Education Payment" → New Generation University College'],
                ['4', 'Enter your reference number and complete the payment'],
                ['5', 'Come back here and click "Verify payment" with your transaction ID'],
              ].map(([num, text]) => (
                <div key={num} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {num}
                  </span>
                  <p className="text-sm text-gray-600">{text}</p>
                </div>
              ))}

              <div className="pt-2">
                <div className="bg-brand-50 border border-brand-100 rounded-lg p-3 mb-4">
                  <p className="text-xs text-brand-600 font-medium mb-1">Demo mode — test transaction IDs</p>
                  <p className="text-xs text-brand-500 font-mono">AWB-12345, TLB-99999, AWB-54321</p>
                  <p className="text-xs text-blue-400 mt-1">Or any format: AWB-XXXXX or TLB-XXXXX</p>
                </div>
                <button
                  onClick={handleInitiate}
                  disabled={processing || !activeSemester}
                  className="w-full inline-flex items-center justify-center gap-2 bg-slate-800 text-white rounded-lg py-3 text-sm font-medium hover:bg-slate-700 disabled:opacity-50"
                >
                  {processing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ReceiptText className="w-4 h-4" />}
                  {processing ? 'Generating...' : 'Generate reference number'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP: INITIATED — show reference number ── */}
        {step === 'initiated' && pendingPayment && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
              <h2 className="font-medium text-gray-700 text-sm">Your reference number</h2>
            </div>
            <div className="p-5 space-y-5">
              {/* Reference number display */}
              <div className="text-center py-6 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Reference number</p>
                <p className="text-4xl font-bold text-gray-800 font-mono tracking-wider">
                  {pendingPayment.referenceNumber}
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  Amount: <span className="font-semibold text-gray-700">
                    ETB {pendingPayment.amount?.toLocaleString()}
                  </span>
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                <p className="text-xs text-amber-700 font-medium">
                  Use this number at Awash Bank or Telebirr to complete your payment.
                  Then come back and verify below.
                </p>
              </div>

              {/* Verify section */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700">
                  Already paid? Enter your bank transaction ID:
                </p>
                <input
                  type="text"
                  placeholder="e.g. AWB-12345 or TLB-99999"
                  value={bankTxId}
                  onChange={e => setBankTxId(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-400 font-mono"
                />
                <button
                  onClick={handleVerify}
                  disabled={processing || !bankTxId}
                  className="w-full bg-green-600 text-white rounded-lg py-3 text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  {processing ? 'Verifying with bank...' : 'Verify payment'}
                </button>
                <button
                  onClick={() => setStep('overview')}
                  className="w-full text-sm text-gray-400 hover:text-gray-600 py-2"
                >
                  Back
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP: DONE — success ── */}
        {step === 'done' && result && (
          <div className="bg-white rounded-2xl border border-green-200 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-green-100 bg-green-50">
              <h2 className="font-medium text-green-700 text-sm">Payment verified</h2>
            </div>
            <div className="p-5 space-y-4">
              <div className="text-center py-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-green-600 text-2xl">✓</span>
                </div>
                <p className="font-semibold text-gray-800">Payment confirmed</p>
                <p className="text-sm text-gray-400 mt-1">
                  You can now register for courses this semester
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Receipt number</span>
                  <span className="font-mono font-medium text-gray-700">
                    {result.receipt?.receiptNumber}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Reference</span>
                  <span className="font-mono text-gray-700">{result.receipt?.referenceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Bank transaction</span>
                  <span className="font-mono text-gray-700">{result.receipt?.bankTransactionId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Amount paid</span>
                  <span className="font-semibold text-green-600">
                    ETB {result.receipt?.amount?.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── PAYMENT HISTORY ── */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <h2 className="font-medium text-gray-700 text-sm">Payment history</h2>
          </div>
          {loading ? (
            <p className="text-center text-gray-400 text-sm py-8">Loading...</p>
          ) : payments.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">No payment history yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
                    <th className="text-left px-5 py-2 font-medium">Reference</th>
                    <th className="text-left px-3 py-2 font-medium">Semester</th>
                    <th className="text-center px-3 py-2 font-medium">Amount</th>
                    <th className="text-left px-3 py-2 font-medium">Bank TX ID</th>
                    <th className="text-center px-3 py-2 font-medium">Status</th>
                    <th className="text-center px-3 py-2 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-5 py-3 font-mono text-xs text-gray-700">
                        {p.referenceNumber}
                      </td>
                      <td className="px-3 py-3 text-gray-500 text-xs">
                        {p.invoice?.semester?.name ?? '—'}
                      </td>
                      <td className="text-center px-3 py-3 font-medium text-gray-700">
                        ETB {p.amount?.toLocaleString()}
                      </td>
                      <td className="px-3 py-3 font-mono text-xs text-gray-400">
                        {p.bankTransactionId ?? '—'}
                      </td>
                      <td className="text-center px-3 py-3">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="text-center px-3 py-3 text-xs text-gray-400">
                        {p.paymentDate
                          ? new Date(p.paymentDate).toLocaleDateString()
                          : new Date(p.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </StudentPortalLayout>
  );
}
