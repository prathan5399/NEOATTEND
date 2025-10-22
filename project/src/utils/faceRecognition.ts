import { Student } from '../types';

// Simulated face recognition service
export class FaceRecognitionService {
  private static instance: FaceRecognitionService;
  private registeredFaces: Map<string, string> = new Map();

  static getInstance(): FaceRecognitionService {
    if (!FaceRecognitionService.instance) {
      FaceRecognitionService.instance = new FaceRecognitionService();
    }
    return FaceRecognitionService.instance;
  }

  async registerFace(rollNo: string, imageData: string): Promise<boolean> {
    console.log(`[Face Recognition] Starting registration for Roll No: ${rollNo}`);
    
    // Validate image data
    if (!imageData || !imageData.startsWith('data:image/')) {
      console.error('[Face Recognition] Invalid image data format');
      return false;
    }
    
    // Validate roll number
    if (!rollNo || rollNo.trim() === '') {
      console.error('[Face Recognition] Invalid roll number');
      return false;
    }
    
    // Simulate face registration processing
    console.log('[Face Recognition] Processing face data...');
    await this.simulateProcessing(1000);
    
    // Store the face data (in real implementation, this would be feature vectors)
    this.registeredFaces.set(rollNo, imageData);
    console.log(`[Face Recognition] ✅ Successfully registered face for Roll No: ${rollNo}`);
    console.log(`[Face Recognition] Total registered faces: ${this.registeredFaces.size}`);
    
    return true;
  }

  async recognizeFace(imageData: string, students: Student[]): Promise<{
    student: Student | null;
    confidence: number;
  }> {
    console.log(`[Face Recognition] Starting recognition process...`);
    console.log(`[Face Recognition] Available students: ${students.length}`);
    console.log(`[Face Recognition] Registered faces in system: ${this.registeredFaces.size}`);
    
    // Validate image data
    if (!imageData || !imageData.startsWith('data:image/')) {
      console.error('[Face Recognition] Invalid image data for recognition');
      return { student: null, confidence: 0 };
    }
    
    // Simulate face recognition processing
    console.log('[Face Recognition] Analyzing facial features...');
    await this.simulateProcessing(2000);
    
    // Try to match with registered faces
    for (const student of students) {
      if (student.rollNo && this.registeredFaces.has(student.rollNo)) {
        // In real implementation, this would compare facial features
        // For demo, we'll use a simulation with high accuracy
        const confidence = 0.88 + Math.random() * 0.12; // 88-100% confidence
        
        console.log(`[Face Recognition] ✅ Match found!`);
        console.log(`[Face Recognition] Student: ${student.name} (${student.rollNo})`);
        console.log(`[Face Recognition] Confidence: ${(confidence * 100).toFixed(2)}%`);
        
        return {
          student: student,
          confidence: Math.round(confidence * 100) / 100,
        };
      }
    }
    
    console.log('[Face Recognition] ❌ No matching face found in registered database');
    
    // If no exact match found, return null (instead of random student)
    return {
      student: null,
      confidence: 0,
    };
  }

  async captureImage(): Promise<string> {
    // Simulate camera capture
    await this.simulateProcessing(500);
    
    // Return a mock image data URL
    return 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAAAAA...'; // Mock image data
  }

  // Utility method to check if a face is registered
  isFaceRegistered(rollNo: string): boolean {
    return this.registeredFaces.has(rollNo);
  }

  // Utility method to get all registered roll numbers (for debugging)
  getRegisteredRollNumbers(): string[] {
    return Array.from(this.registeredFaces.keys());
  }

  // Utility method to get total registered faces count
  getRegisteredCount(): number {
    return this.registeredFaces.size;
  }

  private async simulateProcessing(duration: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, duration));
  }
}

export const faceRecognition = FaceRecognitionService.getInstance();