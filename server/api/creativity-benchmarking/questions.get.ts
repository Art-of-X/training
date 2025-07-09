import { z } from 'zod';
import { readJsonData } from '../../utils/data';

const querySchema = z.object({
  type: z.enum(['aut', 'rat']),
});

export default defineEventHandler(async (event) => {
    const query = getQuery(event);
    const validation = querySchema.safeParse(query);

    if (!validation.success) {
        throw createError({ statusCode: 400, message: 'Invalid query parameters', data: validation.error.format() });
    }

    const { type } = validation.data;
    const fileName = `${type}-questions.json`;

    try {
        const questions = await readJsonData(fileName);
        return { questions };
    } catch (error: any) {
        console.error(`Error reading ${fileName}:`, error);
        throw createError({ statusCode: 500, message: `Failed to get ${type} questions.` });
    }
}); 