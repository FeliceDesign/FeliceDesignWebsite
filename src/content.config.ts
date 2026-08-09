import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// One file per portfolio piece under src/content/works/ — this is the part
// that's meant to be easy to maintain. Adding a work is dropping in a new .md
// file; no code changes anywhere else.
//
// media is a discriminated union:
//   image → a local optimized photo under /assets/photos
//   video → a Cloudinary public id + version; the actual (compressed) URLs and
//           poster are derived in src/lib/cloudinary.ts
//
// aspect (width / height) is optional but recommended for videos: knowing it at
// build time lets the map skip the runtime metadata probe that used to spin up
// an extra <video> per clip.
const works = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/works' }),
  schema: z.object({
    tag: z.enum(['foto', 'd3']),
    type: z.string(), // eyebrow, e.g. "Produktfotografie", "3D-Visualisierung"
    title: z.string(),
    desc: z.string(),
    // Controls the base ordering before the constrained shuffle; also the
    // filename usually encodes it (foto-01-…, d3-05-…).
    order: z.number(),
    aspect: z.number().optional(),
    media: z.discriminatedUnion('type', [
      z.object({
        type: z.literal('image'),
        src: z.string(), // path under /assets/photos, e.g. "foto-01-abschlussserie-1.jpg"
      }),
      z.object({
        type: z.literal('video'),
        cloudinaryId: z.string(),
        version: z.string(),
      }),
    ]),
  }),
});

export const collections = { works };
