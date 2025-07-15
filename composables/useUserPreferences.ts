export const useUserPreferences = () => {
  // Use Nuxt's useState for reactive state management
  const ttsEnabled = useState('tts-enabled', () => {
    // Try to get from localStorage, default to true
    if (process.client) {
      const stored = localStorage.getItem('tts-enabled')
      return stored !== null ? JSON.parse(stored) : true
    }
    return true
  })

  // Function to toggle TTS preference
  const toggleTTS = () => {
    ttsEnabled.value = !ttsEnabled.value
    // Save to localStorage
    if (process.client) {
      localStorage.setItem('tts-enabled', JSON.stringify(ttsEnabled.value))
    }
  }

  // Function to set TTS preference directly
  const setTTSEnabled = (enabled: boolean) => {
    ttsEnabled.value = enabled
    // Save to localStorage
    if (process.client) {
      localStorage.setItem('tts-enabled', JSON.stringify(ttsEnabled.value))
    }
  }

  return {
    ttsEnabled: readonly(ttsEnabled),
    toggleTTS,
    setTTSEnabled
  }
} 