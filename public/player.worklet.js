// This script is adapted from various Web Audio API examples for a simple audio player.
// It runs in an AudioWorkletGlobalScope.

class PlayerProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const processorOptions = options?.processorOptions || {};
    this.bufferSize = processorOptions.bufferSize || 8192;
    this.channelCount = processorOptions.channelCount || 1;
    this._buffer = new Float32Array(this.bufferSize);
    this._writeIndex = 0; // Where to write next in the buffer
    this._readIndex = 0;  // Where to read next from the buffer
    this._isPrebuffering = true;

    this.port.onmessage = (event) => {
      this.handleIncomingData(event.data);
    };
  }
  
  handleIncomingData(data) {
    // data is a Float32Array
    for (let i = 0; i < data.length; i++) {
        this._buffer[this._writeIndex] = data[i];
        this._writeIndex = (this._writeIndex + 1) % this.bufferSize;
    }

    // Once we have enough data, start playing.
    if (this._isPrebuffering && this.getBufferedSamples() > this.bufferSize / 2) {
        this._isPrebuffering = false;
    }
  }

  getBufferedSamples() {
      return (this._writeIndex - this._readIndex + this.bufferSize) % this.bufferSize;
  }

  process(inputs, outputs, parameters) {
    const output = outputs[0];
    const outputChannel = output[0];
    
    if (this._isPrebuffering || this.getBufferedSamples() < outputChannel.length) {
        // Not enough data to fill the output buffer, so we output silence.
        return true; 
    }

    for (let i = 0; i < outputChannel.length; i++) {
        outputChannel[i] = this._buffer[this._readIndex];
        this._readIndex = (this._readIndex + 1) % this.bufferSize;
    }
    
    // If buffer runs low, re-enable pre-buffering
    if (this.getBufferedSamples() < 128) { // 128 is the size of one output frame
        this._isPrebuffering = true;
    }

    return true; // Keep processor alive
  }
}

registerProcessor('player-processor', PlayerProcessor); 