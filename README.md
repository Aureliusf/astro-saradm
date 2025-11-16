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

