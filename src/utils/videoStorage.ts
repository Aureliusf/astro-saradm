import { AwsClient } from 'aws4fetch';

export const VIDEO_BUCKET_NAME = 'saradm-videos';
export const VIDEO_PUBLIC_BASE_URL = 'https://videos.saradm.com';
export const MAX_VIDEO_BYTES = 200 * 1024 * 1024;
export const MAX_POSTER_BYTES = 10 * 1024 * 1024;
export const IMMUTABLE_CACHE_CONTROL = 'public, max-age=31536000, immutable';

export const VIDEO_CORS_ORIGINS = new Set([
  'https://saradm.com',
  'https://www.saradm.com',
  'https://www.sanity.io',
  'https://saradm.sanity.studio',
  'http://localhost:4321',
  'http://localhost:3333',
]);

export type VideoEnv = {
  SARADM_VIDEOS?: R2Bucket;
  R2_ACCOUNT_ID?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_BUCKET_NAME?: string;
  R2_PUBLIC_BASE_URL?: string;
};

export type ApiErrorCode =
  | 'METHOD_NOT_ALLOWED'
  | 'INVALID_JSON'
  | 'VALIDATION_ERROR'
  | 'UPLOAD_NOT_FOUND'
  | 'VIDEO_INVALID'
  | 'R2_LIST_FAILED'
  | 'VIDEO_STORAGE_NOT_CONFIGURED';

export function jsonResponse(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
}

export function errorResponse(error: string, code: ApiErrorCode, status: number, headers?: HeadersInit) {
  return jsonResponse({ error, code }, { status, headers });
}

export function methodNotAllowed(allow: string) {
  return errorResponse('Method not allowed.', 'METHOD_NOT_ALLOWED', 405, { Allow: allow });
}

export function getCorsHeaders(request: Request) {
  const origin = request.headers.get('Origin');
  if (!origin || !VIDEO_CORS_ORIGINS.has(origin)) return {};

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };
}

export function getPublicBaseUrl(env: VideoEnv) {
  return (env.R2_PUBLIC_BASE_URL || VIDEO_PUBLIC_BASE_URL).replace(/\/$/, '');
}

export function publicUrlForKey(env: VideoEnv, key: string) {
  return `${getPublicBaseUrl(env)}/${key}`;
}

export function sanitizeTitle(value: unknown) {
  return String(value ?? '')
    .trim()
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .slice(0, 120);
}

export function sanitizeFilename(value: unknown) {
  const filename = String(value ?? '')
    .trim()
    .replace(/[\\/]/g, '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .slice(0, 180);

  return filename || 'upload.mp4';
}

export function createVideoId() {
  const invertedTimestamp = String(9999999999999 - Date.now()).padStart(13, '0');
  return `${invertedTimestamp}-${crypto.randomUUID()}`;
}

export function derivePosterKey(videoKey: string) {
  const id = videoKey.replace(/^videos\//, '').replace(/\.mp4$/, '');
  return `posters/${id}.jpg`;
}

export function titleFromKey(key: string) {
  return key.replace(/^videos\//, '').replace(/\.mp4$/, '');
}

export function validateVideoObject(head: R2Object | R2ObjectBody | null) {
  if (!head) return { valid: false, reason: 'Video was not found.' };
  if (head.size <= 0 || head.size > MAX_VIDEO_BYTES) {
    return { valid: false, reason: 'Video file size is invalid.' };
  }

  const contentType = head.httpMetadata?.contentType;
  if (contentType && contentType !== 'video/mp4') {
    return { valid: false, reason: 'Video must be an MP4 file.' };
  }

  return { valid: true };
}

export function validatePosterObject(head: R2Object | R2ObjectBody | null) {
  if (!head) return { valid: false, reason: 'Poster was not found.' };
  if (head.size <= 0 || head.size > MAX_POSTER_BYTES) {
    return { valid: false, reason: 'Poster file size is invalid.' };
  }

  const contentType = head.httpMetadata?.contentType;
  if (contentType && contentType !== 'image/jpeg') {
    return { valid: false, reason: 'Poster must be a JPEG image.' };
  }

  return { valid: true };
}

export function getRequiredStorage(env: VideoEnv, needsSigning = false) {
  const missing: string[] = [];
  if (!env.SARADM_VIDEOS) missing.push('SARADM_VIDEOS');
  if (needsSigning && !env.R2_ACCOUNT_ID) missing.push('R2_ACCOUNT_ID');
  if (needsSigning && !env.R2_ACCESS_KEY_ID) missing.push('R2_ACCESS_KEY_ID');
  if (needsSigning && !env.R2_SECRET_ACCESS_KEY) missing.push('R2_SECRET_ACCESS_KEY');

  if (missing.length > 0) {
    console.error('Missing video storage configuration:', missing.join(', '));
    return null;
  }

  return {
    bucket: env.SARADM_VIDEOS!,
    bucketName: env.R2_BUCKET_NAME || VIDEO_BUCKET_NAME,
    publicBaseUrl: getPublicBaseUrl(env),
    accountId: env.R2_ACCOUNT_ID!,
    accessKeyId: env.R2_ACCESS_KEY_ID!,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
  };
}

export async function createPresignedPutUrl(args: {
  env: VideoEnv;
  key: string;
  headers: Record<string, string>;
}) {
  const storage = getRequiredStorage(args.env, true);
  if (!storage) return null;

  const aws = new AwsClient({
    accessKeyId: storage.accessKeyId,
    secretAccessKey: storage.secretAccessKey,
    service: 's3',
    region: 'auto',
  });
  const url = new URL(
    `https://${storage.accountId}.r2.cloudflarestorage.com/${storage.bucketName}/${args.key}`,
  );
  url.searchParams.set('X-Amz-Expires', '300');
  const signed = await aws.sign(
    new Request(url.toString(), {
      method: 'PUT',
      headers: args.headers,
    }),
    { aws: { signQuery: true, allHeaders: true } },
  );

  return signed.url;
}

export async function headWithTimeout(bucket: R2Bucket, key: string, timeoutMs = 2000) {
  const timeout = new Promise<null>((resolve) => {
    setTimeout(() => resolve(null), timeoutMs);
  });

  return Promise.race([bucket.head(key).catch(() => null), timeout]);
}

export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
) {
  const results = new Array<R>(items.length);
  let next = 0;

  async function worker() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await mapper(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}
