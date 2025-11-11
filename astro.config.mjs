import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

import sanity from "@sanity/astro";
import react from "@astrojs/react";

import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
  output: 'server',
  vite: {
    plugins: [tailwindcss()],
  },

  integrations: [
    sanity({
      projectId: "431aazz3",
      dataset: "production",
      useCdn: false, // for static builds
    }),
    react(),
  ],

  adapter: cloudflare(),
});