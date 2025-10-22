import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Calendar,
  Download,
  Edit3,
  Save,
  TrendingUp,
  BarChart3,
  FileText,
  Camera,
  UserCheck,
  AlertCircle
} from 'lucide-react';
import { database } from '../utils/database';
import { reportGenerator, AttendanceReportData } from '../utils/pdfGenerator';
import { Student, AttendanceRecord } from '../types';

type ViewMode = 'daily' | 'weekly' | 'monthly';
type AttendanceStatus = 'Present' | 'Late' | 'Absent';

interface StudentAttendanceStatus {
  student: Student;
  status: AttendanceStatus;
  timestamp?: Date;
  confidence?: number;
  isManual?: boolean;
}

const FacultyDashboard = () => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceData, setAttendanceData] = useState<StudentAttendanceStatus[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editedAttendance, setEditedAttendance] = useState<Map<string, AttendanceStatus>>(new Map());
  const [stats, setStats] = useState({
    total: 0,
    present: 0,
    absent: 0,
    late: 0,
    percentage: 0
  });

  useEffect(() => {
    loadData();
  }, [selectedDate, viewMode]);

  const loadData = () => {
    const allStudents = database.getStudents();
    setStudents(allStudents);

    if (viewMode === 'daily') {
      loadDailyAttendance(allStudents);
    }
  };

  const loadDailyAttendance = (allStudents: Student[]) => {
    const todayAttendance = database.getTodayAttendance();
    const attendanceMap = new Map<string, AttendanceRecord>();
    
    todayAttendance.forEach(record => {
      attendanceMap.set(record.studentId, record);
    });

    const statusData: StudentAttendanceStatus[] = allStudents.map(student => {
      const record = attendanceMap.get(student.id);
      if (record) {
        return {
          student,
          status: record.status as AttendanceStatus,
          timestamp: record.timestamp,
          confidence: record.confidence,
          isManual: false
        };
      } else {
        return {
          student,
          status: 'Absent',
          isManual: false
        };
      }
    });

    setAttendanceData(statusData);
    calculateStats(statusData);
  };

  const calculateStats = (data: StudentAttendanceStatus[]) => {
    const total = data.length;
    const present = data.filter(d => d.status === 'Present').length;
    const late = data.filter(d => d.status === 'Late').length;
    const absent = data.filter(d => d.status === 'Absent').length;
    const percentage = total > 0 ? ((present + late) / total) * 100 : 0;

    setStats({ total, present, absent, late, percentage });
  };

  const handleManualEdit = (studentId: string, status: AttendanceStatus) => {
    const newMap = new Map(editedAttendance);
    newMap.set(studentId, status);
    setEditedAttendance(newMap);
  };

  const saveManualAttendance = () => {
    const now = new Date();
    let updatedCount = 0;

    editedAttendance.forEach((status, studentId) => {
      // Check if already marked
      const todayAttendance = database.getTodayAttendance();
      const existing = todayAttendance.find(r => r.studentId === studentId);

      if (!existing && status !== 'Absent') {
        // Mark new attendance
        const record: Omit<AttendanceRecord, 'id'> = {
          studentId,
          timestamp: now,
          status,
          confidence: 1.0, // Manual marking has 100% confidence
        };
        database.markAttendance(record);
        updatedCount++;
      }
    });

    setIsEditing(false);
    setEditedAttendance(new Map());
    loadData();
    alert(`✅ Successfully updated attendance for ${updatedCount} student(s)`);
  };

  const getWeeklyStats = () => {
    const students = database.getStudents();
    const allRecords = database.getAttendanceRecords();
    
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);

    const weekRecords = allRecords.filter(r => {
      const recordDate = new Date(r.timestamp);
      return recordDate >= startOfWeek;
    });

    const dayWiseData = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      
      const dayRecords = weekRecords.filter(r => {
        const rDate = new Date(r.timestamp);
        return rDate.toDateString() === date.toDateString();
      });

      const present = dayRecords.filter(r => r.status === 'Present').length;
      const late = dayRecords.filter(r => r.status === 'Late').length;

      dayWiseData.push({
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        present,
        late,
        total: present + late,
        percentage: students.length > 0 ? ((present + late) / students.length) * 100 : 0
      });
    }

    return dayWiseData;
  };

  const getMonthlyStats = () => {
    const students = database.getStudents();
    const allRecords = database.getAttendanceRecords();
    
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const monthRecords = allRecords.filter(r => {
      const recordDate = new Date(r.timestamp);
      return recordDate >= startOfMonth && recordDate <= endOfMonth;
    });

    const weeklyData = [];
    const totalDays = endOfMonth.getDate();
    let currentWeek = 1;
    let weekStart = 1;

    while (weekStart <= totalDays) {
      const weekEnd = Math.min(weekStart + 6, totalDays);
      const weekRecords = monthRecords.filter(r => {
        const day = new Date(r.timestamp).getDate();
        return day >= weekStart && day <= weekEnd;
      });

      const present = weekRecords.filter(r => r.status === 'Present').length;
      const late = weekRecords.filter(r => r.status === 'Late').length;

      weeklyData.push({
        week: `Week ${currentWeek}`,
        range: `${weekStart}-${weekEnd}`,
        present,
        late,
        total: present + late,
        percentage: students.length > 0 ? ((present + late) / (students.length * 7)) * 100 : 0
      });

      weekStart = weekEnd + 1;
      currentWeek++;
    }

    return weeklyData;
  };

  const downloadReport = async () => {
    const faculty = JSON.parse(localStorage.getItem('user') || '{}');
    
    const reportData: AttendanceReportData = {
      date: selectedDate,
      className: 'All Students',
      subject: viewMode === 'daily' ? 'Daily Report' : viewMode === 'weekly' ? 'Weekly Report' : 'Monthly Report',
      faculty: faculty.name || 'Faculty',
      students: attendanceData.map(item => ({
        student: item.student,
        status: item.status,
        markedAt: item.timestamp,
        confidence: item.confidence
      })),
      statistics: {
        totalStudents: stats.total,
        present: stats.present,
        absent: stats.absent,
        late: stats.late,
        attendancePercentage: stats.percentage
      }
    };

    await reportGenerator.downloadReport(reportData, `attendance_${viewMode}_${selectedDate.toISOString().split('T')[0]}.html`);
  };

  const downloadCSV = () => {
    const faculty = JSON.parse(localStorage.getItem('user') || '{}');
    
    const reportData: AttendanceReportData = {
      date: selectedDate,
      className: 'All Students',
      subject: viewMode === 'daily' ? 'Daily Report' : viewMode === 'weekly' ? 'Weekly Report' : 'Monthly Report',
      faculty: faculty.name || 'Faculty',
      students: attendanceData.map(item => ({
        student: item.student,
        status: item.status,
        markedAt: item.timestamp,
        confidence: item.confidence
      })),
      statistics: {
        totalStudents: stats.total,
        present: stats.present,
        absent: stats.absent,
        late: stats.late,
        attendancePercentage: stats.percentage
      }
    };

    reportGenerator.downloadCSV(reportData, `attendance_${viewMode}_${selectedDate.toISOString().split('T')[0]}.csv`);
  };

  const weeklyData = viewMode === 'weekly' ? getWeeklyStats() : [];
  const monthlyData = viewMode === 'monthly' ? getMonthlyStats() : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-cyan-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
                <UserCheck className="w-8 h-8 mr-3" />
                Faculty Dashboard - Attendance Management
              </h1>
              <p className="text-gray-300">
                View, edit, and download student attendance records
              </p>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all duration-300"
            >
              ← Back
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => navigate('/classroom-attendance')}
            className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white p-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-xl"
          >
            <Camera className="w-8 h-8 mb-2" />
            <div className="font-semibold text-lg">Capture Classroom</div>
            <div className="text-sm opacity-90">Bulk face detection</div>
          </button>

          <button
            onClick={() => navigate('/attendance')}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white p-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-xl"
          >
            <CheckCircle className="w-8 h-8 mb-2" />
            <div className="font-semibold text-lg">Individual Attendance</div>
            <div className="text-sm opacity-90">Camera or upload</div>
          </button>

          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`${
              isEditing 
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700' 
                : 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700'
            } text-white p-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-xl`}
          >
            {isEditing ? <Save className="w-8 h-8 mb-2" /> : <Edit3 className="w-8 h-8 mb-2" />}
            <div className="font-semibold text-lg">
              {isEditing ? 'Save Changes' : 'Manual Edit'}
            </div>
            <div className="text-sm opacity-90">Mark absent students</div>
          </button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-lg rounded-xl p-6 border-2 border-blue-400">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-8 h-8 text-blue-300" />
              <span className="text-xs text-blue-200">Total</span>
            </div>
            <div className="text-4xl font-bold text-white">{stats.total}</div>
            <div className="text-blue-200 text-sm">Students</div>
          </div>

          <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-lg rounded-xl p-6 border-2 border-green-400">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-8 h-8 text-green-300" />
              <span className="text-xs text-green-200">Present</span>
            </div>
            <div className="text-4xl font-bold text-white">{stats.present}</div>
            <div className="text-green-200 text-sm">{((stats.present / stats.total) * 100).toFixed(1)}%</div>
          </div>

          <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 backdrop-blur-lg rounded-xl p-6 border-2 border-yellow-400">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-8 h-8 text-yellow-300" />
              <span className="text-xs text-yellow-200">Late</span>
            </div>
            <div className="text-4xl font-bold text-white">{stats.late}</div>
            <div className="text-yellow-200 text-sm">{((stats.late / stats.total) * 100).toFixed(1)}%</div>
          </div>

          <div className="bg-gradient-to-br from-red-500/20 to-pink-500/20 backdrop-blur-lg rounded-xl p-6 border-2 border-red-400">
            <div className="flex items-center justify-between mb-2">
              <XCircle className="w-8 h-8 text-red-300" />
              <span className="text-xs text-red-200">Absent</span>
            </div>
            <div className="text-4xl font-bold text-white">{stats.absent}</div>
            <div className="text-red-200 text-sm">{((stats.absent / stats.total) * 100).toFixed(1)}%</div>
          </div>
        </div>

        {/* View Mode Selector & Date */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('daily')}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                  viewMode === 'daily'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                Daily
              </button>
              <button
                onClick={() => setViewMode('weekly')}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                  viewMode === 'weekly'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                Weekly
              </button>
              <button
                onClick={() => setViewMode('monthly')}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                  viewMode === 'monthly'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                Monthly
              </button>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-300" />
              <input
                type="date"
                value={selectedDate.toISOString().split('T')[0]}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={downloadReport}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white rounded-lg font-medium transition-all duration-300 shadow-lg"
              >
                <FileText className="w-5 h-5" />
                PDF
              </button>
              <button
                onClick={downloadCSV}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-medium transition-all duration-300 shadow-lg"
              >
                <Download className="w-5 h-5" />
                CSV
              </button>
            </div>
          </div>
        </div>

        {/* Daily View - Student List */}
        {viewMode === 'daily' && (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <Users className="w-6 h-6 mr-2" />
                Student Attendance - {selectedDate.toLocaleDateString()}
              </h2>
              {isEditing && (
                <button
                  onClick={saveManualAttendance}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-semibold transition-all duration-300 shadow-lg transform hover:scale-105"
                >
                  <Save className="w-5 h-5" />
                  Save All Changes
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">S.No</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Roll Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Department</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Confidence</th>
                    {isEditing && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Action</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {attendanceData.map((item, index) => {
                    const editedStatus = editedAttendance.get(item.student.id);
                    const currentStatus = editedStatus || item.status;

                    return (
                      <tr key={item.student.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{index + 1}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{item.student.rollNo}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{item.student.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{item.student.department}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            currentStatus === 'Present' 
                              ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                              : currentStatus === 'Late'
                              ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                              : 'bg-red-500/20 text-red-300 border border-red-500/30'
                          }`}>
                            {currentStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-cyan-400">
                          {item.confidence ? `${(item.confidence * 100).toFixed(1)}%` : '-'}
                        </td>
                        {isEditing && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <select
                              value={currentStatus}
                              onChange={(e) => handleManualEdit(item.student.id, e.target.value as AttendanceStatus)}
                              className="px-3 py-1 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            >
                              <option value="Present" className="bg-gray-800">Present</option>
                              <option value="Late" className="bg-gray-800">Late</option>
                              <option value="Absent" className="bg-gray-800">Absent</option>
                            </select>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Weekly View */}
        {viewMode === 'weekly' && (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <BarChart3 className="w-6 h-6 mr-2" />
              Weekly Attendance Report
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
              {weeklyData.map((day, index) => (
                <div key={index} className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="text-center mb-3">
                    <div className="text-sm font-semibold text-gray-300">{day.day}</div>
                    <div className="text-xs text-gray-400">{day.date}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Present:</span>
                      <span className="text-green-400 font-semibold">{day.present}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Late:</span>
                      <span className="text-yellow-400 font-semibold">{day.late}</span>
                    </div>
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-white">{day.percentage.toFixed(0)}%</div>
                        <div className="text-xs text-gray-400">Attendance</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Monthly View */}
        {viewMode === 'monthly' && (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <TrendingUp className="w-6 h-6 mr-2" />
              Monthly Attendance Report
            </h2>
            <div className="space-y-4">
              {monthlyData.map((week, index) => (
                <div key={index} className="bg-white/5 rounded-lg p-6 border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-lg font-semibold text-white">{week.week}</div>
                      <div className="text-sm text-gray-400">Days {week.range}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-white">{week.percentage.toFixed(1)}%</div>
                      <div className="text-xs text-gray-400">Average</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/20">
                      <div className="text-xs text-green-400 mb-1">Present</div>
                      <div className="text-2xl font-bold text-green-300">{week.present}</div>
                    </div>
                    <div className="bg-yellow-500/10 rounded-lg p-3 border border-yellow-500/20">
                      <div className="text-xs text-yellow-400 mb-1">Late</div>
                      <div className="text-2xl font-bold text-yellow-300">{week.late}</div>
                    </div>
                    <div className="bg-blue-500/10 rounded-lg p-3 border border-blue-500/20">
                      <div className="text-xs text-blue-400 mb-1">Total</div>
                      <div className="text-2xl font-bold text-blue-300">{week.total}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Information Banner */}
        <div className="bg-gradient-to-r from-purple-500/20 to-cyan-500/20 backdrop-blur-lg rounded-xl p-6 border border-purple-500/30">
          <div className="flex items-start">
            <AlertCircle className="w-6 h-6 text-purple-400 mr-3 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-white mb-2">Faculty Dashboard Features</h3>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>✅ <strong>Capture Classroom:</strong> Take group photo to mark attendance for entire class</li>
                <li>✅ <strong>Manual Edit:</strong> Mark attendance for absent students or correct face detection errors</li>
                <li>✅ <strong>View Reports:</strong> Daily list, Weekly graphs, Monthly statistics</li>
                <li>✅ <strong>Download:</strong> Export attendance data as PDF or CSV for records</li>
                <li>✅ <strong>Real-time Stats:</strong> See present, absent, late counts instantly</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacultyDashboard;
