import { defineConfig } from 'astro/config';

export default defineConfig({
  // Update this once the domain is pointed at the new site.
  // It's used for canonical URLs, the sitemap, and the .ics feed.
  site: 'https://www.alpharettaorchestra.com',

  vite: {
    // The portal scripts wait for sign-in with top-level await, which
    // needs ES2022. Every browser from the last few years supports it.
    build: { target: 'es2022' },
  },
});
