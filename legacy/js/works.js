// The actual portfolio pieces shown on the map.
//
// Photos are optimized copies (resized + compressed for the web) committed
// under assets/photos/, sourced from the FeliceDesignPortfolio repo — the
// full-resolution originals live there, not here, since serving those
// directly made the map painfully slow to load. The one video stays on
// Cloudinary, which already handles delivery/optimization.
//
// To add a new work: add the (optimized) image to assets/photos/, then add
// one entry below. No other code needs to change.

const PHOTOS = 'assets/photos';

export const TAGLABEL = { foto: 'Fotografie', d3: '3D' };

export const WORKS = [
  // ---------- Fotografie ----------
  {
    tag: 'foto', type: 'Produktfotografie', title: 'Abschlussserie I',
    desc: 'Abschlussarbeit der Ausbildung zum Produkt- und Werbefotografen – Kammersieger der Handwerkskammer Stuttgart.',
    media: { type: 'image', src: `${PHOTOS}/foto-01-abschlussserie-1.jpg` },
  },
  {
    tag: 'foto', type: 'Produktfotografie', title: 'Abschlussserie II',
    desc: 'Abschlussarbeit der Ausbildung zum Produkt- und Werbefotografen – Kammersieger der Handwerkskammer Stuttgart.',
    media: { type: 'image', src: `${PHOTOS}/foto-02-abschlussserie-2.jpg` },
  },
  {
    tag: 'foto', type: 'Produktfotografie', title: 'Abschlussserie III',
    desc: 'Abschlussarbeit der Ausbildung zum Produkt- und Werbefotografen – Kammersieger der Handwerkskammer Stuttgart.',
    media: { type: 'image', src: `${PHOTOS}/foto-03-abschlussserie-3.jpg` },
  },
  {
    tag: 'foto', type: 'Produktfotografie', title: 'Produktgruppe',
    desc: 'Abschlussarbeit der Ausbildung zum Produkt- und Werbefotografen – Kammersieger der Handwerkskammer Stuttgart.',
    media: { type: 'image', src: `${PHOTOS}/foto-04-produktgruppe.jpg` },
  },
  {
    tag: 'foto', type: 'Produktfotografie', title: 'Einzelaufnahme',
    desc: 'Abschlussarbeit der Ausbildung zum Produkt- und Werbefotografen – Kammersieger der Handwerkskammer Stuttgart.',
    media: { type: 'image', src: `${PHOTOS}/foto-05-einzelaufnahme.jpg` },
  },
  {
    tag: 'foto', type: 'Produktfotografie', title: 'Modelaufnahme',
    desc: 'Abschlussarbeit der Ausbildung zum Produkt- und Werbefotografen – Kammersieger der Handwerkskammer Stuttgart.',
    media: { type: 'image', src: `${PHOTOS}/foto-06-modelaufnahme.jpg` },
  },
  {
    tag: 'foto', type: 'Ausbildungsprojekt', title: 'Kosmetik – Öl',
    desc: 'Projekt aus dem Berichtsheft der Ausbildung – Kosmetikfotografie.',
    media: { type: 'image', src: `${PHOTOS}/foto-07-kosmetik-oel.jpg` },
  },
  {
    tag: 'foto', type: 'Ausbildungsprojekt', title: 'Kosmetik – Produktfokus',
    desc: 'Projekt aus dem Berichtsheft der Ausbildung – Kosmetikfotografie.',
    media: { type: 'image', src: `${PHOTOS}/foto-08-kosmetik-produktfokus.jpg` },
  },
  {
    tag: 'foto', type: 'Ausbildungsprojekt', title: 'Kosmetik – Spiegel',
    desc: 'Projekt aus dem Berichtsheft der Ausbildung – Kosmetikfotografie.',
    media: { type: 'image', src: `${PHOTOS}/foto-09-kosmetik-spiegel.jpg` },
  },
  {
    tag: 'foto', type: 'Uni-Projekt', title: 'Geige – Klippe',
    desc: 'Universitätsprojekt – Stillleben-Fotografie.',
    media: { type: 'image', src: `${PHOTOS}/foto-10-geige-klippe.jpg` },
  },
  {
    tag: 'foto', type: 'Uni-Projekt', title: 'Geige – Kontur',
    desc: 'Universitätsprojekt – Stillleben-Fotografie.',
    media: { type: 'image', src: `${PHOTOS}/foto-11-geige-kontur.jpg` },
  },
  {
    tag: 'foto', type: 'Uni-Projekt', title: 'Geige – Bogen',
    desc: 'Universitätsprojekt – Stillleben-Fotografie.',
    media: { type: 'image', src: `${PHOTOS}/foto-12-geige-bogen.jpg` },
  },

  // ---------- 3D ----------
  {
    tag: 'd3', type: '3D-Visualisierung', title: 'Jumping Spider',
    desc: 'Persönliches Projekt – Charakterstudie.',
    media: { type: 'image', src: `${PHOTOS}/d3-01-jumping-spider.jpg` },
  },
  {
    tag: 'd3', type: '3D-Visualisierung', title: 'Sturmlaterne',
    desc: 'Persönliches Projekt – Lichtstudie bei Nacht.',
    media: { type: 'image', src: `${PHOTOS}/d3-02-sturmlaterne.jpg` },
  },
  {
    tag: 'd3', type: '3D-Visualisierung', title: 'E-MTB – Detail',
    desc: 'Uni-Projekt – Bike-Modell von Ceem (CGTrader), Texturing, Licht & Rendering von Felix.',
    media: { type: 'image', src: `${PHOTOS}/d3-03-emtb-detail.jpg` },
  },
  {
    tag: 'd3', type: '3D-Visualisierung', title: 'Cube Stereo Hybrid – Wald',
    desc: 'Uni-Projekt – Bike-Modell von Ceem (CGTrader), Texturing, Licht & Rendering von Felix.',
    media: { type: 'image', src: `${PHOTOS}/d3-04-cube-wald.jpg` },
  },
  {
    tag: 'd3', type: '3D-Visualisierung', title: 'Cube Stereo Hybrid – Beton',
    desc: 'Uni-Projekt – Bike-Modell von Ceem (CGTrader), Texturing, Licht & Rendering von Felix.',
    media: { type: 'image', src: `${PHOTOS}/d3-05-cube-beton.jpg` },
  },
  {
    tag: 'd3', type: '3D-Visualisierung', title: 'Cube Stereo Hybrid – Garage',
    desc: 'Uni-Projekt – Bike-Modell von Ceem (CGTrader), Texturing, Licht & Rendering von Felix.',
    media: { type: 'image', src: `${PHOTOS}/d3-06-cube-garage.jpg` },
  },
  {
    tag: 'd3', type: '3D-Visualisierung', title: 'Coffee Nuke',
    desc: 'Render-Test im Rahmen der Abschlussarbeit.',
    media: { type: 'image', src: `${PHOTOS}/d3-07-coffee-nuke.jpg` },
  },
  {
    tag: 'd3', type: '3D-Visualisierung', title: 'Kunstmuseum – Front',
    desc: 'Uni-Projekt – Modelling & Texturing von Felix, Skulpturen von CGTrader.',
    media: { type: 'image', src: `${PHOTOS}/d3-08-museum-front.jpg` },
  },
  {
    tag: 'd3', type: '3D-Visualisierung', title: 'Kunstmuseum – Hochkant',
    desc: 'Uni-Projekt – Modelling & Texturing von Felix, Skulpturen von CGTrader.',
    media: { type: 'image', src: `${PHOTOS}/d3-09-museum-hochkant.jpg` },
  },
  {
    tag: 'd3', type: '3D-Visualisierung', title: 'Kunstmuseum – Seitlich',
    desc: 'Uni-Projekt – Modelling & Texturing von Felix, Skulpturen von CGTrader.',
    media: { type: 'image', src: `${PHOTOS}/d3-10-museum-seitlich.jpg` },
  },
  {
    tag: 'd3', type: '3D-Visualisierung', title: 'Chinotto',
    desc: 'Persönliches Projekt – Getränke-Produktvisualisierung.',
    media: { type: 'image', src: `${PHOTOS}/d3-11-chinotto.jpg` },
  },
  {
    tag: 'd3', type: '3D · Bewegt', title: 'Eternal Ascent',
    desc: 'Beitrag für die Eternal-Ascent-3D-Render-Challenge – komplett in Eigenarbeit.',
    media: { type: 'video', src: 'https://res.cloudinary.com/dmorge9ab/video/upload/v1777917521/Felice_Eternal_Ascent_Final_asgv8z.mp4' },
  },
  {
    tag: 'd3', type: '3D · Bewegt', title: 'Failed Hunt',
    desc: 'Uni-Projekt – Jumping-Spider-Animation.',
    media: { type: 'video', src: 'https://res.cloudinary.com/dmorge9ab/video/upload/v1777917565/Felix_Weber_Jumping_Spider_SS2024_lkkoxv.mp4' },
  },
  {
    tag: 'd3', type: '3D · Bewegt', title: 'Drift',
    desc: 'Uni-Projekt – Szenenbau, Licht, Rendering & Animation von Felix, Fahrzeugmodell von Tobias-Pisarovic (CGTrader).',
    media: { type: 'video', src: 'https://res.cloudinary.com/dmorge9ab/video/upload/v1777917618/Felix_Weber_Drift_SS2024_d5makt.mp4' },
  },
  {
    tag: 'd3', type: '3D · Bewegt', title: 'Endless Engines',
    desc: 'Beitrag für die Endless-Engines-3D-Render-Challenge – komplett in Eigenarbeit.',
    media: { type: 'video', src: 'https://res.cloudinary.com/dmorge9ab/video/upload/v1779872801/Endless_Engines_Felice_gcldc8.mp4' },
  },
  {
    tag: 'd3', type: '3D · Bewegt', title: 'Chasms Call',
    desc: 'Beitrag für die Chasms-Call-3D-Render-Challenge – komplett in Eigenarbeit, Hai- und Korallenmodelle von Sketchfab.',
    media: { type: 'video', src: 'https://res.cloudinary.com/dmorge9ab/video/upload/v1777917287/Chasms_Call-Blue-Hole-Felice_dvgdvn.mp4' },
  },
];
