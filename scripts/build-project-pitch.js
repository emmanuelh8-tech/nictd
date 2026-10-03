// build-project-pitch.js — story-driven pitch for the National ICT Database PROJECT (pptxgenjs).
// Green-and-white LTA identity. Narrative voice adapted from "The Case for a National ICT Database"
// by Emmanuel Daniel Harris (Harris & Associates LLC).
const pptxgen = require('pptxgenjs');
const React = require('react');
const RD = require('react-dom/server');
const sharp = require('sharp');
const FA = require('react-icons/fa');
const path = require('path');

const OUT = path.join(__dirname, '..', 'deliverables', 'NICTD-Project-Pitch.pptx');

// ---- LTA green palette ----
const GREEN = '0B5D34', GREEN2 = '063D22', GREENMID = '12784A', LEAF = '1E9E63', ACCENT = '34B14A',
      SAGE = '6FAE86', GREENSOFT = 'E3F5EA', LIGHTBG = 'F4FAF6', WHITE = 'FFFFFF', INK = '17271D',
      MUTED = '566A5C', LINE = 'D7E5DC', AMBER = 'C2410C', AMBERSOFT = 'FBE7DD', PALE = 'DDF1E4';
const HEAD = 'Cambria', BODY = 'Calibri';

async function renderIcon(name, hex) {
  const Comp = FA[name];
  if (!Comp) throw new Error('missing icon ' + name);
  const svg = RD.renderToStaticMarkup(React.createElement(Comp, { color: '#' + hex, size: 256 }));
  const png = await sharp(Buffer.from(svg)).resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  return 'image/png;base64,' + png.toString('base64');
}

