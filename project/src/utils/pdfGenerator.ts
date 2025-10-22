/**
 * PDF Report Generator for Attendance Records
 * Generates professional PDF reports with student attendance data
 */

import { Student, AttendanceRecord } from '../types';

export interface AttendanceReportData {
  date: Date;
  className: string;
  subject?: string;
  faculty: string;
  students: Array<{
    student: Student;
    status: 'Present' | 'Absent' | 'Late';
    markedAt?: Date;
    confidence?: number;
  }>;
  statistics: {
    totalStudents: number;
    present: number;
    absent: number;
    late: number;
    attendancePercentage: number;
  };
}

export class AttendanceReportGenerator {
  private static instance: AttendanceReportGenerator;

  static getInstance(): AttendanceReportGenerator {
    if (!AttendanceReportGenerator.instance) {
      AttendanceReportGenerator.instance = new AttendanceReportGenerator();
    }
    return AttendanceReportGenerator.instance;
  }

  /**
   * Generate PDF report from attendance data
   * In production, use jsPDF library
   */
  async generatePDFReport(data: AttendanceReportData): Promise<Blob> {
    console.log('[PDF Generator] Generating attendance report...');
    console.log('[PDF Generator] Date:', data.date.toLocaleDateString());
    console.log('[PDF Generator] Students:', data.students.length);

    // In real implementation, use jsPDF:
    // import jsPDF from 'jspdf';
    // import 'jspdf-autotable';
    
    const html = this.generateHTMLReport(data);
    
    // Convert HTML to PDF (simulation)
    // In production: const doc = new jsPDF();
    // doc.html(html, { callback: (doc) => doc.save('attendance.pdf') });
    
    const blob = new Blob([html], { type: 'text/html' });
    console.log('[PDF Generator] ✅ Report generated successfully');
    
    return blob;
  }

  /**
   * Generate HTML version of the report
   */
  generateHTMLReport(data: AttendanceReportData): string {
    const { date, className, subject, faculty, students, statistics } = data;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Attendance Report - ${date.toLocaleDateString()}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Arial', sans-serif;
      padding: 40px;
      background: #f5f5f5;
    }
    
