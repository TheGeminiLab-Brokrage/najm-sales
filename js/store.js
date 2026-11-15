/* ------------------------------------------------------------------
   Najm: the real store (build 19), Main Marks' js/auth.js cut to Najm.

   Switched on ONLY when CONFIG.store holds the database's address and its
   public key (the production copy for najm.thegeminilab.com). The demo
   link has no CONFIG.store and runs exactly as before.

   With the store on:
     - sign-in is the database's own (email + password), and the first
       password must be changed before anything else;
     - the team, the companies and who handles each come from the database
       (nothing of it is in the published files);
     - everything an agent sends or records is saved in the database. It is
       kept on the phone first (the outbox) and sent at once, and again until
       the database has it, so a weak line loses nothing;
     - the inventory comes LIVE from Najm's own sheet, through the database,
       laid over the plans (js/units.js) by unit code. A unit the sheet does
       not hold, or whose figures do not agree, is not for sale (fail closed).

   The page's own scripts wait for all of this (N.store.ready): the
   production copy marks them data-later, and they run once it is ready.
   ------------------------------------------------------------------ */
(function (root) {
  'use strict';
  var N = root.NJ;
  var S = root.CONFIG && CONFIG.store;
  var real = !!(S && S.url && S.anon);
  N.store = { real: real };
  if (!real) { N.store.ready = Promise.resolve(); return; }

  var SKEY = 'najm.session', OUTBOX = 'najm.outbox.v1', IDS = 'najm.ids.v1';
  var TEN = 10, SPAN_DAYS = 90;
  function load(k, dflt) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? dflt : v; } catch (e) { return dflt; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private window: this visit only */ } }

  /* ---- talking to the database ------------------------------------- */
  function api(path, opt, token) {
    opt = opt || {};
    var ctl = root.AbortController ? new AbortController() : null;
    var timer = ctl ? setTimeout(function () { ctl.abort(); }, 25000) : null;
    var headers = { apikey: S.anon, Authorization: 'Bearer ' + (token || S.anon), 'Content-Type': 'application/json' };
    if (opt.count) headers.Prefer = 'count=exact';
    return fetch(S.url + path, { method: opt.method || 'GET', headers: headers, body: opt.body ? JSON.stringify(opt.body) : undefined, signal: ctl ? ctl.signal : undefined })
      .then(function (r) {
        if (timer) clearTimeout(timer);
        return r.text().then(function (t) {
          var j = null; try { j = t ? JSON.parse(t) : null; } catch (e) { j = null; }
          if (!r.ok) { var err = new Error((j && (j.message || j.error_description || j.msg || j.error)) || ('HTTP ' + r.status)); err.status = r.status; err.body = j; throw err; }
          return j;
        });
      }, function (e) { if (timer) clearTimeout(timer); var err = new Error('offline'); err.offline = true; throw err; });
  }
  function session() { return load(SKEY, null); }
  function setSession(s) { save(SKEY, s); }
  var renewing = null;
  /* a valid token, renewed a minute before it ends; a refused renewal signs out */
  function token() {
    var s = session();
    if (!s || !s.real) return Promise.reject(new Error('signed out'));
    if (s.exp && s.exp * 1000 > Date.now() + 60000) return Promise.resolve(s.access);
    if (!renewing) renewing = api('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: s.refresh } })
      .then(function (r) {
        var t = session() || s;
        t.access = r.access_token; t.refresh = r.refresh_token; t.exp = r.expires_at || Math.floor(Date.now() / 1000) + (r.expires_in || 3600);
        setSession(t); renewing = null; return t.access;
      }, function (e) {
        renewing = null;
        if (!e.offline) { try { localStorage.removeItem(SKEY); } catch (x) { /* gone */ } }
        throw e;
      });
    return renewing;
  }
  function rpc(name, body) { return token().then(function (t) { return api('/rest/v1/rpc/' + name, { method: 'POST', body: body || {} }, t); }); }
  function get(path) { return token().then(function (t) { return api('/rest/v1/' + path, null, t); }); }
  /* every row of a table, a page at a time (the store hands 1,000 rows and says nothing more) */
  function getAll(path) {
    var out = [];
    function page(from) {
      return get(path + (path.indexOf('?') < 0 ? '?' : '&') + 'limit=1000&offset=' + from).then(function (r) {
        out = out.concat(r || []);
        return r && r.length === 1000 ? page(from + 1000) : out;
      });
    }
    return page(0);
  }

  /* ---- signing in -------------------------------------------------- */
  function roleOf(p) { return p.role === 'check' ? 'sales' : p.role; }
  N.auth = {
    real: true,
    current: function () { var s = session(); return s && s.real ? s : null; },
    /* answers a Promise of { ok, why, mustChange } */
    signIn: function (who, code) {
      who = String(who || '').trim().toLowerCase();
      if (!who || !code) return Promise.resolve({ ok: false, why: N.t('Enter your work email and password.') });
      return api('/auth/v1/token?grant_type=password', { method: 'POST', body: { email: who, password: code } }).then(function (r) {
        return api('/rest/v1/rpc/nj_me', { method: 'POST', body: {} }, r.access_token).then(function (me) {
          if (!me || !me.active) return { ok: false, why: N.t('This account is not active. Ask the admin.') };
          var s = { real: true, uid: me.id, email: me.email, name: me.name, title: me.title, role: roleOf(me), at: Date.now(),
            access: r.access_token, refresh: r.refresh_token, exp: r.expires_at || Math.floor(Date.now() / 1000) + (r.expires_in || 3600), mustChange: !!me.must_change };
          setSession(s);
          return { ok: true, session: s, mustChange: s.mustChange };
        });
      }, function (e) {
        if (e.offline) return { ok: false, why: N.t('No connection. Check the internet and try again.') };
        return { ok: false, why: N.t('That email and password do not match.') };
      });
    },
    /* at least 10 characters, letters and numbers, not an easy one (Main Marks' rule, build 146) */
    passwordProblem: function (pw, email) {
      pw = String(pw || '');
      if (pw.length < 10) return N.t('Use at least 10 characters.');
      if (!/[a-z]/i.test(pw) || !/[0-9]/.test(pw)) return N.t('Use letters and numbers.');
      var low = pw.toLowerCase(), name = String(email || '').split('@')[0].split('.')[0];
      if (/(password|qwerty|123456|najm|veln|abcdef)/.test(low) || (name.length > 2 && low.indexOf(name) >= 0)) return N.t('That one is too easy to guess.');
      return '';
    },
    changePassword: function (pw) {
      return token().then(function (t) { return api('/auth/v1/user', { method: 'PUT', body: { password: pw } }, t); })
        .then(function () { return rpc('nj_password_changed', {}); })
        .then(function () { var s = session(); if (s) { s.mustChange = false; setSession(s); } return { ok: true }; },
          function (e) { return { ok: false, why: e.offline ? N.t('No connection. Check the internet and try again.') : N.t('The password could not be changed. Try another one.') }; });
    },
    signOut: function () {
      var s = session();
      if (s && s.real && s.access) { try { api('/auth/v1/logout', { method: 'POST' }, s.access).catch(function () {}); } catch (e) { /* signed out here anyway */ } }
      try { localStorage.removeItem(SKEY); } catch (e) { /* nothing kept */ }
    }
  };

  /* ---- the live inventory, over the plans --------------------------- */
  function clean(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }
  function num(v) {
    if (typeof v === 'number') return v;
    var s = String(v == null ? '' : v).trim();
    if (!s) return null;
    /* an Arabic-locale cell: ٬ groups thousands, ٫ is the decimal point (a plain strip makes it 100x) */
    s = s.replace(/[٬,\s]/g, '').replace('٫', '.').replace(/[٠-٩]/g, function (d) { return String(d.charCodeAt(0) - 0x660); });
    var n = Number(s);
    return isFinite(n) ? n : null;
  }
  function heads(rows) {
    var h = {};
    (rows[1] || []).forEach(function (c, i) { var k = clean(c).toLowerCase(); if (k && !(k in h)) h[k] = i; });
    return h;
  }
  /* answers how many units the sheet changed, or throws when the sheet is not the one we know */
  function overlay(V, data) {
    var U = data && data.units, Z = data && data.zones;
    if (!U || U.length < 3) throw new Error('The inventory sheet came back empty.');
    var H = heads(U), need = ['unit code', 'cross unit area indoor', 'outdoor space', 'total area price', 'per meter', 'final total price', 'total unit price', 'unit status', 'maintenance'];
    need.forEach(function (k) { if (!(k in H)) throw new Error('The inventory sheet has no column "' + k + '".'); });
    var byCode = {};
    U.slice(2).forEach(function (r) {
      var code = clean(r[H['unit code']]).toUpperCase(); if (!code) return;
      byCode[code] = { indoor: num(r[H['cross unit area indoor']]), outdoor: num(r[H['outdoor space']]) || 0, area: num(r[H['total area price']]),
        perM: num(r[H['per meter']]), price: num(r[H['final total price']]), total: num(r[H['total unit price']]),
        status: clean(r[H['unit status']]), maintenance: num(r[H['maintenance']]) };
    });
    var changed = 0;
    Object.keys(V.floors).forEach(function (f) {
      var fl = V.floors[f];
      fl.units.forEach(function (u) {
        var s = byCode[String(u.code).toUpperCase()];
        var was = u.status;
        if (!s) { u.status = 'Not on the sheet'; }
        else {
          var agrees = s.price > 0 && s.price === s.total && (!s.perM || !s.area || Math.abs(s.area * s.perM - s.price) <= 1);
          u.indoor = s.indoor != null ? s.indoor : u.indoor; u.outdoor = s.outdoor; u.area = s.area; u.perM = s.perM;
          u.price = s.price; u.maintenance = s.maintenance;
          u.status = agrees ? s.status : 'Figures to check';
        }
        if (u.status !== was) changed++;
      });
      if (fl.zones && Z && Z.length > 2) {
        var ZH = heads(Z), zc = ZH['unit code'], za = ZH['cross unit area'], zp = ZH['total area price'], zf = ZH['final total price'], zs = ZH['unit status'];
        if ([zc, za, zp, zf, zs].some(function (x) { return x === undefined; })) throw new Error('The zones tab is not the one we know.');
        var shares = {};
        Z.slice(2).forEach(function (r) {
          var code = clean(r[zc]), m = /-(Z\d)-/.exec(code); if (!m) return;
          var o = { code: code, area: num(r[za]), perM: num(r[zp]), price: num(r[zf]), status: clean(r[zs]) };
          if (!(o.price > 0) || Math.abs(o.area * o.perM - o.price) > 1) o.status = 'Figures to check';
          (shares[m[1]] = shares[m[1]] || []).push(o);
        });
        fl.zones.forEach(function (z) { z.shares = shares[z.no] || []; });
      }
    });
    return changed;
  }

  /* ---- the agent's own rows, and what is waiting to be sent ---------- */
  var people = [], companies = [], companyId = {}, events = [], me = null;
  function outbox() { return load(OUTBOX, []).filter(function (x) { return me && x.email === me.email; }); }
  function setOutbox(list) {
    var others = load(OUTBOX, []).filter(function (x) { return !me || x.email !== me.email; });
    save(OUTBOX, others.concat(list));
  }
  function personId(email) { var p = people.filter(function (x) { return x.email === email; })[0]; return p ? p.id : null; }
  function emailOf(id) { var p = people.filter(function (x) { return x.id === id; })[0]; return p ? p.email : null; }
  function isoOf(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  /* never later than now: the database refuses a step in the future */
  function notLater(iso) { var t = Date.parse(iso); return isFinite(t) && t > Date.now() ? new Date().toISOString() : iso; }
  function atOf(date, t) { var p = String(date).split('-'); var d = new Date(+p[0], +p[1] - 1, +p[2]); d.setMinutes(t || 0); return d.toISOString(); }

  /* one send = one raw row; the counting rules (Main Marks') are applied when read, as the book does */
  function merge(raw) {
    var rows = [];
    raw.slice().sort(function (a, b) { return a.at < b.at ? -1 : a.at > b.at ? 1 : 0; }).forEach(function (s) {
      var d = new Date(s.at), day = isoOf(d), t = d.getHours() * 60 + d.getMinutes(), company = s.c || null, row = null, i, r;
      for (i = rows.length - 1; i >= 0; i--) {
        r = rows[i];
        if (r.m !== s.m || r.date !== day || r.units !== s.units || (r.c || null) !== company) continue;
        if (company === null ? r.pl === (s.pl || '') : t - r.t <= TEN) { row = r; break; }
      }
      if (!row) { row = { id: 'o' + s.id, k: 'offer', m: s.m, c: company, date: day, t: t, units: s.units, p: s.p || '', pl: s.pl || '', ch: s.ch, n: 0, np: 0, nq: 0 }; rows.push(row); }
      row.n++; if (s.ch === 'pdf') row.np++; else row.nq++;
      row.lt = t; row.lc = s.ch;
    });
    return rows;
  }
  function rawSends() {
    var list = events.filter(function (e) { return e.k === 'offer'; }).map(function (e) {
      var x = e.detail || {};
      return { id: 'db' + e.id, at: e.at, m: emailOf(e.person_id) || x.m, c: e.company_name || null, units: x.units || e.units, p: e.line, pl: e.plan, ch: e.channel };
    });
    outbox().filter(function (o) { return o.kind === 'send'; }).forEach(function (o) { list.push(o.row); });
    return list;
  }
  function records() {
    var ids = load(IDS, {}), back = {};
    outbox().filter(function (o) { return o.kind === 'back'; }).forEach(function (o) { back[o.id] = 1; });
    var list = events.filter(function (e) { return e.k !== 'offer' && e.detail && e.detail.k; }).map(function (e) {
      var r = JSON.parse(JSON.stringify(e.detail)); r.id = 'db' + e.id; return r;
    });
    outbox().filter(function (o) { return o.kind === 'record'; }).forEach(function (o) { if (!ids[o.row.id]) list.push(o.row); });
    list.forEach(function (r) { if (r.of && ids[r.of]) r.of = 'db' + ids[r.of]; });
    return list.filter(function (r) { return !back[r.id] && !(ids[r.id] && back['db' + ids[r.id]]); });
  }

  /* send what is waiting, one at a time, oldest first; a refusal (not a lost line) is kept aside */
  var flushing = null;
  function flush() {
    if (flushing || !me) return flushing || Promise.resolve();
    var list = outbox();
    if (!list.length) return Promise.resolve();
    var o = list[0], ids = load(IDS, {}), call;
    if (o.kind === 'back') {
      var dbid = /^db(\d+)$/.exec(o.id) ? +o.id.slice(2) : ids[o.id];
      call = dbid ? rpc('nj_take_back', { p_id: dbid }) : Promise.resolve();
    } else {
      /* a contract made from a reservation saved a moment ago points at the reservation's saved row */
      var dt = o.body.p_detail;
      if (dt && dt.of && ids[dt.of]) { dt.of = 'db' + ids[dt.of]; setOutbox(outbox().map(function (x) { return x.qid === o.qid ? o : x; })); }
      call = rpc('nj_record', o.body).then(function (id) {
        if (o.kind === 'record') { ids[o.row.id] = id; save(IDS, ids); }
        /* the page's own copy holds the saved row from now on, as a reload would read it */
        var b = o.body;
        events.push({ id: id, person_id: me.id, k: b.p_k, company_name: b.p_company_name || '', channel: b.p_channel || '', line: b.p_line || '',
          units: b.p_units || '', plan: b.p_plan || '', at: b.p_at, detail: b.p_detail || {} });
      });
    }
    flushing = call.then(function () {
      setOutbox(outbox().filter(function (x) { return x.qid !== o.qid; }));
      flushing = null; return flush();
    }, function (e) {
      flushing = null;
      if (e.offline || e.status >= 500 || e.message === 'signed out') return;   /* a lost line: try again later */
      /* refused by the database: kept aside on this phone, never lost, never retried in a loop */
      var kept = load('najm.refused.v1', []); kept.push({ o: o, why: e.message, at: new Date().toISOString() }); save('najm.refused.v1', kept);
      setOutbox(outbox().filter(function (x) { return x.qid !== o.qid; }));
      /* the agent is told at once, in words, and the page is read again so it shows only what is saved */
      if (o.kind === 'record') {
        var u = (o.row && o.row.u) || '', m = String(e.message || '');
        sorry(/NJ_UNIT_TAKEN/.test(m) ? N.t('Not saved: {unit} is already reserved by a colleague.', { unit: u })
          : /NJ_UNIT_SOLD/.test(m) ? N.t('Not saved: a contract is already recorded on {unit}.', { unit: u })
          : N.t('Not saved. Open the page again and check, or tell the admin.'));
      }
      return flush();
    });
    return flushing;
  }
  function queue(o) {
    o.email = me.email; o.qid = 'q' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    setOutbox(outbox().concat([o]));
    flush();
  }
  root.addEventListener('online', function () { flush(); });
  setInterval(function () { flush(); }, 30000);

  /* what the book (js/activity-book.js) asks of the store */
  N.store.sends = function () { return merge(rawSends()); };
  N.store.records = records;
  N.store.send = function (o, email) {
    var units = o.units.slice().sort().join('+'), at = new Date().toISOString();
    var row = { id: 'q' + Date.now(), at: at, m: email, c: o.company || null, units: units, p: o.line || '', pl: o.plan || '', ch: o.ch };
    queue({ kind: 'send', row: row, body: { p_k: 'offer', p_company: o.company ? (companyId[o.company] || null) : null, p_company_name: o.company || '',
      p_channel: o.ch || '', p_line: o.line || '', p_units: units, p_plan: o.plan || '', p_detail: { units: units, m: email }, p_at: at } });
    var rows = merge(rawSends());
    return rows.filter(function (r) { return r.m === email && r.units === units && (r.c || null) === (o.company || null); }).pop() || null;
  };
  N.store.saveRecord = function (r) {
    queue({ kind: 'record', row: r, body: { p_k: r.k, p_company: companyId[r.c] || null, p_company_name: r.c || '', p_channel: '', p_line: r.p || '',
      p_units: r.u || '', p_area: r.area || null, p_value: r.v || null, p_plan: r.pl || '', p_partner: r.m2 ? personId(r.m2) : null,
      p_detail: r, p_at: notLater(atOf(r.date, r.t)) } });
  };
  N.store.takeBack = function (id) { queue({ kind: 'back', id: id }); };
  N.store.waiting = function () { return outbox().length; };

  /* ---- before the page: who, whose companies, what happened, what is for sale ---- */
  /* the waiting scripts come AFTER this one in the page: read them once the page has been read */
  var parsed = document.readyState !== 'loading' ? Promise.resolve()
    : new Promise(function (ok) { document.addEventListener('DOMContentLoaded', ok, { once: true }); });
  function laterScripts() {
    return parsed.then(runLater);
  }
  function runLater() {
    var list = [].slice.call(document.querySelectorAll('script[data-later]'));
    return list.reduce(function (p, s) {
      return p.then(function () {
        return new Promise(function (ok, no) {
          var x = document.createElement('script'); x.src = s.getAttribute('data-later'); x.async = false;
          x.onload = ok; x.onerror = function () { no(new Error('Could not load ' + x.src)); };
          document.body.appendChild(x);
        });
      });
    }, Promise.resolve());
  }
  function sorry(msg) {
    var box = document.createElement('div');
    box.className = 'store-sorry';
    box.setAttribute('role', 'alert');
    box.style.cssText = 'position:fixed;left:16px;right:16px;top:30%;z-index:99;padding:20px;border-radius:16px;background:#18263E;color:#fff;' +
      'border:1px solid #54C6C1;font:15px/1.5 Poppins,system-ui,sans-serif;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.5)';
    box.innerHTML = '<p></p><button type="button"></button>';
    box.querySelector('p').textContent = msg;
    box.querySelector('button').textContent = N.t('Try again');
    box.querySelector('button').style.cssText = 'margin-top:12px;padding:10px 22px;border:0;border-radius:10px;background:#54C6C1;color:#0E1828;font:600 14px Poppins,system-ui,sans-serif';
    box.querySelector('button').addEventListener('click', function () { location.reload(); });
    document.body.appendChild(box);
  }
  var s0 = session();
  var onLogin = /(^|\/)login\.html$/.test(location.pathname);
  if (!s0 || !s0.real || onLogin) { N.store.ready = laterScripts(); return; }
  if (s0.mustChange) { location.replace('login.html?change=1'); N.store.ready = new Promise(function () {}); return; }

  var since = new Date(Date.now() - SPAN_DAYS * 864e5).toISOString();
  N.store.ready = Promise.all([
    getAll('nj_people?select=id,email,name,full_name,title,role,manager,active&order=name.asc'),
    getAll('nj_companies?select=id,name&order=name.asc,id.asc'),
    getAll('nj_company_agents?select=company_id&person_id=eq.' + s0.uid),
    getAll('nj_events?select=*&taken_back_at=is.null&at=gte.' + encodeURIComponent(since) + '&order=at.asc'),
    root.VELN_UNITS ? rpc('nj_inventory', {}) : Promise.resolve(null)
  ]).then(function (r) {
    people = r[0]; companies = r[1]; events = r[3];
    me = people.filter(function (p) { return p.id === s0.uid; })[0];
    if (!me) throw new Error('signed out');
    /* the team, as js/config.js held it in the demo: from the database now */
    CONFIG.usersDemo = false;
    CONFIG.users = people.filter(function (p) { return p.active; }).map(function (p) {
      return { email: p.email, name: p.name, full: p.full_name, title: p.title, role: roleOf(p), manager: p.manager, agentAs: [p.email], team: true };
    });
    var idx = {};
    companies.forEach(function (c, i) { companyId[c.name] = c.id; idx[c.id] = i; });
    root.NJ_BROKERS = { names: companies.map(function (c) { return c.name; }), agent: {}, manager: {} };
    root.NJ_BROKERS.agent[me.email] = r[2].map(function (x) { return idx[x.company_id]; }).filter(function (i) { return i !== undefined; });
    /* the live inventory over the plans; without a first read, nothing is for sale */
    if (root.VELN_UNITS) {
      var inv = r[4];
      if (!inv || !inv.rows) throw new Error('inventory');
      overlay(root.VELN_UNITS, inv.rows);
      N.store.inventoryAt = inv.read_at; N.store.inventoryFresh = !!inv.fresh;
      root.VELN_UNITS.asOf = String(inv.read_at || '').slice(0, 10);
    }
    flush();
    return laterScripts();
  }).catch(function (e) {
    if (e && e.message === 'signed out') { location.replace('login.html'); return; }
    sorry(e && e.message === 'inventory'
      ? N.t('The inventory could not be read just now, so nothing can be offered. Try again in a minute.')
      : (e && e.offline) ? N.t('No connection. Check the internet and try again.') : N.t('The app could not load your account. Try again.'));
    throw e;
  });
}(typeof window !== 'undefined' ? window : globalThis));
