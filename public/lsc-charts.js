// lsc-charts.js · NICTD Data Landscape, analysis charts.
//
// Five renderers drawn in the same tilted world as the landscape above them.
//
// The camera is AXONOMETRIC, not perspective: depth shifts a mark up and to the right by a
// fixed amount and never scales it. A perspective 3D chart makes nearer bars look bigger
// than they are, so lengths stop being comparable. Here a bar's front face stays exactly
// proportional to its value, and two equal values are drawn exactly the same height.
//
// Each renderer takes (container, bundle). They hold no state and fetch nothing;
// public/landscape.js owns the data and calls them when the indicator or year changes.
// bundle.onPick(county) lets a chart hand a selection back to the page.
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var NAVY = [11, 44, 99], TEAL = [28, 91, 184], CLAY = [127, 160, 206], GOLD = [200, 16, 46];
  var SKY = [221, 231, 247];
  var INK = '#17233A', MUTED = '#5A6A85', FAINT = '#9AA8BF', LINE = '#DCE3EF';

  // ---------- the camera ----------
  var SKEW = 0.34;   // how far one unit of depth pushes right
  var TILT = 0.58;   // how far one unit of depth pushes down

  var UID = 0;

  function el(n, a, t) {
    var e = document.createElementNS(NS, n), k;
    for (k in a) if (a[k] != null) e.setAttribute(k, a[k]);
    if (t != null) e.textContent = t;
    return e;
  }
  function tx(x, y, s, o) {
    o = o || {};
    return el('text', {
      x: x, y: y, 'font-size': o.size || 11, 'font-weight': o.weight || 400,
      fill: o.fill || INK, 'text-anchor': o.anchor || null, 'letter-spacing': o.ls || null,
      class: 'lsc-c-t' + (o.num ? ' is-num' : ''),
    }, s);
  }
  function nf(v, d) {
    if (v == null || !isFinite(v)) return '—';
    d = d == null ? 1 : d;
    return (Math.round(v * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d).replace(/\.0+$/, '');
  }
  function clip(s, n) { return s.length > n ? s.slice(0, n - 1) + '…' : s; }
  function rgb(c, f) {
    f = f == null ? 1 : f;
    return 'rgb(' + c.map(function (v) {
      return Math.max(0, Math.min(255, Math.round(v * f)));
    }).join(',') + ')';
  }
  function mix(a, b, t) {
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  }
  function ramp(t) {
    t = Math.max(0, Math.min(1, t));
    return t < 0.5 ? mix(SKY, TEAL, t / 0.5) : mix(TEAL, NAVY, (t - 0.5) / 0.5);
  }
  function pts(a) {
    return a.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ');
  }
  var val = function (d, n, y) { return (d.byYear[y] || {})[n]; };

  // ============================================================
  // Materials. One set of shared gradients does the lighting for every solid, so a block
  // gets a lit top, a graded front and a shaded side from its base colour alone — no
  // per-colour gradient definitions, and every chart is lit from the same direction.
  // ============================================================
  function materials(uid) {
    var d = el('defs', {});
    function lg(id, x1, y1, x2, y2, stops) {
      var g = el('linearGradient', { id: id, x1: x1, y1: y1, x2: x2, y2: y2 });
      stops.forEach(function (s) {
        g.appendChild(el('stop', { offset: s[0], 'stop-color': s[1], 'stop-opacity': s[2] }));
      });
      d.appendChild(g);
    }
    lg('sheen' + uid, '0', '0', '0', '1', [['0', '#fff', '.40'], ['1', '#fff', '0']]);
    lg('shade' + uid, '0', '0', '0', '1', [['0', '#000', '0'], ['1', '#000', '.26']]);
    lg('floor' + uid, '0', '0', '0', '1', [['0', '#FFFFFF', '1'], ['1', '#E7EDF7', '1']]);
    var f = el('filter', { id: 'soft' + uid, x: '-40%', y: '-40%', width: '180%', height: '180%' });
    f.appendChild(el('feGaussianBlur', { stdDeviation: '5' }));
    d.appendChild(f);
    return d;
  }

  function scene(c, h) {
    c.innerHTML = '';
    c.style.position = 'relative';
    var cw = Math.round(c.clientWidth || c.getBoundingClientRect().width || 480);
    // the charts keep fixed gutters for their labels; on a phone that leaves too little room to
    // draw, and the labels pile up. There they are drawn at a readable width and the panel
    // scrolls sideways instead of shrinking the words
    var w = Math.max(cw < 600 ? 620 : 300, cw);
    c.classList.toggle('is-wide', w > cw + 4);
    if (!h) h = Math.round(Math.max(330, Math.min(560, w * 0.47)));
    var uid = ++UID;
    var svg = el('svg', {
      viewBox: '0 0 ' + w + ' ' + h, class: 'lsc-chart',
      preserveAspectRatio: 'xMidYMid meet', role: 'img',
    });
    svg.appendChild(materials(uid));
    if (w > cw + 4) svg.style.width = w + 'px';
    c.appendChild(svg);
    var tip = document.createElement('div');
    tip.className = 'lsc-tip';
    tip.hidden = true;
    c.appendChild(tip);
    return { svg: svg, w: w, h: h, uid: uid, tip: tip, host: c, i: 0 };
  }
  function note(c, m) { c.innerHTML = '<p class="lsc-c-empty">' + m + '</p>'; }

  // ---------- the tilted floor, with a grid and a soft edge ----------
  function cam(ox, oy, D) {
    return function (u, v, z) {
      return [ox + u + (D - v) * SKEW, oy + v * TILT - (z || 0)];
    };
  }
  function stage(g, P, W, D, o) {
    o = o || {};
    var corners = [P(0, 0, 0), P(W, 0, 0), P(W, D, 0), P(0, D, 0)];
    var grp = el('g', { class: 'lsc-c-floor' });
    grp.appendChild(el('polygon', {
      points: pts(corners), fill: 'url(#floor' + g.uid + ')',
      stroke: '#CFDAEC', 'stroke-width': 1,
    }));
    var i, n = o.cols == null ? 5 : o.cols, m = o.rows == null ? 3 : o.rows;
    for (i = 1; i < n; i++) {
      grp.appendChild(el('line', {
        x1: P((W / n) * i, 0, 0)[0], y1: P((W / n) * i, 0, 0)[1],
        x2: P((W / n) * i, D, 0)[0], y2: P((W / n) * i, D, 0)[1],
        stroke: '#DFE7F4', 'stroke-width': 1,
      }));
    }
    for (i = 1; i < m; i++) {
      grp.appendChild(el('line', {
        x1: P(0, (D / m) * i, 0)[0], y1: P(0, (D / m) * i, 0)[1],
        x2: P(W, (D / m) * i, 0)[0], y2: P(W, (D / m) * i, 0)[1],
        stroke: '#DFE7F4', 'stroke-width': 1,
      }));
    }
    g.svg.appendChild(grp);
  }

  // ---------- a solid standing on the floor ----------
  function box(g, P, u, v, w, dd, z, col, o) {
    o = o || {};
    var grp = el('g', {});
    var A = P(u, v, z), B = P(u + w, v, z), C = P(u + w, v + dd, z), Dp = P(u, v + dd, z);
    var c0 = P(u, v + dd, 0), c1 = P(u + w, v + dd, 0), c2 = P(u + w, v, 0), c3 = P(u, v, 0);

    // the shadow it drops on the floor, offset toward the light's opposite
    grp.appendChild(el('polygon', {
      points: pts([c3, c2, c1, c0]), fill: '#20375E', 'fill-opacity': .26,
      filter: 'url(#soft' + g.uid + ')', transform: 'translate(3 4)', class: 'lsc-c-shadow',
    }));
    var front = pts([Dp, C, c1, c0]), right = pts([C, B, c2, c1]), top = pts([A, B, C, Dp]);
    grp.appendChild(el('polygon', { points: front, fill: rgb(col, 0.86) }));
    grp.appendChild(el('polygon', { points: front, fill: 'url(#shade' + g.uid + ')' }));
    grp.appendChild(el('polygon', { points: right, fill: rgb(col, 0.60) }));
    grp.appendChild(el('polygon', { points: right, fill: 'url(#shade' + g.uid + ')' }));
    grp.appendChild(el('polygon', { points: top, fill: rgb(col, 1.14) }));
    grp.appendChild(el('polygon', { points: top, fill: 'url(#sheen' + g.uid + ')' }));
    // the lit rim along the leading edge of the top face
    grp.appendChild(el('polyline', {
      points: pts([A, Dp, C]), fill: 'none', stroke: '#fff', 'stroke-opacity': .55,
      'stroke-width': o.rim == null ? 1.1 : o.rim,
    }));
    if (o.grow !== false) rise(grp, c0[0], c0[1], g.i++);
    return grp;
  }

  // ---------- a marker floating above the floor ----------
  function pin(g, P, u, v, z, r, col, on) {
    var grp = el('g', {});
    var base = P(u, v, 0), top = P(u, v, z);
    grp.appendChild(el('ellipse', {
      cx: base[0] + 2, cy: base[1] + 2, rx: r * 1.05, ry: r * 1.05 * TILT,
      fill: '#20375E', 'fill-opacity': .22, filter: 'url(#soft' + g.uid + ')',
    }));
    if (z > 1) {
      grp.appendChild(el('line', {
        x1: base[0], y1: base[1], x2: top[0], y2: top[1],
        stroke: rgb(col, 0.72), 'stroke-width': 1.4, 'stroke-opacity': .85,
      }));
    }
    grp.appendChild(el('circle', {
      cx: top[0], cy: top[1], r: r, fill: rgb(col, on ? 1.05 : 0.98),
      stroke: '#fff', 'stroke-width': on ? 2.2 : 1.4,
    }));
    grp.appendChild(el('circle', {
      cx: top[0] - r * 0.3, cy: top[1] - r * 0.34, r: r * 0.36,
      fill: '#fff', 'fill-opacity': .34,
    }));
    rise(grp, base[0], base[1], g.i++);
    return grp;
  }

  function ribbon(g, P, path, thick, col, o) {
    o = o || {};
    var grp = el('g', {});
    var top = path.map(function (p) { return P(p[0], p[1], p[2] || 0); });
    var bot = path.map(function (p) { return P(p[0], p[1], (p[2] || 0) - thick); });
    grp.appendChild(el('polygon', {
      points: pts(top.concat(bot.slice().reverse())), fill: rgb(col, 0.66),
    }));
    grp.appendChild(el('polyline', {
      points: pts(top), fill: 'none', stroke: rgb(col, o.on ? 1.2 : 1.02),
      'stroke-width': o.sw || 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round',
    }));
    return grp;
  }

  // ---------- entrance ----------
  // Solids grow out of the floor about the point where they meet it. A CSS transform on the
  // group is used rather than re-pointing the polygons, so the browser can do it on the
  // compositor and a slow phone is not asked to recompute geometry sixty times a second.
  // The entrance holds the mark hidden through its stagger delay, which means a context that
  // never runs CSS animations — a background tab, an embedded preview — would leave the chart
  // blank for ever. So the class is also taken off on a timer: if the animation ran, removing
  // it changes nothing; if it never ran, the mark simply appears. The resting state is always
  // the finished one.
  function settle(grp, cls, delay) {
    grp.style.animationDelay = delay + 'ms';
    if (grp.classList && grp.classList.add) grp.classList.add(cls);
    else grp.setAttribute('class', ((grp.getAttribute('class') || '') + ' ' + cls).trim());
    setTimeout(function () {
      if (grp.classList && grp.classList.remove) grp.classList.remove(cls);
    }, delay + 900);
  }
  function rise(grp, ox, oy, i) {
    grp.style.transformOrigin = ox.toFixed(1) + 'px ' + oy.toFixed(1) + 'px';
    settle(grp, 'lsc-c-rise', Math.min(i * 26, 620));
  }
  function fade(grp, i) {
    settle(grp, 'lsc-c-fade', Math.min(i * 26, 620));
  }

  // ---------- interaction ----------
  // Every mark is a focusable button that dims its neighbours, raises a card by the pointer,
  // and hands its county back to the page when clicked.
  function mark(g, node, d, name, html) {
    node.setAttribute('class', ((node.getAttribute('class') || '') + ' lsc-c-pt'
      + (name && name === d.focus ? ' is-on' : '')).trim());
    node.setAttribute('tabindex', '0');
    node.setAttribute('role', 'button');
    node.setAttribute('aria-label', String(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
    var box = null;
    function show(e) {
      g.svg.classList.add('is-hovering');
      node.classList.add('is-hot');
      g.tip.innerHTML = html;
      g.tip.hidden = false;
      if (e) place(e);
    }
    function place(e) {
      box = box || g.host.getBoundingClientRect();
      var x = e.clientX - box.left, y = e.clientY - box.top;
      var tw = g.tip.offsetWidth || 170, th = g.tip.offsetHeight || 56;
      g.tip.style.left = Math.max(4, Math.min(box.width - tw - 4, x + 14)) + 'px';
      g.tip.style.top = Math.max(4, y - th - 12) + 'px';
    }
    function hide() {
      g.svg.classList.remove('is-hovering');
      node.classList.remove('is-hot');
      g.tip.hidden = true;
      box = null;
    }
    node.addEventListener('pointerenter', show);
    node.addEventListener('pointermove', place);
    node.addEventListener('pointerleave', hide);
    node.addEventListener('focus', function () { show(); });
    node.addEventListener('blur', hide);
    if (name && d.onPick) {
      node.addEventListener('click', function () { d.onPick(name); });
      node.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); d.onPick(name); }
      });
    }
    g.svg.appendChild(node);
  }
  function card(title, rows) {
    return '<b>' + title + '</b>' + rows.map(function (r) {
      return '<span><i>' + r[0] + '</i><em>' + r[1] + '</em></span>';
    }).join('');
  }
  function heading(g, s, col) {
    g.svg.appendChild(tx(16, 22, s, { size: 11, weight: 700, fill: col || FAINT, ls: '.04em' }));
  }

  // ============================================================
  // 01 · Motion scatter. The second indicator runs along the floor, this one is the height
  // of each county's post, population sets the size of its head. Height rather than depth
  // carries the measure because in a tilted scene a height difference is read accurately
  // and a depth difference is not. The ghost post is where that county stood in year one.
  // ============================================================
  function motion(c, d) {
    if (!d.x) { note(c, 'Choose a second indicator to plot against.'); return; }
    var xs = [], ys = [];
    d.names.forEach(function (n) {
      d.years.forEach(function (y) {
        var a = (d.x.byYear[y] || {})[n], b = val(d, n, y);
        if (a != null) xs.push(a);
        if (b != null) ys.push(b);
      });
    });
    if (!xs.length || !ys.length) { note(c, 'No overlapping values for these two indicators.'); return; }
    var g = scene(c);
    var D = Math.round(g.h * 0.30), W = g.w - 200 - D * SKEW;
    var ZMAX = g.h * 0.56, P = cam(80, Math.round(g.h - 62 - D * TILT), D);
    var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs);
    var y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
    if (x1 === x0) x1 = x0 + 1;
    if (y1 === y0) y1 = y0 + 1;
    var LOG = x0 > 0 && (x1 / x0) > 4;
    var lg = function (q) { return LOG ? Math.log(Math.max(q, x0)) / Math.LN10 : q; };
    var l0 = lg(x0), l1 = lg(x1);
    var U = function (q) { return ((lg(q) - l0) / (l1 - l0)) * W; };
    var zb = Math.min(0, y0);
    var Z = function (q) { return ((q - zb) / (y1 - zb)) * ZMAX; };
    var pmax = Math.max.apply(null, d.names.map(function (n) { return d.pop[n] || 0; })) || 1;
    stage(g, P, W, D, { cols: 5, rows: 2 });
    var i, zz;
    for (i = 1; i <= 3; i++) {
      zz = (ZMAX / 3) * i;
      g.svg.appendChild(el('line', {
        x1: P(0, D, zz)[0], y1: P(0, D, zz)[1], x2: P(W, D, zz)[0], y2: P(W, D, zz)[1],
        stroke: LINE, 'stroke-dasharray': '3 5',
      }));
      g.svg.appendChild(tx(P(0, D, zz)[0] - 8, P(0, D, zz)[1] + 4,
        nf(zb + ((y1 - zb) / 3) * i, 0), { size: 10, fill: FAINT, anchor: 'end', num: true }));
    }
    var first = d.years[0];
    var spread = d.names.slice().sort(function (a, b) {
      return ((d.x.byYear[d.year] || {})[a] || 0) - ((d.x.byYear[d.year] || {})[b] || 0);
    });
    var depthOf = function (n) {
      return 6 + (spread.indexOf(n) / Math.max(spread.length - 1, 1)) * (D - 12);
    };
    var ghosts = el('g', { class: 'lsc-c-ghost' });
    d.names.forEach(function (n) {
      var ax = (d.x.byYear[first] || {})[n], ay = val(d, n, first);
      if (ax == null || ay == null) return;
      var a0 = P(U(ax), depthOf(n), 0), a1 = P(U(ax), depthOf(n), Z(ay));
      ghosts.appendChild(el('line', {
        x1: a0[0], y1: a0[1], x2: a1[0], y2: a1[1], stroke: rgb(CLAY),
        'stroke-width': 1.6, 'stroke-opacity': .5, 'stroke-dasharray': '3 3',
      }));
      ghosts.appendChild(el('circle', { cx: a1[0], cy: a1[1], r: 2.8, fill: rgb(CLAY), 'fill-opacity': .7 }));
      var bx = (d.x.byYear[d.year] || {})[n], by = val(d, n, d.year);
      if (bx == null || by == null) return;
      var b1 = P(U(bx), depthOf(n), Z(by));
      ghosts.appendChild(el('line', {
        x1: a1[0], y1: a1[1], x2: b1[0], y2: b1[1], stroke: rgb(CLAY),
        'stroke-width': 1.1, 'stroke-opacity': .45, 'stroke-dasharray': '2 3',
      }));
    });
    fade(ghosts, 0);
    g.svg.appendChild(ghosts);
    d.names.slice().sort(function (a, b) { return depthOf(a) - depthOf(b); }).forEach(function (n) {
      var px = (d.x.byYear[d.year] || {})[n], py = val(d, n, d.year);
      if (px == null || py == null) return;
      var on = n === d.focus;
      var r = 5 + Math.sqrt((d.pop[n] || 0) / pmax) * 8;
      var node = pin(g, P, U(px), depthOf(n), Z(py), r, on ? GOLD : TEAL, on);
      mark(g, node, d, n, card(n, [
        [clip(d.label, 22), nf(py) + ' ' + (d.unit || '')],
        [clip(d.x.label, 22), nf(px) + ' ' + (d.x.unit || '')],
        ['Population', (d.pop[n] || 0).toLocaleString()],
      ]));
    });
    g.svg.appendChild(tx(P(W / 2, D, 0)[0], P(0, D, 0)[1] + 28,
      clip(d.x.label, 46) + (LOG ? '  (log scale)' : '') + '   →',
      { size: 10.5, weight: 600, fill: MUTED, anchor: 'middle' }));
    heading(g, 'height = ' + clip(d.label, 26) + '   ·   head = population   ·   ghost = ' + first);
  }

  // ============================================================
  // 02 · Rank trajectories. Ranks run back into the scene; each county is one ribbon.
  // ============================================================
  function bump(c, d) {
    var rank = function (y) {
      return d.names.filter(function (n) { return val(d, n, y) != null; })
        .sort(function (a, b) { return val(d, b, y) - val(d, a, y); });
    };
    var first = rank(d.years[0]), last = rank(d.years[d.years.length - 1]);
    if (!first.length) { note(c, 'No ranking available.'); return; }
    var g = scene(c);
    var D = Math.round(g.h * 0.86), W = g.w - 240 - D * SKEW;
    var P = cam(136, Math.round((g.h - D * TILT) / 2), D);
    var rowD = D / Math.max(first.length - 1, 1);
    var U = function (i) { return (i / Math.max(d.years.length - 1, 1)) * W; };
    stage(g, P, W, D, { cols: d.years.length - 1, rows: 4 });
    d.years.forEach(function (y, i) {
      if (i === 0 || i === d.years.length - 1) {
        var a = P(U(i), D, 0);
        g.svg.appendChild(tx(a[0], a[1] + 18, String(y),
          { size: 10, fill: FAINT, anchor: i ? 'end' : 'start', num: true }));
      }
    });
    d.names.slice().sort(function (a, b) { return first.indexOf(a) - first.indexOf(b); })
      .forEach(function (n) {
        var path = [];
        d.years.forEach(function (y, i) {
          var r = rank(y).indexOf(n);
          if (r >= 0) path.push([U(i), r * rowD, 0]);
        });
        if (path.length < 2) return;
        var r0 = first.indexOf(n), r1 = last.indexOf(n);
        var moved = r1 !== r0, up = r1 < r0, on = n === d.focus;
        var col = on ? GOLD : (moved ? (up ? TEAL : [184, 83, 106]) : CLAY);
        var node = ribbon(g, P, path, on ? 7 : (moved ? 5 : 3.5), col, { sw: on ? 2.8 : 2, on: on });
        fade(node, g.i++);
        mark(g, node, d, n, card(n, [
          ['Rank ' + d.years[0], '#' + (r0 + 1)],
          ['Rank ' + d.year, '#' + (r1 + 1)],
          ['Now', nf(val(d, n, d.year)) + ' ' + (d.unit || '')],
        ]));
      });
    first.forEach(function (n, i) {
      var a = P(0, i * rowD, 0);
      g.svg.appendChild(tx(a[0] - 9, a[1] + 3.5, clip(n, 14), {
        size: 9.4, weight: n === d.focus ? 800 : 600,
        fill: n === d.focus ? rgb(GOLD) : INK, anchor: 'end',
      }));
    });
    last.forEach(function (n, i) {
      var r0 = first.indexOf(n), moved = i !== r0, up = i < r0;
      if (!moved) return;
      var a = P(W, i * rowD, 0);
      g.svg.appendChild(tx(a[0] + 9, a[1] + 3.5, (up ? '▲' : '▼') + Math.abs(i - r0),
        { size: 9.4, weight: 700, fill: up ? rgb(TEAL) : 'rgb(184,83,106)' }));
    });
    heading(g, 'rank 1 at the front · blue rose, red slipped');
  }

  // ============================================================
  // 03 · Population cartogram. Footprint is the county's population, height is the
  // indicator — so a tall narrow block is a small county doing well.
  // ============================================================
  function cartogram(c, d) {
    var vals = d.names.map(function (n) { return val(d, n, d.year); })
      .filter(function (q) { return q != null; });
    if (!vals.length) { note(c, 'No values for ' + d.year + '.'); return; }
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
    var pmax = Math.max.apply(null, d.names.map(function (n) { return d.pop[n] || 0; })) || 1;
    // tallest first, so the tall blocks sit at the back and nothing hides behind a tower
    var order = d.names.slice().sort(function (a, b) {
      var qa = val(d, a, d.year), qb = val(d, b, d.year);
      return (qb == null ? -Infinity : qb) - (qa == null ? -Infinity : qa);
    });
    var g = scene(c);
    var D = Math.round(g.h * 0.80), W = Math.min(g.w - 150 - D * SKEW, 545);
    var ZMAX = g.h * 0.34, P = cam(60, Math.round(g.h - 74 - D * TILT), D);
    stage(g, P, W, D, { cols: 6, rows: 3 });
    var maxSide = 96, u = 6, vd = 6, rowMax = 0, placed = [];
    order.forEach(function (n) {
      var side = 32 + Math.sqrt((d.pop[n] || 0) / pmax) * (maxSide - 32);
      if (u + side > W - 6) { u = 6; vd += rowMax + 22; rowMax = 0; }
      placed.push({ n: n, u: u, v: vd, side: side });
      rowMax = Math.max(rowMax, side);
      u += side + 18;
    });
    var labels = [];
    placed.slice().sort(function (a, b) { return a.v - b.v; }).forEach(function (b0) {
      var q = val(d, b0.n, d.year);
      var t = (hi === lo) ? .5 : ((q == null ? lo : q) - lo) / (hi - lo);
      var on = b0.n === d.focus;
      var z = 14 + t * ZMAX;
      var node = box(g, P, b0.u, b0.v, b0.side, b0.side, z, on ? GOLD : ramp(t));
      var top = P(b0.u + b0.side / 2, b0.v + b0.side / 2, z);
      if (b0.side > 30) {
        node.appendChild(tx(top[0], top[1] + 3, nf(q, 0),
          { size: 9.6, weight: 700, fill: '#fff', anchor: 'middle', num: true }));
      }
      // the name floats just above its own block. Below the block it would land on whatever
      // stands in front of it, which is what it used to do.
      labels.push(tx(top[0], top[1] - (b0.side > 30 ? 14 : 10), clip(b0.n, 10), {
        size: 8.4, weight: on ? 800 : 600, fill: on ? rgb(GOLD) : MUTED, anchor: 'middle',
      }));
      mark(g, node, d, b0.n, card(b0.n, [
        [clip(d.label, 22), nf(q) + ' ' + (d.unit || '')],
        ['Population', (d.pop[b0.n] || 0).toLocaleString()],
        ['Share of country', nf((d.pop[b0.n] || 0) / Object.keys(d.pop).reduce(function (a, k) {
          return a + (d.pop[k] || 0);
        }, 0) * 100) + '%'],
      ]));
    });
    // labels last, or a block drawn later buries the label of one drawn earlier
    labels.forEach(function (l) { g.svg.appendChild(l); });
    heading(g, 'footprint = population   ·   height = ' + clip(d.label, 30));
  }

  // ============================================================
  // 04 · Gap to the leader. Slabs running back into the scene, the leader at the front.
  // ============================================================
  function gap(c, d) {
    var rows = d.names.map(function (n) { return { n: n, v: val(d, n, d.year) }; })
      .filter(function (r) { return r.v != null; }).sort(function (a, b) { return b.v - a.v; });
    if (!rows.length) { note(c, 'No values for ' + d.year + '.'); return; }
    var lead = rows[0].v || 1;
    var g = scene(c);
    var D = Math.round(g.h * 0.92), W = g.w - 250 - D * SKEW;
    var P = cam(140, Math.round((g.h - D * TILT) / 2) - 4, D);
    var rowD = D / rows.length, th = rowD * 0.6;
    stage(g, P, W, D, { cols: 5, rows: rows.length });
    rows.slice().reverse().forEach(function (r) {
      var i = rows.indexOf(r), vd = i * rowD;
      var on = r.n === d.focus;
      var node = box(g, P, 0, vd, Math.max(4, (r.v / lead) * W), th, 15, on ? GOLD : ramp(r.v / lead));
      var lb = P(0, vd + th / 2, 0);
      node.appendChild(tx(lb[0] - 11, lb[1] + 3, clip(r.n, 13), {
        size: 9.2, weight: on ? 800 : 600, fill: on ? rgb(GOLD) : INK, anchor: 'end',
      }));
      var rb = P(W, vd + th / 2, 0);
      node.appendChild(tx(rb[0] + 11, rb[1] + 3, i === 0 ? 'leader' : '−' + nf(lead - r.v), {
        size: 9.2, weight: 700, fill: i === 0 ? rgb(TEAL) : MUTED, num: i !== 0,
      }));
      mark(g, node, d, r.n, card(r.n, [
        [clip(d.label, 22), nf(r.v) + ' ' + (d.unit || '')],
        ['Rank', '#' + (i + 1) + ' of ' + rows.length],
        [i === 0 ? 'Status' : 'Behind ' + clip(rows[0].n, 12),
          i === 0 ? 'the leader' : nf(lead - r.v) + ' ' + (d.unit || '')],
      ]));
    });
    var nat = d.natByYear[d.year];
    if (nat != null && d.natIsLevel && nat <= lead) {
      var a = P((nat / lead) * W, 0, 0), b = P((nat / lead) * W, D, 30);
      g.svg.appendChild(el('line', {
        x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: rgb(GOLD),
        'stroke-width': 1.8, 'stroke-dasharray': '5 4',
      }));
      g.svg.appendChild(tx(b[0], b[1] + 15, 'national ' + nf(nat),
        { size: 9.6, weight: 700, fill: rgb(GOLD), anchor: 'middle', num: true }));
    }
    heading(g, 'length = value   ·   the leader sets the scale');
  }

  // ============================================================
  // 05 · Readiness board. One slab per domain: the full length is what is defined, the gold
  // section is how much of it is still carrying demonstration figures.
  // ============================================================
  function readiness(c, d) {
    var doms = (d.domains || []).slice().sort(function (a, b) { return b.n - a.n; });
    if (!doms.length) { note(c, 'Catalogue summary unavailable.'); return; }
    var g = scene(c);
    var D = Math.round(g.h * 0.98), W = g.w - 270 - D * SKEW;
    var P = cam(152, Math.round((g.h - D * TILT) / 2) + 10, D);
    var rowD = D / doms.length, th = rowD * 0.5;
    var mx = Math.max.apply(null, doms.map(function (x) { return x.n; })) || 1;
    var tot = 0, mock = 0;
    doms.forEach(function (x) { tot += x.n; mock += x.mock; });
    stage(g, P, W, D, { cols: 5, rows: doms.length });
    doms.slice().reverse().forEach(function (x) {
      var i = doms.indexOf(x), vd = i * rowD;
      var node = box(g, P, 0, vd, (x.n / mx) * W, th, 11, TEAL, { rim: 1.3 });
      if (x.mock) {
        var over = box(g, P, 0, vd, (x.mock / mx) * W, th, 12.5, GOLD, { rim: 1.3, grow: false });
        node.appendChild(over);
      }
      var lb = P(0, vd + th / 2, 0);
      node.appendChild(tx(lb[0] - 11, lb[1] + 3, clip(x.label, 18),
        { size: 8.8, weight: 600, fill: INK, anchor: 'end' }));
      var rb = P((x.n / mx) * W, vd + th / 2, 0);
      node.appendChild(tx(rb[0] + 11, rb[1] + 3, String(x.n),
        { size: 8.8, weight: 700, fill: MUTED, num: true }));
      mark(g, node, d, null, card(x.label, [
        ['Indicators defined', String(x.n)],
        ['Still demonstration', String(x.mock)],
        ['Collected', String(x.n - x.mock)],
      ]));
    });
    var bw = Math.min(266, g.w - 30);
    g.svg.appendChild(el('rect', {
      x: 16, y: g.h - 50, width: bw, height: 38, rx: 8,
      fill: '#FFF3F4', stroke: rgb(GOLD), 'stroke-opacity': .35,
    }));
    g.svg.appendChild(tx(30, g.h - 27, mock + ' / ' + tot,
      { size: 16, weight: 700, fill: rgb(GOLD), num: true }));
    g.svg.appendChild(tx(30, g.h - 16, 'indicators still demonstration data',
      { size: 9.4, weight: 600, fill: MUTED }));
    heading(g, 'blue = defined   ·   gold = still placeholder');
  }

  window.LSC_CHARTS = {
    motion: motion, bump: bump, cartogram: cartogram, gap: gap, readiness: readiness,
  };
})();
