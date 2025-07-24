import { serverSupabaseUser } from '#supabase/server';
import formidable from 'formidable';
import fs from 'fs/promises';
import { prisma } from '~/server/utils/prisma';
import { serverSupabaseClient } from '#supabase/server';
import { exec } from 'child_process';
import path from 'path';
import os from 'os';
import ffmpegPath from 'ffmpeg-static';

// Utility: Run ffmpeg with ffmpeg-static
function runFfmpeg(args: string[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const { spawn } = require('child_process');
    const ffmpeg = spawn(ffmpegPath, args);
    let stdout: Buffer[] = [];
    let stderr = '';
    ffmpeg.stdout.on('data', (data: Buffer) => stdout.push(data));
    ffmpeg.stderr.on('data', (data: Buffer) => stderr += data.toString());
    ffmpeg.on('close', (code: number) => {
      if (code === 0) {
        resolve(Buffer.concat(stdout));
      } else {
        console.error('ffmpeg error:', stderr);
        reject(new Error(stderr));
      }
    });
  });
}

// Helper: Convert audio to 16kHz mono WAV using ffmpeg-static
async function convertToWav16kMono(inputPath: string): Promise<Buffer> {
  const outputPath = path.join(os.tmpdir(), `converted_${Date.now()}.wav`);
  return new Promise((resolve, reject) => {
    exec(`${ffmpegPath} -y -i "${inputPath}" -ar 16000 -ac 1 -c:a pcm_s16le "${outputPath}"`, async (error) => {
      if (error) {
        console.error('ffmpeg 16kHz conversion error:', error);
        reject(error);
      } else {
        try {
          const buf = await fs.readFile(outputPath);
          await fs.unlink(outputPath).catch(() => {});
          resolve(buf);
        } catch (e) {
          reject(e);
        }
      }
    });
  });
}

// Helper: Convert audio to 44.1kHz mono WAV using ffmpeg-static
async function convertToWav44kMono(inputPath: string): Promise<Buffer> {
  const outputPath = path.join(os.tmpdir(), `clone44k_${Date.now()}.wav`);
  return new Promise((resolve, reject) => {
    exec(`${ffmpegPath} -y -i "${inputPath}" -ar 44100 -ac 1 -c:a pcm_s16le "${outputPath}"`, async (error) => {
      if (error) {
        console.error('ffmpeg 44kHz conversion error:', error);
        reject(error);
      } else {
        try {
          const buf = await fs.readFile(outputPath);
          await fs.unlink(outputPath).catch(() => {});
          resolve(buf);
        } catch (e) {
          reject(e);
        }
      }
    });
  });
}

// Helper: Convert audio to 44.1kHz mono WAV, trim silence, normalize, and denoise using ffmpeg-static
async function convertToWav44kMonoTrimSilence(inputPath: string): Promise<Buffer> {
  const outputPath = path.join(os.tmpdir(), `clone44k_trim_${Date.now()}.wav`);
  // Advanced processing: trim silence, normalize, denoise
  // -af "silenceremove=1:0:-50dB, dynaudnorm, afftdn"
  return new Promise((resolve, reject) => {
    exec(`${ffmpegPath} -y -i "${inputPath}" -ar 44100 -ac 1 -af silenceremove=1:0:-50dB,dynaudnorm,afftdn -c:a pcm_s16le "${outputPath}"`, async (error) => {
      if (error) {
        console.error('ffmpeg 44kHz trim/normalize/denoise error:', error);
        reject(error);
      } else {
        try {
          const buf = await fs.readFile(outputPath);
          await fs.unlink(outputPath).catch(() => {});
          console.log('Saved advanced processed voice clone sample:', outputPath);
          resolve(buf);
        } catch (e) {
          reject(e);
        }
      }
    });
  });
}

