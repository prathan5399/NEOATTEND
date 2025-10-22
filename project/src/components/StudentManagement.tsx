import React, { useState, useEffect, useRef } from 'react';
import { database } from '../utils/database';
import { FaceRecognitionService } from '../utils/faceRecognition';
import { Student } from '../types';
// import { Video, Check, User, Trash } from 'lucide-react';

const StudentManagement: React.FC<{ userType: 'faculty' | 'student' }> = ({ userType }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [faceRegistered, setFaceRegistered] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [photoCapturedFromCamera, setPhotoCapturedFromCamera] = useState(false);
  const [videoLoadingStatus, setVideoLoadingStatus] = useState<string>('');
  const [isCameraLoading, setIsCameraLoading] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    rollNo: '',
    email: '',
    department: '',
    year: '',
    imageUrl: ''
  });

  useEffect(() => {
    loadStudents();
  }, []);

  useEffect(() => {
    // Stop camera when switching tabs/windows
    const handleVisibilityChange = () => {
      if (document.hidden && isCameraActive) {
        stopCamera();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isCameraActive]);

  const loadStudents = () => {
    const loadedStudents = database.getStudents();
    setStudents(loadedStudents);
  };

  const checkAvailableCameras = async () => {
    try {
      console.log('Checking available cameras...');
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');

      console.log('Available cameras:', videoDevices);
      setVideoLoadingStatus(`Found ${videoDevices.length} camera(s)`);

      if (videoDevices.length === 0) {
        alert('No cameras found on this device.');
        return;
      }

      let cameraInfo = 'Available cameras:\n';
      videoDevices.forEach((device, index) => {
        cameraInfo += `${index + 1}. ${device.label || `Camera ${index + 1}`} (${device.deviceId})\n`;
      });
      alert(cameraInfo);

    } catch (error) {
      console.error('Error checking cameras:', error);
      alert('Error checking available cameras');
    }
  };

  const testCameraAccess = async () => {
    try {
      console.log('Testing camera access with minimal constraints...');
      setVideoLoadingStatus('Testing camera access...');

      // Try with minimal constraints first
      const constraints = {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 }
          // Remove facingMode constraint for testing
        }
      };

      console.log('Using constraints:', constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('Camera access successful, tracks:', stream.getVideoTracks().length);

      // Log track information
      stream.getVideoTracks().forEach((track, index) => {
        console.log(`Track ${index}:`, {
          label: track.label,
          enabled: track.enabled,
          readyState: track.readyState,
          settings: track.getSettings()
        });
      });

      // Clean up test stream
      stream.getTracks().forEach(track => track.stop());
      setVideoLoadingStatus('Camera access test successful!');
      alert('Camera access works! The issue might be with video display.');
    } catch (error) {
      console.error('Camera access failed:', error);
      setVideoLoadingStatus(`Camera access failed: ${error instanceof Error ? error.message : 'Unknown error'}`);

      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          alert('Camera permission denied. Please allow camera access and try again.');
        } else if (error.name === 'NotFoundError') {
          alert('No camera found. Please check if your device has a camera.');
        } else if (error.name === 'NotReadableError') {
          alert('Camera is already in use by another application.');
        } else {
          alert(`Camera access failed: ${error.message}`);
        }
      } else {
        alert('Camera access failed with unknown error');
      }
    }
  };

  const startCamera = async () => {
    try {
      setIsCameraLoading(true);
      setVideoLoadingStatus('Requesting camera permission...');
      console.log('Requesting camera access...');

      // Use more permissive constraints
      const constraints = {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: { ideal: 'user' } // Make facingMode ideal instead of required
        }
      };

      console.log('Using constraints:', constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('Camera access granted, setting up video...');
      setVideoLoadingStatus('Camera access granted, setting up video...');

      // Log track information
      stream.getVideoTracks().forEach((track, index) => {
        console.log(`Track ${index}:`, {
          label: track.label,
          enabled: track.enabled,
          readyState: track.readyState,
          settings: track.getSettings()
        });
      });

      if (videoRef.current) {
        const video = videoRef.current;
        
        // CRITICAL: Show video element FIRST so it's in the render tree
        setIsCameraActive(true);
        
        // Small delay to ensure DOM update
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Now set the stream
        video.srcObject = stream;
        console.log('Stream attached to video element');
        
        // Force video element to be visible and in flow
        video.style.opacity = '1';
        video.style.visibility = 'visible';
        
        console.log('Waiting for video to load...');
        
        // Wait for video metadata to load
        await new Promise<void>((resolve, reject) => {
          if (!video) {
            reject(new Error('Video element not found'));
            return;
          }

          const handleLoadedMetadata = () => {
            console.log('✅ Video metadata loaded:', {
              videoWidth: video.videoWidth,
              videoHeight: video.videoHeight,
              readyState: video.readyState,
              srcObject: video.srcObject !== null
            });
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('error', handleError);
            resolve();
          };

          const handleError = (e: Event) => {
            console.error('❌ Video element error event:', e);
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('error', handleError);
            reject(new Error('Video loading failed'));
          };

          // Check if already loaded
          if (video.readyState >= video.HAVE_METADATA) {
            console.log('✅ Video metadata already loaded');
            resolve();
            return;
          }

          video.addEventListener('loadedmetadata', handleLoadedMetadata);
          video.addEventListener('error', handleError);

          // Timeout fallback
          setTimeout(() => {
            console.log('⏱️ Video load timeout after 5s, proceeding anyway...');
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('error', handleError);
            resolve();
          }, 5000);
        });

        console.log('Attempting to play video...');
        try {
          // Play the video
          await video.play();
          console.log('✅ Video play() successful - CAMERA SHOULD BE VISIBLE NOW!');
          
          setVideoLoadingStatus('Camera active and streaming');
          
          // Verify video is actually playing
          console.log('📹 Video state after play:', {
            paused: video.paused,
            currentTime: video.currentTime,
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight,
            readyState: video.readyState,
            muted: video.muted,
            autoplay: video.autoplay
          });
        } catch (playError) {
          console.error('⚠️ Video play() failed:', playError);
          console.log('Trying to play again after user gesture...');
          setVideoLoadingStatus('Camera active (tap video to start)');
        }
      }
      setIsCameraLoading(false);
    } catch (error) {
      setIsCameraLoading(false);
      console.error('Error accessing camera:', error);
      setVideoLoadingStatus(`Camera access failed: ${error instanceof Error ? error.message : 'Unknown error'}`);

      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          alert('Camera permission denied. Please allow camera access in your browser and try again.');
        } else if (error.name === 'NotFoundError') {
          alert('No camera found. Please check if your device has a camera and it\'s not being used by another application.');
        } else if (error.name === 'NotReadableError') {
          alert('Camera is already in use by another application. Please close other apps using the camera.');
        } else if (error.name === 'OverconstrainedError') {
          console.log('Trying with basic camera constraints...');
          setVideoLoadingStatus('Trying basic camera access...');
          alert('Camera constraints not supported. Trying with basic camera access...');

          // Try again with minimal constraints
          try {
            const basicStream = await navigator.mediaDevices.getUserMedia({
              video: {
                width: { ideal: 640 },
                height: { ideal: 480 }
                // Remove facingMode constraint
              }
            });

            console.log('Basic camera access successful');
            setVideoLoadingStatus('Basic camera access granted, setting up video...');

            if (videoRef.current) {
              // Set camera active first
              setIsCameraActive(true);
              
              videoRef.current.srcObject = basicStream;

              // Wait for video to be ready
              await new Promise<void>((resolve, reject) => {
                const video = videoRef.current;
                if (!video) {
                  reject(new Error('Video element not found'));
                  return;
                }

                const handleLoadedMetadata = () => {
                  console.log('Basic video metadata loaded');
                  video.removeEventListener('loadedmetadata', handleLoadedMetadata);
                  video.removeEventListener('error', handleError);
                  resolve();
                };

                const handleError = (e: Event) => {
                  console.error('Basic video element error:', e);
                  video.removeEventListener('loadedmetadata', handleLoadedMetadata);
                  video.removeEventListener('error', handleError);
                  reject(new Error('Basic video loading failed'));
                };

                if (video.readyState >= 1) {
                  resolve();
                  return;
                }

                video.addEventListener('loadedmetadata', handleLoadedMetadata);
                video.addEventListener('error', handleError);

                setTimeout(() => {
                  video.removeEventListener('loadedmetadata', handleLoadedMetadata);
                  video.removeEventListener('error', handleError);
                  resolve();
                }, 3000);
              });

              try {
                await videoRef.current.play();
                setVideoLoadingStatus('Camera working with basic settings');
              } catch (playError) {
                console.warn('Autoplay failed with basic camera:', playError);
                setVideoLoadingStatus('Camera active (click video if needed)');
              }
            }
            setIsCameraLoading(false);
          } catch (basicError) {
            setIsCameraLoading(false);
            console.error('Basic camera access also failed:', basicError);
            setVideoLoadingStatus(`Basic camera access failed: ${basicError instanceof Error ? basicError.message : 'Unknown error'}`);
            alert(`Basic camera access also failed: ${basicError instanceof Error ? basicError.message : 'Unknown error'}`);
          }
        } else {
          alert(`Camera access failed: ${error.message}`);
        }
      } else {
        alert('Camera access failed with unknown error');
      }
    }
  };

  const stopCamera = () => {
    console.log('Stopping camera...');
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      
      // Stop all tracks
      stream.getTracks().forEach(track => {
        console.log('Stopping track:', track.label);
        track.stop();
      });
      
      // Clear the video source
      videoRef.current.srcObject = null;
      
      // Update state
      setIsCameraActive(false);
      setVideoLoadingStatus('Camera stopped');
      
      console.log('Camera stopped successfully');
    } else {
      console.log('No active camera stream to stop');
      setIsCameraActive(false);
      setVideoLoadingStatus('');
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      console.log('Capturing photo from video:', {
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        readyState: video.readyState,
        paused: video.paused
      });
      
      // Check if video has valid dimensions
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        alert('Camera is not ready. Please wait for the camera to fully load.');
        return;
      }
      
      const context = canvas.getContext('2d');

      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        console.log('Photo captured, data length:', imageData.length);
        
        setFormData(prev => ({ ...prev, imageUrl: imageData }));
        setPhotoCapturedFromCamera(true);
        
        // Stop the camera after capturing
        stopCamera();
        
        console.log('Photo captured and camera stopped');
      } else {
        console.error('Failed to get canvas context');
        alert('Failed to capture photo. Please try again.');
      }
    } else {
      console.error('Video or canvas ref not available');
      alert('Camera not ready. Please try again.');
    }
  };

  const handleFaceRegistration = async () => {
    if (!formData.imageUrl) {
      alert('Please capture a photo first using the live camera');
      return;
    }

    if (!photoCapturedFromCamera) {
      alert('Face registration requires a photo captured from the live camera. File uploads are not allowed.');
      return;
    }

    setIsLoading(true);
    try {
      const faceService = FaceRecognitionService.getInstance();
      const success = await faceService.registerFace(formData.rollNo, formData.imageUrl);
      if (success) {
        setFaceRegistered(true);
        alert('Face registered successfully! The student will be recognized for attendance.');
      } else {
        alert('Face registration failed. Please ensure the face is clearly visible and try again.');
      }
    } catch (error) {
      console.error('Face registration failed:', error);
      alert('Face registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.name || !formData.rollNo || !formData.email || !formData.department || !formData.year) {
      alert('Please fill in all required fields');
      return;
    }

    if (!formData.imageUrl) {
      alert('Please capture the student photo using the live camera');
      return;
    }

    if (!photoCapturedFromCamera) {
      alert('Photo must be captured from the live camera. File uploads are not allowed.');
      return;
    }

    if (!faceRegistered) {
      alert('Please register the student\'s face for attendance recognition');
      return;
    }

    setIsLoading(true);
    try {
      const studentData = {
        rollNo: formData.rollNo,
        name: formData.name,
        email: formData.email,
        imageUrl: formData.imageUrl,
        department: formData.department,
        year: formData.year,
        role: 'student' as const,
        faceRegistered: true,
        photoCapturedFromCamera: true
      };

      await database.addStudent(studentData);

      // Reset form
      setFormData({
        name: '',
        rollNo: '',
        email: '',
        department: '',
        year: '',
        imageUrl: ''
      });
      setFaceRegistered(false);
      setPhotoCapturedFromCamera(false);
      setIsCameraActive(false);
      stopCamera();

      loadStudents();
      alert('Student added successfully!');
    } catch (error) {
      console.error('Error adding student:', error);
      alert('Failed to add student. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteStudent = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      await database.deleteStudent(id);
      loadStudents();
    }
  };

  if (userType !== 'faculty') {
    return (
      <div className='text-center py-12'>
        <div className='text-red-400 text-lg font-medium'>Access Denied</div>
        <p className='text-gray-400 mt-2'>Only faculty members can manage students.</p>
      </div>
    );
  }

  return (
    <div className='space-y-8'>
      {/* Add Student Form */}
      <div className='bg-white/10 backdrop-blur-lg p-8 rounded-xl shadow-2xl border border-white/20'>
        <h2 className='text-2xl font-bold mb-8 text-white text-center'>Add New Student</h2>

        <form onSubmit={handleSubmit} className='space-y-6'>
          {/* Student Photo Section */}
          <div className='space-y-4'>
            <label className='block text-lg font-medium text-gray-300 text-center'>
              Student Photo
            </label>

            {/* Camera Interface */}
            <div className='max-w-md mx-auto space-y-4'>
              {/* Camera Feed */}
              <div className='relative bg-gray-900 rounded-lg overflow-hidden aspect-video'>
                {/* Video element - always rendered and ready to display */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className='w-full h-full object-cover'
                  onClick={() => {
                    // Allow manual play if autoplay was blocked
                    if (videoRef.current && videoRef.current.paused && isCameraActive) {
                      console.log('User clicked video - attempting manual play');
                      videoRef.current.play().then(() => {
                        console.log('✅ Manual play successful!');
                      }).catch(err => {
                        console.error('❌ Manual play failed:', err);
                      });
                    }
                  }}
                  style={{
                    minHeight: '200px',
                    backgroundColor: '#1a1a1a',
                    display: 'block',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    zIndex: isCameraActive ? 10 : 1,
                    opacity: isCameraActive ? 1 : 0,
                    visibility: isCameraActive ? 'visible' : 'hidden',
                    transition: 'opacity 0.3s ease'
                  }}
                  onError={(e) => {
                    console.error('Video element error event:', e);
                    const video = e.target as HTMLVideoElement;
                    console.error('Video error details:', {
                      error: video.error,
                      networkState: video.networkState,
                      readyState: video.readyState
                    });
                    setVideoLoadingStatus('Video error occurred');
                  }}
                  onLoadStart={() => {
                    console.log('Video load started');
                  }}
                  onLoadedMetadata={(e) => {
                    const video = e.target as HTMLVideoElement;
                    console.log('Video metadata loaded:', {
                      width: video.videoWidth,
                      height: video.videoHeight
                    });
                  }}
                  onLoadedData={() => {
                    console.log('Video data loaded');
                  }}
                  onCanPlay={() => {
                    console.log('Video can play');
                  }}
                  onPlay={() => {
                    console.log('Video play event fired');
                  }}
                  onPlaying={() => {
                    console.log('Video is playing');
                  }}
                  onPause={() => {
                    console.log('Video paused');
                  }}
                  onWaiting={() => {
                    console.log('Video waiting/buffering');
                  }}
                />
                
                {/* Debug overlay - shows when camera is active but helps see video */}
                {isCameraActive && (
                  <div 
                    className='absolute top-2 left-2 px-2 py-1 bg-red-600 text-white text-xs font-bold rounded flex items-center space-x-1'
                    style={{ zIndex: 20 }}
                  >
                    <span className='w-2 h-2 bg-white rounded-full animate-pulse'></span>
                    <span>LIVE</span>
                  </div>
                )}
                
                {/* Placeholder when camera is not active and no photo captured */}
                {!isCameraActive && !formData.imageUrl && !isCameraLoading && (
                  <div className='absolute inset-0 flex items-center justify-center bg-gray-800' style={{ zIndex: 5 }}>
                    <div className='text-center text-white'>
                      <div className='h-12 w-12 mx-auto mb-2 opacity-50 text-4xl'>📹</div>
                      <p className='text-sm font-medium'>Camera not active</p>
                      <p className='text-xs opacity-75'>Click 'Start Camera' to begin</p>
                    </div>
                  </div>
                )}
                
                {/* Captured photo preview when camera is stopped */}
                {formData.imageUrl && !isCameraActive && !isCameraLoading && (
                  <div className='absolute inset-0' style={{ zIndex: 8 }}>
                    <img
                      src={formData.imageUrl}
                      alt='Captured student photo'
                      className='w-full h-full object-cover'
                    />
                  </div>
                )}
                
                {/* Loading overlay when camera is starting */}
                {isCameraLoading && (
                  <div className='absolute inset-0 flex items-center justify-center bg-gray-900/90' style={{ zIndex: 15 }}>
                    <div className='text-center text-white'>
                      <div className='animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mx-auto mb-3'></div>
                      <p className='text-sm font-medium'>Starting camera...</p>
                      <p className='text-xs opacity-75 mt-1'>Please allow camera access</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Video Status */}
              {videoLoadingStatus && (
                <div className='text-center text-sm text-gray-300 bg-gray-800/50 rounded-lg p-2'>
                  Status: {videoLoadingStatus}
                </div>
              )}

              {/* Camera Controls */}
              {!isCameraActive && !formData.imageUrl && (
                <div className='space-y-3'>
                  <button
                    type='button'
                    onClick={startCamera}
                    disabled={isCameraLoading}
                    className='w-full flex items-center justify-center px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-200 font-medium'
                  >
                    {isCameraLoading ? (
                      <>
                        <div className='animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2'></div>
                        Starting...
                      </>
                    ) : (
                      <>
                        📹 Start Camera
                      </>
                    )}
                  </button>
                  <div className='flex space-x-2'>
                    <button
                      type='button'
                      onClick={testCameraAccess}
                      className='flex-1 flex items-center justify-center px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors duration-200 font-medium text-sm'
                    >
                      🔍 Test Access
                    </button>
                    <button
                      type='button'
                      onClick={checkAvailableCameras}
                      className='flex-1 flex items-center justify-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 font-medium text-sm'
                    >
                      📷 Check Cameras
                    </button>
                  </div>
                </div>
              )}

              {isCameraActive && (
                <div className='flex justify-center space-x-3'>
                  <button
                    type='button'
                    onClick={capturePhoto}
                    className='flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 font-medium text-sm'
                  >
                    📸 Capture Photo
                  </button>
                  <button
                    type='button'
                    onClick={stopCamera}
                    className='flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200 font-medium text-sm'
                  >
                    ❌ Stop Camera
                  </button>
                </div>
              )}

              {/* Retake Photo Button */}
              {formData.imageUrl && !isCameraActive && !isCameraLoading && (
                <div className='flex justify-center'>
                  <button
                    type='button'
                    onClick={() => {
                      // Clear the captured photo and restart camera
                      setFormData(prev => ({ ...prev, imageUrl: '' }));
                      setPhotoCapturedFromCamera(false);
                      setFaceRegistered(false);
                      startCamera();
                    }}
                    className='flex items-center px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors duration-200 font-medium text-sm'
                  >
                    🔄 Retake Photo
                  </button>
                </div>
              )}

              {/* Photo Preview Warning */}
              {!formData.imageUrl && (
                <div className='bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-3'>
                  <div className='flex'>
                    <div className='flex-shrink-0'>
                      <svg className='h-5 w-5 text-yellow-400' viewBox='0 0 20 20' fill='currentColor'>
                        <path fillRule='evenodd' d='M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z' clipRule='evenodd' />
                      </svg>
                    </div>
                    <div className='ml-3'>
                      <p className='text-sm font-medium text-yellow-300'>
                        ⚠️ Photo capture is mandatory for face recognition
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Face Registration */}
              {formData.imageUrl && photoCapturedFromCamera && !faceRegistered && (
                <div className='space-y-3'>
                  <div className='bg-red-500/20 border border-red-500/30 rounded-lg p-3'>
                    <div className='flex'>
                      <div className='flex-shrink-0'>
                        <svg className='h-5 w-5 text-red-400' viewBox='0 0 20 20' fill='currentColor'>
                          <path fillRule='evenodd' d='M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z' clipRule='evenodd' />
                        </svg>
                      </div>
                      <div className='ml-3'>
                        <p className='text-sm font-medium text-red-300'>
                          ⚠️ Face registration required for attendance recognition
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    type='button'
                    onClick={handleFaceRegistration}
                    disabled={isLoading}
                    className='w-full flex items-center justify-center px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition-colors duration-200 font-medium'
                  >
                    {isLoading ? (
                      <>
                        <div className='animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2'></div>
                        Registering Face...
                      </>
                    ) : (
                      <>
                        ✅ Register Face for Recognition
                      </>
                    )}
                  </button>
                </div>
              )}

              {faceRegistered && (
                <div className='bg-green-500/20 border border-green-500/30 rounded-lg p-3'>
                  <div className='flex items-center'>
                    <span className='text-green-400 mr-3'>✅</span>
                    <p className='text-sm font-medium text-green-300'>
                      Face registered successfully!
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Form Fields */}
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <div>
              <label className='block text-sm font-medium text-gray-300 mb-2'>
                Full Name *
              </label>
              <input
                type='text'
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className='w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent'
                placeholder="Enter student's full name"
                required
              />
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-300 mb-2'>
                Roll Number *
              </label>
              <input
                type='text'
                value={formData.rollNo}
                onChange={(e) => setFormData(prev => ({ ...prev, rollNo: e.target.value }))}
                className='w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent'
                placeholder='Enter roll number'
                required
              />
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-300 mb-2'>
                Email *
              </label>
              <input
                type='email'
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className='w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent'
                placeholder='Enter email address'
                required
              />
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-300 mb-2'>
                Department *
              </label>
              <select
                value={formData.department}
                onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                className='w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent'
                required
              >
                <option value='' className='bg-slate-800'>Select Department</option>
                <option value='Computer Science' className='bg-slate-800'>Computer Science</option>
                <option value='Information Technology' className='bg-slate-800'>Information Technology</option>
                <option value='Electronics' className='bg-slate-800'>Electronics</option>
                <option value='Mechanical' className='bg-slate-800'>Mechanical</option>
                <option value='Civil' className='bg-slate-800'>Civil</option>
                <option value='Electrical' className='bg-slate-800'>Electrical</option>
              </select>
            </div>

            <div className='md:col-span-2'>
              <label className='block text-sm font-medium text-gray-300 mb-2'>
                Year *
              </label>
              <select
                value={formData.year}
                onChange={(e) => setFormData(prev => ({ ...prev, year: e.target.value }))}
                className='w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent'
                required
              >
                <option value='' className='bg-slate-800'>Select Year</option>
                <option value='1st Year' className='bg-slate-800'>1st Year</option>
                <option value='2nd Year' className='bg-slate-800'>2nd Year</option>
                <option value='3rd Year' className='bg-slate-800'>3rd Year</option>
                <option value='4th Year' className='bg-slate-800'>4th Year</option>
              </select>
            </div>
          </div>

          {/* Submit Button */}
          <div className='pt-4'>
            <button
              type='submit'
              disabled={isLoading || !faceRegistered}
              className='w-full flex items-center justify-center px-6 py-4 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-lg transition-all duration-200 font-semibold text-lg shadow-lg disabled:cursor-not-allowed'
            >
              {isLoading ? (
                <>
                  <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3'></div>
                  Adding Student...
                </>
              ) : (
                <>
                  👤 Add Student
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Students List */}
      <div className='bg-white/10 backdrop-blur-lg p-8 rounded-xl shadow-2xl border border-white/20'>
        <h3 className='text-xl font-bold mb-6 text-white'>Registered Students ({students.length})</h3>

        {students.length === 0 ? (
          <div className='text-center py-12'>
            <div className='text-6xl mb-4 text-gray-400'>👥</div>
            <p className='text-gray-400 text-lg'>No students registered yet</p>
            <p className='text-gray-500 text-sm mt-2'>Add students using the form above</p>
          </div>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
            {students.map((student) => (
              <div key={student.id} className='bg-white/5 rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-colors duration-200'>
                <div className='flex items-start space-x-4'>
                  <img
                    src={student.imageUrl || '/default-avatar.png'}
                    alt={student.name}
                    className='w-16 h-16 rounded-full object-cover border-2 border-purple-500'
                  />
                  <div className='flex-1 min-w-0'>
                    <h4 className='text-white font-semibold truncate'>{student.name}</h4>
                    <p className='text-gray-400 text-sm'>Roll: {student.rollNo}</p>
                    <p className='text-gray-400 text-sm'>{student.department}</p>
                    <p className='text-gray-400 text-sm'>{student.year}</p>
                    <div className='flex items-center mt-2'>
                      {student.faceRegistered ? (
                        <div className='flex items-center text-green-400 text-xs'>
                          ✅ Face Registered
                        </div>
                      ) : (
                        <div className='flex items-center text-red-400 text-xs'>
                          <svg className='w-4 h-4 mr-1' fill='currentColor' viewBox='0 0 20 20'>
                            <path fillRule='evenodd' d='M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z' clipRule='evenodd' />
                          </svg>
                          Face Not Registered
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteStudent(student.id)}
                    className='text-red-400 hover:text-red-300 transition-colors duration-200 p-1'
                    title='Delete student'
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} className='hidden' />
    </div>
  );
};

export default StudentManagement;
