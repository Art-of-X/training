import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server';
import { v4 as uuidv4 } from 'uuid';

export default defineEventHandler(async (event) => {
    const user = await serverSupabaseUser(event);
    if (!user) {
        throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
    }

    const supabase = await serverSupabaseClient(event);
    const formData = await readMultipartFormData(event);

    const file = formData?.find(el => el.name === 'file');

    if (!file || !file.filename || !file.data) {
        throw createError({ statusCode: 400, statusMessage: 'No file provided' });
    }

    // Create a unique path for the temporary file
    const fileExtension = file.filename.split('.').pop();
    const filePath = `temp/${user.id}/${uuidv4()}.${fileExtension}`;

    const { error: uploadError } = await supabase.storage
        .from('uploads') // Assuming your bucket is named 'uploads'
        .upload(filePath, file.data, {
            contentType: file.type,
            upsert: false,
        });

    if (uploadError) {
        console.error('Error uploading temporary file:', uploadError);
        throw createError({ statusCode: 500, statusMessage: 'Failed to upload file to storage' });
    }

    const { data: { publicUrl } } = supabase.storage
        .from('uploads')
        .getPublicUrl(filePath);

    return { url: publicUrl };
}); 