import { ref, watch } from 'vue';
import { useWebSocket } from '@vueuse/core';
import { type CoreMessage } from 'ai';

// Simple event emitter
function createNanoEvents<Events>() {
  const events: { [E in keyof Events]?: ((...args: any[]) => void)[] } = {};
  return {
    events,
    emit<K extends keyof Events>(event: K, ...args: any[]) {
      (events[event] || []).forEach(fn => fn(...args));
    },
    on<K extends keyof Events>(event: K, cb: (...args: any[]) => void) {
      (events[event] = events[event] || []).push(cb);
      return () => (events[event] = (events[event] || []).filter(i => i !== cb));
    },
  };
}

type VoiceChatEvents = {
  'user-transcript': (transcript: string) => void;
  'assistant-transcript': (transcript: string) => void;
  'assistant-message': (message: CoreMessage) => void;
}

export const useVoiceChat = () => {
  const isVoiceModeActive = ref(false);
  const isRecording = ref(false);
  const isPlaying = ref(false);
  const error = ref<string | null>(null);
  const emitter = createNanoEvents<VoiceChatEvents>();

  let audioContext: AudioContext | null = null;
  let microphoneStream: MediaStream | null = null;
  let playerNode: AudioWorkletNode | null = null;
  
  // The websocket URL is constructed only on the client-side to avoid SSR errors.
  const wsUrl = process.client
    ? (() => {
        const url = new URL('/api/voice', window.location.href);
        url.protocol = url.protocol.replace('http', 'ws');
        return url.href;
      })()
    : undefined;

  const { status, data, send, open, close } = useWebSocket(wsUrl, {
    autoReconnect: true,
    immediate: false, // Don't connect immediately
    autoClose: false, // Don't close on component unmount
  });

  // Helper function to convert Float32Array to Int16Array
  const float32ToInt16 = (buffer: Float32Array) => {
    let l = buffer.length;
    const buf = new Int16Array(l);
    while (l--) {
      buf[l] = Math.min(1, buffer[l]) * 0x7FFF;
    }
    return buf.buffer;
  };

  // Helper function to convert Int16Array buffer to Float32Array
  const int16ToFloat32 = (buffer: Int16Array) => {
    const float32Array = new Float32Array(buffer.length);
    for (let i = 0; i < buffer.length; i++) {
      float32Array[i] = buffer[i] / 0x7FFF;
    }
    return float32Array;
  };

  const startVoiceChat = async () => {
    if (!isVoiceModeActive.value) return;

    // --- Step 1: Get Microphone Access ---
    try {
      microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e: any) {
      console.error('Failed to get user media:', e);
      if (e.name === 'NotAllowedError') {
        error.value = 'Microphone access was denied. Please grant permission in your browser settings.';
      } else if (e.name === 'NotFoundError') {
        error.value = 'No microphone found. Please connect a microphone and try again.';
      } else {
        error.value = 'Could not access microphone. Please ensure it is not in use by another application.';
      }
      isVoiceModeActive.value = false; // Toggle back the state
      return;
    }

    // --- Step 2: Setup Audio Context and WebSockets ---
    try {
      open(); // Start WebSocket connection

      audioContext = new AudioContext();
      // Explicitly resume the AudioContext, as it might be suspended by the browser.
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      await Promise.all([
        audioContext.audioWorklet.addModule('/recorder.worklet.js'),
        audioContext.audioWorklet.addModule('/player.worklet.js'),
      ]);
      
      // Setup recorder
      const source = audioContext.createMediaStreamSource(microphoneStream);
      const recorderNode = new AudioWorkletNode(audioContext, 'recorder-processor', {
        processorOptions: {
          bufferSize: 4096,
          channelCount: 1,
        }
      });
      
      // Listen for messages from the worklet (audio data)
      recorderNode.port.onmessage = (event) => {
        const audioData = event.data;
        // Convert to 16-bit PCM and send over WebSocket
        const pcmData = float32ToInt16(audioData);
        if (status.value === 'OPEN') {
          send(pcmData);
        }
      };

      source.connect(recorderNode);
      // We don't connect recorder to destination, no need to hear ourselves.

      // Setup player
      playerNode = new AudioWorkletNode(audioContext, 'player-processor', {
        processorOptions: {
            bufferSize: 8192,
            channelCount: 1,
        }
      });
      playerNode.connect(audioContext.destination);

      isRecording.value = true;
      error.value = null;
    } catch (e) {
      console.error('Error setting up audio components:', e);
      error.value = 'Failed to initialize audio components. Please try again.';
      stopVoiceChat(); // Clean up on failure
    }
  };

  const stopVoiceChat = () => {
    isRecording.value = false;
    isPlaying.value = false;
    
    // Stop microphone track
    microphoneStream?.getTracks().forEach(track => track.stop());
    microphoneStream = null;

    // Close AudioContext
    if (audioContext && audioContext.state !== 'closed') {
      audioContext.close();
    }
    audioContext = null;
    playerNode = null;

    // Close WebSocket connection
    if (status.value === 'OPEN') {
      close();
    }
  };

  const toggleVoiceMode = () => {
    isVoiceModeActive.value = !isVoiceModeActive.value;
    if (isVoiceModeActive.value) {
      startVoiceChat();
    } else {
      stopVoiceChat();
    }
  };
  
  // Handle incoming WebSocket messages
  watch(data, (newMessage) => {
    if (typeof newMessage === 'string') {
      try {
        const parsed = JSON.parse(newMessage);
        if (parsed.type === 'assistant_transcript') {
          emitter.emit('assistant-transcript', parsed.data);
        } else if (parsed.type === 'user_transcript') {
            emitter.emit('user-transcript', parsed.data);
        } else if (parsed.type === 'audio_status') {
           isPlaying.value = parsed.status === 'playing';
        }
      } catch (e) {
        console.warn('Received non-JSON WebSocket message:', newMessage);
      }
    } else if (newMessage instanceof Blob) {
      // Handle incoming audio blob
      // We will create a player to play this back.
    }
  });


  return {
    isVoiceModeActive,
    toggleVoiceMode, 
    isRecording, 
    isPlaying, 
    error, 
    status, 
    on: emitter.on, 
  }; 
}; 