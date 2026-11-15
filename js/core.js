/* ------------------------------------------------------------------
   Najm: what every page shares.

   The same jobs as Main Marks' brand.js + auth.js, cut to this build:
   the session, the header card, the sales agent's bar, moving between
   pages, and the STAR CROSSING (Najm's "Access granted").
   ------------------------------------------------------------------ */

(function () {
  'use strict';

  var N = window.NJ = window.NJ || {};          /* js/i18n.js has already put N.t, N.lang here */

  N.el = function (tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  /* Najm's own star: the one above the j in the logo, lifted exactly
     (img/najm-logo.svg, id="star") and put on a unit box, centre 0,0. */
  N.STAR = 'M0.057,-1L-0.057,-1C-0.057,-0.48 -0.48,-0.057 -1,-0.057L-1,0.057C-0.48,0.057 -0.057,0.48 -0.057,1' +
           'L0.057,1C0.057,0.48 0.48,0.057 1,0.057L1,-0.057C0.48,-0.057 0.057,-0.48 0.057,-1Z';
  N.starSvg = function (cls) {
    var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '-1 -1 2 2');
    s.setAttribute('aria-hidden', 'true');
    if (cls) s.setAttribute('class', cls);
    var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', N.STAR);
    s.appendChild(p);
    return s;
  };

  /* An SVG logo put INTO the page (not as an <img>), so its parts can move. */
  N.inlineSvg = function (src, cls) {
    var box = N.el('span', 'svgbox' + (cls ? ' ' + cls : ''));
    fetch(src).then(function (r) { return r.text(); }).then(function (txt) {
      box.innerHTML = txt.replace(/<\?xml[^>]*>/, '');
      var s = box.querySelector('svg');
      if (s) { s.removeAttribute('width'); s.removeAttribute('height'); s.setAttribute('aria-hidden', 'true'); }
      box.dispatchEvent(new CustomEvent('svgready'));
    }).catch(function () { var i = new Image(); i.src = src; i.alt = ''; box.appendChild(i); });
    return box;
  };

  /* ---- the session (DEMO: this browser only) ------------------------ */
  var KEY = 'najm.session';
  N.auth = {
    current: function () {
      try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; }
    },
    signIn: function (who, code) {
      who = String(who || '').trim().toLowerCase();
      if (!who || !code) return { ok: false, why: N.t('Enter your work email and password.') };
      var u = (CONFIG.users || []).filter(function (x) { return x.email === who; })[0];
      if (!u || u.code !== code) return { ok: false, why: N.t('That email and password do not match.') };
      var s = { email: u.email, name: u.name, role: u.role, at: Date.now() };
      if (u.title) s.title = u.title;
      try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* private window: this page only */ }
      return { ok: true, session: s };
    },
    signOut: function () { try { localStorage.removeItem(KEY); } catch (e) { /* nothing kept */ } }
  };

  /* every page but the sign-in: no session, no page */
  /* the account behind the session (its companies are read from it, never from storage) */
  N.me = function () {
    var s = N.auth.current();
    return s ? (CONFIG.users || []).filter(function (x) { return x.email === s.email; })[0] || null : null;
  };
  /* the companies this person handles, by name, from js/brokers.js. A sales agent: the
     ones the broker sheet names them on (two agents on a company: both see it). A
     manager: the ones it names them on, for now; their team's view comes next. */
  N.companies = function (me) {
    var B = window.NJ_BROKERS;
    if (!B || !me) return [];
    if (me.allCompanies) return B.names.slice();
    var idx = {};
    (me.agentAs || []).forEach(function (k) { (B.agent[k] || []).forEach(function (i) { idx[i] = 1; }); });
    (me.managerAs || []).forEach(function (k) { (B.manager[k] || []).forEach(function (i) { idx[i] = 1; }); });
    return Object.keys(idx).map(Number).sort(function (a, b) { return a - b; }).map(function (i) { return B.names[i]; });
  };

  N.guard = function () {
    if (N.auth.current()) return true;
    var here = location.pathname.split('/').pop() + location.search;
    location.replace('login.html?next=' + encodeURIComponent(here));
    return false;
  };

  N.initials = function (name) {
    return String(name || '?').split(/\s+/).filter(Boolean).slice(-2).map(function (w) { return w[0]; }).join('').toUpperCase();
  };

  /* ---- a short notice at the foot of the screen --------------------- */
  var toastT;
  N.toast = function (msg) {
    var t = document.querySelector('.toast') || document.body.appendChild(N.el('div', 'toast'));
    t.textContent = msg;
    t.classList.add('on');
    clearTimeout(toastT);
    toastT = setTimeout(function () { t.classList.remove('on'); }, 2200);
  };

  /* ---- the header: a floating glass card, never sticky -------------- */
  /* back: { label, href }, the page one step up (Main Marks' crumbs .back, on every page but the first) */
  N.header = function (crumbs, back) {
    var me = N.auth.current() || {};
    var h = N.el('header', 'hdr');
    var card = N.el('div', 'hdr-card');
    var home = N.el('a', 'hdr-mark');
    home.href = 'index.html';
    home.setAttribute('aria-label', N.t('Najm Developments, projects'));
    home.appendChild(N.inlineSvg('img/najm-logo.svg', 'najm-logo'));
    card.appendChild(home);

    var crumb = N.el('nav', 'hdr-crumb');
    (crumbs || []).forEach(function (c, i) {
      if (i) crumb.appendChild(N.el('span', 'sep', '/'));
      var a = N.el(c.href ? 'a' : 'span', c.href ? null : 'here', c.label);
      if (c.href) a.href = c.href;
      crumb.appendChild(a);
    });
    card.appendChild(crumb);

    var who = N.el('button', 'hdr-who', N.initials(me.name));
    who.type = 'button';
    who.setAttribute('aria-label', N.t('Account'));
    var menu = N.el('div', 'hdr-menu');
    menu.hidden = true;
    menu.appendChild(N.el('p', 'hm-name', me.name || ''));
    menu.appendChild(N.el('p', 'hm-role', N.t(((CONFIG.roles[me.role] || {}).label) || '')));
    var out = N.el('button', 'hm-out', N.t('Sign out'));
    out.type = 'button';
    out.addEventListener('click', function () { N.auth.signOut(); N.leave('login.html'); });
    menu.appendChild(out);
    who.addEventListener('click', function (e) { e.stopPropagation(); menu.hidden = !menu.hidden; });
    document.addEventListener('click', function () { menu.hidden = true; });
    if (N.langSwitch) card.appendChild(N.langSwitch());
    card.appendChild(who);
    card.appendChild(menu);
    h.appendChild(card);
    if (back) {
      var nav = N.el('nav', 'crumbs');
      nav.setAttribute('aria-label', N.t('Back'));
      var a = N.el('a', 'back');
      a.href = back.href;
      a.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>';
      a.appendChild(N.el('span', null, back.label));
      nav.appendChild(a);
      h.appendChild(nav);
    }
    return h;
  };

  /* ---- the sales agent's bar, on every page (as Main Marks) --------
     build 13: Quick offer is the sales app (the projects page), My activity
     and Profile are my.html, the plus opens its record form (Main Marks'
     my.html#record). o: { here: the button of this page, go(k): the page
     answers a tap itself (true) or leaves it to the bar (false) }. My
     activity is a sales agent's page; the manager's view is not built. */
  var ROUTE = { offer: 'index.html', pulse: 'my.html', me: 'my.html#profile', plus: 'my.html#record' };
  function route(k) {
    var me = N.me();
    if (k !== 'offer' && (!me || me.role !== 'sales')) { N.toast(N.t('My activity is a sales agent’s page. The manager’s view comes next.')); return; }
    N.leave(ROUTE[k]);
  }
  N.salesBar = function (o) {
    o = o || {};
    var bar = N.el('nav', 'sbar');
    bar.setAttribute('aria-label', N.t('Sales'));
    var ICON = {
      offer: 'M5 4h10l4 4v12H5zM14 4v5h5M8 13h8M8 17h5',
      pulse: 'M3 12h4l2-5 4 10 2-5h6',
      me: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20c1.5-4 4.5-6 8-6s6.5 2 8 6'
    };
    [['offer', 'Quick offer'], ['pulse', 'My activity'], ['me', 'Profile']].forEach(function (b) {
      var k = N.el('button', 'sb-btn');
      k.type = 'button';
      k.dataset.k = b[0];
      if (o.here === b[0]) k.setAttribute('aria-current', 'page');
      k.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + ICON[b[0]] + '"/></svg>';
      k.appendChild(N.el('span', null, N.t(b[1])));
      k.addEventListener('click', function () { if (!(o.go && o.go(b[0]))) route(b[0]); });
      bar.appendChild(k);
    });
    var plus = N.el('button', 'sb-plus');
    plus.type = 'button';
    plus.setAttribute('aria-label', N.t('Record'));
    plus.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
    plus.addEventListener('click', function () { if (!(o.go && o.go('plus'))) route('plus'); });
    /* the heartbeat's page is fetched while nothing happens, so the pulse starts at once (Main Marks build 132) */
    if (!o.here && N.warm) N.warm(['my.html', 'js/activity-book.js?v=' + CONFIG.stamp, 'js/activity.js?v=' + CONFIG.stamp, 'css/activity.css?v=' + CONFIG.stamp]);
    var wrap = N.el('div', 'sbar-wrap');
    wrap.appendChild(bar);
    wrap.appendChild(plus);
    return wrap;
  };

  /* ---- moving between pages ------------------------------------------
     ARRIVING is CSS (body fades up, fill-mode both). LEAVING is here: a
     navy veil, 190 ms, capped by a timer so nothing can strand anyone. */
  var REDUCED = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  N.reduced = REDUCED;
  N.leave = function (href) {
    if (REDUCED) { location.assign(href); return; }
    document.documentElement.classList.add('is-leaving');
    setTimeout(function () { location.assign(href); }, 190);
  };
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target || a.origin !== location.origin || a.hasAttribute('data-own')) return;
    e.preventDefault();
    N.leave(a.href);
  });
  /* back-forward cache: a page returned to must not still be veiled */
  window.addEventListener('pageshow', function () { document.documentElement.classList.remove('is-leaving'); });

  /* ---- hand-overs: what a page does so the next one arrives clean ------
     frameBg: inside the demo's iPhone there is one empty frame between two
     pages. It shows the iframe's own colour, so it is set to the colour on
     screen; beige stayed beige instead of beige, dark, beige.
     warm: fetches the next page's files while nothing is happening.
     steady: fonts and pictures ready and three frames on time, or the cap,
     whichever comes first. A cap always: a hand-over must end in every
     order of events. */
  N.frameBg = function (colour) {
    try { if (window.frameElement) window.frameElement.style.background = colour; } catch (e) { /* not ours */ }
  };
  N.warm = function (urls) {
    function go() {
      urls.forEach(function (u) {
        if (/\.(jpe?g|png|svg)$/.test(u)) { var i = new Image(); i.src = u; }
        else if (window.fetch) fetch(u).catch(function () { /* the page loads it anyway */ });
      });
    }
    if (window.requestIdleCallback) requestIdleCallback(go, { timeout: 1200 }); else setTimeout(go, 400);
  };
  N.steady = function (o, cb) {
    var done = false;
    function go() { if (!done) { done = true; cb(); } }
    setTimeout(go, o.cap || 900);
    var waits = [];
    if (document.fonts && document.fonts.ready) waits.push(document.fonts.ready);
    (o.images || []).forEach(function (src) {
      var i = new Image(); i.src = src;
      if (i.decode) waits.push(i.decode().catch(function () { /* shown when it comes */ }));
    });
    Promise.all(waits).then(function () {
      var ok = 0, last = 0;
      function f(t) {
        if (done) return;
        ok = last && t - last < 40 ? ok + 1 : 0;
        last = t;
        if (ok >= 3) go(); else requestAnimationFrame(f);
      }
      requestAnimationFrame(f);
    });
  };

  /* ---- THE STAR CROSSING ---------------------------------------------
     Najm's "Access granted". Main Marks draws four lines; Najm opens its
     own star. Leaving: the star grows out of the point given (the Sign
     in button) until it covers the screen, the words settle and leave,
     and the page is handed over on the bare star, so no word has to cross
     between two pages. Arriving: the next page paints the same covered
     screen in its first frame (a class set in <head>), waits until it can
     keep up, then the star closes into the centre and is gone. */
  function crossNode(words) {
    var x = N.el('div', 'xstar');
    x.setAttribute('aria-hidden', 'true');
    /* the glow sits on a wrapper that does NOT grow, so it stays a thin
       teal edge instead of being blown up with the star */
    var glow = N.el('div', 'xs-glow');
    glow.appendChild(N.starSvg('xs-big'));
    x.appendChild(glow);
    if (!words) return x;
    var copy = N.el('div', 'xs-copy');
    copy.appendChild(N.starSvg('xs-mini'));
    copy.appendChild(N.el('p', 'xs-granted', N.t('Access granted')));
    copy.appendChild(N.el('p', 'xs-select', N.t('Select a project')));
    x.appendChild(copy);
    return x;
  }
  /* The star's waist (its narrowest, at 45 degrees) is 0.47 of its half
     size, so to cover the screen from (ox, oy) its half size must be at
     least 2.15 times the distance to the farthest corner. Base size 100 px. */
  function aim(x, ox, oy) {
    var W = innerWidth, H = innerHeight;
    var d = Math.max(Math.hypot(ox, oy), Math.hypot(W - ox, oy), Math.hypot(ox, H - oy), Math.hypot(W - ox, H - oy));
    x.style.setProperty('--ox', ox + 'px');
    x.style.setProperty('--oy', oy + 'px');
    x.style.setProperty('--S', (2 * 2.2 * d / 100).toFixed(2));
  }
  N.cross = function (href, from) {
    var x = crossNode(true);
    document.body.appendChild(x);
    var r = from ? from.getBoundingClientRect() : null;
    aim(x, r ? r.left + r.width / 2 : innerWidth / 2, r ? r.top + r.height / 2 : innerHeight / 2);
    try { sessionStorage.setItem('najm.cross', '1'); } catch (e) { /* arrives plain */ }
    if (REDUCED) { x.classList.add('is-plain'); }
    void x.offsetWidth;
    x.classList.add('is-in');
    N.frameBg('#0E1828');
    if (!REDUCED) setTimeout(function () { x.classList.add('is-leaving'); }, 1340);
    setTimeout(function () { location.replace(href); }, REDUCED ? 260 : 1570);
  };
  N.arrive = function (images) {
    var on = false;
    try { on = sessionStorage.getItem('najm.cross') === '1'; sessionStorage.removeItem('najm.cross'); } catch (e) { /* none */ }
    if (!on) { document.documentElement.classList.remove('x-arrive'); return; }
    var x = crossNode(false);
    x.classList.add('is-in', 'no-anim', 'is-centre');
    aim(x, innerWidth / 2, innerHeight / 2);
    document.body.appendChild(x);
    void x.offsetWidth;
    /* the star now holds the screen: the first-frame cover can go */
    document.documentElement.classList.remove('x-arrive');
    x.classList.remove('no-anim');
    N.steady({ images: images || [], cap: 450 }, function () {
      requestAnimationFrame(function () {
        x.classList.add('is-out');
        setTimeout(function () { x.remove(); N.frameBg(''); }, 1200);
      });
    });
  };
}());
