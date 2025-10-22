import React, { useState } from 'react';
import { loadTestData, clearTestData, getDataSummary } from '../utils/testData';
import { Download, Trash2, RefreshCw, CheckCircle } from 'lucide-react';

const TestDataLoader = () => {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleLoadData = () => {
    setLoading(true);
    try {
      const result = loadTestData();
      setSummary(getDataSummary());
      setTimeout(() => setLoading(false), 500);
      alert(`✅ Successfully loaded ${result.students.length} students with ${result.totalRecords} attendance records!`);
    } catch (error) {
      setLoading(false);
      alert('❌ Error loading test data: ' + error);
    }
  };

  const handleClearData = () => {
    if (confirm('⚠️ This will delete ALL student and attendance data. Continue?')) {
      clearTestData();
      setSummary(null);
      alert('✅ All data cleared!');
    }
  };

  const handleRefreshSummary = () => {
    setSummary(getDataSummary());
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-cyan-900 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
          <h1 className="text-3xl font-bold text-white mb-2">🧪 Test Data Loader</h1>
          <p className="text-gray-300">
            Load sample data to test the Faculty Dashboard features
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={handleLoadData}
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            <Download className="w-5 h-5" />
            {loading ? 'Loading...' : 'Load Test Data'}
          </button>

          <button
            onClick={handleRefreshSummary}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            <RefreshCw className="w-5 h-5" />
            Refresh Summary
          </button>

          <button
            onClick={handleClearData}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            <Trash2 className="w-5 h-5" />
            Clear All Data
          </button>
        </div>

        {/* Test Data Details */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <h2 className="text-xl font-bold text-white mb-4">📋 What Gets Loaded</h2>
          <div className="space-y-3 text-gray-300">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">10 Students:</strong>
                <ul className="ml-4 mt-1 space-y-1 text-sm">
                  <li>• 4 Computer Science students (CS001-CS004)</li>
                  <li>• 3 Electronics students (EC001-EC003)</li>
                  <li>• 3 Mechanical students (ME001-ME003)</li>
                </ul>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">7 Days of Attendance History:</strong>
                <ul className="ml-4 mt-1 space-y-1 text-sm">
                  <li>• ~85% attendance rate (realistic data)</li>
                  <li>• Mix of Present and Late records</li>
                  <li>• Random distribution across students</li>
                </ul>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Today's Attendance:</strong>
                <ul className="ml-4 mt-1 space-y-1 text-sm">
                  <li>• 6 Students Present (on time)</li>
                  <li>• 2 Students Late (15-30 min)</li>
                  <li>• 2 Students Absent (no record)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Card */}
        {summary && (
          <div className="bg-gradient-to-br from-purple-500/20 to-cyan-500/20 backdrop-blur-lg rounded-xl p-6 border border-purple-500/30">
            <h2 className="text-xl font-bold text-white mb-4">📊 Current Data Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-white/10 rounded-lg p-4">
                <div className="text-3xl font-bold text-white">{summary.totalStudents}</div>
                <div className="text-sm text-gray-300">Total Students</div>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <div className="text-3xl font-bold text-white">{summary.totalAttendanceRecords}</div>
                <div className="text-sm text-gray-300">Total Records</div>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <div className="text-3xl font-bold text-white">{summary.todayRecords}</div>
                <div className="text-sm text-gray-300">Today's Records</div>
              </div>
              <div className="bg-green-500/20 rounded-lg p-4 border border-green-500/30">
                <div className="text-3xl font-bold text-green-300">{summary.todayPresent}</div>
                <div className="text-sm text-green-200">Present Today</div>
              </div>
              <div className="bg-yellow-500/20 rounded-lg p-4 border border-yellow-500/30">
                <div className="text-3xl font-bold text-yellow-300">{summary.todayLate}</div>
                <div className="text-sm text-yellow-200">Late Today</div>
              </div>
              <div className="bg-red-500/20 rounded-lg p-4 border border-red-500/30">
                <div className="text-3xl font-bold text-red-300">{summary.todayAbsent}</div>
                <div className="text-sm text-red-200">Absent Today</div>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <h2 className="text-xl font-bold text-white mb-4">🎯 Testing Instructions</h2>
          <ol className="space-y-2 text-gray-300 list-decimal list-inside">
            <li className="leading-relaxed">
              Click <strong className="text-white">"Load Test Data"</strong> to populate the database
            </li>
            <li className="leading-relaxed">
              Navigate to <strong className="text-white">"Faculty Dashboard"</strong> to see all features:
              <ul className="ml-8 mt-1 space-y-1 text-sm">
                <li>• View all 10 students in the table</li>
                <li>• Check today's stats: 6 Present, 2 Late, 2 Absent</li>
                <li>• Switch to Weekly view to see 7 days of data</li>
                <li>• Test Manual Edit to mark absent students</li>
              </ul>
            </li>
            <li className="leading-relaxed">
              Test <strong className="text-white">"Download Reports"</strong>:
              <ul className="ml-8 mt-1 space-y-1 text-sm">
                <li>• Click "PDF" button to download HTML report</li>
                <li>• Click "CSV" button to export Excel file</li>
              </ul>
            </li>
            <li className="leading-relaxed">
              When done testing, click <strong className="text-white">"Clear All Data"</strong> to reset
            </li>
          </ol>
        </div>

        {/* Back Button */}
        <div className="flex justify-center">
          <a
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all duration-300"
          >
            ← Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
};

export default TestDataLoader;
