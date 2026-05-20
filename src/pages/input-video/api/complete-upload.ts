import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import {
  derivePosterKey,
  errorResponse,
  getRequiredStorage,
  methodNotAllowed,
  publicUrlForKey,
  titleFromKey,
  validatePosterObject,
  validateVideoObject,
} from '../../../utils/videoStorage';

export const POST: APIRoute = async ({ request }) => {
  const storage = getRequiredStorage(env);
  if (!storage) {
    return errorResponse('Video storage is not configured.', 'VIDEO_STORAGE_NOT_CONFIGURED', 500);
  }

  let data: Record<string, unknown>;
  try {
    data = await request.json();
  } catch {
    return errorResponse('Invalid JSON body.', 'INVALID_JSON', 400);
  }

  const key = typeof data.key === 'string' ? data.key : '';
  const posterKey =
    typeof data.posterKey === 'string' && data.posterKey ? data.posterKey : derivePosterKey(key);

  if (!key.startsWith('videos/') || !key.endsWith('.mp4')) {
    return errorResponse('Video key is invalid.', 'VALIDATION_ERROR', 400);
  }

  const videoHead = await storage.bucket.head(key);
  if (!videoHead) return errorResponse('Uploaded video was not found.', 'UPLOAD_NOT_FOUND', 404);

  const videoValidation = validateVideoObject(videoHead);
  if (!videoValidation.valid) {
    return errorResponse(videoValidation.reason || 'Video is invalid.', 'VIDEO_INVALID', 400);
  }

  const posterHead = posterKey ? await storage.bucket.head(posterKey).catch(() => null) : null;
  const posterValidation = validatePosterObject(posterHead);
  const title = videoHead.customMetadata?.title || titleFromKey(key);
  const readyForSanity = posterValidation.valid;

  return new Response(
    JSON.stringify({
      readyForSanity,
      video: {
        key,
        url: publicUrlForKey(env, key),
        title,
        size: videoHead.size,
        uploadedAt: videoHead.uploaded?.toISOString(),
      },
      poster: {
        key: posterKey,
        url: publicUrlForKey(env, posterKey),
        exists: posterValidation.valid,
        warning: posterValidation.valid ? undefined : posterValidation.reason,
      },
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
};

export const ALL: APIRoute = async () => methodNotAllowed('POST');
