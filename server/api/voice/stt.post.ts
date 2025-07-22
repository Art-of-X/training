import { serverSupabaseUser } from '#supabase/server';
import formidable from 'formidable';
import fs from 'fs/promises';
import { prisma } from '~/server/utils/prisma';
import { serverSupabaseClient } from '#supabase/server';
import { exec } from 'child_process';
import path from 'path';
import os from 'os';

// Helper: Convert audio to 16kHz mono WAV using ffmpeg
async function convertToWav16kMono(inputPath: string): Promise<Buffer> {
  const outputPath = path.join(os.tmpdir(), `converted_${Date.now()}.wav`);
  return new Promise((resolve, reject) => {
    exec(`ffmpeg -y -i "${inputPath}" -ar 16000 -ac 1 -c:a pcm_s16le "${outputPath}"`, async (error) => {
      if (error) {
        console.error('ffmpeg conversion error:', error);
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

        const audioFile = Array.isArray(files.audio) ? files.audio[0] : files.audio;
        if (!audioFile) {
            throw createError({ statusCode: 400, statusMessage: 'No audio file provided' });
        }

        console.log(`STT: Processing audio file for user ${user.id}, size: ${audioFile.size} bytes`);

        // Read audio file as buffer
        const audioBuffer = await fs.readFile(audioFile.filepath);

        // Convert to 16kHz mono WAV for best quality
        let wavBuffer: Buffer;
        try {
          wavBuffer = await convertToWav16kMono(audioFile.filepath);
          console.log('STT: Audio converted to 16kHz mono WAV, size:', wavBuffer.length);
        } catch (e) {
          console.error('STT: ffmpeg conversion failed, using original audio buffer. Error:', e);
          wavBuffer = audioBuffer;
        }

        // Create FormData for ElevenLabs STT API
        const formData = new FormData();
        
        // Create a proper File object
        const audioBlob = new Blob([wavBuffer], { 
            type: 'audio/wav' 
        });
        const audioFileForAPI = new File([audioBlob], 'audio.wav', {
            type: 'audio/wav'
        });
        
        // Add required parameters based on ElevenLabs documentation
        formData.append('file', audioFileForAPI);
        formData.append('model_id', 'scribe_v1'); // Required: use scribe_v1 model
        formData.append('language_code', 'en'); // Optional: specify English
        formData.append('tag_audio_events', 'false'); // Optional: disable audio event tagging
        formData.append('diarize', 'false'); // Optional: disable speaker diarization
        formData.append('timestamps_granularity', 'word'); // Optional: word-level timestamps
        
        console.log('STT: Calling ElevenLabs Speech-to-Text API...');
        
        // Call the correct ElevenLabs STT endpoint
        const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
            method: 'POST',
            headers: {
                'xi-api-key': process.env.ELEVENLABS_API_KEY!
                // Do not set Content-Type for FormData, let fetch set it with boundary
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
        
        // Extract transcript from ElevenLabs response format
        const transcript = result.text || '';
        const confidence = result.language_probability || 1.0; // Use language probability as confidence

        // --- Calculate durationSec from STT result or fallback ---
        let durationSec = null;
        if (result.words && result.words.length > 0) {
            const first = result.words[0];
            const last = result.words[result.words.length - 1];
            durationSec = Math.max(1, Math.round((last.end - first.start)));
        } else if (audioFile.mimetype?.includes('webm') && audioFile.size) {
            durationSec = Math.round(audioFile.size / 20000);
        }
        console.log('STT: Calculated durationSec for VoiceAgentRecording:', durationSec);

        // Save audio to Supabase Storage (voice-agent-recordings bucket)
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
            await prisma.voiceAgentRecording.create({
                data: {
                    userId: user.id,
                    audioPath: filePath,
                    durationSec
                }
            });
            // Keep only the most recent ~30s of audio for this user
            const allRecs = await prisma.voiceAgentRecording.findMany({
                where: { userId: user.id },
                orderBy: { createdAt: 'asc' }
            });
            let runningTotal = 0;
            const toDelete: string[] = [];
            for (let i = allRecs.length - 1; i >= 0; i--) {
                const rec = allRecs[i];
                runningTotal += rec.durationSec || 0;
                if (runningTotal > 30) {
                    toDelete.push(rec.id);
                }
            }
            if (toDelete.length > 0) {
                await prisma.voiceAgentRecording.deleteMany({ where: { id: { in: toDelete } } });
            }
        }

        // Clean up temp file
        await fs.unlink(audioFile.filepath).catch(() => {});

        console.log(`STT: Successfully transcribed audio with ElevenLabs, transcript length: ${transcript.length}`);

        return {
            text: transcript.trim(),
            confidence: confidence,
            language: result.language_code || 'en',
            words: result.words || [] // Include word-level timing if needed
        };

    } catch (e: any) {
        console.error('STT error:', e);
        throw createError({
            statusCode: e.statusCode || 500,
            statusMessage: e.statusMessage || e.message || 'Failed to transcribe audio'
        });
    }
}); 