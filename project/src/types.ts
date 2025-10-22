export interface Student {
  id: string;
  rollNo?: string; // Optional for faculty
  employeeId?: string; // For faculty
  name: string;
  email: string;
  imageUrl?: string; // Optional for faculty
  department: string;
  year?: string; // Optional for faculty
  designation?: string; // For faculty
  role: 'student' | 'faculty';
  faceRegistered?: boolean;
  photoCapturedFromCamera?: boolean;
  createdAt: Date;
}

export interface StudentFile {
  name: string;
  url: string;
  type: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  timestamp: Date;
  status: 'Present' | 'Absent' | 'Late';
  confidence?: number; // For face recognition confidence score
}

export interface DashboardStats {
  totalStudents: number;
  presentToday: number;
  lateToday: number;
  absentToday: number;
  attendanceRate: number;
}

export type UserType = 'faculty' | 'student';