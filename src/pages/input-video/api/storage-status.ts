import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { errorResponse, getRequiredStorage, jsonResponse, methodNotAllowed } from '../../../utils/videoStorage';

export const GET: APIRoute = async () => {
  const storage = getRequiredStorage(env, true);
  if (!storage) {
    return errorResponse('Video storage is not configured.', 'VIDEO_STORAGE_NOT_CONFIGURED', 500);
  }

  try {
    await storage.bucket.list({ limit: 1 });
    return jsonResponse({ ready: true });
  } catch (error) {
    console.error('Video storage status check failed', error);
    return errorResponse('Video storage is not reachable.', 'VIDEO_STORAGE_NOT_CONFIGURED', 500);
  }
};

export const ALL: APIRoute = async () => methodNotAllowed('GET');
