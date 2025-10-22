import React, { useState, useEffect, useContext } from 'react';
import { Users, Clock, TrendingUp, Calendar, CheckCircle, XCircle, AlertCircle, UserCheck, Camera } from 'lucide-react';
import { Link } from 'react-router-dom';
import { database } from '../utils/database';
import { DashboardStats, AttendanceRecord } from '../types';
import { AuthContext } from '../App';

const Dashboard = () => {
  const auth = useContext(AuthContext);
  const userType = auth?.userType;
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    presentToday: 0,
    lateToday: 0,
    absentToday: 0,
    attendanceRate: 0,
  });
  const [recentAttendance, setRecentAttendance] = useState<AttendanceRecord[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [userAttendance, setUserAttendance] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    loadDashboardData();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadDashboardData = () => {
    if (userType === 'faculty') {
      // Faculty sees all student data
      const students = database.getStudents();
      const todayAttendance = database.getTodayAttendance();
      const allAttendance = database.getAttendanceRecords();

      const presentToday = todayAttendance.filter(r => r.status === 'Present').length;
      const lateToday = todayAttendance.filter(r => r.status === 'Late').length;
      const absentToday = students.length - (presentToday + lateToday);

      setStats({
        totalStudents: students.length,
        presentToday,
        lateToday,
        absentToday,
        attendanceRate: students.length > 0 ? (presentToday / students.length) * 100 : 0,
      });

      setRecentAttendance(allAttendance.slice(-5).reverse());
    } else if (userType === 'student') {
      // Student sees their own attendance data
      const allAttendance = database.getAttendanceRecords();
      const studentAttendance = allAttendance.filter(record => {
        // In a real app, this would filter by the logged-in student's ID
        // For now, we'll show a sample
        return true; // Placeholder
      });

      setUserAttendance(studentAttendance.slice(-10).reverse());

      // Calculate personal stats
      const today = new Date().toDateString();
      const todayRecords = studentAttendance.filter(r => new Date(r.timestamp).toDateString() === today);
      const presentCount = todayRecords.filter(r => r.status === 'Present').length;
      const totalDays = studentAttendance.length;

      setStats({
        totalStudents: 1, // Personal view
        presentToday: presentCount,
        lateToday: 0,
        absentToday: 0,
        attendanceRate: totalDays > 0 ? (studentAttendance.filter(r => r.status === 'Present').length / totalDays) * 100 : 0,
      });
    }
  };

  const StatCard = ({ title, value, icon: Icon, color, subtitle }: {
    title: string;
    value: string | number;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    subtitle?: string;
  }) => (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 transform hover:scale-105">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-300 mb-1">{title}</p>
          <p className={`text-3xl font-bold ${color}`}>{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-full bg-white/20 backdrop-blur-sm`}>
          <Icon className={`h-6 w-6 ${color}`} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 rounded-xl p-6 text-white shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">
              Welcome to NEOATTEND {userType === 'faculty' ? 'Faculty Dashboard' : 'Student Dashboard'}
            </h2>
            <p className="text-purple-100">
              {userType === 'faculty'
                ? 'Manage attendance and monitor student performance'
                : 'Track your attendance and academic progress'
              }
            </p>
          </div>
          <div className="mt-4 md:mt-0 text-right">
            <div className="flex items-center space-x-2 text-purple-100 mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-sm">Current Time</span>
            </div>
            <p className="text-xl font-mono">{currentTime.toLocaleTimeString()}</p>
            <p className="text-sm text-purple-200">{currentTime.toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {userType === 'faculty' ? (
        <>
          {/* Faculty Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Total Students"
              value={stats.totalStudents}
              icon={Users}
              color="text-blue-600"
              subtitle="Registered"
            />
            <StatCard
              title="Present Today"
              value={stats.presentToday}
              icon={CheckCircle}
              color="text-green-600"
              subtitle={`${stats.attendanceRate.toFixed(1)}% rate`}
            />
            <StatCard
              title="Late Today"
              value={stats.lateToday}
              icon={AlertCircle}
              color="text-yellow-600"
              subtitle="Arrived late"
            />
            <StatCard
              title="Absent Today"
              value={stats.absentToday}
              icon={XCircle}
              color="text-red-600"
              subtitle="Not marked"
            />
          </div>

          {/* Faculty Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl p-6 border border-white/20">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-cyan-400" />
                Recent Attendance
              </h3>
              <div className="space-y-3">
                {recentAttendance.length > 0 ? (
                  recentAttendance.map((record) => {
                    const student = database.getStudents().find(s => s.id === record.studentId);
                    return (
                      <div key={record.id} className="flex items-center justify-between p-3 bg-white/10 rounded-lg backdrop-blur-sm border border-white/10">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${
                            record.status === 'Present' ? 'bg-green-500' :
                            record.status === 'Late' ? 'bg-yellow-500' : 'bg-red-500'
                          }`} />
                          <div>
                            <p className="font-medium text-white">{student?.name || 'Unknown Student'}</p>
                            <p className="text-sm text-gray-300">{student?.rollNo || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-white">
                            {new Date(record.timestamp).toLocaleTimeString()}
                          </p>
                          <p className="text-xs text-gray-300">
                            Status: {record.status}
                          </p>
                          {record.confidence && (
                            <p className="text-xs text-cyan-400">
                              {(record.confidence * 100).toFixed(1)}% confidence
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-gray-300 text-center py-4">No attendance records yet</p>
                )}
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl p-6 border border-white/20">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-green-400" />
                Attendance Trends
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-300">Overall Rate</span>
                  <span className="text-lg font-bold text-green-400">{stats.attendanceRate.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-green-500 to-cyan-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${stats.attendanceRate}%` }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4 mt-4 text-center">
                  <div className="p-3 bg-green-500/20 rounded-lg backdrop-blur-sm border border-green-500/30">
                    <p className="text-2xl font-bold text-green-400">{stats.presentToday}</p>
                    <p className="text-xs text-green-300">Present</p>
                  </div>
                  <div className="p-3 bg-yellow-500/20 rounded-lg backdrop-blur-sm border border-yellow-500/30">
                    <p className="text-2xl font-bold text-yellow-400">{stats.lateToday}</p>
                    <p className="text-xs text-yellow-300">Late</p>
                  </div>
                  <div className="p-3 bg-red-500/20 rounded-lg backdrop-blur-sm border border-red-500/30">
                    <p className="text-2xl font-bold text-red-400">{stats.absentToday}</p>
                    <p className="text-xs text-red-300">Absent</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Student Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl p-6 border border-white/20">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <CheckCircle className="h-5 w-5 mr-2 text-green-400" />
                Your Attendance Rate
              </h3>
              <div className="text-center">
                <p className="text-4xl font-bold text-green-400 mb-2">{stats.attendanceRate.toFixed(1)}%</p>
                <p className="text-sm text-gray-300">Overall attendance</p>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl p-6 border border-white/20">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-cyan-400" />
                Today's Status
              </h3>
              <div className="text-center">
                <p className={`text-2xl font-bold mb-2 ${
                  stats.presentToday > 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {stats.presentToday > 0 ? 'Present' : 'Not Marked'}
                </p>
                <p className="text-sm text-gray-300">Attendance status</p>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl p-6 border border-white/20">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-purple-400" />
                Quick Actions
              </h3>
              <div className="space-y-2">
                {userType !== 'student' && (
                  <>
                    <Link
                      to="/test-data"
                      className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 inline-block text-center"
                    >
                      🧪 Load Test Data (10 Students)
                    </Link>
                    <Link
                      to="/faculty-dashboard"
                      className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 inline-block text-center"
                    >
                      📊 Faculty Dashboard (All Features)
                    </Link>
                    <Link
                      to="/classroom-attendance"
                      className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 inline-block text-center"
                    >
                      🎯 Classroom Attendance (Bulk)
                    </Link>
                  </>
                )}
                <Link
                  to="/attendance"
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 inline-block text-center"
                >
                  Mark Attendance
                </Link>
                <Link
                  to="/student-analytics"
                  className="w-full bg-white/10 hover:bg-white/20 text-white font-medium py-2 px-4 rounded-lg transition-all duration-300 inline-block text-center"
                >
                  View Analytics
                </Link>
              </div>
            </div>
          </div>

          {/* Student Recent Attendance */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-cyan-400" />
              Your Recent Attendance
            </h3>
            <div className="space-y-3">
              {userAttendance.length > 0 ? (
                userAttendance.map((record) => (
                  <div key={record.id} className="flex items-center justify-between p-3 bg-white/10 rounded-lg backdrop-blur-sm border border-white/10">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        record.status === 'Present' ? 'bg-green-500' :
                        record.status === 'Late' ? 'bg-yellow-500' : 'bg-red-500'
                      }`} />
                      <div>
                        <p className="font-medium text-white">
                          {new Date(record.timestamp).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-gray-300">
                          {new Date(record.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${
                        record.status === 'Present' ? 'text-green-400' :
                        record.status === 'Late' ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {record.status}
                      </p>
                      {record.confidence && (
                        <p className="text-xs text-cyan-400">
                          {(record.confidence * 100).toFixed(1)}% confidence
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-300 text-center py-4">No attendance records yet</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Dashboard;