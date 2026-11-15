/* ------------------------------------------------------------------
   Najm: the projects page. One card per project; a card opens through
   that project's own logo build (Main Marks' markbuild, in VELN's CI).
   ------------------------------------------------------------------ */

(function () {
  'use strict';
  var N = window.NJ, el = N.el;
  if (!N.guard()) return;

  var app = document.getElementById('app');
  app.appendChild(N.header([{ label: 'Projects' }]));

  var main = el('main', 'pj');
  var intro = el('div', 'pj-intro');
  intro.appendChild(el('p', 'eyebrow', N.t('Our')));
  intro.appendChild(el('h1', 'script-h', N.t('Projects')));
  main.appendChild(intro);

  var grid = el('div', 'pj-grid');
  CONFIG.projects.forEach(function (p) { grid.appendChild(card(p)); });
  main.appendChild(grid);
  app.appendChild(main);
  app.appendChild(N.salesBar());

  N.arrive(CONFIG.projects.map(function (x) { return x.card; }));
  /* what the project page needs, fetched while nothing is happening */
  N.warm(['project.html', 'js/project.js?v=' + CONFIG.stamp, 'js/plans.js?v=' + CONFIG.stamp, 'js/finder.js?v=' + CONFIG.stamp, 'js/units.js?v=' + CONFIG.stamp]
    .concat([].concat.apply([], CONFIG.projects.map(function (x) { return [x.stage.img].concat(x.lines.map(function (y) { return y.pic; })); }))));

  function card(p) {
    var a = el('a', 'pj-card');
    a.href = 'project.html?p=' + encodeURIComponent(p.id);
    a.setAttribute('data-own', '');               /* opens through its own build, not the plain veil */
    a.setAttribute('aria-label', N.t('Open {name}', { name: p.name }));

    var pic = el('div', 'pj-pic');
    var im = new Image();
    im.src = p.card; im.alt = N.t('{name}, {place}, at night', { name: p.name, place: N.t(p.place) });
    pic.appendChild(im);
    var lock = el('div', 'pj-lock');
    lock.appendChild(N.inlineSvg(p.logo, 'veln-logo'));
    pic.appendChild(lock);
    a.appendChild(pic);

    var meta = el('div', 'pj-meta');
    meta.appendChild(el('p', 'pj-kind', [N.t(p.kind), N.t(p.place), N.t(p.where)].join(' · ')));
    var dl = el('dl', 'facts');
    p.facts.forEach(function (f) {
      var w = el('div');
      w.appendChild(el('dt', null, N.t(f.k)));
      w.appendChild(el('dd', null, N.t(f.v)));
      dl.appendChild(w);
    });
    meta.appendChild(dl);
    var go = el('div', 'go');
    go.appendChild(el('span', null, N.t('Open {name}', { name: p.name })));
    go.insertAdjacentHTML('beforeend', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6"/></svg>');
    meta.appendChild(go);
    a.appendChild(meta);

    /* the build's logo is read now, so the tap finds it ready */
    var mark = N.inlineSvg(p.logo, 'vb-logo');
    a.addEventListener('click', function (e) {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      build(p, mark, a.href);
    });
    return a;
  }

  /* ---- VELN's logo build ---------------------------------------------
     VELN's beige rises over the page; the wordmark is DRAWN (its own
     outlines, stroked, then filled), NEW CAIRO spaces in letter by
     letter, a gold rule runs under it, and the page is handed over.
     About 1.9 s. Reduced motion: the beige and the logo, no drawing. */
  function build(p, mark, href) {
    var o = el('div', 'vbuild');
    o.style.setProperty('--vb-ground', p.ci.ground);
    N.frameBg(p.ci.ground);
    o.style.setProperty('--vb-ink', p.ci.ink);
    o.style.setProperty('--vb-gold', p.ci.gold);
    o.appendChild(mark);
    o.appendChild(el('span', 'vb-rule'));
    var paths = mark.querySelectorAll('path');
    [].forEach.call(paths, function (q, i) {
      q.setAttribute('pathLength', '1');
      q.style.setProperty('--i', i);
    });
    document.body.appendChild(o);
    /* NEW CAIRO is the row of small letters, lowest in the logo's own space */
    [].forEach.call(paths, function (q) {
      try { if (q.getBBox().y > 690) q.classList.add('vb-small'); } catch (e) { /* drawn all the same */ }
    });
    void o.offsetWidth;
    o.classList.add('is-in');
    try { sessionStorage.setItem('najm.enter', p.id); } catch (e) { /* arrives plain */ }
    setTimeout(function () { o.classList.add('is-out'); }, N.reduced ? 300 : 1650);
    setTimeout(function () { location.assign(href); }, N.reduced ? 420 : 1900);
  }
}());
