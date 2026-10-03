// build-lta-pitch.js — 7-slide NICTD pitch deck for the LTA (pptxgenjs).
const pptxgen = require('pptxgenjs');
const React = require('react');
const RD = require('react-dom/server');
const sharp = require('sharp');
const FA = require('react-icons/fa');
const path = require('path');

const OUT = path.join(__dirname, '..', 'deliverables', 'NICTD-LTA-Pitch.pptx');

// ---- palette ----
const NAVY = '12263A', NAVY2 = '0C1826', NAVYMID = '1C3E5A', TEAL = '1E8A8A', TEALSOFT = 'E4F3F1',
      RED = 'C8102E', REDSOFT = 'FBE4E4', CREAM = 'F7F4EE', WHITE = 'FFFFFF', INK = '23303B',
      MUTED = '5C6B78', LINE = 'DDE4EF', LIGHTBG = 'F4F7FA';
const HEAD = 'Cambria', BODY = 'Calibri';

async function renderIcon(name, hex) {
  const Comp = FA[name];
  if (!Comp) throw new Error('missing icon ' + name);
  const svg = RD.renderToStaticMarkup(React.createElement(Comp, { color: '#' + hex, size: 256 }));
  const png = await sharp(Buffer.from(svg)).resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  return 'image/png;base64,' + png.toString('base64');
}

