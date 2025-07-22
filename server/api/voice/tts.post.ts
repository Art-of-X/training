import { serverSupabaseUser } from '#supabase/server';
import { prisma } from '~/server/utils/prisma';

// --- Helper: getUserSpeechSample (aggregate monologue recordings) ---
import { createWriteStream } from 'fs';
import { Readable } from 'stream';
import { exec } from 'child_process';
import path from 'path';
import os from 'os';
import fs from 'fs/promises';
import ffmpegPath from 'ffmpeg-static';

async function getUserSpeechSample(userId: string): Promise<Buffer | null> {
  // Fetch up to 30s of agent conversation audio (VoiceAgentRecording)
  const agentRecs = await prisma.voiceAgentRecording.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    select: { audioPath: true, durationSec: true }
  });

  // Optionally, also fetch monologue recordings (fallback)
  const monoRecs = await prisma.monologueRecording.findMany({
    where: { userId, audioPath: { not: null } },
    orderBy: { createdAt: 'asc' },
    select: { audioPath: true, durationSeconds: true }
  });

  let totalDuration = 0;
  let buffers: Buffer[] = [];
  let urls: string[] = [];
  let sources: string[] = [];

  function getAgentUrl(audioPath: string): string {
    return `${process.env.SUPABASE_URL}/storage/v1/object/public/voice-agent-recordings/${audioPath}`;
  }
  function getMonoUrl(audioPath: string): string {
    return `${process.env.SUPABASE_URL}/storage/v1/object/public/monologue-recordings/${audioPath}`;
  }

  // Prioritize agent recordings
  for (const rec of agentRecs) {
    if (!rec.audioPath || !rec.durationSec) continue;
    if (totalDuration >= 30) break;
    try {
      const url = getAgentUrl(rec.audioPath);
      urls.push(url);
      sources.push('agent');
      const res = await fetch(url);
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      buffers.push(buf);
      totalDuration += rec.durationSec;
    } catch (e) {
      continue;
    }
  }
  // If less than 20s, supplement with monologue recordings
  if (totalDuration < 20) {
    for (const rec of monoRecs) {
      if (!rec.audioPath || !rec.durationSeconds) continue;
      if (totalDuration >= 30) break;
      try {
        const url = getMonoUrl(rec.audioPath);
        urls.push(url);
        sources.push('monologue');
        const res = await fetch(url);
        if (!res.ok) continue;
        const buf = Buffer.from(await res.arrayBuffer());
        buffers.push(buf);
        totalDuration += rec.durationSeconds;
      } catch (e) {
        continue;
      }
    }
  }

  console.log(`[VOICE CLONE] Aggregated duration: ${totalDuration}s from ${buffers.length} files. URLs:`, urls, 'Sources:', sources);

  if (totalDuration < 20) return null;

  function stripWavHeader(buffer: Buffer): Buffer {
    return buffer.slice(44);
  }

  let finalBuffer = Buffer.concat([
    buffers[0].slice(0, 44),
    ...buffers.map((b, i) => (i === 0 ? b.slice(44) : stripWavHeader(b)))
  ]);

  return finalBuffer;
}

