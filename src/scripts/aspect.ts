// Resolves each work's aspect ratio (width / height), read by the focused-card
// expansion and the detail view to show a piece at its true shape.
//
// The catch: the map pads + shuffles the works, which makes shallow COPIES of
// them (arrange.padToGrid). Writing `aspect` onto the original object would
// never reach those copies. So aspect lives in a shared Map keyed by slug —
// every copy of a work resolves to the same measured value automatically.
//
// If the aspect is already known from the content schema, we seed the store and
// skip measurement (videos in particular then need no hidden probe element).
import type { Work } from './types';

const store = new Map<string, number>();

export function aspectOf(work: Work): number | undefined {
  return store.get(work.slug) ?? work.aspect;
}

export function measureAspects(works: Work[]) {
  for (const work of works) {
    if (store.has(work.slug)) continue;

    if (work.aspect) {
      store.set(work.slug, work.aspect); // known at build time — done
      continue;
    }

    if (work.media.type === 'video') {
      const video = document.createElement('video');
      video.muted = true;
      video.preload = 'metadata';
      video.addEventListener('loadedmetadata', () => {
        if (video.videoWidth && video.videoHeight) {
          store.set(work.slug, video.videoWidth / video.videoHeight);
        }
      });
      video.src = work.media.playUrl;
    } else {
      const img = new Image();
      img.addEventListener('load', () => {
        if (img.naturalWidth && img.naturalHeight) {
          store.set(work.slug, img.naturalWidth / img.naturalHeight);
        }
      });
      img.src = work.media.src;
    }
  }
}
