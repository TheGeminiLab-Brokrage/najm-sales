/* ------------------------------------------------------------------
   Najm: a project page. VELN's chooser: the building at night with its
   lights off, and one card per LINE. Each line switches on ITS floors:
   Commercial the ground and first, Administrative the second, Medical
   the third. Moray lit its buildings; VELN is one building, so it
   lights floors. The light is the same picture at full strength, cut
   to each floor's outline, so nothing moves but the lights.

   Phone: the cards are a swipe row; the card at the centre is lit.
   Wider: pointing at (or focusing) a card lights it; at rest the whole
   building is on.
   ------------------------------------------------------------------ */

(function () {
  'use strict';
  var N = window.NJ, el = N.el;
  if (!N.guard()) return;

  var q = new URLSearchParams(location.search);
  var p = CONFIG.projects.filter(function (x) { return x.id === q.get('p'); })[0];
  /* fail closed: an unknown project is not guessed at */
  if (!p) { location.replace('index.html'); return; }
  var line = p.lines.filter(function (l) { return l.id === q.get('line'); })[0] || null;

  var SVG = 'http://www.w3.org/2000/svg';
  var st = p.stage;
  var app = document.getElementById('app');
  var crumbs = [{ label: N.t('Projects'), href: 'index.html' }, { label: p.name, href: line ? 'project.html?p=' + p.id : null }];
  if (line) { crumbs.push({ label: N.t(line.name) }); document.body.classList.add('is-line'); }
  /* Back goes one step up: a line to VELN's chooser, the chooser to the projects */
  app.appendChild(N.header(crumbs, line ? { label: p.name, href: 'project.html?p=' + p.id } : { label: N.t('Projects'), href: 'index.html' }));

  /* filled by stage(), so declared (and set) before it runs */
  var floorsG = {}, marker, tag, lineReady = null;
  var CODE = { ground: 'G', first: 'F', second: 'S', third: 'TH' };
  /* fail closed: only these words are sellable; any other status is not */
  var SELLABLE = { Available: true };
  /* what the sales view shows (Muhanad, 2026-11-14): available in teal, reserved in
     yellow (seen, never offered), and NOTHING else: sold, closed (not opened for sale)
     and any word the app does not know are not drawn, listed or counted. The sheet
     has no reserved unit yet, so these are the words a sheet may use for one. */
  var RESERVED = { reserved: true, reservation: true, hold: true, 'on hold': true, held: true };
  function isHeld(u) { return RESERVED[String(u.status || '').replace(/\s+/g, ' ').trim().toLowerCase()] === true; }
  var swipe = window.matchMedia('(max-width: 760px)');
  var main = el('main', 'pr');
  main.appendChild(stage());
  main.appendChild(lockup());
  if (line) main.appendChild(linePage(line)); else main.appendChild(chooser());
  app.appendChild(main);
  app.appendChild(N.salesBar());

  /* ---- the building ---------------------------------------------------- */
  function stage() {
    var wrap = el('section', 'stage');
    var svg = document.createElementNS(SVG, 'svg');
    svg.setAttribute('viewBox', st.view.join(' '));
    svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', N.t('{name} at night, lit floor by floor by use', { name: p.name }));
    var defs = document.createElementNS(SVG, 'defs');
    /* lights off: darker and greyer, the sky kept */
    defs.innerHTML =
      '<filter id="off" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values=".55"/>' +
      '<feComponentTransfer><feFuncR type="linear" slope=".36"/><feFuncG type="linear" slope=".38"/><feFuncB type="linear" slope=".46"/></feComponentTransfer></filter>' +
      /* lights on: the picture as rendered, a touch warmer */
      '<filter id="on" color-interpolation-filters="sRGB"><feComponentTransfer><feFuncR type="linear" slope="1.12"/><feFuncG type="linear" slope="1.05"/><feFuncB type="linear" slope=".94"/></feComponentTransfer></filter>';
    Object.keys(st.floors).forEach(function (f) {
      var c = document.createElementNS(SVG, 'clipPath');
      c.setAttribute('id', 'fl-' + f);
      var poly = document.createElementNS(SVG, 'polygon');
      poly.setAttribute('points', st.floors[f].map(function (pt) { return pt.join(','); }).join(' '));
      c.appendChild(poly);
      defs.appendChild(c);
    });
    svg.appendChild(defs);
    svg.appendChild(img('base', 'url(#off)'));
    Object.keys(st.floors).forEach(function (f) {
      var g = document.createElementNS(SVG, 'g');
      g.setAttribute('class', 'floor');
      g.setAttribute('clip-path', 'url(#fl-' + f + ')');
      g.appendChild(img('lit', 'url(#on)'));
      /* the switch-on: a soft band of light runs along the floor once */
      var run = document.createElementNS(SVG, 'rect');
      run.setAttribute('class', 'run');
      run.setAttribute('x', st.view[0] - 400); run.setAttribute('y', 0);
      run.setAttribute('width', 400); run.setAttribute('height', st.h);
      g.appendChild(run);
      svg.appendChild(g);
      floorsG[f] = g;
    });
    defs.insertAdjacentHTML('beforeend', '<linearGradient id="runG" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".7" stop-color="#FFE9C2" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>');
    wrap.appendChild(svg);

    /* Najm's star marks the lit floors, at their right-hand end */
    marker = el('span', 'marker');
    marker.appendChild(N.starSvg());
    wrap.appendChild(marker);
    /* names what is lit, so a light on a phone is never a puzzle */
    tag = el('span', 'stage-tag');
    tag.setAttribute('aria-live', 'polite');
    wrap.appendChild(tag);
    return wrap;
  }
  function img(cls, filter) {
    var i = document.createElementNS(SVG, 'image');
    i.setAttribute('href', st.img);
    i.setAttribute('x', 0); i.setAttribute('y', 0);
    i.setAttribute('width', st.w); i.setAttribute('height', st.h);
    i.setAttribute('class', cls);
    i.setAttribute('filter', filter);
    return i;
  }

  function floorsLabel(l) {
    return N.tx.floors(l.floors);
  }

  /* where the marker sits: the right-hand end of the lit floors, in % of the stage */
  function markAt(floors) {
    var xs = [], ys = [];
    floors.forEach(function (f) { st.floors[f].forEach(function (pt) { xs.push(pt[0]); ys.push(pt[1]); }); });
    var x = Math.max.apply(null, xs), y = (Math.min.apply(null, ys) + Math.max.apply(null, ys)) / 2;
    /* the stage crops with "slice": map through the box the browser actually shows */
    var box = document.querySelector('.stage svg').getBoundingClientRect();
    var v = st.view, s = Math.max(box.width / v[2], box.height / v[3]);
    var ox = (box.width - v[2] * s) / 2, oy = (box.height - v[3] * s) / 2;
    /* just inside the floor's end, never past the stage's edge */
    return { x: Math.min(box.width - 16, ox + (x - v[0]) * s - 14), y: oy + (y - v[1]) * s };
  }

  /* id: a line ('commercial'), every floor ('*'), or ONE floor of the open
     line ('f:ground'): on a line's page the chosen floor is the only light */
  var litNow = null;
  function light(id) {
    if (id === litNow) return;
    litNow = id;
    var one = /^f:/.test(String(id)) ? String(id).slice(2) : null;
    var found = /^m:/.test(String(id)) ? String(id).slice(2).split(',').filter(Boolean) : null;
    var l = one || found ? line : p.lines.filter(function (x) { return x.id === id; })[0];
    var on = found || (one ? [one] : l ? l.floors : (id === '*' ? Object.keys(st.floors) : []));
    Object.keys(floorsG).forEach(function (f) {
      var g = floorsG[f], want = on.indexOf(f) >= 0;
      if (want && !g.classList.contains('on')) {
        /* from the street up, one floor after the other */
        var order = ['ground', 'first', 'second', 'third'].filter(function (x) { return on.indexOf(x) >= 0; });
        g.style.setProperty('--delay', (order.indexOf(f) * 0.14) + 's');
        g.classList.remove('on'); void g.getBBox(); g.classList.add('on');
      } else if (!want) g.classList.remove('on');
    });
    if (l && on.length) {
      var m = markAt(on);
      marker.style.transform = 'translate(' + m.x + 'px,' + m.y + 'px)';
      marker.classList.add('on');
      tag.textContent = N.t(l.name) + ' · ' + (one ? N.tx.floor(one) : found ? N.tx.floors(on) : floorsLabel(l));
      tag.classList.add('on');
    } else {
      marker.classList.remove('on');
      tag.classList.remove('on');
    }
    [].forEach.call(document.querySelectorAll('.l-card, .l-dot'), function (n) {
      n.classList.toggle('is-on', n.getAttribute('data-line') === id);
    });
  }

  function lockup() {
    var w = el('div', 'pr-lock');
    w.appendChild(N.inlineSvg(p.logo, 'veln-logo'));
    w.appendChild(el('p', 'pr-place', [N.t(p.kind), N.t(p.place), N.t(p.where)].join(' · ')));
    return w;
  }

  /* ---- the cards ------------------------------------------------------- */
  function chooser() {
    var s = el('section', 'lines');
    s.appendChild(el('p', 'eyebrow', N.t('Choose a line')));
    var row = el('div', 'l-cards');
    p.lines.forEach(function (l) { row.appendChild(lineCard(l)); });
    s.appendChild(row);
    var dots = el('div', 'l-dots');
    p.lines.forEach(function (l, i) {
      var d = el('button', 'l-dot');
      d.type = 'button';
      d.setAttribute('data-line', l.id);
      d.setAttribute('aria-label', N.t('Show {name}', { name: N.t(l.name) }));
      d.addEventListener('click', function () { centre(i); });
      dots.appendChild(d);
    });
    s.appendChild(dots);
    if (window.VELN_UNITS) s.appendChild(el('p', 'src', asOf(window.VELN_UNITS)));
    return s;
  }

  /* sizes are derived from what is on sale; only what the units cannot say is typed */
  function lineFacts(l) {
    var book = window.VELN_UNITS, out = [];
    if (book && book.floors) l.floors.forEach(function (f) {
      var fl = book.floors[f] || {};
      out.push({ k: N.tx.floor(f), v: range((fl.units || []).filter(sellable)) });
      if (fl.zones && fl.zones.length) out.push({ k: N.t('Zones'), v: N.t('{n} · {a} m² shares', { n: fl.zones.length, a: fl.zones[0].shares[0].area }) });
    });
    return out.concat(l.facts.map(function (f) { return { k: N.t(f.k), v: N.t(f.v) }; }));
  }

  function lineCard(l) {
    var a = el('a', 'l-card');
    a.href = 'project.html?p=' + encodeURIComponent(p.id) + '&line=' + encodeURIComponent(l.id);
    a.setAttribute('data-line', l.id);
    a.setAttribute('aria-label', N.t('Open {name}', { name: N.t(l.name) }));
    var pic = el('div', 'l-pic');
    var im = new Image(); im.src = l.pic; im.alt = '';
    pic.appendChild(im);
    a.appendChild(pic);
    var m = el('div', 'l-meta');
    m.appendChild(el('p', 'l-kind', N.t(l.kind) + ' · ' + floorsLabel(l)));
    m.appendChild(el('p', 'l-name', N.t(l.name)));
    var dl = el('dl', 'facts');
    lineFacts(l).forEach(function (f) {
      var w = el('div');
      w.appendChild(el('dt', null, f.k));
      w.appendChild(el('dd', null, f.v));
      dl.appendChild(w);
    });
    m.appendChild(dl);
    if (l.operator) m.appendChild(el('p', 'l-op', N.t(l.operator)));
    var go = el('div', 'go');
    go.appendChild(el('span', null, N.t('Open {name}', { name: N.t(l.name) })));
    go.insertAdjacentHTML('beforeend', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6"/></svg>');
    m.appendChild(go);
    a.appendChild(m);
    a.addEventListener('mouseenter', function () { if (!swipe.matches) light(l.id); });
    a.addEventListener('mouseleave', function () { if (!swipe.matches) light('*'); });
    a.addEventListener('focus', function () { light(l.id); });
    return a;
  }

  /* ---- a phone: the card at the centre of the row is the one lit ----- */
  function centre(i) {
    var row = document.querySelector('.l-cards'), c = row && row.children[i];
    if (c) row.scrollTo({ left: c.offsetLeft - (row.clientWidth - c.offsetWidth) / 2, behavior: N.reduced ? 'auto' : 'smooth' });
  }
  function pick() {
    var row = document.querySelector('.l-cards');
    if (!row || !swipe.matches) return;
    var mid = row.scrollLeft + row.clientWidth / 2, best = null, bd = Infinity;
    [].forEach.call(row.children, function (c) {
      var d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid);
      /* how far from the centre: the cards either side dim with it */
      c.style.setProperty('--f', Math.min(1, d / c.offsetWidth).toFixed(3));
      if (d < bd) { bd = d; best = c; }
    });
    if (best) light(best.getAttribute('data-line'));
  }

  /* ---- a line's own page: 1 Floor -> 2 Unit (on the plan) -> 3 Unit details
     (Main Marks' line page, Qomor's numbered steps). One path to a unit:
     the drawing and the rows both end in pickUnit(). A medical zone is sold
     by share: it glows on the plan like a unit and ends in pickZone(). ----- */
  function sellable(u) { return SELLABLE[u.status] === true; }
  function zoneOpen(z) { return z.shares.filter(sellable); }
  function delivered(l) { var f = l.facts.filter(function (x) { return x.k === 'Delivered'; })[0]; return f ? N.t(f.v) : ''; }
  function size(u) { return Math.round(u.indoor); }
  /* where a room's printed area goes: beside its number disc, on the first side where the
     whole label stays inside the room's outline (the medical rooms are narrow wedges) */
  var AREA_FS = 22;
  function inPoly(p, poly) {
    var inside = false;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      var a = poly[i], b = poly[j];
      if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
    }
    return inside;
  }
  function areaAt(u, chars) {
    if (!u.at || !u.poly) return null;
    /* the label's box must lie inside the room and clear of the number disc. Nearest spot first,
       above before below before the sides; a smaller size only when no spot fits at full size */
    var x = u.at[0], y = u.at[1], sizes = [AREA_FS, 19, 16, 13];
    for (var s = 0; s < sizes.length; s++) {
      var fs = sizes[s], w = chars * fs * 0.58, h = fs * 0.8;
      for (var d = 0; d <= 60; d += 6) {
        var spots = [[x, y - 21 - d - h / 2], [x, y + 21 + d + h / 2], [x - 21 - d - w / 2, y], [x + 21 + d + w / 2, y]];
        for (var i = 0; i < spots.length; i++) {
          var c = spots[i];
          var ok = [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, -1], [0, 1], [-1, 0], [1, 0]].every(function (q) { return inPoly([c[0] + q[0] * w / 2, c[1] + q[1] * h / 2], u.poly); });
          if (ok) return { x: c[0], y: c[1], fs: fs };
        }
      }
    }
    return null;
  }  function range(list) {
    var a = list.map(size).filter(Boolean);
    return a.length ? N.t('{a} to {b} m²', { a: Math.min.apply(null, a), b: Math.max.apply(null, a) }) : '';
  }
  function money(v) { return Math.round(v).toLocaleString('en-US'); }
  function m2(v) { return N.tx.m2(v); }
  function pct(v) { return Math.round(v * 100) + '%'; }
  function day(d) { return N.tx.date(d); }
  function asOf(book) { return N.t('Prices and availability as of {d}.', { d: day(new Date(book.asOf + 'T12:00:00')) }); }

  /* A plan that names a kind of unit is that unit's only plan (js/config.js). */
  function plansFor(kind) {
    if (p.hold && p.hold[kind]) return [];            /* on hold: no plan, no offer */
    var own = p.plans.filter(function (pl) { return pl.only === kind; });
    return own.length ? own : p.plans.filter(function (pl) { return !pl.only; });
  }

  function linePage(l) {
    var book = window.VELN_UNITS;
    var s = el('section', 'line-next');
    var head = el('div', 'ln-head');
    head.appendChild(el('p', 'eyebrow', N.t(l.kind) + ' · ' + floorsLabel(l)));
    head.appendChild(el('h1', 'script-h', N.t(l.name)));
    if (l.operator) head.appendChild(el('p', 'l-op', N.t(l.operator)));
    s.appendChild(head);
    /* no unit file: say so, offer nothing (fail closed) */
    if (!book || !book.floors) { s.appendChild(el('p', 'ln-note', N.t('Units for {name} will appear here as soon as they are released.', { name: N.t(l.name) }))); return s; }

    var cur = { f: null };
    /* what is chosen: one unit, or several when the request is for several.
       picks = [{ f: floor id, o: the unit or zone }]; it survives a change of floor
       only while "Select several units" is on, so a shop and the one upstairs can
       go together. */
    var many = false, picks = [], lastPlan = null;
    var s1 = step(1, N.t('Choose a floor')), s2 = step(2, N.t('Choose a unit')), s3 = step(3, N.t('Unit details'));
    s2.node.hidden = true; s3.node.hidden = true;
    /* Find a unit, the closed bar above step 1 (Main Marks). It owns nothing: it reads
       these rows, and every tap in it ends in pickFloor, pickUnit or pickZone. */
    var search = { active: false }, found = [];
    l.floors.forEach(function (f) {
      var fl = book.floors[f] || {};
      /* only what can be offered: a sold, closed or reserved unit is never a match */
      (fl.units || []).filter(sellable).forEach(function (u) {
        found.push({ code: fl.code + '-' + u.no, fid: f, building: f, area: size(u), priced: u.area, listPrice: u.price, status: u.status,
          sellable: sellable(u), kind: u.kind, outdoor: u.outdoor, kindWord: u.kind === 'pharmacy' ? 'pharmacy' : l.id === 'medical' ? 'clinic' : 'shop', ref: u });
      });
      (fl.zones || []).filter(function (z) { return zoneOpen(z).length; }).forEach(function (z) {
        var open = zoneOpen(z), one = open[0];
        found.push({ code: z.name, fid: f, building: f, area: one.area, priced: one.area, listPrice: one.price, status: open.length ? 'Available' : 'Closed',
          sellable: open.length > 0, kind: 'zone', outdoor: 0, kindWord: 'zone', sizeWord: one.area + ' m² share', ref: z });
      });
    });
    var finder = N.finder ? N.finder({
      project: p, useWord: N.t(l.kind), filters: l.filters,
      nameOf: function (f) { return N.tx.floor(f); },
      plansOf: function (u) { return plansFor(u.kind); }
    }) : null;
    if (finder) {
      var findBox = el('div', 'ln-find');
      findBox.appendChild(finder.node);
      s.appendChild(findBox);
    }
    s.appendChild(s1.node); s.appendChild(s2.node); s.appendChild(s3.node);

    /* step 1: Qomor's floor cards: code, "N available", name, use */
    var cards = el('div', 'fl-cards');
    l.floors.forEach(function (f) {
      var fl = book.floors[f] || {}, units = fl.units || [], zones = fl.zones || [];
      var n = units.filter(sellable).length + zones.filter(function (z) { return zoneOpen(z).length; }).length;
      var held = units.filter(isHeld).length;
      var c = el('button', 'fl-card');
      c.type = 'button';
      c.setAttribute('data-floor', f);
      var top = el('span', 'fl-top');
      top.appendChild(el('span', 'fl-code', CODE[f]));
      top.appendChild(el('span', 'fl-n' + (n ? '' : ' is-none'), n ? N.t('{n} available', { n: n }) : N.t('None available')));
      c.appendChild(top);
      c.appendChild(el('span', 'fl-name', N.tx.floor(f)));
      c.appendChild(el('span', 'fl-use', N.t(l.kind) + ' · ' + range(units.filter(sellable))));
      /* a floor whose only units are reserved still opens: the agent sees them in yellow */
      c.disabled = !n && !held;
      c.__n = n;
      c.addEventListener('click', function () { pickFloor(f, true); });
      cards.appendChild(c);
    });
    s1.body.appendChild(cards);

    /* step 2: the floor's own plan; what glows is what is available */
    /* the plan: a fixed window (draw) holding a canvas that widens with the zoom, so the
       outlines and the pins, placed in the canvas, ride the zoom with no extra code (CCR) */
    var zoomBar = el('div', 'pz');
    var draw = el('div', 'plan');
    var canvas = el('div', 'plan-canvas');
    draw.appendChild(canvas);
    var zoom = planZoom(draw, canvas, zoomBar);
    var rows = el('div', 'u-rows');
    var said = el('p', 'plan-said');
    s2.body.appendChild(zoomBar);
    s2.body.appendChild(draw);
    var key = el('p', 'plan-key');
    key.hidden = true;
    s2.body.appendChild(key);
    function sayHeld(u) { said.textContent = N.t('{code} is reserved. It cannot be offered.', { code: book.floors[cur.f].code + '-' + u.no }); }
    function sayOut(u) { said.textContent = N.t('{code} is not available.', { code: book.floors[cur.f].code + '-' + u.no }); }
    /* drawn grey on the plan: on the drawing, but neither sellable nor reserved */
    function notOffered(u) { return !!u.poly && !sellable(u) && !isHeld(u); }
    var TAG = { fit: 'Best fit', cheapest: 'Cheapest match', closest: 'Closest — over budget', available: 'Cheapest available' };
    var ansLine = el('p', 'plan-ans'); ansLine.hidden = true;
    s2.body.appendChild(ansLine);
    s2.body.appendChild(said);
    var sw = el('label', 'u-multi');
    var swIn = el('input');
    swIn.type = 'checkbox';
    sw.appendChild(swIn);
    sw.appendChild(el('span', 'u-track'));
    sw.appendChild(el('span', 'u-multi-t', N.t('Select several units')));
    var swN = el('span', 'u-multi-n');
    sw.appendChild(swN);
    s2.body.appendChild(sw);
    swIn.addEventListener('change', function () {
      many = swIn.checked;
      /* a zone is bought by its number of shares, never added to units */
      if (many && picks.length && picks[0].o.shares) picks = [];
      if (!many && picks.length > 1) picks = picks.slice(-1);
      said.textContent = many ? N.t('Tap each unit to add it. Tap it again to take it off.') : HINT;
      paintPicks();
      showCard(false);
    });
    /* closed until asked for (Muhanad, 2026-11-01): the plan is the picker, the
       list is there when an agent wants it, with Qomor's Type and Sort inside */
    var box = el('details', 'u-list');
    var sum = el('summary', 'u-sum');
    sum.appendChild(el('span', 'u-sum-t', N.t('All units')));
    var sumN = el('span', 'u-sum-n');
    sum.appendChild(sumN);
    box.appendChild(sum);
    var flt = el('div', 'u-flt');
    function field(label) {
      var w = el('label', 'u-field');
      w.appendChild(el('span', null, N.t(label)));
      var sel = el('select', 'q-select u-sel');
      w.appendChild(sel);
      flt.appendChild(w);
      return { wrap: w, sel: sel };
    }
    var fType = field('Type'), fSort = field('Sort');
    [['unit', 'Unit number'], ['price', 'Price, low to high'], ['price-desc', 'Price, high to low'],
     ['area', 'Area, small to large'], ['area-desc', 'Area, large to small']].forEach(function (o) {
      var op = el('option', null, N.t(o[1])); op.value = o[0]; fSort.sel.appendChild(op);
    });
    box.appendChild(flt);
    var shown = el('p', 'u-shown');
    shown.hidden = true;
    box.appendChild(shown);
    box.appendChild(rows);
    s2.body.appendChild(box);
    [fType.sel, fSort.sel].forEach(function (x) { x.addEventListener('change', function () { listUnits(book.floors[cur.f]); }); });

    var HINT = N.t('Tap a glowing unit, or open the list below.');
    function pickFloor(f, scroll) {
      cur.f = f;
      if (!many) picks = [];
      [].forEach.call(cards.children, function (c) { c.classList.toggle('is-on', c.getAttribute('data-floor') === f); });
      light('f:' + f);
      var fl = book.floors[f];
      s2.title.textContent = N.t('Choose a unit') + ' · ' + N.tx.floor(f);
      drawPlan(fl);
      box.open = false; fType.sel.value = ''; fSort.sel.value = 'unit';
      listUnits(fl);
      s2.node.hidden = false;
      s3.node.hidden = !picks.length;
      paintPicks();
      said.textContent = many ? N.t('Tap each unit to add it. Tap it again to take it off.') : HINT;
      if (scroll) go(s2.node);
    }

    var shapes = {}, glows = {}, glowLayer = null;
    /* Find a unit on the plan (2026-11-14, Muhanad: "glows right away whatever fits the client
       in blue ... the best fit to glow in green, the same we did in Ayyam"): see markPlan */
    function shape(svg, o, ok, label, open, i) {
      if (ok === 'held') {
        /* reserved: yellow, still, never opened; a tap only says so */
        var h = document.createElementNS(SVG, 'polygon');
        h.setAttribute('points', o.poly.map(function (pt) { return pt.join(','); }).join(' '));
        h.setAttribute('class', 'u-shape is-held');
        h.setAttribute('data-no', o.no);
        h.setAttribute('role', 'img');
        h.setAttribute('aria-label', label);
        h.addEventListener('click', function () { open(o); });
        svg.appendChild(h);
        return;
      }
      if (ok && glowLayer) {
        var gl = document.createElementNS(SVG, 'polygon');
        gl.setAttribute('points', o.poly.map(function (pt) { return pt.join(','); }).join(' '));
        gl.setAttribute('class', 'u-glow');
        gl.setAttribute('filter', 'url(#u-glow-f)');
        glowLayer.appendChild(gl);
        glows[o.no] = gl;
      }
      var g = document.createElementNS(SVG, 'polygon');
      g.setAttribute('points', o.poly.map(function (pt) { return pt.join(','); }).join(' '));
      g.setAttribute('class', 'u-shape is-free');
      g.setAttribute('data-no', o.no);
      g.style.setProperty('--i', i);
      if (ok) {
        g.setAttribute('tabindex', '0');
        g.setAttribute('role', 'button');
        g.setAttribute('aria-label', label);
        g.addEventListener('click', function () { open(o, true); });
        g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(o, true); } });
      }
      svg.appendChild(g);
      shapes[o.no] = g;
    }
    function drawPlan(fl) {
      canvas.textContent = ''; shapes = {}; glows = {};
      /* the window keeps the plan's own shape at every zoom; a new floor opens at 100% */
      draw.style.aspectRatio = fl.w + ' / ' + fl.h;
      zoom.reset(fl);
      var svg = document.createElementNS(SVG, 'svg');
      svg.setAttribute('viewBox', '0 0 ' + fl.w + ' ' + fl.h);
      svg.setAttribute('role', 'group');
      svg.setAttribute('aria-label', N.t('Floor plan') + ', ' + N.tx.floor(cur.f));
      /* Najm's printed plan page, as printed (Muhanad, 2026-10-29); the glow
         multiplies over it, so its numbers and areas read through */
      var im = document.createElementNS(SVG, 'image');
      im.setAttribute('href', fl.img); im.setAttribute('width', fl.w); im.setAttribute('height', fl.h);
      im.setAttribute('class', 'plan-img');
      svg.appendChild(im);
      /* during a search the drawing steps back so what fits stands out (CCR Ayyam) */
      var dim = document.createElementNS(SVG, 'rect');
      dim.setAttribute('width', fl.w); dim.setAttribute('height', fl.h); dim.setAttribute('class', 'plan-dim');
      svg.appendChild(dim);
      var defs = document.createElementNS(SVG, 'defs');
      defs.innerHTML = '<filter id="u-glow-f" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="9" result="b"/>' +
        '<feMerge><feMergeNode in="b"/><feMergeNode in="b"/></feMerge></filter>';
      svg.appendChild(defs);
      glowLayer = document.createElementNS(SVG, 'g');
      glowLayer.setAttribute('class', 'u-glows');
      svg.appendChild(glowLayer);
      /* a unit that cannot be sold (sold, closed, unknown) is GREY (Muhanad, 2026-11-15: "the
         unavailable units highlighted but in grey"; until then it was veiled white). The grey
         covers the print: Najm's page prints the bank in yellow (G-13 + F-11), which would read
         as "reserved" next to the key. Still, never opened, not listed, not counted; a tap only
         says so, and never says why (sold or closed). */
      fl.units.forEach(function (u) {
        if (!notOffered(u)) return;
        var pts = u.poly.map(function (pt) { return pt.join(','); }).join(' ');
        var v = document.createElementNS(SVG, 'polygon');
        v.setAttribute('points', pts);
        v.setAttribute('class', 'u-gone');
        svg.appendChild(v);
        var g = document.createElementNS(SVG, 'polygon');
        g.setAttribute('points', pts);
        g.setAttribute('class', 'u-out');
        g.setAttribute('data-no', u.no);
        g.setAttribute('role', 'img');
        g.setAttribute('aria-label', N.t('{code} · not available', { code: fl.code + '-' + u.no }));
        g.addEventListener('click', function () { sayOut(u); });
        svg.appendChild(g);
      });
      /* the order of the layers: printed page, grey rooms, the search's dimming, halos, units (the
         dimming must fall on the grey too, or a sold room shines during a search) */
      svg.appendChild(dim);
      svg.appendChild(glowLayer);
      /* only what is available (teal) or reserved (yellow) is drawn; the rest is the printed page alone */
      fl.units.forEach(function (u, i) {
        if (sellable(u)) shape(svg, u, true, N.t('Unit {no}, {a} m²', { no: u.no, a: size(u) }), pickUnit, i);
        else if (isHeld(u)) shape(svg, u, 'held', N.t('{code} · reserved', { code: fl.code + '-' + u.no }), sayHeld, i);
      });
      (fl.zones || []).forEach(function (z, i) {
        var n = zoneOpen(z).length;
        if (n) shape(svg, z, true, N.t('{name}, {n} shares', { name: z.name, n: n }), pickZone, fl.units.length + i);
      });
      /* the final third-floor page prints no numbers: the plan shows them itself,
         where the earlier printed plan had them */
      if (fl.labels) fl.units.forEach(function (u) {
        if (!u.at) return;
        var c = document.createElementNS(SVG, 'circle');
        c.setAttribute('cx', u.at[0]); c.setAttribute('cy', u.at[1]); c.setAttribute('r', 19); c.setAttribute('class', 'u-disc');
        svg.appendChild(c);
        var t = document.createElementNS(SVG, 'text');
        t.setAttribute('x', u.at[0]); t.setAttribute('y', u.at[1] + 7.5); t.setAttribute('class', 'u-disc-no');
        t.textContent = u.no;
        svg.appendChild(t);
        /* and its area, the way Najm's other pages print it ("42 m²" in their red), which the
           medical page leaves out (Muhanad, 2026-11-15). The sheet's own figure, as on the tiles,
           written as the page writes it in both languages, since it is part of the drawing. */
        var lab = size(u) + ' m²', at = areaAt(u, lab.length);
        if (!at) return;
        var a = document.createElementNS(SVG, 'text');
        a.setAttribute('x', at.x); a.setAttribute('y', at.y + at.fs * 0.36); a.setAttribute('class', 'u-area');
        a.style.fontSize = at.fs + 'px';
        a.textContent = lab;
        svg.appendChild(a);
      });
      canvas.appendChild(svg);
    }

    /* what the list can hold: every available unit, and each zone with shares left */
    function entries(fl) {
      var out = [];
      (fl.zones || []).forEach(function (z, i) {
        var open = zoneOpen(z);
        if (open.length) out.push({ no: z.no, order: -9 + i, type: 'Zones', name: z.name, sub: N.t('{n} shares', { n: open.length }), area: open[0].area, price: open[0].price, go: function () { pickZone(z, true); } });
      });
      fl.units.filter(sellable).forEach(function (u) {
        out.push({ no: u.no, order: u.no, type: u.kind === 'pharmacy' ? 'Pharmacy' : l.kind, name: fl.code + '-' + u.no, sub: N.t('{a} m²', { a: size(u) }), area: u.indoor, price: u.price, go: function () { pickUnit(u, true); } });
      });
      return out;
    }

    function listUnits(fl) {
      var all = entries(fl);
      /* Qomor: the Type choices come from what is on this floor */
      var types = all.map(function (e) { return e.type; }).filter(function (v, i, a) { return a.indexOf(v) === i; });
      var had = fType.sel.value;
      fType.sel.textContent = '';
      var any = el('option', null, N.t('All')); any.value = ''; fType.sel.appendChild(any);
      types.forEach(function (v) { var o = el('option', null, N.t(v)); o.value = v; fType.sel.appendChild(o); });
      fType.sel.value = types.indexOf(had) >= 0 ? had : '';
      /* one kind on the floor: a choice of one is not a choice */
      fType.wrap.hidden = types.length < 2;
      var ty = fType.sel.value, sort = fSort.sel.value;
      var list = all.filter(function (e) { return (!ty || e.type === ty) && !isOff(rowOf(cur.f, e.no)); });
      var by = {
        unit: function (x, y) { return x.order - y.order; },
        price: function (x, y) { return x.price - y.price || x.order - y.order; },
        'price-desc': function (x, y) { return y.price - x.price || x.order - y.order; },
        area: function (x, y) { return x.area - y.area || x.order - y.order; },
        'area-desc': function (x, y) { return y.area - x.area || x.order - y.order; }
      };
      list.sort(by[sort] || by.unit);
      if (search.best) list.sort(function (x, y) { return (isBest(rowOf(cur.f, y.no)) ? 1 : 0) - (isBest(rowOf(cur.f, x.no)) ? 1 : 0); });
      var heldU = fl.units.filter(isHeld);
      sumN.textContent = N.t('{n} available', { n: all.length }) + (heldU.length ? ' · ' + N.t('{n} reserved', { n: heldU.length }) : '');
      shown.hidden = list.length === all.length;
      shown.textContent = N.t('{n} of {all} available shown', { n: list.length, all: all.length });
      rows.textContent = '';
      list.forEach(function (e) {
        var r = el('button', 'u-row' + (isBest(rowOf(cur.f, e.no)) ? ' is-best' : ''));
        r.type = 'button';
        r.setAttribute('data-unit', e.no);
        /* every tile here is available, so the word is not repeated on each */
        r.appendChild(el('span', 'u-no', e.name));
        r.appendChild(el('span', 'u-m2', e.sub));
        r.appendChild(el('span', 'u-pr', money(e.price)));
        r.addEventListener('click', e.go);
        rows.appendChild(r);
      });
      /* reserved, after the available ones, in yellow; seen, never opened. Sold and
         closed units are not shown, not even as a count (Muhanad, 2026-11-14). */
      if (!ty && !search.active) heldU.forEach(function (u) {
        var r = el('div', 'u-row is-held');
        r.setAttribute('data-unit', u.no);
        r.appendChild(el('span', 'u-no', fl.code + '-' + u.no));
        r.appendChild(el('span', 'u-m2', N.t('{a} m²', { a: size(u) })));
        r.appendChild(el('span', 'u-pr', N.t('Reserved')));
        rows.appendChild(r);
      });
      paintPicks();
    }

    /* the plan and the tiles say what is chosen on THIS floor, with a pin on each */
    function rowOf(f, no) {
      return found.filter(function (r) { return r.fid === f && String(r.ref.no) === String(no); })[0];
    }
    function isOff(r) { return !!(search.active && r && r.sellable && !search.isOption(r)); }
    function isBest(r) { return !!(r && search.best && r.code === search.best); }
    /* the search on the page: the floors that hold a match light, each floor card says
       how many, the plan quiets what does not match and marks the answer */
    function paintSearch() {
      var on = !!search.active;
      [].forEach.call(cards.children, function (c) {
        var f = c.getAttribute('data-floor'), n = on ? (search.byBuilding[f] || 0) : c.__n;
        var tagN = c.querySelector('.fl-n');
        tagN.textContent = on ? (n ? N.t(n === 1 ? '{n} match' : '{n} matches', { n: n }) : N.t('No match')) : (n ? N.t('{n} available', { n: n }) : N.t('None available'));
        tagN.classList.toggle('is-none', !n);
        c.classList.toggle('is-nomatch', on && !n);
      });
      if (lineReady && main.isConnected) lineReady();   /* not while the page is still being built */
      if (cur.f) markPlan();
    }
    /* ONE STATE PER UNIT (the FIND A UNIT rules in css/najm.css). While a search is on, the moment
       anything is typed: every unit that fits glows BLUE, the best fit glows GREEN (Main Marks /
       Ayyam), everything else steps back with the drawing. No button to press first. */
    function markPlan() {
      var on = !!search.active, best = null, fits = 0;
      Object.keys(shapes).forEach(function (k) {
        var r = rowOf(cur.f, k), b = isBest(r), fit = on && !b && !!(r && r.sellable && search.isOption(r));
        if (b) best = r;
        if (fit) fits++;
        var off = on && !b && !fit;
        shapes[k].classList.toggle('is-off', off);
        shapes[k].classList.toggle('is-best', b);
        shapes[k].classList.toggle('is-fit', fit);
        if (glows[k]) { glows[k].classList.toggle('is-best', b); glows[k].classList.toggle('is-fit', fit); glows[k].classList.toggle('is-off', off); }
      });
      draw.classList.toggle('is-search', on);
      /* the answer is named under the plan, so it is never lost */
      ansLine.hidden = !best;
      if (best) ansLine.textContent = N.t('{code} · {tag}. Glowing on the plan.', { code: best.code, tag: N.t(TAG[search.kind] || 'Best fit') });
      /* the key: a dot and a word each. A search: blue and green. Otherwise: teal and,
         when the floor has one, yellow (reserved) and grey (not available) */
      var fl = book.floors[cur.f], heldHere = !!(fl && fl.units.some(isHeld)), outHere = !!(fl && fl.units.some(notOffered));
      if (on) {
        key.innerHTML = (fits ? '<span class="k-fit"></span>' + N.t(search.budget ? 'Fits the client' : 'Matches') : '') +
          (best ? '<span class="k-best"></span>' + N.t(TAG[search.kind] || 'Best fit') : '');
        key.hidden = !fits && !best;
      } else {
        key.innerHTML = '<span class="k-free"></span>' + N.t('Available') + (heldHere ? '<span class="k-held"></span>' + N.t('Reserved') : '') +
          (outHere ? '<span class="k-out"></span>' + N.t('Not available') : '');
        key.hidden = !heldHere && !outHere;
      }
    }
    function paintPicks() {
      var here = picks.filter(function (x) { return x.f === cur.f; });
      var has = function (no) { return here.some(function (x) { return String(x.o.no) === String(no); }); };
      Object.keys(shapes).forEach(function (k) {
        shapes[k].classList.toggle('is-chosen', has(k));
        if (glows[k]) glows[k].classList.toggle('is-chosen', has(k));
      });
      draw.classList.toggle('has-pick', here.length > 0);
      draw.classList.toggle('is-many', many);
      [].forEach.call(rows.querySelectorAll('.u-row'), function (r) { r.classList.toggle('is-on', has(r.getAttribute('data-unit'))); });
      [].forEach.call(canvas.querySelectorAll('.plan-pin'), function (n) { n.remove(); });
      var fl = book.floors[cur.f];
      if (fl) here.forEach(function (x) {
        var o = x.o, cx = 0, cy = 0;
        o.poly.forEach(function (pt) { cx += pt[0]; cy += pt[1]; });
        var at = o.at && !o.shares ? o.at : [cx / o.poly.length, cy / o.poly.length];
        var pin = el('span', 'plan-pin', o.shares ? o.name : String(o.no));
        pin.style.left = (at[0] / fl.w * 100) + '%';
        pin.style.top = (at[1] / fl.h * 100) + '%';
        canvas.appendChild(pin);
      });
      swN.textContent = many && picks.length ? picks.length + ' selected' : '';
      markPlan();
    }

    function showCard(scroll) {
      s3.node.hidden = !picks.length;
      if (!picks.length) return;
      s3.title.textContent = picks.length > 1 ? N.t('Selected units') : N.t('Unit details');
      if (picks.length > 1) groupCard();
      else if (picks[0].o.shares) zoneCard(picks[0].o, zoneOpen(picks[0].o));
      else unitCard(picks[0].o, picks[0].f);
      if (scroll) go(s3.node);
    }

    function pickUnit(u, scroll) {
      if (!sellable(u)) return;                         /* fail closed */
      var fl = book.floors[cur.f];
      if (many) {
        var at = -1;
        picks.forEach(function (x, i) { if (x.o === u) at = i; });
        if (at >= 0) picks.splice(at, 1); else picks.push({ f: cur.f, o: u });
        paintPicks();
        showCard(false);                                /* the agent is still choosing */
        said.textContent = picks.length ? N.t(picks.length === 1 ? '{n} unit selected. Tap another to add it.' : '{n} units selected. Tap another to add it.', { n: picks.length }) : N.t('Tap each unit to add it. Tap it again to take it off.');
        return;
      }
      picks = [{ f: cur.f, o: u }];
      paintPicks();
      bringIn(u);
      said.textContent = N.t('Unit {code} · {a} m² · glowing on the plan.', { code: fl.code + '-' + u.no, a: size(u) });
      showCard(scroll);
    }

    /* zoomed in: the unit just opened is brought to the middle of the window (the agent's own
       panning is left alone otherwise) */
    function bringIn(o) {
      var fl = book.floors[cur.f];
      if (!fl || !zoom.index() || !o.poly) return;
      var mx = 0, my = 0;
      o.poly.forEach(function (pt) { mx += pt[0]; my += pt[1]; });
      zoom.centreOn(mx / o.poly.length / fl.w, my / o.poly.length / fl.h);
    }

    function pickZone(z, scroll) {
      var open = zoneOpen(z);
      if (!open.length) return;                         /* fail closed */
      if (many) { said.textContent = N.t('A zone is chosen by its number of shares. Turn off Select several units to open it.'); return; }
      picks = [{ f: cur.f, o: z }];
      paintPicks();
      bringIn(z);
      said.textContent = N.t('{name} · {n} shares · glowing on the plan.', { name: z.name, n: open.length });
      showCard(scroll);
    }

    function facts(list) {
      var dl = el('dl', 'facts');
      list.forEach(function (kv) {
        if (!kv[1]) return;
        var w = el('div'); w.appendChild(el('dt', null, N.t(kv[0]))); w.appendChild(el('dd', null, kv[1])); dl.appendChild(w);
      });
      return dl;
    }

    /* step 3: the unit card, its price and its plans */
    function unitCard(u, f) {
      s3.body.textContent = '';
      var fl = book.floors[f];
      var c = el('div', 'u-card');
      var t = el('div', 'u-title');
      t.appendChild(el('span', 'u-big', fl.code + '-' + u.no));
      t.appendChild(el('span', 'u-sub', u.code + ' · ' + N.tx.floor(f) + ' · ' + N.t(l.name)));
      c.appendChild(t);
      c.appendChild(priceLine(u.price));
      c.appendChild(facts([
        ['Indoor', m2(u.indoor)],
        ['Outdoor', u.outdoor ? m2(u.outdoor) : ''],
        ['Priced on', m2(u.area)],
        ['Price per m²', N.tx.egp(u.perM)],
        ['Delivered', delivered(l)],
        ['Delivery', N.t('3.5 years from the contract')],
        ['Maintenance', u.maintenance ? pct(u.maintenance / u.price) + ' · ' + N.tx.egp(u.maintenance) : '']
      ]));
      if (l.operator) c.appendChild(el('p', 'l-op', N.t(l.operator)));
      c.appendChild(planBlock([{ price: u.price, kind: u.kind, u: u, f: f }], rowOf(f, u.no)));
      c.appendChild(el('p', 'src', asOf(book)));
      s3.body.appendChild(c);
    }

    /* several units, one deal: each row can be taken off; every figure is the sum of
       the units' own figures, so the offer for the whole equals its parts to the pound */
    function groupCard() {
      s3.body.textContent = '';
      var us = picks.map(function (x) { return x.o; });
      var sum = function (k) { return us.reduce(function (n, u) { return n + (u[k] || 0); }, 0); };
      var floors = picks.map(function (x) { return x.f; }).filter(function (v, i, a) { return a.indexOf(v) === i; });
      var c = el('div', 'u-card');
      var t = el('div', 'u-title');
      /* one unit to the client (2026-11-14): the codes joined, as the offer prints them; the rows below still let the agent take one off */
      t.appendChild(el('span', 'u-big', picks.map(function (x) { return book.floors[x.f].code + '-' + x.o.no; }).join(' + ')));
      t.appendChild(el('span', 'u-sub', N.tx.floors(floors) + ' · ' + N.t(l.name)));
      c.appendChild(t);
      c.appendChild(priceLine(sum('price')));
      var list = el('div', 'u-group');
      picks.forEach(function (x, i) {
        var u = x.o, r = el('div', 'u-g');
        r.appendChild(el('span', 'u-g-c', book.floors[x.f].code + '-' + u.no));
        r.appendChild(el('span', 'u-g-m', N.t('{a} m²', { a: size(u) })));
        r.appendChild(el('span', 'u-g-p', money(u.price)));
        var off = el('button', 'u-g-x', '×');
        off.type = 'button';
        off.setAttribute('aria-label', N.t('Take off {code}', { code: book.floors[x.f].code + '-' + u.no }));
        off.addEventListener('click', function () { picks.splice(i, 1); paintPicks(); showCard(false); });
        r.appendChild(off);
        list.appendChild(r);
      });
      c.appendChild(list);
      c.appendChild(facts([
        ['Indoor', m2(sum('indoor'))],
        ['Outdoor', sum('outdoor') ? m2(sum('outdoor')) : ''],
        ['Priced on', m2(sum('area'))],
        ['Delivered', delivered(l)],
        ['Maintenance', sum('maintenance') ? pct(sum('maintenance') / sum('price')) + ' · ' + N.tx.egp(sum('maintenance')) : '']
      ]));
      if (l.operator) c.appendChild(el('p', 'l-op', N.t(l.operator)));
      c.appendChild(planBlock(picks.map(function (x) { return { price: x.o.price, kind: x.o.kind, u: x.o, f: x.f }; })));
      c.appendChild(el('p', 'src', asOf(book)));
      s3.body.appendChild(c);
    }

    function zoneCard(z, open) {
      s3.body.textContent = '';
      var c = el('div', 'u-card');
      var t = el('div', 'u-title');
      t.appendChild(el('span', 'u-big', z.name));
      t.appendChild(el('span', 'u-sub', N.t(z.who) + ' · ' + N.tx.floor(cur.f) + ' · ' + N.t(l.name)));
      c.appendChild(t);
      var pic = new Image(); pic.src = z.img; pic.alt = N.t('{name} on the plan', { name: z.name }); pic.className = 'z-pic';
      c.appendChild(pic);
      c.appendChild(el('p', 'q-k', N.t('Shares')));
      var pick = el('select', 'q-select');
      pick.setAttribute('aria-label', N.t('Number of shares'));
      open.forEach(function (x, i) { var o = el('option', null, N.t(i ? '{n} shares' : '{n} share', { n: i + 1 })); o.value = i + 1; pick.appendChild(o); });
      c.appendChild(pick);
      var priceN = el('p', 'u-price');
      priceN.appendChild(el('span', 'u-cur', N.t('EGP')));
      priceN.appendChild(document.createTextNode(' '));
      var priceV = el('span', 'q-v u-pv');
      priceN.appendChild(priceV);
      c.appendChild(priceN);
      var codes = el('p', 'u-sub');
      c.appendChild(codes);
      var factsAt = el('div');
      c.appendChild(factsAt);
      var block = null;
      function paintZone() {
        var n = Number(pick.value), some = open.slice(0, n), first = some[0];
        var total = some.reduce(function (v, x) { return v + x.price; }, 0);
        odo(priceV, money(total));
        codes.textContent = n > 1 ? N.t('{a} to {b}', { a: first.code, b: some[n - 1].code }) : first.code;
        factsAt.textContent = '';
        factsAt.appendChild(facts([
          ['Size', m2(some.reduce(function (v, x) { return v + x.area; }, 0))],
          ['Price per m²', N.tx.egp(first.perM)],
          ['Shares left', N.t('{n} of {all}', { n: open.length, all: z.shares.length })],
          ['Delivered', delivered(l)]
        ]));
        var items = some.map(function (x) { return { price: x.price, kind: 'zone' }; });
        if (block) block.setItems(items);
        else {
          if (l.operator) factsAt.parentNode.insertBefore(el('p', 'l-op', N.t(l.operator)), factsAt.nextSibling);
          block = planBlock(items, rowOf(cur.f, z.no));
          c.appendChild(block);
        }
      }
      pick.addEventListener('change', paintZone);
      paintZone();
      c.appendChild(el('p', 'src', asOf(book)));
      s3.body.appendChild(c);
    }

    function priceLine(v) {
      var w = el('p', 'u-price');
      w.appendChild(el('span', 'u-cur', N.t('EGP')));
      w.appendChild(document.createTextNode(' '));
      var n = el('span', 'q-v u-pv');
      odo(n, money(v));
      w.appendChild(n);
      return w;
    }

    /* Main Marks' plan picker: the dropdown, the tiles, the schedule */
    function planBlock(items, row) {
      var w = el('div', 'q-plan');
      /* only a plan every chosen unit can take */
      var plans = plansFor(items[0].kind).filter(function (pl) {
        return items.every(function (x) { return plansFor(x.kind).indexOf(pl) >= 0; });
      });
      if (!plans.length) {
        var held = p.hold && p.hold[items[0].kind];
        w.appendChild(el('p', 'q-empty', N.t(held || 'These units have no payment plan in common. Offer them one at a time.')));
        w.setItems = function () {};
        return w;
      }
      w.appendChild(el('p', 'q-k', N.t('Payment plan')));
      var ps = el('select', 'q-select q-plansel');
      ps.setAttribute('aria-label', N.t('Payment plan'));
      var groups = {};
      plans.forEach(function (pl) {
        var gk = pl.group || 'plans';
        if (!groups[gk]) {
          groups[gk] = el('optgroup');
          groups[gk].label = N.t(p.planGroups[gk] || 'Plans');
          ps.appendChild(groups[gk]);
        }
        var op = el('option', null, N.tx.plan(pl.label));
        op.value = pl.id;
        groups[gk].appendChild(op);
      });
      if (plans.some(function (pl) { return pl.id === lastPlan; })) ps.value = lastPlan;
      w.appendChild(ps);
      var figures = el('div', 'q-figs');
      w.appendChild(figures);
      /* the tiles live through every change: only what they say changes */
      var tiles = el('div', 'q-tiles'), nodes = {};
      figures.appendChild(tiles);
      var after = el('div');                            /* budget line, schedule, notes */
      figures.appendChild(after);
      function setTiles(list) {
        var keep = list.map(function (x) { return x.key; });
        Object.keys(nodes).forEach(function (k) { if (keep.indexOf(k) < 0) { nodes[k].remove(); delete nodes[k]; } });
        list.forEach(function (x, i) {
          var d = nodes[x.key];
          if (!d) {
            d = nodes[x.key] = el('div', 'q-tile');
            d.setAttribute('data-k', x.key);
            d.appendChild(el('span', 'q-lab'));
            d.appendChild(el('span', 'q-v'));
            odo(d.lastChild, x.value);
            tiles.insertBefore(d, tiles.children[i] || null);
            if (!N.reduced && d.animate && ready) d.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240, easing: 'ease-out' });
          } else odo(d.lastChild, x.value);
          if (d.firstChild.textContent !== x.label) d.firstChild.textContent = x.label;
        });
      }
      var ready = false;
      function budgetLine(sc, pl) {
        /* against what the agent typed in Find a unit: fits, or by how much it is
           over, and one tap to the plan that does fit (Main Marks). One unit only. */
        var B = search.budget;
        if (!B || !row || items.length !== 1 || sc.cash && !sc.payable) return null;
        var needC = sc.down - (B.cash || 0);
        var needQ = !sc.cash ? Math.max(sc.each, sc.lastInstalment || 0) - (B.quarter || 0) : 0;
        var box = el('div', 'q-budget');
        /* the agent typed the instalment per month: say it per month (the plan stays quarterly) */
        var perM = B.per === 'month', ev = B.every || 3;
        if (needC <= 0 && needQ <= 0) {
          box.classList.add('is-ok');
          var have = [];
          if (B.cash) have.push(N.t('{a} down of {b}', { a: money(sc.down), b: money(B.cash) }));
          if (B.quarter && !sc.cash) have.push(perM
            ? N.t('about {a} a month of {b}', { a: money(sc.each / ev), b: money(B.quarter / ev) })
            : N.t('{a} a quarter of {b}', { a: money(sc.each), b: money(B.quarter) }));
          box.appendChild(el('p', null, N.t('Within the client’s budget: {what}.', { what: have.join(' · ') })));
          return box;
        }
        box.classList.add('is-over');
        var gaps = [];
        if (needC > 0) gaps.push(N.t('{a} more cash', { a: money(needC) }));
        if (needQ > 0) gaps.push(perM ? N.t('{a} more a month', { a: money(needQ / ev) }) : N.t('{a} more a quarter', { a: money(needQ) }));
        box.appendChild(el('p', null, N.t('Over the client’s budget on this plan: needs {what}.', { what: gaps.join(N.t(' and ')) })));
        var fo = search.offer && search.isOption(row) ? search.offer(row) : null;
        if (fo && fo.id !== pl.id && plans.some(function (x) { return x.id === fo.id; })) {
          var sw2 = el('button', 'q-ghost q-tiny', N.t('Switch to {plan}', { plan: N.tx.plan(fo.label) }));
          sw2.type = 'button';
          sw2.addEventListener('click', function () { ps.value = fo.id; paint(); });
          box.appendChild(sw2);
        }
        return box;
      }
      function paint() {
        var pl = plans.filter(function (x) { return x.id === ps.value; })[0];
        lastPlan = pl.id;
        /* the card eases to its new height: going to or from cash, tiles and table change */
        var h0 = ready ? figures.offsetHeight : 0;
        var list, rest = [], fresh = null;
        {
          /* several units are ONE unit (Muhanad, 2026-11-14, as the Eliwah app): one schedule on
             their combined price, exactly what the offer PDF and the post print */
          var sc = together([N.plans.schedule({ listPrice: items.reduce(function (n, x) { return n + x.price; }, 0),
            discount: pl.discount || 0, plan: pl, terms: p.planTerms })]);
          /* a schedule that does not foot is not shown at all */
          if (!sc) { list = []; rest.push(el('p', 'q-empty', N.t('This plan could not be worked out for this unit, so it is not shown.'))); }
          else if (sc.cash) {
            list = [{ key: 'after', label: N.t('Cash payment · {p} off', { p: pct(sc.discountPct) }), value: money(sc.payable) },
                    { key: 'save', label: N.t('You save'), value: money(sc.discount) }];
            var b1 = budgetLine(sc, pl);
            if (b1) rest.push(b1);
            if (sc.maintenance) rest.push(maintNote(sc.maintenance));
          } else {
            list = [];
            /* Najm: the down payment is a share of the original price, the discount is on the rest */
            list.push({ key: 'down', label: N.t('Down payment · {p} of the price', { p: pct(pl.down) }), value: money(sc.down) });
            list.push({ key: 'each', label: N.t('Quarterly'), value: money(sc.each) });
            list.push({ key: 'count', label: N.t('Instalments'), value: String(sc.count) });
            if (sc.discount) list.push({ key: 'save', label: N.t('You save · {p} off the rest', { p: pct(sc.discountPct) }), value: money(sc.discount) });
            list.push({ key: 'total', label: N.t('Total payable'), value: money(sc.payable) });
            var b2 = budgetLine(sc, pl);
            if (b2) rest.push(b2);
            fresh = table(sc);
            rest.push(fresh);
            if (sc.maintenance) rest.push(maintNote(sc.maintenance));
          }
        }
        setTiles(list);
        after.textContent = '';
        rest.forEach(function (n) { after.appendChild(n); });
        /* the table ends where Year 4 starts BEFORE the card eases, so it never jumps after */
        rest.forEach(function (n) { if (n.__fit) n.__fit(); });
        if (ready && !N.reduced && figures.animate) {
          if (fresh) fresh.animate([{ opacity: .35 }, { opacity: 1 }], { duration: 260, easing: 'ease-out' });
          var h1 = figures.offsetHeight;
          if (h1 !== h0) {
            figures.style.overflow = 'hidden';
            figures.animate([{ height: h0 + 'px' }, { height: h1 + 'px' }], { duration: 320, easing: 'cubic-bezier(.22, .61, .36, 1)' })
              .onfinish = function () { figures.style.overflow = ''; };
          }
        }
        ready = true;
      }
      ps.addEventListener('change', paint);
      paint();
      w.setItems = function (next) { items = next; paint(); };
      /* SEND THE OFFER (build 8): as an offer PDF or a WhatsApp post, as Main Marks does
         (js/send.js). Only units: a zone share's plans are on hold. */
      if (N.send && items.every(function (x) { return x.u; })) {
        var acts = el('div', 'q-actions');
        var send = el('button', 'q-send', N.t('Send offer'));
        send.type = 'button';
        send.insertAdjacentHTML('afterbegin', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 3 10 14M21 3l-7 18-4-7-7-4 18-7z"/></svg>');
        send.addEventListener('click', function () {
          var pl = plans.filter(function (x) { return x.id === ps.value; })[0];
          N.send.start({ project: p, line: l, plan: pl, items: items.map(function (x) { return { u: x.u, f: x.f }; }) });
        });
        acts.appendChild(send);
        w.appendChild(acts);
      }
      return w;
    }

    /* AN ODOMETER. A figure is a row of cells, one per character, counted from the right,
       and they stay: a change of plan moves only the digits that changed, through the
       digits between, up if the figure grew, down if it shrank, the last digit first,
       each landing softly. A cell eases to its new digit's width; a new leading digit
       opens from nothing, a lost one closes. At rest it is the same cells, so there is
       no swap at the end and nothing to snap. */
    /* a gentle start and a soft landing: a fast start is what read as a snap */
    var ODO_MS = 560, ODO_EASE = 'cubic-bezier(.45, .05, .15, 1)', ODO_STEPS = 3;
    var charW = {};
    function widthOf(node, ch) {
      var fs = parseFloat(getComputedStyle(node).fontSize) || 16;
      var key = getComputedStyle(node).fontWeight + ch;
      if (charW[key] === undefined) {
        var m = el('span', null, ch);
        m.style.cssText = 'position:absolute;visibility:hidden;white-space:pre';
        node.appendChild(m);
        var wd = m.getBoundingClientRect().width;
        m.remove();
        if (!wd) return null;                           /* not on the page yet */
        charW[key] = wd / fs;
      }
      return charW[key];
    }
    function cellFor(ch) {
      var c = el('span', 'od');
      c.setAttribute('aria-hidden', 'true');
      var s = el('span', 'od-s');
      s.appendChild(el('i', null, ch));
      c.appendChild(s);
      c.__ch = ch;
      return c;
    }
    function settleCell(c) {
      if (c.__a) { c.__a.forEach(function (a) { a.onfinish = null; a.cancel(); }); c.__a = null; }
      var s = c.firstChild;
      s.textContent = '';
      s.appendChild(el('i', null, c.__ch));
      c.style.width = '';
    }
    function rollCell(host, c, from, to, up, k) {
      c.__ch = to;
      var isD = function (x) { return /[0-9]/.test(x); };
      var seq = [from];
      if (isD(from) && isD(to)) {
        var a = Number(from), b = Number(to);
        while (a !== b) { a = (a + (up ? 1 : 9)) % 10; seq.push(String(a)); }
        /* never more than a few digits of travel: a long spin is a blur, not a roll */
        if (seq.length > ODO_STEPS + 1) seq = seq.slice(0, ODO_STEPS).concat(seq[seq.length - 1]);
      } else seq.push(to);
      var s = c.firstChild, n = seq.length;
      s.textContent = '';
      (up ? seq : seq.slice().reverse()).forEach(function (x) { s.appendChild(el('i', null, x === '' ? ' ' : x)); });
      var far = 'translateY(' + (-(n - 1) * 1.3) + 'em)', near = 'translateY(0)';
      var opt = { duration: ODO_MS, delay: k * 22, easing: ODO_EASE, fill: 'both' };
      var w0 = from ? widthOf(host, from) : 0, w1 = to ? widthOf(host, to) : 0;
      var move = s.animate(up ? [{ transform: near }, { transform: far }] : [{ transform: far }, { transform: near }], opt);
      var size = w0 !== null && w1 !== null ? c.animate([{ width: w0 + 'em' }, { width: w1 + 'em' }], opt) : null;
      c.__a = size ? [move, size] : [move];
      move.onfinish = function () {
        if (!to) { c.remove(); return; }
        settleCell(c);
      };
    }
    function odo(node, v) {
      var old = node.__v;
      node.setAttribute('data-v', v);
      node.setAttribute('aria-label', v);
      if (old === v) return;
      node.__v = v;
      var cells = [].slice.call(node.children).filter(function (x) { return x.classList.contains('od') && x.__ch; });
      var chars = v.split('');
      if (old === undefined || N.reduced || !node.isConnected || !Element.prototype.animate) {
        node.textContent = '';
        chars.forEach(function (ch) { node.appendChild(cellFor(ch)); });
        return;
      }
      /* a roll still running ends where it was heading */
      cells.forEach(settleCell);
      var num = function (x) { return Number(String(x).replace(/[^0-9]/g, '')); };
      var up = num(v) >= num(old);
      var n = Math.max(cells.length, chars.length), lead = n - cells.length, leadNew = n - chars.length;
      for (var i = n - 1, k = 0; i >= 0; i--, k++) {
        var cell = cells[i - lead], ch = chars[i - leadNew];
        if (cell && ch === cell.__ch) continue;
        if (!cell) {                                    /* a new leading digit opens from nothing */
          cell = cellFor(ch);
          node.insertBefore(cell, node.firstChild);
          cell.__ch = ch;
          rollCell(node, cell, '', ch, up, k);
        } else if (ch === undefined) rollCell(node, cell, cell.__ch, '', up, k);   /* a lost one closes */
        else rollCell(node, cell, cell.__ch, ch, up, k);
      }
    }

    /* several units on one plan: each keeps its own schedule (each foots on its own),
       and the figures shown are their sum, payment by payment */
    /* maintenance and delivery, under the figures: confirmed by Najm 2026-11-03 */
    function maintNote(mt) {
      return el('p', 'q-note', mt.delivery ? N.t('Maintenance {p} of the price · {amount} · due {due}, 6 months before delivery ({delivery}, 3.5 years from the contract).', { p: pct(mt.pct), amount: N.tx.egp(mt.amount), due: day(mt.due), delivery: day(mt.delivery) })
        : N.t('Maintenance {p} of the price · {amount} · due {due}, 6 months before delivery.', { p: pct(mt.pct), amount: N.tx.egp(mt.amount), due: day(mt.due) }));
    }
    function together(list) {
      if (list.some(function (x) { return !x || x.broken; })) return null;
      if (list.length === 1) return list[0];
      var add = function (k) { return list.reduce(function (n, x) { return n + (x[k] || 0); }, 0); };
      var out = {
        cash: list[0].cash, discountPct: list[0].discountPct, count: list[0].count,
        discount: add('discount'), payable: add('payable'), down: add('down'), each: add('each'),
        lastInstalment: add('lastInstalment'), list: add('list'), everyMonths: list[0].everyMonths, years: list[0].years,
        maintenance: list[0].maintenance ? Object.assign({}, list[0].maintenance, {
          amount: list.reduce(function (n, x) { return n + (x.maintenance ? x.maintenance.amount : 0); }, 0) }) : null
      };
      out.rows = list[0].rows.map(function (r, i) {
        return { kind: r.kind, no: r.no, months: r.months, due: r.due, amount: list.reduce(function (n, x) { return n + x.rows[i].amount; }, 0) };
      });
      return out;
    }

    /* the schedule, exactly as Main Marks prints it (js/lineflow.js, sheet()): six
       columns, Year / Instalment / Date / Amount / % / Yearly %, the year named on its
       first instalment with that year's share beside it. It opens on the down payment
       and the first 3 years, ends exactly where Year 4 starts, and scrolls inside
       itself for the rest, with one line saying what is below. */
    var FIRST_YEARS = 3;
    function pct2(f) { return (Math.round(f * 10000) / 100) + '%'; }
    function day2(d) { return N.tx.date2(d); }
    function table(sc) {
      var wrap = el('div', 'q-sched-wrap');
      var yearly = {};
      sc.rows.forEach(function (r) {
        if (r.kind === 'instalment') { var y = Math.ceil(r.months / 12); yearly[y] = (yearly[y] || 0) + r.amount; }
      });
      var later = sc.rows.filter(function (r) { return r.months > FIRST_YEARS * 12; });
      var box = sheet(sc, later.length ? 'q-sched q-sched-scroll' : 'q-sched', yearly);
      wrap.appendChild(box);
      if (!later.length) return wrap;
      box.setAttribute('tabindex', '0');                /* scrollable by keyboard too */
      box.setAttribute('role', 'region');
      box.setAttribute('aria-label', N.t('Payment schedule'));
      var lastY = Math.ceil(later[later.length - 1].months / 12);
      wrap.appendChild(el('p', 'q-sched-hint', N.t(later.length === 1 ? 'Year {a} to Year {b} · {n} more payment · scroll the table' : 'Year {a} to Year {b} · {n} more payments · scroll the table', { a: FIRST_YEARS + 1, b: lastY, n: later.length })));
      wrap.__fit = function () { fitSched(box); };
      requestAnimationFrame(wrap.__fit);              /* in case it was not on screen yet */
      return wrap;
    }
    function fitSched(box) {
      var first = [].filter.call(box.querySelectorAll('tbody tr'), function (tr) { return Number(tr.dataset.m) > FIRST_YEARS * 12; })[0];
      if (!first || !box.offsetHeight) return;          /* hidden: keep the CSS height */
      box.style.maxHeight = '';
      var top = first.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop;
      box.style.maxHeight = Math.round(top) + 'px';
    }
    window.addEventListener('resize', function () {
      [].forEach.call(document.querySelectorAll('.q-sched-scroll'), fitSched);
    });
    function sheet(sc, cls, yearly) {
      var box = el('div', cls);
      var tb = el('table');
      var hr = el('tr');
      ['Year', 'Instalment', 'Date', 'Amount (EGP)', '%', 'Yearly %'].forEach(function (h) { hr.appendChild(el('th', null, N.t(h))); });
      var thead = el('thead'); thead.appendChild(hr); tb.appendChild(thead);
      var body = el('tbody');
      var seenYear = {};
      sc.rows.forEach(function (r) {
        var tr = el('tr');
        if (r.kind === 'down') {
          if (!r.amount) return;                        /* 0% down: no row */
          tr.className = 'is-dp';
          tr.appendChild(el('td', null, N.t('DP')));
          tr.appendChild(el('td', null, N.t('Down payment')));
          tr.appendChild(el('td', null, day2(r.due)));
          tr.appendChild(el('td', 'num', money(r.amount)));
          tr.appendChild(el('td', 'num', pct2(r.amount / sc.payable)));
          tr.appendChild(el('td', 'num', pct2(r.amount / sc.payable)));
        } else {
          var y = Math.ceil(r.months / 12), first = !seenYear[y];
          seenYear[y] = true;
          if (first) tr.className = 'is-year';
          tr.appendChild(el('td', null, first ? N.t('Year {n}', { n: y }) : ''));
          tr.appendChild(el('td', null, N.t('Inst. {n}', { n: r.no })));
          tr.appendChild(el('td', null, day2(r.due)));
          tr.appendChild(el('td', 'num', money(r.amount)));
          tr.appendChild(el('td', 'num', pct2(r.amount / sc.payable)));
          tr.appendChild(el('td', 'num', first ? pct2(yearly[y] / sc.payable) : ''));
        }
        tr.dataset.m = r.months;
        body.appendChild(tr);
      });
      tb.appendChild(body);
      box.appendChild(tb);
      return box;
    }

    /* one floor only (Administrative, Medical): it is already chosen */
    if (l.floors.length === 1) setTimeout(function () { pickFloor(l.floors[0], false); }, 0);
    lineReady = function () {
      /* during a search every floor that holds a match stays lit, even with one open: the plan
         now opens the best floor by itself (2026-11-14), and the other floor's matches must show */
      if (search.active && (search.buildings || []).length) light('m:' + search.buildings.join(','));
      else if (cur.f) light('f:' + cur.f);
      else if (search.active) light('m:');
      else light(l.id);
    };

    /* the search goes live last: everything it touches now exists */
    if (finder) {
      finder.onChange(function (out) {
        search = out;
        /* THE PLAN ANSWERS AS THE AGENT TYPES (2026-11-14): with no floor open, or one that holds
           no match, the plan opens by itself on the floor of the best fit (or the floor with the
           most matches), without moving the page, and glows */
        if (out.active && out.total) {
          var bestRow = found.filter(function (r) { return r.code === out.best; })[0];
          var want = bestRow ? bestRow.fid : out.buildings[0];
          if (want && (!cur.f || !out.byBuilding[cur.f])) pickFloor(want, false);
        }
        paintSearch();
        if (cur.f) listUnits(book.floors[cur.f]);
      });
      finder.onPickBuilding(function (f) { pickFloor(f, true); });
      finder.onShowUnit(function (u, planId) {
        if (!u.sellable) return;                        /* fail closed: only a sellable unit is opened */
        if (cur.f !== u.fid) pickFloor(u.fid, false);
        if (planId) lastPlan = planId;
        if (u.kind === 'zone') pickZone(u.ref, false);
        else if (many && picks.some(function (x) { return x.o === u.ref; })) showCard(false);
        else pickUnit(u.ref, false);
        go(s2.node);                                    /* the plan first: the unit glows there */
      });
      finder.setUnits(found);
    }

    return s;
  }

  /* ---- THE PLAN'S ZOOM (Muhanad, 2026-11-14: "make a zoom in and out for the layout").
     CCR's js/zoom.js, cut down: the zoom widens the canvas inside a fixed window rather than
     scaling it, so scrolling, touch panning and everything placed on the plan in percent
     (outlines, pins) work with no extra code. It stops at 1.4x the picture's own pixels (CCR's
     rule: past that it only gets blurrier). A mouse drags to pan; the drag starts only after
     the pointer has moved, and the click that ends a drag picks nothing (CCR, 2026-09-16). ---- */
  function planZoom(view, canvas, bar) {
    var LEVELS = [1, 1.5, 2, 3, 4], zi = 0, imgW = 0;
    var touch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    var hint = el('span', 'pz-hint');
    bar.appendChild(hint);
    var ctl = el('span', 'pz');
    ctl.className = 'pz-ctl';
    bar.appendChild(ctl);
    function btn(label, path) {
      var b = el('button', 'pz-b');
      b.type = 'button';
      b.setAttribute('aria-label', label);
      b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + path + '"/></svg>';
      ctl.appendChild(b);
      return b;
    }
    var out = btn(N.t('Zoom out'), 'M6 12h12');
    var read = el('button', 'pz-read', '100%');
    read.type = 'button';
    read.setAttribute('aria-label', N.t('Back to the whole floor'));
    ctl.appendChild(read);
    var inn = btn(N.t('Zoom in'), 'M12 6v12M6 12h12');
    function top() {
      if (!imgW || !view.clientWidth) return LEVELS.length - 1;
      var cap = Math.max(2, imgW / view.clientWidth * 1.4), m = 0;
      LEVELS.forEach(function (L, i) { if (L <= cap + 1e-6) m = i; });
      return m;
    }
    function centre() {
      var w = canvas.offsetWidth || 1, h = canvas.offsetHeight || 1;
      return { x: (view.scrollLeft + view.clientWidth / 2) / w, y: (view.scrollTop + view.clientHeight / 2) / h };
    }
    function set(i, c) {
      c = c || centre();
      zi = Math.max(0, Math.min(top(), i));
      view.classList.toggle('is-zoomed', zi > 0);
      canvas.style.width = (LEVELS[zi] * 100) + '%';
      /* the same point of the plan stays in the middle of the window */
      view.scrollLeft = c.x * canvas.offsetWidth - view.clientWidth / 2;
      view.scrollTop = c.y * canvas.offsetHeight - view.clientHeight / 2;
      read.textContent = Math.round(LEVELS[zi] * 100) + '%';
      out.disabled = zi === 0;
      inn.disabled = zi >= top();
      hint.textContent = zi ? N.t(touch ? 'Swipe to move around the plan' : 'Drag to move around the plan') : '';
    }
    out.addEventListener('click', function () { set(zi - 1); });
    inn.addEventListener('click', function () { set(zi + 1); });
    read.addEventListener('click', function () { set(0, { x: 0.5, y: 0.5 }); });
    view.addEventListener('keydown', function (e) {
      if (e.key === '+' || e.key === '=') { set(zi + 1); e.preventDefault(); }
      else if (e.key === '-' || e.key === '_') { set(zi - 1); e.preventDefault(); }
    });
    var SLOP = 4, drag = null, dragged = false;
    view.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || !zi || e.button !== 0) return;
      dragged = false;
      drag = { x: e.clientX, y: e.clientY, l: view.scrollLeft, t: view.scrollTop, id: e.pointerId, on: false };
    });
    view.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.on) {
        if (Math.abs(dx) < SLOP && Math.abs(dy) < SLOP) return;   /* still a click */
        drag.on = true; dragged = true;
        try { view.setPointerCapture(drag.id); } catch (err) { /* the pointer is gone */ }
        view.classList.add('is-dragging');
      }
      view.scrollLeft = drag.l - dx;
      view.scrollTop = drag.t - dy;
      e.preventDefault();
    });
    var end = function () { drag = null; view.classList.remove('is-dragging'); };
    view.addEventListener('pointerup', end);
    view.addEventListener('pointercancel', end);
    view.addEventListener('click', function (e) {
      if (!dragged) return;
      dragged = false; e.stopPropagation(); e.preventDefault();
    }, true);
    set(0, { x: 0.5, y: 0.5 });
    return {
      index: function () { return zi; },
      /* a new floor: its picture's width sets how far it may zoom; it opens whole */
      reset: function (fl) { imgW = fl.w; set(0, { x: 0.5, y: 0.5 }); },
      centreOn: function (x, y) {
        view.scrollLeft = x * canvas.offsetWidth - view.clientWidth / 2;
        view.scrollTop = y * canvas.offsetHeight - view.clientHeight / 2;
      }
    };
  }

  function step(n, title) {
    var node = el('section', 'step');
    var h = el('h2', 'step-h');
    h.appendChild(el('span', 'step-n', String(n)));
    var t = el('span', 'step-t', title);
    h.appendChild(t);
    node.appendChild(h);
    var body = el('div', 'step-b');
    node.appendChild(body);
    return { node: node, title: t, body: body };
  }
  /* bring a step into view, under the top edge, never with a jump */
  function go(node) {
    requestAnimationFrame(function () {
      var y = node.getBoundingClientRect().top + window.scrollY - 12;
      window.scrollTo({ top: y, behavior: N.reduced ? 'auto' : 'smooth' });
    });
  }

  /* ---- arriving: the building wakes up, floor by floor, then settles -- */
  var fromBuild = false;
  try { fromBuild = !!sessionStorage.getItem('najm.enter'); sessionStorage.removeItem('najm.enter'); } catch (e) { /* plain */ }
  function settle() {
    if (line) { if (lineReady) lineReady(); else light(line.id); return; }
    if (swipe.matches) pick(); else light('*');
  }
  function wake() {
    if (N.reduced) { settle(); return; }
    light('*');
    setTimeout(function () { litNow = null; settle(); }, 1500);
  }
  if (fromBuild) {
    var veil = el('div', 'vveil');
    veil.style.setProperty('--vb-ground', p.ci.ground);
    document.body.appendChild(veil);
    void veil.offsetWidth;
    document.documentElement.classList.remove('v-arrive');
    N.steady({ images: [st.img].concat(p.lines.map(function (x) { return x.pic; })), cap: 600 }, function () {
      requestAnimationFrame(function () {
        veil.classList.add('is-out');
        setTimeout(function () { veil.remove(); N.frameBg(''); }, 900);
        setTimeout(wake, 380);
      });
    });
  } else {
    setTimeout(wake, 250);
  }

  var row = document.querySelector('.l-cards');
  if (row) {
    var raf = 0;
    row.addEventListener('scroll', function () {
      if (raf) return;
      raf = requestAnimationFrame(function () { raf = 0; if (litNow !== null || swipe.matches) pick(); });
    }, { passive: true });
  }
  window.addEventListener('resize', function () { var k = litNow; litNow = null; light(k); });
}());
