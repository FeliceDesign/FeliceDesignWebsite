// Measures each work's natural aspect ratio (width / height) and stores it
// on the work object as `work.aspect`. Everything that needs to show a work
// at its true shape — the focused-card expansion and the detail view —
// reads that value, falling back to the base card ratio until it resolves.
//
// Measurement is progressive and non-blocking: the grid renders immediately
// with the base ratio, and each card starts showing its full shape as soon
// as its own image (or the video's metadata) has loaded.
export function measureAspects(works) {
  for (const work of works) {
    if (work.aspect) continue;

    if (work.media.type === 'video') {
      const video = document.createElement('video');
      video.muted = true;
      video.preload = 'metadata';
      video.addEventListener('loadedmetadata', () => {
        if (video.videoWidth && video.videoHeight) {
          work.aspect = video.videoWidth / video.videoHeight;
        }
      });
      video.src = work.media.src;
    } else {
      const img = new Image();
      img.addEventListener('load', () => {
        if (img.naturalWidth && img.naturalHeight) {
          work.aspect = img.naturalWidth / img.naturalHeight;
        }
      });
      img.src = work.media.src;
    }
  }
}
