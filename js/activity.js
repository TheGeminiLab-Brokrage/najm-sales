/* ------------------------------------------------------------------
   Najm: MY ACTIVITY (build 13), Main Marks' my.html for Najm.

   Muhanad, 2026-11-05: "building the activity tab for the sales ... how it
   is exactly should build like the main marks app", with Najm's agents and
   the broker sheet, "the right way since we have all the data we need".

   WHAT IT IS (Main Marks js/manager.js, the sales agent's path, builds 121
   to 146, ported piece for piece; the same rules, the same words):
   - THE PULSE: the heartbeat on the bar opens a half-dial that sweeps in
     with a heartbeat drawn through it, alone on the screen; the page is
     built at rest under it and rises as it lifts (build 132).
   - MY SALES FIRST: the figure, the time before, what is reserved and not
     signed, four bars from request to contract, today's broadcasts against
     the daily target (builds 121, 134).
   - THE SIX TILES, in the order of the work: orientations, special
     requests, workshops, meetings, reservations, contracts. Each opens its
     list. A sales agent's figures come from rows that carry his name only.
   - MY COMPANIES: a swipe deck, one ranked list per state (gone quiet,
     active, effective, inactive), judged on requests to HIM. A company opens
     to its weeks, its figures, its latest and how it moved.
   - WHAT I ENTERED, and THE PLUS: orientation, workshop, meeting,
     reservation, contract. No "who": the entry carries the signed-in name.
   - PROFILE: the account, what the words mean, the language, sign out.
   THE RULES: active = asked in the last 2 weeks, gone quiet = in the last 4,
   inactive = earlier. An orientation led to a request when one came within
   7 business days; a workshop led to a meeting within 14. Friday is the
   day off. A split deal is half to each.

   NAJM'S OWN: a company is one the broker sheet gives the agent (the record
   form offers only those); the units are VELN's (G-22, S-23, TH-18), the
   lines Commercial, Administrative and Medical; a contract's plans are
   Najm's (a pharmacy only its own offer). The figures are the book's
   (js/activity-book.js): demo activity before today, and what this phone
   sent and recorded.
   ------------------------------------------------------------------ */
