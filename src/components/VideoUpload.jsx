/* @jsxRuntime classic */
import React, { useEffect, useMemo, useReducer, useRef, useState } from 'react';

const MAX_VIDEO_BYTES = 200 * 1024 * 1024;

function formatBytes(bytes) {
  if (!bytes) return '';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`;
}

function validateMp4(file) {
  if (!file) return 'Choose an MP4 file.';
  if (!file.name.toLowerCase().endsWith('.mp4') || file.type !== 'video/mp4') {
    return 'Only MP4 videos are supported.';
  }
  if (file.size <= 0 || file.size > MAX_VIDEO_BYTES) {
    return 'Video must be 200MB or smaller.';
  }
  return null;
}

async function waitForEvent(target, eventName, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error(`${eventName}_timeout`));
    }, timeoutMs);
    const cleanup = () => {
      window.clearTimeout(timeout);
      target.removeEventListener(eventName, onSuccess);
      target.removeEventListener('error', onError);
    };
    const onSuccess = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error(`${eventName}_error`));
    };
    target.addEventListener(eventName, onSuccess, { once: true });
    target.addEventListener('error', onError, { once: true });
  });
}

async function createPoster(file) {
  if (!file) throw new Error('missing_file');

  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.preload = 'metadata';
  video.muted = true;
  video.playsInline = true;
  video.src = objectUrl;

  try {
    // react-doctor-disable-next-line react-doctor/async-defer-await
    await waitForEvent(video, 'loadedmetadata', 8000);
    if (!Number.isFinite(video.duration) || video.duration <= 0) {
      throw new Error('invalid_duration');
    }

    video.currentTime = Math.min(1, video.duration * 0.1);
    await waitForEvent(video, 'seeked', 8000);

    const scale = Math.min(1, 1280 / video.videoWidth);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    return await new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('poster_export_failed'))),
        'image/jpeg',
        0.82,
      );
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

const initialUploadState = {
  status: 'idle',
  storageStatus: { loading: true, ready: false, error: '' },
  error: '',
  result: null,
  recentVideos: [],
};

function uploadReducer(state, action) {
  return { ...state, ...action };
}

export default function VideoUpload() {
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [posterBlob, setPosterBlob] = useState(null);
  const [posterWarning, setPosterWarning] = useState('');
  const [{ status, storageStatus, error, result, recentVideos }, setUploadState] = useReducer(
    uploadReducer,
    initialUploadState,
  );
  const inputRef = useRef(null);

  const fileError = useMemo(() => validateMp4(file), [file]);
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : ''), [file]);
  const posterUrl = useMemo(() => (posterBlob ? URL.createObjectURL(posterBlob) : ''), [posterBlob]);

  useEffect(() => () => previewUrl && URL.revokeObjectURL(previewUrl), [previewUrl]);
  useEffect(() => () => posterUrl && URL.revokeObjectURL(posterUrl), [posterUrl]);

  async function loadRecentVideos() {
    try {
      const response = await fetch('/api/videos?limit=5');
      if (!response.ok) return;
      const data = await response.json();
      setUploadState({ recentVideos: Array.isArray(data.videos) ? data.videos : [] });
    } catch {
      // Recent uploads are helpful, not essential.
    }
  }

  // react-doctor-disable-next-line react-doctor/no-fetch-in-effect
  useEffect(() => {
    async function loadStorageStatus() {
      try {
        const response = await fetch('/input-video/api/storage-status');
        const data = await response.json();
        setUploadState({
          storageStatus: {
            loading: false,
            ready: response.ok && data.ready === true,
            error: response.ok ? '' : data.error || 'Video storage is not configured.',
          },
        });
      } catch {
        setUploadState({
          storageStatus: {
            loading: false,
            ready: false,
            error: 'Video storage status could not be checked.',
          },
        });
      }
    }

    loadStorageStatus();
    loadRecentVideos();
  }, []);

  async function handleFile(nextFile) {
    setFile(nextFile);
    setUploadState({ result: null, error: '' });
    setPosterBlob(null);
    setPosterWarning('');

    const validationError = validateMp4(nextFile);
    if (validationError) return;

    try {
      const poster = await createPoster(nextFile);
      setPosterBlob(poster);
    } catch (posterError) {
      setPosterWarning(
        'Poster generation failed. The video can upload, but it will not be ready to select in Sanity until uploaded with a working poster.',
      );
      console.warn('poster_failed_reason', posterError);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setUploadState({ error: '', result: null });

    if (!title.trim()) {
      setUploadState({ error: 'Add a title before uploading.' });
      return;
    }
    if (fileError) {
      setUploadState({ error: fileError });
      return;
    }
    if (!storageStatus.ready) {
      setUploadState({ error: storageStatus.error || 'Video storage is not configured.' });
      return;
    }

    setUploadState({ status: 'uploading' });
    try {
      const formData = new FormData();
      formData.set('title', title);
      formData.set('video', file, file.name);
      if (posterBlob) formData.set('poster', posterBlob, 'poster.jpg');

      const uploadResponse = await fetch('/input-video/api/upload', {
        method: 'POST',
        body: formData,
      });
      const uploadData = await uploadResponse.json();
      if (!uploadResponse.ok) throw new Error(uploadData.error || 'Upload failed.');

      setUploadState({ result: uploadData, status: 'done' });
      await loadRecentVideos();
      window.setTimeout(loadRecentVideos, 30000);
    } catch (uploadError) {
      setUploadState({ status: 'idle', error: uploadError.message || 'Upload failed.' });
    }
  }

  async function copyVideoUrl(url) {
    await navigator.clipboard.writeText(url);
  }

  return (
    <div className="mx-auto w-full max-w-5xl text-[#220d0c]">
      <section
        className={`mb-6 border p-4 ${
          storageStatus.ready
            ? 'border-[#2f6f3e]/30 bg-[#f0f7f1]'
            : 'border-[#8b1f11]/30 bg-[#fff6f4]'
        }`}
      >
        <h2 className="title-font text-xl text-[#541409]">Video storage</h2>
        {storageStatus.loading ? (
          <p className="mt-1 text-sm">Checking R2 bucket and upload configuration…</p>
        ) : storageStatus.ready ? (
          <p className="mt-1 text-sm">R2 storage is reachable. Uploads are enabled.</p>
        ) : (
          <p className="mt-1 text-sm text-[#8b1f11]">
            {storageStatus.error || 'Video storage is not configured.'} Uploads are disabled until the
            R2 bucket binding is configured.
          </p>
        )}
      </section>

      <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-[minmax(0,1fr)_22rem]">
        <section
          className="border border-[#541409]/25 bg-[#f1ede6] p-5"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            handleFile(event.dataTransfer.files?.[0] || null);
          }}
        >
          <label className="title-font block text-xl text-[#541409]" htmlFor="video-title">
            Title
          </label>
          <input
            id="video-title"
            className="mt-2 w-full border border-[#541409]/25 bg-white px-3 py-2 text-base outline-[#541409]"
            value={title}
            maxLength={120}
            onChange={(event) => setTitle(event.target.value)}
          />

          <button
            type="button"
            className="mt-5 flex min-h-44 w-full flex-col items-center justify-center border border-dashed border-[#541409]/40 bg-white px-4 py-8 text-center hover:bg-[#f8f5f1]"
            onClick={() => inputRef.current?.click()}
          >
            <span className="title-font text-2xl text-[#541409]">Choose MP4</span>
            <span className="mt-2 text-sm opacity-75">Drag a web-ready H.264 MP4 here, up to 200MB.</span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="video/mp4,.mp4"
            className="hidden"
            onChange={(event) => handleFile(event.target.files?.[0] || null)}
          />

          {file && (
            <p className="mt-3 text-sm">
              {file.name} <span className="opacity-65">({formatBytes(file.size)})</span>
            </p>
          )}
          {fileError && file && <p className="mt-2 text-sm text-[#8b1f11]">{fileError}</p>}
          {posterWarning && <p className="mt-2 text-sm text-[#8b1f11]">{posterWarning}</p>}
          {error && <p className="mt-3 text-sm text-[#8b1f11]">{error}</p>}

          <button
            type="submit"
            disabled={status === 'uploading' || storageStatus.loading || !storageStatus.ready}
            className="mt-5 bg-[#541409] px-5 py-2 text-white disabled:cursor-wait disabled:opacity-60"
          >
            {status === 'uploading' ? 'Uploading…' : 'Upload video'}
          </button>
        </section>

        <aside className="space-y-4">
          {previewUrl && (
            <video className="w-full bg-[#0a0a0f]" controls preload="metadata" src={previewUrl} playsInline />
          )}
          {posterUrl && <img className="w-full" src={posterUrl} alt="Generated poster preview" />}
        </aside>
      </form>

      {result && (
        <section className="mt-8 border border-[#541409]/25 p-5">
          <h2 className="title-font text-2xl text-[#541409]">
            {result.readyForSanity ? 'Ready to select in Sanity' : 'Uploaded, not ready for Sanity'}
          </h2>
          <p className="mt-2">{result.video.title}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a className="underline" href={result.video.url} target="_blank" rel="noreferrer">
              Open video
            </a>
            <button type="button" className="underline" onClick={() => copyVideoUrl(result.video.url)}>
              Copy video URL
            </button>
            {result.poster?.exists && (
              <a className="underline" href={result.poster.url} target="_blank" rel="noreferrer">
                Open poster
              </a>
            )}
          </div>
          <ol className="mt-5 list-decimal space-y-1 pl-5 text-sm">
            <li>Open Sanity Studio.</li>
            <li>Edit the portfolio post.</li>
            <li>Find the Video field.</li>
            <li>Select this video by title.</li>
            <li>Add optional caption/settings.</li>
            <li>Publish.</li>
          </ol>
          <p className="mt-4 text-sm opacity-75">
            Export future uploads as H.264 MP4, web optimized or fast start when available, under
            200MB, preferably 1080p or smaller. Convert MOV files before uploading.
          </p>
          <p className="mt-2 text-sm opacity-75">
            Recent uploads can take up to about a minute to refresh because the public list is cached.
          </p>
        </section>
      )}

      <section className="mt-10">
        <h2 className="main-title-font text-2xl text-[#541409]">Recent uploads</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {recentVideos.map((video) => (
            <article key={video.key} className="border border-[#541409]/20">
              {video.posterExists ? (
                <img className="aspect-video w-full object-cover" src={video.posterUrl} alt="" loading="lazy" />
              ) : (
                <div className="flex aspect-video items-center justify-center bg-[#f1ede6] text-sm">
                  Not ready for Sanity
                </div>
              )}
              <div className="p-3">
                <h3 className="text-base font-semibold">{video.title}</h3>
                {!video.readyForSanity && <p className="mt-1 text-sm text-[#8b1f11]">Not ready for Sanity</p>}
                <button type="button" className="mt-2 text-sm underline" onClick={() => copyVideoUrl(video.url)}>
                  Copy link
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