    .report-container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      box-shadow: 0 0 20px rgba(0,0,0,0.1);
    }
    
    .header {
      text-align: center;
      border-bottom: 3px solid #4F46E5;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    
    .header h1 {
      color: #4F46E5;
      font-size: 28px;
      margin-bottom: 10px;
    }
    
    .header .subtitle {
      color: #666;
      font-size: 16px;
    }
    
    .info-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 30px;
      padding: 20px;
      background: #f9fafb;
      border-radius: 8px;
    }
    
    .info-item {
      display: flex;
      align-items: center;
    }
    
    .info-label {
      font-weight: bold;
      color: #374151;
      margin-right: 10px;
    }
    
    .info-value {
      color: #6B7280;
    }
    
    .statistics {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      margin-bottom: 30px;
    }
    
    .stat-card {
      padding: 20px;
      border-radius: 8px;
      text-align: center;
    }
    
    .stat-card.present {
      background: #DEF7EC;
      border: 2px solid #10B981;
    }
    
    .stat-card.absent {
      background: #FEE2E2;
      border: 2px solid #EF4444;
    }
    
    .stat-card.late {
      background: #FEF3C7;
      border: 2px solid #F59E0B;
    }
    
    .stat-card.total {
      background: #E0E7FF;
      border: 2px solid #4F46E5;
    }
    
    .stat-number {
      font-size: 32px;
      font-weight: bold;
      margin-bottom: 5px;
    }
    
    .stat-label {
      font-size: 14px;
      color: #6B7280;
      text-transform: uppercase;
    }
    
    .attendance-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    
    .attendance-table thead {
      background: #4F46E5;
      color: white;
    }
    
    .attendance-table th {
      padding: 12px;
      text-align: left;
      font-weight: 600;
    }
    
    .attendance-table td {
      padding: 12px;
      border-bottom: 1px solid #E5E7EB;
    }
    
    .attendance-table tbody tr:hover {
      background: #F9FAFB;
    }
    
    .status-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }
    
    .status-badge.present {
      background: #DEF7EC;
      color: #047857;
    }
    
    .status-badge.absent {
      background: #FEE2E2;
      color: #DC2626;
    }
    
    .status-badge.late {
      background: #FEF3C7;
      color: #D97706;
    }
    
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #E5E7EB;
      text-align: center;
      color: #6B7280;
      font-size: 12px;
    }
    
    .percentage-bar {
      width: 100%;
      height: 30px;
      background: #E5E7EB;
      border-radius: 15px;
      overflow: hidden;
      margin-top: 20px;
    }
    
    .percentage-fill {
      height: 100%;
      background: linear-gradient(90deg, #10B981, #059669);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
    }
    
    @media print {
      body {
        padding: 0;
        background: white;
      }
      
      .report-container {
        box-shadow: none;
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="report-container">
    <!-- Header -->
    <div class="header">
      <h1>📊 Attendance Report</h1>
      <p class="subtitle">Automated Face Recognition Attendance System</p>
    </div>
    
    <!-- Class Information -->
    <div class="info-section">
      <div class="info-item">
        <span class="info-label">📅 Date:</span>
        <span class="info-value">${date.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}</span>
      </div>
      <div class="info-item">
        <span class="info-label">🏫 Class:</span>
        <span class="info-value">${className}</span>
      </div>
      ${subject ? `
      <div class="info-item">
        <span class="info-label">📚 Subject:</span>
        <span class="info-value">${subject}</span>
      </div>
      ` : ''}
      <div class="info-item">
        <span class="info-label">👨‍🏫 Faculty:</span>
        <span class="info-value">${faculty}</span>
      </div>
    </div>
    
    <!-- Statistics Cards -->
    <div class="statistics">
      <div class="stat-card total">
        <div class="stat-number">${statistics.totalStudents}</div>
        <div class="stat-label">Total Students</div>
      </div>
      <div class="stat-card present">
        <div class="stat-number" style="color: #10B981">${statistics.present}</div>
        <div class="stat-label">Present</div>
      </div>
      <div class="stat-card late">
        <div class="stat-number" style="color: #F59E0B">${statistics.late}</div>
        <div class="stat-label">Late</div>
      </div>
      <div class="stat-card absent">
        <div class="stat-number" style="color: #EF4444">${statistics.absent}</div>
        <div class="stat-label">Absent</div>
      </div>
    </div>
    
    <!-- Attendance Percentage -->
    <div class="percentage-bar">
      <div class="percentage-fill" style="width: ${statistics.attendancePercentage}%">
        ${statistics.attendancePercentage.toFixed(1)}% Attendance
      </div>
    </div>
    
    <!-- Student Attendance Table -->
    <table class="attendance-table">
      <thead>
        <tr>
          <th>S.No</th>
          <th>Roll Number</th>
          <th>Student Name</th>
          <th>Department</th>
          <th>Status</th>
          <th>Time</th>
          ${students.some(s => s.confidence) ? '<th>Confidence</th>' : ''}
        </tr>
      </thead>
      <tbody>
        ${students.map((item, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${item.student.rollNo || '-'}</td>
            <td>${item.student.name}</td>
            <td>${item.student.department}</td>
            <td>
              <span class="status-badge ${item.status.toLowerCase()}">
                ${item.status}
              </span>
            </td>
            <td>${item.markedAt ? item.markedAt.toLocaleTimeString() : '-'}</td>
            ${item.confidence ? `<td>${(item.confidence * 100).toFixed(1)}%</td>` : ''}
          </tr>
        `).join('')}
      </tbody>
    </table>
    
    <!-- Footer -->
    <div class="footer">
      <p>Generated by NEOATTEND - Face Detection Attendance System</p>
      <p>Report generated on ${new Date().toLocaleString()}</p>
      <p style="margin-top: 10px; font-style: italic;">
        This is an automated report generated using AI-powered facial recognition technology
      </p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Download report as PDF
   */
  async downloadReport(data: AttendanceReportData, filename?: string): Promise<void> {
    const blob = await this.generatePDFReport(data);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `attendance_${data.date.toISOString().split('T')[0]}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log('[PDF Generator] Report downloaded:', link.download);
  }

  /**
   * Generate CSV format for Excel export
   */
  generateCSV(data: AttendanceReportData): string {
    const headers = ['S.No', 'Roll Number', 'Name', 'Department', 'Status', 'Time', 'Confidence'];
    const rows = data.students.map((item, index) => [
      index + 1,
      item.student.rollNo || '-',
      item.student.name,
      item.student.department,
      item.status,
      item.markedAt ? item.markedAt.toLocaleTimeString() : '-',
      item.confidence ? `${(item.confidence * 100).toFixed(1)}%` : '-',
    ]);

    return [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');
  }

  /**
   * Download CSV report
   */
  downloadCSV(data: AttendanceReportData, filename?: string): void {
    const csv = this.generateCSV(data);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `attendance_${data.date.toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log('[CSV Generator] Report downloaded:', link.download);
  }
}

export const reportGenerator = AttendanceReportGenerator.getInstance();
