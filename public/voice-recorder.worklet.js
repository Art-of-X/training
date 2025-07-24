class VoiceRecorderWorklet extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 4096;
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    
    if (input.length > 0) {
      const inputChannel = input[0];
      
      for (let i = 0; i < inputChannel.length; i++) {
        this.buffer[this.bufferIndex] = inputChannel[i];
        this.bufferIndex++;
        
        if (this.bufferIndex >= this.bufferSize) {
          // Calculate audio level for visualization
          let sum = 0;
          for (let j = 0; j < this.bufferSize; j++) {
            sum += Math.abs(this.buffer[j]);
          }
          const level = sum / this.bufferSize;
          
          // Convert to 16-bit PCM for processing
          const pcmData = new Int16Array(this.bufferSize);
          for (let j = 0; j < this.bufferSize; j++) {
            pcmData[j] = Math.max(-32768, Math.min(32767, this.buffer[j] * 32768));
          }
          
          // Send audio data and level to main thread
          this.port.postMessage({
            type: 'audio-data',
            data: new Float32Array(this.buffer),
            level: level
          });
          
          this.bufferIndex = 0;
        }
      }
    }
    
    return true;
  }
}

registerProcessor('voice-recorder-worklet', VoiceRecorderWorklet); 