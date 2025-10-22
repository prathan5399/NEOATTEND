import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { database } from '../utils/database';
import { facialRecognition } from '../utils/facialRecognition';
import { reportGenerator, AttendanceReportData } from '../utils/pdfGenerator';
import { Student, AttendanceRecord } from '../types';
import { Camera, Users, FileText, Download, CheckCircle, XCircle, Clock, Loader } from 'lucide-react';

const ClassroomAttendance = () => {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [classPhoto, setClassPhoto] = useState<string>('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [attendanceResult, setAttendanceResult] = useState<any>(null);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Start camera for classroom photo
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: 'environment' // Use back camera on mobile
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch (error) {
      console.error('Camera error:', error);
      alert('Unable to access camera. Please check permissions.');
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsCameraActive(false);
    }
  };

  // Capture classroom photo
  const captureClassPhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');

      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);

        const imageData = canvas.toDataURL('image/jpeg', 0.9);
        setClassPhoto(imageData);
        stopCamera();
      }
    }
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setClassPhoto(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Process classroom attendance
  const processClassroomAttendance = async () => {
    if (!classPhoto) {
      alert('Please capture or upload a classroom photo first');
      return;
    }

    setIsProcessing(true);
    setAttendanceResult(null);

    try {
      // Initialize face recognition models
      await facialRecognition.initializeModels();

      // Get all registered students
      const allStudents = database.getStudents();
      console.log(`Processing attendance for ${allStudents.length} registered students`);

      // Detect and recognize faces from classroom photo
      const result = await facialRecognition.detectClassroomFaces(classPhoto, allStudents);

      // Mark attendance for recognized students
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

      const markedStudents: Array<{ student: Student; status: 'Present' | 'Late'; confidence: number }> = [];
      
      for (const detected of result.recognized) {
        if (detected.student) {
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
          }

          markedStudents.push({
            student: detected.student,
            status,
            confidence: detected.confidence,
          });
        }
      }

      setAttendanceResult({
        ...result,
        markedStudents,
      });

      alert(`✅ Attendance marked for ${markedStudents.length} students!\n\nDetected: ${result.totalDetected} faces\nRecognized: ${result.recognized.length}\nUnrecognized: ${result.unrecognized}`);

    } catch (error) {
      console.error('Attendance processing error:', error);
      alert('Failed to process attendance. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Generate PDF report
  const generateReport = async () => {
    if (!attendanceResult) return;

    const faculty = JSON.parse(localStorage.getItem('user') || '{}');
    const allStudents = database.getStudents();
    
    // Create attendance report data
    const reportData: AttendanceReportData = {
      date: new Date(),
      className: selectedClass || 'All Classes',
      subject: selectedSubject,
      faculty: faculty.name || 'Faculty',
      students: allStudents.map(student => {
        const marked = attendanceResult.markedStudents.find((m: any) => m.student.id === student.id);
        return {
          student,
          status: marked ? marked.status : 'Absent',
          markedAt: marked ? new Date() : undefined,
          confidence: marked?.confidence,
        };
      }),
      statistics: {
        totalStudents: allStudents.length,
        present: attendanceResult.markedStudents.filter((m: any) => m.status === 'Present').length,
        absent: allStudents.length - attendanceResult.markedStudents.length,
        late: attendanceResult.markedStudents.filter((m: any) => m.status === 'Late').length,
        attendancePercentage: (attendanceResult.markedStudents.length / allStudents.length) * 100,
      },
    };

    await reportGenerator.downloadReport(reportData);
  };

  // Export as CSV
  const exportCSV = () => {
    if (!attendanceResult) return;

    const faculty = JSON.parse(localStorage.getItem('user') || '{}');
    const allStudents = database.getStudents();
    
    const reportData: AttendanceReportData = {
      date: new Date(),
      className: selectedClass || 'All Classes',
      subject: selectedSubject,
      faculty: faculty.name || 'Faculty',
      students: allStudents.map(student => {
        const marked = attendanceResult.markedStudents.find((m: any) => m.student.id === student.id);
        return {
          student,
          status: marked ? marked.status : 'Absent',
          markedAt: marked ? new Date() : undefined,
          confidence: marked?.confidence,
        };
      }),
      statistics: {
        totalStudents: allStudents.length,
        present: attendanceResult.markedStudents.filter((m: any) => m.status === 'Present').length,
        absent: allStudents.length - attendanceResult.markedStudents.length,
        late: attendanceResult.markedStudents.filter((m: any) => m.status === 'Late').length,
        attendancePercentage: (attendanceResult.markedStudents.length / allStudents.length) * 100,
      },
    };

    reportGenerator.downloadCSV(reportData);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-cyan-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
                <Users className="w-8 h-8 mr-3" />
                Classroom Attendance System
              </h1>
              <p className="text-gray-300">
                AI-Powered Multi-Face Detection • Capture entire classroom in one photo
              </p>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all duration-300"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - Camera/Upload */}
          <div className="space-y-6">
            {/* Class Info */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h2 className="text-xl font-semibold text-white mb-4">Session Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Class/Section</label>
                  <input
                    type="text"
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    placeholder="e.g., CS 3rd Year - Section A"
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Subject (Optional)</label>
                  <input
                    type="text"
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    placeholder="e.g., Data Structures"
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            </div>

            {/* Camera/Upload Section */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h2 className="text-xl font-semibold text-white mb-4">Capture Classroom Photo</h2>
              
              {/* Camera Preview */}
              <div className="relative mb-4">
                <div className="aspect-video bg-black/30 rounded-xl overflow-hidden border-2 border-purple-500">
                  {classPhoto ? (
                    <img src={classPhoto} alt="Classroom" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        style={{ display: isCameraActive ? 'block' : 'none' }}
                        className="w-full h-full object-cover"
                      />
                      {!isCameraActive && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <Camera className="w-16 h-16 text-purple-400 mb-4" />
                          <p className="text-gray-300">No photo captured yet</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
                <canvas ref={canvasRef} className="hidden" />
              </div>

              {/* Camera Controls */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                {!isCameraActive && !classPhoto && (
                  <button
                    onClick={startCamera}
                    className="flex items-center justify-center px-6 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white rounded-xl transition-all duration-300 font-semibold shadow-lg transform hover:scale-105"
                  >
                    <Camera className="w-5 h-5 mr-2" />
                    Start Camera
                  </button>
                )}
                
                {isCameraActive && (
                  <>
                    <button
                      onClick={captureClassPhoto}
                      className="flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-xl transition-all duration-300 font-semibold shadow-lg"
                    >
                      <Camera className="w-5 h-5 mr-2" />
                      Capture
                    </button>
                    <button
                      onClick={stopCamera}
                      className="flex items-center justify-center px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white rounded-xl transition-all duration-300 font-semibold"
                    >
                      <XCircle className="w-5 h-5 mr-2" />
                      Stop
                    </button>
                  </>
                )}

                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isCameraActive}
                  className="flex items-center justify-center px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all duration-300 font-semibold disabled:opacity-50"
                >
                  <FileText className="w-5 h-5 mr-2" />
                  Upload Photo
                </button>

                {classPhoto && (
                  <button
                    onClick={() => setClassPhoto('')}
                    className="flex items-center justify-center px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all duration-300 font-semibold"
                  >
                    <XCircle className="w-5 h-5 mr-2" />
                    Clear
                  </button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              {/* Process Button */}
              <button
                onClick={processClassroomAttendance}
                disabled={!classPhoto || isProcessing}
                className="w-full flex items-center justify-center px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl transition-all duration-300 font-bold text-lg shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
              >
                {isProcessing ? (
                  <>
                    <Loader className="w-6 h-6 mr-2 animate-spin" />
                    Processing Faces...
                  </>
                ) : (
                  <>
                    <Users className="w-6 h-6 mr-2" />
                    Process Attendance
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Panel - Results */}
          <div className="space-y-6">
            {/* Statistics */}
            {attendanceResult && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-lg rounded-2xl p-6 border-2 border-blue-400">
                    <div className="text-4xl font-bold text-white mb-2">{attendanceResult.totalDetected}</div>
                    <div className="text-blue-200">Faces Detected</div>
                  </div>
                  <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-lg rounded-2xl p-6 border-2 border-green-400">
                    <div className="text-4xl font-bold text-white mb-2">{attendanceResult.recognized.length}</div>
                    <div className="text-green-200">Students Recognized</div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-lg rounded-2xl p-6 border-2 border-purple-400">
                    <div className="text-4xl font-bold text-white mb-2">{attendanceResult.markedStudents?.length || 0}</div>
                    <div className="text-purple-200">Attendance Marked</div>
                  </div>
                  <div className="bg-gradient-to-br from-orange-500/20 to-red-500/20 backdrop-blur-lg rounded-2xl p-6 border-2 border-orange-400">
                    <div className="text-4xl font-bold text-white mb-2">{attendanceResult.unrecognized}</div>
                    <div className="text-orange-200">Unrecognized</div>
                  </div>
                </div>

                {/* Recognized Students List */}
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                  <h2 className="text-xl font-semibold text-white mb-4">Recognized Students</h2>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {attendanceResult.markedStudents?.map((item: any, index: number) => (
                      <div key={index} className="bg-white/5 rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all duration-300">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <CheckCircle className="w-5 h-5 text-green-400" />
                            <div>
                              <div className="font-semibold text-white">{item.student.name}</div>
                              <div className="text-sm text-gray-300">{item.student.rollNo} • {item.student.department}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-green-400 font-semibold">{item.status}</div>
                            <div className="text-xs text-gray-400">{(item.confidence * 100).toFixed(1)}%</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Report Actions */}
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                  <h2 className="text-xl font-semibold text-white mb-4">Generate Reports</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={generateReport}
                      className="flex items-center justify-center px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white rounded-xl transition-all duration-300 font-semibold shadow-lg transform hover:scale-105"
                    >
                      <FileText className="w-5 h-5 mr-2" />
                      Download PDF
                    </button>
                    <button
                      onClick={exportCSV}
                      className="flex items-center justify-center px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl transition-all duration-300 font-semibold shadow-lg transform hover:scale-105"
                    >
                      <Download className="w-5 h-5 mr-2" />
                      Export CSV
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Instructions */}
            {!attendanceResult && (
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                <h2 className="text-xl font-semibold text-white mb-4">📝 Instructions</h2>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-start">
                    <span className="text-purple-400 mr-2">1.</span>
                    <span>Enter class/section information and subject name</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-purple-400 mr-2">2.</span>
                    <span>Capture a photo of the entire classroom or upload an existing photo</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-purple-400 mr-2">3.</span>
                    <span>Ensure students' faces are clearly visible and well-lit</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-purple-400 mr-2">4.</span>
                    <span>Click "Process Attendance" to detect and recognize all faces</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-purple-400 mr-2">5.</span>
                    <span>Review results and download PDF/CSV reports</span>
                  </li>
                </ul>

                <div className="mt-6 p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-xl">
                  <p className="text-yellow-200 text-sm">
                    <strong>💡 Tip:</strong> For best results, capture the photo from the front of the classroom with good lighting. All students should face the camera.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClassroomAttendance;
