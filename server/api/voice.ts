import { defineWebSocketHandler } from 'h3';

// Function to generate a sine wave for testing
function generateSineWave(frequency: number, duration: number, sampleRate: number): ArrayBuffer {
    const numSamples = duration * sampleRate;
    const buffer = new ArrayBuffer(numSamples * 2); // 16-bit samples
    const view = new DataView(buffer);
    const amplitude = 32767; // Max amplitude for 16-bit audio

    for (let i = 0; i < numSamples; i++) {
        const time = i / sampleRate;
        const value = Math.sin(2 * Math.PI * frequency * time) * amplitude;
        view.setInt16(i * 2, value, true); // true for little-endian
    }

    return buffer;
}

export default defineWebSocketHandler({
  open(peer) {
    console.log('[ws] open', peer);
    peer.send(JSON.stringify({ type: 'status', message: 'Connected to server' }));
  },

  async message(peer, message) {
    console.log('[ws] message', peer, message);
    
    // We assume any binary message is audio from the client.
    // In a real app, you'd process this. Here, we just trigger a response.
    // The `message` argument itself is the data (string | Buffer).
    if (Buffer.isBuffer(message)) {
        try {
            console.log('Received audio data from client.');

            // 1. Simulate user transcript
            peer.send(JSON.stringify({ type: 'user_transcript', data: 'I have just spoken.' }));
            
            // 2. Send back AI transcript
            peer.send(JSON.stringify({ type: 'assistant_transcript', data: 'I received your audio. Here is my spoken response.' }));

            // 3. Simulate the AI speaking audio
            peer.send(JSON.stringify({ type: 'audio_status', status: 'playing' }));

            // Generate and stream a 1-second 440Hz sine wave as a test sound
            const sampleRate = 24000; // Common sample rate for voice
            const audioBuffer = generateSineWave(440, 1, sampleRate);
            const chunkSize = 1024;

            for (let i = 0; i < audioBuffer.byteLength; i += chunkSize) {
                const chunk = audioBuffer.slice(i, i + chunkSize);
                peer.send(chunk);
                // Wait a bit to simulate streaming
                await new Promise(resolve => setTimeout(resolve, 50)); 
            }

            // Signal that speaking is done
            peer.send(JSON.stringify({ type: 'audio_status', status: 'idle' }));
        } catch (error) {
            console.warn(`[ws] Error sending message to client. It may have disconnected.`, error);
        }
    }
  },

  close(peer, event) {
    console.log('[ws] close', peer, event);
  },

  error(peer, error) {
    console.log('[ws] error', peer, error);
  },
}); 