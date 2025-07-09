import { defineEventHandler, createError, readBody, getRequestHeader, readMultipartFormData } from 'h3';
import { serverSupabaseUser, serverSupabaseClient } from '#supabase/server';
import { prisma } from '../../utils/prisma';

export default defineEventHandler(async (event) => {
    const user = await serverSupabaseUser(event);
    if (!user) {
        throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
    }

    const contentType = getRequestHeader(event, 'content-type');

    try {
        // Handle link-based submission
        if (contentType && contentType.includes('application/json')) {
            const { link, description } = await readBody(event);
            if (!link || !description) {
                throw createError({ statusCode: 400, statusMessage: 'Link and description are required' });
            }

            const newLink = await prisma.portfolioItem.create({
                data: { userId: user.id, link, description },
            });
            return { success: true, data: newLink };
        }
        
        // Handle file upload submission
        if (contentType && contentType.includes('multipart/form-data')) {
            const formData = await readMultipartFormData(event);
            if (!formData) {
                throw createError({ statusCode: 400, statusMessage: 'No form data provided' });
            }

            const descriptionEntry = formData.find((part) => part.name === 'description');
            const description = descriptionEntry ? descriptionEntry.data.toString() : '';
            if (!description) {
                throw createError({ statusCode: 400, statusMessage: 'Description is required' });
            }

            const file = formData.find((part) => part.name === 'file' && part.filename);
            if (!file || !file.filename || !file.data) {
                throw createError({ statusCode: 400, statusMessage: 'No file provided' });
            }

            const maxSize = 10 * 1024 * 1024; // 10MB
            if (file.data.length > maxSize) {
                throw createError({ statusCode: 400, statusMessage: `File too large: ${file.filename}. Maximum size is 10MB.` });
            }

            const supabase = await serverSupabaseClient(event);
            const fileName = `${Date.now()}_${file.filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
            const filePath = `portfolio/${user.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('uploads')
                .upload(filePath, file.data, { contentType: file.type || 'application/octet-stream', upsert: false });

            if (uploadError) {
                throw createError({ statusCode: 500, statusMessage: `Failed to upload ${file.filename}: ${uploadError.message}` });
            }

            const newItem = await prisma.portfolioItem.create({
                data: { userId: user.id, description, filePath: filePath },
            });

            return { success: true, data: newItem };
        }

        // If content type is not supported
        throw createError({ statusCode: 415, statusMessage: 'Unsupported Content-Type' });

    } catch (error: any) {
        if (error.statusCode) {
            throw error;
        }
        console.error('Error in portfolio submission:', error);
        throw createError({ statusCode: 500, statusMessage: 'Internal server error' });
    }
}); 