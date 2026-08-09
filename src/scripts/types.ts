// The runtime shape of a work, as handed to the client map by index.astro.
// It's flatter than the content-collection entry: Cloudinary ids have already
// been resolved to concrete URLs at build time (see src/lib/cloudinary.ts), and
// images carry a ready-to-use src.

export type WorkMedia =
  | { type: 'image'; src: string }
  | { type: 'video'; playUrl: string; poster: string };

export interface Work {
  slug: string;
  tag: 'foto' | 'd3';
  type: string;
  title: string;
  desc: string;
  media: WorkMedia;
  aspect?: number; // width / height, when known at build time
}

export const TAGLABEL: Record<string, string> = { foto: 'Fotografie', d3: '3D' };
