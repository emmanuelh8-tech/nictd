// Deterministic film timeline: every parameter, camera shot, label and title is a pure
// function of time t (seconds). Seeking to any t always yields the same frame.
export const DURATION = 58.5;

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const smooth = (x) => { x = clamp(x); return x * x * x * (x * (x * 6 - 15) + 10); };
export const ramp = (t, t0, t1) => smooth((t - t0) / (t1 - t0));
const env = (t, a0, a1, b0, b1) => ramp(t, a0, a1) * (1 - ramp(t, b0, b1));

// ---------------------------------------------------------------- parameters
export function paramsAt(t) {
  return {
    explode: env(t, 5, 9.5, 50.5, 55.5),
    webSplit: env(t, 11, 13.5, 50.5, 54),
    usersSplit: env(t, 15, 17.8, 50.5, 54),
    niisOpen: env(t, 20.3, 22.6, 50.8, 54.5),
    ringSplit: env(t, 21.8, 25, 50.8, 54.8),
    srcExtend: env(t, 22.6, 25, 50.8, 54.5),
    dbSplit: env(t, 32.4, 34.6, 51, 55.2),
    platterSplit: env(t, 34.4, 37.2, 51, 55.2),
    microLid: env(t, 42, 43.6, 50.4, 52),
    microLift: env(t, 44.6, 46.2, 50.4, 52),
    microFields: env(t, 46.2, 47.6, 50.4, 52),
    microBits: env(t, 47.6, 49.2, 50.4, 52),
    flowDB: ramp(t, 7, 9.5),
    flowCore: ramp(t, 8, 10.5),
    flowWeb: ramp(t, 8.5, 11),
    flowSrc: env(t, 23.5, 25.5, 51, 54),
    flowUsers: ramp(t, 16.5, 19),
    flowBoost: env(t, 51, 53, 57, 58.5),
  };
}

// ---------------------------------------------------------------- camera
// target: [x,y,z] | componentId | [componentId, [dx,dy,dz]]
// dist (world units, interpolated in log space), az/el in degrees, fov in degrees
export const SHOTS = [
  { t: 0, target: [0, -0.6, 0], dist: 36, az: 38, el: 24, fov: 30 },
  { t: 4.6, target: [0, -0.6, 0], dist: 23, az: 22, el: 19, fov: 30 },
  { t: 9.6, target: [0, -1.2, 0], dist: 38, az: 6, el: 12, fov: 32 },
  { t: 12, target: ['WEB_APPLICATION', [0, 1.2, 0]], dist: 15, az: -14, el: 36, fov: 32 },
  { t: 14.6, target: ['WEB_APPLICATION', [0, 2.0, 0.4]], dist: 13, az: 10, el: 30, fov: 32 },
  { t: 17.4, target: ['WEB_APPLICATION', [0, 3.4, 2.8]], dist: 12, az: 16, el: 14, fov: 32 },
  { t: 19.8, target: ['WEB_APPLICATION', [0, 3.5, 2.8]], dist: 11, az: 28, el: 12, fov: 32 },
  { t: 22, target: ['NIIS', [0, 0.4, 0]], dist: 19, az: 48, el: 15, fov: 32 },
  { t: 25, target: ['DATA_INGESTION', [0, 0.4, 0]], dist: 11.5, az: 72, el: 9, fov: 34 },
  { t: 27.6, target: ['DATA_INTEGRATION', [0, 0, 0]], dist: 8.8, az: 118, el: 5, fov: 34 },
  { t: 30.2, target: ['INTELLIGENCE_OUTPUT', [0, 0, 0]], dist: 9.2, az: 165, el: 22, fov: 34 },
  { t: 32.6, target: ['DATABASES', [0, 1.4, 0]], dist: 22, az: 215, el: 24, fov: 32 },
  { t: 35.2, target: ['DATABASES', [0, 1.8, 0]], dist: 16.5, az: 262, el: 15, fov: 32 },
  { t: 37.8, target: ['ICT_INDICATORS_DATABASE', [0, 2.0, 0]], dist: 10.5, az: 300, el: 22, fov: 32 },
  { t: 40.4, target: ['MICRO', [0, 0, 0]], dist: 2.9, az: 322, el: 56, fov: 32 },
  { t: 42.8, target: ['MICRO_INDICATOR', [0, 0.02, 0]], dist: 0.42, az: 332, el: 50, fov: 32 },
  { t: 44.8, target: ['MICRO_INDICATOR', [0, 0.018, 0]], dist: 0.085, az: 340, el: 52, fov: 32 },
  { t: 46.8, target: ['MICRO_RECORD', [0, 0, 0]], dist: 0.04, az: 346, el: 42, fov: 32 },
  { t: 48.6, target: ['FIELD_VALUE', [0, 0.0016, 0]], dist: 0.017, az: 352, el: 50, fov: 32 },
  { t: 50.4, target: ['FIELD_VALUE', [0, 0.0016, 0]], dist: 0.0125, az: 358, el: 56, fov: 32 },
  { t: 53.4, target: [0, -1.2, 0], dist: 33, az: 372, el: 15, fov: 32 },
  { t: 56.2, target: [0, -0.6, 0], dist: 26, az: 384, el: 18, fov: 30 },
  { t: 58.5, target: [0, -0.6, 0], dist: 25, az: 390, el: 18, fov: 30 },
];

