/**
 * NOCTIS - Configuration File
 * All section heights, chapter ranges, frame counts, frame paths and callout coordinates
 */
window.NOCTIS_CONFIG = {
  hero: {
    frameCount: 594,
    desktopPath: (index) => `assets/frames/hero/frame_${String(index).padStart(4, '0')}.webp`,
    mobilePath: (index) => `assets/frames/hero-mobile/frame_${String(index).padStart(4, '0')}.webp`,
    wrapperHeight: '600vh',
    chapters: [
      { start: 0.00, end: 0.15, id: 'hero-ch-1' },
      { start: 0.22, end: 0.40, id: 'hero-ch-2' },
      { start: 0.50, end: 0.68, id: 'hero-ch-3' },
      { start: 0.80, end: 1.00, id: 'hero-ch-4' }
    ],
    hud: {
      speedMax: 118,      // km/h
      distanceMax: 4.2    // km
    },
    blackoutStart: 0.95   // over the last 5% of scroll, canvas fades to solid black
  },
  
  dismantle: {
    frameCount: 198,
    desktopPath: (index) => `assets/frames/dismantle/frame_${String(index).padStart(4, '0')}.webp`,
    mobilePath: (index) => `assets/frames/dismantle-mobile/frame_${String(index).padStart(4, '0')}.webp`,
    wrapperHeight: '350vh',
    calloutStartProgress: 0.70,
    callouts: [
      {
        id: 'callout-body',
        code: '01',
        label: 'BODY',
        desc: 'Carbon composite monocoque',
        startProgress: 0.72,
        dotX: 52, // % of canvas width
        dotY: 34, // % of canvas height
        labelX: 28, // % of canvas width
        labelY: 26  // % of canvas height
      },
      {
        id: 'callout-battery',
        code: '02',
        label: 'BATTERY',
        desc: '110 kWh structural pack',
        startProgress: 0.79,
        dotX: 43,
        dotY: 64,
        labelX: 20,
        labelY: 76
      },
      {
        id: 'callout-drive',
        code: '03',
        label: 'DRIVE',
        desc: 'Dual axial-flux motors, 680 kW',
        startProgress: 0.86,
        dotX: 68,
        dotY: 57,
        labelX: 78,
        labelY: 70
      },
      {
        id: 'callout-light',
        code: '04',
        label: 'LIGHT',
        desc: 'Single-line LED signature',
        startProgress: 0.93,
        dotX: 84,
        dotY: 39,
        labelX: 74,
        labelY: 24
      }
    ]
  },
  
  lineup: {
    debounceTime: 80, // ms
    cars: [
      {
        id: 'gt-e',
        number: '01',
        name: 'GT-E',
        tagline: 'The grand tourer.',
        specs: { range: '640 KM', accel: '3.1 S', power: '680 KW' },
        image: 'assets/cars/gt-e.webp',
        alt: 'NOCTIS GT-E matte graphite grand tourer coupe',
        colors: ['#1A1C20', '#EDEAE4', '#1C3048', '#B82018'],
        defaultOpen: true
      },
      {
        id: 's',
        number: '02',
        name: 'S',
        tagline: 'Four doors, no compromise.',
        specs: { range: '600 KM', accel: '3.6 S', power: '520 KW' },
        image: 'assets/cars/s.webp',
        alt: 'NOCTIS S four-door sport sedan in satin bone white',
        colors: ['#EDEAE4', '#121418', '#263445', '#4A4E57'],
        defaultOpen: false
      },
      {
        id: 'x',
        number: '03',
        name: 'X',
        tagline: 'Higher, never heavier.',
        specs: { range: '560 KM', accel: '4.2 S', power: '480 KW' },
        image: 'assets/cars/x.webp',
        alt: 'NOCTIS X SUV with coupe roofline in midnight blue',
        colors: ['#141E2E', '#181A1D', '#EDEAE4', '#3E424B'],
        defaultOpen: false
      },
      {
        id: 'r',
        number: '04',
        name: 'R',
        tagline: 'Built for the track.',
        specs: { range: '420 KM', accel: '2.4 S', power: '900 KW' },
        image: 'assets/cars/r.webp',
        alt: 'NOCTIS R track coupe with rear wing in satin black with red accents',
        colors: ['#0F1012', '#E1251B', '#EDEAE4', '#2C2E33'],
        defaultOpen: false
      },
      {
        id: 'one',
        number: '05',
        name: 'ONE',
        tagline: 'The future, early.',
        specs: { range: 'CONCEPT', accel: '< 2.0 S', power: 'QUAD-M' },
        image: 'assets/cars/one.webp',
        alt: 'NOCTIS ONE concept hypercar in liquid silver',
        colors: ['#CFE3FF', '#EDEAE4', '#0A0C10', '#8A8F98'],
        defaultOpen: false
      }
    ]
  },
  
  preload: {
    heroInitialBatch: 40 // frames 1-40 loaded before unmasking the preloader
  }
};
