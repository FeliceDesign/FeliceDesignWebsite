// Builds optimized Cloudinary URLs from a stored public id + version.
//
// The originals are huge (up to 72 MB) and were being streamed at full size,
// nine times over — the whole reason the map's videos "didn't load". Cloudinary
// can transform on the fly, so we ask for a size- and quality-capped derivative
// instead: one compressed version used everywhere (map tile and detail view).
//
// A work only stores { cloudinaryId, version } (see content schema); the URLs
// are derived here so the transformation can be tuned in one place.

const CLOUD_NAME = 'dmorge9ab';
const BASE = `https://res.cloudinary.com/${CLOUD_NAME}`;

export interface CloudinaryVideo {
  cloudinaryId: string; // e.g. "Felice_Eternal_Ascent_Final_asgv8z"
  version: string; // e.g. "v1777917521" — pins the asset, lets CDN cache forever
}

// One compressed video derivative, used both as the autoplay map tile and in
// the detail view. h_720,c_limit keeps it at most 720px tall (never upscales),
// q_auto lets Cloudinary pick a visually-lossless bitrate, f_auto serves webm/
// mp4/etc. per browser. This turns ~20–72 MB originals into a few MB.
export function videoUrl({ cloudinaryId, version }: CloudinaryVideo): string {
  return `${BASE}/video/upload/f_auto,q_auto,h_720,c_limit/${version}/${cloudinaryId}.mp4`;
}

// A still frame from the video, shown on the video tiles that aren't currently
// playing (all the off-screen tile clones). so_auto asks Cloudinary for a
// representative frame; w_600 keeps the poster tiny.
export function posterUrl({ cloudinaryId, version }: CloudinaryVideo): string {
  return `${BASE}/video/upload/f_auto,q_auto,w_600,c_limit,so_auto/${version}/${cloudinaryId}.jpg`;
}
