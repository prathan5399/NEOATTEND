import React, { useState, useEffect, useContext } from 'react';
import { 
  Calendar, TrendingUp, Award, Clock, CheckCircle, XCircle, AlertCircle, 
  User, Mail, BookOpen, GraduationCap, BarChart3, PieChart, ArrowLeft 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { database } from '../utils/database';
import { AttendanceRecord, Student } from '../types';
import { AuthContext } from '../App';

type ViewType = 'daily' | 'weekly' | 'monthly';

interface AttendanceStats {
  totalDays: number;
  present: number;
  late: number;
  absent: number;
  attendanceRate: number;
}

interface WeeklyData {
  week: string;
  present: number;
  late: number;
  absent: number;
  total: number;
}

interface MonthlyData {
  month: string;
  present: number;
  late: number;
  absent: number;
  total: number;
  attendanceRate: number;
}

const StudentAnalytics: React.FC = () => {
  const auth = useContext(AuthContext);
  const [viewType, setViewType] = useState<ViewType>('daily');
  const [studentData, setStudentData] = useState<Student | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [dailyStats, setDailyStats] = useState<AttendanceStats>({
    totalDays: 0,
    present: 0,
    late: 0,
    absent: 0,
    attendanceRate: 0
  });
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    loadStudentData();
  }, [selectedMonth, selectedYear]);

  const loadStudentData = () => {
    // Get student data (in real app, would use logged-in student's ID)
    const students = database.getStudents();
    const student = students[0]; // For demo, using first student
    
    if (student) {
      setStudentData(student);
      
      // Get all attendance records for this student
      const allRecords = database.getAttendanceRecords();
      const studentRecords = allRecords.filter(r => r.studentId === student.id);
      setAttendanceRecords(studentRecords);
      
      // Calculate daily stats
      calculateDailyStats(studentRecords);
      
      // Calculate weekly stats
      calculateWeeklyStats(studentRecords);
      
      // Calculate monthly stats
      calculateMonthlyStats(studentRecords);
    }
  };

  const calculateDailyStats = (records: AttendanceRecord[]) => {
    const uniqueDays = new Set(records.map(r => new Date(r.timestamp).toDateString()));
    const totalDays = uniqueDays.size;
    const present = records.filter(r => r.status === 'Present').length;
    const late = records.filter(r => r.status === 'Late').length;
    const absent = Math.max(0, totalDays - present - late);
    
    setDailyStats({
      totalDays,
      present,
      late,
      absent,
      attendanceRate: totalDays > 0 ? (present / totalDays) * 100 : 0
    });
  };

  const calculateWeeklyStats = (records: AttendanceRecord[]) => {
    const weekMap = new Map<string, { present: number; late: number; absent: number; total: number }>();
    
    records.forEach(record => {
      const date = new Date(record.timestamp);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, { present: 0, late: 0, absent: 0, total: 0 });
      }
      
      const weekData = weekMap.get(weekKey)!;
      weekData.total++;
      
      if (record.status === 'Present') weekData.present++;
      else if (record.status === 'Late') weekData.late++;
      else weekData.absent++;
    });
    
    const weeklyArray: WeeklyData[] = Array.from(weekMap.entries())
      .map(([week, data]) => ({
        week: new Date(week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        ...data
      }))
      .slice(-8) // Last 8 weeks
      .reverse();
    
    setWeeklyData(weeklyArray);
  };

  const calculateMonthlyStats = (records: AttendanceRecord[]) => {
    const monthMap = new Map<string, { present: number; late: number; absent: number; total: number }>();
    
    records.forEach(record => {
      const date = new Date(record.timestamp);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, { present: 0, late: 0, absent: 0, total: 0 });
      }
      
      const monthData = monthMap.get(monthKey)!;
      monthData.total++;
      
      if (record.status === 'Present') monthData.present++;
      else if (record.status === 'Late') monthData.late++;
      else monthData.absent++;
    });
    
    const monthlyArray: MonthlyData[] = Array.from(monthMap.entries())
      .map(([month, data]) => {
        const [year, monthNum] = month.split('-');
        return {
          month: new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          ...data,
          attendanceRate: data.total > 0 ? (data.present / data.total) * 100 : 0
        };
      })
      .slice(-6) // Last 6 months
      .reverse();
    
    setMonthlyData(monthlyArray);
  };

  const getDayAttendance = (date: Date): 'Present' | 'Late' | 'Absent' | null => {
    const dayRecords = attendanceRecords.filter(r => {
      const recordDate = new Date(r.timestamp);
      return recordDate.toDateString() === date.toDateString();
    });
    
    if (dayRecords.length === 0) return null;
    
    // Return the last status of the day
    const lastRecord = dayRecords[dayRecords.length - 1];
    return lastRecord.status as 'Present' | 'Late' | 'Absent';
  };

  const generateCalendar = () => {
    const year = selectedYear;
    const month = selectedMonth;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const calendar: (Date | null)[] = [];
    
    // Add empty cells for days before the first day
    for (let i = 0; i < startingDayOfWeek; i++) {
      calendar.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      calendar.push(new Date(year, month, day));
    }
    
    return calendar;
  };

  if (!studentData) {
    return (
      <div className="text-center text-white py-12">
        <p className="text-xl">Loading student data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center space-x-4">
        <Link
          to="/dashboard"
          className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all duration-300"
        >
          <ArrowLeft className="h-6 w-6 text-white" />
        </Link>
        <h1 className="text-3xl font-bold text-white">Student Analytics</h1>
      </div>

      {/* Student Profile Card */}
      <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 rounded-xl p-6 shadow-2xl">
        <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
          {/* Profile Photo */}
          <div className="flex-shrink-0">
            {studentData.imageUrl ? (
              <img
                src={studentData.imageUrl}
                alt={studentData.name}
                className="w-32 h-32 rounded-full border-4 border-white/30 object-cover shadow-xl"
              />
            ) : (
              <div className="w-32 h-32 rounded-full border-4 border-white/30 bg-white/20 flex items-center justify-center">
                <User className="h-16 w-16 text-white" />
              </div>
            )}
          </div>
          
          {/* Profile Info */}
          <div className="flex-grow text-center md:text-left">
            <h2 className="text-2xl font-bold text-white mb-2">{studentData.name}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-white/90">
              <div className="flex items-center justify-center md:justify-start space-x-2">
                <User className="h-4 w-4" />
                <span className="text-sm">Roll No: {studentData.rollNo}</span>
              </div>
              <div className="flex items-center justify-center md:justify-start space-x-2">
                <Mail className="h-4 w-4" />
                <span className="text-sm">{studentData.email}</span>
              </div>
              <div className="flex items-center justify-center md:justify-start space-x-2">
                <BookOpen className="h-4 w-4" />
                <span className="text-sm">Department: {studentData.department}</span>
              </div>
              <div className="flex items-center justify-center md:justify-start space-x-2">
                <GraduationCap className="h-4 w-4" />
                <span className="text-sm">Year: {studentData.year}</span>
              </div>
            </div>
          </div>
          
          {/* Overall Stats Badge */}
          <div className="flex-shrink-0 text-center bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/30">
            <Award className="h-8 w-8 text-yellow-300 mx-auto mb-2" />
            <p className="text-3xl font-bold text-white">{dailyStats.attendanceRate.toFixed(1)}%</p>
            <p className="text-sm text-white/80">Overall Attendance</p>
          </div>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-300">Total Days</p>
              <p className="text-2xl font-bold text-white">{dailyStats.totalDays}</p>
            </div>
            <Calendar className="h-8 w-8 text-blue-400" />
          </div>
        </div>
        
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-300">Present</p>
              <p className="text-2xl font-bold text-green-400">{dailyStats.present}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>
        </div>
        
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-300">Late</p>
              <p className="text-2xl font-bold text-yellow-400">{dailyStats.late}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-yellow-400" />
          </div>
        </div>
        
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-300">Absent</p>
              <p className="text-2xl font-bold text-red-400">{dailyStats.absent}</p>
            </div>
            <XCircle className="h-8 w-8 text-red-400" />
          </div>
        </div>
      </div>

      {/* View Type Selector */}
      <div className="flex justify-center space-x-4">
        <button
          onClick={() => setViewType('daily')}
          className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
            viewType === 'daily'
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
              : 'bg-white/10 text-gray-300 hover:bg-white/20'
          }`}
        >
          Daily View
        </button>
        <button
          onClick={() => setViewType('weekly')}
          className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
            viewType === 'weekly'
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
              : 'bg-white/10 text-gray-300 hover:bg-white/20'
          }`}
        >
          Weekly View
        </button>
        <button
          onClick={() => setViewType('monthly')}
          className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
            viewType === 'monthly'
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
              : 'bg-white/10 text-gray-300 hover:bg-white/20'
          }`}
        >
          Monthly View
        </button>
      </div>

      {/* Daily View - Calendar */}
      {viewType === 'daily' && (
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white flex items-center">
              <Calendar className="h-6 w-6 mr-2 text-cyan-400" />
              Daily Attendance Calendar
            </h3>
            <div className="flex items-center space-x-4">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i} value={i} className="bg-gray-800">
                    {new Date(2024, i).toLocaleDateString('en-US', { month: 'long' })}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {Array.from({ length: 5 }, (_, i) => (
                  <option key={i} value={new Date().getFullYear() - 2 + i} className="bg-gray-800">
                    {new Date().getFullYear() - 2 + i}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {/* Day Headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center font-semibold text-gray-300 py-2">
                {day}
              </div>
            ))}
            
            {/* Calendar Days */}
            {generateCalendar().map((date, index) => {
              if (!date) {
                return <div key={`empty-${index}`} className="aspect-square" />;
              }
              
              const attendance = getDayAttendance(date);
              const isToday = date.toDateString() === new Date().toDateString();
              const isFuture = date > new Date();
              
              return (
                <div
                  key={index}
                  className={`aspect-square rounded-lg border-2 p-2 flex flex-col items-center justify-center ${
                    isToday
                      ? 'border-purple-500 bg-purple-500/20'
                      : 'border-white/20 bg-white/5'
                  } ${isFuture ? 'opacity-50' : ''}`}
                >
                  <span className="text-sm text-white mb-1">{date.getDate()}</span>
                  {attendance && !isFuture && (
                    <div
                      className={`w-3 h-3 rounded-full ${
                        attendance === 'Present'
                          ? 'bg-green-500'
                          : attendance === 'Late'
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      title={attendance}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex justify-center space-x-6 mt-6">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full bg-green-500" />
              <span className="text-sm text-gray-300">Present</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full bg-yellow-500" />
              <span className="text-sm text-gray-300">Late</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full bg-red-500" />
              <span className="text-sm text-gray-300">Absent</span>
            </div>
          </div>
        </div>
      )}

      {/* Weekly View */}
      {viewType === 'weekly' && (
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center">
            <BarChart3 className="h-6 w-6 mr-2 text-cyan-400" />
            Weekly Attendance Report
          </h3>
          
          <div className="space-y-4">
            {weeklyData.map((week, index) => {
              const attendanceRate = week.total > 0 ? (week.present / week.total) * 100 : 0;
              
              return (
                <div key={index} className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-white font-medium">Week of {week.week}</span>
                    <span className="text-green-400 font-bold">{attendanceRate.toFixed(1)}%</span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-400">{week.present}</p>
                      <p className="text-xs text-gray-400">Present</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-yellow-400">{week.late}</p>
                      <p className="text-xs text-gray-400">Late</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-400">{week.absent}</p>
                      <p className="text-xs text-gray-400">Absent</p>
                    </div>
                  </div>
                  
                  <div className="w-full bg-white/20 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-green-500 to-cyan-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${attendanceRate}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Monthly View */}
      {viewType === 'monthly' && (
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center">
            <PieChart className="h-6 w-6 mr-2 text-cyan-400" />
            Monthly Attendance Report
          </h3>
          
          <div className="space-y-4">
            {monthlyData.map((month, index) => (
              <div key={index} className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-white font-medium">{month.month}</span>
                  <span className="text-green-400 font-bold">{month.attendanceRate.toFixed(1)}%</span>
                </div>
                
                <div className="grid grid-cols-4 gap-4 mb-3">
                  <div className="text-center">
                    <p className="text-xl font-bold text-blue-400">{month.total}</p>
                    <p className="text-xs text-gray-400">Total Days</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-green-400">{month.present}</p>
                    <p className="text-xs text-gray-400">Present</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-yellow-400">{month.late}</p>
                    <p className="text-xs text-gray-400">Late</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-red-400">{month.absent}</p>
                    <p className="text-xs text-gray-400">Absent</p>
                  </div>
                </div>
                
                <div className="w-full bg-white/20 rounded-full h-3">
                  <div className="flex h-3 rounded-full overflow-hidden">
                    {month.present > 0 && (
                      <div
                        className="bg-green-500"
                        style={{ width: `${(month.present / month.total) * 100}%` }}
                        title={`Present: ${month.present}`}
                      />
                    )}
                    {month.late > 0 && (
                      <div
                        className="bg-yellow-500"
                        style={{ width: `${(month.late / month.total) * 100}%` }}
                        title={`Late: ${month.late}`}
                      />
                    )}
                    {month.absent > 0 && (
                      <div
                        className="bg-red-500"
                        style={{ width: `${(month.absent / month.total) * 100}%` }}
                        title={`Absent: ${month.absent}`}
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Attendance Details */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center">
          <Clock className="h-6 w-6 mr-2 text-cyan-400" />
          Recent Attendance Records
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/20">
                <th className="text-left py-3 px-4 text-gray-300 font-medium">Date</th>
                <th className="text-left py-3 px-4 text-gray-300 font-medium">Time</th>
                <th className="text-left py-3 px-4 text-gray-300 font-medium">Status</th>
                <th className="text-left py-3 px-4 text-gray-300 font-medium">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {attendanceRecords.slice(0, 10).map((record, index) => (
                <tr key={index} className="border-b border-white/10 hover:bg-white/5">
                  <td className="py-3 px-4 text-white">
                    {new Date(record.timestamp).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-white">
                    {new Date(record.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      record.status === 'Present'
                        ? 'bg-green-500/20 text-green-400'
                        : record.status === 'Late'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {record.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-cyan-400">
                    {record.confidence ? `${(record.confidence * 100).toFixed(1)}%` : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StudentAnalytics;
