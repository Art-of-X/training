import { createAnthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';
import { createDatabaseQueryTool } from '~/server/utils/ai-tools';
import { serverSupabaseUser } from '#supabase/server';

export default defineEventHandler(async (event) => {
    try {
        const user = await serverSupabaseUser(event);
        if (!user) {
            throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
        }

        const { messages } = await readBody(event);

        const anthropic = createAnthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
        });

        const result = await streamText({
            model: anthropic('claude-3-5-sonnet-20240620'),
            system: 'You are a creative assistant. After using your tools to find information, you MUST summarize the results and answer the user\'s question directly and concisely. Do not explain your process, just give the user the information they asked for.',
            messages,
            tools: {
                queryDatabase: createDatabaseQueryTool(user.id)
            },
            maxSteps: 5,
            toolChoice: 'auto',
        });

        return result.toDataStream();
    } catch(e: any) {
        console.error(e);
        throw createError({
            statusCode: 500,
            statusMessage: e.message
        });
    }
}); 