// ---------------------------------------------------------------- chapters
export const CHAPTERS = [
  { t0: 4.8, t1: 10.2, title: 'Three physical layers', sub: ['Web Application · NIIS · ICT Databases', 'Data rises as structured intelligence'] },
  { t0: 10.6, t1: 15.2, title: 'Web Application', sub: ['The user-facing layer', 'Five modules · one interface'] },
  { t0: 15.4, t1: 20.2, title: 'User Accounts', sub: ['Roles & access', 'Five classes of user'] },
  { t0: 20.6, t1: 24.6, title: 'NIIS · Intelligence engine', sub: ['National ICT Intelligence System', 'Not a database — a processing core'] },
  { t0: 24.8, t1: 27.6, title: 'Data ingestion', sub: ['Databases · APIs · government portals', 'Open data · web sources · web scraping'] },
  { t0: 27.8, t1: 30, title: 'Processing pipeline', sub: ['Validate → clean → integrate', 'Transform → analyse → enrich'] },
  { t0: 30.2, t1: 32.4, title: 'Intelligence output', sub: ['Indicators · analytics · insights', 'Reports · research · explorer feeds'] },
  { t0: 32.6, t1: 37.6, title: 'ICT data databases', sub: ['Indicators · reports · research', 'Physically separate · connected to NIIS'] },
  { t0: 37.8, t1: 42.2, title: 'ICT Indicators database', sub: ['Categories → indicators → records', 'Values → metadata'] },
  { t0: 42.4, t1: 44.6, title: 'One indicator', sub: ['A block of time-series records', 'Illustrative'] },
  { t0: 44.8, t1: 46.6, title: 'Records', sub: ['One row per country, per year', '144 rows in this block'] },
  { t0: 46.8, t1: 48.4, title: 'One record · six fields', sub: ['Indicator · country · year', 'Value · unit · source + metadata'] },
  { t0: 48.6, t1: 50.8, title: 'One value · 64 bits', sub: ['41.7 stored as IEEE-754 float64', 'The smallest unit of ICT intelligence'] },
  { t0: 51.2, t1: 54.6, title: 'Reassembly', sub: ['Databases → NIIS → web application', '→ users'] },
];

export const CENTER_TITLES = [
  { t0: 0.4, t1: 4.6, big: 'NIIP', line: 'National ICT Intelligence Program', small: 'Data · Intelligence · Better decisions' },
  { t0: 54.9, t1: 58.6, big: 'NIIP', line: 'National ICT Intelligence Program', small: 'From data → intelligence → insight' },
];

