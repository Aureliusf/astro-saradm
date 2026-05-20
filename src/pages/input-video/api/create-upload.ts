import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import {
  IMMUTABLE_CACHE_CONTROL,
  MAX_VIDEO_BYTES,
  createPresignedPutUrl,
  createVideoId,
  errorResponse,
  getRequiredStorage,
  methodNotAllowed,
  publicUrlForKey,
  sanitizeFilename,
  sanitizeTitle,
} from '../../../utils/videoStorage';

export const POST: APIRoute = async ({ request }) => {
  const storage = getRequiredStorage(env, true);
  if (!storage) {
    return errorResponse('Video storage is not configured.', 'VIDEO_STORAGE_NOT_CONFIGURED', 500);
  }

  try {
    await storage.bucket.list({ limit: 1 });
  } catch (error) {
    console.error('Video storage preflight failed', error);
    return errorResponse('Video storage is not reachable.', 'VIDEO_STORAGE_NOT_CONFIGURED', 500);
  }

  let data: Record<string, unknown>;
  try {
    data = await request.json();
  } catch {
    return errorResponse('Invalid JSON body.', 'INVALID_JSON', 400);
  }

  const title = sanitizeTitle(data.title);
  const filename = sanitizeFilename(data.filename);
  const size = Number(data.size);
  const contentType = data.contentType;
  const includePoster = data.includePoster === true;

  if (!title) return errorResponse('Title is required.', 'VALIDATION_ERROR', 400);
  if (contentType !== 'video/mp4') {
    return errorResponse('Only MP4 videos are supported.', 'VALIDATION_ERROR', 400);
  }
  if (!filename.toLowerCase().endsWith('.mp4')) {
    return errorResponse('Filename must end in .mp4.', 'VALIDATION_ERROR', 400);
  }
  if (!Number.isFinite(size) || size <= 0 || size > MAX_VIDEO_BYTES) {
    return errorResponse('Video must be 200MB or smaller.', 'VALIDATION_ERROR', 400);
  }

  const id = createVideoId();
  const videoKey = `videos/${id}.mp4`;
  const posterKey = `posters/${id}.jpg`;
  const videoHeaders = {
    'Content-Type': 'video/mp4',
    'Cache-Control': IMMUTABLE_CACHE_CONTROL,
    'x-amz-meta-title': title,
    'x-amz-meta-original-filename': filename,
  };
  const posterHeaders = {
    'Content-Type': 'image/jpeg',
    'Cache-Control': IMMUTABLE_CACHE_CONTROL,
  };

  try {
    const videoUploadUrl = await createPresignedPutUrl({ env, key: videoKey, headers: videoHeaders });
    if (!videoUploadUrl) {
      return errorResponse('Video storage is not configured.', 'VIDEO_STORAGE_NOT_CONFIGURED', 500);
    }

    const posterUploadUrl = includePoster
      ? await createPresignedPutUrl({ env, key: posterKey, headers: posterHeaders })
      : null;

    return new Response(
      JSON.stringify({
        id,
        title,
        video: {
          key: videoKey,
          uploadUrl: videoUploadUrl,
          publicUrl: publicUrlForKey(env, videoKey),
          requiredHeaders: videoHeaders,
        },
        poster: posterUploadUrl
          ? {
              key: posterKey,
              uploadUrl: posterUploadUrl,
              publicUrl: publicUrlForKey(env, posterKey),
              requiredHeaders: posterHeaders,
            }
          : undefined,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Failed to create upload URL', error);
    return errorResponse('Could not create upload URL.', 'VIDEO_STORAGE_NOT_CONFIGURED', 500);
  }
};

export const ALL: APIRoute = async () => methodNotAllowed('POST');
