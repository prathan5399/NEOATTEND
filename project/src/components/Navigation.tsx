import React, { useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { AuthContext } from '../App';

interface NavigationProps {
  userType: 'faculty' | 'student' | null;
}

const Navigation: React.FC<NavigationProps> = ({ userType }) => {
  const auth = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    if (auth) {
      auth.logout();
      navigate('/');
    }
  };

  const handleGoHome = () => {
    navigate('/');
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', path: '/dashboard' },
    { id: 'attendance', label: 'Attendance', path: '/attendance' },
    { id: 'students', label: 'Students', path: '/students', facultyOnly: true },
    { id: 'analytics', label: 'Analytics', path: '/analytics', facultyOnly: true },
    { id: 'faculty-analytics', label: "Today's Session", path: '/faculty-analytics', facultyOnly: true },
      { id: 'student-monitoring', label: 'Student Monitoring', path: '/student-monitoring', facultyOnly: true },
    { id: 'settings', label: 'Settings', path: '/settings' },
  ];

  const filteredTabs = tabs.filter(tab => !tab.facultyOnly || userType === 'faculty');

  return (
    <nav className="bg-black/50 backdrop-blur-sm border-b border-white/10 relative z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <button
              onClick={handleGoHome}
              className="flex items-center space-x-2 text-white hover:text-purple-400 transition-colors duration-300 mr-4"
            >
              🏠 Home
            </button>
            {filteredTabs.map((tab) => (
              <Link
                key={tab.id}
                to={tab.path}
                className={`inline-flex items-center px-4 py-2 border-b-2 text-sm font-medium transition-all duration-300 ${
                  location.pathname === tab.path
                    ? 'border-purple-400 text-purple-400'
                    : 'border-transparent text-gray-300 hover:text-white hover:border-cyan-400'
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center space-x-4">
            <div className="px-3 py-1 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 rounded-lg border border-purple-500/30">
              <span className="text-sm text-purple-300 capitalize font-medium">
                {userType} Mode
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm leading-4 font-medium rounded-lg text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-300 transform hover:scale-105"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;