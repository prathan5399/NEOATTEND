import { Student, AttendanceRecord } from '../types';

// Database service with localStorage persistence
class DatabaseService {
  private studentsKey = 'neoattend_students';
  private attendanceKey = 'neoattend_attendance';

  // Student management
  getStudents(): Student[] {
    const stored = localStorage.getItem(this.studentsKey);
    return stored ? JSON.parse(stored) : [];
  }

  saveStudent(student: Omit<Student, 'id' | 'createdAt'>): Student {
    const students = this.getStudents();
    const newStudent: Student = {
      ...student,
      id: this.generateId(),
      createdAt: new Date(),
    };
    
    students.push(newStudent);
    localStorage.setItem(this.studentsKey, JSON.stringify(students));
    return newStudent;
  }

  getStudentByRollNo(rollNo: string): Student | null {
    const students = this.getStudents();
    return students.find(s => s.rollNo === rollNo) || null;
  }

  // Attendance management
  getAttendanceRecords(): AttendanceRecord[] {
    const stored = localStorage.getItem(this.attendanceKey);
    const records = stored ? JSON.parse(stored) : [];
    return records.map((record: Omit<AttendanceRecord, 'timestamp'> & { timestamp: string | Date }) => ({
      ...record,
      timestamp: new Date(record.timestamp),
    }));
  }

  markAttendance(record: Omit<AttendanceRecord, 'id'>): AttendanceRecord {
    const records = this.getAttendanceRecords();
    const newRecord: AttendanceRecord = {
      ...record,
      id: this.generateId(),
    };
    
    records.push(newRecord);
    localStorage.setItem(this.attendanceKey, JSON.stringify(records));
    return newRecord;
  }

  getTodayAttendance(): AttendanceRecord[] {
    const records = this.getAttendanceRecords();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return records.filter(record => {
      const recordDate = new Date(record.timestamp);
      recordDate.setHours(0, 0, 0, 0);
      return recordDate.getTime() === today.getTime();
    });
  }

  // Generate 10-character ID with combination of letters and numbers
  private generateId(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 10; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Additional student management methods for compatibility
  addStudent(student: Omit<Student, 'id' | 'createdAt'>): Student {
    return this.saveStudent(student);
  }

  updateStudent(studentData: Student): void {
    const students = this.getStudents();
    const index = students.findIndex(s => s.id === studentData.id);
    if (index !== -1) {
      students[index] = studentData;
      localStorage.setItem(this.studentsKey, JSON.stringify(students));
    }
  }

  deleteStudent(id: string): void {
    const students = this.getStudents();
    const filteredStudents = students.filter(s => s.id !== id);
    localStorage.setItem(this.studentsKey, JSON.stringify(filteredStudents));
  }

  // Clear all data
  clearAllData() {
    localStorage.removeItem(this.studentsKey);
    localStorage.removeItem(this.attendanceKey);
  }

  // Initialize with empty data (no sample data)
  initializeSampleData() {
    // No sample data - database starts empty
    // Users will add their own data through the interface
  }
}

export const database = new DatabaseService();