(function () {
  'use strict';

  var N = window.NJ, t = N.t, AR = N.isArabic;
  if (!N.guard()) return;

  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var nm = function (s) { return '<bdi>' + esc(s) + '</bdi>'; };

  /* ---- who may be here: a sales agent of the team. The manager's view (Team Pulse) is not built. */
  var session = N.auth.current();
  var ME = N.activity.memberOf(session.email);
  if (ME === -1) { location.replace('index.html'); return; }

  /* ---- the header and the bar ----------------------------------------- */
  var asked = (location.hash || '').slice(1);
  $('piLabel').textContent = t('My activity');
  $('sheet').setAttribute('aria-label', t('Details'));
  var mount = $('top');
  mount.appendChild(N.header([{ label: t('My activity') }], { label: t('Projects'), href: 'index.html' }));
  var bar = N.salesBar({ here: asked === 'profile' ? 'me' : 'pulse', go: function (k) { return barTap(k); } });
  document.body.appendChild(bar);
  var started = false, onTap = null;
  function barTap(k) {
    if (k === 'offer') return false;                   /* the sales app: another page */
    if (k === 'plus') { if (onTap) onTap('plus'); return true; }
    if (onTap) onTap(k);
    return true;
  }

  /* ---- THE PULSE (Main Marks build 132) --------------------------------------------------------
     On the glass from the first frame (my.html). It starts when the screen can keep up (N.steady),
     the lines are drawn (MIN), and only then is the book read and the page built, still, under the
     dial: reading 10,000 rows is real work and must never land in the sweep. Then the dial lifts and
     the cards rise. A person who asked for less motion has no pulse. Not for Profile, not for the plus. */
  var pulse = (function () {
    var el = $('pulseIn'), MIN = 1380;
    var can = !!el && !N.reduced;
    function play(then) {
      if (!can) { el.hidden = true; then(); return; }
      el.hidden = false;
      el.classList.remove('leave', 'rest', 'again');
      N.steady({ cap: 1200 }, function () {
        el.classList.add('play');
        beatBar();
        setTimeout(function () {
          el.classList.add('rest');
          /* the book and the page, built while nothing moves; then two frames on time and the lift */
          setTimeout(function () {
            then(true);
            requestAnimationFrame(function () { requestAnimationFrame(function () {
              el.classList.add('leave');
              var s = $('scr'); if (s) s.classList.add('in');
              setTimeout(function () { el.hidden = true; el.classList.remove('play', 'rest', 'leave'); }, 440);
            }); });
          }, 30);
        }, MIN);
      });
    }
    function again(then) {
      if (!can) return false;
      el.classList.add('again');
      play(then);
      return true;
    }
    function beatBar() {
      var b = document.querySelector('.sb-btn[data-k="pulse"]');
      if (b) { b.classList.remove('beat'); void b.offsetWidth; b.classList.add('beat'); }
    }
    return { play: play, again: again, skip: function () { if (el) el.hidden = true; } };
  }());

  /* the page starts at the foot of this file, once every word and table below is set: Profile and
     the plus (from another page) start at once, with no pulse to wait behind */
  function begin(held) {
    var B;
    try { B = N.activity.build(); } catch (e) {
      $('scr').innerHTML = '<section class="card"><h2>' + t('My activity') + '</h2><p class="note">' + t('The figures could not be loaded. Open the page again.') + '</p></section>';
      return;
    }
    start(B, held);
  }

  /* ---- words ----------------------------------------------------------
     A count needs a form for exactly one, and Arabic needs four: one, two,
     3 to 10, and 11 up. [en one, en many, ar 1, ar 2, ar 3-10, ar 11+] */
  var NOUN = {
    company: ['company', 'companies', 'شركة واحدة', 'شركتان', 'شركات', 'شركة'],
    meeting: ['meeting', 'meetings', 'ميتنج واحد', '2 ميتنج', 'ميتنج', 'ميتنج'],
    offer: ['offer', 'offers', 'اوفر واحد', 'اوفرين', 'اوفرات', 'اوفر'],
    request: ['request', 'requests', 'طلب واحد', 'طلبان', 'طلبات', 'طلباً'],
    broadcast: ['broadcast', 'broadcasts', 'برودكاست واحد', '2 برودكاست', 'برودكاست', 'برودكاست'],
    contract: ['contract', 'contracts', 'عقد واحد', 'عقدان', 'عقود', 'عقداً'],
    reservation: ['reservation', 'reservations', 'حجز واحد', 'حجزان', 'حجوزات', 'حجزاً'],
    cancellation: ['cancellation', 'cancellations', 'إلغاء واحد', 'إلغاءان', 'إلغاءات', 'إلغاءً'],
    post: ['WhatsApp post', 'WhatsApp posts', 'بوست واتساب واحد', 'بوستان على واتساب', 'بوستات واتساب', 'بوست واتساب'],
    pdf: ['offer PDF', 'offer PDFs', 'ملف PDF واحد', 'ملفان PDF', 'ملفات PDF', 'ملف PDF'],
    orientation: ['orientation', 'orientations', 'اورينتيشن واحد', '2 اورينتيشن', 'اورينتيشن', 'اورينتيشن'],
    workshop: ['workshop', 'workshops', 'ورك شوب واحد', '2 ورك شوب', 'ورك شوب', 'ورك شوب'],
    day: ['day', 'days', 'يوم واحد', 'يومين', 'أيام', 'يوماً'],
    entry: ['entry', 'entries', 'إدخال واحد', 'إدخالان', 'إدخالات', 'إدخالاً']
  };
  function count(n, k) {
    var W = NOUN[k];
    if (!AR) return n + ' ' + (n === 1 ? W[0] : W[1]);
    if (n === 1) return W[2];
    if (n === 2) return W[3];
    var r = n % 100;
    return N.iso(String(n)) + ' ' + (n === 0 || (r >= 3 && r <= 10) ? W[4] : W[5]);
  }
  var STATE = { active: t('Active'), quiet: t('Gone quiet'), inactive: t('Inactive'), never: t('Never asked') };
  var KIND = { special: t('Special request'), broadcast: t('Broadcast'), direct: t('Direct client'), meeting: t('Meeting'), reservation: t('Reservation'), contract: t('Contract'), cancel: t('Cancelled reservation'), orientation: t('Orientation'), workshop: t('Workshop') };
  var PROD = { 'Commercial': t('Commercial'), 'Administrative': t('Administrative'), 'Medical': t('Medical') };
  var CH = { post: t('WhatsApp post'), pdf: t('Offer PDF') };
  var WHYL = { 'Client withdrew': t('Client withdrew'), 'Payment not made': t('Payment not made'), 'Moved to another unit': t('Moved to another unit'), 'Other': t('Other') };
  var TITLE = { 'Sales': t('Sales'), 'Senior Sales': t('Senior Sales'), 'Sales supervisor': t('Sales supervisor'), 'Property Consultant': t('Property Consultant'), 'Sales agent': t('Sales agent'), 'Sales Manager': t('Sales Manager'), 'Senior Sales Manager': t('Senior Sales Manager') };
  var MON = AR ? ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
               : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var DAY = AR ? ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var prod = function (p) { return PROD[p] || p; };
  var title = function (s) { return TITLE[s] || s; };
  var ICON = { cal: '<rect x="4" y="5.5" width="16" height="15" rx="2.5"/><path d="M4 10h16M8.5 3v4M15.5 3v4"/>' };
  var svg = function (k) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON[k] + '</svg>'; };

  /* ONE RULE FOR FINDING A COMPANY BY TYPING (Main Marks build 139, MM.nameFind): a name that BEGINS
     with the letters first, then a name with a WORD that begins with them; letters found inside a word
     only from the third letter on, or when no name begins with them. */
  function nameHit(name, want) {
    var low = String(name).toLowerCase(), at = low.indexOf(want), inside = -1, c;
    while (at !== -1) {
      if (at === 0) return { rank: 0, at: 0 };
      c = low.charCodeAt(at - 1);
      if (!((c >= 0x30 && c <= 0x39) || (c >= 0x61 && c <= 0x7a) || (c >= 0x621 && c <= 0x64a))) return { rank: 1, at: at };
      if (inside === -1) inside = at;
      at = low.indexOf(want, at + 1);
    }
    return inside === -1 ? null : { rank: 2, at: inside };
  }
  function nameFind(list, typed, get) {
    var want = String(typed || '').trim().toLowerCase(), tiers = [[], [], []], begins;
    if (!want) return null;
    list.forEach(function (x) { var h = nameHit(get ? get(x) : x, want); if (h) tiers[h.rank].push({ item: x, at: h.at }); });
    begins = tiers[0].concat(tiers[1]);
    return want.length >= 3 || !begins.length ? begins.concat(tiers[2]) : begins;
  }
  /* a price typed by hand, in either script: digits, with commas or spaces between the thousands. The
     Arabic thousands mark (٬) is a separator; the Arabic decimal mark (٫), a sign or a letter is not a
     price: 0, never a guess (memory: a dropped ٫ makes a number 10 to 100 times too large). */
  function price(s) {
    var x = String(s == null ? '' : s).trim(), out = '', i, c;
    for (i = 0; i < x.length; i++) {
      c = x.charCodeAt(i);
      if (c >= 0x660 && c <= 0x669) out += String(c - 0x660);
      else if (c >= 0x6F0 && c <= 0x6F9) out += String(c - 0x6F0);
      else if (c === 0x66C || c === 0x2C || c === 0x20 || c === 0xA0) continue;
      else out += x.charAt(i);
    }
    return /^\d{1,12}$/.test(out) ? Number(out) : 0;
  }
  /* a down payment or years typed for "Another plan": 12.5, 20%, in either script; else null */
  function typedNumber(s) {
    var x = String(s == null ? '' : s).trim(), out = '', i, c;
    for (i = 0; i < x.length; i++) {
      c = x.charCodeAt(i);
      if (c >= 0x660 && c <= 0x669) out += String(c - 0x660);
      else if (c >= 0x6F0 && c <= 0x6F9) out += String(c - 0x6F0);
      else if (c === 0x66B) out += '.';
      else if (c === 0x66A) out += '%';
      else out += x.charAt(i);
    }
    out = out.replace(/\s*%$/, '');
    return /^\d{1,3}(\.\d{1,2})?$/.test(out) ? Number(out) : null;
  }

  function start(B, held) {
    started = true;
    var TEAM = B.team, SPAN = B.span, NOW = B.now, WHO = TEAM[ME], all, events;
    /* `all` is the floor's rows; `events` what this page shows: the rows that carry his name only */
    function load() { all = B.events(); events = all.filter(function (e) { return e.m === ME || e.m2 === ME; }); }
    load();
    var book = B.companies.map(function (name, id) { return { id: id, name: B.onSheet(id) ? name : name + ' · ' + t('not on the broker list') }; });
    var count4 = {};

    /* ---- the state of each company with him ---------------------------
       On a given day (days ago): asked in the last 2 weeks = active, in the
       last 4 = gone quiet, earlier = inactive, never = never asked. */
    function stateAt(c, at) {
      var ds = c.asked.filter(function (d) { return d >= at; });
      if (!ds.length) return 'never';
      var age = Math.min.apply(null, ds) - at;
      return age < 14 ? 'active' : age < 28 ? 'quiet' : 'inactive';
    }
    function refresh() {
      count4 = { active: 0, quiet: 0, inactive: 0, never: 0 };
      var byC = {}, byCT = {};
      var sort = function (list, into) { list.forEach(function (e) { if (e.c !== null && e.c !== undefined) (into[e.c] || (into[e.c] = [])).push(e); }); };
      sort(events, byC); sort(all, byCT);
      book.forEach(function (c) {
        var ev = byC[c.id] || [];
        var mine = ev.filter(function (e) { return e.k === 'offer'; });
        c.asked = mine.map(function (e) { return e.d; });
        c.total = mine.length;
        c.days = mine.length ? Math.min.apply(null, c.asked) : null;
        c.first = mine.length ? Math.max.apply(null, c.asked) : null;
        c.state = stateAt(c, 0);
        count4[c.state]++;
        c.ev = ev;
        c.reqs = mine.slice().sort(function (a, b) { return b.d - a.d || a.t - b.t; });          /* oldest first */
        /* what followed a visit is judged on the floor's rows with that company, as his manager will see it */
        c.evT = byCT[c.id] || [];
        c.reqsT = c.evT.filter(function (e) { return e.k === 'offer'; }).sort(function (a, b) { return b.d - a.d || a.t - b.t; });
      });
    }

    /* ---- ORIENTATIONS AND WORKSHOPS: shown beside what followed, never as a bare count ---------
       In BUSINESS days (Friday off, the visit's own day not counted): an orientation led to a request
       when the company's next request came within 7; a workshop led to a meeting within 14. */
    var LED_REQUEST = 7, LED_MEETING = 14;
    var isVisit = function (e) { return e.k === 'orientation' || e.k === 'workshop'; };
    function businessDays(visit, next) { var n = 0, d; for (d = visit - 1; d >= next; d--) if (B.dateOf(d).getDay() !== 5) n++; return n; }
    function later(n) { return n === 0 ? t('the same day') : t('{n} later', { n: count(n, 'day') }); }
    function followed(v) {
      var c = book[v.c], was, next;
      if (v.k === 'orientation') {
        was = c.reqsT.filter(function (e) { return e.d > v.d; });
        next = c.reqsT.filter(function (e) { return e.d <= v.d; })[0];
        if (was.length && was[was.length - 1].d - v.d < 14) return { ok: false, text: t('was already asking') };
        if (next && businessDays(v.d, next.d) <= LED_REQUEST) return { ok: true, text: was.length ? t('asking again {when}', { when: later(v.d - next.d) }) : t('first request {when}', { when: later(v.d - next.d) }) };
        return { ok: false, text: businessDays(v.d, 0) <= LED_REQUEST ? t('no request yet') : t('no request within 7 business days') };
      }
      var meets = c.evT.filter(function (e) { return e.k === 'meeting'; }).sort(function (a, b) { return b.d - a.d; });
      was = meets.filter(function (e) { return e.d > v.d; });
      next = meets.filter(function (e) { return e.d <= v.d; })[0];
      if (next && businessDays(v.d, next.d) <= LED_MEETING) return { ok: true, text: was.length ? t('a meeting {when}', { when: later(v.d - next.d) }) : t('first meeting {when}', { when: later(v.d - next.d) }) };
      return { ok: false, text: businessDays(v.d, 0) <= LED_MEETING ? t('no meeting yet') : t('no meeting within 14 business days') };
    }

    /* ---- the dates: "This week" begins on Saturday; a sales agent opens on the last 30 days ---- */
    var WEEK0 = 0; while (B.dateOf(WEEK0).getDay() !== 6) WEEK0++;
    var PERIODS = [['today', t('Today'), 0, 0], ['yest', t('Yesterday'), 1, 1], ['week', t('This week'), WEEK0, 0], ['month', t('Last 30 days'), 29, 0], ['all', t('Last 12 weeks'), SPAN, 0], ['c', t('Custom dates')]];
    var period = { key: 'month', from: 29, to: 0 }, menuOpen = false;
    function inP(e) { return e.d <= period.from && e.d >= period.to; }
    function fmt(ago) { var d = B.dateOf(ago); return d.getDate() + ' ' + MON[d.getMonth()]; }
    function hhmm(m) { return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); }
    function iso(ago) { return B.iso(B.dateOf(ago)); }
    function agoOf(s) { var d = B.fromIso(s); return d ? Math.max(0, Math.min(SPAN, B.agoOf(d))) : null; }
    function periodName() { var P = PERIODS.filter(function (x) { return x[0] === period.key; })[0]; return period.key === 'c' ? (period.from === period.to ? fmt(period.from) : fmt(period.from) + ' – ' + fmt(period.to)) : P[1]; }
    function rangeText() { var y = B.dateOf(period.to).getFullYear(); return period.from === period.to ? fmt(period.from) + ' ' + y : fmt(period.from) + ' – ' + fmt(period.to) + ' ' + y; }
    /* a split deal is half to each, wherever one person's sales are added up; the count stays one each */
    function tally(list) {
      var o = { special: 0, broadcast: 0, direct: 0, meeting: 0, reservation: 0, contract: 0, cancel: 0, orientation: 0, workshop: 0, value: 0 };
      list.forEach(function (e) { if (e.k === 'offer') o[e.c === null ? 'broadcast' : 'special']++; else o[e.k]++; if (e.k === 'contract') o.value += e.m2 !== undefined ? e.v / 2 : e.v; });
      o.offers = o.special + o.broadcast;
      return o;
    }
    function distinct(list, key) { var s = {}; list.forEach(function (e) { if (e[key] !== null && e[key] !== undefined) s[e[key]] = 1; }); return Object.keys(s).map(Number); }
    function newest(a, b) { return a.d - b.d || b.t - a.t; }

    var A = {};
    function compute() {
      var inPer = events.filter(inP);
      A.list = inPer;
      A.single = period.from === period.to;
      A.tot = tally(inPer);
      A.byC = {}; book.forEach(function (c) { A.byC[c.id] = tally(inPer.filter(function (e) { return e.c === c.id; })); });
      A.effective = book.filter(function (c) { return A.byC[c.id].meeting > 0; }).length;
      A.deals = inPer.filter(function (e) { return e.k === 'reservation' || e.k === 'contract' || e.k === 'cancel'; }).sort(newest);
      A.asked = distinct(inPer.filter(function (e) { return e.k === 'offer'; }), 'c');
      /* compared with the same length of time just before ("This week" with last week by this day), only
         when his own record covers the whole of it */
      var len = period.from - period.to + 1, lastWeek = period.key === 'week';
      var before = events.filter(function (e) { return lastWeek ? e.d >= period.to + 7 && e.d <= period.from + 7 : e.d > period.from && e.d <= period.from + len; });
      var since = events.reduce(function (m, e) { return Math.max(m, e.d); }, -1);
      A.prev = (!A.single && period.from + len <= SPAN && since >= (lastWeek ? period.from + 7 : period.from + len)) ? tally(before) : null;
      A.prevBase = lastWeek ? 'lastweek' : 'before';
      A.visits = inPer.filter(isVisit).sort(newest).map(function (e) { return { e: e, f: followed(e) }; });
      A.led = { orientation: 0, workshop: 0 };
      A.visits.forEach(function (x) { if (x.f.ok) A.led[x.e.k]++; });
      A.open = events.filter(function (e) { return e.k === 'reservation' && !e.end; }).sort(newest);
      /* what he entered in the dates: an offer is never entered, it is counted when it is sent */
      A.entered = inPer.filter(function (e) { return e.k !== 'offer' && e.k !== 'direct' && e.k !== 'cancel'; }).sort(function (a, b) { return newest(a, b) || (b.mine ? 1 : 0) - (a.mine ? 1 : 0) || String(b.id).localeCompare(String(a.id)); });
    }

    /* ---- small pieces --------------------------------------------------- */
    var look = { tab: asked === 'profile' ? 'profile' : 'my', deck: 0 };
    function strip(c, cols) {
      if (!cols) cols = weeksOf([], function () { return { n: 0, text: '' }; }).map(function (w) { return { from: w.from, to: w.to }; });
      var cells = cols.map(function (k) { return k.later ? null : c.asked.filter(function (d) { return d <= k.from && d >= k.to; }).length; });
      return '<span class="strip" role="img" aria-label="' + esc(cols[0].day ? t('Requests on each day of these dates') : t('Requests in each week of these dates')) + '">' + cells.map(function (n, i) { return '<i class="' + (n ? 'on' + Math.min(3, n) : '') + (n === null ? ' later' : '') + '" title="' + esc(colRange(cols[i])) + ': ' + (n === null ? '·' : n) + '"></i>'; }).join('') + '</span>';
    }
    function pill(state, beat) { return '<span class="pill ' + (beat && state === 'quiet' ? 'q' : '') + '"><i class="s-' + state + '"></i>' + STATE[state] + '</span>'; }
    function ago(c) { return c.days === null ? t('No request yet') : c.days === 0 ? t('Asked today') : c.days === 1 ? t('Last asked yesterday') : t('Last asked {n} days ago', { n: c.days }); }
    function num(n) { return '<b data-n="' + n + '">' + n + '</b>'; }
    function mil(v) { return String(Math.round(v / 1e5) / 10); }
    function money(v) { return t('EGP {n}M', { n: mil(v) }); }
    function when(e) { return e.d === 0 ? hhmm(e.t) : fmt(e.d); }

    /* THE COLUMNS (Main Marks builds 118, 143, 144): every column prints its number, the dates run
       under the chart, a column says what it holds when the pointer, the keyboard or a finger reaches
       it, and a tap opens it to a pane of glass. The chart draws the dates chosen. */
    function bars(weeks, cls, glass) {
      var n = weeks.length, max = Math.max.apply(null, weeks.map(function (w) { return w.n; })) || 1, pick = n - 1, i;
      while (pick > 0 && weeks[pick].later) pick--;
      for (i = n - 1; i >= 0; i--) if (weeks[i].n) { pick = i; break; }
      for (i = 0; i < n; i++) if (weeks[i].on) pick = i;
      return '<div class="chart"' + (glass ? ' data-gb="' + glass + '"' : '') + '><div class="big ' + (cls || '') + '">' + weeks.map(function (w, k) {
        return '<button type="button" class="col' + (k === pick ? ' on' : '') + (w.later ? ' later' : '') + '" data-w="' + k + '" style="--d:' + k + '" aria-label="' + esc(w.info) + '">' + (w.mark ? '<em>' + esc(w.mark) + '</em>' : '') + '<b>' + (w.n || '') + '</b><i class="' + (w.n ? '' : 'z') + '" style="--h:' + (w.n ? Math.max(.1, w.n / max).toFixed(3) : '.05') + '"></i></button>';
      }).join('') + '</div>' + (weeks[0].lab !== undefined
        ? '<div class="wk per" style="grid-template-columns:repeat(' + n + ',1fr)">' + weeks.map(function (w, k) { return '<span>' + (n <= 7 || k % Math.ceil(n / 6) === 0 ? esc(w.lab) : '') + '</span>'; }).join('') + '</div>'
        : '<div class="wk">' + [0, 3, 6, 9].map(function (k) { return '<span>' + fmt(weekFirst(k)) + '</span>'; }).join('') + '</div>') +
        '<p class="barinfo" aria-live="polite">' + esc(weeks[pick].info) + '</p></div>';
    }
    function barPick(col) {
      var box = col.closest('.chart'), info = col.getAttribute('aria-label');
      if (!box || info === null) return;
      [].forEach.call(box.querySelectorAll('.col'), function (c) { c.classList.toggle('on', c === col); });
      box.querySelector('.barinfo').textContent = info;
    }
    /* a week begins on Saturday, in every chart */
    var SAT = null;
    function satAgo() { if (SAT === null) { SAT = 0; while (B.dateOf(SAT).getDay() !== 6) SAT++; } return SAT; }
    function weekFirst(k) { return satAgo() + 7 * (11 - k); }
    function weekRange(i) { return fmt(weekFirst(i)) + ' – ' + fmt(weekFirst(i) - 6); }
    function weeksOf(list, describe) {
      var w = [], i, sat = satAgo();
      for (i = 0; i < 12; i++) w.push([]);
      list.forEach(function (e) { var back = Math.max(0, Math.ceil((e.d - sat) / 7)); if (back < 12) w[11 - back].push(e); });
      return w.map(function (ev, k) { var d = describe(ev); return { n: d.n, mark: d.mark || '', ev: ev, from: weekFirst(k), to: weekFirst(k) - 6, range: weekRange(k), info: weekRange(k) + ': ' + d.text }; });
    }
    /* one day: the days of its week, the day lit; This week or up to 14 days: a column a day; longer: a
       column a week from Saturday; Last 12 weeks: the twelve weeks. A Friday only when something is on it. */
    function spanCols() {
      var out = [], len = period.from - period.to + 1, s, f, d;
      if (period.key === 'all') return null;
      var off = function (d) { return d !== period.to && B.dateOf(d).getDay() === 5 && !events.some(function (e) { return e.d === d; }); };
      if (A.single || period.key === 'week' || len <= 14) {
        if (A.single || period.key === 'week') { s = period.to; while (B.dateOf(s).getDay() !== 6) s++; f = s - 6; } else { s = period.from; f = period.to; }
        for (d = s; d >= f; d--) if (!off(d)) out.push({ from: d, to: d, day: true, later: d < 0, on: A.single && d === period.to });
        return out;
      }
      s = period.from; while (B.dateOf(s).getDay() !== 6) s++;
      for (; s >= period.to; s -= 7) out.push({ from: Math.min(s, period.from), to: Math.max(s - 6, period.to), day: false, later: false, on: false });
      return out;
    }
    function colRange(c) { return c.day ? DAY[B.dateOf(c.from).getDay()] + ' ' + fmt(c.from) : c.from === c.to ? fmt(c.from) : fmt(c.from) + ' – ' + fmt(c.to); }
    function spanOf(list, describe) {
      var cols = spanCols();
      if (!cols) return weeksOf(list, describe);
      return cols.map(function (c) {
        var ev = c.later ? [] : list.filter(function (e) { return e.d <= c.from && e.d >= c.to; }), d = describe(ev), range = colRange(c);
        return { n: d.n, mark: d.mark || '', ev: ev, from: c.from, to: c.to, day: c.day, later: c.later, on: c.on, range: range,
          lab: c.day ? DAY[B.dateOf(c.from).getDay()] : fmt(c.from), info: range + ': ' + (c.later ? t('still to come') : d.text) };
      });
    }
    function spanName(cols) { return !cols ? t('12 weeks') : cols[0].day ? fmt(cols[0].from) + ' – ' + fmt(cols[cols.length - 1].from) : periodName(); }
    function extras(n) {
      var out = [];
      if (n.meeting) out.push(count(n.meeting, 'meeting'));
      if (n.reservation) out.push(count(n.reservation, 'reservation'));
      if (n.contract) out.push(count(n.contract, 'contract'));
      if (n.cancel) out.push(count(n.cancel, 'cancellation'));
      if (n.orientation) out.push(count(n.orientation, 'orientation'));
      if (n.workshop) out.push(count(n.workshop, 'workshop'));
      return out;
    }
    function companyWeeks(id) {
      return spanOf(events.filter(function (e) { return e.c === id; }), function (ev) {
        var n = tally(ev);
        return { n: n.special, mark: ev.filter(isVisit).map(function (e) { return KIND[e.k].charAt(0); })[0], text: [n.special ? count(n.special, 'request') : t('no requests')].concat(extras(n)).join(' · ') };
      });
    }
    /* what each column of a chart holds, by the chart's name, for the pane a tap on a column opens */
    var GB = {}, glassFrom = null;
    function openGlass(col) {
      var box = col.closest('.chart'), G = box && GB[box.getAttribute('data-gb')], w = +col.dataset.w, C = G && G.c[w];
      var list = C && C.ev, g = $('glass'), v, range = C && C.range;
      if (!list || !list.length) return;
      if (!g) {
        v = document.createElement('div'); v.className = 'gveil'; v.id = 'gveil';
        g = document.createElement('div'); g.className = 'glass'; g.id = 'glass'; g.setAttribute('role', 'dialog'); g.setAttribute('aria-modal', 'true');
        document.body.appendChild(v); document.body.appendChild(g);
        v.addEventListener('click', closeGlass);
        void g.offsetWidth;
      }
      glassFrom = col;
      g.setAttribute('aria-label', G.label + ' · ' + range);
      g.innerHTML = '<button class="x" id="closeGlass" type="button" aria-label="' + esc(t('Close')) + '">✕</button>' +
        '<div><h3>' + G.head + ' <b>' + list.length + '</b></h3><p class="role"><bdi>' + range + '</bdi></p></div>' + glassDays(list, C.from, C.to);
      g.scrollTop = 0;
      g.classList.add('on'); $('gveil').classList.add('on');
      $('closeGlass').addEventListener('click', closeGlass);
      $('closeGlass').focus({ preventScroll: true });
    }
    /* the week at a glance, then one block for each day that holds something, shaded one lighter, one darker */
    function glassDays(list, from, to) {
      var by = {}, d, row = '', out = '';
      list.forEach(function (e) { (by[e.d] = by[e.d] || []).push(e); });
      for (d = from; d >= to && from !== to; d--) {
        row += '<div><small>' + DAY[B.dateOf(d).getDay()] + '</small><b' + (by[d] ? '' : ' class="none"') + '>' + (by[d] ? by[d].length : d < 0 ? '·' : 0) + '</b><span>' + B.dateOf(d).getDate() + '</span></div>';
      }
      for (d = from; d >= to; d--) {
        if (!by[d]) continue;
        out += '<div class="gl-day"><p><span>' + DAY[B.dateOf(d).getDay()] + ' · ' + fmt(d) + '</span><b>' + by[d].length + '</b></p><div class="feed">' + by[d].slice().sort(function (a, b) { return a.t - b.t; }).map(function (e) {
          var how = sentHow(e);
          return '<div><time>' + hhmm(e.t) + '</time><span>' + KIND[kindOf(e)] + sentTimes(e) + '<small>' + detail(e) + '</small>' + (how ? '<small class="how">' + how + '</small>' : '') + '</span></div>';
        }).join('') + '</div></div>';
      }
      return (row ? '<div class="gl-week" aria-hidden="true">' + row + '</div>' : '') + '<div class="gl-days">' + out + '</div>';
    }
    function closeGlass() {
      var g = $('glass');
      if (!g || !g.classList.contains('on')) return false;
      g.classList.remove('on'); $('gveil').classList.remove('on');
      if (glassFrom && document.contains(glassFrom)) glassFrom.focus({ preventScroll: true });
      glassFrom = null;
      return true;
    }
    function kindOf(e) { return e.k === 'offer' ? (e.c === null ? 'broadcast' : 'special') : e.k; }
    function people(e) { return e.m2 !== undefined ? t('{a} + {b} (split)', { a: nm(TEAM[e.m].name), b: nm(TEAM[e.m2].name) }) : nm(TEAM[e.m].name); }
    function what(e) { return KIND[kindOf(e)] + (e.k === 'direct' && e.cl ? ' · <bdi>' + esc(e.cl.name) + '</bdi>' : e.c !== null && e.c !== undefined ? ' · ' + nm(book[e.c].name) : '') + marginChip(e); }
    /* the margin (2026-11-17): a small "+7%" on a send that went out raised; a tap or hover says the list price */
    function marginChip(e) {
      if (!e.mg) return '';
      var tip = e.lp ? t('Sent {p}% above the list price · list {a} · sent {b}', { p: e.mg, a: N.tx.egp(e.lp), b: N.tx.egp(e.op) }) : t('Sent {p}% above the list price', { p: e.mg });
      return ' <button class="why mg-why" type="button" aria-expanded="false" dir="ltr">+' + e.mg + '%</button><span class="why-tip" role="note">' + esc(tip) + '</span>';
    }
    /* HOW MANY TIMES IT WENT, in plain words (Main Marks builds 129 and 134): on a broadcast sent from
       this phone, and on a special request sent again to the same company within ten minutes */
    function sentTimes(e) {
      if (e.k !== 'offer' || !e.n || (e.c !== null && e.n < 2)) return '';
      var tip = e.c !== null
        ? t('This offer was sent {n} times to the same company within ten minutes. The same unit sent again to the same company counts as one special request, even on another payment plan.', { n: e.n })
        : e.n === 1
        ? t('This offer was sent once. WhatsApp takes only a few chats each time, so sending it again to more chats still counts as one broadcast.')
        : t('This offer was sent {n} times. WhatsApp takes only a few chats each time, so one offer needs many sends. It counts as one broadcast.', { n: e.n });
      return ' · <button class="why" type="button" aria-expanded="false">' + (e.n === 1 ? t('sent once') : t('sent {n} times', { n: e.n })) + '</button><span class="why-tip" role="note">' + esc(tip) + '</span>';
    }
    function sentHow(e) {
      if (e.k !== 'offer' || !e.n || e.n < 2) return '';
      var at = function (m) { return '<bdi>' + hhmm(m) + '</bdi>'; };
      if (e.n === 2 && e.np === 1 && e.nq === 1 && e.ch && e.lc && e.lc !== e.ch && e.lt >= e.t) return CH[e.ch] + ' ' + at(e.t) + ' · ' + CH[e.lc] + ' ' + at(e.lt);
      var out = [];
      if (e.np) out.push(count(e.np, 'pdf'));
      if (e.nq) out.push(count(e.nq, 'post'));
      if (e.lt !== undefined && e.lt !== e.t) out.push('<bdi>' + hhmm(Math.min(e.t, e.lt)) + ' – ' + hhmm(Math.max(e.t, e.lt)) + '</bdi>');
      return out.join(' · ');
    }
    function unitText(e) { return nm(prod(e.p) + ' ' + String(e.u).split('+').join(', ')) + (e.area ? ' · ' + t('{n} m²', { n: e.area }) : '') + (e.v ? ' · ' + money(e.v) : ''); }
    function detail(e) { return isVisit(e) ? followed(e).text : e.u ? unitText(e) + ((e.k === 'offer' || e.k === 'direct') && e.ch ? ' · ' + CH[e.ch] : '') : prod(e.p) + (e.k === 'meeting' && e.on ? ' · ' + t('Online') : '') + (e.ch ? ' · ' + CH[e.ch] : ''); }
    function feed(list) {
      return '<div class="feed">' + list.map(function (e) { var how = sentHow(e); return '<div><time>' + when(e) + '</time><span>' + what(e) + sentTimes(e) + '<small>' + detail(e) + (e.k === 'cancel' ? ' · ' + WHYL[e.why] : '') + '</small>' + (how ? '<small class="how">' + how + '</small>' : '') + '</span></div>'; }).join('') + '</div>';
    }
    function kv(list, cls) { return '<div class="kv' + (cls ? ' ' + cls : list.length === 4 ? ' k4' : '') + '">' + list.map(function (x) { return '<div><b>' + x[0] + '</b><span>' + x[1] + '</span></div>'; }).join('') + '</div>'; }

    function head(heading) {
      return '<div class="hd my"><p class="eyebrow">' + nm(WHO.name) + ' · ' + title(WHO.title) + '</p><h1>' + heading + '</h1><button class="when" id="when" type="button" aria-expanded="' + menuOpen + '">' + svg('cal') + periodName() + '</button></div>' +
        (menuOpen ? '<div class="menu"><div class="chips">' + PERIODS.map(function (p) { return '<button class="chip" type="button" data-r="' + p[0] + '" aria-pressed="' + (period.key === p[0]) + '">' + p[1] + '</button>'; }).join('') + '</div>' +
          (period.key === 'c' ? '<div class="range"><label class="fld">' + t('From') + '<input type="date" id="dFrom" min="' + iso(SPAN) + '" max="' + iso(0) + '" value="' + iso(period.from) + '"></label><label class="fld">' + t('To') + '<input type="date" id="dTo" min="' + iso(SPAN) + '" max="' + iso(0) + '" value="' + iso(period.to) + '"></label></div>' : '') + '</div>' : '') +
        '<p class="showing">' + t(B.demo ? 'Showing {dates} · your own activity · demo figures' : 'Showing {dates} · your own activity', { dates: '<b>' + rangeText() + '</b>' }) + '</p>';
    }
    function vs(now, was, base) {
      if (was === null || was === undefined) return '';
      var d = now - was, n = Math.abs(d);
      if (base === 'lastweek') return d === 0 ? t('the same as last week by this day') : d > 0 ? t('{n} more than last week by this day', { n: n }) : t('{n} fewer than last week by this day', { n: n });
      return d === 0 ? t('the same as the time before') : d > 0 ? t('{n} more than the time before', { n: n }) : t('{n} fewer than the time before', { n: n });
    }
    /* THE SIX TILES follow the work (Muhanad, 2026-10-06): an orientation gets a company asking, a
       workshop gets an asking company to a meeting, then reservations and contracts */
    function tiles() {
      var n = A.tot, beside = t('{x} beside them', { x: count(n.broadcast, 'broadcast') });
      var bare = A.list.filter(function (e) { return e.k === 'reservation' && e.nm; }).length, noMeet = bare ? t('{n} without a meeting', { n: bare }) : '';
      var list = [['orientation', t('Orientations'), n.orientation, n.orientation ? t('{n} led to a request', { n: A.led.orientation }) : ''],
        ['offers', t('Special requests'), n.special, A.prev ? vs(n.special, A.prev.special, A.prevBase) : beside],
        ['workshop', t('Workshops'), n.workshop, n.workshop ? t('{n} led to a meeting', { n: A.led.workshop }) : ''],
        ['meeting', t('Meetings'), n.meeting, n.meeting ? t('1 for every {n} requests', { n: Math.max(1, Math.round(n.special / n.meeting)) }) : ''],
        ['reservation', t('Reservations'), n.reservation, [noMeet, n.cancel ? t('{n} cancelled in these dates', { n: n.cancel }) : t('none cancelled')].filter(Boolean).join(' · ')],
        ['contract', t('Contracts'), n.contract, n.value ? t('{v} total sales', { v: money(n.value) }) : '']];
      return '<div class="stats">' + list.map(function (x) { return '<button class="stat" type="button" data-s="' + x[0] + '">' + num(x[2]) + '<span>' + x[1] + '</span>' + (x[3] ? '<small>' + x[3] + '</small>' : '') + '</button>'; }).join('') + '</div>';
    }

    /* MY SALES (build 121): the figure, the time before, what is reserved and not signed, four bars from
       request to contract; under them today's broadcasts against the daily target (build 134) */
    function cardSales() {
      var n = A.tot, held = A.open.reduce(function (a, e) { return a + (e.m2 !== undefined ? e.v / 2 : e.v); }, 0), max = Math.max(n.special, n.direct, 1);
      var fbar = function (cls, label, v) { return '<div class="' + cls + '"><span>' + label + '</span><i style="--w:' + (v / max).toFixed(3) + '"></i><b>' + v + '</b></div>'; };
      var fig = '<span data-n="' + mil(n.value) + '" data-dec="1">' + mil(n.value) + '</span>';
      return '<section class="card"><h2>' + t('My sales') + ' <em>' + periodName() + '</em></h2>' +
        '<div class="sales"><b>' + (AR ? fig + ' <small>' + t('million EGP') + '</small>' : '<small>EGP</small>' + fig + 'M') + '</b>' +
        '<span>' + (n.contract ? t('{x} signed in these dates', { x: '<b>' + count(n.contract, 'contract') + '</b>' }) : t('No contract signed in these dates')) +
          (A.prev ? ' · ' + (A.prevBase === 'lastweek' ? t('last week by this day: {v}', { v: '<b>' + money(A.prev.value) + '</b>' }) : t('the time before: {v}', { v: '<b>' + money(A.prev.value) + '</b>' })) : '') + '</span>' +
        (A.open.length ? '<span>' + t('{v} reserved and not signed yet · {x} open today', { v: '<b>' + money(held) + '</b>', x: count(A.open.length, 'reservation') }) + '</span>' : '') + '</div>' +
        '<div class="fun" role="img" aria-label="' + esc(t('From request to contract')) + '">' + fbar('f1', t('Special requests'), n.special) + fbar('f1 fd', t('Direct clients'), n.direct) + fbar('f2', t('Meetings'), n.meeting) + fbar('f3', t('Reservations'), n.reservation) + fbar('f4', t('Contracts'), n.contract) + '</div>' + dutyToday() + '</section>';
    }
    /* always today, whatever dates the page shows; one broadcast is one offer, however many times it went.
       The target is the settings file's (CONFIG.salesDay); with none, there is no line. */
    function dutyToday() {
      var goal = Number(((typeof CONFIG !== 'undefined' && CONFIG.salesDay) || {}).broadcasts) || 0;
      if (!goal) return '';
      var done = events.filter(function (e) { return e.k === 'offer' && e.c === null && e.d === 0 && e.m === ME; }).length, dots = '', i;
      for (i = 0; i < goal && goal <= 6; i++) dots += '<i' + (i < done ? ' class="on"' : '') + '></i>';
      var tip = t('The daily target is at least {b} offers sent as a general broadcast to all the companies. An offer sent again to more chats still counts as one.', { b: goal });
      return '<div class="duty"><span>' + t('Today') + '</span><span class="dots" aria-hidden="true">' + dots + '</span>' +
        '<button class="why" type="button" aria-expanded="false">' + (done >= goal ? count(done, 'broadcast') : t('{a} of {b} broadcasts', { a: done, b: goal })) + '</button>' +
        '<span class="why-tip" role="note">' + esc(tip) + '</span></div>';
    }

    /* MY COMPANIES (build 118, 121): one card, one ranked list per state; swipe it, or tap a name on top.
       A sales agent's lists are short and uneven, so the strip is as tall as the tallest, and "the whole
       list" is offered only when there is more than the five shown. */
    var DECK = [['quiet', STATE.quiet], ['active', STATE.active], ['effective', t('Effective')], ['inactive', STATE.inactive]];
    function metric(f) {
      if (f === 'effective') return { get: function (c) { return A.byC[c.id].meeting; }, lab: t('Meetings') };
      if (f === 'quiet' || f === 'inactive') return { get: function (c) { return c.total; }, lab: t('Requests, 12 weeks') };
      return { get: function (c) { return A.byC[c.id].special; }, lab: t('Requests') };
    }
    function companyMatches(f) {
      var m = metric(f);
      return book.filter(function (c) { return c.state === f || (f === 'effective' && A.byC[c.id].meeting > 0); })
        .sort(function (a, b) { return m.get(b) - m.get(a) || b.total - a.total || a.name.localeCompare(b.name); });
    }
    function rankHead(f) { return '<div class="rkhead"><span>#</span><span>' + t('Company') + '</span><span>' + metric(f).lab + '</span></div>'; }
    function rankRow(f) {
      var m = metric(f), cols = f === 'quiet' || f === 'inactive' ? null : spanCols();
      return function (c, i) {
        return '<button class="row rk" type="button" data-c="' + c.id + '"><span class="no">' + (i + 1) + '</span><span class="nm">' + esc(c.name) + '</span><span class="val">' + m.get(c) + '</span>' + strip(c, cols) + '<span class="sub">' + pill(c.state, true) + ' · ' + ago(c) + '</span></button>';
      };
    }
    function cardDeck() {
      if (look.deck >= DECK.length) look.deck = 0;
      return '<section class="card"><h2>' + t('My companies') + ' <em>' + t('swipe, or tap a list') + '</em></h2>' +
        '<div class="chips slide" id="deckTabs">' + DECK.map(function (d, i) { return '<button class="chip" type="button" data-d="' + i + '" aria-pressed="' + (i === look.deck) + '">' + d[1] + ' ' + companyMatches(d[0]).length + '</button>'; }).join('') + '</div>' +
        '<div class="deck fit" id="deck">' + DECK.map(function (d) {
          var list = companyMatches(d[0]);
          return '<div class="dslide">' + (list.length ? rankHead(d[0]) + '<div class="rows">' + list.slice(0, 5).map(rankRow(d[0])).join('') + '</div>' + (list.length <= 5 ? '' : '<button class="see" type="button" data-go="' + d[0] + '"><span>' + t('See the whole list') + '</span><b>' + list.length + '</b></button>') : '<p class="note">' + t('No company here in these dates.') + '</p>') + '</div>';
        }).join('') + '</div>' +
        '<div class="dots" id="deckDots" aria-hidden="true">' + DECK.map(function (d, i) { return '<i class="' + (i === look.deck ? 'on' : '') + '"></i>'; }).join('') + '</div></section>';
    }
    function deckAt(k) {
      var first = k.firstElementChild.offsetLeft, best = 0, gap = 1e9;
      [].forEach.call(k.children, function (s, i) { var g = Math.abs(s.offsetLeft - first - k.scrollLeft); if (g < gap) { gap = g; best = i; } });
      return best;
    }
    /* one height for the card, whichever list is on screen (Main Marks build 145): as tall as its tallest */
    function deckMark(i) {
      look.deck = i;
      [].forEach.call($('deckTabs').children, function (b, n) { b.setAttribute('aria-pressed', String(n === i)); });
      [].forEach.call($('deckDots').children, function (b, n) { b.className = n === i ? 'on' : ''; });
      var tabs = $('deckTabs'), chip = tabs.children[i], a, c;
      if (chip && tabs.scrollBy) {
        a = tabs.getBoundingClientRect(); c = chip.getBoundingClientRect();
        if (c.right > a.right - 16) tabs.scrollBy({ left: c.right - a.right + 16, behavior: 'smooth' });
        else if (c.left < a.left + 16) tabs.scrollBy({ left: c.left - a.left - 16, behavior: 'smooth' });
      }
      var deck = $('deck'), h = 0;
      deck.style.height = '';
      [].forEach.call(deck.children, function (s) { s.style.maxHeight = ''; });
      [].forEach.call(deck.children, function (s) { h = Math.max(h, s.offsetHeight); });
      deck.style.height = h + 'px';
      [].forEach.call(deck.children, function (s) { s.style.maxHeight = h + 'px'; });
    }
    function deckTo(i, smooth) {
      var k = $('deck');
      if (!k || !k.children[i]) return;
      k.scrollTo({ left: k.children[i].offsetLeft - k.firstElementChild.offsetLeft, behavior: smooth ? 'smooth' : 'auto' });
      deckMark(i);
    }
    function deckInit() {
      var k = $('deck'), timer;
      if (!k || !k.children.length) return;
      deckTo(look.deck, false);
      k.addEventListener('scroll', function () { clearTimeout(timer); timer = setTimeout(function () { if ($('deck') === k) deckMark(deckAt(k)); }, 90); });
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if ($('deck') === k) deckMark(look.deck); });
    }

    function fate(e) { return e.k === 'cancel' ? ' · ' + WHYL[e.why] : e.k !== 'reservation' ? '' : e.end === 'cancel' ? ' · ' + t('later cancelled, {date}', { date: fmt(e.endD) }) : e.end === 'contract' ? ' · ' + t('became a contract') : ' · ' + t('still open'); }
    function dealRow(e) {
      return '<div class="row flat' + (e.k === 'cancel' ? ' gone' : '') + '"><span class="nm">' + KIND[e.k] + ' · ' + nm(prod(e.p) + ' ' + e.u) + '</span><span class="val">' + mil(e.v) + '<small>' + t('EGP M') + '</small></span><span class="sub">' + nm(book[e.c].name) + ' · ' + people(e) + ' · ' + when(e) + fate(e) + '</span>' + meetFlag(e) + '</div>';
    }
    /* a company's own movement, newest first */
    function storyOf(c) {
      var S = [], i, gap, last = c.reqs.length ? c.reqs[c.reqs.length - 1].d : null;
      var quiet = function (d) { S.push([d - 14, 'warn', t('Went quiet'), t('No request for 14 days')]); }, gone = function (d) { S.push([d - 28, 'neut', t('Became inactive'), t('No request for 28 days')]); };
      if (c.reqs.length) S.push([c.reqs[0].d, 'good', t('First request'), detail(c.reqs[0])]);
      for (i = 1; i < c.reqs.length; i++) {
        gap = c.reqs[i - 1].d - c.reqs[i].d;
        if (gap < 14) continue;
        quiet(c.reqs[i - 1].d); if (gap >= 28) gone(c.reqs[i - 1].d);
        S.push([c.reqs[i].d, 'good', t('Asking again'), t('After {n}', { n: count(gap, 'day') })]);
      }
      if (last !== null && last >= 14) quiet(last);
      if (last !== null && last >= 28) gone(last);
      c.ev.forEach(function (e) {
        if (e.k === 'meeting') S.push([e.d, 'ink', KIND.meeting, prod(e.p)]);
        else if (e.k === 'reservation' || e.k === 'contract') S.push([e.d, 'ink', KIND[e.k] + ' · ' + nm(prod(e.p) + ' ' + e.u), money(e.v)]);
        else if (e.k === 'cancel') S.push([e.d, 'ink', KIND.cancel + ' · ' + nm(e.u), WHYL[e.why]]);
        else if (isVisit(e)) S.push([e.d + .5, 'acc', KIND[e.k], followed(e).text]);
      });
      S = S.filter(function (x) { return x[0] >= 0; });
      S.sort(function (a, b) { return a[0] - b[0]; });
      return S.length ? '<p class="sec">' + t('How it moved with you') + ' · ' + t('newest first') + '</p><div class="story">' + S.map(function (x) { return '<div><time>' + fmt(Math.floor(x[0])) + '</time><i class="k-' + x[1] + '"></i><span>' + x[2] + '<small>' + x[3] + '</small></span></div>'; }).join('') + '</div>' : '';
    }

    function fateOf(e) { return e.end === 'cancel' ? t('later cancelled, {date}', { date: fmt(e.endD) }) : e.end === 'contract' ? t('became a contract') : t('still open'); }
    /* the other name on a row of his: who also went, or who the deal is split with */
    function other(e) { return e.m2 === undefined ? null : TEAM[e.m === ME ? e.m2 : e.m].name; }
    function entryRow(e) {
      var o = other(e), withWho = !o ? '' : isVisit(e) ? t('went with {name}', { name: nm(o) }) : t('split with {name}', { name: nm(o) });
      var sub = isVisit(e) ? withWho : e.k === 'meeting' ? prod(e.p) + (e.on ? ' · ' + t('Online') : '') : unitText(e) + (withWho ? ' · ' + withWho : '');
      var out = isVisit(e) ? followed(e) : e.k === 'reservation' ? { ok: e.end === 'contract', text: fateOf(e) } : null;
      return '<button class="row" type="button" data-e="' + esc(e.id) + '"><span class="nm"><span class="k">' + KIND[e.k] + '</span> · ' + esc(book[e.c].name) + (B.removable(e) ? '<span class="new">' + t('new') + '</span>' : '') + '</span><span class="val d">' + when(e) + '</span>' +
        (sub ? '<span class="sub">' + sub + '</span>' : '') + (out ? '<span class="mv-out' + (out.ok ? ' ok' : '') + '">' + out.text + '</span>' : '') + '</button>';
    }
    function cardEntered() {
      var l = A.entered;
      return '<section class="card"><h2>' + t('What I entered') + ' <em>' + count(l.length, 'entry') + '</em></h2>' +
        (l.length ? '<div class="rows">' + l.slice(0, 5).map(entryRow).join('') + '</div>' + (l.length > 5 ? '<button class="see" type="button" data-go="entered"><span>' + t('See everything I entered') + '</span><b>' + l.length + '</b></button>' : '')
          : '<p class="note">' + t('Nothing entered in these dates. Use the plus button to record an orientation, a workshop, a meeting, a reservation or a contract.') + '</p>') + '</section>';
    }
    function openMyList(key) {
      if (key === 'entered') return showSheet('<div><h3>' + t('What I entered') + '</h3><p class="role">' + rangeText() + ' · ' + A.entered.length + '</p></div><div class="rows">' + A.entered.map(entryRow).join('') + '</div>');
      var list = companyMatches(key);
      showSheet('<div><h3>' + (key === 'effective' ? t('Effective') : STATE[key]) + '</h3><p class="role">' + count(list.length, 'company') + ' · ' + t('as of today') + '</p></div>' + rankHead(key) + '<div class="rows">' + list.map(rankRow(key)).join('') + '</div>');
    }
    function openEntry(id) {
      var e = events.filter(function (x) { return x.id === id; })[0]; if (!e) return;
      var rows = [[t('Brokerage company'), nm(book[e.c].name)], [t('Date'), fmt(e.d) + ' ' + B.dateOf(e.d).getFullYear()]];
      if (e.u) rows.push([t('Unit'), nm(prod(e.p) + ' ' + e.u) + (e.area ? ' · ' + t('{n} m²', { n: e.area }) : '')]); else if (e.p) rows.push([t('Line'), prod(e.p)]);
      if (e.v) rows.push([e.k === 'contract' ? t('Contract price') : t('Reservation price'), N.tx.egp(e.v)]);
      if (e.k === 'contract') rows.push(planRow(e));
      if (other(e)) rows.push([isVisit(e) ? t('Also went') : t('Split with'), nm(other(e))]);
      if (isVisit(e)) rows.push([t('What followed'), followed(e).text]);
      if (e.k === 'reservation') rows.push([t('Today'), fateOf(e)]);
      rows = rows.concat(meetFacts(e));
      showSheet('<div><h3>' + KIND[e.k] + '</h3><p class="role">' + nm(book[e.c].name) + ' · ' + fmt(e.d) + '</p></div><div class="facts">' + rows.map(function (r) { return '<div><span>' + r[0] + '</span><b>' + r[1] + '</b></div>'; }).join('') + '</div>' +
        (B.removable(e) ? '<button class="btn ghost" type="button" data-rm="' + esc(e.id) + '">' + t('Remove this entry') + '</button>' : '') +
        '<p class="note">' + t('You can correct an entry on the day you made it. After that, your manager corrects it.') + '</p>');
    }
    function removeEntry(id) {
      var e = events.filter(function (x) { return x.id === id; })[0]; if (!e) return;
      var whatIs = KIND[e.k] + ' · ' + book[e.c].name;
      if (!B.remove(id)) return;
      load(); refresh(); compute(); closeSheet(); draw(true);
      N.toast(t('Removed: {what}', { what: whatIs }));
    }

    /* ---- RECORDING (the plus; Main Marks build 121, 138, 141, 145) ---------------------------------
       There is no "who": the entry carries his name. The company is found by typing, among the ones the
       broker sheet gives him, his recent ones first. A unit code is looked up as it is typed (G-22 or the
       inventory's code): its line, size and list price show, the price fills in, a code no unit has is
       refused. A unit shown as not available is a warning, not a refusal: this reservation may be why.
       A contract is made from one of his open reservations, and needs the plan it was signed on. The
       same visit to the same company on the same day is refused, and so is a second open reservation or
       a second contract on one unit. A cancellation is not here: it is the manager's. */
    var myRec = { kind: 'orientation', company: -1 };
    var SAVE = { orientation: t('Save orientation'), workshop: t('Save workshop'), meeting: t('Save meeting'), reservation: t('Save reservation'), contract: t('Save contract') };
    /* THE MEETING BEHIND A RESERVATION (build 145): no meeting recorded with that company in the 12 weeks
       up to it, and the form asks. "Yes, we met": the date, in person or online, and the meeting is saved
       too. "No meeting": why, and a note ("Other" needs one). Nothing is saved until it is answered. */
    var NOMEET = { direct: t('The client reserved directly'), broker: t('The broker handled it'), other: t('Other') };
    var MEET_DAYS = 83;
    function meetBox() {
      return '<div class="ask" id="rMeet" hidden><p class="q" id="rMeetQ"></p>' +
        '<div class="pick"><button type="button" data-met="yes" aria-pressed="false">' + t('Yes, we met') + '</button><button type="button" data-met="no" aria-pressed="false">' + t('No meeting') + '</button></div>' +
        '<div class="form" id="rMetY" hidden><div class="range"><label class="fld">' + t('Meeting date') + '<input type="date" id="rMd"></label>' + whereField('rMw') + '</div><p class="hint" id="rMetH"></p></div>' +
        '<div class="form" id="rMetN" hidden><div class="fld"><span>' + t('Why') + '</span><div class="chips">' + ['direct', 'broker', 'other'].map(function (w) { return '<button class="chip" type="button" data-nomeet="' + w + '" aria-pressed="false">' + NOMEET[w] + '</button>'; }).join('') + '</div></div>' +
        '<label class="fld">' + t('Note') + '<textarea id="rNote" rows="2" maxlength="300"></textarea></label><p class="hint">' + t('The note stays with the entry. “Other” needs a note.') + '</p></div></div>';
    }
    function whereField(id) {
      return '<div class="fld"><span>' + t('Where') + '</span><div class="chips" id="' + id + '"><button class="chip" type="button" data-where="person" aria-pressed="true">' + t('In person') + '</button><button class="chip" type="button" data-where="online" aria-pressed="false">' + t('Online') + '</button></div></div>';
    }
    function online(id) { var b = $(id) && $(id).querySelector('[data-where="online"]'); return !!b && b.getAttribute('aria-pressed') === 'true'; }
    function pressOne(b) { [].forEach.call(b.parentNode.children, function (x) { x.setAttribute('aria-pressed', String(x === b)); }); if ($('rErr')) $('rErr').hidden = true; }
    function meetBehind(c, d, who) {
      var w = who.filter(function (m) { return m >= 0; }), best = null;
      all.forEach(function (e) { if (e.k === 'meeting' && e.c === c && e.d >= d && e.d <= d + MEET_DAYS && (w.indexOf(e.m) !== -1 || (e.m2 !== undefined && w.indexOf(e.m2) !== -1)) && (!best || e.d < best.d)) best = e; });
      return best;
    }
    function meetKind() { var k = myRec.kind; return k === 'reservation' || (k === 'contract' && $('rR') && !$('rR').value) ? k : ''; }
    function meetAsk() {
      var box = $('rMeet'), k = meetKind(), c, d, s, show, md, lo;
      if (!box) return;
      c = $('rC') && $('rC').value !== '' ? +$('rC').value : -1;
      d = $('rD') && $('rD').value ? agoOf($('rD').value) : null;
      s = $('rS') && $('rS').value !== '' ? +$('rS').value : -1;
      show = !!k && c >= 0 && B.companies[c] !== undefined && d !== null && !meetBehind(c, d, [ME, s]);
      box.hidden = !show;
      if (show) {
        $('rMeetQ').innerHTML = t('No meeting with {name} is recorded. Was there one?', { name: nm(B.companies[c]) }) + '<small>' + (k === 'contract' ? t('A contract usually follows a meeting.') : t('A reservation usually follows a meeting.')) + ' ' + t('Your manager counts them.') + '</small>';
        md = $('rMd'); lo = Math.min(SPAN, d + MEET_DAYS);
        md.min = iso(lo); md.max = iso(d);
        $('rMetH').innerHTML = t('The meeting is saved too, under your name, on that date.');
      }
      saveLabel();
    }
    function meetYes() { var b = $('rMeet') && $('rMeet').querySelector('[data-met="yes"]'); return !!b && !$('rMeet').hidden && b.getAttribute('aria-pressed') === 'true'; }
    function saveLabel() {
      var k = myRec.kind, b = $('rSave');
      if (!b || !SAVE[k]) return;
      b.textContent = meetYes() ? (k === 'contract' ? t('Save contract and meeting') : t('Save reservation and meeting')) : SAVE[k];
    }
    function meetPick(b) {
      pressOne(b);
      $('rMetY').hidden = b.dataset.met !== 'yes';
      $('rMetN').hidden = b.dataset.met !== 'no';
      saveLabel();
    }
    function meetOnto(r) {
      var box = $('rMeet'), yes, no, md, a, why, note;
      meetAsk();
      if (!box || box.hidden) return '';
      yes = box.querySelector('[data-met="yes"]').getAttribute('aria-pressed') === 'true';
      no = box.querySelector('[data-met="no"]').getAttribute('aria-pressed') === 'true';
      if (!yes && !no) return t('Answer the question about the meeting first.');
      if (yes) {
        md = $('rMd').value ? B.fromIso($('rMd').value) : null;
        a = md ? agoOf($('rMd').value) : null;
        if (!md || a === null || a !== B.agoOf(md)) return t('Choose the date of the meeting.');
        if (a < B.agoOf(r.date) || a > B.agoOf(r.date) + MEET_DAYS) return t('The meeting must be on or before this date, and no more than 12 weeks before it.');
        r.met = { date: md, on: online('rMw') };
        return '';
      }
      why = box.querySelector('[data-nomeet][aria-pressed="true"]');
      if (!why) return t('Choose why there was no meeting.');
      note = $('rNote').value.replace(/\s+/g, ' ').trim().slice(0, 300);
      if (why.dataset.nomeet === 'other' && !note) return t('Write a short note: “Other” needs one.');
      r.nm = why.dataset.nomeet; if (note) r.note = note;
      return '';
    }
    function meetFlag(e) {
      var m;
      if (e.k !== 'reservation' && e.k !== 'contract') return '';
      if (e.nm) return '<span class="mflag">' + t('No meeting') + ' · ' + NOMEET[e.nm] + (e.note ? ': “' + esc(e.note) + '”' : '') + '</span>';
      if (e.k === 'contract' && e.of) return '';
      m = meetBehind(e.c, e.d, [e.m, e.m2 === undefined ? -1 : e.m2]);
      return m && m.on ? '<span class="mflag ok">' + t('Online meeting · {date}', { date: fmt(m.d) }) + '</span>' : '';
    }
    function meetFacts(e) {
      if (e.k === 'meeting' && e.on !== undefined) return [[t('Where'), e.on ? t('Online') : t('In person')]];
      if (!e.nm) return [];
      return [[t('Meeting'), t('No meeting') + ' · ' + NOMEET[e.nm]]].concat(e.note ? [[t('Note'), esc(e.note)]] : []);
    }
    var pickable = function (i) { return B.companies[i] !== undefined && B.onSheet(i) && B.handles(ME, i); };
    function recentCompanies() { var seen = {}, out = []; events.filter(function (e) { return e.k === 'offer' && e.c !== null; }).sort(newest).forEach(function (e) { if (!seen[e.c]) { seen[e.c] = 1; out.push(e.c); } }); return out.filter(pickable).slice(0, 6); }
    /* THE COMPANY IS FOUND BY TYPING (build 138): names that start with the letters first; nothing is
       chosen until a name is tapped, or the whole name is typed exactly. The choice is kept in #rC. */
    var PICK_MOST = 40;
    function companyField(chosen, recent) {
      var has = chosen >= 0 && pickable(chosen);
      return '<div class="fld pick"><label for="rCq">' + t('Brokerage company') + '</label>' +
        '<input id="rCq" type="text" enterkeyhint="search" autocomplete="off" autocapitalize="off" spellcheck="false" role="combobox" aria-controls="rCl" aria-expanded="false" placeholder="' + esc(t('Type a company name')) + '" value="' + (has ? esc(B.companies[chosen]) : '') + '">' +
        '<input id="rC" type="hidden" value="' + (has ? chosen : '') + '" data-recent="' + (recent || []).join(',') + '">' +
        '<div class="pick-list" id="rCl" role="listbox" hidden></div></div>';
    }
    function pickList() {
      var q = $('rCq'), box = $('rCl'), kept = $('rC');
      if (!q || !box || !kept) return;
      var want = q.value.trim().toLowerCase(), list, top = '', ok = [];
      var label = function (x) {
        var n = B.companies[x.item];
        if (x.at === undefined || n.toLowerCase().length !== n.length) return esc(n);
        return esc(n.slice(0, x.at)) + '<b>' + esc(n.slice(x.at, x.at + want.length)) + '</b>' + esc(n.slice(x.at + want.length));
      };
      if (!want) { list = (kept.dataset.recent || '').split(',').filter(Boolean).map(Number).filter(pickable).map(function (i) { return { item: i }; }); top = list.length ? t('Your recent companies') : ''; }
      else { B.companies.forEach(function (n, i) { if (pickable(i)) ok.push(i); }); list = nameFind(ok, want, function (i) { return B.companies[i]; }); }
      box.innerHTML = (top ? '<p class="pick-h">' + top + '</p>' : '') +
        list.slice(0, PICK_MOST).map(function (x) { return '<button class="pick-o" type="button" role="option" data-pc="' + x.item + '">' + label(x) + '</button>'; }).join('') +
        (want && !list.length ? '<p class="pick-none">' + t('No company of yours matches.') + '</p>' : '') +
        (list.length > PICK_MOST ? '<p class="pick-none">' + t('{n} more. Type more letters.', { n: list.length - PICK_MOST }) + '</p>' : '');
      box.hidden = !box.innerHTML;
      box.scrollTop = 0;
      q.setAttribute('aria-expanded', String(!box.hidden));
    }
    function pickShut() { var box = $('rCl'); if (box) { box.hidden = true; box.innerHTML = ''; } if ($('rCq')) $('rCq').setAttribute('aria-expanded', 'false'); }
    function pickChoose(i) {
      if (!$('rC') || !pickable(i)) return;
      $('rC').value = i; $('rCq').value = B.companies[i];
      pickShut();
      if ($('rErr')) $('rErr').hidden = true;
      meetAsk();
    }
    function pickExact() {
      if (!$('rC') || $('rC').value !== '' || !$('rCq')) return;
      var want = $('rCq').value.trim().toLowerCase(), found = [];
      if (!want) return;
      B.companies.forEach(function (n, i) { if (n.trim().toLowerCase() === want && pickable(i)) found.push(i); });
      if (found.length === 1) pickChoose(found[0]);
    }
    /* who can go with him or share the deal: his own team (the same manager) */
    function mates() {
      return TEAM.map(function (p, i) { return i; }).filter(function (i) { return i !== ME && TEAM[i].team && TEAM[i].team === WHO.team; });
    }
    function openMyRecord() {
      var k = myRec.kind, went = k === 'orientation' || k === 'workshop', recent = recentCompanies();
      var opts = mates().map(function (i) { return '<option value="' + i + '">' + esc(TEAM[i].name) + '</option>'; }).join('');
      var company = companyField(myRec.company, recent);
      var date = '<label class="fld">' + t('Date') + '<input type="date" id="rD" min="' + iso(SPAN) + '" max="' + iso(0) + '" value="' + iso(0) + '"></label>';
      var mate = function (label) { return '<label class="fld">' + label + '<select id="rS"><option value="">' + t('No one') + '</option>' + opts + '</select></label>'; };
      var unit = '<label class="fld">' + t('Unit code') + '<input id="rU" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="G-22"></label><p class="chk wait" id="rChk">' + t('Type the unit code to see the unit.') + '</p>';
      var priceF = function (label) { return '<label class="fld">' + label + '<input id="rV" type="text" inputmode="numeric" autocomplete="off"></label>'; };
      var body;
      if (went) body = company + '<div class="range">' + date + mate(t('Also went')) + '</div>';
      else if (k === 'meeting') body = company + '<div class="range"><label class="fld">' + t('Line') + '<select id="rP">' + B.products.map(function (p, i) { return '<option value="' + i + '">' + esc(prod(p)) + '</option>'; }).join('') + '</select></label>' + date + '</div>' + whereField('rW2');
      else if (k === 'reservation') body = company + unit + meetBox() + '<div class="range">' + priceF(t('Reservation price, EGP')) + date + '</div>' + mate(t('Split the deal with'));
      else body = '<label class="fld">' + t('Which reservation was signed') + '<select id="rR">' + A.open.map(function (e) { return '<option value="' + esc(e.id) + '">' + esc(e.u + ' · ' + book[e.c].name + ' · ' + fmt(e.d)) + '</option>'; }).join('') + '<option value="">' + t('A unit with no reservation recorded') + '</option></select></label>' +
        '<div class="form" id="rFree"' + (A.open.length ? ' hidden' : '') + '>' + company + unit + mate(t('Split the deal with')) + '</div>' + meetBox() + planField() + '<div class="range">' + priceF(t('Contract price, EGP')) + date + '</div>';
      showSheet('<div><h3>' + t('Record') + '</h3><p class="role">' + t('Entered under your name: {name}', { name: nm(WHO.name) }) + '</p></div><div class="form">' +
        '<div class="chips">' + ['orientation', 'workshop', 'meeting', 'reservation', 'contract'].map(function (x) { return '<button class="chip" type="button" data-k="' + x + '" aria-pressed="' + (k === x) + '">' + KIND[x] + '</button>'; }).join('') + '</div>' + body +
        '<p class="note bad" id="rErr" hidden></p><button class="btn" type="button" id="rSave">' + SAVE[k] + '</button></div>');
      if (k === 'contract') fromReservation(); else meetAsk();
    }
    function grouped(v) { return Math.round(v).toLocaleString('en-US'); }
    function fromReservation() {
      var rs = A.open.filter(function (e) { return e.id === $('rR').value; })[0], v = $('rV');
      $('rFree').hidden = !!rs;
      if (rs) { v.value = grouped(rs.v); v.dataset.auto = '1'; } else if (v.dataset.auto) v.value = '';
      planList();
      meetAsk();
    }
    /* THE PAYMENT PLAN OF A CONTRACT (build 141): picked before it is saved; the plans follow the unit
       (a pharmacy only its own offer); a special deal is "Another plan", with its down payment and years */
    function planUnit() {
      var rs = $('rR') && $('rR').value ? A.open.filter(function (e) { return e.id === $('rR').value; })[0] : null;
      if (rs) return B.unit(rs.u);
      return $('rU') ? B.unit($('rU').value) : null;
    }
    var GROUPS = ((CONFIG.projects || [])[0] || {}).planGroups || {};
    function planOptions(u, chosen) {
      var list = B.plans(u), html = '<option value="">' + esc(t('Pick the plan')) + '</option>', seen = {};
      list.forEach(function (pl) {
        if (pl.id === 'other' || seen[pl.group]) return;
        seen[pl.group] = 1;
        html += '<optgroup label="' + esc(t(GROUPS[pl.group] || pl.group)) + '">' + list.filter(function (x) { return x.group === pl.group; }).map(function (x) { return '<option value="' + esc(x.id) + '"' + (x.id === chosen ? ' selected' : '') + '>' + esc(N.tx.plan(x.label)) + '</option>'; }).join('') + '</optgroup>';
      });
      return html + '<optgroup label="' + esc(t('A special deal')) + '"><option value="other"' + (chosen === 'other' ? ' selected' : '') + '>' + esc(t('Another plan')) + '</option></optgroup>';
    }
    function planField() {
      return '<label class="fld">' + t('Payment plan') + '<select id="rPl">' + planOptions(null, '') + '</select></label>' +
        '<div class="range" id="rPlO" hidden><label class="fld">' + t('Down payment, %') + '<input id="rPd" type="text" inputmode="decimal" autocomplete="off"></label>' +
        '<label class="fld">' + t('Years') + '<input id="rPy" type="text" inputmode="decimal" autocomplete="off"></label></div>';
    }
    function planList() {
      var s = $('rPl'), was;
      if (!s) return;
      was = s.value;
      s.innerHTML = planOptions(planUnit(), was);
      if (s.value !== was) s.value = '';
      $('rPlO').hidden = s.value !== 'other';
    }
    function planOnto(r, u) {
      var id = $('rPl').value, list, d, y, i;
      if (!id) return t('Pick the payment plan the customer signed.');
      if (id === 'other') {
        d = typedNumber($('rPd').value); y = typedNumber($('rPy').value);
        if (d === null || y === null || !(d >= 0 && d <= 100 && y >= 0 && y <= 30 && (y > 0 || d === 100))) return t('Type the down payment, from 0 to 100, and the years, up to 30.');
        r.pl = 'other'; r.pd = d; r.py = y; return '';
      }
      list = B.plans(u);
      for (i = 0; i < list.length; i++) if (list[i].id === id) { r.pl = id; r.pd = list[i].down; r.py = list[i].years; return ''; }
      return t('Pick the payment plan the customer signed.');
    }
    function planText(e) {
      var list = B.plans(B.unit(e.u)), i;
      if (e.pl === 'other') return t('Another plan') + ' · ' + (e.py === 0 ? t('Cash') : t('{d}% down · {y} years', { d: e.pd, y: e.py }));
      for (i = 0; i < list.length; i++) if (list[i].id === e.pl) return N.tx.plan(list[i].label);
      return String(e.pl);
    }
    function planRow(e) { return [t('Payment plan'), e.pl ? nm(planText(e)) : t('Not recorded')]; }
    function checkUnit() {
      var box = $('rChk'), code = $('rU').value.trim(), u = B.unit(code), v = $('rV'), free;
      planList();
      if (!code) { box.className = 'chk wait'; box.textContent = t('Type the unit code to see the unit.'); return; }
      if (!u) { box.className = 'chk bad'; box.textContent = t('No unit has this code. Check it and type it again.'); return; }
      free = B.available(code);
      box.className = 'chk' + (free ? '' : ' warn');
      box.textContent = [u.code, prod(u.line), u.area ? t('{n} m²', { n: u.area }) : '', u.listPrice ? t('list price EGP {n}', { n: grouped(u.listPrice) }) : '', free ? '' : t('shown as not available today')].filter(Boolean).join(' · ');
      if (u.listPrice && (!v.value || v.dataset.auto)) { v.value = grouped(u.listPrice); v.dataset.auto = '1'; }
    }
    function saveMyRecord() {
      var k = myRec.kind, bad = function (msg) { var n = $('rErr'); n.textContent = msg; n.hidden = false; };
      var date = B.fromIso($('rD').value), rs = null, r, u = null, code, v, e, d, need;
      if (!date || agoOf($('rD').value) !== B.agoOf(date)) return bad(t('Choose a date in the last 12 weeks.'));
      d = B.agoOf(date);
      r = { k: k, m: ME, date: date };
      if (k === 'contract' && $('rR').value) {
        rs = A.open.filter(function (x) { return x.id === $('rR').value; })[0];
        if (!rs) return bad(t('That reservation is no longer open.'));
        /* the contract keeps the reservation's company, unit and names: a split deal stays split */
        r.c = rs.c; r.u = rs.u; r.p = rs.p; r.of = rs.id; r.m = rs.m; if (rs.m2 !== undefined) r.m2 = rs.m2;
        u = B.unit(rs.u);
      } else {
        pickExact(); if ($('rC').value === '') return bad(t('Choose the brokerage company.'));
        r.c = +$('rC').value;
        if (!pickable(r.c)) return bad(t('This company is not one of yours on the broker list.'));
      }
      if (k === 'meeting') r.p = B.products[+$('rP').value];
      if (k === 'reservation' || (k === 'contract' && !rs)) {
        code = $('rU').value.trim(); u = B.unit(code);
        if (!code) return bad(t('Enter the unit code.'));
        if (!u) return bad(t('No unit has this code. Check it and type it again.'));
        /* one unit, one open reservation, one contract: judged on the floor's rows, his or a colleague's */
        if (all.some(function (x) { return x.k === 'contract' && String(x.u).toUpperCase() === u.code.toUpperCase(); })) return bad(t('A contract is already recorded on {code}.', { code: u.code }));
        if (all.some(function (x) { return x.k === 'reservation' && !x.end && String(x.u).toUpperCase() === u.code.toUpperCase(); })) return bad(t('There is already an open reservation on {code}.', { code: u.code }));
        r.u = u.code; r.p = B.productOf(u);
      }
      if (k === 'reservation' || k === 'contract') {
        v = price($('rV').value);
        if (!(v > 0)) return bad(t('Enter the price in EGP.'));
        r.v = v;
      }
      need = k === 'contract' ? planOnto(r, u) : ''; if (need) return bad(need);
      if (!rs && $('rS') && $('rS').value !== '') r.m2 = +$('rS').value;
      need = meetOnto(r); if (need) return bad(need);
      if (k === 'meeting') r.on = online('rW2');
      if ((k === 'orientation' || k === 'workshop') && events.some(function (x) { return x.k === k && x.c === r.c && x.d === d; }))
        return bad(k === 'orientation' ? t('You already recorded an orientation at {name} on {date}.', { name: B.companies[r.c], date: fmt(d) }) : t('You already recorded a workshop at {name} on {date}.', { name: B.companies[r.c], date: fmt(d) }));
      e = B.add(r);
      if (!e) return bad(t('This could not be saved. Try again.'));
      myRec.company = -1;
      load(); refresh(); compute(); closeSheet(); draw(true);
      N.toast(t(B.demo ? 'Saved in this demo: {what}' : 'Saved: {what}', { what: KIND[e.k] + ' · ' + book[e.c].name }));
    }

    function profileMy() {
      var fact = function (f) { return '<div><span>' + f[0] + '</span><b>' + f[1] + '</b></div>'; };
      var mine = book.filter(function (c) { return pickable(c.id); }).length;
      return '<section class="card wide"><div class="me"><div class="av">' + esc(N.initials(WHO.name)) + '</div><div><h1>' + esc(WHO.name) + '</h1><p>' + title(WHO.title) + '</p></div></div></section>' +
        '<section class="card"><h2>' + t('Your account') + '</h2><div class="facts">' +
          [[t('Developer'), 'Najm Developments'], [t('Project'), 'VELN'], WHO.manager ? [t('Reports to'), nm(WHO.manager.name) + (AR ? '، ' : ', ') + title(WHO.manager.title)] : null,
            [t('Brokerage companies'), t('{n} on the broker list are yours', { n: mine })], [t('What you see'), t('Your own activity only')]].filter(Boolean).map(fact).join('') + '</div></section>' +
        '<section class="card"><h2>' + t('What the words mean') + '</h2><dl class="defs">' +
          [['ink', t('Special request'), t('An offer a company asked you for. It is counted when you send the offer: there is nothing to type. A broadcast is an offer sent to no one in particular.')],
            ['ink', t('Orientation'), t('A visit to a brokerage company to present the project. It led to a request when the company asked within 7 business days.')],
            ['ink', t('Workshop'), t('A working session at a company that asks a lot and has brought no meeting. It led to a meeting when one followed within 14 business days.')],
            ['active', STATE.active, t('Asked you for an offer in the last two weeks.')], ['quiet', STATE.quiet, t('Was asking you, then nothing for two weeks.')], ['inactive', STATE.inactive, t('No request to you for a month.')],
            ['ink', t('Effective'), t('Brought at least one meeting in the dates shown.')]].map(function (d) { return '<div><i class="s-' + d[0] + '"></i><dt>' + d[1] + '</dt><dd>' + d[2] + '</dd></div>'; }).join('') + '</dl></section>' +
        '<section class="card"><h2>' + t('Settings') + '</h2><div class="facts"><div><span>' + t('Language') + '</span><b><span class="chips"><button class="chip" type="button" data-lang="en" lang="en" aria-pressed="' + !AR + '">English</button><button class="chip" type="button" data-lang="ar" lang="ar" aria-pressed="' + AR + '">العربية</button></span></b></div>' + fact([t('Opens on'), t('Last 30 days')]) + '</div>' +
          (B.demo && B.recorded() ? '<button class="btn ghost" type="button" id="wipe">' + t('Clear what was recorded in this demo') + '</button>' : '') +
          '<button class="btn ghost" type="button" id="out">' + t('Sign out') + '</button></section>' +
        '<p class="note center">' + t(B.demo ? 'Najm · My activity · demo figures' : 'Najm · My activity') + '</p>';
    }

    var SCREENS = {
      /* a sales agent's one page of figures: sales, the six tiles, his companies, what he entered */
      my: function () { return head(t('My activity')) + cardSales() + tiles() + cardDeck() + cardEntered(); },
      profile: profileMy
    };

    /* ---- drawing ---------------------------------------------------------- */
    function draw(keep, hush) {
      var scr = $('scr'), y = window.scrollY;
      scr.className = 'scr' + (keep || hush ? '' : ' in');
      scr.innerHTML = SCREENS[look.tab]();
      [].forEach.call(scr.children, function (el, i) { el.style.setProperty('--i', i); });
      window.scrollTo(0, keep ? y : 0);
      if (!keep) countUp(scr, hush ? 260 : 0);
      deckInit();
      [].forEach.call(document.querySelectorAll('.sb-btn'), function (b) { var on = (look.tab === 'profile' ? 'me' : 'pulse') === b.dataset.k; if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
      try { history.replaceState(null, '', look.tab === 'profile' ? '#profile' : location.pathname + location.search); } catch (e) { /* the tab is simply not remembered */ }
    }
    function countUp(root, wait) {
      if (N.reduced) return;
      [].forEach.call(root.querySelectorAll('[data-n]'), function (el) {
        var to = +el.dataset.n, dec = +el.dataset.dec || 0, t0 = null;
        function step(now) { if (!t0) t0 = now; var k = Math.min(1, (now - t0) / 750), v = to * (1 - Math.pow(1 - k, 3)); el.textContent = dec ? v.toFixed(dec) : Math.round(v); if (k < 1) requestAnimationFrame(step); }
        /* the timer is the floor: a background tab runs no frames, and must not be left on 0 */
        function go() { requestAnimationFrame(step); setTimeout(function () { el.textContent = el.dataset.n; }, 900); }
        el.textContent = '0'; if (wait) setTimeout(go, wait); else go();
      });
    }
    var opener = null;
    function showSheet(html) {
      if (!$('sheet').classList.contains('on')) opener = document.activeElement;
      $('sheet').innerHTML = '<span class="grab"></span><button class="x" id="closeSheet" type="button" aria-label="' + esc(t('Close')) + '">✕</button>' + html;
      $('sheet').scrollTop = 0;
      $('sheet').classList.add('on'); $('veil').classList.add('on');
      document.documentElement.classList.add('is-locked');
      $('closeSheet').addEventListener('click', closeSheet);
    }
    function closeSheet() {
      closeGlass();
      if (!$('sheet').classList.contains('on')) return;
      $('sheet').classList.remove('on'); $('veil').classList.remove('on');
      document.documentElement.classList.remove('is-locked');
      if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
    }

    /* ---- the sheets --------------------------------------------------------- */
    function openCompany(id) {
      var c = book[id]; if (!c) return;
      var mine = events.filter(function (e) { return e.c === id && inP(e); }), n = A.byC[id];
      var prods = {}; mine.forEach(function (e) { if (e.k === 'offer') prods[e.p] = (prods[e.p] || 0) + 1; });
      var CW = companyWeeks(id), cols = spanCols();
      GB.c = { label: c.name, head: nm(c.name), c: CW };
      showSheet('<div><h3>' + esc(c.name) + '</h3><p class="role">' + pill(c.state, true) + ' · ' + ago(c) + (c.first !== null ? ' · ' + t('first asked {date}', { date: fmt(c.first) }) : '') + '</p></div>' +
        '<p class="sec">' + (!cols ? t('Requests to you · 12 weeks') : t('Requests to you') + ' · ' + spanName(cols)) + '</p>' + bars(CW, '', 'c') +
        (c.ev.some(isVisit) ? '<p class="note">' + t('{o} orientation · {w} workshop, in the week it took place.', { o: '<b>' + KIND.orientation.charAt(0) + '</b>', w: '<b>' + KIND.workshop.charAt(0) + '</b>' }) + '</p>' : '') +
        '<p class="sec">' + rangeText() + '</p>' + kv([[n.special, t('Requests')], [n.meeting, t('Meetings')], [n.reservation, t('Reservations')], [n.contract, t('Contracts')]]) +
        (n.cancel ? '<p class="note"><b>' + t('{x} cancelled', { x: count(n.cancel, 'reservation') }) + '</b> ' + t('in these dates.') + '</p>' : '') +
        (mine.length ? (Object.keys(prods).length ? '<p class="sec">' + t('Asks for') + '</p><div class="tags">' + Object.keys(prods).map(function (p) { return '<span>' + prod(p) + ' · ' + prods[p] + '</span>'; }).join('') + '</div>' : '') +
          '<p class="sec">' + t('Latest with you') + '</p>' + feed(mine.slice().sort(newest).slice(0, 5))
          : '<p class="note">' + t('No activity with you in these dates.') + '</p>') +
        storyOf(c) +
        (pickable(id) ? '<button class="btn ghost" type="button" data-rec="' + id + '">' + t('Record something with this company') + '</button>' : ''));
    }
    var TILE = { orientation: t('Orientations'), workshop: t('Workshops'), offers: t('Offers sent'), meeting: t('Meetings'), reservation: t('Reservations'), contract: t('Contracts') };
    function tileList(k) {
      if (k === 'orientation' || k === 'workshop') return A.visits.filter(function (x) { return x.e.k === k; });
      if (k === 'offers') return A.list.filter(function (e) { return e.k === 'offer' || e.k === 'direct'; }).sort(newest);
      if (k === 'meeting') return A.list.filter(function (e) { return e.k === 'meeting'; }).sort(newest);
      return A.deals.filter(function (e) { return e.k === k || (k === 'reservation' && e.k === 'cancel'); });
    }
    function openTile(k) {
      var n = A.tot, list = tileList(k), body, none = '<p class="note">' + t('None recorded in these dates.') + '</p>';
      if (k === 'offers') {
        /* on his own page this sheet is the only place his broadcasts of the dates are counted */
        body = kv([[n.special, t('Special requests')], [n.direct, t('Direct clients')], [n.broadcast, t('Broadcasts')], [distinct(list, 'c').length, t('Companies asked')]], 'k22') +
          '<p class="note">' + t('These are counted by themselves when you send an offer. There is nothing to type. A broadcast is counted once, however many times you send it.') + '</p>' +
          (list.length ? '<p class="sec">' + t('Newest first') + '</p>' + feed(list.slice(0, 12)) + (list.length > 12 ? '<p class="note">' + t('{n} more in these dates.', { n: list.length - 12 }) + '</p>' : '') : '');
      } else if (k === 'orientation' || k === 'workshop') {
        var okN = list.filter(function (x) { return x.f.ok; }).length;
        body = kv([[okN, k === 'orientation' ? t('Led to a request') : t('Led to a meeting')], [list.length - okN, t('Nothing followed yet')], [distinct(list.map(function (x) { return x.e; }), 'c').length, t('Companies')]]) +
          (list.length ? '<p class="sec">' + t('Newest first') + '</p><div class="rows">' + list.map(function (x) { return entryRow(x.e); }).join('') + '</div>' : none);
      } else if (k === 'meeting') {
        body = list.length ? '<div class="rows">' + list.map(entryRow).join('') + '</div>' : none;
      } else {
        body = (k !== 'reservation' && n.value ? '<p class="note">' + t('{v} contracted', { v: money(n.value) }) + '</p>' : '') + (list.length ? '<div class="rows">' + list.map(dealRow).join('') + '</div>' : none);
      }
      showSheet('<div><h3>' + TILE[k] + '</h3><p class="role">' + rangeText() + ' · ' + list.length + '</p></div>' + body);
    }

    function setPeriod(key) {
      var P = PERIODS.filter(function (x) { return x[0] === key; })[0];
      period.key = key;
      if (key !== 'c') { period.from = P[2]; period.to = P[3]; menuOpen = false; }
      compute(); draw(key === 'c');
    }

    /* ---- wiring ----------------------------------------------------------- */
    /* the bar: the heartbeat from Profile plays the pulse and the page comes up after it; the plus opens the form */
    onTap = function (k) {
      if (k === 'plus') { if (look.tab === 'profile') { look.tab = 'my'; draw(); } myRec.company = -1; openMyRecord(); return; }
      var to = k === 'me' ? 'profile' : 'my';
      if (to === look.tab) return;
      var go = function (held) { look.tab = to; menuOpen = false; closeSheet(); draw(false, held); };
      if (to === 'my' && pulse.again(function () { go(true); })) return;
      go(false);
    };
    $('veil').addEventListener('click', closeSheet);
    $('sheet').addEventListener('input', function (e) {
      if ($('rErr')) $('rErr').hidden = true;
      if (e.target.id === 'rU') checkUnit();
      else if (e.target.id === 'rV') delete e.target.dataset.auto;
      else if (e.target.id === 'rCq') { $('rC').value = ''; pickList(); meetAsk(); }
    });
    $('sheet').addEventListener('change', function (e) { if ($('rErr')) $('rErr').hidden = true; if (e.target.id === 'rR' && $('rFree')) fromReservation(); if (e.target.id === 'rPl' && $('rPlO')) $('rPlO').hidden = e.target.value !== 'other'; if (/^r[DS]$/.test(e.target.id)) meetAsk(); });
    $('sheet').addEventListener('focusin', function (e) {
      if (e.target.id === 'rCq') { if ($('rC').value === '') pickList(); }
      else if (!(e.target.closest && e.target.closest('#rCl'))) pickShut();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { if (!closeGlass()) closeSheet(); } });
    ['mouseover', 'focusin'].forEach(function (ev) { document.addEventListener(ev, function (e) { var c = e.target.closest && e.target.closest('[data-w]'); if (c) barPick(c); }); });
    document.addEventListener('click', function (e) {
      var hit = function (a) { return e.target.closest && e.target.closest('[' + a + ']'); };
      /* "sent 2 times" and the target line explain themselves on a tap; a tap anywhere else closes them */
      var why = e.target.closest && e.target.closest('.why');
      [].forEach.call(document.querySelectorAll('.why[aria-expanded="true"]'), function (b) { if (b !== why) b.setAttribute('aria-expanded', 'false'); });
      if (why) { why.setAttribute('aria-expanded', why.getAttribute('aria-expanded') === 'true' ? 'false' : 'true'); return; }
      var c = hit('data-c'), r = hit('data-r'), g = hit('data-go'), k = hit('data-k'), l = hit('data-lang');
      if (e.target.closest('#when')) { menuOpen = !menuOpen; draw(true); }
      else if (e.target.closest('#rSave')) saveMyRecord();
      else if (hit('data-met')) meetPick(hit('data-met'));
      else if (hit('data-where')) pressOne(hit('data-where'));
      else if (hit('data-nomeet')) pressOne(hit('data-nomeet'));
      else if (e.target.closest('#out')) { N.auth.signOut(); N.leave('login.html'); }
      else if (hit('data-pc')) pickChoose(+hit('data-pc').dataset.pc);
      else if (hit('data-rm')) removeEntry(hit('data-rm').dataset.rm);
      else if (hit('data-rec')) { myRec.company = +hit('data-rec').dataset.rec; openMyRecord(); }
      else if (hit('data-e')) { closeGlass(); openEntry(hit('data-e').dataset.e); }
      else if (e.target.closest('#wipe')) { B.reset(); location.reload(); }
      else if (l) { if (l.dataset.lang !== N.lang) N.setLang(l.dataset.lang); }
      else if (hit('data-d')) deckTo(+hit('data-d').dataset.d, true);
      else if (hit('data-w')) { barPick(hit('data-w')); openGlass(hit('data-w')); }
      else if (k && k.closest('#sheet')) { if ($('rC') && $('rC').value !== '') myRec.company = +$('rC').value; myRec.kind = k.dataset.k; openMyRecord(); }
      else if (c) openCompany(+c.dataset.c);
      else if (g) openMyList(g.dataset.go);
      else if (hit('data-s')) openTile(hit('data-s').dataset.s);
      else if (r) setPeriod(r.dataset.r);
    });
    $('scr').addEventListener('change', function (e) {
      if (e.target.id !== 'dFrom' && e.target.id !== 'dTo') return;
      var a = agoOf($('dFrom').value), b = agoOf($('dTo').value);
      if (a === null || b === null) return;
      period.from = Math.max(a, b); period.to = Math.min(a, b);
      compute(); draw(true);
    });
    window.addEventListener('resize', function () { if ($('deck') && $('deck').children.length) deckMark(look.deck); });

    refresh(); compute(); draw(false, held);
    /* the plus on any other page lands here with the record form open */
    if (asked === 'record') { myRec.company = -1; openMyRecord(); }
  }

  if (asked === 'profile' || asked === 'record') { pulse.skip(); begin(false); }
  else pulse.play(function (held) { begin(!!held); });
}());
