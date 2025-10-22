import React, { useState, useRef, useEffect, useMemo, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { database } from '../../utils/database';
import { facialRecognition } from '../../utils/facialRecognition';
import { AuthContext } from '../../App';

const Signup = () => {
  const navigate = useNavigate();
  const auth = useContext(AuthContext);
  const [formData, setFormData] = useState({
    role: 'student', // Default to student
    name: '',
    rollNo: '',
    email: '',
    password: '',
    department: '',
    year: '',
    image: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [faceRegistered, setFaceRegistered] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [photoCapturedFromCamera, setPhotoCapturedFromCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (auth?.isAuthenticated) {
      console.log('User already authenticated, redirecting to dashboard');
      navigate('/dashboard', { replace: true });
    }
  }, [auth?.isAuthenticated, navigate]);

  // Generate star positions once to prevent re-renders
  const starPositions = useMemo(() => {
    return [...Array(40)].map(() => ({
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      animationDelay: `${Math.random() * 3}s`,
      animationDuration: `${2 + Math.random() * 2}s`
    }));
  }, []);

  // Cleanup camera on unmount and visibility change
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
      // Only cleanup on unmount, not when isCameraActive changes
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []); // Remove isCameraActive from dependencies

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Disable file upload - only camera capture is allowed
    alert('File upload is not allowed. Please use the live camera to capture your photo for face recognition.');
    return;
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
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
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Unable to access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsCameraActive(false);
    }
  };

  const capturePhoto = () => {
    console.log('[Signup] Capturing photo from camera...');
    
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');

      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        console.log('[Signup] Photo captured successfully');
        console.log('[Signup] Image size:', imageData.length, 'bytes');
        console.log('[Signup] Image format:', imageData.substring(0, 30) + '...');
        
        setFormData(prev => ({ ...prev, image: imageData }));
        setPhotoCapturedFromCamera(true);
        console.log('[Signup] Photo saved to form data, photoCapturedFromCamera set to true');
        // Keep camera active for preview and potential retake
      } else {
        console.error('[Signup] Failed to get canvas context');
      }
    } else {
      console.error('[Signup] Video or canvas ref not available');
    }
  };

  const handleFaceRegistration = async () => {
    console.log('[Signup] Starting face registration process...');
    console.log('[Signup] Form data:', { rollNo: formData.rollNo, hasImage: !!formData.image });
    
    if (!formData.image) {
      console.error('[Signup] No image available');
      alert('Please capture a photo first using the live camera');
      return;
    }

    if (!photoCapturedFromCamera) {
      console.error('[Signup] Photo not captured from camera');
      alert('Face registration requires a photo captured from the live camera. File uploads are not allowed.');
      return;
    }

    setIsLoading(true);
    try {
      console.log('[Signup] Calling registerStudentFace with roll number:', formData.rollNo);
      
      const result = await facialRecognition.registerStudentFace(
        formData.rollNo, 
        formData.image,
        formData.name
      );
      
      if (result.success) {
        console.log('[Signup] ✅ Face registration successful!');
        console.log('[Signup] Total registered faces:', facialRecognition.getRegisteredCount());
        setFaceRegistered(true);
        alert(result.message);
      } else {
        console.error('[Signup] ❌ Face registration failed');
        alert(result.message);
      }
    } catch (error) {
      console.error('[Signup] Face registration error:', error);
      alert('Face registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // For students: validate photo capture and face registration
    if (formData.role === 'student') {
      if (!formData.image) {
        alert('Please capture your photo using the live camera. This is mandatory for students.');
        return;
      }

      if (!photoCapturedFromCamera) {
        alert('Photo must be captured from the live camera. File uploads are not allowed.');
        return;
      }

      if (!faceRegistered) {
        alert('Please register your face before signing up. Click "Register Face for Recognition" after capturing your photo.');
        return;
      }
    }

    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      // Create user record based on role
      const userData = formData.role === 'student' ? {
        rollNo: formData.rollNo,
        name: formData.name,
        email: formData.email,
        imageUrl: formData.image,
        department: formData.department,
        year: formData.year,
        role: 'student' as const,
        faceRegistered: true,
        photoCapturedFromCamera: true
      } : {
        rollNo: formData.rollNo, // Using rollNo for employeeId
        name: formData.name,
        email: formData.email,
        imageUrl: '', // Empty for faculty
        department: formData.department,
        year: formData.year, // Using year for designation
        role: 'faculty' as const,
        faceRegistered: false,
        photoCapturedFromCamera: false
      };

      await database.saveStudent(userData);

      // Store user credentials
      localStorage.setItem(`user_${formData.rollNo}`, JSON.stringify({
        username: formData.rollNo,
        password: formData.password,
        type: formData.role,
        faceRegistered: formData.role === 'student' ? true : false
      }));

      const successMessage = formData.role === 'student'
        ? 'Registration successful! Your face has been registered for attendance recognition. You can now log in.'
        : 'Registration successful! You can now log in as faculty.';

      alert(successMessage);
      navigate('/login');
    } catch (error) {
      console.error('Registration failed:', error);
      alert('Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white relative overflow-hidden py-12 px-4 sm:px-6 lg:px-8">
      {/* Animated Stars Background */}
      <div className="absolute inset-0">
        {starPositions.map((position, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
            style={{
              left: position.left,
              top: position.top,
              animationDelay: position.animationDelay,
              animationDuration: position.animationDuration
            }}
          />
        ))}
      </div>

      {/* Main Container - Wider for better layout */}
      <div className="relative z-10 max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-2xl">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <span className="text-2xl">✨</span>
            </div>
          </div>
          <h2 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
            {formData.role === 'student' ? 'Student Registration' : 'Faculty Registration'}
          </h2>
          <p className="text-gray-300 mt-2 text-lg">Create your account to access NEOATTEND</p>
        </div>

        {/* Registration Form Card */}
        <div className="bg-white/5 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/10 p-8">
          <form className="space-y-8" onSubmit={handleSubmit}>
          {/* Mandatory Face Registration Notice - Only for Students */}
          {formData.role === 'student' && (
            <div className="bg-gradient-to-r from-red-500/20 to-orange-500/20 border-2 border-red-500/40 rounded-xl p-5 shadow-lg">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-7 w-7 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-base font-bold text-red-300 mb-2">
                    ⚠️ Face Registration is MANDATORY for Students
                  </h3>
                  <p className="text-sm text-red-200">
                    Students must capture a photo using the live camera and complete face registration. This ensures secure and accurate attendance marking through facial recognition.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Account Type Selection */}
          <div>
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
              <span className="bg-gradient-to-r from-purple-500 to-cyan-500 w-8 h-8 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white text-lg">👤</span>
              </span>
              Account Type
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => {
                  setFormData(prev => ({
                    ...prev,
                    role: 'student',
                    rollNo: '',
                    year: '',
                    image: ''
                  }));
                  setFaceRegistered(false);
                  setPhotoCapturedFromCamera(false);
                  if (isCameraActive) stopCamera();
                }}
                className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                  formData.role === 'student'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 border-purple-500 shadow-lg'
                    : 'bg-white/5 border-white/20 hover:border-white/40'
                }`}
              >
                <div className="text-3xl mb-2">🎓</div>
                <div className="font-semibold text-white">Student</div>
                <div className="text-xs text-gray-300 mt-1">With face recognition</div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormData(prev => ({
                    ...prev,
                    role: 'faculty',
                    rollNo: '',
                    year: '',
                    image: ''
                  }));
                  setFaceRegistered(false);
                  setPhotoCapturedFromCamera(false);
                  if (isCameraActive) stopCamera();
                }}
                className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                  formData.role === 'faculty'
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 border-cyan-500 shadow-lg'
                    : 'bg-white/5 border-white/20 hover:border-white/40'
                }`}
              >
                <div className="text-3xl mb-2">👨‍🏫</div>
                <div className="font-semibold text-white">Faculty</div>
                <div className="text-xs text-gray-300 mt-1">Attendance manager</div>
              </button>
            </div>
          </div>

          {/* Basic Information Section */}
          <div>
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
              <span className="bg-gradient-to-r from-purple-500 to-cyan-500 w-8 h-8 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white text-lg">📝</span>
              </span>
              Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Full Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  className="w-full border border-white/20 rounded-lg shadow-sm py-3 px-4 bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {formData.role === 'student' ? 'Roll Number' : 'Employee ID'} <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  className="w-full border border-white/20 rounded-lg shadow-sm py-3 px-4 bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                  placeholder={formData.role === 'student' ? 'e.g., 2021CS001' : 'e.g., EMP001'}
                  value={formData.rollNo}
                  onChange={(e) => setFormData(prev => ({...prev, rollNo: e.target.value}))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  className="w-full border border-white/20 rounded-lg shadow-sm py-3 px-4 bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                  placeholder="your.email@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({...prev, email: e.target.value}))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Department <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  className="w-full border border-white/20 rounded-lg shadow-sm py-3 px-4 bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                  placeholder="e.g., Computer Science"
                  value={formData.department}
                  onChange={(e) => setFormData(prev => ({...prev, department: e.target.value}))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {formData.role === 'student' ? 'Year' : 'Designation'} <span className="text-red-400">*</span>
                </label>
                <select
                  required
                  className="w-full border border-white/20 rounded-lg shadow-sm py-3 px-4 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                  value={formData.year}
                  onChange={(e) => setFormData(prev => ({...prev, year: e.target.value}))}
                >
                  <option value="" className="bg-slate-800">
                    {formData.role === 'student' ? 'Select Year' : 'Select Designation'}
                  </option>
                  {formData.role === 'student' ? (
                    <>
                      <option value="1st Year" className="bg-slate-800">1st Year</option>
                      <option value="2nd Year" className="bg-slate-800">2nd Year</option>
                      <option value="3rd Year" className="bg-slate-800">3rd Year</option>
                      <option value="4th Year" className="bg-slate-800">4th Year</option>
                    </>
                  ) : (
                    <>
                      <option value="Professor" className="bg-slate-800">Professor</option>
                      <option value="Associate Professor" className="bg-slate-800">Associate Professor</option>
                      <option value="Assistant Professor" className="bg-slate-800">Assistant Professor</option>
                      <option value="Lecturer" className="bg-slate-800">Lecturer</option>
                      <option value="Lab Assistant" className="bg-slate-800">Lab Assistant</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Password <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  required
                  className="w-full border border-white/20 rounded-lg shadow-sm py-3 px-4 bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                  placeholder="Enter password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({...prev, password: e.target.value}))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Confirm Password <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  required
                  className="w-full border border-white/20 rounded-lg shadow-sm py-3 px-4 bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                  placeholder="Re-enter password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData(prev => ({...prev, confirmPassword: e.target.value}))}
                />
              </div>
            </div>
          </div>

          {/* Student Face Registration Section */}
          {formData.role === 'student' && (
            <div>
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                <span className="bg-gradient-to-r from-purple-500 to-cyan-500 w-8 h-8 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-white text-lg">📸</span>
                </span>
                Face Registration (MANDATORY)
              </h3>
              <div className="space-y-5">
                {/* Camera Section with Square Box */}
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                  <label className="block text-sm font-medium text-red-300 mb-4 flex items-center">
                    <span className="text-xl mr-2">📸</span>
                    Live Camera Photo Capture (Required for Face Recognition)
                  </label>

                  {/* Photo Preview - Shows captured photo */}
                  {formData.image && (
                    <div className="flex justify-center mb-6">
                      <div className="relative">
                        <img
                          src={formData.image}
                          alt="Profile Preview"
                          className="w-48 h-48 object-cover rounded-2xl border-4 border-green-400 shadow-2xl"
                        />
                        <div className="absolute -top-2 -right-2 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Square Camera Box */}
                  <div className="flex justify-center mb-5">
                    <div className="relative w-80 h-80">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        style={{ display: isCameraActive ? 'block' : 'none' }}
                        className="w-full h-full object-cover rounded-2xl border-4 border-purple-500 shadow-2xl"
                      />
                      <canvas
                        ref={canvasRef}
                        className="hidden"
                      />
                      {!isCameraActive && !formData.image && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-purple-900/40 to-cyan-900/40 backdrop-blur-md rounded-2xl border-4 border-dashed border-purple-400/50">
                          <div className="text-6xl mb-4">📷</div>
                          <button
                            type="button"
                            onClick={startCamera}
                            className="flex items-center px-8 py-4 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white rounded-xl transition-all duration-300 font-semibold shadow-xl transform hover:scale-105"
                          >
                            <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Start Camera
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Camera Controls */}
                  {isCameraActive && (
                    <div className="flex justify-center gap-4 mb-4">
                      <button
                        type="button"
                        onClick={capturePhoto}
                        className="flex items-center px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-xl transition-all duration-300 font-semibold shadow-lg transform hover:scale-105"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Capture Photo
                      </button>
                      <button
                        type="button"
                        onClick={stopCamera}
                        className="flex items-center px-8 py-3 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white rounded-xl transition-all duration-300 font-semibold shadow-lg transform hover:scale-105"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Stop Camera
                      </button>
                    </div>
                  )}

                  {/* Warning Message */}
                  {!formData.image && (
                    <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/40 rounded-xl p-4">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <svg className="h-6 w-6 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3 flex-1">
                          <p className="text-sm font-semibold text-yellow-300">
                            ⚠️ Photo capture is mandatory for students to use face recognition attendance
                          </p>
                          <p className="text-xs text-yellow-200 mt-1">
                            Click "Start Camera" and capture your photo to proceed with registration
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Face Registration - MANDATORY FOR STUDENTS */}
                {formData.image && photoCapturedFromCamera && !faceRegistered && (
                  <div className="space-y-4">
                    <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-red-300">
                            🔒 Face registration required for student attendance system
                          </p>
                          <p className="text-sm text-red-200 mt-1">
                            Register your face to enable automatic attendance marking
                          </p>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleFaceRegistration}
                      disabled={isLoading}
                      className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 transition-all duration-300 transform hover:scale-105"
                    >
                      {isLoading ? 'Registering Face...' : '🔒 Register Face for Recognition (Required)'}
                    </button>
                  </div>
                )}

                {faceRegistered && (
                  <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-green-300">
                          ✅ Face registered successfully! Ready for attendance recognition.
                        </p>
                        <p className="text-sm text-green-200 mt-1">
                          Your face will be used to mark attendance automatically
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Faculty Notice - No Face Registration Required */}
          {formData.role === 'faculty' && (
            <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-blue-300">
                    👨‍🏫 Faculty Account - No Face Registration Required
                  </p>
                  <p className="text-sm text-blue-200 mt-1">
                    Faculty members can mark attendance manually for students
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={isLoading || (formData.role === 'student' && !faceRegistered)}
              className="group relative w-full flex justify-center py-4 px-6 border border-transparent text-base font-semibold rounded-lg text-white bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  Creating Account...
                </>
              ) : formData.role === 'student' && !faceRegistered ? (
                'Complete Face Registration First'
              ) : (
                'Create Account'
              )}
            </button>
          </div>

          {/* Sign In Link */}
          <div className="text-center pt-4">
            <p className="text-gray-300">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-purple-400 hover:text-purple-300 font-semibold transition-colors duration-300"
              >
                Sign in
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  </div>
  );
};

export default Signup;