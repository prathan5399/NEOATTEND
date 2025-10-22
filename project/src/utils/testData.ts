import { database } from './database';
import { Student, AttendanceRecord } from '../types';

/**
 * Load test data for development and testing
 * Creates 10 students with attendance records
 */
export const loadTestData = () => {
  console.log('🔄 Loading test data...');

  // Clear existing data (optional - comment out if you want to keep existing data)
  // localStorage.removeItem('students');
  // localStorage.removeItem('attendance');

  // Create 10 test students
  const testStudents: Omit<Student, 'id' | 'createdAt'>[] = [
    {
      name: 'Rahul Kumar',
      rollNo: 'CS001',
      department: 'Computer Science',
      email: 'rahul.kumar@college.edu',
      role: 'student',
      faceRegistered: true,
      photoCapturedFromCamera: true,
    },
    {
      name: 'Priya Sharma',
      rollNo: 'CS002',
      department: 'Computer Science',
      email: 'priya.sharma@college.edu',
      role: 'student',
      faceRegistered: true,
      photoCapturedFromCamera: true,
    },
    {
      name: 'Amit Patel',
      rollNo: 'CS003',
      department: 'Computer Science',
      email: 'amit.patel@college.edu',
      role: 'student',
      faceRegistered: true,
      photoCapturedFromCamera: true,
    },
    {
      name: 'Sneha Reddy',
      rollNo: 'EC001',
      department: 'Electronics',
      email: 'sneha.reddy@college.edu',
      role: 'student',
      faceRegistered: true,
      photoCapturedFromCamera: true,
    },
    {
      name: 'Vikram Singh',
      rollNo: 'EC002',
      department: 'Electronics',
      email: 'vikram.singh@college.edu',
      role: 'student',
      faceRegistered: true,
      photoCapturedFromCamera: true,
    },
    {
      name: 'Anjali Gupta',
      rollNo: 'ME001',
      department: 'Mechanical',
      email: 'anjali.gupta@college.edu',
      role: 'student',
      faceRegistered: true,
      photoCapturedFromCamera: true,
    },
    {
      name: 'Arjun Verma',
      rollNo: 'ME002',
      department: 'Mechanical',
      email: 'arjun.verma@college.edu',
      role: 'student',
      faceRegistered: true,
      photoCapturedFromCamera: true,
    },
    {
      name: 'Kavya Iyer',
      rollNo: 'CS004',
      department: 'Computer Science',
      email: 'kavya.iyer@college.edu',
      role: 'student',
      faceRegistered: true,
      photoCapturedFromCamera: true,
    },
    {
      name: 'Rohan Desai',
      rollNo: 'EC003',
      department: 'Electronics',
      email: 'rohan.desai@college.edu',
      role: 'student',
      faceRegistered: true,
      photoCapturedFromCamera: true,
    },
    {
      name: 'Meera Nair',
      rollNo: 'ME003',
      department: 'Mechanical',
      email: 'meera.nair@college.edu',
      role: 'student',
      faceRegistered: true,
      photoCapturedFromCamera: true,
    },
  ];

  // Add students to database
  const addedStudents: Student[] = [];
  testStudents.forEach((student) => {
    const added = database.addStudent(student);
    addedStudents.push(added);
    console.log(`✅ Added student: ${student.name} (${student.rollNo})`);
  });

  // Generate attendance records for the past 7 days
  generateAttendanceHistory(addedStudents);

  // Generate today's attendance (some present, some absent, some late)
  generateTodayAttendance(addedStudents);

  console.log('✅ Test data loaded successfully!');
  console.log(`📊 Total Students: ${addedStudents.length}`);
  console.log(`📅 Attendance Records: ${database.getAttendanceRecords().length}`);
  
  return {
    students: addedStudents,
    totalRecords: database.getAttendanceRecords().length,
  };
};

/**
 * Generate random 128-dimensional face descriptor
 * Simulates real face-api.js output
 */
function generateRandomDescriptor(): number[] {
  const descriptor: number[] = [];
  for (let i = 0; i < 128; i++) {
    descriptor.push(Math.random() * 2 - 1); // Values between -1 and 1
  }
  return descriptor;
}

/**
 * Generate attendance history for past 7 days
 */
