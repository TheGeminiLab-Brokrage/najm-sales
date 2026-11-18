/* ------------------------------------------------------------------
   Najm: the book of activity behind My activity (build 13). Main Marks'
   js/manager-book.js (its demo book, build 121 to 145) for Najm.

   WHAT IS REAL: the sales agents (js/config.js, the team sheet), the
   brokerage companies and who handles each one (js/brokers.js, the broker
   sheet, column G), and every unit, size and price in a reservation or a
   contract (a real available unit of js/units.js, at its own list price).

   WHAT IS INVENTED: that any of it happened before today. Najm has no store
   yet, so the requests, broadcasts, visits, meetings, reservations, contracts
   and cancellations of the last 12 weeks are drawn from a fixed seed, and
   every screen says "demo figures". A company's requests go to the agents
   the broker sheet names on it, and to no one else.

   WHAT IS KEPT ON THIS PHONE, ON TOP: every offer the agent sends from the
   app (N.activity.sent, called by js/send.js) and everything recorded with
   the plus. Both stay in this browser only: on another phone nothing
   travels. That is the real store's job, as Main Marks build 127.

   THE SHAPE IS MAIN MARKS'. One row of activity is one event:
     { id, k, c, m, m2, d, t, p, ch, u, area, v, why, end, endD, of }
     k    'offer' | 'meeting' | 'reservation' | 'contract' | 'cancel' | 'orientation' | 'workshop'
     c    company (index into `companies`); null on an offer = a broadcast
     m    sales agent (index into `team`); m2 = the one the deal is split with
     d    days ago; t = minute of that day
     p    the line ('Commercial', 'Administrative', 'Medical'); ch = 'post' | 'pdf'
     u    unit code as the app writes it (G-22); area in m²; v = price in EGP
     n    on an offer sent from this phone: how many times it went (np PDFs, nq posts,
          lt / lc the last time and the last way)
     pl   on a contract: the plan it was signed on (pd down %, py years)

   THE COUNTING RULES ARE MAIN MARKS' (settled by Muhanad, 2026-10-07 and 09):
     - one offer sent again the same day by the same agent as a general
       broadcast is ONE broadcast; the sends are its rounds
     - the same units sent again to the same company within ten minutes is
       ONE special request, even on another payment plan
   ------------------------------------------------------------------ */
