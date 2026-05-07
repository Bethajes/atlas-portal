import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import { 
  CreditCard, 
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
  User,
  AlertCircle,
  DollarSign,
  Receipt,
  MoreVertical,
  Check,
  Ban,
  Download,
  ArrowUpRight
} from 'lucide-react';

const RegistrarPayments = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialStatus = searchParams.get('status') || 'PENDING';

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [filterStatus, setFilterStatus] = useState(initialStatus);
  const [searchTerm, setSearchTerm] = useState('');
  const [unpaidStudents, setUnpaidStudents] = useState([]);

  useEffect(() => {
    if (filterStatus === 'UNPAID') {
      fetchUnpaidStudents();
    } else {
      fetchPayments();
    }
  }, [filterStatus]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/payments?status=${filterStatus}`);
      setPayments(response.data.payments || []);
    } catch (error) {
      console.error('Failed to fetch payments:', error);
      showMessage('error', 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const fetchUnpaidStudents = async () => {
    try {
      setLoading(true);
      const response = await api.get('/registrar/students/unpaid');
      setUnpaidStudents(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch unpaid students:', error);
      showMessage('error', 'Failed to load unpaid students');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleVerify = async (id, status) => {
    const action = status === 'APPROVED' ? 'approve' : 'reject';
    if (!window.confirm(`Are you sure you want to ${action} this payment receipt?`)) return;

    setProcessing(true);
    try {
      await api.put(`/registrar/payments/${id}/verify`, { status });
      showMessage('success', `Payment ${status.toLowerCase()} successfully!`);
      setSelectedPayment(null);
      fetchPayments();
    } catch (error) {
      showMessage('error', error.response?.data?.message || 'Failed to verify payment');
    } finally {
      setProcessing(false);
    }
  };

  const filteredPayments = payments.filter(p => 
    p.student?.user?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.referenceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.student?.studentId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUnpaidStudents = unpaidStudents.filter(s =>
    s.user?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.studentId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && payments.length === 0 && unpaidStudents.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 text-gray-500 mb-2 cursor-pointer hover:text-blue-600 transition" onClick={() => navigate('/dashboard/registrar')}>
              <ChevronLeft className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Registrar Dashboard</span>
            </div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-3">
              <CreditCard className="w-8 h-8 text-blue-600" />
              Payment Verifications
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search ref or student..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-4 focus:ring-blue-50 outline-none transition-all w-64 shadow-sm"
              />
            </div>
            <div className="bg-white p-1 rounded-xl border border-gray-200 flex shadow-sm">
              {['PENDING', 'SUCCESSFUL', 'FAILED', 'UNPAID'].map((status) => (
                <button
                  key={status}
                  onClick={() => {
                    setFilterStatus(status);
                    setSelectedPayment(null);
                  }}
                  className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all ${
                    filterStatus === status 
                      ? 'bg-blue-600 text-white shadow-md' 
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
          
          {/* Payments List */}
          <div className="lg:col-span-1 space-y-4 overflow-y-auto max-h-[calc(100vh-250px)] pr-2 custom-scrollbar">
            {filterStatus === 'UNPAID' ? (
              filteredUnpaidStudents.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 border border-dashed border-gray-200 text-center">
                  <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-400 font-medium">No unpaid students found.</p>
                </div>
              ) : (
                filteredUnpaidStudents.map((student) => (
                  <div 
                    key={student.id}
                    onClick={() => setSelectedPayment({ ...student, isUnpaidStudent: true })}
                    className={`bg-white p-5 rounded-2xl border transition-all cursor-pointer group hover:shadow-lg ${
                      selectedPayment?.id === student.id ? 'border-blue-600 ring-4 ring-blue-50 shadow-md' : 'border-gray-100'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-[10px] font-black text-red-600 uppercase tracking-widest bg-red-50 px-2 py-1 rounded">
                        UNPAID
                      </span>
                      <span className="text-[10px] text-gray-400 font-bold">
                        {student.program?.code}
                      </span>
                    </div>
                    <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition">{student.user?.name}</h3>
                    <div className="flex items-center justify-between mt-4 border-t border-gray-50 pt-3">
                      <span className="text-sm font-black text-gray-900">{student.studentId}</span>
                      <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded bg-red-50 text-red-600">
                        {student.invoice?.[0]?.status || 'NO INVOICE'}
                      </span>
                    </div>
                  </div>
                ))
              )
            ) : (
              filteredPayments.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 border border-dashed border-gray-200 text-center">
                  <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-400 font-medium">No {filterStatus.toLowerCase()} payments found.</p>
                </div>
              ) : (
                filteredPayments.map((payment) => (
                  <div 
                    key={payment.id}
                    onClick={() => setSelectedPayment(payment)}
                    className={`bg-white p-5 rounded-2xl border transition-all cursor-pointer group hover:shadow-lg ${
                      selectedPayment?.id === payment.id ? 'border-blue-600 ring-4 ring-blue-50 shadow-md' : 'border-gray-100'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-1 rounded">
                        {payment.referenceNumber}
                      </span>
                      <span className="text-[10px] text-gray-400 font-bold">
                        {new Date(payment.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition">{payment.student?.user?.name}</h3>
                    <div className="flex items-center justify-between mt-4 border-t border-gray-50 pt-3">
                      <span className="text-sm font-black text-gray-900">{payment.amount.toLocaleString()} ETB</span>
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded ${
                        payment.status === 'SUCCESSFUL' ? 'bg-emerald-50 text-emerald-600' : 
                        payment.status === 'FAILED' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                      }`}>
                        {payment.status}
                      </span>
                    </div>
                  </div>
                ))
              )
            )}
          </div>

          {/* Details Panel */}
          <div className="lg:col-span-2">
            {selectedPayment ? (
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                <div className="bg-gradient-to-r from-blue-700 to-indigo-800 p-8 text-white">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-xl">
                        <User className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-black">{selectedPayment.isUnpaidStudent ? selectedPayment.user?.name : selectedPayment.student?.user?.name}</h2>
                        <p className="text-blue-100 font-medium flex items-center gap-2 mt-1">
                          ID: {selectedPayment.isUnpaidStudent ? selectedPayment.studentId : selectedPayment.student?.studentId} • {selectedPayment.isUnpaidStudent ? 'NO RECENT PAYMENT' : selectedPayment.paymentMethod}
                        </p>
                      </div>
                    </div>
                    {selectedPayment.status === 'PENDING' && !selectedPayment.isUnpaidStudent && (
                      <div className="flex gap-3">
                        <button 
                          onClick={() => handleVerify(selectedPayment.id, 'REJECTED')}
                          disabled={processing}
                          className="bg-white/10 hover:bg-red-500 hover:text-white border border-white/20 px-5 py-2.5 rounded-xl text-sm font-bold transition flex items-center gap-2"
                        >
                          <Ban className="w-4 h-4" /> Reject
                        </button>
                        <button 
                          onClick={() => handleVerify(selectedPayment.id, 'APPROVED')}
                          disabled={processing}
                          className="bg-white text-blue-700 hover:bg-blue-50 px-6 py-2.5 rounded-xl text-sm font-black transition flex items-center gap-2 shadow-lg"
                        >
                          <Check className="w-4 h-4" /> Verify Payment
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
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">
                          {selectedPayment.isUnpaidStudent ? 'Unpaid Status' : 'Payment Summary'}
                        </h4>
                        <div className="bg-gray-50 rounded-2xl p-6 space-y-4 border border-gray-100">
                          {selectedPayment.isUnpaidStudent ? (
                            <>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-500 font-medium">Invoice Amount</span>
                                <span className="text-xl font-black text-red-600">
                                  {selectedPayment.invoice?.[0]?.totalAmount?.toLocaleString() || '0'} ETB
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500">Amount Due</span>
                                <span className="font-bold text-red-700">
                                  {selectedPayment.invoice?.[0]?.dueAmount?.toLocaleString() || '0'} ETB
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500">Registration Status</span>
                                <span className="font-bold text-gray-900">
                                  {selectedPayment.semesterRegistration?.[0]?.status || 'NOT STARTED'}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500">Invoice No.</span>
                                <span className="font-bold text-gray-900">
                                  {selectedPayment.invoice?.[0]?.invoiceNumber || 'N/A'}
                                </span>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-500 font-medium">Amount Paid</span>
                                <span className="text-xl font-black text-blue-600">{selectedPayment.amount.toLocaleString()} ETB</span>
                              </div>
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500">Method</span>
                                <span className="font-bold text-gray-900">{selectedPayment.paymentMethod}</span>
                              </div>
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500">Reference No.</span>
                                <span className="font-bold text-gray-900">{selectedPayment.referenceNumber}</span>
                              </div>
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500">Date</span>
                                <span className="font-bold text-gray-900">{new Date(selectedPayment.createdAt).toLocaleString()}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {selectedPayment.notes && (
                        <div>
                          <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Payment Notes</h4>
                          <p className="text-sm text-gray-600 italic bg-amber-50 p-4 rounded-2xl border border-amber-100">
                            "{selectedPayment.notes}"
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Receipt Image */}
                    <div>
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">
                        {selectedPayment.isUnpaidStudent ? 'Pending Online Transactions' : 'Proof Document'}
                      </h4>
                      {selectedPayment.isUnpaidStudent ? (
                        <div className="space-y-4">
                          {selectedPayment.studentPayments?.length > 0 ? (
                            selectedPayment.studentPayments.map((sp) => (
                              <div key={sp.reference} className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="text-xs font-black text-amber-700 uppercase tracking-wider mb-1">CHAPA REFERENCE</p>
                                    <p className="text-sm font-mono font-bold text-gray-900">{sp.reference}</p>
                                  </div>
                                  <span className="text-[10px] font-black bg-amber-200 text-amber-800 px-2 py-0.5 rounded">PENDING</span>
                                </div>
                                <div className="mt-3 pt-3 border-t border-amber-100 flex justify-between text-sm">
                                  <span className="text-amber-600">Amount: {sp.amount.toLocaleString()} ETB</span>
                                  <span className="text-amber-400">{new Date(sp.createdAt).toLocaleDateString()}</span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="bg-gray-50 rounded-3xl p-12 border border-dashed border-gray-200 flex flex-col items-center justify-center text-center">
                              <AlertCircle className="w-12 h-12 text-gray-300 mb-4" />
                              <p className="text-gray-400 font-medium">No online payment attempts found for this student.</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        selectedPayment.proofUrl ? (
                        <div className="group relative rounded-3xl overflow-hidden border border-gray-200 shadow-sm bg-gray-100 aspect-[4/5]">
                          <img 
                            src={`${import.meta.env.VITE_API_URL}${selectedPayment.proofUrl}`} 
                            alt="Payment Proof" 
                            className="w-full h-full object-contain"
                          />
                          <a 
                            href={`${import.meta.env.VITE_API_URL}${selectedPayment.proofUrl}`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
                          >
                            <div className="bg-white text-gray-900 px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2">
                              <ExternalLink className="w-4 h-4" /> Open Full Image
                            </div>
                          </a>
                        </div>
                      ) : (
                        <div className="bg-gray-50 rounded-3xl border border-dashed border-gray-200 p-12 text-center">
                          <Receipt className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                          <p className="text-gray-400 text-sm font-medium">No receipt image uploaded.</p>
                          <p className="text-[10px] text-gray-300 mt-1 uppercase font-black">Manual entry likely</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-dashed border-gray-200 p-24 text-center">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <DollarSign className="w-10 h-10 text-gray-300" />
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-2">Select a Payment</h3>
                <p className="text-gray-400 max-w-xs mx-auto text-sm font-medium">Choose a payment from the list to review the proof and verify the transaction.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegistrarPayments;
