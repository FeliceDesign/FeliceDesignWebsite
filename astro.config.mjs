// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Static output: every page (the map + one detail page per work) is prerendered
// to plain HTML at build time, which is exactly what SEO/GEO crawlers and
// Cloudflare Pages want. The Cloudflare adapter stays installed for a later
// move to Workers/SSR, but isn't wired in while everything can be static.
//
// TODO: set this to the real production domain before deploying — it drives
// canonical URLs, the sitemap and OpenGraph tags.
const SITE = 'https://felicedesign.pages.dev';

// https://astro.build/config
export default defineConfig({
  site: SITE,
  integrations: [sitemap()],
});