function generateAttendanceHistory(students: Student[]) {
  const today = new Date();
  
  for (let dayOffset = 7; dayOffset >= 1; dayOffset--) {
    const date = new Date(today);
    date.setDate(today.getDate() - dayOffset);
    date.setHours(9, 0, 0, 0); // 9:00 AM

    students.forEach((student, index) => {
      // 85% chance of being present
      const random = Math.random();
      
      if (random > 0.15) { // 85% present
        const isLate = random > 0.75; // 10% late (from the 85% present)
        const timeOffset = isLate ? 15 + Math.floor(Math.random() * 30) : 0; // 15-45 min late
        
        const timestamp = new Date(date);
        timestamp.setMinutes(timestamp.getMinutes() + timeOffset);
        
        const record: Omit<AttendanceRecord, 'id'> = {
          studentId: student.id,
          rollNo: student.rollNo || 'N/A',
          name: student.name,
          timestamp,
          location: {
            latitude: 12.9716 + (Math.random() - 0.5) * 0.01,
            longitude: 77.5946 + (Math.random() - 0.5) * 0.01,
            address: 'College Campus, Bangalore',
          },
          status: isLate ? 'Late' : 'Present',
          confidence: 0.85 + Math.random() * 0.15, // 85-100% confidence
          subject: 'Computer Science',
        } as Omit<AttendanceRecord, 'id'>;
        
        database.markAttendance(record);
      }
      // 15% absent (no record created)
    });
  }
  
  console.log(`📅 Generated attendance history for past 7 days`);
}

/**
 * Generate today's attendance
 * Mix of present, late, and absent students
 */
function generateTodayAttendance(students: Student[]) {
  const now = new Date();
  const classStartTime = new Date(now);
  classStartTime.setHours(9, 0, 0, 0);

  students.forEach((student, index) => {
    let status: 'Present' | 'Late' | 'Absent';
    let timestamp: Date;
    let confidence: number;

    // Distribute students:
    // Indexes 0-5: Present (6 students)
    // Indexes 6-7: Late (2 students)
    // Indexes 8-9: Absent (2 students)
    
    if (index < 6) {
      // Present - arrived on time
      status = 'Present';
      timestamp = new Date(classStartTime);
      timestamp.setMinutes(timestamp.getMinutes() + Math.floor(Math.random() * 5)); // 0-5 min after start
      confidence = 0.90 + Math.random() * 0.10; // 90-100%
      
      database.markAttendance({
        studentId: student.id,
        rollNo: student.rollNo || 'N/A',
        name: student.name,
        timestamp,
        location: {
          latitude: 12.9716 + (Math.random() - 0.5) * 0.01,
          longitude: 77.5946 + (Math.random() - 0.5) * 0.01,
          address: 'College Campus, Bangalore',
        },
        status,
        confidence,
        subject: 'Computer Science',
      } as any);
      
      console.log(`✅ ${student.name}: Present (${(confidence * 100).toFixed(1)}%)`);
      
    } else if (index < 8) {
      // Late - arrived 15-30 min late
      status = 'Late';
      timestamp = new Date(classStartTime);
      timestamp.setMinutes(timestamp.getMinutes() + 15 + Math.floor(Math.random() * 15));
      confidence = 0.88 + Math.random() * 0.10; // 88-98%
      
      database.markAttendance({
        studentId: student.id,
        rollNo: student.rollNo || 'N/A',
        name: student.name,
        timestamp,
        location: {
          latitude: 12.9716 + (Math.random() - 0.5) * 0.01,
          longitude: 77.5946 + (Math.random() - 0.5) * 0.01,
          address: 'College Campus, Bangalore',
        },
        status,
        confidence,
        subject: 'Computer Science',
      } as any);
      
      console.log(`⏰ ${student.name}: Late (${(confidence * 100).toFixed(1)}%)`);
      
    } else {
      // Absent - no record
      console.log(`❌ ${student.name}: Absent (no record)`);
    }
  });
  
  console.log(`📊 Today's attendance: 6 Present, 2 Late, 2 Absent`);
}

/**
 * Clear all test data
 */
export const clearTestData = () => {
  console.log('🗑️ Clearing test data...');
  localStorage.removeItem('students');
  localStorage.removeItem('attendance');
  console.log('✅ Test data cleared');
};

/**
 * Get summary of current data
 */
export const getDataSummary = () => {
  const students = database.getStudents();
  const allAttendance = database.getAttendanceRecords();
  const todayAttendance = database.getTodayAttendance();
  
  const summary = {
    totalStudents: students.length,
    totalAttendanceRecords: allAttendance.length,
    todayRecords: todayAttendance.length,
    todayPresent: todayAttendance.filter(r => r.status === 'Present').length,
    todayLate: todayAttendance.filter(r => r.status === 'Late').length,
    todayAbsent: students.length - todayAttendance.length,
  };
  
  console.log('📊 Data Summary:');
  console.log(`   Total Students: ${summary.totalStudents}`);
  console.log(`   Total Records: ${summary.totalAttendanceRecords}`);
  console.log(`   Today - Present: ${summary.todayPresent}, Late: ${summary.todayLate}, Absent: ${summary.todayAbsent}`);
  
  return summary;
};

// Export for use in browser console
if (typeof window !== 'undefined') {
  (window as any).loadTestData = loadTestData;
  (window as any).clearTestData = clearTestData;
  (window as any).getDataSummary = getDataSummary;
}