export default defineEventHandler(async (event) => {
    try {
        const user = await serverSupabaseUser(event);
        if (!user) {
            console.error('STT: No authenticated user found');
            throw createError({ statusCode: 401, statusMessage: 'Authentication required for STT' });
        }

        // Check for required environment variable
        if (!process.env.ELEVENLABS_API_KEY) {
            console.error('STT: ELEVENLABS_API_KEY not configured');
            throw createError({ statusCode: 500, statusMessage: 'STT service not configured' });
        }

        // Parse multipart form data
        const form = formidable({ maxFileSize: 50 * 1024 * 1024 }); // 50MB max
        const [fields, files] = await new Promise<[formidable.Fields, formidable.Files]>((resolve, reject) => {
            form.parse(event.node.req, (err, fields, files) => {
                if (err) reject(err);
                else resolve([fields, files]);
            });
        });

        // Read sessionId from form fields if present
        const sessionId = fields.sessionId ? String(fields.sessionId) : undefined;

        const audioFile = Array.isArray(files.audio) ? files.audio[0] : files.audio;
        if (!audioFile) {
            throw createError({ statusCode: 400, statusMessage: 'No audio file provided' });
        }

        console.log(`STT: Processing audio file for user ${user.id}, size: ${audioFile.size} bytes`);

        // Read audio file as buffer
        const audioBuffer = await fs.readFile(audioFile.filepath);

        // Convert to 16kHz mono WAV for STT (efficient, as before)
        let wavBuffer: Buffer;
        try {
          wavBuffer = await convertToWav16kMono(audioFile.filepath);
          console.log('STT: Audio converted to 16kHz mono WAV, size:', wavBuffer.length);
        } catch (e) {
          console.error('STT: ffmpeg 16kHz conversion failed, using original audio buffer. Error:', e);
          wavBuffer = audioBuffer;
        }

        // Create FormData for ElevenLabs STT API
        const formData = new FormData();
        const audioBlob = new Blob([wavBuffer], { type: 'audio/wav' });
        const audioFileForAPI = new File([audioBlob], 'audio.wav', { type: 'audio/wav' });
        formData.append('file', audioFileForAPI);
        formData.append('model_id', 'scribe_v1');
        // formData.append('language_code', 'en');
        formData.append('tag_audio_events', 'false');
        formData.append('diarize', 'false');
        formData.append('timestamps_granularity', 'word');
        console.log('STT: Calling ElevenLabs Speech-to-Text API...');
        const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
          method: 'POST',
          headers: {
            'xi-api-key': process.env.ELEVENLABS_API_KEY!
          },
          body: formData
        });
        console.log(`STT: ElevenLabs API response status: ${response.status} ${response.statusText}`);
        if (!response.ok) {
          const errorText = await response.text();
          console.error('ElevenLabs STT API error:', response.status, response.statusText, errorText);
          throw createError({
            statusCode: response.status,
            statusMessage: `ElevenLabs STT failed: ${response.status} - ${errorText}`
          });
        }
        const result = await response.json();
        console.log('STT: ElevenLabs API response:', result);
        const transcript = result.text || '';
        const confidence = result.language_probability || 1.0;

        // Only save if transcript is non-empty and at least 5 characters
        if (transcript.trim().length >= 5) {
          // Check current total duration for this user
          const allRecs = await prisma.voiceAgentRecording.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'asc' }
          });
          let runningTotal = 0;
          for (const rec of allRecs) {
            runningTotal += rec.durationSec || 0;
          }
          // Calculate duration of this new sample
          let durationSec = null;
          if (result.words && result.words.length > 0) {
            const first = result.words[0];
            const last = result.words[result.words.length - 1];
            durationSec = Math.max(1, Math.round((last.end - first.start)));
          } else if (audioFile.mimetype?.includes('webm') && audioFile.size) {
            durationSec = Math.max(1, Math.round(audioFile.size / 20000));
          }
          if (!durationSec || isNaN(durationSec)) durationSec = 1;
          console.log('STT: Saving voiceAgentRecording with durationSec:', durationSec);
          if ((runningTotal + (durationSec || 0)) > 30) {
            console.log('STT: Skipping save, user has already reached 30s of material.');
          } else {
            // Save audio to Supabase Storage (voice-agent-recordings bucket) for STT and aggregation
            const supabase = await serverSupabaseClient(event);
            const timestamp = Date.now();
            const fileName = `${timestamp}_voiceagent.wav`;
            const filePath = `${user.id}/${fileName}`;
            const { error: uploadError } = await supabase.storage
                .from('voice-agent-recordings')
                .upload(filePath, wavBuffer, {
                    contentType: 'audio/wav',
                    upsert: false
                });
            if (uploadError) {
                console.error('Supabase voice agent audio upload error:', uploadError);
                // Don't block STT, but skip DB save
            } else {
                console.log('STT: Saved voice agent audio:', filePath);
                await prisma.voiceAgentRecording.create({
                    data: {
                        userId: user.id,
                        audioPath: filePath,
                        durationSec
                    }
                });
            }
          }

          // --- Voice cloning logic below is commented out ---
          /*
          // Save high-quality version for voice cloning (44.1kHz mono WAV, silence trimmed)
          try {
            const wav44kTrimBuffer = await convertToWav44kMonoTrimSilence(audioFile.filepath);
            const supabase = await serverSupabaseClient(event);
            const timestamp = Date.now();
            const fileName = `${timestamp}_voiceclone.wav`;
            const filePath = `${user.id}/${fileName}`;
            const { error: uploadError } = await supabase.storage
              .from('voice-clone-samples')
              .upload(filePath, wav44kTrimBuffer, {
                contentType: 'audio/wav',
                upsert: false
              });
            if (uploadError) {
              console.error('Supabase voice clone sample upload error:', uploadError);
            } else {
              console.log('Saved high-quality voice clone sample:', filePath);
            }
          } catch (e) {
            console.error('Failed to save high-quality voice clone sample:', e);
          }
          */
        } else {
          console.log('STT: Skipping save, transcript too short or empty:', transcript);
        }

        // Clean up temp file
        await fs.unlink(audioFile.filepath).catch(() => {});

        console.log(`STT: Successfully transcribed audio with ElevenLabs, transcript length: ${transcript.length}`);

        return {
            text: transcript.trim(),
            confidence: confidence,
            language: result.language_code || 'en',
            words: result.words || [], // Include word-level timing if needed
            sessionId // propagate sessionId back to frontend
        };

    } catch (e: any) {
        console.error('STT error:', e);
        throw createError({
            statusCode: e.statusCode || 500,
            statusMessage: e.statusMessage || e.message || 'Failed to transcribe audio'
        });
    }
}); 