// ---------------------------------------------------------------- callouts
// anchor: componentId (+ optional local offset). side: which way the box sits.
const L = (t0, t1, id, side = 'R', dy = 0, extra = {}) => ({ t0, t1, id, side, dy, ...extra });
export const CALLOUTS = [
  L(6.4, 10.4, 'WEB_APPLICATION', 'R', -10),
  L(6.8, 10.4, 'NIIS', 'L', 0, { off: [0, 1.4, 0] }),
  L(7.2, 10.4, 'DATABASES', 'R', 10),

  L(12.4, 15.2, 'HOME', 'L', -60),
  L(12.7, 15.2, 'DATA_EXPLORER', 'L', 20),
  L(13.0, 15.2, 'ICT_REPORTS', 'R', -90),
  L(13.3, 15.2, 'RESEARCH', 'R', -10),
  L(13.6, 15.2, 'USER_ACCOUNTS', 'R', 70),

  L(17.0, 20.2, 'ADMIN', 'L', -40),
  L(17.3, 20.2, 'GOVERNMENTS', 'L', 50),
  L(17.6, 20.2, 'STAKEHOLDERS', 'R', -110),
  L(17.9, 20.2, 'STUDENTS', 'R', -20),
  L(18.2, 20.2, 'INDIVIDUALS', 'R', 70),

  L(24.6, 27.6, 'SRC_DATABASES', 'R'),
  L(24.8, 27.6, 'SRC_APIS', 'R'),
  L(25.0, 27.6, 'SRC_GOV_PORTALS', 'L'),
  L(25.2, 27.6, 'SRC_OPEN_DATA', 'L'),
  L(25.4, 27.6, 'SRC_WEB', 'L'),
  L(25.6, 27.6, 'SRC_SCRAPING', 'R'),
  L(25.0, 27.4, 'DATA_INGESTION', 'L', 30, { off: [-1.6, 0, 1.2] }),

  L(27.4, 30.0, 'DATA_VALIDATION', 'R', 0, { off: [1.8, 0, 0.6] }),
  L(27.7, 30.0, 'DATA_CLEANING', 'L', 0, { off: [-1.8, 0, 0.6] }),
  L(28.0, 30.2, 'DATA_INTEGRATION', 'R', 0, { off: [1.8, 0, 0.6] }),
  L(28.3, 30.4, 'DATA_TRANSFORMATION', 'L', 0, { off: [-1.8, 0, 0.6] }),
  L(28.6, 30.6, 'DATA_ANALYSIS', 'R', 0, { off: [1.8, 0, 0.6] }),
  L(28.9, 31.6, 'DATA_ENRICHMENT', 'L', 0, { off: [-1.8, 0, 0.6] }),
  L(29.6, 32.2, 'INTELLIGENCE_OUTPUT', 'R', -20, { off: [1.6, 0.2, 0.6] }),

  L(33.6, 37.6, 'ICT_INDICATORS_DATABASE', 'L', -60, { off: [0, 2.2, 0] }),
  L(33.9, 37.6, 'ICT_REPORTS_DATABASE', 'R', -120, { off: [0, 2.2, 0] }),
  L(34.2, 37.6, 'ICT_RESEARCH_DATABASE', 'R', 40, { off: [0, 2.2, 0] }),

  ...['CATEGORIES', 'INDICATORS', 'RECORDS', 'VALUES', 'METADATA'].map((n, i) =>
    L(37.4 + i * 0.25, 40.4, `ICT_INDICATORS_DATABASE.${n}`, 'L', 0, { off: [-1.25, 0, 0] })),

  L(40.6, 42.6, 'SECTOR_0', 'R', 0, { sector: 0 }),
  L(40.8, 42.6, 'SECTOR_1', 'R', 0, { sector: 1 }),
  L(41.0, 42.6, 'SECTOR_2', 'L', 0, { sector: 2 }),
  L(41.2, 42.6, 'SECTOR_3', 'L', 0, { sector: 3 }),
  L(41.4, 42.6, 'SECTOR_4', 'L', 0, { sector: 4 }),
  L(41.6, 42.6, 'SECTOR_5', 'R', 0, { sector: 5 }),
  L(43.0, 44.8, 'MICRO_INDICATOR', 'R', -40, { off: [0.033, 0.034, 0] }),
  L(45.4, 46.8, 'MICRO_RECORD', 'R', -60, { title: 'Record #0217', sub: 'LBR · 2024' }),
  ...[0, 1, 2, 3, 4, 5].map((i) => L(47.0 + i * 0.12, 48.6, `FIELD_${i}`, i % 2 ? 'R' : 'L', (i - 2.5) * 72, { field: i })),
  L(47.6, 48.6, 'FIELD_METADATA', 'R', -150, { title: 'Metadata', sub: 'updated · method · licence' }),
  L(49.0, 50.6, 'BITS_SIGN', 'L', -40, { bits: 'sign' }),
  L(49.2, 50.6, 'BITS_EXP', 'R', -60, { bits: 'exp' }),
  L(49.4, 50.6, 'BITS_MANT', 'R', 40, { bits: 'mant' }),
];