(async () => {
  const iconNames = ['FaWifi', 'FaBroadcastTower', 'FaCoins', 'FaBuilding', 'FaShieldAlt', 'FaLeaf',
    'FaCheckCircle', 'FaDatabase', 'FaMapMarkedAlt', 'FaLayerGroup', 'FaCode', 'FaGlobeAfrica',
    'FaBullseye', 'FaUniversity', 'FaHandshake', 'FaBalanceScale', 'FaFlag', 'FaUsers',
    'FaHandHoldingUsd', 'FaPuzzlePiece', 'FaSitemap', 'FaClock', 'FaChartLine', 'FaMoneyBillWave',
    'FaEye', 'FaServer', 'FaComments'];
  const W = {}; for (const n of iconNames) W[n] = await renderIcon(n, 'FFFFFF');

  const p = new pptxgen();
  p.defineLayout({ name: 'WIDE', width: 13.333, height: 7.5 });
  p.layout = 'WIDE';
  p.author = 'NICTD'; p.title = 'National ICT Database of Liberia — LTA Briefing';

  // ---- helpers ----
  function iconCircle(s, x, y, d, fill, img) {
    s.addShape(p.ShapeType.ellipse, { x, y, w: d, h: d, fill: { color: fill }, line: { type: 'none' } });
    const ins = d * 0.27; s.addImage({ data: img, x: x + ins, y: y + ins, w: d - 2 * ins, h: d - 2 * ins });
  }
  function seg(x1, y1, x2, y2, color, width, s) {
    const x = Math.min(x1, x2), y = Math.min(y1, y2), w = Math.abs(x2 - x1), h = Math.abs(y2 - y1);
    s.addShape(p.ShapeType.line, { x, y, w, h, flipH: x2 < x1, flipV: y2 < y1, line: { color, width } });
  }
  function nodeMark(s, cx, cy, R, main, sat, lc, lw) {
    const pts = [];
    for (let i = 0; i < 6; i++) { const a = (Math.PI / 3) * i - Math.PI / 2; pts.push([cx + R * Math.cos(a), cy + R * Math.sin(a)]); }
    pts.forEach(pt => seg(cx, cy, pt[0], pt[1], lc, lw, s));
    const sd = R * 0.20;
    pts.forEach(pt => s.addShape(p.ShapeType.ellipse, { x: pt[0] - sd / 2, y: pt[1] - sd / 2, w: sd, h: sd, fill: { color: sat }, line: { type: 'none' } }));
    const cd = R * 0.42; s.addShape(p.ShapeType.ellipse, { x: cx - cd / 2, y: cy - cd / 2, w: cd, h: cd, fill: { color: main }, line: { type: 'none' } });
  }
  function card(s, x, y, w, h, fill) {
    s.addShape(p.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.09, fill: { color: fill || WHITE },
      line: { color: LINE, width: 1 }, shadow: { type: 'outer', color: 'AEB9C4', blur: 7, offset: 3, angle: 90, opacity: 0.4 } });
  }
  function kicker(s, x, y, w, text, color) {
    s.addText(text, { x, y, w, h: 0.3, fontFace: BODY, fontSize: 11, bold: true, color, charSpacing: 3, align: 'left' });
  }

  // =====================================================================
  // SLIDE 1 — TITLE (dark)
  // =====================================================================
  let s = p.addSlide(); s.background = { color: NAVY };
  s.addShape(p.ShapeType.ellipse, { x: 9.7, y: -1.6, w: 5.6, h: 5.6, fill: { color: NAVYMID, transparency: 55 }, line: { type: 'none' } });
  nodeMark(s, 11.15, 4.9, 1.85, TEAL, WHITE, '3A6E7C', 1.25);
  kicker(s, 0.9, 1.15, 11, 'REPUBLIC OF LIBERIA   ·   MINISTRY OF POSTS & TELECOMMUNICATIONS', TEAL);
  s.addText('The National ICT Database', { x: 0.85, y: 1.7, w: 9.6, h: 1.9, fontFace: HEAD, fontSize: 50, bold: true, color: WHITE, lineSpacing: 50 });
  s.addText('A paradigm shift for Liberia’s technology space.', { x: 0.9, y: 3.75, w: 9.2, h: 0.7, fontFace: HEAD, fontSize: 23, italic: true, color: '7FD0CE' });
  s.addText([{ text: 'A briefing for the ', options: {} }, { text: 'Liberia Telecommunications Authority (LTA)', options: { bold: true, color: WHITE } }],
    { x: 0.9, y: 6.35, w: 10, h: 0.4, fontFace: BODY, fontSize: 14, color: 'AEBECB' });
  s.addNotes('Open with the hook: this is not just a website, it is a paradigm shift — the first time Liberia can measure its own digital development. Set the tone: confident, national, evidence-driven. Do NOT open the product yet.');

  // =====================================================================
  // SLIDE 2 — FROM GUESSWORK TO EVIDENCE (light)
  // =====================================================================
  s = p.addSlide(); s.background = { color: WHITE };
  s.addText('From guesswork to evidence', { x: 0.6, y: 0.5, w: 8, h: 0.7, fontFace: HEAD, fontSize: 34, bold: true, color: NAVY });
  s.addText('Every major decision about Liberia’s digital future is currently made without a map.',
    { x: 0.6, y: 1.28, w: 7.1, h: 0.7, fontFace: BODY, fontSize: 15, color: MUTED });
  const pains = [
    ['FaPuzzlePiece', 'Scattered & inconsistent', 'Data sits in silos across operators, ministries and one-off donor surveys — not comparable, quickly outdated.'],
    ['FaMapMarkedAlt', 'No county-level picture', 'We cannot see which counties and which people are connected — and which are being left behind.'],
    ['FaHandHoldingUsd', 'Investment hesitates', 'With no baseline and no evidence, donors and investors cannot target funds or hold results accountable.'],
  ];
  let py = 2.25;
  pains.forEach(([ic, t, d]) => {
    iconCircle(s, 0.6, py, 0.72, RED, W[ic]);
    s.addText(t, { x: 1.5, y: py - 0.04, w: 5.9, h: 0.4, fontFace: BODY, fontSize: 16, bold: true, color: NAVY });
    s.addText(d, { x: 1.5, y: py + 0.34, w: 5.9, h: 0.8, fontFace: BODY, fontSize: 12.5, color: MUTED, lineSpacing: 15 });
    py += 1.45;
  });
  // quote card (navy) right
  card(s, 8.05, 2.1, 4.75, 4.2, NAVY);
  s.addShape(p.ShapeType.roundRect, { x: 8.05, y: 2.1, w: 4.75, h: 4.2, rectRadius: 0.09, fill: { type: 'none' }, line: { type: 'none' } });
  s.addText('“You cannot manage what you cannot measure.”',
    { x: 8.45, y: 2.75, w: 3.95, h: 2.0, fontFace: HEAD, fontSize: 25, bold: true, color: WHITE, italic: true, lineSpacing: 30 });
  s.addText('The National ICT Database gives Liberia that measure — for the first time, county by county.',
    { x: 8.45, y: 4.95, w: 3.95, h: 1.1, fontFace: BODY, fontSize: 13.5, color: '9FD6D3', lineSpacing: 17 });
  s.addNotes('Frame the problem as a management problem, not a tech problem. The quote is the anchor line — pause on it. This sets up why the database matters before you show any feature.');

  // =====================================================================
  // SLIDE 3 — WHAT IT IS (light)
  // =====================================================================
  s = p.addSlide(); s.background = { color: WHITE };
  s.addText('What the National ICT Database is', { x: 0.6, y: 0.45, w: 10.5, h: 0.7, fontFace: HEAD, fontSize: 32, bold: true, color: NAVY });
  s.addText('Liberia’s official, county-by-county source of truth for ICT statistics — six domains in one platform.',
    { x: 0.6, y: 1.2, w: 12, h: 0.5, fontFace: BODY, fontSize: 15, color: MUTED });
  const domains = [
    ['FaWifi', TEAL, 'Connectivity', 'Internet & mobile penetration, urban/rural & gender gaps'],
    ['FaBroadcastTower', NAVY, 'Access & Infrastructure', 'Coverage, towers, fiber, broadband access points'],
    ['FaCoins', RED, 'Affordability', 'Cost to connect vs. income; device ownership'],
    ['FaBuilding', NAVY, 'Market Structure', 'ICT businesses, jobs, investment, mobile money'],
    ['FaShieldAlt', TEAL, 'Trust & Governance', 'Data protection, digital ID, e-gov, cybersecurity'],
    ['FaLeaf', RED, 'Sustainability', 'E-waste and clean energy in the ICT sector'],
  ];
  const gx = 0.6, gy = 1.95, cw = 3.95, ch = 1.5, gxs = 0.28, gys = 0.26;
  domains.forEach((d, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = gx + col * (cw + gxs), y = gy + row * (ch + gys);
    card(s, x, y, cw, ch, WHITE);
    iconCircle(s, x + 0.25, y + 0.28, 0.62, d[1], W[d[0]]);
    s.addText(d[2], { x: x + 1.02, y: y + 0.24, w: cw - 1.15, h: 0.4, fontFace: BODY, fontSize: 14.5, bold: true, color: NAVY });
    s.addText(d[3], { x: x + 1.02, y: y + 0.62, w: cw - 1.2, h: 0.7, fontFace: BODY, fontSize: 11, color: MUTED, lineSpacing: 13.5 });
  });
  // stat strip
  const strip = [['FaDatabase', '30', 'Indicators'], ['FaMapMarkedAlt', '15', 'Counties'], ['FaLayerGroup', '6', 'Domains'], ['FaCode', 'API', 'Open data & dashboards']];
  const sy = 5.95, sw = 2.95, sxs = 0.3;
  strip.forEach((t, i) => {
    const x = 0.6 + i * (sw + sxs);
    iconCircle(s, x, sy + 0.05, 0.55, NAVYMID, W[t[0]]);
    s.addText(t[1], { x: x + 0.66, y: sy - 0.06, w: sw - 0.7, h: 0.45, fontFace: HEAD, fontSize: 22, bold: true, color: TEAL });
    s.addText(t[2], { x: x + 0.66, y: sy + 0.36, w: sw - 0.7, h: 0.3, fontFace: BODY, fontSize: 10.5, color: MUTED });
  });
  s.addNotes('Explain the breadth: this is not just "internet users." It is six domains that together describe the whole digital economy — supply, demand, affordability, market, governance and sustainability. 30 indicators, all 15 counties.');

  // =====================================================================
  // SLIDE 4 — STATUS: ALREADY BUILT (light, strong)
  // =====================================================================
  s = p.addSlide(); s.background = { color: LIGHTBG };
  s.addText('Status: the engine is already built', { x: 0.6, y: 0.5, w: 9.5, h: 0.7, fontFace: HEAD, fontSize: 32, bold: true, color: NAVY });
  s.addText([{ text: 'This is not a concept. ', options: { bold: true, color: RED } }, { text: 'It is a working platform, running today.', options: { color: INK } }],
    { x: 0.6, y: 1.28, w: 8, h: 0.5, fontFace: BODY, fontSize: 16 });
  const done = [
    'Live national database on cloud infrastructure',
    '30 indicators across all 15 counties, 2018–2025',
    'Interactive dashboards & county choropleth maps',
    'Open-data downloads and a documented public API',
    'Secure role-based access & an admin control studio',
  ];
  let dy = 2.15;
  done.forEach(t => {
    iconCircle(s, 0.65, dy, 0.5, TEAL, W['FaCheckCircle']);
    s.addText(t, { x: 1.32, y: dy + 0.02, w: 6.2, h: 0.5, fontFace: BODY, fontSize: 14.5, color: INK });
    dy += 0.82;
  });
  // right stat tiles
  const tiles = [['3,840', 'data points already loaded'], ['15 / 15', 'counties covered'], ['LIVE', 'built, tested & running now']];
  let ty = 2.05;
  tiles.forEach((t, i) => {
    card(s, 8.15, ty, 4.65, 1.15, i === 2 ? NAVY : WHITE);
    s.addText(t[0], { x: 8.45, y: ty + 0.14, w: 4.1, h: 0.6, fontFace: HEAD, fontSize: 30, bold: true, color: i === 2 ? WHITE : TEAL });
    s.addText(t[1], { x: 8.45, y: ty + 0.72, w: 4.1, h: 0.35, fontFace: BODY, fontSize: 12, color: i === 2 ? '9FD6D3' : MUTED });
    ty += 1.32;
  });
  s.addText('You are not funding an idea — you are fueling an engine that is already running.',
    { x: 0.6, y: 6.5, w: 12.1, h: 0.5, fontFace: HEAD, fontSize: 17, italic: true, bold: true, color: NAVY, align: 'center' });
  s.addNotes('This slide de-risks the ask. Emphasize: the hard part — designing and building the platform — is done. The money is for data collection and operations, not R&D. Low execution risk.');

  // =====================================================================
  // SLIDE 5 — WHY WE NEED FUNDING (light, data)
  // =====================================================================
  s = p.addSlide(); s.background = { color: WHITE };
  s.addText('Why we need funding', { x: 0.6, y: 0.5, w: 8, h: 0.7, fontFace: HEAD, fontSize: 32, bold: true, color: NAVY });
  s.addText('The platform runs. Funding powers the national data-mining phase that fills it with real, verified Liberian data — then a low-cost annual refresh.',
    { x: 0.6, y: 1.25, w: 12.1, h: 0.6, fontFace: BODY, fontSize: 14.5, color: MUTED, lineSpacing: 18 });
  s.addText('One-time data-mining phase — cost composition (US$)', { x: 0.6, y: 2.15, w: 6.6, h: 0.35, fontFace: BODY, fontSize: 12.5, bold: true, color: NAVY });
  s.addChart(p.ChartType.bar, [{ name: 'Cost', labels: ['Field team', 'Data team', 'Management', 'Contingency'], values: [390250, 57500, 16500, 46425] }], {
    x: 0.5, y: 2.5, w: 6.7, h: 3.7, barDir: 'bar', chartColors: [TEAL],
    showTitle: false, showLegend: false, showValue: true, dataLabelPosition: 'outEnd',
    dataLabelColor: NAVY, dataLabelFontFace: BODY, dataLabelFontSize: 11, dataLabelFormatCode: '"$"#,##0',
    catAxisLabelColor: INK, catAxisLabelFontFace: BODY, catAxisLabelFontSize: 12,
    valAxisHidden: true, valGridLine: { style: 'none' }, catGridLine: { style: 'none' },
    barGapWidthPct: 60,
  });
  // grand total card
  card(s, 7.55, 2.35, 5.25, 1.35, NAVY);
  s.addText('US$ 510,675', { x: 7.85, y: 2.5, w: 4.7, h: 0.65, fontFace: HEAD, fontSize: 34, bold: true, color: WHITE });
  s.addText('total one-time data-mining phase (incl. 10% contingency)', { x: 7.85, y: 3.16, w: 4.7, h: 0.4, fontFace: BODY, fontSize: 11.5, color: '9FD6D3' });
  // scope tiles 2x2
  const scope = [['FaUsers', '197', 'field workforce'], ['FaComments', '~10,000', 'household interviews'], ['FaServer', '15', 'data-team specialists'], ['FaClock', '≈11 wks', 'design to publish']];
  const bx = 7.55, by = 3.95, bw = 2.55, bh = 1.15, bxs = 0.15, bys = 0.18;
  scope.forEach((t, i) => {
    const x = bx + (i % 2) * (bw + bxs), y = by + Math.floor(i / 2) * (bh + bys);
    card(s, x, y, bw, bh, LIGHTBG);
    iconCircle(s, x + 0.18, y + 0.32, 0.5, TEAL, W[t[0]]);
    s.addText(t[1], { x: x + 0.75, y: y + 0.16, w: bw - 0.8, h: 0.45, fontFace: HEAD, fontSize: 19, bold: true, color: NAVY });
    s.addText(t[2], { x: x + 0.75, y: y + 0.63, w: bw - 0.8, h: 0.4, fontFace: BODY, fontSize: 10.5, color: MUTED, lineSpacing: 12 });
  });
  s.addNotes('Be concrete about the money: it funds field data collection across all 15 counties — enumerators, supervisors, a data team, ~10,000 household interviews — over ~11 weeks. After that, annual refresh is cheap. This is where the ask becomes real.');

  // =====================================================================
  // SLIDE 6 — FRAMEWORK ALIGNMENT (light)
  // =====================================================================
  s = p.addSlide(); s.background = { color: LIGHTBG };
  s.addText('Aligned with every agenda that matters', { x: 0.6, y: 0.5, w: 11, h: 0.7, fontFace: HEAD, fontSize: 31, bold: true, color: NAVY });
  s.addText('The database is a direct deliverable for the frameworks Liberia and its partners are already committed to.',
    { x: 0.6, y: 1.25, w: 12, h: 0.5, fontFace: BODY, fontSize: 14, color: MUTED });
  const fw = [
    ['FaGlobeAfrica', 'UN SDGs', 'Delivers SDG 9.c (universal access) & 17.18 (disaggregated data)'],
    ['FaBullseye', 'ITU', 'Tracks Universal Meaningful Connectivity by 2030'],
    ['FaUniversity', 'World Bank', 'The digital diagnostic behind Digital Economy for Africa'],
    ['FaUsers', 'UNDP', '“Leave no one behind” — pinpoints the underserved'],
    ['FaHandshake', 'UN Global Digital Compact', 'Closing digital divides with real evidence'],
    ['FaSitemap', 'AU / Smart Africa', 'National digital public infrastructure'],
  ];
  const fgx = 0.6, fgy = 1.95, fcw = 3.95, fch = 1.28, fxs = 0.28, fys = 0.24;
  fw.forEach((d, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = fgx + col * (fcw + fxs), y = fgy + row * (fch + fys);
    card(s, x, y, fcw, fch, WHITE);
    iconCircle(s, x + 0.22, y + 0.24, 0.56, NAVYMID, W[d[0]]);
    s.addText(d[1], { x: x + 0.95, y: y + 0.2, w: fcw - 1.1, h: 0.36, fontFace: BODY, fontSize: 13.5, bold: true, color: NAVY });
    s.addText(d[2], { x: x + 0.95, y: y + 0.56, w: fcw - 1.12, h: 0.62, fontFace: BODY, fontSize: 10.5, color: MUTED, lineSpacing: 13 });
  });
  // ARREST highlight (red)
  card(s, 0.6, 5.72, 12.2, 1.28, NAVY);
  iconCircle(s, 0.95, 6.0, 0.72, RED, W['FaFlag']);
  s.addText([{ text: 'Liberia’s ARREST Agenda   ', options: { bold: true, color: WHITE, fontSize: 16 } },
    { text: '(Agriculture · Roads · Rule of law · Education · Sanitation · Tourism)', options: { color: '9FD6D3', fontSize: 12, italic: true } }],
    { x: 1.85, y: 5.92, w: 10.7, h: 0.4, fontFace: BODY });
  s.addText('The database is the measurement backbone for the digital enabler that runs across the entire national development plan.',
    { x: 1.85, y: 6.34, w: 10.7, h: 0.5, fontFace: BODY, fontSize: 12.5, color: 'CFE0E9' });
  s.addNotes('Lead with whichever framework the person in the room owns. For the LTA and Ministry: emphasize the ARREST Agenda and ITU. For UN/World Bank guests: SDG 9.c/17.18 and Digital Economy for Africa. The point: funding this ticks many boxes at once.');

  // =====================================================================
  // SLIDE 7 — THE ASK / CLOSE (dark)
  // =====================================================================
  s = p.addSlide(); s.background = { color: NAVY };
  s.addShape(p.ShapeType.ellipse, { x: -1.8, y: 3.4, w: 5.4, h: 5.4, fill: { color: NAVYMID, transparency: 55 }, line: { type: 'none' } });
  nodeMark(s, 0.75, 6.0, 1.5, TEAL, WHITE, '3A6E7C', 1.1);
  kicker(s, 0.9, 0.85, 11, 'THE ASK', TEAL);
  s.addText('Fund the data. Unlock the map.', { x: 0.85, y: 1.25, w: 11.5, h: 1.0, fontFace: HEAD, fontSize: 40, bold: true, color: WHITE });
  s.addText('Invest in the data collection and operations that turn a working platform into Liberia’s definitive, county-level digital evidence base.',
    { x: 0.9, y: 2.5, w: 11.3, h: 0.9, fontFace: BODY, fontSize: 16, color: 'C6D3DE', lineSpacing: 22 });
  const asks = [['FaCheckCircle', 'Low-risk', 'the platform already works'], ['FaFlag', 'Anchored', 'in the ARREST Agenda'], ['FaGlobeAfrica', 'Aligned', 'with the SDGs, ITU & World Bank']];
  asks.forEach((a, i) => {
    const x = 0.9 + i * 4.05;
    iconCircle(s, x, 3.75, 0.6, TEAL, W[a[0]]);
    s.addText(a[1], { x: x + 0.75, y: 3.72, w: 3.2, h: 0.4, fontFace: BODY, fontSize: 15, bold: true, color: WHITE });
    s.addText(a[2], { x: x + 0.75, y: 4.08, w: 3.2, h: 0.5, fontFace: BODY, fontSize: 11.5, color: '9FB4C4', lineSpacing: 13 });
  });
  s.addText('Now — let me show you.', { x: 0.9, y: 5.35, w: 11, h: 0.9, fontFace: HEAD, fontSize: 30, bold: true, italic: true, color: '7FD0CE' });
  s.addText('National ICT Database of Liberia   ·   Ministry of Posts & Telecommunications', { x: 0.9, y: 6.95, w: 11.5, h: 0.35, fontFace: BODY, fontSize: 11, color: '8FA3B4' });
  s.addNotes('Deliver the ask plainly, then the transition line "Now, let me show you" — and only THEN open the live product. End on confidence: low-risk, aligned, ready.');

  await p.writeFile({ fileName: OUT });
  console.log('WROTE', OUT);
})();
