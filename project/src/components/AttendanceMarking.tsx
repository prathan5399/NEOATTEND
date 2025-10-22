import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, Loader, CheckCircle, XCircle, MapPin, Clock, User, Users } from 'lucide-react';
import { database } from '../utils/database';
import { facialRecognition } from '../utils/facialRecognition';
import { getCurrentLocation } from '../utils/location';
import { Student, AttendanceRecord } from '../types';

export default function AttendanceMarking({ userType }: { userType: 'faculty' | 'student' }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string>('');
  const [detectionMode, setDetectionMode] = useState<'single' | 'multiple'>('single');
  const [multipleResults, setMultipleResults] = useState<Array<{
    student: Student;
    confidence: number;
    status: 'Present' | 'Late';
  }>>([]);
  const [result, setResult] = useState<{
    student: Student | null;
    confidence: number;
    status: 'success' | 'error' | null;
    message: string;
  }>({ student: null, confidence: 0, status: null, message: '' });
  const [currentLocation, setCurrentLocation] = useState<string>('Detecting location...');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle visibility change to stop camera when switching tabs/windows
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        setIsCameraActive(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // Cleanup camera on unmount only, not when isCameraActive changes
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []); // Remove isCameraActive from dependencies

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        // Wait for video to be ready with proper event handling
        await new Promise<void>((resolve, reject) => {
          const video = videoRef.current;
          if (!video) {
            reject(new Error('Video element not found'));
            return;
          }

          const handleLoadedMetadata = () => {
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('error', handleError);
            resolve();
          };

          const handleError = (e: Event) => {
            console.error('Video element error:', e);
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('error', handleError);
            reject(new Error('Video loading failed'));
          };

          // Check if already loaded
          if (video.readyState >= 1) {
            resolve();
            return;
          }

          video.addEventListener('loadedmetadata', handleLoadedMetadata);
          video.addEventListener('error', handleError);

          // Timeout fallback
          setTimeout(() => {
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('error', handleError);
            resolve();
          }, 3000);
        });

        await videoRef.current.play(); // Explicitly play the video
        setIsCameraActive(true);
      }
      
      // Get current location
      const location = await getCurrentLocation();
      setCurrentLocation(location.address);
    } catch (error) {
      console.error('Error accessing camera:', error);
      setResult({
        student: null,
        confidence: 0,
        status: 'error',
        message: 'Unable to access camera. Please check permissions.',
      });
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setIsCameraActive(false);
    }
  }, []);

  const captureAndRecognize = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsProcessing(true);
    setResult({ student: null, confidence: 0, status: null, message: 'Processing...' });

    try {
      // Capture image from video
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Cannot get canvas context');

      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);
      
      const imageData = canvas.toDataURL('image/jpeg');
      
      // Get registered students
      const students = database.getStudents();
      
      // Perform face recognition using the new system
      // For single face detection, we use the classroom detection with single face
      const result = await facialRecognition.detectClassroomFaces(imageData, students);
      
      const recognition = result.recognized.length > 0 
        ? { student: result.recognized[0].student, confidence: result.recognized[0].confidence }
        : { student: null, confidence: 0 };
      
      if (recognition.student && recognition.confidence > 0.75) {
        // Get current location
        const location = await getCurrentLocation();
        
        // Determine attendance status based on time
        const now = new Date();
        const hour = now.getHours();
        const minute = now.getMinutes();
        const currentTime = hour * 60 + minute;
        const lectureStart = 9 * 60; // 9:00 AM
        const lateThreshold = lectureStart + 15; // 9:15 AM
        
        let status: 'Present' | 'Late' | 'Absent' = 'Present';
        if (currentTime > lateThreshold) {
          status = 'Late';
        }

        // Check if already marked today
        const todayAttendance = database.getTodayAttendance();
        const alreadyMarked = todayAttendance.find(r => r.studentId === recognition.student!.id);
        
        if (alreadyMarked) {
          setResult({
            student: recognition.student,
            confidence: recognition.confidence,
            status: 'error',
            message: 'Attendance already marked for today',
          });
        } else {
          // Mark attendance
          const attendanceRecord: Omit<AttendanceRecord, 'id'> = {
            studentId: recognition.student.id,
            timestamp: now,
            confidence: recognition.confidence,
            status,
          };

          database.markAttendance(attendanceRecord);

          setResult({
            student: recognition.student,
            confidence: recognition.confidence,
            status: 'success',
            message: `Attendance marked successfully! Status: ${status}`,
          });
        }
      } else {
        setResult({
          student: null,
          confidence: recognition.confidence,
          status: 'error',
          message: recognition.confidence > 0 
            ? 'Face recognition confidence too low. Please try again.'
            : 'No matching face found. Please ensure you are registered.',
        });
      }
    } catch (error) {
      console.error('Recognition error:', error);
      setResult({
        student: null,
        confidence: 0,
        status: 'error',
        message: 'Face recognition failed. Please try again.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = e.target?.result as string;
        setUploadedImage(imageData);
        stopCamera(); // Stop camera if active
      };
      reader.readAsDataURL(file);
    }
  };

  // Process uploaded image for multiple faces
  const processUploadedImage = async () => {
    if (!uploadedImage) {
      alert('Please upload an image first');
      return;
    }

    setIsProcessing(true);
    setMultipleResults([]);
    setResult({ student: null, confidence: 0, status: null, message: 'Processing multiple faces...' });

    try {
      // Initialize face recognition models
      await facialRecognition.initializeModels();

      // Get all registered students
      const students = database.getStudents();
      console.log(`[Attendance] Processing image for ${students.length} registered students`);

      // Detect and recognize multiple faces
      const detectionResult = await facialRecognition.detectClassroomFaces(uploadedImage, students);

      console.log(`[Attendance] Detected ${detectionResult.totalDetected} faces`);
      console.log(`[Attendance] Recognized ${detectionResult.recognized.length} students`);

      if (detectionResult.recognized.length === 0) {
        setResult({
          student: null,
          confidence: 0,
          status: 'error',
          message: `Detected ${detectionResult.totalDetected} face(s) but no registered students recognized. Please ensure students are registered.`,
        });
        setIsProcessing(false);
        return;
      }

      // Determine attendance status based on time
      const now = new Date();
      const hour = now.getHours();
      const minute = now.getMinutes();
      const currentTime = hour * 60 + minute;
      const lectureStart = 9 * 60; // 9:00 AM
      const lateThreshold = lectureStart + 15; // 9:15 AM

      let status: 'Present' | 'Late' = 'Present';
      if (currentTime > lateThreshold) {
        status = 'Late';
      }

      const markedStudents: Array<{ student: Student; confidence: number; status: 'Present' | 'Late' }> = [];

      // Mark attendance for each recognized student
      for (const detected of detectionResult.recognized) {
        if (detected.student && detected.confidence >= 0.75) {
          // Check if already marked today
          const todayAttendance = database.getTodayAttendance();
          const alreadyMarked = todayAttendance.find(r => r.studentId === detected.student!.id);

          if (!alreadyMarked) {
            const attendanceRecord: Omit<AttendanceRecord, 'id'> = {
              studentId: detected.student.id,
              timestamp: now,
              confidence: detected.confidence,
              status,
            };
            database.markAttendance(attendanceRecord);

            markedStudents.push({
              student: detected.student,
              confidence: detected.confidence,
              status,
            });
          } else {
            // Still show in results even if already marked
            markedStudents.push({
              student: detected.student,
              confidence: detected.confidence,
              status,
            });
          }
        }
      }

      setMultipleResults(markedStudents);
      setResult({
        student: null,
        confidence: 0,
        status: 'success',
        message: `✅ Successfully recognized ${markedStudents.length} student(s) out of ${detectionResult.totalDetected} detected face(s)`,
      });

    } catch (error) {
      console.error('[Attendance] Processing error:', error);
      setResult({
        student: null,
        confidence: 0,
        status: 'error',
        message: 'Failed to process image. Please try again.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Clear uploaded image
  const clearUploadedImage = () => {
    setUploadedImage('');
    setMultipleResults([]);
    setResult({ student: null, confidence: 0, status: null, message: '' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 rounded-xl p-6 text-white shadow-2xl">
        <h2 className="text-2xl font-bold mb-2 flex items-center">
          <Camera className="h-7 w-7 mr-3" />
          Face Recognition Attendance
        </h2>
        <p className="text-purple-100">Position your face clearly in the camera frame for accurate recognition</p>
      </div>

      {/* Status Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-4 border border-white/20 shadow-2xl">
          <div className="flex items-center space-x-2 text-cyan-400 mb-2">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-medium">Current Time</span>
          </div>
          <p className="text-lg font-mono text-white">{new Date().toLocaleTimeString()}</p>
          <p className="text-xs text-gray-300">{new Date().toLocaleDateString()}</p>
        </div>
        
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-4 border border-white/20 shadow-2xl">
          <div className="flex items-center space-x-2 text-green-400 mb-2">
            <MapPin className="h-4 w-4" />
            <span className="text-sm font-medium">Location</span>
          </div>
          <p className="text-sm text-white">{currentLocation}</p>
        </div>
        
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-4 border border-white/20 shadow-2xl">
          <div className="flex items-center space-x-2 text-purple-400 mb-2">
            <User className="h-4 w-4" />
            <span className="text-sm font-medium">Total Students</span>
          </div>
          <p className="text-lg font-bold text-white">{database.getStudents().length}</p>
          <p className="text-xs text-gray-300">Registered</p>
        </div>
      </div>

      {/* Camera Interface */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl p-6 border border-white/20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Camera Feed */}
          <div className="space-y-4">
            <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ display: isCameraActive ? 'block' : 'none' }}
                className="w-full h-full object-cover"
              />
              {!isCameraActive && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                  <div className="text-center text-white">
                    <Camera className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">Camera not active</p>
                    <p className="text-sm opacity-75">Click "Start Camera" to begin</p>
                  </div>
                </div>
              )}
              
              {isProcessing && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <div className="text-center text-white">
                    <Loader className="h-8 w-8 mx-auto mb-2 animate-spin" />
                    <p className="text-sm">Processing face recognition...</p>
                  </div>
                </div>
              )}
            </div>

            {/* Camera Controls */}
            <div className="flex space-x-3">
              {!isCameraActive ? (
                <button
                  onClick={startCamera}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-cyan-600 text-white px-6 py-3 rounded-lg font-medium hover:from-purple-700 hover:to-cyan-700 transition-all duration-200 flex items-center justify-center space-x-2 transform hover:scale-105"
                >
                  <Camera className="h-5 w-5" />
                  <span>Start Camera</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={captureAndRecognize}
                    disabled={isProcessing}
                    className="flex-1 bg-gradient-to-r from-green-500 to-cyan-500 text-white px-6 py-3 rounded-lg font-medium hover:from-green-600 hover:to-cyan-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transform hover:scale-105"
                  >
                    {isProcessing ? (
                      <>
                        <Loader className="h-5 w-5 animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-5 w-5" />
                        <span>Mark Attendance</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={stopCamera}
                    className="px-6 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors duration-200 transform hover:scale-105"
                  >
                    Stop
                  </button>
                </>
              )}
            </div>

            {/* Divider and Upload Group Photo - Faculty Only */}
            {userType === 'faculty' ? (
              <>
                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/20"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-gray-900/50 text-gray-300">OR</span>
                  </div>
                </div>

                {/* Upload Group Photo */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-white">Upload Classroom Group Photo</h4>
                  <p className="text-xs text-gray-300">Recognize multiple students at once from a class photo</p>
                  
                  {uploadedImage ? (
                    <div className="space-y-3">
                      <div className="relative">
                        <img 
                          src={uploadedImage} 
                          alt="Uploaded classroom" 
                          className="w-full h-48 object-cover rounded-lg border-2 border-purple-500"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={processUploadedImage}
                          disabled={isProcessing}
                          className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-4 py-2 rounded-lg font-medium hover:from-blue-700 hover:to-cyan-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                        >
                          {isProcessing ? (
                            <>
                              <Loader className="h-4 w-4 animate-spin" />
                              <span>Processing...</span>
                            </>
                          ) : (
                            <>
                              <Users className="h-4 w-4" />
                              <span>Recognize All</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={clearUploadedImage}
                          disabled={isProcessing}
                          className="px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors duration-200 disabled:opacity-50"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 flex items-center justify-center space-x-2 transform hover:scale-105"
                      >
                        <Camera className="h-5 w-5" />
                        <span>Upload Classroom Photo</span>
                      </button>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-sm text-gray-300">
                Group photo upload is available for faculty only. Use the camera above to mark your personal attendance.
              </div>
            )}
          </div>

          {/* Results Panel */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Recognition Results</h3>
            
            {result.status && (
              <div className={`p-4 rounded-lg border backdrop-blur-sm ${
                result.status === 'success' 
                  ? 'bg-green-500/20 border-green-500/30 text-green-100'
                  : 'bg-red-500/20 border-red-500/30 text-red-100'
              }`}>
                <div className="flex items-center space-x-2 mb-2">
                  {result.status === 'success' ? (
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-400" />
                  )}
                  <span className="font-medium">
                    {result.status === 'success' ? 'Success' : 'Error'}
                  </span>
                </div>
                <p className="text-sm">{result.message}</p>
              </div>
            )}

            {result.student && (
              <div className="bg-white/10 p-4 rounded-lg border border-white/20 backdrop-blur-sm">
                <h4 className="font-medium text-white mb-3">Student Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Name:</span>
                    <span className="font-medium text-white">{result.student.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Roll No:</span>
                    <span className="font-medium text-white">{result.student.rollNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Department:</span>
                    <span className="font-medium text-white">{result.student.department}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Confidence:</span>
                    <span className="font-medium text-cyan-400">
                      {(result.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Multiple Students Results */}
            {userType === 'faculty' && multipleResults.length > 0 && (
              <div className="bg-white/10 p-4 rounded-lg border border-white/20 backdrop-blur-sm">
                <h4 className="font-medium text-white mb-3 flex items-center">
                  <Users className="h-5 w-5 mr-2 text-cyan-400" />
                  Recognized Students ({multipleResults.length})
                </h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {multipleResults.map((item, index) => (
                    <div key={index} className="bg-white/5 p-3 rounded-lg border border-white/10 hover:bg-white/10 transition-all duration-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-400" />
                          <span className="font-medium text-white">{item.student.name}</span>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          item.status === 'Present' 
                            ? 'bg-green-500/20 text-green-300' 
                            : 'bg-yellow-500/20 text-yellow-300'
                        }`}>
                          {item.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-300">
                        <div>
                          <span className="opacity-75">Roll:</span> {item.student.rollNo}
                        </div>
                        <div>
                          <span className="opacity-75">Dept:</span> {item.student.department}
                        </div>
                        <div className="col-span-2">
                          <span className="opacity-75">Confidence:</span>{' '}
                          <span className="text-cyan-400 font-medium">
                            {(item.confidence * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recognition Guidelines */}
            <div className="bg-blue-500/20 p-4 rounded-lg border border-blue-500/30 backdrop-blur-sm">
              <h4 className="font-medium text-blue-100 mb-2">Recognition Tips</h4>
              <ul className="text-sm text-blue-200 space-y-1">
                <li>• Ensure good lighting on your face</li>
                <li>• Look directly at the camera</li>
                <li>• Remove any face coverings</li>
                <li>• Stay still during recognition</li>
                <li>• Minimum 75% confidence required</li>
              </ul>
            </div>
          </div>
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}