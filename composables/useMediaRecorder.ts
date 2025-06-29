export const useMediaRecorder = () => {
  const isRecording = ref(false)
  const isPaused = ref(false)
  const recordingDuration = ref(0)
  const mediaRecorder = ref<MediaRecorder | null>(null)
  const chunks = ref<Blob[]>([])
  const stream = ref<MediaStream | null>(null)
  const error = ref<string | null>(null)
  
  let durationInterval: NodeJS.Timeout | null = null

  // Start recording audio
  const startAudioRecording = async (): Promise<boolean> => {
    try {
      error.value = null
      
      // Request microphone access
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      })
      
      stream.value = mediaStream
      chunks.value = []
      recordingDuration.value = 0
      
      // Create MediaRecorder instance
      const options = {
        mimeType: getSupportedMimeType()
      }
      
      mediaRecorder.value = new MediaRecorder(mediaStream, options)
      
      // Event handlers
      mediaRecorder.value.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.value.push(event.data)
        }
      }
      
      mediaRecorder.value.onstart = () => {
        isRecording.value = true
        startDurationTimer()
      }
      
      mediaRecorder.value.onstop = () => {
        isRecording.value = false
        isPaused.value = false
        stopDurationTimer()
        stopStream()
      }
      
      mediaRecorder.value.onpause = () => {
        isPaused.value = true
        stopDurationTimer()
      }
      
      mediaRecorder.value.onresume = () => {
        isPaused.value = false
        startDurationTimer()
      }
      
      mediaRecorder.value.onerror = (event: any) => {
        error.value = `Recording error: ${event.error}`
        stopRecording()
      }
      
      // Start recording
      mediaRecorder.value.start(1000) // Collect data every second
      
      return true
    } catch (err: any) {
      error.value = `Failed to start recording: ${err.message}`
      return false
    }
  }

  // Start recording video (for peer training)
  const startVideoRecording = async (): Promise<boolean> => {
    try {
      error.value = null
      
      // Request camera and microphone access
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      })
      
      stream.value = mediaStream
      chunks.value = []
      recordingDuration.value = 0
      
      // Create MediaRecorder instance
      const options = {
        mimeType: getSupportedVideoMimeType()
      }
      
      mediaRecorder.value = new MediaRecorder(mediaStream, options)
      
      // Event handlers (same as audio recording)
      setupRecorderEventHandlers()
      
      // Start recording
      mediaRecorder.value.start(1000)
      
      return true
    } catch (err: any) {
      error.value = `Failed to start video recording: ${err.message}`
      return false
    }
  }

  // Pause recording
  const pauseRecording = () => {
    if (mediaRecorder.value && isRecording.value && !isPaused.value) {
      mediaRecorder.value.pause()
    }
  }

  // Resume recording
  const resumeRecording = () => {
    if (mediaRecorder.value && isRecording.value && isPaused.value) {
      mediaRecorder.value.resume()
    }
  }

  // Stop recording
  const stopRecording = (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorder.value || !isRecording.value) {
        resolve(null)
        return
      }
      
      mediaRecorder.value.onstop = () => {
        isRecording.value = false
        isPaused.value = false
        stopDurationTimer()
        stopStream()
        
        if (chunks.value.length > 0) {
          const blob = new Blob(chunks.value, { 
            type: mediaRecorder.value?.mimeType || 'audio/webm' 
          })
          resolve(blob)
        } else {
          resolve(null)
        }
      }
      
      mediaRecorder.value.stop()
    })
  }

  // Get supported MIME type for audio
  const getSupportedMimeType = (): string => {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/wav'
    ]
    
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type
      }
    }
    
    return 'audio/webm' // Fallback
  }

  // Get supported MIME type for video
  const getSupportedVideoMimeType = (): string => {
    const types = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4'
    ]
    
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type
      }
    }
    
    return 'video/webm' // Fallback
  }

  // Setup recorder event handlers
  const setupRecorderEventHandlers = () => {
    if (!mediaRecorder.value) return
    
    mediaRecorder.value.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.value.push(event.data)
      }
    }
    
    mediaRecorder.value.onstart = () => {
      isRecording.value = true
      startDurationTimer()
    }
    
    mediaRecorder.value.onstop = () => {
      isRecording.value = false
      isPaused.value = false
      stopDurationTimer()
      stopStream()
    }
    
    mediaRecorder.value.onpause = () => {
      isPaused.value = true
      stopDurationTimer()
    }
    
    mediaRecorder.value.onresume = () => {
      isPaused.value = false
      startDurationTimer()
    }
    
    mediaRecorder.value.onerror = (event: any) => {
      error.value = `Recording error: ${event.error}`
      stopRecording()
    }
  }

  // Start duration timer
  const startDurationTimer = () => {
    durationInterval = setInterval(() => {
      recordingDuration.value += 1
    }, 1000)
  }

  // Stop duration timer
  const stopDurationTimer = () => {
    if (durationInterval) {
      clearInterval(durationInterval)
      durationInterval = null
    }
  }

  // Stop media stream
  const stopStream = () => {
    if (stream.value) {
      stream.value.getTracks().forEach(track => track.stop())
      stream.value = null
    }
  }

  // Format duration as MM:SS
  const formattedDuration = computed(() => {
    const minutes = Math.floor(recordingDuration.value / 60)
    const seconds = recordingDuration.value % 60
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  })

  // Cleanup on unmount
  onUnmounted(() => {
    if (isRecording.value) {
      stopRecording()
    }
    stopStream()
    stopDurationTimer()
  })

  return {
    // State
    isRecording: readonly(isRecording),
    isPaused: readonly(isPaused),
    recordingDuration: readonly(recordingDuration),
    formattedDuration: readonly(formattedDuration),
    error: readonly(error),
    
    // Actions
    startAudioRecording,
    startVideoRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    
    // Utilities
    getSupportedMimeType,
    getSupportedVideoMimeType
  }
} 