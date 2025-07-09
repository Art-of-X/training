import { serverSupabaseUser } from '#supabase/server';

export default defineEventHandler(async (event) => {
    try {
        const user = await serverSupabaseUser(event);
        if (!user) {
            throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
        }

        const formData = await readMultipartFormData(event);
        if (!formData) {
            throw createError({ statusCode: 400, statusMessage: 'No audio file provided' });
        }

        const audioFile = formData.find(item => item.name === 'audio');
        if (!audioFile || !audioFile.data) {
            throw createError({ statusCode: 400, statusMessage: 'Audio file is required' });
        }

        // Create a FormData object for the OpenAI API
        const openaiFormData = new FormData();
        
        // Create a File object from the buffer
        const file = new File([audioFile.data], audioFile.filename || 'audio.webm', {
            type: audioFile.type || 'audio/webm'
        });
        
        openaiFormData.append('file', file);
        openaiFormData.append('model', 'whisper-1');

        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: openaiFormData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('OpenAI API error:', errorText);
            throw createError({ 
                statusCode: response.status, 
                statusMessage: `Failed to transcribe audio: ${errorText}` 
            });
        }

        const result = await response.json();
        return { text: result.text };

    } catch (e: any) {
        console.error('STT Error:', e);
        throw createError({
            statusCode: e.statusCode || 500,
            statusMessage: e.statusMessage || e.message || 'Failed to process audio'
        });
    }
}); 