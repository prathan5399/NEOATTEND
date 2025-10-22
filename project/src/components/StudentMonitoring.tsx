import React, { useState, useEffect } from 'react';
import {
  Users,
  TrendingUp,
  Calendar,
  Clock,
  Award,
  AlertCircle,
  CheckCircle,
  XCircle,
  BarChart3,
  User,
  Mail,
  BookOpen,
  GraduationCap,
  Download,
  Zap,
  ArrowLeft,
} from 'lucide-react';
import { database } from '../utils/database';
import { Student, AttendanceRecord } from '../types';

interface StudentAttendanceStats {
  student: Student;
  totalClasses: number;
  attended: number;
  present: number;
  late: number;
  absent: number;
  attendancePercentage: number;
  trend: 'improving' | 'declining' | 'stable';
  lastAttended: Date | null;
  consecutiveAbsences: number;
  weeklyAttendance: number[];
  monthlyStats: {
    month: string;
    percentage: number;
  }[];
}

const StudentMonitoring = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [studentStats, setStudentStats] = useState<StudentAttendanceStats[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentAttendanceStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('All');
  const [sortBy, setSortBy] = useState<'name' | 'attendance' | 'absences'>('attendance');

  useEffect(() => {
    loadStudentData();
  }, []);

  const loadStudentData = () => {
    const allStudents = database.getStudents().filter(s => s.role === 'student');
    const allRecords = database.getAttendanceRecords();
    
    setStudents(allStudents);
    setAttendanceRecords(allRecords);
    
    const stats = calculateStudentStats(allStudents, allRecords);
    setStudentStats(stats);
  };

  const calculateStudentStats = (
    students: Student[],
    records: AttendanceRecord[]
  ): StudentAttendanceStats[] => {
    return students.map(student => {
      const studentRecords = records.filter(r => r.studentId === student.id);
      
      const totalClasses = studentRecords.length;
      const present = studentRecords.filter(r => r.status === 'Present').length;
      const late = studentRecords.filter(r => r.status === 'Late').length;
      const absent = studentRecords.filter(r => r.status === 'Absent').length;
      const attended = present + late;
      
      const attendancePercentage = totalClasses > 0 
        ? (attended / totalClasses) * 100 
        : 0;

      // Calculate trend (last 7 days vs previous 7 days)
      const now = new Date();
      const last7Days = studentRecords.filter(r => {
        const daysAgo = Math.floor((now.getTime() - new Date(r.timestamp).getTime()) / (1000 * 60 * 60 * 24));
        return daysAgo <= 7;
      });
      const previous7Days = studentRecords.filter(r => {
        const daysAgo = Math.floor((now.getTime() - new Date(r.timestamp).getTime()) / (1000 * 60 * 60 * 24));
        return daysAgo > 7 && daysAgo <= 14;
      });

      const last7Percentage = last7Days.length > 0
        ? (last7Days.filter(r => r.status !== 'Absent').length / last7Days.length) * 100
        : 0;
      const previous7Percentage = previous7Days.length > 0
        ? (previous7Days.filter(r => r.status !== 'Absent').length / previous7Days.length) * 100
        : 0;

      let trend: 'improving' | 'declining' | 'stable' = 'stable';
      if (last7Percentage > previous7Percentage + 10) trend = 'improving';
      if (last7Percentage < previous7Percentage - 10) trend = 'declining';

      // Last attended
      const attendedRecords = studentRecords
        .filter(r => r.status !== 'Absent')
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      const lastAttended = attendedRecords.length > 0 
        ? new Date(attendedRecords[0].timestamp) 
        : null;

      // Consecutive absences
      const sortedRecords = [...studentRecords].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      let consecutiveAbsences = 0;
      for (const record of sortedRecords) {
        if (record.status === 'Absent') {
          consecutiveAbsences++;
        } else {
          break;
        }
      }

      // Weekly attendance (last 7 days)
      const weeklyAttendance = Array(7).fill(0);
      for (let i = 0; i < 7; i++) {
        const dayRecords = studentRecords.filter(r => {
          const daysAgo = Math.floor((now.getTime() - new Date(r.timestamp).getTime()) / (1000 * 60 * 60 * 24));
          return daysAgo === i;
        });
        weeklyAttendance[6 - i] = dayRecords.filter(r => r.status !== 'Absent').length > 0 ? 1 : 0;
      }

      // Monthly stats (last 3 months)
      const monthlyStats = [];
      for (let i = 0; i < 3; i++) {
        const monthDate = new Date();
        monthDate.setMonth(monthDate.getMonth() - i);
        const monthName = monthDate.toLocaleDateString('en-US', { month: 'short' });
        
        const monthRecords = studentRecords.filter(r => {
          const recordDate = new Date(r.timestamp);
          return recordDate.getMonth() === monthDate.getMonth() &&
                 recordDate.getFullYear() === monthDate.getFullYear();
        });

        const monthPercentage = monthRecords.length > 0
          ? (monthRecords.filter(r => r.status !== 'Absent').length / monthRecords.length) * 100
          : 0;

        monthlyStats.unshift({
          month: monthName,
          percentage: monthPercentage,
        });
      }

      return {
        student,
        totalClasses,
        attended,
        present,
        late,
        absent,
        attendancePercentage,
        trend,
        lastAttended,
        consecutiveAbsences,
        weeklyAttendance,
        monthlyStats,
      };
    });
  };

  const getFilteredAndSortedStudents = () => {
    let filtered = studentStats;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        stat =>
          stat.student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          stat.student.rollNo?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by department
    if (filterDepartment !== 'All') {
      filtered = filtered.filter(stat => stat.student.department === filterDepartment);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.student.name.localeCompare(b.student.name);
        case 'attendance':
          return b.attendancePercentage - a.attendancePercentage;
        case 'absences':
          return b.consecutiveAbsences - a.consecutiveAbsences;
        default:
          return 0;
      }
    });

    return filtered;
  };

  const departments = ['All', ...Array.from(new Set(students.map(s => s.department)))];
  const filteredStudents = getFilteredAndSortedStudents();

  const getAttendanceColor = (percentage: number) => {
    if (percentage >= 75) return 'text-green-400';
    if (percentage >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getAttendanceBadgeColor = (percentage: number) => {
    if (percentage >= 75) return 'bg-green-500/20 text-green-300 border-green-500/30';
    if (percentage >= 60) return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
    return 'bg-red-500/20 text-red-300 border-red-500/30';
  };

  const downloadStudentReport = (stat: StudentAttendanceStats) => {
    const reportContent = `
STUDENT ATTENDANCE REPORT
========================

Student Information:
-------------------
Name: ${stat.student.name}
Roll Number: ${stat.student.rollNo}
Email: ${stat.student.email}
Department: ${stat.student.department}
Phone: ${(stat.student as any).phone || 'N/A'}

Attendance Summary:
------------------
Total Classes: ${stat.totalClasses}
Classes Attended: ${stat.attended}
Present: ${stat.present}
Late: ${stat.late}
Absent: ${stat.absent}
Attendance Percentage: ${stat.attendancePercentage.toFixed(2)}%

Trend: ${stat.trend.toUpperCase()}
Consecutive Absences: ${stat.consecutiveAbsences}
Last Attended: ${stat.lastAttended ? stat.lastAttended.toLocaleDateString() : 'Never'}

Monthly Performance:
-------------------
${stat.monthlyStats.map(m => `${m.month}: ${m.percentage.toFixed(1)}%`).join('\n')}

Generated on: ${new Date().toLocaleString()}
    `;

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${stat.student.rollNo}_attendance_report.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 shadow-xl">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
          <Users className="w-8 h-8 mr-3" />
          Student Monitoring & Analytics
        </h1>
        <p className="text-gray-200">
          Track individual student attendance, performance, and profiles
        </p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name or roll number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Department Filter */}
          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {departments.map(dept => (
              <option key={dept} value={dept} className="bg-gray-800">
                {dept}
              </option>
            ))}
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="attendance" className="bg-gray-800">Sort by Attendance %</option>
            <option value="name" className="bg-gray-800">Sort by Name</option>
            <option value="absences" className="bg-gray-800">Sort by Absences</option>
          </select>
        </div>
      </div>

      {/* Overall Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-lg rounded-xl p-4 border-2 border-blue-400">
          <Users className="w-6 h-6 text-blue-300 mb-2" />
          <div className="text-3xl font-bold text-white">{students.length}</div>
          <div className="text-blue-200 text-sm">Total Students</div>
        </div>

        <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-lg rounded-xl p-4 border-2 border-green-400">
          <Award className="w-6 h-6 text-green-300 mb-2" />
          <div className="text-3xl font-bold text-white">
            {studentStats.filter(s => s.attendancePercentage >= 75).length}
          </div>
          <div className="text-green-200 text-sm">Above 75%</div>
        </div>

        <div className="bg-gradient-to-br from-yellow-500/20 to-amber-500/20 backdrop-blur-lg rounded-xl p-4 border-2 border-yellow-400">
          <AlertCircle className="w-6 h-6 text-yellow-300 mb-2" />
          <div className="text-3xl font-bold text-white">
            {studentStats.filter(s => s.attendancePercentage >= 60 && s.attendancePercentage < 75).length}
          </div>
          <div className="text-yellow-200 text-sm">60-75%</div>
        </div>

        <div className="bg-gradient-to-br from-red-500/20 to-pink-500/20 backdrop-blur-lg rounded-xl p-4 border-2 border-red-400">
          <XCircle className="w-6 h-6 text-red-300 mb-2" />
          <div className="text-3xl font-bold text-white">
            {studentStats.filter(s => s.attendancePercentage < 60).length}
          </div>
          <div className="text-red-200 text-sm">Below 60%</div>
        </div>
      </div>

      {/* Students Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStudents.map(stat => (
          <div
            key={stat.student.id}
            onClick={() => setSelectedStudent(stat)}
            className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:border-purple-500 transition-all duration-300 cursor-pointer transform hover:scale-105"
          >
            {/* Student Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {stat.student.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-semibold text-white">{stat.student.name}</h3>
                  <p className="text-sm text-gray-400">{stat.student.rollNo}</p>
                </div>
              </div>
              
              {/* Trend Indicator */}
              {stat.trend === 'improving' && (
                <TrendingUp className="w-5 h-5 text-green-400" />
              )}
              {stat.trend === 'declining' && (
                <AlertCircle className="w-5 h-5 text-red-400" />
              )}
            </div>

            {/* Department */}
            <div className="flex items-center text-sm text-gray-300 mb-3">
              <BookOpen className="w-4 h-4 mr-2" />
              {stat.student.department}
            </div>

            {/* Attendance Percentage */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-300">Attendance</span>
                <span className={`text-2xl font-bold ${getAttendanceColor(stat.attendancePercentage)}`}>
                  {stat.attendancePercentage.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${
                    stat.attendancePercentage >= 75
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                      : stat.attendancePercentage >= 60
                      ? 'bg-gradient-to-r from-yellow-500 to-amber-500'
                      : 'bg-gradient-to-r from-red-500 to-pink-500'
                  }`}
                  style={{ width: `${stat.attendancePercentage}%` }}
                />
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center">
                <div className="text-green-400 font-bold text-lg">{stat.present}</div>
                <div className="text-gray-400 text-xs">Present</div>
              </div>
              <div className="text-center">
                <div className="text-yellow-400 font-bold text-lg">{stat.late}</div>
                <div className="text-gray-400 text-xs">Late</div>
              </div>
              <div className="text-center">
                <div className="text-red-400 font-bold text-lg">{stat.absent}</div>
                <div className="text-gray-400 text-xs">Absent</div>
              </div>
            </div>

            {/* Weekly Attendance Bar */}
            <div className="mb-3">
              <div className="text-xs text-gray-400 mb-1">Last 7 Days</div>
              <div className="flex gap-1">
                {stat.weeklyAttendance.map((attended, i) => (
                  <div
                    key={i}
                    className={`flex-1 h-2 rounded ${
                      attended ? 'bg-green-500' : 'bg-red-500/30'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Alerts */}
            {stat.consecutiveAbsences >= 3 && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-lg px-3 py-2 text-xs text-red-300 flex items-center">
                <AlertCircle className="w-4 h-4 mr-2" />
                {stat.consecutiveAbsences} consecutive absences
              </div>
            )}

            {/* View Details Button */}
            <button className="w-full mt-3 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-sm font-medium rounded-lg transition-all duration-300">
              View Full Profile
            </button>
          </div>
        ))}
      </div>

      {/* No Results */}
      {filteredStudents.length === 0 && (
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-12 border border-white/20 text-center">
          <Users className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Students Found</h3>
          <p className="text-gray-400">Try adjusting your search or filters</p>
        </div>
      )}

      {/* Student Detail Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-gray-900 to-purple-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border-2 border-purple-500/50 shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-600 p-6 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-purple-600 font-bold text-2xl">
                  {selectedStudent.student.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">{selectedStudent.student.name}</h2>
                  <p className="text-purple-200">{selectedStudent.student.rollNo}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Personal Information */}
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center text-gray-300">
                    <Mail className="w-5 h-5 mr-3 text-purple-400" />
                    <div>
                      <div className="text-xs text-gray-500">Email</div>
                      <div>{selectedStudent.student.email}</div>
                    </div>
                  </div>
                  {/* Phone omitted as not present in Student type */}
                  <div className="flex items-center text-gray-300">
                    <GraduationCap className="w-5 h-5 mr-3 text-purple-400" />
                    <div>
                      <div className="text-xs text-gray-500">Department</div>
                      <div>{selectedStudent.student.department}</div>
                    </div>
                  </div>
                  <div className="flex items-center text-gray-300">
                    <Calendar className="w-5 h-5 mr-3 text-purple-400" />
                    <div>
                      <div className="text-xs text-gray-500">Last Attended</div>
                      <div>
                        {selectedStudent.lastAttended
                          ? selectedStudent.lastAttended.toLocaleDateString()
                          : 'Never'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Attendance Overview */}
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Attendance Overview
                </h3>
                
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-300">Overall Attendance</span>
                    <span className={`text-4xl font-bold ${getAttendanceColor(selectedStudent.attendancePercentage)}`}>
                      {selectedStudent.attendancePercentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-4">
                    <div
                      className={`h-4 rounded-full transition-all duration-500 ${
                        selectedStudent.attendancePercentage >= 75
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                          : selectedStudent.attendancePercentage >= 60
                          ? 'bg-gradient-to-r from-yellow-500 to-amber-500'
                          : 'bg-gradient-to-r from-red-500 to-pink-500'
                      }`}
                      style={{ width: `${selectedStudent.attendancePercentage}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-500/20 rounded-lg p-4 border border-blue-500/30">
                    <BarChart3 className="w-5 h-5 text-blue-400 mb-2" />
                    <div className="text-2xl font-bold text-white">{selectedStudent.totalClasses}</div>
                    <div className="text-sm text-blue-300">Total Classes</div>
                  </div>
                  <div className="bg-green-500/20 rounded-lg p-4 border border-green-500/30">
                    <CheckCircle className="w-5 h-5 text-green-400 mb-2" />
                    <div className="text-2xl font-bold text-white">{selectedStudent.present}</div>
                    <div className="text-sm text-green-300">Present</div>
                  </div>
                  <div className="bg-yellow-500/20 rounded-lg p-4 border border-yellow-500/30">
                    <Clock className="w-5 h-5 text-yellow-400 mb-2" />
                    <div className="text-2xl font-bold text-white">{selectedStudent.late}</div>
                    <div className="text-sm text-yellow-300">Late</div>
                  </div>
                  <div className="bg-red-500/20 rounded-lg p-4 border border-red-500/30">
                    <XCircle className="w-5 h-5 text-red-400 mb-2" />
                    <div className="text-2xl font-bold text-white">{selectedStudent.absent}</div>
                    <div className="text-sm text-red-300">Absent</div>
                  </div>
                </div>
              </div>

              {/* Monthly Performance */}
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Monthly Performance
                </h3>
                <div className="space-y-4">
                  {selectedStudent.monthlyStats.map((month, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-300">{month.month}</span>
                        <span className={`font-bold ${getAttendanceColor(month.percentage)}`}>
                          {month.percentage.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-white/20 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            month.percentage >= 75
                              ? 'bg-green-500'
                              : month.percentage >= 60
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${month.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trend Analysis */}
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                  <Zap className="w-5 h-5 mr-2" />
                  Trend Analysis
                </h3>
                <div className="flex items-center space-x-4">
                  {selectedStudent.trend === 'improving' && (
                    <div className="flex items-center px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-green-400 mr-2" />
                      <span className="text-green-300 font-semibold">Improving Performance</span>
                    </div>
                  )}
                  {selectedStudent.trend === 'declining' && (
                    <div className="flex items-center px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
                      <span className="text-red-300 font-semibold">Declining Performance</span>
                    </div>
                  )}
                  {selectedStudent.trend === 'stable' && (
                    <div className="flex items-center px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                      <BarChart3 className="w-5 h-5 text-blue-400 mr-2" />
                      <span className="text-blue-300 font-semibold">Stable Performance</span>
                    </div>
                  )}
                  
                  {selectedStudent.consecutiveAbsences >= 3 && (
                    <div className="flex items-center px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
                      <span className="text-red-300 font-semibold">
                        {selectedStudent.consecutiveAbsences} Consecutive Absences
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-4">
                <button
                  onClick={() => downloadStudentReport(selectedStudent)}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold rounded-lg transition-all duration-300 transform hover:scale-105"
                >
                  <Download className="w-5 h-5" />
                  Download Report
                </button>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition-all duration-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentMonitoring;
