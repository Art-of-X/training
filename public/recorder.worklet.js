// This script is a slightly modified version of the one from the Web Audio API documentation and various examples.
// It's designed to run in an AudioWorkletGlobalScope.

class RecorderProcessor extends AudioWorkletProcessor {
  // A simple circular buffer for audio data
  constructor(options) {
    super();
    const processorOptions = options?.processorOptions || {};
    this.bufferSize = processorOptions.bufferSize || 4096;
    this.channelCount = processorOptions.channelCount || 1;
    this._buffer = new Float32Array(this.bufferSize);
    this._position = 0; // The current position in the buffer

    this.port.onmessage = (event) => {
      // We can receive messages from the main thread if needed, e.g., to stop recording.
      console.log('Worklet received message:', event.data);
    };
  }

  process(inputs, outputs, parameters) {
    // We expect a single input, with a single channel (mono).
    const input = inputs[0];
    const channelData = input[0];

    // If there's no input, we don't need to do anything.
    if (!channelData) {
      return true; // Keep the processor alive
    }

    // Copy the incoming audio data to our circular buffer.
    const data = channelData;
    for (let i = 0; i < data.length; i++) {
      this._buffer[this._position++] = data[i];
      // When the buffer is full, send it to the main thread.
      if (this._position >= this.bufferSize) {
        this.port.postMessage(this._buffer);
        // Reset the position to start filling the buffer again.
        this._position = 0;
      }
    }

    // Return true to keep the processor alive.
    // If we returned false, the processor would be destroyed.
    return true;
  }
}

registerProcessor('recorder-processor', RecorderProcessor); 