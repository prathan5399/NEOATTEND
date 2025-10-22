import { database } from './database';
import { Student, AttendanceRecord } from '../types';

/**
 * Initialize test data if database is empty
 * This runs automatically on app start
 */
export const initializeTestData = () => {
  const existingStudents = database.getStudents();
  
  // Only load if database is empty
  if (existingStudents.length === 0) {
    console.log('🔄 Database is empty. Loading test data...');
    loadTestStudents();
    return true;
  }
  
  console.log(`✅ Database already has ${existingStudents.length} students`);
  return false;
};

/**
 * Load 10 test students with attendance data
 */
const loadTestStudents = () => {
  console.log('📚 Creating 10 test students...');
  
  const testStudents = [
    { name: 'Rahul Kumar', rollNo: 'CS001', department: 'Computer Science', email: 'rahul.kumar@college.edu' },
    { name: 'Priya Sharma', rollNo: 'CS002', department: 'Computer Science', email: 'priya.sharma@college.edu' },
    { name: 'Amit Patel', rollNo: 'CS003', department: 'Computer Science', email: 'amit.patel@college.edu' },
    { name: 'Sneha Reddy', rollNo: 'EC001', department: 'Electronics', email: 'sneha.reddy@college.edu' },
    { name: 'Vikram Singh', rollNo: 'EC002', department: 'Electronics', email: 'vikram.singh@college.edu' },
    { name: 'Anjali Gupta', rollNo: 'ME001', department: 'Mechanical', email: 'anjali.gupta@college.edu' },
    { name: 'Arjun Verma', rollNo: 'ME002', department: 'Mechanical', email: 'arjun.verma@college.edu' },
    { name: 'Kavya Iyer', rollNo: 'CS004', department: 'Computer Science', email: 'kavya.iyer@college.edu' },
    { name: 'Rohan Desai', rollNo: 'EC003', department: 'Electronics', email: 'rohan.desai@college.edu' },
    { name: 'Meera Nair', rollNo: 'ME003', department: 'Mechanical', email: 'meera.nair@college.edu' },
  ];

  const createdStudents: Student[] = [];
  
  testStudents.forEach((studentData) => {
    const student = database.addStudent({
      ...studentData,
      role: 'student',
      faceRegistered: true,
      photoCapturedFromCamera: true,
    });
    createdStudents.push(student);
    console.log(`✅ Added: ${student.name} (${student.rollNo})`);
  });

  // Generate attendance history for past 7 days
  generatePastWeekAttendance(createdStudents);
  
  // Generate today's attendance (6 present, 2 late, 2 absent)
  generateTodayAttendance(createdStudents);
  
  console.log('✅ Test data loaded successfully!');
  console.log(`📊 Total Students: ${createdStudents.length}`);
  console.log(`📅 Total Attendance Records: ${database.getAttendanceRecords().length}`);
};

/**
 * Generate attendance for past 7 days
 */
const generatePastWeekAttendance = (students: Student[]) => {
  const today = new Date();
  
  for (let dayOffset = 7; dayOffset >= 1; dayOffset--) {
    const date = new Date(today);
    date.setDate(today.getDate() - dayOffset);
    date.setHours(9, 0, 0, 0);

    students.forEach((student) => {
      // 85% chance of being present
      if (Math.random() > 0.15) {
        const isLate = Math.random() > 0.85;
        const timestamp = new Date(date);
        
        if (isLate) {
          timestamp.setMinutes(timestamp.getMinutes() + 15 + Math.floor(Math.random() * 30));
        } else {
          timestamp.setMinutes(timestamp.getMinutes() + Math.floor(Math.random() * 10));
        }
        
        database.markAttendance({
          studentId: student.id,
          rollNo: student.rollNo || 'N/A',
          name: student.name,
          timestamp,
          location: {
            latitude: 12.9716,
            longitude: 77.5946,
            address: 'College Campus',
          },
          status: isLate ? 'Late' : 'Present',
          confidence: 0.85 + Math.random() * 0.15,
          subject: 'General',
        } as any);
      }
    });
  }
  
  console.log('📅 Generated 7 days of attendance history');
};

/**
 * Generate today's attendance
 * 6 Present, 2 Late, 2 Absent
 */
const generateTodayAttendance = (students: Student[]) => {
  const now = new Date();
  now.setHours(9, 0, 0, 0);

  students.forEach((student, index) => {
    if (index < 6) {
      // Present (first 6 students)
      const timestamp = new Date(now);
      timestamp.setMinutes(timestamp.getMinutes() + Math.floor(Math.random() * 5));
      
      database.markAttendance({
        studentId: student.id,
        rollNo: student.rollNo || 'N/A',
        name: student.name,
        timestamp,
        location: {
          latitude: 12.9716,
          longitude: 77.5946,
          address: 'College Campus',
        },
        status: 'Present',
        confidence: 0.90 + Math.random() * 0.10,
        subject: 'General',
      } as any);
      
      console.log(`✅ ${student.name}: Present`);
      
    } else if (index < 8) {
      // Late (next 2 students)
      const timestamp = new Date(now);
      timestamp.setMinutes(timestamp.getMinutes() + 20 + Math.floor(Math.random() * 20));
      
      database.markAttendance({
        studentId: student.id,
        rollNo: student.rollNo || 'N/A',
        name: student.name,
        timestamp,
        location: {
          latitude: 12.9716,
          longitude: 77.5946,
          address: 'College Campus',
        },
        status: 'Late',
        confidence: 0.88 + Math.random() * 0.10,
        subject: 'General',
      } as any);
      
      console.log(`⏰ ${student.name}: Late`);
      
    } else {
      // Absent (last 2 students - no record)
      console.log(`❌ ${student.name}: Absent`);
    }
  });
  
  console.log('📊 Today: 6 Present, 2 Late, 2 Absent');
};

/**
 * Force reload test data (clears existing)
 */
export const forceReloadTestData = () => {
  console.log('🗑️ Clearing existing data...');
  database.clearAllData();
  console.log('🔄 Loading fresh test data...');
  loadTestStudents();
  console.log('✅ Test data reloaded!');
};

// Make available in browser console for manual testing
if (typeof window !== 'undefined') {
  (window as any).reloadTestData = forceReloadTestData;
  (window as any).initTestData = initializeTestData;
}
