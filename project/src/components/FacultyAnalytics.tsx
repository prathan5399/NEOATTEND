import React, { useState, useEffect } from 'react';
import { 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock,
  Camera,
  Edit3,
  Save,
  Download,
  FileText,
  AlertCircle,
  UserCheck
} from 'lucide-react';
import { database } from '../utils/database';
import { reportGenerator } from '../utils/pdfGenerator';
import { Student, AttendanceRecord } from '../types';

interface TodaySessionStudent {
  student: Student;
  status: 'Present' | 'Late' | 'Absent';
  markedBy: 'face-recognition' | 'manual' | 'none';
  timestamp?: Date;
  confidence?: number;
}

const FacultyAnalytics = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [sessionData, setSessionData] = useState<TodaySessionStudent[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedStatuses, setEditedStatuses] = useState<Map<string, 'Present' | 'Late' | 'Absent'>>(new Map());
  const [stats, setStats] = useState({
    total: 0,
    recognized: 0,
    notRecognized: 0,
    present: 0,
    late: 0,
    absent: 0,
    recognitionRate: 0,
    attendanceRate: 0,
  });

  useEffect(() => {
    loadTodaySession();
  }, []);

  const loadTodaySession = () => {
    const allStudents = database.getStudents().filter(s => s.role === 'student');
    const todayAttendance = database.getTodayAttendance();
    
    // Create attendance map
    const attendanceMap = new Map<string, AttendanceRecord>();
    todayAttendance.forEach(record => {
      attendanceMap.set(record.studentId, record);
    });

    // Build session data
    const sessionStudents: TodaySessionStudent[] = allStudents.map(student => {
      const record = attendanceMap.get(student.id);
      
      if (record) {
        return {
          student,
          status: record.status as 'Present' | 'Late' | 'Absent',
          markedBy: record.confidence === 1.0 ? 'manual' : 'face-recognition',
          timestamp: record.timestamp,
          confidence: record.confidence,
        };
      } else {
        return {
          student,
          status: 'Absent',
          markedBy: 'none',
        };
      }
    });

    setStudents(allStudents);
    setSessionData(sessionStudents);
    calculateStats(sessionStudents);
  };

  const calculateStats = (data: TodaySessionStudent[]) => {
    const total = data.length;
    const recognized = data.filter(d => d.markedBy === 'face-recognition').length;
    const notRecognized = data.filter(d => d.markedBy === 'none').length;
    const present = data.filter(d => d.status === 'Present').length;
    const late = data.filter(d => d.status === 'Late').length;
    const absent = data.filter(d => d.status === 'Absent').length;
    const recognitionRate = total > 0 ? (recognized / total) * 100 : 0;
    const attendanceRate = total > 0 ? ((present + late) / total) * 100 : 0;

    setStats({
      total,
      recognized,
      notRecognized,
      present,
      late,
      absent,
      recognitionRate,
      attendanceRate,
    });
  };

  const handleStatusChange = (studentId: string, status: 'Present' | 'Late' | 'Absent') => {
    const newMap = new Map(editedStatuses);
    newMap.set(studentId, status);
    setEditedStatuses(newMap);
  };

  const saveManualAttendance = () => {
    const now = new Date();
    let updatedCount = 0;

    editedStatuses.forEach((status, studentId) => {
      const existing = database.getTodayAttendance().find(r => r.studentId === studentId);
      
      if (!existing && status !== 'Absent') {
        const student = students.find(s => s.id === studentId);
        if (student) {
          database.markAttendance({
            studentId,
            rollNo: student.rollNo || 'N/A',
            name: student.name,
            timestamp: now,
            location: {
              latitude: 12.9716,
              longitude: 77.5946,
              address: 'College Campus',
            },
            status,
            confidence: 1.0, // Manual marking
            subject: 'Today\'s Session',
          } as any);
          updatedCount++;
        }
      }
    });

    setIsEditMode(false);
    setEditedStatuses(new Map());
    loadTodaySession();
    alert(`✅ Successfully marked attendance for ${updatedCount} student(s)`);
  };

  const downloadPDF = async () => {
    const faculty = JSON.parse(localStorage.getItem('user') || '{}');
    const today = new Date();
    
    const presentStudents = sessionData.filter(
      item => item.status === 'Present' || item.status === 'Late'
    );

    const reportData = {
      date: today,
      className: 'All Students',
      subject: 'Today\'s Attendance Session',
      faculty: faculty.name || 'Faculty',
      students: presentStudents.map(item => ({
        student: item.student,
        status: item.status,
        markedAt: item.timestamp,
        confidence: item.confidence,
      })),
      statistics: {
        totalStudents: stats.total,
        present: stats.present,
        absent: stats.absent,
        late: stats.late,
        attendancePercentage: stats.attendanceRate,
      },
    };

    await reportGenerator.downloadReport(
      reportData,
      `today_session_${today.toISOString().split('T')[0]}.html`
    );
  };

  const downloadCSV = () => {
    const faculty = JSON.parse(localStorage.getItem('user') || '{}');
    const today = new Date();
    
    const presentStudents = sessionData.filter(
      item => item.status === 'Present' || item.status === 'Late'
    );

    const reportData = {
      date: today,
      className: 'All Students',
      subject: 'Today\'s Attendance Session',
      faculty: faculty.name || 'Faculty',
      students: presentStudents.map(item => ({
        student: item.student,
        status: item.status,
        markedAt: item.timestamp,
        confidence: item.confidence,
      })),
      statistics: {
        totalStudents: stats.total,
        present: stats.present,
        absent: stats.absent,
        late: stats.late,
        attendancePercentage: stats.attendanceRate,
      },
    };

    reportGenerator.downloadCSV(
      reportData,
      `today_session_${today.toISOString().split('T')[0]}.csv`
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-cyan-600 rounded-xl p-6 shadow-xl">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
          <UserCheck className="w-8 h-8 mr-3" />
          Today's Attendance Session
        </h1>
        <p className="text-gray-200">
          Face Recognition Results & Manual Marking
        </p>
        <p className="text-sm text-gray-300 mt-1">
          {new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-lg rounded-xl p-4 border-2 border-blue-400">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-6 h-6 text-blue-300" />
          </div>
          <div className="text-3xl font-bold text-white">{stats.total}</div>
          <div className="text-blue-200 text-sm">Total Students</div>
        </div>

        <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-lg rounded-xl p-4 border-2 border-purple-400">
          <div className="flex items-center justify-between mb-2">
            <Camera className="w-6 h-6 text-purple-300" />
          </div>
          <div className="text-3xl font-bold text-white">{stats.recognized}</div>
          <div className="text-purple-200 text-sm">Face Recognized</div>
        </div>

        <div className="bg-gradient-to-br from-orange-500/20 to-red-500/20 backdrop-blur-lg rounded-xl p-4 border-2 border-orange-400">
          <div className="flex items-center justify-between mb-2">
            <AlertCircle className="w-6 h-6 text-orange-300" />
          </div>
          <div className="text-3xl font-bold text-white">{stats.notRecognized}</div>
          <div className="text-orange-200 text-sm">Not Recognized</div>
        </div>

        <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-lg rounded-xl p-4 border-2 border-green-400">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-6 h-6 text-green-300" />
          </div>
          <div className="text-3xl font-bold text-white">{stats.present}</div>
          <div className="text-green-200 text-sm">Present</div>
        </div>

        <div className="bg-gradient-to-br from-yellow-500/20 to-amber-500/20 backdrop-blur-lg rounded-xl p-4 border-2 border-yellow-400">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-6 h-6 text-yellow-300" />
          </div>
          <div className="text-3xl font-bold text-white">{stats.late}</div>
          <div className="text-yellow-200 text-sm">Late</div>
        </div>

        <div className="bg-gradient-to-br from-red-500/20 to-pink-500/20 backdrop-blur-lg rounded-xl p-4 border-2 border-red-400">
          <div className="flex items-center justify-between mb-2">
            <XCircle className="w-6 h-6 text-red-300" />
          </div>
          <div className="text-3xl font-bold text-white">{stats.absent}</div>
          <div className="text-red-200 text-sm">Absent</div>
        </div>
      </div>

      {/* Recognition & Attendance Rate */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <h3 className="text-lg font-semibold text-white mb-4">Face Recognition Rate</h3>
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-300">Recognized</span>
            <span className="text-2xl font-bold text-purple-400">{stats.recognitionRate.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${stats.recognitionRate}%` }}
            />
          </div>
          <p className="text-sm text-gray-400 mt-2">
            {stats.recognized} out of {stats.total} students recognized by camera
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <h3 className="text-lg font-semibold text-white mb-4">Attendance Rate</h3>
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-300">Present + Late</span>
            <span className="text-2xl font-bold text-green-400">{stats.attendanceRate.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${stats.attendanceRate}%` }}
            />
          </div>
          <p className="text-sm text-gray-400 mt-2">
            {stats.present + stats.late} out of {stats.total} students attended today
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4">
        <button
          onClick={() => setIsEditMode(!isEditMode)}
          className={`flex items-center gap-2 px-6 py-3 ${
            isEditMode
              ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
              : 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700'
          } text-white font-semibold rounded-lg transition-all duration-300 shadow-lg transform hover:scale-105`}
        >
          {isEditMode ? <Save className="w-5 h-5" /> : <Edit3 className="w-5 h-5" />}
          {isEditMode ? 'Save Manual Attendance' : 'Mark Manual Attendance'}
        </button>

        {isEditMode && (
          <button
            onClick={saveManualAttendance}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-lg transition-all duration-300 shadow-lg transform hover:scale-105"
          >
            <Save className="w-5 h-5" />
            Save All Changes
          </button>
        )}

        <button
          onClick={downloadPDF}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-semibold rounded-lg transition-all duration-300 shadow-lg transform hover:scale-105"
        >
          <FileText className="w-5 h-5" />
          Download PDF
        </button>

        <button
          onClick={downloadCSV}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold rounded-lg transition-all duration-300 shadow-lg transform hover:scale-105"
        >
          <Download className="w-5 h-5" />
          Download CSV
        </button>

        <button
          onClick={loadTodaySession}
          className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition-all duration-300"
        >
          Refresh Data
        </button>
      </div>

      {/* Students Table */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
          <Users className="w-6 h-6 mr-2" />
          Today's Session - All Students
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-white/5 border-b border-white/10">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  S.No
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Roll Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Marked By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Confidence
                </th>
                {isEditMode && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Action
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {sessionData.map((item, index) => {
                const editedStatus = editedStatuses.get(item.student.id);
                const currentStatus = editedStatus || item.status;

                return (
                  <tr 
                    key={item.student.id} 
                    className={`hover:bg-white/5 transition-colors ${
                      item.markedBy === 'none' ? 'bg-red-500/5' : ''
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                      {item.student.rollNo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {item.student.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {item.student.department}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          currentStatus === 'Present'
                            ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                            : currentStatus === 'Late'
                            ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                            : 'bg-red-500/20 text-red-300 border border-red-500/30'
                        }`}
                      >
                        {currentStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {item.markedBy === 'face-recognition' ? (
                        <span className="flex items-center text-purple-400">
                          <Camera className="w-4 h-4 mr-1" />
                          Face Recognition
                        </span>
                      ) : item.markedBy === 'manual' ? (
                        <span className="flex items-center text-blue-400">
                          <Edit3 className="w-4 h-4 mr-1" />
                          Manual
                        </span>
                      ) : (
                        <span className="flex items-center text-gray-500">
                          <XCircle className="w-4 h-4 mr-1" />
                          Not Marked
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-cyan-400">
                      {item.confidence ? `${(item.confidence * 100).toFixed(1)}%` : '-'}
                    </td>
                    {isEditMode && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <select
                          value={currentStatus}
                          onChange={(e) =>
                            handleStatusChange(
                              item.student.id,
                              e.target.value as 'Present' | 'Late' | 'Absent'
                            )
                          }
                          className="px-3 py-1 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="Present" className="bg-gray-800">
                            Present
                          </option>
                          <option value="Late" className="bg-gray-800">
                            Late
                          </option>
                          <option value="Absent" className="bg-gray-800">
                            Absent
                          </option>
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

      {/* Information Banner */}
      <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-lg rounded-xl p-6 border border-blue-500/30">
        <div className="flex items-start">
          <AlertCircle className="w-6 h-6 text-blue-400 mr-3 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold text-white mb-2">Today's Attendance Session Features</h3>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>✅ <strong>Face Recognition:</strong> Students marked automatically by camera with confidence scores</li>
              <li>✅ <strong>Manual Marking:</strong> Faculty can mark attendance for unrecognized students</li>
              <li>✅ <strong>Total Students Section:</strong> View complete list with all students</li>
              <li>✅ <strong>Download PDF:</strong> Export report of all present students for today's session</li>
              <li>✅ <strong>Real-time Stats:</strong> See recognition rate, attendance rate, and status breakdown</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacultyAnalytics;