// Helper: Convert buffer to 24kHz mono WAV using ffmpeg-static
async function upsampleTo24kHzWav(inputBuffer: Buffer): Promise<Buffer> {
  const inputPath = path.join(os.tmpdir(), `clone_input_${Date.now()}.wav`);
  const outputPath = path.join(os.tmpdir(), `clone_output_${Date.now()}.wav`);
  await fs.writeFile(inputPath, inputBuffer);
  return new Promise((resolve, reject) => {
    exec(`${ffmpegPath} -y -i "${inputPath}" -ar 24000 -ac 1 -c:a pcm_s16le "${outputPath}"`, async (error) => {
      await fs.unlink(inputPath).catch(() => {});
      if (error) {
        console.error('[VOICE CLONE] ffmpeg upsample error:', error);
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
            console.error('TTS: No authenticated user found');
            throw createError({ statusCode: 401, statusMessage: 'Authentication required for TTS' });
        }

        const body = await readBody(event);
        const { text } = body;

        if (!text) {
            throw createError({ statusCode: 400, statusMessage: 'Text is required' });
        }

        // Check for required environment variable
        if (!process.env.ELEVENLABS_API_KEY) {
            console.error('TTS: ELEVENLABS_API_KEY not configured');
            throw createError({ statusCode: 500, statusMessage: 'TTS service not configured' });
        }

        // --- New logic: fetch user voiceId from preferences ---
        let userPreferences = await prisma.userPreferences.findUnique({
            where: { userId: user.id },
            select: { voiceId: true }
        });
        let voiceId = userPreferences?.voiceId || null;

        // If no voiceId, check if we have enough user speech to clone
        if (!voiceId) {
            const speechSample = await getUserSpeechSample(user.id); // returns Buffer or null
            if (speechSample) {
                // Upsample to 24kHz mono WAV for cloning
                let upsampledSample: Buffer;
                try {
                  upsampledSample = await upsampleTo24kHzWav(speechSample);
                  console.log('[VOICE CLONE] Upsampled audio to 24kHz mono WAV, size:', upsampledSample.length);
                } catch (e) {
                  console.error('[VOICE CLONE] Upsampling failed, using original sample. Error:', e);
                  upsampledSample = speechSample;
                }
                console.log('[VOICE CLONE] Triggering ElevenLabs voice clone API...');
                const cloneRes = await fetch('https://api.elevenlabs.io/v1/voices/add', {
                    method: 'POST',
                    headers: {
                        'xi-api-key': process.env.ELEVENLABS_API_KEY!,
                    },
                    body: (() => {
                        const form = new FormData();
                        form.append('name', `User-${user.id}`);
                        form.append('files', new Blob([upsampledSample], { type: 'audio/wav' }), 'sample.wav');
                        return form;
                    })(),
                });
                if (cloneRes.ok) {
                    const cloneData = await cloneRes.json();
                    voiceId = cloneData.voice_id;
                    await prisma.userPreferences.update({
                        where: { userId: user.id },
                        data: { voiceId }
                    });
                    console.log(`[VOICE CLONE] Success! New voiceId: ${voiceId}`);
                } else {
                    const errText = await cloneRes.text();
                    console.error('[VOICE CLONE] ElevenLabs API error:', errText);
                    voiceId = 's3TPKV1kjDlVtZbl4Ksh';
                }
            } else {
                console.log('[VOICE CLONE] Not enough speech for cloning.');
                voiceId = 's3TPKV1kjDlVtZbl4Ksh';
            }
        }

        console.log(`TTS: Processing request for user ${user.id}, text length: ${text.length}`);

        // Use the resolved voiceId for TTS
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'xi-api-key': process.env.ELEVENLABS_API_KEY!
            },
            body: JSON.stringify({
                text,
                model_id: 'eleven_turbo_v2_5',
                speed: 1.4,
                voice_settings: {
                    stability: 0.6,
                    similarity_boost: 0.8
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('TTS: ElevenLabs API error:', response.status, errorText);
            throw createError({
                statusCode: response.status,
                statusMessage: 'Failed to generate speech'
            });
        }

        // Get the audio data as buffer
        const audioBuffer = await response.arrayBuffer();
        
        // Set response headers for audio
        setHeader(event, 'Content-Type', 'audio/mpeg');
        
        console.log(`TTS: Successfully generated audio, size: ${audioBuffer.byteLength} bytes`);
        return new Uint8Array(audioBuffer);

    } catch (error: any) {
        console.error('TTS error:', error);
        throw createError({
            statusCode: error.statusCode || 500,
            statusMessage: error.statusMessage || 'Internal server error'
        });
    }
}); 