(async () => {
  const iconNames = ['FaDatabase', 'FaEyeSlash', 'FaMapMarkedAlt', 'FaClock', 'FaPuzzlePiece', 'FaFlag',
    'FaGlobeAfrica', 'FaShieldAlt', 'FaCheckCircle', 'FaLayerGroup', 'FaBroadcastTower', 'FaMoneyBillWave',
    'FaChartLine', 'FaTruck', 'FaUniversity', 'FaCode', 'FaClipboardList', 'FaServer', 'FaRocket',
    'FaSyncAlt', 'FaSeedling', 'FaRoad', 'FaBalanceScale', 'FaGraduationCap', 'FaRecycle', 'FaUmbrellaBeach',
    'FaBullseye', 'FaHandshake', 'FaUsers', 'FaLaptopCode', 'FaHandHoldingUsd', 'FaWifi', 'FaSitemap'];
  const W = {}, G = {}; // white icons, green icons
  for (const n of iconNames) { W[n] = await renderIcon(n, 'FFFFFF'); G[n] = await renderIcon(n, GREEN); }

  const p = new pptxgen();
  p.defineLayout({ name: 'WIDE', width: 13.333, height: 7.5 });
  p.layout = 'WIDE';
  p.author = 'Harris & Associates LLC'; p.title = 'The National ICT Database Project';

  // ---- helpers ----
  const iconCircle = (s, x, y, d, fill, img) => {
    s.addShape(p.ShapeType.ellipse, { x, y, w: d, h: d, fill: { color: fill }, line: { type: 'none' } });
    const ins = d * 0.27; s.addImage({ data: img, x: x + ins, y: y + ins, w: d - 2 * ins, h: d - 2 * ins });
  };
  const seg = (x1, y1, x2, y2, color, width, s) => {
    const x = Math.min(x1, x2), y = Math.min(y1, y2), w = Math.abs(x2 - x1), h = Math.abs(y2 - y1);
    s.addShape(p.ShapeType.line, { x, y, w, h, flipH: x2 < x1, flipV: y2 < y1, line: { color, width } });
  };
  const nodeMark = (s, cx, cy, R, main, sat, lc, lw) => {
    const pts = [];
    for (let i = 0; i < 6; i++) { const a = (Math.PI / 3) * i - Math.PI / 2; pts.push([cx + R * Math.cos(a), cy + R * Math.sin(a)]); }
    pts.forEach(pt => seg(cx, cy, pt[0], pt[1], lc, lw, s));
    const sd = R * 0.20;
    pts.forEach(pt => s.addShape(p.ShapeType.ellipse, { x: pt[0] - sd / 2, y: pt[1] - sd / 2, w: sd, h: sd, fill: { color: sat }, line: { type: 'none' } }));
    const cd = R * 0.42; s.addShape(p.ShapeType.ellipse, { x: cx - cd / 2, y: cy - cd / 2, w: cd, h: cd, fill: { color: main }, line: { type: 'none' } });
  };
  const card = (s, x, y, w, h, fill) => s.addShape(p.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.09,
    fill: { color: fill || WHITE }, line: { color: LINE, width: 1 }, shadow: { type: 'outer', color: 'B8C9BE', blur: 7, offset: 3, angle: 90, opacity: 0.4 } });
  const kicker = (s, x, y, w, text, color) => s.addText(text, { x, y, w, h: 0.3, fontFace: BODY, fontSize: 11, bold: true, color, charSpacing: 3, align: 'left' });
  const pageNum = (s, n) => s.addText(String(n).padStart(2, '0'), { x: 12.5, y: 6.95, w: 0.6, h: 0.3, fontFace: BODY, fontSize: 10, color: MUTED, align: 'right' });

  // =====================================================================
  // 1 — TITLE
  // =====================================================================
  let s = p.addSlide(); s.background = { color: GREEN };
  s.addShape(p.ShapeType.ellipse, { x: 9.6, y: -1.7, w: 5.8, h: 5.8, fill: { color: GREENMID, transparency: 55 }, line: { type: 'none' } });
  nodeMark(s, 11.1, 4.95, 1.9, ACCENT, WHITE, '2E7D52', 1.25);
  kicker(s, 0.9, 1.05, 11.4, 'REPUBLIC OF LIBERIA   ·   A HARRIS & ASSOCIATES LLC INITIATIVE', '8FE6B4');
  s.addText('The National ICT\nDatabase Project', { x: 0.85, y: 1.55, w: 9.8, h: 2.2, fontFace: HEAD, fontSize: 50, bold: true, color: WHITE, lineSpacing: 50 });
  s.addText('Taking ownership of Liberia’s data — one verified source of truth, built once and trusted everywhere.',
    { x: 0.9, y: 3.95, w: 8.9, h: 0.9, fontFace: HEAD, fontSize: 21, italic: true, color: '8FE6B4', lineSpacing: 27 });
  s.addText([{ text: 'Presented by ', options: {} }, { text: 'Emmanuel Daniel Harris', options: { bold: true, color: WHITE } },
    { text: '   ·   Harris & Associates LLC', options: {} }],
    { x: 0.9, y: 6.25, w: 11, h: 0.4, fontFace: BODY, fontSize: 14, color: 'BFE9CF' });
  s.addNotes('Open slowly and with weight. This is not a website pitch — it is a national project. "My name is Emmanuel Daniel Harris, and this is the National ICT Database Project." Set the tone: confident, national, evidence-driven.');

  // =====================================================================
  // 2 — THE PROBLEM (the giant in the room)
  // =====================================================================
  s = p.addSlide(); s.background = { color: WHITE };
  kicker(s, 0.6, 0.5, 8, 'THE PROBLEM', AMBER);
  s.addText('The giant in the room', { x: 0.6, y: 0.82, w: 9, h: 0.7, fontFace: HEAD, fontSize: 34, bold: true, color: GREEN });
  s.addText('When an international agency decides where to invest in rural connectivity, Liberia cannot show — in real time — which towns most need the next broadband tower, the next payment agent, the next mile of fiber.',
    { x: 0.6, y: 1.55, w: 7.15, h: 1.0, fontFace: BODY, fontSize: 14.5, color: INK, lineSpacing: 19 });
  const pains = [
    ['FaClock', 'Data that is already stale', 'We lean on a general LIGIS survey, operator returns from three years ago, or a donor report that covered four counties and not the other eleven.'],
    ['FaMapMarkedAlt', 'No county-level truth', 'There is no live picture of which communities are connected and which are being left behind — so need cannot be proven.'],
    ['FaEyeSlash', 'Liberia stays invisible', 'Funding flows to countries that took ownership of their data — Kenya, Rwanda — while Liberia’s real, burning need goes unseen.'],
  ];
  let py = 2.75;
  pains.forEach(([ic, t, d]) => {
    iconCircle(s, 0.6, py, 0.72, AMBER, W[ic]);
    s.addText(t, { x: 1.5, y: py - 0.04, w: 6.0, h: 0.4, fontFace: BODY, fontSize: 16, bold: true, color: GREEN });
    s.addText(d, { x: 1.5, y: py + 0.36, w: 6.0, h: 0.85, fontFace: BODY, fontSize: 12.5, color: MUTED, lineSpacing: 15 });
    py += 1.42;
  });
  card(s, 8.15, 2.6, 4.55, 3.55, GREEN);
  s.addText('“', { x: 8.35, y: 2.55, w: 1, h: 1, fontFace: HEAD, fontSize: 70, color: ACCENT, bold: true });
  s.addText('We have built a nation that generates data everywhere and centralizes it nowhere.',
    { x: 8.55, y: 3.5, w: 3.8, h: 1.6, fontFace: HEAD, fontSize: 21, italic: true, color: WHITE, lineSpacing: 27 });
  s.addText('This is not a technology problem — it is a decision we have not yet made.',
    { x: 8.55, y: 5.35, w: 3.8, h: 0.7, fontFace: BODY, fontSize: 12.5, color: '8FE6B4' });
  pageNum(s, 2);
  s.addNotes('Tell the story: "Tomorrow an agency sits down to decide where to invest… Liberia is already at a disadvantage." Land the giant-in-the-room line. Kenya and Rwanda took ownership of their data; Liberia stays invisible. End on the quote.');

  // =====================================================================
  // 3 — DATA SOVEREIGNTY (why it matters)
  // =====================================================================
  s = p.addSlide(); s.background = { color: LIGHTBG };
  kicker(s, 0.6, 0.5, 10, 'WHY IT MATTERS', LEAF);
  s.addText('Data sovereignty is not optional', { x: 0.6, y: 0.82, w: 11, h: 0.7, fontFace: HEAD, fontSize: 34, bold: true, color: GREEN });
  s.addText('We cannot keep relying on the ITU or foreign agencies to be the source of truth for Liberia’s ICT data. We take ownership of it — and make it accessible to anyone looking for ICT data on Liberia, from anywhere in the world.',
    { x: 0.6, y: 1.58, w: 11.9, h: 0.95, fontFace: BODY, fontSize: 15, color: INK, lineSpacing: 20 });
  const sov = [
    ['FaFlag', 'One source of truth', 'A single, verified, national record — instead of scattered silos that never agree.'],
    ['FaGlobeAfrica', 'Owned by Liberia', 'Our numbers, reported on our terms — not estimated for us by others abroad.'],
    ['FaShieldAlt', 'Trusted & current', 'Validated, versioned and kept up to date, so decisions rest on evidence, not guesswork.'],
    ['FaHandshake', 'Open to partners', 'Investors, ministries and donors read from the same file — the moment they need it.'],
  ];
  let sx = 0.6;
  sov.forEach(([ic, t, d]) => {
    card(s, sx, 2.85, 2.86, 3.15, WHITE);
    iconCircle(s, sx + 0.28, 3.15, 0.78, LEAF, W[ic]);
    s.addText(t, { x: sx + 0.28, y: 4.1, w: 2.35, h: 0.7, fontFace: BODY, fontSize: 15.5, bold: true, color: GREEN, lineSpacing: 18 });
    s.addText(d, { x: sx + 0.28, y: 4.8, w: 2.35, h: 1.05, fontFace: BODY, fontSize: 12, color: MUTED, lineSpacing: 15 });
    sx += 3.03;
  });
  s.addText('It is our responsibility to build the single source of truth that every other system should have been able to rely on from the beginning.',
    { x: 0.6, y: 6.25, w: 12, h: 0.6, fontFace: BODY, fontSize: 13, italic: true, color: GREENMID });
  pageNum(s, 3);
  s.addNotes('This is the thesis. "Data sovereignty is a must." We stop outsourcing the truth about ourselves. Build once, trust everywhere — the foundation every other system relies on.');

  // =====================================================================
  // 4 — WHAT THE PROJECT IS
  // =====================================================================
  s = p.addSlide(); s.background = { color: WHITE };
  kicker(s, 0.6, 0.5, 10, 'WHAT WE ARE BUILDING', LEAF);
  s.addText('Liberia’s first National ICT Database', { x: 0.6, y: 0.82, w: 11.5, h: 0.7, fontFace: HEAD, fontSize: 33, bold: true, color: GREEN });
  s.addText('A live, national data hub that measures Liberia’s digital development across every county — connectivity, access, affordability, market structure, digital trust and sustainability — and publishes it as one authoritative, open record.',
    { x: 0.6, y: 1.55, w: 8.0, h: 1.3, fontFace: BODY, fontSize: 14.5, color: INK, lineSpacing: 20 });
  const facts = [
    ['FaDatabase', '30 indicators', 'across 6 policy domains'],
    ['FaMapMarkedAlt', '15 counties', 'every county, not a sample'],
    ['FaLayerGroup', '3,840+ data points', 'time-series, versioned & sourced'],
    ['FaCheckCircle', 'Role-based access', 'public, stakeholder & partner tiers'],
  ];
  let fy = 3.15;
  facts.forEach(([ic, big, sub]) => {
    iconCircle(s, 0.6, fy, 0.66, GREEN, W[ic]);
    s.addText(big, { x: 1.42, y: fy - 0.06, w: 6.6, h: 0.4, fontFace: HEAD, fontSize: 18, bold: true, color: GREEN });
    s.addText(sub, { x: 1.42, y: fy + 0.34, w: 6.6, h: 0.35, fontFace: BODY, fontSize: 12.5, color: MUTED });
    fy += 0.92;
  });
  // right visual panel
  card(s, 8.9, 1.55, 3.83, 5.0, GREEN);
  nodeMark(s, 10.8, 3.05, 1.15, ACCENT, WHITE, '2E7D52', 1);
  s.addText('One map. One truth.', { x: 9.2, y: 4.35, w: 3.25, h: 0.6, fontFace: HEAD, fontSize: 20, bold: true, color: WHITE });
  s.addText('An investor sees the connectivity gap in Grand Kru or River Gee and moves — because Liberia did the work of knowing its own infrastructure before asking anyone to invest in it.',
    { x: 9.2, y: 4.95, w: 3.25, h: 1.5, fontFace: BODY, fontSize: 12.5, color: 'BFE9CF', lineSpacing: 17 });
  pageNum(s, 4);
  s.addNotes('Define it plainly. Not "a website" — a national measurement system. 30 indicators, 6 domains, all 15 counties. The right panel makes it concrete: the investor who moves because the gap is finally visible.');

  // =====================================================================
  // 5 — WHAT IT MAKES POSSIBLE
  // =====================================================================
  s = p.addSlide(); s.background = { color: LIGHTBG };
  kicker(s, 0.6, 0.5, 10, 'THE MOMENT THE DATA EXISTS', LEAF);
  s.addText('What becomes possible', { x: 0.6, y: 0.82, w: 11, h: 0.7, fontFace: HEAD, fontSize: 34, bold: true, color: GREEN });
  const poss = [
    ['FaBroadcastTower', 'Infrastructure & investment', 'A telecom investor pulls up a coverage map, sees the gap, and extends fiber — instead of months of ground surveys and guesswork.'],
    ['FaMoneyBillWave', 'Digital financial inclusion', 'A mobile-money provider finds a county with high phone penetration but almost no agents — a market hiding in plain sight — and deploys.'],
    ['FaTruck', 'Trade & supply chains', 'An agribusiness plans a cold-storage route from Ganta to Buchanan on verified road and warehouse data, not word of mouth.'],
    ['FaGraduationCap', 'Targeted development', 'A donor funds school connectivity in the ten districts that actually need it — not the ten that happened to have a report written about them.'],
  ];
  let gx = 0.6, gy = 1.9;
  poss.forEach(([ic, t, d], i) => {
    const x = gx + (i % 2) * 6.05, y = gy + Math.floor(i / 2) * 2.25;
    card(s, x, y, 5.75, 2.0, WHITE);
    iconCircle(s, x + 0.3, y + 0.32, 0.8, LEAF, W[ic]);
    s.addText(t, { x: x + 1.3, y: y + 0.32, w: 4.2, h: 0.5, fontFace: BODY, fontSize: 16.5, bold: true, color: GREEN });
    s.addText(d, { x: x + 1.3, y: y + 0.82, w: 4.25, h: 1.05, fontFace: BODY, fontSize: 12.5, color: MUTED, lineSpacing: 16 });
  });
  pageNum(s, 5);
  s.addNotes('Four vivid vignettes — investor, fintech, agribusiness, donor. Each one is the difference between Liberia being read and being passed over. Keep them concrete; these are the "imagine…" moments from the script.');

  // =====================================================================
  // 6 — THE PHASES
  // =====================================================================
  s = p.addSlide(); s.background = { color: WHITE };
  kicker(s, 0.6, 0.5, 10, 'HOW WE DELIVER IT', LEAF);
  s.addText('Five phases, one system', { x: 0.6, y: 0.82, w: 11, h: 0.7, fontFace: HEAD, fontSize: 34, bold: true, color: GREEN });
  const phases = [
    ['FaCode', '1 · Software development', 'Build the secure platform: data model, explorer, dashboards, admin studio and role-based access.'],
    ['FaClipboardList', '2 · Data collection', 'A layered field programme — researchers, enumerators and supervisors gather ICT data in all 15 counties.'],
    ['FaServer', '3 · Population of the site', 'A central data team cleans, weights, geocodes and validates the data, then publishes it through the review queue.'],
    ['FaRocket', '4 · Launch', 'Public release as Liberia’s official ICT statistics hub — open to citizens, ministries, investors and partners.'],
    ['FaSyncAlt', '5 · Maintenance & governance', 'Scheduled refresh cycles, quality assurance and a standing unit that keeps the single source of truth current.'],
  ];
  const pw = 2.32, startX = 0.55, topY = 2.15;
  seg(startX + pw / 2, topY + 0.4, startX + 4 * 2.44 + pw / 2, topY + 0.4, SAGE, 2, s);
  phases.forEach(([ic, t, d], i) => {
    const x = startX + i * 2.44;
    iconCircle(s, x + pw / 2 - 0.4, topY, 0.8, i === 4 ? ACCENT : GREEN, W[ic]);
    card(s, x, topY + 1.05, pw, 3.35, LIGHTBG);
    s.addText(t, { x: x + 0.16, y: topY + 1.25, w: pw - 0.32, h: 0.7, fontFace: BODY, fontSize: 13.5, bold: true, color: GREEN, lineSpacing: 16 });
    s.addText(d, { x: x + 0.16, y: topY + 2.0, w: pw - 0.32, h: 2.2, fontFace: BODY, fontSize: 11.5, color: MUTED, lineSpacing: 15 });
  });
  s.addText('Phases 2–3 alone create a nationwide field and data-engineering workforce — see slide 9.',
    { x: 0.6, y: 6.55, w: 12, h: 0.4, fontFace: BODY, fontSize: 12, italic: true, color: GREENMID });
  pageNum(s, 6);
  s.addNotes('Walk the five phases left to right. Emphasise this is sequenced and fundable in stages: build, collect, populate, launch, sustain. Phase 5 (accent) is the part most projects forget — governance keeps the truth true.');

  // =====================================================================
  // 7 — ARREST AGENDA
  // =====================================================================
  s = p.addSlide(); s.background = { color: LIGHTBG };
  kicker(s, 0.6, 0.5, 11, 'NATIONAL ALIGNMENT', LEAF);
  s.addText('Fuel for the President’s ARREST Agenda', { x: 0.6, y: 0.82, w: 12, h: 0.7, fontFace: HEAD, fontSize: 32, bold: true, color: GREEN });
  s.addText('Every pillar of the ARREST agenda runs better on verified data. The database is the instrument that measures progress and targets investment.',
    { x: 0.6, y: 1.55, w: 12, h: 0.6, fontFace: BODY, fontSize: 13.5, color: INK });
  const arrest = [
    ['FaSeedling', 'Agriculture', 'Connectivity and market-price reach for farmers; routing produce on real infrastructure data.'],
    ['FaRoad', 'Roads & infrastructure', 'A live inventory of towers, fiber and corridor condition to target infrastructure where it is needed.'],
    ['FaBalanceScale', 'Rule of Law', 'Verified, auditable public records — trust and transparency instead of paperwork and suspicion.'],
    ['FaGraduationCap', 'Education', 'School-connectivity rates showing which classrooms actually have power and internet.'],
    ['FaRecycle', 'Sanitation & Health', 'Health-facility digital-readiness data — which clinics could support telemedicine today.'],
    ['FaUmbrellaBeach', 'Tourism', 'Coverage and digital-payment data that tourism and hospitality investment depend on.'],
  ];
  let ax = 0.6, ay = 2.35;
  arrest.forEach(([ic, t, d], i) => {
    const x = ax + (i % 3) * 4.05, y = ay + Math.floor(i / 3) * 2.15;
    card(s, x, y, 3.8, 1.9, WHITE);
    iconCircle(s, x + 0.26, y + 0.28, 0.66, ACCENT, W[ic]);
    s.addText(t, { x: x + 1.05, y: y + 0.34, w: 2.6, h: 0.5, fontFace: BODY, fontSize: 14.5, bold: true, color: GREEN });
    s.addText(d, { x: x + 0.26, y: y + 1.02, w: 3.3, h: 0.8, fontFace: BODY, fontSize: 11.5, color: MUTED, lineSpacing: 14 });
  });
  pageNum(s, 7);
  s.addNotes('Map the project to A-R-R-E-S-T so leadership sees it as national infrastructure for their own agenda, not a side project. The database does not compete with the agenda — it measures and de-risks it.');

  // =====================================================================
  // 8 — GLOBAL INDICATORS
  // =====================================================================
  s = p.addSlide(); s.background = { color: WHITE };
  kicker(s, 0.6, 0.5, 11, 'GLOBAL ALIGNMENT', LEAF);
  s.addText('Reporting our own numbers to the world', { x: 0.6, y: 0.82, w: 12, h: 0.7, fontFace: HEAD, fontSize: 32, bold: true, color: GREEN });
  s.addText('The same record that serves Liberia feeds the global frameworks that decide where development finance goes — sourced here, not estimated abroad.',
    { x: 0.6, y: 1.55, w: 12, h: 0.6, fontFace: BODY, fontSize: 13.5, color: INK });
  const globs = [
    ['FaBullseye', 'UN SDGs', 'Direct evidence for SDG 9 (infrastructure & universal ICT access, 9.c) and SDG 17.18 (disaggregated national data).'],
    ['FaGlobeAfrica', 'ITU', 'Liberia reporting its own ICT Development Index inputs — from a national source, not third-party estimates.'],
    ['FaHandshake', 'UNDP', 'A measurable baseline for digital transformation and inclusive digital-development programming.'],
    ['FaUniversity', 'World Bank', 'Digital Public Infrastructure and GovTech readiness backed by verified, current national statistics.'],
  ];
  let ix = 0.6, iy = 2.4;
  globs.forEach(([ic, t, d], i) => {
    const x = ix + (i % 2) * 6.05, y = iy + Math.floor(i / 2) * 2.05;
    card(s, x, y, 5.75, 1.8, LIGHTBG);
    iconCircle(s, x + 0.3, y + 0.3, 0.78, GREEN, W[ic]);
    s.addText(t, { x: x + 1.28, y: y + 0.34, w: 4.2, h: 0.5, fontFace: BODY, fontSize: 16.5, bold: true, color: GREEN });
    s.addText(d, { x: x + 1.28, y: y + 0.86, w: 4.25, h: 0.85, fontFace: BODY, fontSize: 12, color: MUTED, lineSpacing: 15 });
  });
  pageNum(s, 8);
  s.addNotes('Show that this is how Liberia stops being invisible to the ITU/UNDP/World Bank/SDG apparatus. We supply the numbers, on our terms — which is exactly what unlocks targeted funding.');

  // =====================================================================
  // 9 — JOBS FOR YOUNG LIBERIANS
  // =====================================================================
  s = p.addSlide(); s.background = { color: GREEN };
  kicker(s, 0.6, 0.5, 11, 'A LIBERIAN WORKFORCE', '8FE6B4');
  s.addText('Careers in tech, ICT research & data', { x: 0.6, y: 0.82, w: 12, h: 0.7, fontFace: HEAD, fontSize: 33, bold: true, color: WHITE });
  s.addText('This project does not import a solution — it employs and trains young Liberians to build and run it. Data collection and processing alone put a nationwide workforce to work.',
    { x: 0.6, y: 1.55, w: 12, h: 0.7, fontFace: BODY, fontSize: 14, color: 'BFE9CF', lineSpacing: 18 });
  const stat = (x, big, lbl) => {
    card(s, x, 2.5, 2.86, 1.5, GREEN2);
    s.addText(big, { x, y: 2.62, w: 2.86, h: 0.75, fontFace: HEAD, fontSize: 30, bold: true, color: ACCENT, align: 'center' });
    s.addText(lbl, { x: x + 0.15, y: 3.4, w: 2.56, h: 0.5, fontFace: BODY, fontSize: 11.5, color: WHITE, align: 'center', lineSpacing: 13 });
  };
  stat(0.6, '118', 'field enumerators');
  stat(3.63, '31', 'field supervisors');
  stat(6.66, '15', 'county research leads');
  stat(9.69, '200+', 'total field & data roles');
  const roles = [
    ['FaLaptopCode', 'Software developers', 'building and maintaining the national platform'],
    ['FaUsers', 'Field researchers & enumerators', 'trained data collectors in every county'],
    ['FaServer', 'Data engineers & GIS analysts', 'pipelines, geocoding and the review queue'],
    ['FaChartLine', 'Statisticians & QA analysts', 'weighting, validation and a standing ICT-stats unit'],
  ];
  let ry = 4.3;
  roles.forEach(([ic, t, d]) => {
    iconCircle(s, 0.6, ry, 0.6, ACCENT, W[ic]);
    s.addText([{ text: t + '  ', options: { bold: true, color: WHITE } }, { text: '— ' + d, options: { color: 'BFE9CF' } }],
      { x: 1.36, y: ry + 0.04, w: 11, h: 0.5, fontFace: BODY, fontSize: 13.5 });
    ry += 0.62;
  });
  pageNum(s, 9);
  s.addNotes('This is the emotional and political core for a Liberian audience: jobs and skills stay here. Nearly 200 field and data roles, plus a permanent ICT statistics capability — a pipeline of tech, research and data-engineering careers for young Liberians.');

  // =====================================================================
  // 10 — THE INVITATION
  // =====================================================================
  s = p.addSlide(); s.background = { color: WHITE };
  kicker(s, 0.6, 0.6, 11, 'THE INVITATION', LEAF);
  s.addText('Not simply an IT project', { x: 0.6, y: 0.95, w: 12, h: 0.8, fontFace: HEAD, fontSize: 36, bold: true, color: GREEN });
  s.addText('It is a statement about what kind of state we intend to be — one where a citizen’s relationship with government is built on trust and speed, not suspicion and paperwork.',
    { x: 0.6, y: 1.95, w: 11.6, h: 1.0, fontFace: HEAD, fontSize: 20, italic: true, color: GREENMID, lineSpacing: 26 });
  const asks = [
    ['FaHandshake', 'Endorsement', 'Recognise NICTD as Liberia’s official ICT-statistics hub and data-sovereignty initiative.'],
    ['FaHandHoldingUsd', 'Funding by phase', 'Back the phased plan — development, the nationwide data-collection drive, launch and maintenance.'],
    ['FaSitemap', 'Data partnership', 'A mandate for operators and ministries to report into one shared, verified national record.'],
  ];
  let kx = 0.6;
  asks.forEach(([ic, t, d]) => {
    card(s, kx, 3.35, 3.86, 2.85, LIGHTBG);
    iconCircle(s, kx + 0.3, 3.65, 0.8, GREEN, W[ic]);
    s.addText(t, { x: kx + 0.3, y: 4.6, w: 3.25, h: 0.5, fontFace: BODY, fontSize: 17, bold: true, color: GREEN });
    s.addText(d, { x: kx + 0.3, y: 5.12, w: 3.3, h: 1.0, fontFace: BODY, fontSize: 12.5, color: MUTED, lineSpacing: 16 });
    kx += 4.05;
  });
  s.addText('Build the one system every other system should have been able to rely on from the beginning.',
    { x: 0.6, y: 6.45, w: 12, h: 0.5, fontFace: BODY, fontSize: 13, italic: true, color: GREENMID });
  pageNum(s, 10);
  s.addNotes('Turn the story into an ask. Three concrete requests: endorsement, phased funding, and a data-reporting mandate. Reframe from "IT project" to "what kind of state we intend to be."');

  // =====================================================================
  // 11 — CLOSE
  // =====================================================================
  s = p.addSlide(); s.background = { color: GREEN };
  s.addShape(p.ShapeType.ellipse, { x: -1.9, y: 3.6, w: 5.2, h: 5.2, fill: { color: GREENMID, transparency: 62 }, line: { type: 'none' } });
  nodeMark(s, 11.9, 5.85, 1.35, ACCENT, WHITE, '2E7D52', 1.1);
  s.addText('Knowing who we are as a nation\nshould not be something we ask a\ncitizen to prove.',
    { x: 1.7, y: 1.85, w: 10.6, h: 2.2, fontFace: HEAD, fontSize: 30, bold: true, color: WHITE, lineSpacing: 38 });
  s.addText('It should be something our own government already knows — because we finally built it to.',
    { x: 1.7, y: 4.15, w: 10.4, h: 0.9, fontFace: HEAD, fontSize: 19, italic: true, color: '8FE6B4', lineSpacing: 25 });
  s.addText([{ text: 'Emmanuel Daniel Harris', options: { bold: true, color: WHITE } },
    { text: '   ·   Harris & Associates LLC', options: { color: 'BFE9CF' } }],
    { x: 1.7, y: 6.05, w: 11, h: 0.4, fontFace: BODY, fontSize: 15 });
  s.addText('“Liberian Solutions for Liberian Challenges”', { x: 1.7, y: 6.5, w: 11, h: 0.4, fontFace: BODY, fontSize: 12.5, italic: true, color: '8FE6B4' });
  s.addNotes('Close on the human line — knowing who we are should be something the government already knows. Thank them. End with the Harris & Associates tagline. Pause before questions.');

  await p.writeFile({ fileName: OUT });
  console.log('WROTE', OUT);
})().catch(e => { console.error(e); process.exit(1); });
