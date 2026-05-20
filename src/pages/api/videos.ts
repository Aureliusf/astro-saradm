import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import {
  derivePosterKey,
  errorResponse,
  getCorsHeaders,
  getRequiredStorage,
  headWithTimeout,
  mapWithConcurrency,
  methodNotAllowed,
  publicUrlForKey,
  titleFromKey,
  validatePosterObject,
  validateVideoObject,
} from '../../utils/videoStorage';

export const OPTIONS: APIRoute = async ({ request }) => {
  return new Response(null, { status: 204, headers: getCorsHeaders(request) });
};

export const GET: APIRoute = async ({ request }) => {
  const corsHeaders = getCorsHeaders(request);
  const storage = getRequiredStorage(env);
  if (!storage) {
    return errorResponse('Video storage is not configured.', 'VIDEO_STORAGE_NOT_CONFIGURED', 500, corsHeaders);
  }

  const url = new URL(request.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 100), 1), 100);
  const cursor = url.searchParams.get('cursor') || undefined;

  try {
    const list = await storage.bucket.list({ prefix: 'videos/', limit, cursor });
    const objects = list.objects.filter((object) => object.key.endsWith('.mp4'));
    let videoHeadFailures = 0;
    let posterHeadFailures = 0;

    const videos = await mapWithConcurrency(objects, 10, async (object) => {
      const videoHead = await headWithTimeout(storage.bucket, object.key);
      if (!videoHead) videoHeadFailures += 1;

      const posterKey = derivePosterKey(object.key);
      const posterHead = await headWithTimeout(storage.bucket, posterKey);
      if (!posterHead) posterHeadFailures += 1;

      const videoValidation = validateVideoObject(videoHead);
      const posterValidation = validatePosterObject(posterHead);
      const readyForSanity = videoValidation.valid && posterValidation.valid;

      return {
        key: object.key,
        url: publicUrlForKey(env, object.key),
        title: videoHead?.customMetadata?.title || titleFromKey(object.key),
        size: videoHead?.size || object.size,
        uploadedAt: (videoHead?.uploaded || object.uploaded)?.toISOString(),
        posterExists: posterValidation.valid,
        readyForSanity,
        posterKey,
        posterUrl: publicUrlForKey(env, posterKey),
      };
    });

    if (videoHeadFailures || posterHeadFailures) {
      console.warn('Video list head failures', { videoHeadFailures, posterHeadFailures });
    }

    return new Response(
      JSON.stringify({
        videos,
        cursor: list.truncated ? list.cursor : null,
        hasMore: list.truncated,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
          ...corsHeaders,
        },
      },
    );
  } catch (error) {
    console.error('Could not list videos', error);
    return errorResponse('Could not list videos.', 'R2_LIST_FAILED', 500, corsHeaders);
  }
};

export const ALL: APIRoute = async () => methodNotAllowed('GET, OPTIONS');
