import { useEffect, useState, useRef } from 'react';
import api from '../api/axios';
import { CheckCircle2, CreditCard, RefreshCw, ExternalLink, AlertCircle } from 'lucide-react';
import StudentPortalLayout from '../components/StudentPortalLayout';
import { useSearchParams } from 'react-router-dom';

export default function ChapaPaymentPage() {
  const [searchParams] = useSearchParams();
  const txRefFromUrl = searchParams.get('tx_ref');

  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null); // 'PENDING', 'SUCCESS', 'FAILED'
  const [amount, setAmount] = useState(1000); // Default or fetch from API
  const [txRef, setTxRef] = useState(txRefFromUrl || null);
  const [error, setError] = useState('');
  const pollingRef = useRef(null);

  useEffect(() => {
    if (txRefFromUrl) {
      setTxRef(txRefFromUrl);
      startPolling(txRefFromUrl);
    }
    return () => stopPolling();
  }, [txRefFromUrl]);

  const startPolling = (ref) => {
    stopPolling();
    setProcessing(true);
    pollingRef.current = setInterval(async () => {
      try {
        const res = await api.get(`/pay/status/${ref}`);
        if (res.data.success) {
          setPaymentStatus(res.data.status);
          if (res.data.status === 'SUCCESS' || res.data.status === 'FAILED') {
            stopPolling();
            setProcessing(false);
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 3000);
  };

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const handleInitializePayment = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/pay/initialize', { amount });
      if (res.data.success && res.data.checkout_url) {
        setTxRef(res.data.tx_ref);
        // Redirect to Chapa
        window.location.href = res.data.checkout_url;
      } else {
        setError('Failed to initialize payment. Please try again.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <StudentPortalLayout
      title="Tuition Payment"
      subtitle="Securely pay your tuition fees using Chapa (Telebirr, CBE, etc.)"
    >
      <div className="max-w-md mx-auto mt-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {!txRef && !paymentStatus && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Pay Tuition Fees</h3>
                <p className="text-sm text-gray-500">Fast and secure payment via Chapa</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">Total Amount</p>
                <p className="text-2xl font-black text-gray-900">ETB {amount.toLocaleString()}</p>
              </div>

              <button
                onClick={handleInitializePayment}
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <ExternalLink className="w-5 h-5" />}
                {loading ? 'Processing...' : 'Pay with Chapa'}
              </button>
              
              <p className="text-center text-xs text-gray-400 mt-4">
                You will be redirected to Chapa's secure checkout page.
              </p>
            </div>
          </div>
        )}

        {(processing || (txRef && !paymentStatus)) && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm text-center">
            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <RefreshCw className="w-8 h-8 animate-spin" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Waiting for Payment...</h3>
            <p className="text-gray-500 mb-6">
              Please complete your payment in the Chapa window. This page will update automatically.
            </p>
            <div className="text-xs text-gray-400 font-mono bg-gray-50 p-2 rounded">
              Ref: {txRef}
            </div>
          </div>
        )}

        {paymentStatus === 'SUCCESS' && (
          <div className="bg-white rounded-2xl border border-green-200 p-8 shadow-sm text-center">
            <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Payment Successful!</h3>
            <p className="text-gray-500 mb-6">
              Your tuition fee has been successfully paid. You can now proceed to course registration.
            </p>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl transition-all"
            >
              Go to Dashboard
            </button>
          </div>
        )}

        {paymentStatus === 'FAILED' && (
          <div className="bg-white rounded-2xl border border-red-200 p-8 shadow-sm text-center">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Payment Failed</h3>
            <p className="text-gray-500 mb-6">
              We couldn't verify your payment. If the money was deducted, please contact support.
            </p>
            <button
              onClick={() => {
                setTxRef(null);
                setPaymentStatus(null);
                setError('');
              }}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold py-4 rounded-xl transition-all"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </StudentPortalLayout>
  );
}
