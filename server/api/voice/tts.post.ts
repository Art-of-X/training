import { serverSupabaseUser } from '#supabase/server';
import { prisma } from '~/server/utils/prisma';
import { serverSupabaseClient } from '#supabase/server';

// --- Helper: getUserSpeechSample (aggregate monologue recordings) ---
import { createWriteStream } from 'fs';
import { Readable } from 'stream';
import { exec } from 'child_process';
import path from 'path';
import os from 'os';
import fs from 'fs/promises';
import ffmpegPath from 'ffmpeg-static';

// Remove getUserSpeechSample, upsampleTo24kHzWav, and all voice clone logic
// Only use the default voiceId for TTS

// --- Voice cloning logic is currently DISABLED. To re-enable, uncomment the relevant blocks below. ---
// --- Voice cloning logic below is commented out ---
/*
async function getUserSpeechSample(event, userId: string): Promise<Buffer | null> {
  // ... original function code ...
}

// Helper: Convert buffer to 24kHz mono WAV using ffmpeg-static
async function upsampleTo24kHzWav(inputBuffer: Buffer): Promise<Buffer> {
  // ... original function code ...
}
*/

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

        // If no voiceId, always use the default
        if (!voiceId) {
            // --- Voice cloning logic below is commented out ---
            /*
            const speechSample = await getUserSpeechSample(event, user.id); // pass event
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
            */
            voiceId = 's3TPKV1kjDlVtZbl4Ksh';
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