import { X, Mail, Phone, MapPin, GraduationCap, BookOpen, Award, DollarSign, Calendar, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const StatusBadge = ({ status }) => {
  const map = {
    ENROLLED:  'bg-brand-50 text-brand-600 border-brand-200',
    COMPLETED: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    FAILED:    'bg-red-50 text-red-600 border-red-200',
    DROPPED:   'bg-gray-50 text-gray-400 border-gray-200',
  };
  return (
    <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider border ${map[status] || 'bg-gray-50 text-gray-400 border-gray-200'}`}>
      {status}
    </span>
  );
};

const PaymentBadge = ({ payment }) => {
  const status = String(payment?.status || '').toUpperCase();
  const paid = payment?.isPaid || ['APPROVED', 'PAID', 'SUCCESS', 'SUCCESSFUL'].includes(status);
  
  if (paid) {
    return <span className="text-xs px-3 py-1 rounded-full font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">Paid</span>;
  }
  if (['OVERDUE', 'FAILED', 'REJECTED', 'EXPIRED'].includes(status)) {
    return <span className="text-xs px-3 py-1 rounded-full font-bold bg-red-50 text-red-600 border border-red-200">{status}</span>;
  }
  if (['PENDING', 'PROCESSING', 'SUBMITTED'].includes(status)) {
    return <span className="text-xs px-3 py-1 rounded-full font-bold bg-amber-50 text-amber-600 border border-amber-200">{status}</span>;
  }
  return <span className="text-xs px-3 py-1 rounded-full font-bold bg-gray-50 text-gray-400 border border-gray-200">Unknown</span>;
};

export default function StudentProfileModal({ studentData, onClose, attendancePercent }) {
  if (!studentData) return null;

  const { student, sections = [] } = studentData;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-2xl">
                {student?.name?.charAt(0) || 'S'}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{student?.name || 'Unknown Student'}</h3>
                <p className="text-indigo-200 text-sm mt-0.5">{student?.studentId || 'N/A'}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-100px)] p-6 space-y-6">
            
            {/* Personal Information */}
            <div>
              <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-indigo-600" />
                Personal Information
              </h4>
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Email</p>
                    <p className="text-sm text-gray-900 font-semibold">{student?.institutionalEmail || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <BookOpen className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Program</p>
                    <p className="text-sm text-gray-900 font-semibold">{student?.program?.name || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Department</p>
                    <p className="text-sm text-gray-900 font-semibold">{student?.department?.name || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Academic Performance */}
            <div>
              <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                Academic Performance
              </h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-indigo-50 rounded-xl p-4 text-center border border-indigo-100">
                  <Award className="w-5 h-5 text-indigo-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-indigo-900">
                    {student?.cumulativeGPA != null ? Number(student.cumulativeGPA).toFixed(2) : 'N/A'}
                  </p>
                  <p className="text-xs text-indigo-600 font-medium mt-1">Cumulative GPA</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-4 text-center border border-emerald-100">
                  <Calendar className="w-5 h-5 text-emerald-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-emerald-900">
                    {attendancePercent != null ? `${Math.round(attendancePercent)}%` : 'N/A'}
                  </p>
                  <p className="text-xs text-emerald-600 font-medium mt-1">Attendance</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-4 text-center border border-amber-100">
                  <DollarSign className="w-5 h-5 text-amber-600 mx-auto mb-2" />
                  <PaymentBadge payment={student?.latestPayment} />
                  <p className="text-xs text-amber-600 font-medium mt-1">Payment Status</p>
                </div>
              </div>
            </div>

            {/* Enrolled Sections */}
            <div>
              <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                Enrolled Sections ({sections.length})
              </h4>
              {sections.length === 0 ? (
                <div className="bg-gray-50 rounded-xl p-8 text-center">
                  <p className="text-sm text-gray-400">No sections found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sections.map((section, idx) => (
                    <div
                      key={idx}
                      className="bg-white border border-gray-200 rounded-xl p-4 hover:border-indigo-200 hover:shadow-sm transition"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-bold text-gray-900">
                            {section.courseCode} - {section.courseTitle}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Section {section.sectionName}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Risk Indicators */}
            {(student?.cumulativeGPA < 2.0 || (attendancePercent != null && attendancePercent < 75) || !student?.latestPayment?.isPaid) && (
              <div>
                <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Award className="w-4 h-4 text-red-600" />
                  Risk Indicators
                </h4>
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
                  {student?.cumulativeGPA < 2.0 && (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full" />
                      <p className="text-sm text-red-700 font-semibold">Low GPA (below 2.0)</p>
                    </div>
                  )}
                  {attendancePercent != null && attendancePercent < 75 && (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-amber-500 rounded-full" />
                      <p className="text-sm text-amber-700 font-semibold">Low Attendance (below 75%)</p>
                    </div>
                  )}
                  {!student?.latestPayment?.isPaid && (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-amber-500 rounded-full" />
                      <p className="text-sm text-amber-700 font-semibold">Unpaid Fees</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
            <button
              onClick={onClose}
              className="w-full bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
