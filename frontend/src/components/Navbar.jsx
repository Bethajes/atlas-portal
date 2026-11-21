import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const roleColors = {
  STUDENT: 'bg-brand-100 text-brand-700',
  INSTRUCTOR: 'bg-purple-100 text-purple-700',
  ADMIN: 'bg-red-100 text-red-700',
  REGISTRAR: 'bg-green-100 text-green-700',
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinks = {
    STUDENT: [
      { label: 'Dashboard', to: '/dashboard' },
      { label: 'My Courses', to: '/courses' },
      { label: 'Assignments', to: '/assignments' },
      { label: 'Grades', to: '/grades' },
    ],
    INSTRUCTOR: [
      { label: 'Dashboard', to: '/instructor' },
      { label: 'My Courses', to: '/instructor/courses' },
      { label: 'Grades', to: '/instructor/grades' },
    ],
    ADMIN: [
      { label: 'Dashboard', to: '/admin' },
      { label: 'Students', to: '/admin/students' },
      { label: 'Courses', to: '/admin/courses' },
      { label: 'Users', to: '/admin/users' },
    ],
    REGISTRAR: [
      { label: 'Dashboard', to: '/registrar' },
      { label: 'Registrations', to: '/registrar/registrations' },
      { label: 'Students', to: '/registrar/students' },
    ],
  
    STUDENT: [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'My Courses', to: '/courses' },
  { label: 'Assignments', to: '/assignments' },
  { label: 'Grades', to: '/grades' },
  { label: 'Pay Tuition', to: '/payment' },  // ADD THIS
  ],
};
  const links = navLinks[user?.role] || [];

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-8">
        <span className="font-semibold text-gray-800 text-sm">
          New Generation University College
        </span>
        <div className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-sm text-gray-500 hover:text-gray-900 px-3 py-1.5 rounded-md hover:bg-gray-100 transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColors[user?.role]}`}>
          {user?.role}
        </span>
        <span className="text-sm text-gray-600">{user?.name}</span>
        <button
          onClick={handleLogout}
          className="text-xs text-gray-400 hover:text-red-500 transition-colors ml-2"
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}