(function (root) {
  'use strict';

  var N = root.NJ || (root.NJ = {});
  var SPAN = 83;                                   /* the book goes back 12 weeks */
  var KEY = 'najm.activity.records.v1';            /* what was recorded with the plus on this phone */
  var SENT = 'najm.activity.sent.v1';              /* the offers sent from the app on this phone */
  var WHY = ['Client withdrew', 'Payment not made', 'Moved to another unit', 'Other'];
  var PRODUCTS = ['Commercial', 'Administrative', 'Medical'];
  var LINE_OF = { ground: 'Commercial', first: 'Commercial', second: 'Administrative', third: 'Medical' };
  var SELLABLE = { Available: true };              /* fail closed, as js/project.js */
  var TEN = 10;                                    /* minutes: a special request sent again inside them is one */

  function today0() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function fromIso(s) { var p = String(s || '').split('-'); return p.length === 3 ? new Date(+p[0], +p[1] - 1, +p[2]) : null; }
  function read(key) { try { var a = JSON.parse(root.localStorage.getItem(key) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function write(key, a) { try { root.localStorage.setItem(key, JSON.stringify(a)); } catch (e) { /* this visit only */ } }

  /* the sales agents, in the order of the settings file: the demo agent first, then the team */
  function salesTeam() {
    return (CONFIG.users || []).filter(function (u) { return u.role === 'sales'; }).map(function (u) {
      var mgr = (CONFIG.users || []).filter(function (x) { return x.role === 'sales_manager' && x.name === u.manager; })[0] || null;
      return { name: u.name, title: u.title || 'Sales agent', code: u.email, email: u.email, all: !!u.allCompanies, agentAs: u.agentAs || [], manager: mgr ? { name: mgr.name, title: mgr.title || 'Sales Manager' } : null, team: u.manager || '' };
    });
  }
  function memberOf(email) {
    var T = salesTeam();
    for (var i = 0; i < T.length; i++) if (T[i].email === email) return i;
    return -1;
  }

  /* ---- an offer sent from the app (js/send.js), kept on this phone -----------------------------
     o: { company: name | null, units: ['G-22'], line: 'Commercial', plan: id, ch: 'pdf' | 'post' }.
     Only a sales agent's send is kept: a manager's offer is handed to a sales agent (Main Marks build
     140), which is not built here. Answers the row as it now stands, or null. */
  /* build 19: with the real store on (js/store.js), what is sent and recorded goes to the database */
  function real() { return !!(N.store && N.store.real); }
  function sent(o) {
    var s = N.auth && N.auth.current(), me = s ? memberOf(s.email) : -1;
    if (me === -1 || !o || !o.units || !o.units.length) return null;
    if (real()) return N.store.send(o, s.email);
    var now = new Date(), day = iso(now), t = now.getHours() * 60 + now.getMinutes();
    var units = o.units.slice().sort().join('+'), company = o.company || null;
    /* 2026-11-17: a DIRECT CLIENT of the agent (o.client: name, tel, crm) is its own kind of send, kept apart
       from the brokers' requests and the broadcasts; the same unit to the same client within ten minutes is one */
    var client = o.client && o.client.name ? { name: o.client.name, tel: o.client.tel || '', crm: o.client.crm || '' } : null;
    var who = client ? '@' + client.name.toLowerCase() : company;
    var rows = read(SENT), row = null, i, r;
    for (i = rows.length - 1; i >= 0; i--) {
      r = rows[i];
      var rWho = r.cl ? '@' + r.cl.name.toLowerCase() : (r.c || null);
      if (r.m !== s.email || r.date !== day || r.units !== units || rWho !== who || (r.mg || 0) !== (o.margin || 0)) continue;
      if (who === null ? r.pl === (o.plan || '') : t - r.t <= TEN) { row = r; break; }
    }
    if (!row) {
      row = { id: 's' + now.getTime() + '-' + rows.length, k: 'offer', m: s.email, c: client ? null : company, date: day, t: t, units: units, p: o.line || '', pl: o.plan || '', ch: o.ch, n: 0, np: 0, nq: 0 };
      if (client) row.cl = client;
      /* the margin (2026-11-17): the percent, the list price and what the client was offered */
      if (o.margin) { row.mg = o.margin; row.lp = o.list || 0; row.op = o.price || 0; }
      rows.push(row);
    }
    row.n++; if (o.ch === 'pdf') row.np++; else row.nq++;
    row.lt = t; row.lc = o.ch;
    write(SENT, rows);
    return row;
  }

  /* ---- the book ------------------------------------------------------------------------------ */
  function build() {
    var B = root.NJ_BROKERS, V = root.VELN_UNITS;
    if (!B || !V || !CONFIG) throw new Error('Nothing to build the book from.');
    var team = salesTeam(), companies = B.names.slice(), today = today0();
    /* the demo reads as an afternoon at the earliest; the real store uses the real clock (a step stamped
       later than now is refused by the database, rightly: found live 2026-11-15 at 12:26) */
    var clock = new Date(), now = real() ? clock.getHours() * 60 + clock.getMinutes() : Math.max(clock.getHours() * 60 + clock.getMinutes(), 13 * 60 + 30);
    function dateOf(ago) { var d = new Date(today); d.setDate(d.getDate() - ago); return d; }
    function agoOf(date) { return Math.round((today - new Date(date.getFullYear(), date.getMonth(), date.getDate())) / 864e5); }

    /* who handles each company: the agents the broker sheet names on it (both, when it names two).
       The demo agent handles every tenth company, so its page reads like an agent's, not like 1,118. */
    var byKey = {};
    team.forEach(function (p, i) { p.agentAs.forEach(function (k) { byKey[k] = i; }); });
    var handlers = companies.map(function () { return []; });
    Object.keys(B.agent).forEach(function (k) {
      if (byKey[k] === undefined) return;
      B.agent[k].forEach(function (ci) { if (handlers[ci].indexOf(byKey[k]) === -1) handlers[ci].push(byKey[k]); });
    });
    team.forEach(function (p, i) { if (p.all) companies.forEach(function (n, ci) { if (ci % 10 === 3 && handlers[ci].indexOf(i) === -1) handlers[ci].push(i); }); });
    function handles(m, ci) { return !!team[m] && (team[m].all || handlers[ci].indexOf(m) !== -1); }

    /* the units: the code the app shows (G-22), the indoor area it shows, the list price; and the
       ones a deal can sit on: available, in a fixed order. Zone shares are on hold (no plan): none. */
    var byCode = {}, pool = {}, free = {};
    Object.keys(V.floors).forEach(function (f) {
      var F = V.floors[f];
      (F.units || []).forEach(function (u) {
        var x = { code: F.code + '-' + u.no, ref: u.code, floor: f, line: LINE_OF[f], kind: u.kind, area: Math.round(u.indoor), listPrice: u.price, status: u.status };
        byCode[x.code.toUpperCase()] = x;
        if (u.code) byCode[String(u.code).toUpperCase()] = x;
        if (SELLABLE[u.status] === true) { free[x.code.toUpperCase()] = true; (pool[x.line] || (pool[x.line] = [])).push(x); }
      });
    });
    var sold = PRODUCTS.filter(function (p) { return pool[p] && pool[p].length; });
    if (!sold.length || !companies.length || !team.length) throw new Error('Nothing to build the book from.');
    function productOf(u) { return u.line; }

    /* a teammate under the same manager, for a split deal or a visit made together */
    function mateOf(m, r) {
      var mine = team.map(function (p, i) { return i; }).filter(function (i) { return i !== m && team[i].team && team[i].team === team[m].team; });
      return mine.length ? mine[Math.floor(r * mine.length)] : -1;
    }

    var seed = 20261105;
    function rnd() { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
    function ri(a, b) { return a + Math.floor(rnd() * (b - a + 1)); }
    function minute() { return ri(9 * 60, 20 * 60); }

    var events = [], n = 0, taken = {};
    function push(e) { e.id = 'g' + (n++); events.push(e); return e; }
    function deal(k, ci, m, d, p) {
      var list = pool[p] || pool[sold[0]], at = ri(0, list.length - 1), u = list[at], tries = 0;
      while (taken[u.code] && tries++ < list.length) u = list[(at + tries) % list.length];
      if (taken[u.code]) return null;                                   /* every unit of the line is taken: no deal */
      taken[u.code] = true;
      var e = { k: k, c: ci, m: m, d: d, t: minute(), p: productOf(u), u: u.code, area: u.area, v: u.listPrice };
      if (rnd() < .22) { var o = mateOf(m, rnd()); if (o !== -1) e.m2 = o; }
      return push(e);
    }
    function cancelRow(rs, d, why, t) {
      rs.end = 'cancel'; rs.endD = d;
      return { k: 'cancel', of: rs.id, c: rs.c, m: rs.m, m2: rs.m2, d: d, t: t, p: rs.p, u: rs.u, area: rs.area, v: rs.v, why: why };
    }

    companies.forEach(function (name, ci) {
      var H = handlers[ci], p = rnd(), w = [], i, k;
      for (i = 0; i < 12; i++) w.push(0);
      if (!H.length) return;                                             /* no agent on the broker sheet: nobody's activity */
      if (p < .26) { for (i = 0; i < 12; i++) w[i] = rnd() < .42 ? ri(1, 2) : 0; w[10 + ri(0, 1)] = ri(1, 2); }                           /* steady */
      else if (p < .38) { for (i = 7; i < 12; i++) w[i] = rnd() < .45 ? ri(1, 2) : 0; w[10 + ri(0, 1)] = 1; }                          /* started asking this month */
      else if (p < .49) { for (i = 0; i < 9; i++) w[i] = rnd() < .45 ? ri(1, 2) : 0; w[8 + ri(0, 1)] = 1; w[10] = 0; w[11] = 0; }         /* gone quiet */
      else if (p < .68) { for (i = 0; i < 6; i++) w[i] = rnd() < .45 ? ri(1, 2) : 0; w[ri(0, 5)] = ri(1, 2); }                            /* inactive */
      var total = w.reduce(function (a, b) { return a + b; }, 0), last4 = w[8] + w[9] + w[10] + w[11], last2 = w[10] + w[11];
      var shape = !total ? 'never' : !last4 ? 'inactive' : !last2 ? 'quiet' : 'active';
      var prods = []; for (k = 0; k < ri(1, 2); k++) { var pr = sold[ri(0, sold.length - 1)]; if (prods.indexOf(pr) === -1) prods.push(pr); }
      var mine = [];
      w.forEach(function (cnt, wi) {
        for (k = 0; k < cnt; k++) {
          var d = (11 - wi) * 7 + ri(0, 6);
          mine.push(push({ k: 'offer', c: ci, m: H[rnd() < .7 ? 0 : ri(0, H.length - 1)], d: d, t: minute(), p: prods[ri(0, prods.length - 1)], ch: rnd() < .55 ? 'post' : 'pdf' }));
        }
      });
      var meets = (shape === 'active' && rnd() < .32) ? ri(1, 2) : (shape === 'quiet' && rnd() < .18 ? 1 : (shape === 'inactive' && rnd() < .08 ? 1 : 0));
      for (k = 0; k < meets && mine.length; k++) {
        var src = mine[ri(0, mine.length - 1)], md = Math.max(0, src.d - ri(1, 5));
        push({ k: 'meeting', c: ci, m: src.m, d: md, t: minute(), p: src.p });
        if (rnd() < .42) {
          var rd = Math.max(0, md - ri(1, 6)), rs = deal('reservation', ci, src.m, rd, src.p), fate = rnd();
          if (!rs) continue;
          if (fate < .4 && rd > 1) { var ct = deal('contract', ci, src.m, Math.max(0, rd - ri(2, 9)), src.p); if (ct) { taken[ct.u] = false; ct.p = rs.p; ct.u = rs.u; ct.area = rs.area; ct.v = rs.v; if (rs.m2 !== undefined) ct.m2 = rs.m2; else delete ct.m2; rs.end = 'contract'; } }
          else if (fate < .62 && rd > 1) push(cancelRow(rs, Math.max(0, rd - ri(1, 8)), WHY[ri(0, WHY.length - 2)], minute()));
        }
      }
    });
    /* general broadcasts: an offer sent to nobody in particular. His norm is 3 a day (CONFIG.salesDay):
       most agents meet it on most days, some do not, so the page has both cases. */
    var HABIT = [.75, .5, .7, .35, .65, .45, .8];
    team.forEach(function (tm, m) {
      for (var d = 0; d <= SPAN; d++) for (var k = rnd() < HABIT[m % HABIT.length] ? ri(3, 4) : ri(0, 2); k > 0; k--) push({ k: 'offer', c: null, m: m, d: d, t: minute(), p: sold[ri(0, sold.length - 1)], ch: 'post' });
    });
    /* so the demo always shows the case: two of this month's open reservations are cancelled */
    events.filter(function (e) { return e.k === 'reservation' && !e.end && e.d > 3 && e.d < 27; }).slice(0, 2).forEach(function (rs, i) { push(cancelRow(rs, rs.d - 2 - i, WHY[i], minute())); });

    /* ORIENTATIONS AND WORKSHOPS (Main Marks, Muhanad 2026-10-06), from a SECOND seed so no earlier
       figure moves: a visit followed by a first request, by a company coming back, by a first meeting,
       and visits followed by nothing. */
    var seed2 = 20261106;
    function rnd2() { seed2 |= 0; seed2 = seed2 + 0x6D2B79F5 | 0; var t = Math.imul(seed2 ^ seed2 >>> 15, 1 | seed2); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
    function ri2(a, b) { return a + Math.floor(rnd2() * (b - a + 1)); }
    function visit(k, ci, m, d) { var e = { k: k, c: ci, m: m, d: Math.max(0, Math.min(SPAN, d)), t: ri2(10 * 60, 17 * 60) }; if (rnd2() < .2) { var o = mateOf(m, rnd2()); if (o !== -1) e.m2 = o; } push(e); }
    companies.forEach(function (name, ci) {
      var H = handlers[ci]; if (!H.length) return;
      var oldest = function (a, b) { return b.d - a.d; };
      var asks = events.filter(function (e) { return e.c === ci && e.k === 'offer'; }).sort(oldest);
      var meets = events.filter(function (e) { return e.c === ci && e.k === 'meeting'; }).sort(oldest);
      var i, lately = asks.filter(function (e) { return e.d < 30; }).length;
      if (!asks.length) { if (rnd2() < .12) visit('orientation', ci, H[0], ri2(3, 40)); return; }
      if (asks[0].d < 70 && rnd2() < .55) visit('orientation', ci, asks[0].m, asks[0].d + ri2(2, 6));
      for (i = 1; i < asks.length; i++) if (asks[i - 1].d - asks[i].d >= 21 && rnd2() < .5) visit('orientation', ci, asks[i].m, asks[i].d + ri2(1, 4));
      if (meets.length) { if (asks.filter(function (e) { return e.d > meets[0].d; }).length >= 4 && rnd2() < .5) visit('workshop', ci, meets[0].m, meets[0].d + ri2(3, 8)); }
      else if (lately >= 5 && rnd2() < .25) visit('workshop', ci, asks[asks.length - 1].m, ri2(2, 12));
    });
    /* and the new doors: about two more orientations a week for each agent, at one of his companies that has not asked yet */
    team.forEach(function (tm, m) {
      var doors = companies.map(function (x, ci) { return ci; }).filter(function (ci) { return handlers[ci].indexOf(m) !== -1 && !events.some(function (e) { return e.c === ci && e.k === 'offer'; }); });
      for (var d = 0; d <= SPAN && doors.length; d++) if (rnd2() < .33) visit('orientation', doors[ri2(0, doors.length - 1)], m, d);
    });

    /* Friday is the day off: nothing is sent or signed on one */
    events.forEach(function (e) { if (dateOf(e.d).getDay() === 5) e.d = e.d < SPAN ? e.d + 1 : e.d - 1; });
    events.forEach(function (e) { if (e.k === 'reservation' && e.end === 'cancel') { var c = events.filter(function (x) { return x.of === e.id; })[0]; if (c) { c.d = Math.min(c.d, e.d); e.endD = c.d; } } });
    /* a contract or a cancellation never comes before its reservation, nor a reservation before its meeting */
    /* today's later hours have not happened yet */
    events = events.filter(function (e) { return !(e.d === 0 && e.t > now); });
    events.forEach(function (e) {
      if (e.k !== 'reservation' || !e.end) return;
      var ended = events.some(function (x) { return e.end === 'cancel' ? x.of === e.id : (x.k === 'contract' && x.c === e.c && x.u === e.u); });
      if (!ended) { delete e.end; delete e.endD; }
    });
    /* a contract carries the plan it was signed on, one its unit can take, chosen by the unit's code */
    events.forEach(function (e) {
      if (e.k !== 'contract') return;
      var list = plansFor(byCode[String(e.u).toUpperCase()]).filter(function (pl) { return pl.id !== 'other'; }), h = 0, i, code = String(e.u);
      for (i = 0; i < code.length; i++) h += code.charCodeAt(i);
      var pl = list[h % (list.length || 1)];
      if (pl) { e.pl = pl.id; e.pd = pl.down; e.py = pl.years; }
    });

    /* the real store: no invented history, only what was really sent and recorded */
    if (real()) events = [];

    /* ---- the offers sent from this phone ---- */
    var extra = {};
    function companyAt(name) {
      if (name == null) return null;
      var i = companies.indexOf(name);
      if (i !== -1) return i;
      /* a name typed in the send step that the broker sheet does not hold: kept, and said so */
      if (extra[name] === undefined) { extra[name] = companies.length; companies.push(name); handlers.push([]); }
      return extra[name];
    }
    (real() ? N.store.sends() : read(SENT)).forEach(function (r) {
      var date = fromIso(r.date), m = memberOf(r.m); if (!date || m === -1) return;
      var d = agoOf(date); if (d < 0 || d > SPAN) return;
      var e = { id: r.id, mine: true, k: r.cl ? 'direct' : 'offer', c: r.cl ? null : companyAt(r.c), m: m, d: d, t: r.t, p: r.p, u: r.units, ch: r.ch, n: r.n, np: r.np, nq: r.nq, lt: r.lt, lc: r.lc };
      if (r.cl) e.cl = r.cl;
      if (r.mg) { e.mg = r.mg; e.lp = r.lp; e.op = r.op; }
      events.push(e);
    });

    /* ---- what was recorded with the plus on this phone, kept across visits ---- */
    var stored = real() ? N.store.records() : read(KEY);
    function apply(r) {
      var date = fromIso(r.date); if (!date) return null;
      var d = Math.max(0, Math.min(SPAN, agoOf(date)));
      var c = companies.indexOf(r.c), m = memberOf(r.m);
      if (c === -1 || m === -1) return null;
      var e = { id: r.id, mine: true, k: r.k, c: c, m: m, d: d, t: r.t, p: r.p };
      var m2 = r.m2 ? memberOf(r.m2) : -1;
      if (r.made) e.made = r.made;
      if (r.k === 'reservation' || r.k === 'contract') { e.u = r.u; e.area = r.area || null; e.v = r.v; }
      if (r.k === 'contract' && r.pl) { e.pl = r.pl; e.pd = r.pd; e.py = r.py; }
      if (r.k === 'meeting' && typeof r.on === 'boolean') e.on = r.on;
      if (r.nm) { e.nm = r.nm; if (r.note) e.note = r.note; }
      if (r.k !== 'meeting' && m2 !== -1 && m2 !== m) e.m2 = m2;
      if (r.k === 'contract' && r.of) {
        var from = events.filter(function (x) { return x.id === r.of && x.k === 'reservation' && !x.end; })[0];
        if (from) { from.end = 'contract'; e.of = from.id; }
      }
      events.push(e); return e;
    }
    stored.forEach(apply);
    /* taking an entry back: only what was entered on this phone, on the day it was entered (Main Marks
       build 121). A reservation since signed or cancelled is not taken back from under what followed. */
    function removable(e) { return !!(e && e.mine && e.k !== 'offer' && e.made === iso(today) && !(e.k === 'reservation' && e.end)); }
    function remove(id) {
      var e = events.filter(function (x) { return x.id === id; })[0];
      if (!removable(e)) return false;
      if (e.k === 'contract' && e.of) events.forEach(function (x) { if (x.id === e.of) { delete x.end; delete x.endD; } });
      events.splice(events.indexOf(e), 1);
      stored = stored.filter(function (r) { return r.id !== id; });
      if (real()) N.store.takeBack(id); else write(KEY, stored);
      return true;
    }
    var kept = 0;
    function keep(r) { r.id = 'r' + Date.now() + '-' + (kept++); var e = apply(r); if (e) { stored.push(r); if (real()) N.store.saveRecord(r); else write(KEY, stored); } return e; }

    var book = {
      demo: !real(), span: SPAN, today: today, now: now,
      team: team, companies: companies, products: PRODUCTS, why: WHY,
      events: function () { return events; },
      dateOf: dateOf, agoOf: agoOf, iso: iso, fromIso: fromIso,
      unit: function (code) { return byCode[String(code || '').trim().toUpperCase()] || null; },
      /* for sale today? a code the inventory does not hold is not (fail closed) */
      available: function (code) { var u = book.unit(code); return !!u && !!free[u.code.toUpperCase()]; },
      productOf: productOf,
      plans: plansFor,
      /* the record form offers a sales agent only the companies the broker sheet gives them */
      handles: handles,
      onSheet: function (ci) { return ci < B.names.length; },
      recorded: function () { return stored.length + (real() ? N.store.sends().length : read(SENT).length); },
      add: function (r) {
        var u = r.u ? book.unit(r.u) : null, d = agoOf(r.date);
        if (r.met) { var md = agoOf(r.met.date); keep({ k: 'meeting', c: companies[r.c], m: team[r.m].email, m2: null, date: iso(r.met.date), t: md === 0 ? Math.max(0, now - 1) : 12 * 60, p: u ? productOf(u) : r.p, made: iso(today), on: !!r.met.on }); }
        return keep({ k: r.k, c: companies[r.c], m: team[r.m].email, m2: r.m2 == null ? null : team[r.m2].email, date: iso(r.date), t: d === 0 ? now : 12 * 60,
          p: u ? productOf(u) : r.p, u: u ? u.code : null, area: u ? u.area : null, v: r.v || 0, of: r.of || null, made: iso(today),
          pl: r.k === 'contract' ? r.pl || null : null, pd: r.k === 'contract' && r.pl ? r.pd : null, py: r.k === 'contract' && r.pl ? r.py : null,
          on: r.k === 'meeting' && typeof r.on === 'boolean' ? r.on : null, nm: r.nm || null, note: r.nm && r.note ? r.note : null });
      },
      remove: remove, removable: removable,
      reset: function () { try { root.localStorage.removeItem(KEY); root.localStorage.removeItem(SENT); } catch (e) { /* nothing to clear */ } }
    };
    return book;
  }

  /* THE PLANS A CONTRACT CAN BE SIGNED ON (Main Marks MM.contractPlan, build 141), from Najm's own list:
     a plan that names a kind of unit (the pharmacy) is that kind's only plan, as js/project.js; then
     "Another plan" for a special deal, which asks for its down payment and its years. */
  function plansFor(u) {
    var P = (CONFIG.projects || [])[0], out = [];
    if (!P) return out;
    var kind = u ? u.kind : null;
    var own = kind ? P.plans.filter(function (pl) { return pl.only === kind; }) : [];
    (own.length ? own : P.plans.filter(function (pl) { return !pl.only || !u; })).forEach(function (pl) {
      out.push({ id: pl.id, group: pl.group, label: pl.label, down: pl.cash ? 100 : Math.round(pl.down * 10000) / 100, years: pl.cash ? 0 : (pl.years || pl.months / 12) });
    });
    out.push({ id: 'other', group: 'other', label: 'Another plan' });
    return out;
  }

  N.activity = { sent: sent, build: build, memberOf: memberOf, team: salesTeam, plansFor: plansFor };
}(typeof window !== 'undefined' ? window : globalThis));
