import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './routes/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import StudentDashboard from './pages/StudentDashboard';
import InstructorDashboard from './pages/InstructorDashboard';
import AdminDashboard from './pages/AdminDashboard';
import RegistrarDashboard from './pages/RegistrarDashboard';
import RegistrarAdmissions from './pages/RegistrarAdmissions';
import RegistrarApproval from './pages/RegistrarApproval';
import RegistrarPayments from './pages/RegistrarPayments';
import RegistrarStudents from './pages/RegistrarStudents';
import AcademicSetup from './pages/AcademicSetup';
import Apply from './pages/Apply';
import ChangePassword from './pages/ChangePassword';
import StudentRegistration from './pages/StudentRegistration';
import DepartmentHeadDashboard from './pages/DepartmentHeadDashboard';
import PaymentPage from './pages/PaymentPage';
import StudentProfile from './pages/StudentProfile';
import StudentTranscript from './pages/StudentTranscript';


// Auto-redirect to the right portal based on role
function RoleRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.isFirstLogin) return <Navigate to="/change-password" replace />;
  const routes = {
    STUDENT: '/dashboard',
    INSTRUCTOR: '/instructor',
    ADMIN: '/admin',
    REGISTRAR: '/registrar',
  };
  return <Navigate to={routes[user.role] || '/login'} replace />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      <BrowserRouter>
        <Routes>
          <Route path="/dashboard/department-head" element={
            <ProtectedRoute>
              <DepartmentHeadDashboard />
            </ProtectedRoute>
          } />

          <Route path="/payment" element={
            <ProtectedRoute allowedRoles={['STUDENT']}>
              <PaymentPage />
            </ProtectedRoute>
          } />
          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/apply" element={<Apply />} />
          <Route path="/change-password" element={
            <ProtectedRoute>
              <ChangePassword />
            </ProtectedRoute>
          } />

          {/* Auto-redirect by role */}
          <Route path="/" element={<RoleRedirect />} />
          

          {/* Student portal */}
          <Route path="/dashboard" element={
            <ProtectedRoute allowedRoles={['STUDENT']}>
              <StudentDashboard />
            </ProtectedRoute>
          } />
          <Route path="/registration" element={
            <ProtectedRoute allowedRoles={['STUDENT']}>
              <StudentRegistration />
            </ProtectedRoute>
          } />
          <Route path="/student/profile" element={
            <ProtectedRoute allowedRoles={['STUDENT']}>
              <StudentProfile />
            </ProtectedRoute>
          } />
          <Route path="/student/transcript" element={
            <ProtectedRoute allowedRoles={['STUDENT']}>
              <StudentTranscript />
            </ProtectedRoute>
          } />

          {/* Instructor portal */}
          <Route path="/instructor" element={
            <ProtectedRoute allowedRoles={['INSTRUCTOR']}>
              <InstructorDashboard />
            </ProtectedRoute>
          } />

          {/* Admin portal */}
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />

          {/* Registrar portal */}
          <Route path="/registrar" element={
            <ProtectedRoute allowedRoles={['REGISTRAR']}>
              <RegistrarDashboard />
            </ProtectedRoute>
          } />
          <Route path="/registrar/approvals" element={
            <ProtectedRoute allowedRoles={['REGISTRAR']}>
              <RegistrarApproval />
            </ProtectedRoute>
          } />
          <Route path="/registrar/admissions" element={
            <ProtectedRoute allowedRoles={['REGISTRAR']}>
              <RegistrarAdmissions />
            </ProtectedRoute>
          } />
          <Route path="/registrar/payments" element={
            <ProtectedRoute allowedRoles={['REGISTRAR']}>
              <RegistrarPayments />
            </ProtectedRoute>
          } />
          <Route path="/registrar/students" element={
            <ProtectedRoute allowedRoles={['REGISTRAR']}>
              <RegistrarStudents />
            </ProtectedRoute>
          } />
          <Route path="/registrar/setup" element={
            <ProtectedRoute allowedRoles={['REGISTRAR']}>
              <AcademicSetup />
            </ProtectedRoute>
          } />

          {/* Unauthorized */}
          <Route path="/unauthorized" element={
            <div className="min-h-screen flex items-center justify-center">
              <p className="text-gray-500 text-sm">
                You don't have access to this page.
              </p>
            </div>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </ThemeProvider>
  );
}