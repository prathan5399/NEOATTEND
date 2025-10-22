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

export interface AttendanceRecord {
  id: string;
  studentId: string;
  rollNo: string;
  name: string;
  timestamp: Date;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  confidence: number;
  status: 'Present' | 'Late' | 'Absent';
  subject?: string;
}

export interface DashboardStats {
  totalStudents: number;
  presentToday: number;
  lateToday: number;
  absentToday: number;
  attendanceRate: number;
}

export interface CameraState {
  isActive: boolean;
  isProcessing: boolean;
  lastCapture?: string;
}