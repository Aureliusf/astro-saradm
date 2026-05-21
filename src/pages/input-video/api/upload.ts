import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import {
  IMMUTABLE_CACHE_CONTROL,
  MAX_VIDEO_BYTES,
  createVideoId,
  errorResponse,
  getRequiredStorage,
  methodNotAllowed,
  publicUrlForKey,
  sanitizeFilename,
  sanitizeTitle,
  validatePosterObject,
  validateVideoObject,
} from '../../../utils/videoStorage';

export const POST: APIRoute = async ({ request }) => {
  const storage = getRequiredStorage(env);
  if (!storage) {
    return errorResponse('Video storage is not configured.', 'VIDEO_STORAGE_NOT_CONFIGURED', 500);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return errorResponse('Invalid upload body.', 'INVALID_JSON', 400);
  }

  const title = sanitizeTitle(formData.get('title'));
  const video = formData.get('video');
  const poster = formData.get('poster');

  if (!title) return errorResponse('Title is required.', 'VALIDATION_ERROR', 400);
  if (!(video instanceof File)) return errorResponse('Choose an MP4 file.', 'VALIDATION_ERROR', 400);
  if (video.type !== 'video/mp4') return errorResponse('Only MP4 videos are supported.', 'VALIDATION_ERROR', 400);
  if (!video.name.toLowerCase().endsWith('.mp4')) {
    return errorResponse('Filename must end in .mp4.', 'VALIDATION_ERROR', 400);
  }
  if (video.size <= 0 || video.size > MAX_VIDEO_BYTES) {
    return errorResponse('Video must be 200MB or smaller.', 'VALIDATION_ERROR', 400);
  }

  const id = createVideoId();
  const videoKey = `videos/${id}.mp4`;
  const posterKey = `posters/${id}.jpg`;

  await storage.bucket.put(videoKey, video.stream(), {
    httpMetadata: {
      contentType: 'video/mp4',
      cacheControl: IMMUTABLE_CACHE_CONTROL,
    },
    customMetadata: {
      title,
      originalFilename: sanitizeFilename(video.name),
    },
  });

  if (poster instanceof File && poster.size > 0) {
    if (poster.type !== 'image/jpeg') return errorResponse('Poster must be a JPEG image.', 'VALIDATION_ERROR', 400);
    await storage.bucket.put(posterKey, poster.stream(), {
      httpMetadata: {
        contentType: 'image/jpeg',
        cacheControl: IMMUTABLE_CACHE_CONTROL,
      },
    });
  }

  const [videoHead, posterHead] = await Promise.all([
    storage.bucket.head(videoKey),
    storage.bucket.head(posterKey).catch(() => null),
  ]);
  const videoValidation = validateVideoObject(videoHead);
  const posterValidation = validatePosterObject(posterHead);

  if (!videoValidation.valid) {
    return errorResponse(videoValidation.reason || 'Video is invalid.', 'VIDEO_INVALID', 400);
  }

  return new Response(
    JSON.stringify({
      readyForSanity: posterValidation.valid,
      video: {
        key: videoKey,
        url: publicUrlForKey(env, videoKey),
        title,
        size: videoHead?.size,
        uploadedAt: videoHead?.uploaded?.toISOString(),
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
