# Portfolio Project: A Headless CMS-Powered Fashion Portfolio with Astro and Cloudflare

This project is a high-performance, responsive portfolio website built for a fashion stylist. It leverages a modern web stack, combining the static-first power of Astro with a headless CMS (Sanity.io) for dynamic content management. The site is deployed globally on Cloudflare Pages, utilizing serverless functions for dynamic capabilities like a contact form.

## Technical Stack

-   **Frontend Framework:** [Astro](https://astro.build/)
-   **UI Library:** [React](https://react.dev/) (for interactive components)
-   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
-   **Headless CMS:** [Sanity.io](https://www.sanity.io/)
-   **Deployment & Hosting:** [Cloudflare Pages](https://pages.cloudflare.com/)
-   **Email Service:** [Resend](https://resend.com/)

## Architectural Highlights & Key Features

This project was architected with a main goal of enable the end user to admin the contents while the site stays fast, maintainable, and scalable on the developer side.Using a blend of static site generation and serverless computing.

### 1. Hybrid Architecture with Astro

The core of the site is built with Astro, chosen for its excellent performance characteristics. The architecture was configured for server-side rendering (`output: 'server'`) to support dynamic API routes while pre-rendering static pages for optimal load times. This hybrid approach provides the best of both worlds: the speed of static sites for content and the flexibility of server-rendered applications for user-interactable pages.

-   **Static Pages:** Most pages (`index`, `posts`, `[slug]`) are statically generated at build time, ensuring near-instant delivery from Cloudflare's edge network.
-   **Dynamic API Routes:** A serverless API endpoint (`/api/contact.ts`) was created to handle form submissions without requiring a traditional backend server.

### 2. Headless CMS for Content Management

All project content, including text and images, is managed through Sanity.io. This decouples the content from the presentation layer, allowing the stylist to update their portfolio without needing developer intervention. Astro fetches this content at build time to generate the static pages.

### 3. Serverless Contact Form

To handle user inquiries, a secure and robust contact form was implemented:

-   **Frontend:** A React component (`ContactForm.jsx`) provides a modern, interactive user experience with client-side validation. The component manages form state, handles user input, and communicates with the backend API.

    ```jsx
    // src/components/ContactForm.jsx
    import { useState } from 'react';

    export default function ContactForm() {
      const [formData, setFormData] = useState({ name: '', email: '', message: '' });
      const [status, setStatus] = useState(''); // '', 'loading', 'success', 'error'

      const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus('loading');
        try {
          const response = await fetch('/api/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
          });
          if (response.ok) {
            setStatus('success');
            setFormData({ name: '', email: '', message: '' });
          } else {
            setStatus('error');
          }
        } catch (error) {
          setStatus('error');
        }
      };
      // ... JSX for the form ...
    }
    ```

-   **Backend:** An Astro API route acts as a serverless function deployed on Cloudflare. It receives the form data, validates it, and uses the Resend API to send the email.

    ```typescript
    // src/pages/api/contact.ts
    import type { APIRoute } from 'astro';
    import { Resend } from 'resend';

    export const POST: APIRoute = async ({ request, locals }) => {
      const resend = new Resend(locals.runtime.env.RESEND_API_KEY);
      try {
        const data = await request.json();
        const { name, email, message } = data;

        if (!name || !email || !message) {
          return new Response(JSON.stringify({ message: 'Missing required fields' }), { status: 400 });
        }

        await resend.emails.send({
          from: 'Saradm Website <formulario@saradm.com>',
          to: ['saradelmor@gmail.com'],
          subject: `Nuevo formulario de saradm.com - ${name}`,
          html: `<p>Name: ${name}</p><p>Email: ${email}</p><p>Message: ${message}</p>`,
        });

        return new Response(JSON.stringify({ message: 'Message sent successfully!' }), { status: 200 });
      } catch (e) {
        return new Response(JSON.stringify({ message: 'An unexpected error occurred.' }), { status: 500 });
      }
    };
    ```

-   **Security:** API keys and environment variables were managed securely using Cloudflare's environment variable system, accessed via `locals.runtime.env` in the Astro backend, preventing exposure on the client-side.

### 4. Advanced Responsive Design & Image Optimization

A major focus was creating a visually consistent and responsive experience across all devices.

-   **Tailwind CSS:** A utility-first approach was used for rapid, maintainable styling. Custom fonts (`Dongle`) and a specific color palette were configured in `tailwind.config.js`.
-   **Responsive Image Loading:** The Astro `Image` component was used to implement `srcset` and `sizes` attributes. This ensures that browsers download the most appropriately sized image based on the device's viewport and resolution, significantly improving performance and reducing bandwidth.
-   **Dynamic Layouts:** The project gallery features layouts that dynamically adjust based on content, such as aligning text based on the position of the corresponding image.

## Development Process & Problem-Solving

The development process was iterative, focusing on building features, fixing bugs, and continuous refinement.

-   **Client-Side Interactivity:** A key challenge was implementing a tag-based filtering system on the `/posts` page that worked seamlessly with Astro's view transitions. The initial script failed on navigation, but this was resolved by leveraging Astro's `astro:page-load` event and the `is:inline` script attribute, ensuring the filter logic re-initialized correctly on each page load.

    ```javascript
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
    ```

-   **Environment Configuration:** A build error related to environment variables in the deployed Cloudflare environment was resolved by correctly accessing them through Astro's `Astro.locals.runtime.env` object, a necessary step when running in the Cloudflare Pages adapter.

-   **Font & Styling Debugging:** A persistent issue where the custom "Dongle" font was not being applied was systematically debugged. The solution involved ensuring correct font file paths, proper `@font-face` definitions in the global CSS, and correct application in the Tailwind configuration.

-   **Build & Rendering:** Early in development, the project was migrated from a purely static output to a server-rendered output (`output: 'server'`) to accommodate the serverless API route for the contact form. Specific pages not requiring server-side logic were marked for pre-rendering to maintain performance benefits.

This project demonstrates a strong understanding of modern web development principles, including JAMstack architecture, performance optimization, and the integration of disparate services (CMS, email) into a cohesive, serverless application.
