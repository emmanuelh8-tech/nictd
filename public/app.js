// app.js · NICTD client: choropleth map, searchable dropdowns, charts, tables, query builder.
// Zero dependencies. Relies on window.LIBERIA_COUNTIES / window.LIBERIA_VIEWBOX (public/liberia-counties.js).
(function () {
  'use strict';
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var COLORS = { navy: '#0B2C63', teal: '#1C5BB8', gold: '#C8102E', clay: '#7FA0CE', line: 'rgba(11,44,99,.14)', muted: '#5A6A85', green: '#1C5BB8', red: '#B23A3A' };

  function el(name, attrs, text) {
    var e = document.createElementNS(SVG_NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }
  function fmtNum(v) {
    if (v == null || isNaN(v)) return 'n/a';
    var n = Number(v);
    return Math.abs(n) >= 1000 ? n.toLocaleString('en-US', { maximumFractionDigits: 1 }) : String(Math.round(n * 10) / 10);
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
  function qsa(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  // ---------- choropleth scale: light green (low) -> green (mid) -> deep LTA green (high) ----------
  function hexToRgb(h) { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
  function lerp(a, b, t) { return Math.round(a + (b - a) * t); }
  function scaleColor(t) {
    t = Math.max(0, Math.min(1, t));
    var c1 = hexToRgb('#DDE7F7'), c2 = hexToRgb('#4A82C8'), c3 = hexToRgb('#0B2C63');
    var a, b, tt;
    if (t < 0.5) { a = c1; b = c2; tt = t / 0.5; } else { a = c2; b = c3; tt = (t - 0.5) / 0.5; }
    return 'rgb(' + lerp(a[0], b[0], tt) + ',' + lerp(a[1], b[1], tt) + ',' + lerp(a[2], b[2], tt) + ')';
  }

  // ---------- searchable dropdown (.xdd) ----------
  // markup: <div class="xdd" data-name="x"><button class="xdd-trigger">...</button><div class="xdd-panel">...</div></div>
  function initDropdown(root, opts) {
    // opts: { items: [{value,label,group}], placeholder, onChange, selected }
    if (!root) return { setSelected: function () {}, getSelected: function () { return null; } };
    var trigger = qs('.xdd-trigger', root);
    var panel = qs('.xdd-panel', root);
    var labelSpan = qs('.xdd-trigger-label', root);
    var searchInput = qs('.xdd-search input', root);
    var list = qs('.xdd-list', root);
    var current = opts.selected || null;

    function renderList(filter) {
      var f = (filter || '').toLowerCase();
      var groups = {};
      opts.items.forEach(function (it) {
        if (f && it.label.toLowerCase().indexOf(f) === -1) return;
        var g = it.group || '';
        groups[g] = groups[g] || [];
        groups[g].push(it);
      });
      var html = '';
      Object.keys(groups).forEach(function (g) {
        if (g) html += '<div class="xdd-group-label">' + esc(g) + '</div>';
        groups[g].forEach(function (it) {
          html += '<div class="xdd-item' + (it.value === current ? ' selected' : '') + '" data-value="' + esc(it.value) + '">' + esc(it.label) + '</div>';
        });
      });
      list.innerHTML = html || '<div class="xdd-item muted">No matches</div>';
    }
    function setLabel() {
      var found = opts.items.filter(function (it) { return it.value === current; })[0];
      labelSpan.textContent = found ? found.label : opts.placeholder;
    }
    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      qsa('.xdd.open').forEach(function (o) { if (o !== root) o.classList.remove('open'); });
      root.classList.toggle('open');
      if (root.classList.contains('open')) { renderList(''); if (searchInput) { searchInput.value = ''; searchInput.focus(); } }
    });
    if (searchInput) searchInput.addEventListener('input', function () { renderList(searchInput.value); });
    list.addEventListener('click', function (e) {
      var item = e.target.closest('.xdd-item');
      if (!item || item.dataset.value === undefined) return;
      current = item.dataset.value;
      setLabel();
      root.classList.remove('open');
      if (opts.onChange) opts.onChange(current);
    });
    document.addEventListener('click', function () { root.classList.remove('open'); });
    setLabel();
    return {
      setSelected: function (v) { current = v; setLabel(); },
      getSelected: function () { return current; },
      // The Category filter narrows the Indicator list, so its options are not fixed at init.
      setItems: function (items) {
        opts.items = items || [];
        setLabel();
        if (root.classList.contains('open')) renderList(searchInput ? searchInput.value : '');
      },
    };
  }

  // ---------- multi-select searchable dropdown (.xdd, checkbox items, stays open until "Done"/outside click) ----------
  function initMultiDropdown(root, opts) {
    // opts: { items: [{value,label,group}], placeholder, onChange(selectedValuesArray) }
    if (!root) return;
    var trigger = qs('.xdd-trigger', root);
    var panel = qs('.xdd-panel', root);
    var labelSpan = qs('.xdd-trigger-label', root);
    var searchInput = qs('.xdd-search input', root);
    var list = qs('.xdd-list', root);
    var doneBtn = qs('.xdd-done', root);
    var allCheckbox = qs('.xdd-all-check', root);
    var selected = {};

    function renderList(filter) {
      var f = (filter || '').toLowerCase();
      var groups = {};
      opts.items.forEach(function (it) {
        if (f && it.label.toLowerCase().indexOf(f) === -1) return;
        var g = it.group || '';
        groups[g] = groups[g] || [];
        groups[g].push(it);
      });
      var html = '';
      Object.keys(groups).forEach(function (g) {
        if (g) html += '<div class="xdd-group-label">' + esc(g) + '</div>';
        groups[g].forEach(function (it) {
          html += '<label class="xdd-item xdd-ms-item"><input type="checkbox" data-value="' + esc(it.value) + '"' + (selected[it.value] ? ' checked' : '') + '><span>' + esc(it.label) + '</span></label>';
        });
      });
      list.innerHTML = html || '<div class="xdd-item muted">No matches</div>';
    }
    function setLabel() {
      var n = Object.keys(selected).length;
      if (!n) labelSpan.textContent = opts.placeholder;
      else if (opts.items.length && n === opts.items.length) labelSpan.textContent = 'All ' + n + ' selected';
      else labelSpan.textContent = n + ' selected';
    }
    function emitChange() { if (opts.onChange) opts.onChange(Object.keys(selected)); }
    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      qsa('.xdd.open').forEach(function (o) { if (o !== root) o.classList.remove('open'); });
      root.classList.toggle('open');
      if (root.classList.contains('open')) { renderList(''); if (searchInput) { searchInput.value = ''; searchInput.focus(); } }
    });
    if (searchInput) searchInput.addEventListener('input', function () { renderList(searchInput.value); });
    panel.addEventListener('click', function (e) { e.stopPropagation(); });
    list.addEventListener('change', function (e) {
      var cb = e.target;
      if (!cb || cb.type !== 'checkbox') return;
      if (cb.checked) selected[cb.dataset.value] = true; else delete selected[cb.dataset.value];
      setLabel();
      if (allCheckbox) allCheckbox.checked = opts.items.length > 0 && Object.keys(selected).length === opts.items.length;
      emitChange();
    });
    if (allCheckbox) allCheckbox.addEventListener('change', function () {
      selected = {};
      if (allCheckbox.checked) opts.items.forEach(function (it) { selected[it.value] = true; });
      renderList(searchInput ? searchInput.value : '');
      setLabel();
      emitChange();
    });
    if (doneBtn) doneBtn.addEventListener('click', function () { root.classList.remove('open'); });
    document.addEventListener('click', function () { root.classList.remove('open'); });
    setLabel();
    return { getSelected: function () { return Object.keys(selected); } };
  }

  // ---------- choropleth map ----------
  function renderChoropleth(container, valuesByCounty, opts) {
    opts = opts || {};
    container.innerHTML = '';
    if (!window.LIBERIA_COUNTIES) { container.textContent = 'Map data unavailable.'; return; }
    var wrap = document.createElement('div'); wrap.className = 'choropleth-wrap';
    var svg = el('svg', { viewBox: window.LIBERIA_VIEWBOX, role: 'img', 'aria-label': 'Choropleth map of Liberia by county' });
    var vals = Object.keys(valuesByCounty).map(function (k) { return valuesByCounty[k]; }).filter(function (v) { return v != null && !isNaN(v); });
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    var tooltip = document.createElement('div'); tooltip.className = 'map-tooltip';

    window.LIBERIA_COUNTIES.forEach(function (c) {
      var v = valuesByCounty[c.name];
      var t = (max > min) ? (v - min) / (max - min) : 0.5;
      var fill = v == null ? '#D8DEE2' : scaleColor(t);
      var cls = '';
      if (opts.focusCounty === c.name) cls += ' focus-county';
      if (opts.compareCounty === c.name) cls += ' compare-county';
      var path = el('path', { d: c.d, fill: fill, class: cls.trim() });
      path.addEventListener('mousemove', function (e) {
        var r = wrap.getBoundingClientRect();
        tooltip.style.display = 'block';
        tooltip.style.left = (e.clientX - r.left) + 'px';
        tooltip.style.top = (e.clientY - r.top) + 'px';
        tooltip.innerHTML = '<strong>' + esc(c.name) + '</strong>' + (v == null ? 'No data' : fmtNum(v) + (opts.unit ? ' ' + esc(opts.unit) : ''));
      });
      path.addEventListener('mouseleave', function () { tooltip.style.display = 'none'; });
      path.addEventListener('click', function () { if (opts.onClick) opts.onClick(c.name); });
      svg.appendChild(path);
    });
    wrap.appendChild(svg);
    wrap.appendChild(tooltip);
    container.appendChild(wrap);
  }

  // ---------- line chart (with optional comparison series + year range) ----------
  function lineChart(container, series, opts) {
    opts = opts || {};
    container.innerHTML = '';
    if (!series || !series.length) { container.textContent = 'No data.'; return; }
    var W = 640, H = 300, m = { t: 20, r: 20, b: 30, l: 50 };
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img' });
    var allSeries = [series].concat(opts.compareSeries ? [opts.compareSeries] : []);
    var xs = series.map(function (d) { return d.year; });
    var allYs = allSeries.reduce(function (acc, s) { return acc.concat(s.map(function (d) { return d.value; })); }, []);
    var xMin = Math.min.apply(null, xs), xMax = Math.max.apply(null, xs);
    var yMax = Math.max.apply(null, allYs) * 1.12 || 1;
    var X = function (x) { return m.l + (x - xMin) / (xMax - xMin || 1) * (W - m.l - m.r); };
    var Y = function (y) { return H - m.b - (y / yMax) * (H - m.t - m.b); };

    for (var g = 0; g <= 4; g++) {
      var yv = yMax * g / 4;
      svg.appendChild(el('line', { x1: m.l, y1: Y(yv), x2: W - m.r, y2: Y(yv), stroke: COLORS.line, 'stroke-width': g === 0 ? 1.4 : 0.7 }));
      svg.appendChild(el('text', { x: m.l - 8, y: Y(yv) + 4, 'text-anchor': 'end', 'font-size': 10.5, fill: COLORS.muted, 'font-family': 'var(--sans), sans-serif' }, fmtNum(yv)));
    }
    var step = xs.length > 10 ? Math.ceil(xs.length / 7) : 1;
    xs.forEach(function (x, i) {
      if (i % step !== 0 && i !== xs.length - 1) return;
      var label = series[i].label != null ? series[i].label : String(x);
      svg.appendChild(el('text', { x: X(x), y: H - m.b + 16, 'text-anchor': 'middle', 'font-size': 10.5, fill: COLORS.muted, 'font-family': 'var(--sans), sans-serif' }, label));
    });

    function drawSeries(s, color, dashed) {
      var d = '';
      s.forEach(function (pt, i) { d += (i ? ' L' : 'M') + X(pt.year) + ',' + Y(pt.value); });
      var attrs = { d: d, fill: 'none', stroke: color, 'stroke-width': 2.4, 'stroke-linejoin': 'round' };
      if (dashed) attrs['stroke-dasharray'] = '5 3';
      svg.appendChild(el('path', attrs));
      s.forEach(function (pt, i) {
        svg.appendChild(el('circle', { cx: X(pt.year), cy: Y(pt.value), r: i === s.length - 1 ? 4 : 2.4, fill: color }));
      });
      var last = s[s.length - 1];
      svg.appendChild(el('text', { x: X(last.year) - 6, y: Y(last.value) - 9, 'text-anchor': 'end', 'font-size': 11.5, 'font-weight': 700, fill: color, 'font-family': 'var(--sans), sans-serif' }, fmtNum(last.value)));
    }
    drawSeries(series, COLORS.teal, false);
    if (opts.compareSeries) drawSeries(opts.compareSeries, COLORS.clay, true);
    container.appendChild(svg);
  }

  function barChart(container, rows, opts) {
    opts = opts || {};
    container.innerHTML = '';
    if (!rows || !rows.length) { container.textContent = 'No data.'; return; }
    var labelKey = opts.labelKey || 'county', valKey = opts.valKey || 'value';
    var W = 560, rowH = 24, m = { t: 6, r: 52, b: 6, l: 132 };
    var H = m.t + m.b + rows.length * rowH;
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img' });
    var max = Math.max.apply(null, rows.map(function (r) { return r[valKey]; })) || 1;
    rows.forEach(function (r, i) {
      var y = m.t + i * rowH;
      var w = (r[valKey] / max) * (W - m.l - m.r);
      var color = opts.color || (opts.low ? COLORS.clay : COLORS.teal);
      if (opts.colorFor) color = opts.colorFor(r, i);
      if (opts.highlightTop && i === 0) color = COLORS.gold;
      svg.appendChild(el('text', { x: m.l - 8, y: y + rowH / 2 + 4, 'text-anchor': 'end', 'font-size': 11, fill: COLORS.navy }, String(r[labelKey]).slice(0, 20)));
      svg.appendChild(el('rect', { x: m.l, y: y + 4, width: Math.max(w, 1.5), height: rowH - 9, fill: color, rx: 3 }));
      svg.appendChild(el('text', { x: m.l + Math.max(w, 1.5) + 6, y: y + rowH / 2 + 4, 'font-size': 10.5, fill: COLORS.muted, 'font-family': 'var(--sans), sans-serif' }, fmtNum(r[valKey])));
    });
    container.appendChild(svg);
  }

  // ---------- sortable data table ----------
  function initSortableTable(table) {
    var tbody = qs('tbody', table);
    qsa('th.sortable', table).forEach(function (th, colIdx) {
      th.addEventListener('click', function () {
        var asc = th.dataset.dir !== 'asc';
        qsa('th.sortable', table).forEach(function (t) { delete t.dataset.dir; t.querySelector('.sort-arrow') && (t.querySelector('.sort-arrow').textContent = ''); });
        th.dataset.dir = asc ? 'asc' : 'desc';
        var arrow = th.querySelector('.sort-arrow'); if (arrow) arrow.textContent = asc ? '▲' : '▼';
        var idx = qsa('th', table).indexOf(th);
        var rows = qsa('tr', tbody);
        rows.sort(function (a, b) {
          var av = a.children[idx].dataset.sort != null ? Number(a.children[idx].dataset.sort) : a.children[idx].textContent.trim();
          var bv = b.children[idx].dataset.sort != null ? Number(b.children[idx].dataset.sort) : b.children[idx].textContent.trim();
          if (typeof av === 'number' && typeof bv === 'number') return asc ? av - bv : bv - av;
          return asc ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
        });
        rows.forEach(function (r) { tbody.appendChild(r); });
      });
    });
  }

  // ---------- PNG export of an inline <svg> ----------
  function exportSvgToPng(svgEl, filename) {
    var xml = new XMLSerializer().serializeToString(svgEl);
    var svgBlob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
    var url = URL.createObjectURL(svgBlob);
    var img = new Image();
    img.onload = function () {
      var vb = svgEl.viewBox.baseVal;
      var scale = 2;
      var canvas = document.createElement('canvas');
      canvas.width = (vb.width || svgEl.clientWidth) * scale;
      canvas.height = (vb.height || svgEl.clientHeight) * scale;
      var ctx = canvas.getContext('2d');
      ctx.fillStyle = '#F5F7FB'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob(function (blob) {
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = filename || 'nictd-export.png';
        document.body.appendChild(a); a.click(); a.remove();
      });
    };
    img.src = url;
  }

  function toast(msg) {
    var t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#0B2C63;color:#fff;padding:.6rem 1.1rem;border-radius:8px;font-size:.85rem;z-index:999;box-shadow:0 6px 18px rgba(0,0,0,.2)';
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2200);
  }
  function copyText(text) {
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { toast('Copied to clipboard'); });
    else toast(text);
  }

  // ---------- generic UI: accordions ----------
  function initAccordions(selector, headSel) {
    qsa(selector).forEach(function (item) {
      qs(headSel, item).addEventListener('click', function () {
        var wasOpen = item.classList.contains('open');
        if (item.closest('.indicator-tree')) {
          // tree categories can be open independently; FAQ closes siblings
        }
        item.classList.toggle('open', !wasOpen);
      });
    });
  }

  // ============================================================
  // PAGE: Data Explorer
  // ============================================================
  // ---------- extra explorer visuals ----------
  // Vertical columns. Handles negative values (used for year-on-year growth), so the
  // baseline sits wherever zero falls rather than always at the bottom.
  function columnChart(container, rows, opts) {
    opts = opts || {};
    container.innerHTML = '';
    if (!rows || !rows.length) { container.textContent = 'No data.'; return; }
    var labelKey = opts.labelKey || 'label', valKey = opts.valKey || 'value';
    var W = 620, H = 260, m = { t: 22, r: 10, b: opts.rotate ? 62 : 30, l: 44 };
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img' });
    var vals = rows.map(function (r) { return Number(r[valKey]) || 0; });
    var vMax = Math.max.apply(null, vals), vMin = Math.min.apply(null, vals);
    var hi = Math.max(vMax, 0) * 1.15 || 1, lo = Math.min(vMin, 0) * 1.15;
    var span = hi - lo || 1;
    var Y = function (v) { return H - m.b - ((v - lo) / span) * (H - m.t - m.b); };
    var zeroY = Y(0);

    for (var g = 0; g <= 3; g++) {
      var yv = lo + (span * g / 3);
      svg.appendChild(el('line', { x1: m.l, y1: Y(yv), x2: W - m.r, y2: Y(yv), stroke: COLORS.line, 'stroke-width': 0.7 }));
      svg.appendChild(el('text', { x: m.l - 7, y: Y(yv) + 4, 'text-anchor': 'end', 'font-size': 10,
        fill: COLORS.muted, 'font-family': 'var(--num), monospace' }, fmtNum(yv)));
    }
    if (lo < 0) svg.appendChild(el('line', { x1: m.l, y1: zeroY, x2: W - m.r, y2: zeroY, stroke: COLORS.muted, 'stroke-width': 1.1 }));

    var slot = (W - m.l - m.r) / rows.length;
    var bw = Math.max(4, Math.min(34, slot * 0.62));
    rows.forEach(function (r, i) {
      var v = Number(r[valKey]) || 0;
      var x = m.l + slot * i + (slot - bw) / 2;
      var y = v >= 0 ? Y(v) : zeroY;
      var h = Math.max(1.5, Math.abs(Y(v) - zeroY));
      var color = opts.colorFor ? opts.colorFor(v, i) : (v < 0 ? COLORS.gold : COLORS.teal);
      svg.appendChild(el('rect', { x: x, y: y, width: bw, height: h, fill: color, rx: 3 }));
      if (opts.showValues !== false) {
        svg.appendChild(el('text', { x: x + bw / 2, y: (v >= 0 ? y - 6 : y + h + 12), 'text-anchor': 'middle',
          'font-size': 9.5, 'font-weight': 700, fill: color, 'font-family': 'var(--num), monospace' },
          fmtNum(v) + (opts.suffix || '')));
      }
      var lbl = String(r[labelKey]);
      var t = el('text', { x: x + bw / 2, y: H - m.b + 13, 'font-size': 9.5, fill: COLORS.muted }, lbl);
      if (opts.rotate) {
        t.setAttribute('text-anchor', 'end');
        t.setAttribute('transform', 'rotate(-45 ' + (x + bw / 2) + ' ' + (H - m.b + 13) + ')');
      } else {
        t.setAttribute('text-anchor', 'middle');
      }
      svg.appendChild(t);
    });
    container.appendChild(svg);
  }

  // Ring chart with a total in the middle.
  function donutChart(container, segs, opts) {
    opts = opts || {};
    container.innerHTML = '';
    var total = segs.reduce(function (a, s) { return a + s.value; }, 0);
    if (!total) { container.textContent = 'No data.'; return; }
    var W = 300, H = 210, cx = 105, cy = H / 2, R = 74, r = 46;
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img' });
    var a0 = -Math.PI / 2;
    segs.forEach(function (s) {
      if (!s.value) return;
      var a1 = a0 + (s.value / total) * Math.PI * 2;
      var large = (a1 - a0) > Math.PI ? 1 : 0;
      var p = 'M' + (cx + R * Math.cos(a0)) + ',' + (cy + R * Math.sin(a0)) +
        ' A' + R + ',' + R + ' 0 ' + large + ' 1 ' + (cx + R * Math.cos(a1)) + ',' + (cy + R * Math.sin(a1)) +
        ' L' + (cx + r * Math.cos(a1)) + ',' + (cy + r * Math.sin(a1)) +
        ' A' + r + ',' + r + ' 0 ' + large + ' 0 ' + (cx + r * Math.cos(a0)) + ',' + (cy + r * Math.sin(a0)) + ' Z';
      svg.appendChild(el('path', { d: p, fill: s.color }));
      a0 = a1;
    });
    svg.appendChild(el('text', { x: cx, y: cy - 2, 'text-anchor': 'middle', 'font-size': 30, 'font-weight': 700,
      fill: COLORS.navy, 'font-family': 'var(--num), monospace' }, String(total)));
    svg.appendChild(el('text', { x: cx, y: cy + 16, 'text-anchor': 'middle', 'font-size': 10, fill: COLORS.muted },
      opts.centerLabel || 'counties'));
    segs.forEach(function (s, i) {
      var ly = 42 + i * 26;
      svg.appendChild(el('rect', { x: 200, y: ly - 9, width: 11, height: 11, rx: 3, fill: s.color }));
      svg.appendChild(el('text', { x: 218, y: ly, 'font-size': 11, fill: COLORS.navy }, s.label));
      svg.appendChild(el('text', { x: 218, y: ly + 13, 'font-size': 10, fill: COLORS.muted,
        'font-family': 'var(--num), monospace' }, s.value + ' · ' + Math.round(s.value / total * 100) + '%'));
    });
    container.appendChild(svg);
  }

  // County × year grid, shaded on the same ramp as the choropleth.
  function heatGrid(container, counties, years, lookup, opts) {
    opts = opts || {};
    container.innerHTML = '';
    if (!counties.length || !years.length) { container.textContent = 'No data.'; return; }
    var cellW = 46, cellH = 23, m = { t: 22, l: 132, r: 10, b: 8 };
    var W = m.l + years.length * cellW + m.r, H = m.t + counties.length * cellH + m.b;
    // width/height are set so the grid renders at its natural size instead of being
    // stretched to the card, which blew the labels up out of proportion.
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img' });
    var all = [];
    counties.forEach(function (c) { years.forEach(function (y) { var v = lookup(c, y); if (v != null) all.push(v); }); });
    var lo = Math.min.apply(null, all), hi = Math.max.apply(null, all);
    years.forEach(function (y, j) {
      svg.appendChild(el('text', { x: m.l + j * cellW + cellW / 2, y: m.t - 7, 'text-anchor': 'middle',
        'font-size': 9.5, fill: COLORS.muted, 'font-family': 'var(--num), monospace' }, String(y)));
    });
    counties.forEach(function (c, i) {
      svg.appendChild(el('text', { x: m.l - 8, y: m.t + i * cellH + cellH / 2 + 3.5, 'text-anchor': 'end',
        'font-size': 10, fill: COLORS.navy }, String(c).length > 17 ? String(c).slice(0, 16) + '…' : String(c)));
      years.forEach(function (y, j) {
        var v = lookup(c, y);
        var x = m.l + j * cellW, yy = m.t + i * cellH;
        if (v == null) {
          svg.appendChild(el('rect', { x: x + 1, y: yy + 1, width: cellW - 2, height: cellH - 2, rx: 2, fill: '#F1F4F9' }));
          return;
        }
        var t = hi === lo ? 0.5 : (v - lo) / (hi - lo);
        var cell = el('rect', { x: x + 1, y: yy + 1, width: cellW - 2, height: cellH - 2, rx: 2, fill: scaleColor(t) });
        cell.appendChild(el('title', {}, c + ' · ' + y + ': ' + fmtNum(v)));
        svg.appendChild(cell);
      });
    });
    container.appendChild(svg);
  }

  // ============================================================
  // PAGE: Indicator Catalogue
  // ============================================================
  function initCatalogue() {
    var state = window.__CATALOGUE_STATE__;
    if (!state) return;
    var activeDomain = '';
    var searchTerm = '';

    function applyFilter() {
      qsa('#catalogue-tbody tr').forEach(function (tr) {
        var matchesDomain = !activeDomain || tr.dataset.domain === activeDomain;
        var matchesSearch = !searchTerm || tr.dataset.search.indexOf(searchTerm.toLowerCase()) !== -1;
        tr.style.display = (matchesDomain && matchesSearch) ? '' : 'none';
      });
    }
    qsa('.pill-chip[data-domain]').forEach(function (chip) {
      chip.addEventListener('click', function () {
        qsa('.pill-chip[data-domain]').forEach(function (c) { c.classList.remove('active'); });
        chip.classList.add('active');
        activeDomain = chip.dataset.domain;
        applyFilter();
      });
    });
    var search = qs('#catalogue-search');
    if (search) {
      search.addEventListener('input', function () { searchTerm = search.value; applyFilter(); });
      if (search.value) { searchTerm = search.value; applyFilter(); }
    }

    var overlay = qs('#drawer-overlay');
    qsa('#catalogue-tbody tr').forEach(function (tr) {
      tr.addEventListener('click', function () {
        var code = tr.dataset.code;
        var ind = state.indicators.filter(function (i) { return i.code === code; })[0];
        if (!ind) return;
        qs('#drawer-title').textContent = ind.name;
        qs('#drawer-body').innerHTML =
          '<p class="muted">' + esc(ind.description || '') + '</p>' +
          '<div class="drawer-meta-row"><span class="k">Category</span><span class="v">' + esc(ind.domainLabel) + '</span></div>' +
          '<div class="drawer-meta-row"><span class="k">Unit</span><span class="v">' + esc(ind.unit) + '</span></div>' +
          '<div class="drawer-meta-row"><span class="k">Source agency</span><span class="v">' + esc(ind.agency || '') + '</span></div>' +
          '<div class="drawer-meta-row"><span class="k">Periodicity</span><span class="v">' + esc(ind.periodicity || '') + '</span></div>' +
          '<div class="drawer-meta-row"><span class="k">Access level</span><span class="v">' + esc(ind.access_level) + '</span></div>' +
          '<div class="drawer-meta-row"><span class="k">Coverage</span><span class="v">' + esc(ind.coverage) + ' / 15 counties</span></div>' +
          '<div class="drawer-meta-row"><span class="k">Last updated</span><span class="v">' + esc(ind.lastUpdated) + '</span></div>' +
          '<h3 style="margin-top:1.1rem">Methodology</h3><p class="muted">' + esc(ind.methodology || '') + '</p>' +
          '<p style="margin-top:1rem"><a class="btn btn-teal btn-sm" href="/data?indicator=' + esc(code) + '">Open in Data Explorer</a></p>';
        overlay.classList.add('open');
      });
    });
    if (overlay) {
      overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.classList.remove('open'); });
      var closeBtn = qs('.drawer-close', overlay);
      if (closeBtn) closeBtn.addEventListener('click', function () { overlay.classList.remove('open'); });
    }
  }

  // ============================================================
  // PAGE: Data Query builder
  // ============================================================
  function initQueryBuilder() {
    var state = window.__QUERY_STATE__;
    if (!state) return;
    var selectedIndicators = [];
    var selectedCounties = [];
    var yearFrom = state.years[0], yearTo = state.years[state.years.length - 1];
    var format = 'csv';

    initMultiDropdown(qs('#dd-query-indicators'), {
      items: state.indicators, placeholder: 'Select indicators…',
      onChange: function (vals) { selectedIndicators = vals; refreshPreview(); },
    });
    initMultiDropdown(qs('#dd-query-counties'), {
      items: state.counties, placeholder: 'Select counties…',
      onChange: function (vals) { selectedCounties = vals; refreshPreview(); },
    });
    var yf = qs('#year-from'), yt = qs('#year-to');
    if (yf) yf.addEventListener('change', function () { yearFrom = Number(yf.value); refreshPreview(); });
    if (yt) yt.addEventListener('change', function () { yearTo = Number(yt.value); refreshPreview(); });
    qsa('input[name=fmt]').forEach(function (r) { r.addEventListener('change', function () { format = r.value; refreshApiBox(); }); });

    function refreshPreview() {
      var tbody = qs('#query-preview tbody');
      if (!selectedIndicators.length || !selectedCounties.length) { tbody.innerHTML = '<tr><td colspan="5" class="muted">Select at least one indicator and one county to preview results.</td></tr>'; refreshApiBox(); return; }
      var params = new URLSearchParams();
      params.set('indicators', selectedIndicators.join(','));
      params.set('counties', selectedCounties.join(','));
      params.set('year_from', yearFrom); params.set('year_to', yearTo);
      fetch('/api/v1/query/preview?' + params.toString()).then(function (r) { return r.json(); }).then(function (data) {
        tbody.innerHTML = data.rows.slice(0, 60).map(function (r) {
          return '<tr><td>' + esc(r.indicator) + '</td><td>' + esc(r.county) + '</td><td class="num mono">' + r.year + '</td><td class="num mono">' + fmtNum(r.value) + '</td><td>' + esc(r.unit) + '</td></tr>';
        }).join('') + (data.rows.length > 60 ? '<tr><td colspan="5" class="muted">…and ' + (data.count - 60) + ' more rows</td></tr>' : '');
        qs('#query-count').textContent = data.count + ' rows';
      });
      refreshApiBox();
    }
    function refreshApiBox() {
      var box = qs('#api-call-box');
      if (!box) return;
      var params = new URLSearchParams();
      params.set('indicators', selectedIndicators.join(','));
      params.set('counties', selectedCounties.join(','));
      params.set('year_from', yearFrom); params.set('year_to', yearTo); params.set('format', format);
      box.textContent = 'GET ' + location.origin + '/api/v1/query?' + params.toString();
    }
    var saveBtn = qs('#btn-save-query');
    if (saveBtn) saveBtn.addEventListener('click', function () {
      var name = prompt('Name this query:');
      if (!name) return;
      fetch('/api/v1/query/save', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, indicators: selectedIndicators.join(','), counties: selectedCounties.join(','), year_from: yearFrom, year_to: yearTo, format: format }),
      }).then(function (r) { return r.json(); }).then(function (res) { toast(res.ok ? 'Query saved' : (res.error || 'Could not save ,  log in first')); });
    });
    var genBtn = qs('#btn-generate-download');
    if (genBtn) genBtn.addEventListener('click', function () {
      var params = new URLSearchParams();
      params.set('indicators', selectedIndicators.join(','));
      params.set('counties', selectedCounties.join(','));
      params.set('year_from', yearFrom); params.set('year_to', yearTo); params.set('format', format);
      window.location = '/api/v1/query?' + params.toString();
    });
    refreshPreview();
  }

  // ============================================================
  // PAGE: Dashboard topic
  // ============================================================
  function initDashboardTopic() {
    var state = window.__DASHBOARD_STATE__;
    if (!state) return;
    var countyFilter = qs('#dash-county-filter');
    var topicSelect = qs('#dash-topic-select');
    var topic = state.topic;
    function applyMeta() {
      var meta = (state.meta || {})[topic];
      if (!meta) return;
      var desc = qs('#dash-description'); if (desc) desc.textContent = meta.description || '';
      var narr = qs('#dash-narrative'); if (narr) narr.textContent = meta.narrative || '';
      if (document.title && meta.label) document.title = meta.label + ' · NICTD';
    }
    function load() {
      var county = countyFilter ? countyFilter.value : '';
      fetch('/api/v1/dashboards/' + topic + (county ? '?county=' + encodeURIComponent(county) : ''))
        .then(function (r) { return r.json(); })
        .then(function (d) {
          var syncEl = qs('#dash-sync-text');
          if (syncEl) {
            var sync = new Date(d.last_etl_sync);
            syncEl.textContent = 'sync ' + sync.toISOString().slice(0, 16).replace('T', ' ') + ' UTC · data through ' + String(d.last_data_update).slice(0, 10);
          }
          var scope = qs('#dash-scope-label'); if (scope) scope.textContent = d.scope;
          var hero = qs('#dash-hero-stats');
          if (hero) hero.innerHTML = d.heroStats.map(function (k) {
            return '<div class="cell"><div class="val">' + fmtNum(k.value) + '</div><div class="lbl">' + esc(k.name) + ' · ' + esc(k.unit) + '</div></div>';
          }).join('');
          if (d.trend) {
            lineChart(qs('#dash-trend'), d.trend.series, {});
            var tt = qs('#dash-trend-title'); if (tt) tt.textContent = d.trend.name + ' ,  ' + d.scope;
          }
          if (d.ranking) { barChart(qs('#dash-ranking-top'), d.ranking.top, { highlightTop: true }); barChart(qs('#dash-ranking-bottom'), d.ranking.bottom, { low: true }); }
          renderDashViz(d, county);
          var dl = qs('#dash-download'); if (dl) dl.href = '/api/v1/download/data.csv?indicator=' + encodeURIComponent(d.trend ? d.trend.code : '');
          if (d.trend && d.trend.code) loadMap(d.trend.code, d.trend.name);
        })
        .catch(function () {});
    }
    // Same visual set as the Data Explorer. Year-on-year growth comes straight off the
    // trend series; the distribution, the change ring and the heat map need the full
    // county x year matrix, which is fetched once per indicator and cached.
    var dashMatrix = {};
    function renderDashViz(d, county) {
      var scope = qs('#dash-growth-scope');
      if (scope) scope.textContent = county || 'National';

      var ser = (d.trend && d.trend.series) || [];
      var growth = [];
      for (var i = 1; i < ser.length; i++) {
        var prev = ser[i - 1].value, cur = ser[i].value;
        if (prev == null || cur == null || prev === 0) continue;
        growth.push({ label: String(ser[i].year), value: Math.round(((cur - prev) / prev) * 1000) / 10 });
      }
      if (qs('#dash-growth')) columnChart(qs('#dash-growth'), growth, { suffix: '%' });

      var code = d.trend && d.trend.code;
      if (!code) return;
      if (dashMatrix[code]) { drawFromMatrix(dashMatrix[code]); return; }
      var heatBox = qs('#dash-heat');
      if (heatBox) heatBox.textContent = 'Loading…';
      fetch('/api/v1/download/data.json?indicator=' + encodeURIComponent(code))
        .then(function (r) { return r.json(); })
        .then(function (payload) {
          var m = { byKey: {}, counties: [], years: [] };
          var seenC = {}, seenY = {};
          (payload.data || []).forEach(function (row) {
            if (!seenY[row.year]) { seenY[row.year] = 1; m.years.push(row.year); }
            // National totals arrive with county: null - they are not a county row.
            if (row.county == null || row.county === '') return;
            m.byKey[row.county + '|' + row.year] = row.value;
            if (!seenC[row.county]) { seenC[row.county] = 1; m.counties.push(row.county); }
          });
          m.counties.sort();
          m.years.sort(function (a, b) { return a - b; });
          dashMatrix[code] = m;
          drawFromMatrix(m);
        })
        .catch(function () { if (heatBox) heatBox.textContent = 'Heat map unavailable.'; });
    }

    function drawFromMatrix(m) {
      var latest = m.years[m.years.length - 1], prev = m.years[m.years.length - 2];
      var yl = qs('#dash-dist-year'); if (yl) yl.textContent = String(latest);

      var rows = m.counties.map(function (c) { return { label: c, value: m.byKey[c + '|' + latest] }; })
        .filter(function (r) { return r.value != null; })
        .sort(function (a, b) { return b.value - a.value; });
      if (qs('#dash-distribution')) {
        columnChart(qs('#dash-distribution'), rows, {
          rotate: true, showValues: false,
          colorFor: function (v, i) { return i === 0 ? COLORS.gold : COLORS.teal; },
        });
      }

      var up = 0, down = 0, flat = 0;
      m.counties.forEach(function (c) {
        var a = m.byKey[c + '|' + prev], b = m.byKey[c + '|' + latest];
        if (a == null || b == null || b === a) flat++;
        else if (b > a) up++; else down++;
      });
      if (qs('#dash-change')) {
        donutChart(qs('#dash-change'), [
          { label: 'Increased', value: up, color: COLORS.teal },
          { label: 'Decreased', value: down, color: COLORS.gold },
          { label: 'No change', value: flat, color: COLORS.clay },
        ], { centerLabel: 'counties' });
      }

      if (qs('#dash-heat')) {
        heatGrid(qs('#dash-heat'), m.counties, m.years, function (c, y) {
          var v = m.byKey[c + '|' + y];
          return v == null ? null : v;
        });
      }
    }

    // County choropleth + map-size control, same as the Data Explorer
    var mapZoomPct = 100;
    var mapZoom = qs('#map-zoom');
    function applyMapZoom() {
      var wrap = qs('#choropleth .choropleth-wrap');
      if (wrap) wrap.style.maxWidth = mapZoomPct + '%';
    }
    if (mapZoom) mapZoom.addEventListener('input', function () {
      mapZoomPct = Number(mapZoom.value);
      var lbl = qs('#map-zoom-val'); if (lbl) lbl.textContent = mapZoomPct + '%';
      applyMapZoom();
    });
    function loadMap(code, label) {
      var host = qs('#choropleth');
      if (!host || !code) return;
      fetch('/api/v1/explorer?indicator=' + encodeURIComponent(code))
        .then(function (r) { return r.json(); })
        .then(function (d) {
          var values = {};
          (d.table || []).forEach(function (r) { values[r.county] = r.value; });
          renderChoropleth(host, values, { unit: d.indicator ? d.indicator.unit : '' });
          applyMapZoom();
          var t = qs('#dash-map-title'); if (t) t.textContent = (d.indicator && d.indicator.name) || label || '';
          var dsc = qs('#dash-map-desc');
          if (dsc && d.indicator) dsc.textContent = (d.indicator.description || '') + ' Unit: ' + (d.indicator.unit || '') + '.';
          var yr = qs('#dash-map-year'); if (yr && d.year) yr.textContent = d.year;
          var tag = qs('#dash-map-tag'); if (tag && d.indicator && d.indicator.domainLabel) tag.textContent = d.indicator.domainLabel;
        })
        .catch(function () {});
    }
    if (countyFilter) countyFilter.addEventListener('change', load);
    if (topicSelect) topicSelect.addEventListener('change', function () {
      topic = topicSelect.value;
      applyMeta();
      if (history.replaceState) history.replaceState(null, '', '/dashboards?topic=' + encodeURIComponent(topic));
      load();
    });
    applyMeta();
    load();
  }

  // ============================================================
  // PAGE: Home (global selector + dashboard live status not required)
  // ============================================================
  function initHome() {
    var state = window.__HOME_STATE__;
    if (!state) return;
    var items = state.indicators.map(function (i) { return { value: '/data?indicator=' + i.code, label: i.name, group: i.domainLabel }; })
      .concat(state.dashboards.map(function (d) { return { value: '/dashboards/' + d.slug, label: d.label, group: 'Dashboards' }; }));
    initDropdown(qs('#dd-home-indicator'), { items: items, placeholder: 'Search indicators or dashboards…', onChange: function (v) { window.location = v; } });
    var countyItems = [{ value: '/dashboards/connectivity', label: 'National (Liberia)', group: '' }].concat(state.counties.map(function (c) { return { value: '/data?focus=' + encodeURIComponent(c.name), label: c.name, group: '' }; }));
    initDropdown(qs('#dd-home-focus'), { items: countyItems, placeholder: 'Focus county', onChange: function (v) { window.location = v; } });
    initDropdown(qs('#dd-home-compare'), { items: state.counties.map(function (c) { return { value: '/data?compare=' + encodeURIComponent(c.name), label: c.name, group: '' }; }), placeholder: 'Comparison county', onChange: function (v) { window.location = v; } });
  }

  function initAnalyticsLegacy() {
    var an = window.__ANALYTICS__;
    if (!an) return;
    lineChart(qs('#analytics-daily'), an.daily.map(function (d, i) { return { year: i, value: d.n, label: d.day.slice(5) }; }), { });
    barChart(qs('#analytics-paths'), an.topPaths, { labelKey: 'path', valKey: 'n', color: COLORS.navy });
  }

  // Shared toolkit for page bundles loaded alongside this file (public/explorer.js).
  window.NICTD = { el: el, esc: esc, qs: qs, qsa: qsa, fmtNum: fmtNum, scaleColor: scaleColor,
    initDropdown: initDropdown, initSortableTable: initSortableTable, exportSvgToPng: exportSvgToPng,
    toast: toast, copyText: copyText, COLORS: COLORS, SVG_NS: SVG_NS };

  // ---------- boot ----------
  var page = window.__NICTD_PAGE__;
  document.addEventListener('DOMContentLoaded', function () {
    initAccordions('.faq-item', '.faq-q');
    if (page === 'home') { initHome(); if (window.__DASHBOARD_STATE__) initDashboardTopic(); }
    // the Data Explorer runs on its own engine, public/explorer.js
    if (page === 'catalogue') initCatalogue();
    if (page === 'query') initQueryBuilder();
    if (page === 'dashboard-topic') initDashboardTopic();
    if (page === 'analytics-legacy') initAnalyticsLegacy();
  });
})();
