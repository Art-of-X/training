import { serverSupabaseUser, serverSupabaseClient } from '#supabase/server';
import formidable from 'formidable';
import fs from 'fs/promises';
import wav from 'wav-decoder';

export const config = { runtime: 'edge' };

// --- Voice cloning logic is currently DISABLED. To re-enable, uncomment the relevant blocks below. ---
export default defineEventHandler(async (event) => {
  // --- Voice cloning logic below is commented out ---
  /*
  // Auth
  const user = await serverSupabaseUser(event);
  if (!user) {
    return { status: 401, error: 'Unauthorized' };
  }

  // Parse multipart form
  const form = formidable({ multiples: false });
  const [fields, files] = await form.parse(event.node.req);
  const audioFile = Array.isArray(files.audio) ? files.audio[0] : files.audio;
  if (!audioFile) {
    return { status: 400, error: 'No audio file uploaded' };
  }

  // Check current total duration in bucket
  const supabase = await serverSupabaseClient(event);
  const { data: list, error: listError } = await supabase.storage.from('voice-clone-samples').list(user.id + '/', { limit: 100 });
  let totalDuration = 0;
  if (list && Array.isArray(list)) {
    for (const file of list) {
      // Estimate duration from file metadata.size (44.1kHz mono 16-bit PCM)
      if (file.metadata && file.metadata.size) {
        totalDuration += file.metadata.size / (44100 * 2);
      }
    }
  }
  if (totalDuration >= 30) {
    return { status: 200, message: 'Threshold reached, not uploading.' };
  }

  // Save file to Supabase Storage
  const buffer = await fs.readFile(audioFile.filepath);
  // Validate WAV file before upload
  try {
    const decoded = await wav.decode(buffer);
    if (!decoded || !decoded.sampleRate || !decoded.channelData) {
      return { status: 400, error: 'Invalid WAV file: cannot decode.' };
    }
    if (decoded.sampleRate !== 44100) {
      return { status: 400, error: 'WAV file must be 44.1kHz.' };
    }
    if (decoded.channelData.length !== 1) {
      return { status: 400, error: 'WAV file must be mono.' };
    }
  } catch (e) {
    return { status: 400, error: 'Invalid WAV file: decode failed.' };
  }
  const fileName = `${Date.now()}-voice-clone.wav`;
  const filePath = `${user.id}/${fileName}`;
  const { error: uploadError } = await supabase.storage.from('voice-clone-samples').upload(filePath, buffer, {
    contentType: 'audio/wav',
    upsert: false
  });
  if (uploadError) {
    return { status: 500, error: uploadError.message };
  }
  return { status: 200, message: 'Uploaded', path: filePath };
  */
  return { status: 410, error: 'Voice cloning is disabled.' };
}); 