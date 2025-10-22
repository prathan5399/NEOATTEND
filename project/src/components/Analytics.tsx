import React, { useState, useEffect, useCallback } from 'react';
import { BarChart3, TrendingUp, Download, Calendar, Clock, Users, MapPin } from 'lucide-react';
import { database } from '../utils/database';
import { Student } from '../types';

export default function Analytics() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [analytics, setAnalytics] = useState({
    totalAttendance: 0,
    averageAttendance: 0,
    punctualityRate: 0,
    departmentStats: [] as Array<{ department: string; rate: number; count: number }>,
    dailyStats: [] as Array<{ date: string; present: number; late: number; absent: number }>,
    timeDistribution: [] as Array<{ hour: number; count: number }>,
  });

  const loadAnalyticsData = useCallback(() => {
    const allStudents = database.getStudents();
    const allAttendance = database.getAttendanceRecords();
    
    setStudents(allStudents);

    // Calculate period-based data
    const now = new Date();
    const startDate = new Date();
    
    switch (selectedPeriod) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'semester':
        startDate.setMonth(now.getMonth() - 6);
        break;
    }

    const periodAttendance = allAttendance.filter(
      record => new Date(record.timestamp) >= startDate
    );

    // Calculate analytics
    const totalAttendance = periodAttendance.length;
    const presentCount = periodAttendance.filter(r => r.status === 'Present').length;
    const averageAttendance = allStudents.length > 0 
      ? (totalAttendance / allStudents.length) * 100 
      : 0;
    const punctualityRate = totalAttendance > 0 
      ? (presentCount / totalAttendance) * 100 
      : 0;

    // Department statistics
    const departmentMap = new Map<string, { total: number; students: number }>();
    allStudents.forEach(student => {
      const dept = student.department;
      const attendanceCount = periodAttendance.filter(a => a.studentId === student.id).length;
      
      if (!departmentMap.has(dept)) {
        departmentMap.set(dept, { total: 0, students: 0 });
      }
      
      const current = departmentMap.get(dept)!;
      current.total += attendanceCount;
      current.students += 1;
    });

    const departmentStats = Array.from(departmentMap.entries()).map(([department, data]) => ({
      department,
      rate: data.students > 0 ? (data.total / data.students) * 100 : 0,
      count: data.total,
    }));

    // Daily statistics for the last 7 days
    const dailyStats = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayAttendance = allAttendance.filter(record => {
        const recordDate = new Date(record.timestamp).toISOString().split('T')[0];
        return recordDate === dateStr;
      });

      const present = dayAttendance.filter(r => r.status === 'Present').length;
      const late = dayAttendance.filter(r => r.status === 'Late').length;
      const absent = Math.max(0, allStudents.length - (present + late));

      dailyStats.push({
        date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        present,
        late,
        absent,
      });
    }

    // Time distribution (hourly)
    const timeDistribution = Array.from({ length: 24 }, (_, hour) => {
      const count = periodAttendance.filter(record => {
        const recordHour = new Date(record.timestamp).getHours();
        return recordHour === hour;
      }).length;
      
      return { hour, count };
    }).filter(item => item.count > 0);

    setAnalytics({
      totalAttendance,
      averageAttendance,
      punctualityRate,
      departmentStats,
      dailyStats,
      timeDistribution,
    });
  }, [selectedPeriod]);

  useEffect(() => {
    loadAnalyticsData();
  }, [loadAnalyticsData, selectedPeriod]);

  const generateReport = () => {
    // In a real application, this would generate a PDF report
    const reportData = {
      period: selectedPeriod,
      generatedAt: new Date().toISOString(),
      summary: {
        totalStudents: students.length,
        totalAttendance: analytics.totalAttendance,
        averageAttendance: analytics.averageAttendance.toFixed(1),
        punctualityRate: analytics.punctualityRate.toFixed(1),
      },
      departmentStats: analytics.departmentStats,
      dailyStats: analytics.dailyStats,
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `neoattend-report-${selectedPeriod}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    alert('Report downloaded! In a production system, this would be a formatted PDF.');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 rounded-xl p-6 text-white shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2 flex items-center">
              <BarChart3 className="h-7 w-7 mr-3" />
              Attendance Analytics
            </h2>
            <p className="text-purple-100">Comprehensive insights and attendance trends</p>
          </div>
          <div className="mt-4 md:mt-0 flex space-x-3">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="bg-white/20 backdrop-blur-sm text-white border border-white/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              <option value="week" className="bg-gray-800 text-white">Last Week</option>
              <option value="month" className="bg-gray-800 text-white">Last Month</option>
              <option value="semester" className="bg-gray-800 text-white">Last Semester</option>
            </select>
            <button
              onClick={generateReport}
              className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2 transform hover:scale-105"
            >
              <Download className="h-4 w-4" />
              <span>Export Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl p-6 border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300 mb-1">Total Records</p>
              <p className="text-3xl font-bold text-cyan-400">{analytics.totalAttendance}</p>
            </div>
            <div className="p-3 bg-cyan-500/20 rounded-full backdrop-blur-sm">
              <Calendar className="h-6 w-6 text-cyan-400" />
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl p-6 border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300 mb-1">Avg Attendance</p>
              <p className="text-3xl font-bold text-green-400">{analytics.averageAttendance.toFixed(1)}%</p>
            </div>
            <div className="p-3 bg-green-500/20 rounded-full backdrop-blur-sm">
              <TrendingUp className="h-6 w-6 text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl p-6 border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300 mb-1">Punctuality</p>
              <p className="text-3xl font-bold text-purple-400">{analytics.punctualityRate.toFixed(1)}%</p>
            </div>
            <div className="p-3 bg-purple-500/20 rounded-full backdrop-blur-sm">
              <Clock className="h-6 w-6 text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl p-6 border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300 mb-1">Active Students</p>
              <p className="text-3xl font-bold text-pink-400">{students.length}</p>
            </div>
            <div className="p-3 bg-pink-500/20 rounded-full backdrop-blur-sm">
              <Users className="h-6 w-6 text-pink-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Attendance Chart */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl p-6 border border-white/20">
          <h3 className="text-lg font-semibold text-white mb-4">Daily Attendance Trends</h3>
          <div className="space-y-3">
            {analytics.dailyStats.map((day, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-300 w-20">{day.date}</span>
                <div className="flex-1 mx-4">
                  <div className="flex h-6 bg-white/20 rounded-full overflow-hidden">
                    <div 
                      className="bg-green-500" 
                      style={{ width: `${(day.present / (day.present + day.late + day.absent)) * 100}%` }}
                      title={`Present: ${day.present}`}
                    />
                    <div 
                      className="bg-yellow-500" 
                      style={{ width: `${(day.late / (day.present + day.late + day.absent)) * 100}%` }}
                      title={`Late: ${day.late}`}
                    />
                    <div 
                      className="bg-red-500" 
                      style={{ width: `${(day.absent / (day.present + day.late + day.absent)) * 100}%` }}
                      title={`Absent: ${day.absent}`}
                    />
                  </div>
                </div>
                <div className="flex space-x-2 text-xs">
                  <span className="text-green-400 font-medium">{day.present}</span>
                  <span className="text-yellow-400 font-medium">{day.late}</span>
                  <span className="text-red-400 font-medium">{day.absent}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-center space-x-6 mt-4 text-xs">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-green-500 rounded-full" />
              <span className="text-gray-300">Present</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-yellow-500 rounded-full" />
              <span className="text-gray-300">Late</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-red-500 rounded-full" />
              <span className="text-gray-300">Absent</span>
            </div>
          </div>
        </div>

        {/* Department Statistics */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl p-6 border border-white/20">
          <h3 className="text-lg font-semibold text-white mb-4">Department Performance</h3>
          <div className="space-y-4">
            {analytics.departmentStats.map((dept, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-300">{dept.department}</span>
                  <span className="text-sm font-bold text-cyan-400">{dept.rate.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-cyan-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(dept.rate, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>{dept.count} records</span>
                  <span>{dept.rate > 80 ? '🎯' : dept.rate > 60 ? '📈' : '⚠️'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Time Distribution */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl p-6 border border-white/20">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Clock className="h-5 w-5 mr-2 text-cyan-400" />
            Peak Hours
          </h3>
          <div className="space-y-3">
            {analytics.timeDistribution
              .sort((a, b) => b.count - a.count)
              .slice(0, 6)
              .map((time, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-300">
                    {time.hour.toString().padStart(2, '0')}:00 - {(time.hour + 1).toString().padStart(2, '0')}:00
                  </span>
                  <div className="flex items-center space-x-2">
                    <div className="w-32 bg-white/20 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-green-500 to-cyan-500 h-2 rounded-full"
                        style={{ 
                          width: `${(time.count / Math.max(...analytics.timeDistribution.map(t => t.count))) * 100}%` 
                        }}
                      />
                    </div>
                    <span className="text-sm font-bold text-cyan-400 w-8">{time.count}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Recent Insights */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl p-6 border border-white/20">
          <h3 className="text-lg font-semibold text-white mb-4">Insights & Recommendations</h3>
          <div className="space-y-3">
            <div className="p-3 bg-cyan-500/20 rounded-lg border border-cyan-500/30 backdrop-blur-sm">
              <div className="flex items-center space-x-2 mb-1">
                <TrendingUp className="h-4 w-4 text-cyan-400" />
                <span className="text-sm font-medium text-cyan-100">Attendance Trend</span>
              </div>
              <p className="text-xs text-cyan-200">
                {analytics.averageAttendance > 80 
                  ? 'Excellent attendance rate! Keep it up.' 
                  : analytics.averageAttendance > 60 
                    ? 'Good attendance. Consider improvement strategies.'
                    : 'Low attendance detected. Immediate action recommended.'
                }
              </p>
            </div>

            <div className="p-3 bg-green-500/20 rounded-lg border border-green-500/30 backdrop-blur-sm">
              <div className="flex items-center space-x-2 mb-1">
                <Clock className="h-4 w-4 text-green-400" />
                <span className="text-sm font-medium text-green-100">Punctuality</span>
              </div>
              <p className="text-xs text-green-200">
                {analytics.punctualityRate > 85 
                  ? 'Great punctuality across all students.'
                  : 'Consider implementing punctuality incentives.'
                }
              </p>
            </div>

            <div className="p-3 bg-purple-500/20 rounded-lg border border-purple-500/30 backdrop-blur-sm">
              <div className="flex items-center space-x-2 mb-1">
                <MapPin className="h-4 w-4 text-purple-400" />
                <span className="text-sm font-medium text-purple-100">Location Data</span>
              </div>
              <p className="text-xs text-purple-200">
                All attendance records include precise location tracking for verification.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}