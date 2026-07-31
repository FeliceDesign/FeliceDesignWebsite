// The actual portfolio pieces shown on the map. Images and videos are
// loaded live from the FeliceDesignPortfolio repo (public, so raw.github
// links work directly) instead of being duplicated into this repo.
//
// To add a new work: drop the file into FeliceDesignPortfolio, then add
// one entry below. No other code needs to change.

const PORTFOLIO_MEDIA = 'https://raw.githubusercontent.com/FeliceDesign/FeliceDesignPortfolio/main/images';

export const TAGLABEL = { foto: 'Fotografie', d3: '3D' };

export const WORKS = [
  // ---------- Fotografie ----------
  {
    tag: 'foto', type: 'Produktfotografie', title: 'Abschlussserie I',
    desc: 'Abschlussarbeit der Ausbildung zum Produkt- und Werbefotografen – Kammersieger der Handwerkskammer Stuttgart.',
    media: { type: 'image', src: `${PORTFOLIO_MEDIA}/photography/Felix-Weber-C-001.jpg` },
  },
  {
    tag: 'foto', type: 'Produktfotografie', title: 'Abschlussserie II',
    desc: 'Abschlussarbeit der Ausbildung zum Produkt- und Werbefotografen – Kammersieger der Handwerkskammer Stuttgart.',
    media: { type: 'image', src: `${PORTFOLIO_MEDIA}/photography/Felix-Weber-C-002.jpg` },
  },
  {
    tag: 'foto', type: 'Produktfotografie', title: 'Abschlussserie III',
    desc: 'Abschlussarbeit der Ausbildung zum Produkt- und Werbefotografen – Kammersieger der Handwerkskammer Stuttgart.',
    media: { type: 'image', src: `${PORTFOLIO_MEDIA}/photography/Felix-Weber-C-003.jpg` },
  },
  {
    tag: 'foto', type: 'Produktfotografie', title: 'Produktgruppe',
    desc: 'Abschlussarbeit der Ausbildung zum Produkt- und Werbefotografen – Kammersieger der Handwerkskammer Stuttgart.',
    media: { type: 'image', src: `${PORTFOLIO_MEDIA}/photography/2010-A-Produktgruppe.jpg` },
  },
  {
    tag: 'foto', type: 'Produktfotografie', title: 'Einzelaufnahme',
    desc: 'Abschlussarbeit der Ausbildung zum Produkt- und Werbefotografen – Kammersieger der Handwerkskammer Stuttgart.',
    media: { type: 'image', src: `${PORTFOLIO_MEDIA}/photography/2010-A-Einzelaufnahme.jpg` },
  },
  {
    tag: 'foto', type: 'Produktfotografie', title: 'Modelaufnahme',
    desc: 'Abschlussarbeit der Ausbildung zum Produkt- und Werbefotografen – Kammersieger der Handwerkskammer Stuttgart.',
    media: { type: 'image', src: `${PORTFOLIO_MEDIA}/photography/2010-A-Modelaufnahme-1.jpg` },
  },
  {
    tag: 'foto', type: 'Ausbildungsprojekt', title: 'Kosmetik – Öl',
    desc: 'Projekt aus dem Berichtsheft der Ausbildung – Kosmetikfotografie.',
    media: { type: 'image', src: `${PORTFOLIO_MEDIA}/photography/Felix%20Kosmetik%20Berichtsheft%20%C3%96l.jpg` },
  },
  {
    tag: 'foto', type: 'Ausbildungsprojekt', title: 'Kosmetik – Produktfokus',
    desc: 'Projekt aus dem Berichtsheft der Ausbildung – Kosmetikfotografie.',
    media: { type: 'image', src: `${PORTFOLIO_MEDIA}/photography/Felix%20Kosmetik%20Berichtsheft%20Produktfokus.jpg` },
  },
  {
    tag: 'foto', type: 'Ausbildungsprojekt', title: 'Kosmetik – Spiegel',
    desc: 'Projekt aus dem Berichtsheft der Ausbildung – Kosmetikfotografie.',
    media: { type: 'image', src: `${PORTFOLIO_MEDIA}/photography/Felix%20Kosmetik%20Berichtsheft%20Shampoo%20Spiegel.jpg` },
  },
  {
    tag: 'foto', type: 'Uni-Projekt', title: 'Geige – Klippe',
    desc: 'Universitätsprojekt – Stillleben-Fotografie.',
    media: { type: 'image', src: `${PORTFOLIO_MEDIA}/photography/Geige%20Klippe.jpg` },
  },
  {
    tag: 'foto', type: 'Uni-Projekt', title: 'Geige – Kontur',
    desc: 'Universitätsprojekt – Stillleben-Fotografie.',
    media: { type: 'image', src: `${PORTFOLIO_MEDIA}/photography/Geige%20Kontur%20mit%20Inhalt.jpg` },
  },
  {
    tag: 'foto', type: 'Uni-Projekt', title: 'Geige – Bogen',
    desc: 'Universitätsprojekt – Stillleben-Fotografie.',
    media: { type: 'image', src: `${PORTFOLIO_MEDIA}/photography/Geige%20mit%20Bogen.jpg` },
  },

  // ---------- 3D ----------
  {
    tag: 'd3', type: '3D-Visualisierung', title: 'Jumping Spider',
    desc: 'Persönliches Projekt – Charakterstudie.',
    media: { type: 'image', src: `${PORTFOLIO_MEDIA}/threed-design/Jumping%20Spider%2024.1.jpg` },
  },
  {
    tag: 'd3', type: '3D-Visualisierung', title: 'Sturmlaterne',
    desc: 'Persönliches Projekt – Lichtstudie bei Nacht.',
    media: { type: 'image', src: `${PORTFOLIO_MEDIA}/threed-design/Sturmlaterne%20nacht%2012.jpg` },
  },
  {
    tag: 'd3', type: '3D-Visualisierung', title: 'E-MTB – Detail',
    desc: 'Uni-Projekt – Bike-Modell von Ceem (CGTrader), Texturing, Licht & Rendering von Felix.',
    media: { type: 'image', src: `${PORTFOLIO_MEDIA}/threed-design/Bike-Detail-4.jpg` },
  },
  {
    tag: 'd3', type: '3D-Visualisierung', title: 'Cube Stereo Hybrid – Wald',
    desc: 'Uni-Projekt – Bike-Modell von Ceem (CGTrader), Texturing, Licht & Rendering von Felix.',
    media: { type: 'image', src: `${PORTFOLIO_MEDIA}/threed-design/Cube-Stereo-Hybrid-Wald.jpg` },
  },
  {
    tag: 'd3', type: '3D-Visualisierung', title: 'Cube Stereo Hybrid – Beton',
    desc: 'Uni-Projekt – Bike-Modell von Ceem (CGTrader), Texturing, Licht & Rendering von Felix.',
    media: { type: 'image', src: `${PORTFOLIO_MEDIA}/threed-design/Cube-Stereo-Hybrid-Beton.jpg` },
  },
  {
    tag: 'd3', type: '3D-Visualisierung', title: 'Cube Stereo Hybrid – Garage',
    desc: 'Uni-Projekt – Bike-Modell von Ceem (CGTrader), Texturing, Licht & Rendering von Felix.',
    media: { type: 'image', src: `${PORTFOLIO_MEDIA}/threed-design/Cube-Stereo-Hybrid-Garage-2.jpg` },
  },
  {
    tag: 'd3', type: '3D-Visualisierung', title: 'Coffee Nuke',
    desc: 'Render-Test im Rahmen der Abschlussarbeit.',
    media: { type: 'image', src: `${PORTFOLIO_MEDIA}/threed-design/Coffee%20Nuke2.png` },
  },
  {
    tag: 'd3', type: '3D-Visualisierung', title: 'Kunstmuseum – Front',
    desc: 'Uni-Projekt – Modelling & Texturing von Felix, Skulpturen von CGTrader.',
    media: { type: 'image', src: `${PORTFOLIO_MEDIA}/threed-design/2.%20Abgabe%20Front%20Render%202.jpg` },
  },
  {
    tag: 'd3', type: '3D-Visualisierung', title: 'Kunstmuseum – Hochkant',
    desc: 'Uni-Projekt – Modelling & Texturing von Felix, Skulpturen von CGTrader.',
    media: { type: 'image', src: `${PORTFOLIO_MEDIA}/threed-design/2.%20Abgabe%20Front%20Hochkant%20Render%201.jpg` },
  },
  {
    tag: 'd3', type: '3D-Visualisierung', title: 'Kunstmuseum – Seitlich',
    desc: 'Uni-Projekt – Modelling & Texturing von Felix, Skulpturen von CGTrader.',
    media: { type: 'image', src: `${PORTFOLIO_MEDIA}/threed-design/2.%20Abgabe%20Front%20Seitlich%20Render%201.jpg` },
  },
  {
    tag: 'd3', type: '3D-Visualisierung', title: 'Chinotto',
    desc: 'Persönliches Projekt – Getränke-Produktvisualisierung.',
    media: { type: 'image', src: `${PORTFOLIO_MEDIA}/threed-design/Chinotto%201.jpg` },
  },
  {
    tag: 'd3', type: '3D · Bewegt', title: 'Eternal Ascent',
    desc: 'Beitrag für die Eternal-Ascent-3D-Render-Challenge – komplett in Eigenarbeit.',
    media: { type: 'video', src: 'https://res.cloudinary.com/dmorge9ab/video/upload/v1777917521/Felice_Eternal_Ascent_Final_asgv8z.mp4' },
  },
];