// amber framing (perspective quad around the next thing the camera will enter)
export const FRAMES = [
  { t0: 10.2, t1: 12.2, id: 'WEB_APPLICATION' },
  { t0: 15.0, t1: 16.8, id: 'USER_ACCOUNTS' },
  { t0: 20.0, t1: 21.8, id: 'NIIS' },
  { t0: 36.6, t1: 38.4, id: 'ICT_INDICATORS_DATABASE.CATEGORIES' },
  { t0: 41.6, t1: 43.0, id: 'MICRO_INDICATOR' },
  { t0: 44.0, t1: 45.4, id: 'MICRO_RECORD' },
  { t0: 46.6, t1: 48.0, id: 'FIELD_VALUE' },
];

// level-of-detail ruler: label + camera distance at which it is "current"
export const LEVELS = [
  { name: 'System', d: 36 },
  { name: 'Layer', d: 14 },
  { name: 'Component', d: 6 },
  { name: 'Module', d: 2 },
  { name: 'Data', d: 0.09 },
  { name: 'Micro', d: 0.002 },
];

// ---------------------------------------------------------------- interactive states
const P0 = { explode: 0, webSplit: 0, usersSplit: 0, niisOpen: 0, ringSplit: 0, srcExtend: 0, dbSplit: 0, platterSplit: 0, microLid: 0, microLift: 0, microFields: 0, microBits: 0, flowDB: 0.5, flowCore: 0.5, flowWeb: 0.5, flowSrc: 0, flowUsers: 0, flowBoost: 0 };
const all = (o) => ({ ...P0, ...o });
export const STATES = [
  { n: '01', name: 'Complete system', params: all({}), shot: { target: [0, -0.6, 0], dist: 24, az: 28, el: 20, fov: 32 } },
  { n: '02', name: 'Three layers exploded', params: all({ explode: 1, flowDB: 1, flowCore: 1, flowWeb: 1 }), shot: { target: [0, -1.2, 0], dist: 38, az: 10, el: 14, fov: 32 } },
  { n: '03', name: 'Web application dissection', params: all({ explode: 1, webSplit: 1, usersSplit: 1, flowWeb: 1, flowUsers: 1, flowCore: 1 }), shot: { target: ['WEB_APPLICATION', [0, 1.6, 0.8]], dist: 13, az: 14, el: 26, fov: 32 } },
  { n: '04', name: 'NIIS dissection', params: all({ explode: 1, niisOpen: 1, ringSplit: 1, srcExtend: 1, flowSrc: 1, flowCore: 1, flowDB: 1, flowWeb: 1 }), shot: { target: ['NIIS', [0, 0.3, 0]], dist: 17, az: 52, el: 12, fov: 34 } },
  { n: '05', name: 'Database dissection', params: all({ explode: 1, dbSplit: 1, platterSplit: 1, flowDB: 1 }), shot: { target: ['DATABASES', [0, 1.8, 0]], dist: 16, az: 330, el: 18, fov: 32 } },
  { n: '06', name: 'Micro data exploration', params: all({ explode: 1, dbSplit: 1, platterSplit: 1, microLid: 1, microLift: 1, microFields: 1, microBits: 1 }), shot: { target: ['MICRO_RECORD', [0, 0, 0]], dist: 0.016, az: 346, el: 40, fov: 32 } },
  { n: '07', name: 'Complete system reassembly', params: all({ flowDB: 1, flowCore: 1, flowWeb: 1, flowUsers: 1, flowBoost: 1 }), shot: { target: [0, -0.6, 0], dist: 25, az: 30, el: 18, fov: 30 } },
];
