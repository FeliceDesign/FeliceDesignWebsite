// Loads the works content collection and resolves each entry into the flat
// runtime shape the client map consumes (concrete image/video URLs), applying
// the constrained shuffle so the order is scattered-but-controlled and stable.
import { getCollection } from 'astro:content';
import { videoUrl, posterUrl } from './cloudinary';

export interface RuntimeWork {
  slug: string;
  tag: 'foto' | 'd3';
  type: string;
  title: string;
  desc: string;
  aspect?: number;
  media:
    | { type: 'image'; src: string }
    | { type: 'video'; playUrl: string; poster: string };
}

const PHOTOS = '/assets/photos';

function resolve(entry: Awaited<ReturnType<typeof getCollection>>[number]): RuntimeWork {
  const d = entry.data as any;
  const base = {
    slug: entry.id,
    tag: d.tag,
    type: d.type,
    title: d.title,
    desc: d.desc,
    aspect: d.aspect,
  };
  if (d.media.type === 'image') {
    return { ...base, media: { type: 'image', src: `${PHOTOS}/${d.media.src}` } };
  }
  return {
    ...base,
    media: {
      type: 'video',
      playUrl: videoUrl(d.media),
      poster: posterUrl(d.media),
    },
  };
}

// All works, in the base `order`, resolved to runtime shape. The map pads +
// shuffles this client-side; the SEO list uses it as-is.
export async function getWorks(): Promise<RuntimeWork[]> {
  const entries = await getCollection('works');
  entries.sort((a, b) => (a.data as any).order - (b.data as any).order);
  return entries.map(resolve);
}
