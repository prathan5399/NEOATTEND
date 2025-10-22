import React, { useState, useEffect, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navigation from './components/Navigation';
import Dashboard from './components/Dashboard';
import AttendanceMarking from './components/AttendanceMarking';
import ClassroomAttendance from './components/ClassroomAttendance';
import FacultyDashboard from './components/FacultyDashboard';
import TestDataLoader from './components/TestDataLoader';
import StudentManagement from './components/StudentManagement';
import Analytics from './components/Analytics';
import StudentAnalytics from './components/StudentAnalytics';
import FacultyAnalytics from './components/FacultyAnalytics';
import StudentMonitoring from './components/StudentMonitoring';
import Settings from './components/Settings';
import Home from './components/Home';
import { database } from './utils/database';
import { initializeTestData } from './utils/initializeTestData';
import Login from './components/auth/Login';
import Signup from './components/auth/Signup';

// Authentication Context
interface AuthContextType {
  isAuthenticated: boolean;
  userType: 'faculty' | 'student' | null;
  login: (type: 'faculty' | 'student', userData: { username: string; password: string }) => void;
  logout: () => void;
}

export const AuthContext = React.createContext<AuthContextType | null>(null);

// Protected Route Component
const ProtectedRoute = ({ children, requiredRole, isLoading }: { 
  children: React.ReactNode; 
  requiredRole?: 'faculty' | 'student';
  isLoading?: boolean;
}) => {
  const auth = React.useContext(AuthContext);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  if (!auth?.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && auth.userType !== requiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// Layout Component for authenticated pages
const AppLayout = ({ children }: { children: React.ReactNode }) => {
  // Generate star positions once to prevent re-renders
  const starPositions = useMemo(() => {
    return [...Array(30)].map(() => ({
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      animationDelay: `${Math.random() * 3}s`,
      animationDuration: `${2 + Math.random() * 2}s`
    }));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white relative overflow-hidden">
      {/* Animated Stars Background */}
      <div className="absolute inset-0">
        {starPositions.map((position, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
            style={{
              left: position.left,
              top: position.top,
              animationDelay: position.animationDelay,
              animationDuration: position.animationDuration
            }}
          />
        ))}
      </div>

      {children}

      {/* Footer */}
      <footer className="relative z-10 bg-black/50 border-t border-white/10 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-lg flex items-center justify-center">
                <div className="w-4 h-4 bg-white rounded"></div>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">NEOATTEND</p>
                <p className="text-xs text-gray-300">AI-Powered Attendance</p>
              </div>
            </div>

            <div className="text-xs text-gray-400 space-y-1 md:text-right">
              <p>© 2025 NEOATTEND. Advanced Face Recognition Technology.</p>
              <p>Powered by AI • Secure • Accurate • Efficient</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userType, setUserType] = useState<'faculty' | 'student' | null>(null);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  useEffect(() => {
    // Initialize test data automatically if database is empty
    console.log('🔄 Checking database...');
    const dataLoaded = initializeTestData();
    
    if (dataLoaded) {
      console.log('✅ Test data loaded automatically!');
      console.log('📊 You can now test Faculty Dashboard features');
    }

    // Check for stored authentication
    const storedAuth = localStorage.getItem('neoattend_auth');

    if (storedAuth) {
      try {
        const authData = JSON.parse(storedAuth);
        console.log('Restoring authentication:', authData);
        setIsAuthenticated(true);
        setUserType(authData.userType);
      } catch (error) {
        console.error('Error restoring auth:', error);
        localStorage.removeItem('neoattend_auth');
        localStorage.removeItem('neoattend_current_route');
      }
    }

    // Mark initial load as complete
    setInitialLoadComplete(true);
  }, []);

  const handleLogin = (type: 'faculty' | 'student', userData: { username: string; password: string }) => {
    setIsAuthenticated(true);
    setUserType(type);
    // Store authentication data
    localStorage.setItem('neoattend_auth', JSON.stringify({ userType: type, username: userData.username }));
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserType(null);
    localStorage.removeItem('neoattend_auth');
    localStorage.removeItem('neoattend_current_route');
  };

  const authContextValue: AuthContextType = {
    isAuthenticated,
    userType,
    login: handleLogin,
    logout: handleLogout,
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute isLoading={!initialLoadComplete}>
                <AppLayout>
                  <Navigation userType={userType} />
                  <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <Dashboard />
                  </main>
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/attendance"
            element={
              <ProtectedRoute isLoading={!initialLoadComplete}>
                <AppLayout>
                  <Navigation userType={userType} />
                  <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <AttendanceMarking userType={userType || 'student'} />
                  </main>
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/classroom-attendance"
            element={
              <ProtectedRoute requiredRole="faculty" isLoading={!initialLoadComplete}>
                <ClassroomAttendance />
              </ProtectedRoute>
            }
          />

          <Route
            path="/faculty-dashboard"
            element={
              <ProtectedRoute requiredRole="faculty" isLoading={!initialLoadComplete}>
                <FacultyDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/test-data"
            element={
              <ProtectedRoute requiredRole="faculty" isLoading={!initialLoadComplete}>
                <TestDataLoader />
              </ProtectedRoute>
            }
          />

          {/* Faculty Only Routes */}
          <Route
            path="/students"
            element={
              <ProtectedRoute requiredRole="faculty" isLoading={!initialLoadComplete}>
                <AppLayout>
                  <Navigation userType={userType} />
                  <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <StudentManagement userType={userType || 'faculty'} />
                  </main>
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/analytics"
            element={
              <ProtectedRoute requiredRole="faculty" isLoading={!initialLoadComplete}>
                <AppLayout>
                  <Navigation userType={userType} />
                  <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <Analytics />
                  </main>
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/faculty-analytics"
            element={
              <ProtectedRoute requiredRole="faculty" isLoading={!initialLoadComplete}>
                <AppLayout>
                  <Navigation userType={userType} />
                  <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <FacultyAnalytics />
                  </main>
                </AppLayout>
              </ProtectedRoute>
            }
          />

            <Route
              path="/student-monitoring"
              element={
                <ProtectedRoute requiredRole="faculty" isLoading={!initialLoadComplete}>
                  <AppLayout>
                    <Navigation userType={userType} />
                    <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                      <StudentMonitoring />
                    </main>
                  </AppLayout>
                </ProtectedRoute>
              }
            />

          {/* Student Analytics Route */}
          <Route
            path="/student-analytics"
            element={
              <ProtectedRoute requiredRole="student" isLoading={!initialLoadComplete}>
                <AppLayout>
                  <Navigation userType={userType} />
                  <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <StudentAnalytics />
                  </main>
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedRoute isLoading={!initialLoadComplete}>
                <AppLayout>
                  <Navigation userType={userType} />
                  <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <Settings />
                  </main>
                </AppLayout>
              </ProtectedRoute>
            }
          />

          {/* Redirect unknown routes to dashboard if authenticated, otherwise to home */}
          <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/"} replace />} />
        </Routes>
      </Router>
    </AuthContext.Provider>
  );
}

export default App;