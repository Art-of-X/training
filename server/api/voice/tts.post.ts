import { serverSupabaseUser } from '#supabase/server';
import { prisma } from '~/server/utils/prisma';

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

        // Use a good fallback voice for all users
        const voiceId = 'rd0yPwDNh4pfbdvKbdrT'; // Fallback voice

        console.log(`TTS: Processing request for user ${user.id}, text length: ${text.length}`);

        // Call ElevenLabs API for text-to-speech
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'xi-api-key': process.env.ELEVENLABS_API_KEY!
            },
            body: JSON.stringify({
                text,
                model_id: 'eleven_multilingual_v2', // Or 'eleven_multilingual_v2' 'eleven_flash_v2_5'
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.5
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