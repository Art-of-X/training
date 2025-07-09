import { serverSupabaseUser } from '#supabase/server';

export default defineEventHandler(async (event) => {
    try {
        const user = await serverSupabaseUser(event);
        if (!user) {
            throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
        }

        const { text, voice = 'alloy', speed = 1.2 } = await readBody(event);
        
        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            throw createError({ statusCode: 400, statusMessage: 'Text is required' });
        }

        const response = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'tts-1',
                input: text.trim(),
                voice: voice,
                response_format: 'mp3',
                speed: speed
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('OpenAI TTS API error:', errorText);
            throw createError({ 
                statusCode: response.status, 
                statusMessage: `Failed to generate speech: ${errorText}` 
            });
        }

        const audioBuffer = await response.arrayBuffer();
        
        // Set appropriate headers for audio response
        setHeader(event, 'Content-Type', 'audio/mpeg');
        setHeader(event, 'Content-Length', audioBuffer.byteLength);
        
        return new Uint8Array(audioBuffer);

    } catch (e: any) {
        console.error('TTS Error:', e);
        throw createError({
            statusCode: e.statusCode || 500,
            statusMessage: e.statusMessage || e.message || 'Failed to generate speech'
        });
    }
}); 