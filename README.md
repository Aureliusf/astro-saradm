# Automated Portfolio: Sanity.io Headless CMS + Astro Frontend + CI/CD on a Global Edge Network

This project is a real-life, high-performing site I built for a Fashion Stylist. For saradm.com, I leveraged the ease of use of Sanity.io headless CMS with the flexibility of Astro as a Frontend to deliver a great user experience for the visitor, the stylist making the content, and for myself maintaining the site. I deployed the site on Cloudflare Pages, utilizing serverless functions for the contact form which I built in TypeScript and integrated with Resend's RESTful API.

## Technical Stack

-   **Frontend Framework:** [Astro](https://astro.build/)
-   **UI Library:** [React](https://react.dev/) (for interactive components)
-   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
-   **Headless CMS:** [Sanity.io](https://www.sanity.io/)
-   **Deployment & Hosting:** [Cloudflare Pages](https://pages.cloudflare.com/)
-   **Email Service:** [Resend](https://resend.com/)

## Architectural Highlights & Key Features

I architected this project with the main goal of enabling the end-user (the stylist) to admin the contents, while keeping the site fast, maintainable, and scalable from a development perspective. To achieve this, I used a blend of static site generation and serverless computing.

### 1. Hybrid Architecture with Astro

I built the frontend core of the site with Astro, which I chose for its excellent performance and wide compatibility for different sources. I configured the architecture for server-side rendering to support dynamic API routes while pre-rendering static pages for optimal load times.
This hybrid approach provided the best of both worlds: the speed of static sites for content and the flexibility of server-rendered applications for user-interactable pages. Every post gets generated at build time from a queries to the sanity.io CMS.

The site has two types of pages:
-   **Static Pages:** Astro statically generates most pages (`index`, `posts`, `[slug]`) at build time, ensuring near-instant delivery from Cloudflare's edge network around the world.
-   **Dynamic API Routes:** I wrote a serverless API endpoint (`/api/contact.ts`) to handle form submissions without requiring a traditional backend server.

### 2. Headless CMS for Content Management

I used Sanity.io to manage all project content, including text and images. This decouples the content from the presentation layer, allowing the stylist to update their portfolio without needing my intervention, following the JAMstack philosophy. Astro fetches this content at build time to generate the static pages.

Hosting all the images in Sanity.io allows me to use Sanity's CDN to serve images at the right size and anywhere in the world.

### 3. Serverless Contact Form

To handle user inquiries, I implemented a secure and robust contact form:

-   **Frontend:** I used a React component (`ContactForm.jsx`) to provide a modern, interactive user experience with client-side validation. The component manages form state, handles user input, and communicates with the backend API.

-   **Backend:** I wrote an Astro API route that acts as a serverless function deployed on Cloudflare. It receives the form data, validates it, and uses the Resend API to send the email.

-   **Security:** I managed API keys and environment variables securely using Cloudflare's environment variable system, accessing them via `locals.runtime.env` in the Astro backend to prevent exposure on the client-side.

### 4. Responsive Design & Image Optimization

With users being all around the world and interested in fashion, a major focus for me was creating a visually consistent and responsive experience across all devices.

-   **Tailwind CSS:** I used a utility-first approach for rapid, maintainable styling. I configured custom styles to keep a specific color palette across the whole site in `tailwind.config.js`.
-   **Responsive Image Loading:** I used the Astro `Image` component to implement `srcset` and `sizes` attributes. This ensures that browsers download the most appropriately sized image based on the device's viewport and resolution, significantly improving performance and reducing bandwidth.
-   **Dynamic Layouts:** I designed the project gallery with layouts that dynamically adjust based on content, such as aligning text based on the position of the corresponding image and different columns for big screens or mobile.

## Development Process & Problem-Solving

My development process was iterative, focusing on building features, fixing bugs, and continuous refinement.

-   **Client-Side Interactivity:** A key challenge I faced was implementing a tag-based filtering system on the `/posts` page that worked seamlessly with Astro's view transitions. The initial script I wrote failed on navigation, but I resolved this by leveraging Astro's `astro:page-load` event and the `is:inline` script attribute. This ensured the filter logic re-initialized correctly on each page load.

    ````javascript
    // src/pages/posts.astro
    const filterContainer = document.getElementById('tag-filters');
    const postItems = document.querySelectorAll('.post-item');

    if (filterContainer) {
      filterContainer.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('tag-button')) {
          // ... code to update active button style ...

          const selectedTag = target.dataset.tag;

          postItems.forEach(item => {
            const post = item as HTMLElement;
            const postTags = post.dataset.tags ? post.dataset.tags.split(',') : [];
            
            if (selectedTag === 'all' || postTags.includes(String(selectedTag))) {
              post.style.display = 'block';
            } else {
              post.style.display = 'none';
            }
          });
        }
      });
    }
    ````

-   **Build & Rendering:** Early in development, I migrated the project from a purely static output to a server-rendered output (`output: 'server'`) to accommodate the serverless API route for the contact form. I marked specific pages not requiring server-side logic for pre-rendering to maintain performance benefits.

This project demonstrates my strong understanding of modern web development principles, including JAMstack architecture, performance optimization, and the integration of disparate services (CMS, email) into a cohesive, serverless application.

## Video Upload Setup Runbook

This branch adds R2-hosted video uploads at `/input-video`, a public video listing at `/api/videos`, Sanity video selection, and public post rendering. The UI is already wired, but real uploads stay disabled until Cloudflare R2 and secrets are configured.

### 1. Create the R2 bucket

1. Open Cloudflare Dashboard.
2. Go to **R2 Object Storage**.
3. Create a bucket named:

```bash
    saradm-videos
```

4. Keep this bucket as the source of truth for uploaded videos. No D1, KV, or catalog JSON is needed for this MVP.

### 2. Configure the public video domain

1. In the `saradm-videos` R2 bucket, configure a public/custom domain:

```text
videos.saradm.com
```

2. Confirm that uploaded objects will resolve as:

```text
https://videos.saradm.com/videos/<id>.mp4
https://videos.saradm.com/posters/<id>.jpg
```

### 3. Configure R2 CORS

Allow direct browser `PUT` uploads to R2 from production and local development.

Allowed origins:

```text
https://saradm.com
https://www.saradm.com
http://localhost:4321
```

Allowed method:

```text
PUT
```

Allowed headers:

```text
Content-Type
Cache-Control
x-amz-meta-title
x-amz-meta-original-filename
```

Expose header:

```text
etag
```

### 4. Create scoped R2 S3 credentials

Create Cloudflare R2 S3 credentials scoped to the `saradm-videos` bucket.

Required permissions:

- object upload/write
- object metadata/read/head
- bucket list

Do not grant delete permission for the MVP unless cleanup tooling is added later.

Save these values:

```text
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
```

### 5. Configure Astro/Worker variables and secrets

`wrangler.toml` already includes:

```toml
[vars]
R2_BUCKET_NAME = "saradm-videos"
R2_PUBLIC_BASE_URL = "https://videos.saradm.com"

[[r2_buckets]]
binding = "SARADM_VIDEOS"
bucket_name = "saradm-videos"
```

Add the Cloudflare secrets:

```bash
wrangler secret put R2_ACCESS_KEY_ID
wrangler secret put R2_SECRET_ACCESS_KEY
```

Add `R2_ACCOUNT_ID` as a Cloudflare variable for the deployed Worker/Pages environment.

For local testing, create or update `.dev.vars` in this repo:

```bash
R2_ACCOUNT_ID="your-cloudflare-account-id"
R2_ACCESS_KEY_ID="your-r2-access-key-id"
R2_SECRET_ACCESS_KEY="your-r2-secret-access-key"
R2_BUCKET_NAME="saradm-videos"
R2_PUBLIC_BASE_URL="https://videos.saradm.com"
```

### 6. Verify the upload backend

Start the Astro app:

```bash
npm install
npm run dev
```

Open:

```text
http://127.0.0.1:4321/input-video
```

Before R2 is configured, the page should show:

```text
Video storage is not configured.
```

After R2 is configured, verify:

```bash
curl -i http://127.0.0.1:4321/input-video/api/storage-status
```

Expected success:

```json
{"ready":true}
```

Then upload a small H.264 MP4 through `/input-video`. The page should generate a poster, upload the MP4 and poster to R2, and show `Ready to select in Sanity`.

### 7. Verify the public video API

Check the public list:

```bash
curl -i http://127.0.0.1:4321/api/videos
```

Expected shape:

```json
{
  "videos": [],
  "cursor": null,
  "hasMore": false
}
```

After a successful upload, the uploaded video should appear with:

- `readyForSanity: true`
- `posterExists: true`
- `posterKey`
- `posterUrl`

### 8. Configure Cloudflare Access

Protect the upload UI and upload API routes with Cloudflare Access.

Protected paths:

```text
saradm.com/input-video*
www.saradm.com/input-video*
```

Allowed identities:

```text
saradm@gmail.com
aurelioflorezvalle@gmail.com
```

Do not protect:

```text
/api/videos
```

Sanity needs `/api/videos` to stay public/read-only so the Studio selector can list ready videos.

### 9. Deploy the Astro site

Build and deploy:

```bash
npm run build
npm run deploy
```

Post-deploy checks:

```bash
curl -I https://saradm.com/input-video
curl -I https://saradm.com/input-video/api/create-upload
curl -I https://saradm.com/api/videos
```

Expected:

- `/input-video` and `/input-video/api/create-upload` redirect to Access login, return `401`, or return `403` when unauthenticated.
- `/api/videos` returns a normal app response without an Access login redirect.

### 10. Deploy and verify Sanity Studio

In the Studio repo:

```bash
cd ../studio-saradm.com
npm install
npm run build
npm run deploy
```

Then open Sanity Studio, edit a post, and use the new **Video** field.

The selector should:

- fetch `https://saradm.com/api/videos?limit=100`
- show only videos where `readyForSanity === true`
- write the selected video, poster, title, and default `autoplay: false`
- allow caption/autoplay edits inside Sanity
- remove the whole video object with **Remove video**

### 11. Publish a post and rebuild Astro

Video fields are rendered on statically prerendered post pages. After selecting or changing a video in Sanity:

1. Publish the post in Sanity.
2. Rebuild/redeploy the Astro site.
3. Open the public post page.
4. Confirm the video appears between the body text and gallery.

### 12. Known MVP limits

- MP4 only.
- Maximum video size: 200MB.
- Browser-generated poster is required for Sanity selection.
- No MOV upload.
- No transcoding.
- No Cloudflare Stream.
- No delete/edit video tooling.
- No automatic Sanity write from the upload page.
- Public post pages do not check R2 existence at render time.
