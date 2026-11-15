/* ------------------------------------------------------------------
   Najm: SENDING AN OFFER (build 8), Main Marks' send step (js/lineflow.js
   askAudience + deliver, js/post.js open) for Najm:

     1. Who is this offer for? A broker's special request (which company
        asked: the agent's OWN companies, js/brokers.js) or a general
        broadcast (groups, channels, status).
     2. Send it as: the offer PDF (seven pages, for one broker) or a WhatsApp
        post (a picture and text, for groups). And in English or Arabic.
     3. The PDF (build 9) is shown page by page, then saved (the viewer's own
        save on the claude.ai link), shared (a phone's share sheet), opened in
        a tab, or its text copied; WhatsApp Web with the text is one button
        among them, not the way out. The post: a phone's share sheet (the
        picture, with the text); a laptop, WhatsApp Web with the text and the
        picture saved to attach (a laptop's share flyout can hang for ever and
        a web page cannot hand WhatsApp Web a file: playbook 01, 4 and 5).

   The PDF is built while the question is answered: an iPhone refuses to open
   the share sheet once the tap has waited for anything (playbook 01: "build the
   share file when the panel opens"). Nothing is saved anywhere yet: there is
   no store behind the demo: build 13 counts each send on this phone for My activity.

     NJ.send.start({ project, line, items: [{ u, f }], plan })
   ------------------------------------------------------------------ */
(function (root) {
  'use strict';
  var N = root.NJ || (root.NJ = {});
  var el = N.el;

  function handheld() {
    try {
      if (navigator.userAgentData && typeof navigator.userAgentData.mobile === 'boolean') return navigator.userAgentData.mobile;
      return typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
    } catch (e) { return false; }
  }
  function canShare(payload) {
    try { return typeof navigator.share === 'function' && typeof navigator.canShare === 'function' && navigator.canShare(payload); }
    catch (e) { return false; }
  }
  /* navigator.share, but it always settles */
  function shareOrTimeOut(payload) {
    return Promise.race([navigator.share(payload), new Promise(function (ok, no) {
      setTimeout(function () { var e = new Error('share timed out'); e.name = 'TimeoutError'; no(e); }, 60000);
    })]);
  }
  function saveFile(file) {
    var url = URL.createObjectURL(file), a = document.createElement('a');
    a.href = url; a.download = file.name; a.style.display = 'none';
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); if (a.parentNode) a.parentNode.removeChild(a); }, 30000);
  }
  /* copy without awaiting anything first; a fallback where the clipboard API refuses */
  function copyText(text, box) {
    try { if (navigator.clipboard && root.isSecureContext) { navigator.clipboard.writeText(text).catch(function () {}); return true; } } catch (e) { /* below */ }
    if (box) { box.focus(); box.select(); try { var ok = document.execCommand('copy'); box.setSelectionRange(0, 0); return ok; } catch (e2) { return false; } }
    return false;
  }
  /* WhatsApp's own address, not wa.me: wa.me's redirect turns every emoji into U+FFFD (Main Marks, 2026-10-03) */
  function whatsapp(text) { root.open('https://api.whatsapp.com/send?text=' + encodeURIComponent(text), '_blank', 'noopener'); }

  /* build 9: the viewer's own save. On the claude.ai link the page is inside the viewer's
     frame, which refuses a hidden download; its "downloads" capability asks the viewer and
     saves (a browser download on a laptop, the share sheet in the Claude iPhone app). The
     app runs inside the demo's phone frame, an iframe of the same folder, so the viewer's
     runtime may be one window up. Anywhere else (a local copy) there is none: a plain download. */
  /* build 12 (Muhanad, 2026-11-05: "it blocks me when i try to save the pdf"): the save runs
     in the demo page, not here. Called from this frame with a PDF made in this frame's window,
     the viewer did not take it as a file, and the plain download that followed is blocked
     inside claude.ai. Now: the demo page's NJsave (demo.html) gets the bytes, makes the file
     in its own window and saves it there. Inside the viewer there is NO plain download any
     more; a refusal says its reason. -> null (a local copy: a plain download) |
     { save } (the viewer saves) | { none: true } (inside the viewer, saving refused) */
  var saver = null, lastCode = '';
  function viewerSave() {
    if (!saver) {
      var host = null, viewer = false;
      try {
        for (var w = root; w; w = w.parent) {
          if (!host && typeof w.NJsave === 'function') host = w;
          if (w.claude && typeof w.claude.use === 'function') viewer = true;
          if (w === w.parent) break;
        }
      } catch (e) { /* a window of another origin: no further */ }
      if (host) {
        saver = host.NJcanSave().then(function (ok) {
          if (!ok) return viewer ? { none: true } : null;
          return { save: function (file) { return file.arrayBuffer().then(function (buf) { return host.NJsave(buf, file.name); }); } };
        }, function () { return viewer ? { none: true } : null; });
      } else if (root.claude && typeof root.claude.use === 'function') {
        /* the app opened as the viewer's page itself: the file is made in this same window */
        saver = Promise.resolve(root.claude.use('downloads')).then(function (d) {
          return d ? { save: function (file) { return d.save({ filename: file.name, data: file }); } } : { none: true };
        }, function () { return { none: true }; });
      } else saver = Promise.resolve(viewer ? { none: true } : null);
    }
    return saver;
  }
  /* what to say when a file was not kept */
  function notKept(r) {
    return r === 'declined' ? N.t('Not saved.') : r === 'busy' ? N.t('A save is already waiting for you. Answer it first.')
      : r === 'unavailable' ? N.t('Saving is not allowed in this view. Use Share PDF.') : N.t('The PDF could not be saved ({code}). Use Share PDF.', { code: lastCode });
  }
  /* -> 'saved' | 'browser' (a local copy: the browser's own download) | 'declined' | 'busy' |
        'unavailable' (inside the viewer, saving refused here) | 'failed' (lastCode says why) */
  function keepFile(file) {
    return viewerSave().then(function (s) {
      if (!s) { saveFile(file); return 'browser'; }
      if (!s.save) return 'unavailable';
      return s.save(file).then(function () { return 'saved'; }, function (e) {
        var code = e && e.code;
        if (code === 'declined') return 'declined';
        if (code === 'rate_limited') return 'busy';
        if (code === 'unavailable' || code === 'not_granted' || code === 'capability_disabled' || code === 'capability_removed') return 'unavailable';
        lastCode = String(code || (e && e.message) || 'unknown');
        return 'failed';
      });
    });
  }

  /* the in-app preview: pdf.js (Mozilla, Apache 2.0) draws each page */
  var V = (root.CONFIG && CONFIG.stamp) || '0', pdfjs = null;
  function pdfLib() {
    if (!pdfjs) pdfjs = new Promise(function (ok, no) {
      var done = function () {
        if (!root.pdfjsLib) { no(new Error('the preview did not load')); return; }
        root.pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdfjs/pdf.worker.min.js?v=' + V;
        ok(root.pdfjsLib);
      };
      if (root.pdfjsLib) { done(); return; }
      var s = document.createElement('script');
      s.src = 'vendor/pdfjs/pdf.min.js?v=' + V; s.onload = done;
      s.onerror = function () { no(new Error('the preview did not load')); };
      document.head.appendChild(s);
    });
    pdfjs.catch(function () { pdfjs = null; });
    return pdfjs;
  }
  function preview(blob, box) {
    return Promise.all([pdfLib(), blob.arrayBuffer()]).then(function (g) {
      return g[0].getDocument({ data: new Uint8Array(g[1]) }).promise;
    }).then(function (doc) {
      box.textContent = '';
      var wide = Math.max(240, box.clientWidth - 20), dpr = Math.min(root.devicePixelRatio || 1, 2);
      var chain = Promise.resolve();
      function page(i) {
        return doc.getPage(i).then(function (pg) {
          var vp = pg.getViewport({ scale: wide * dpr / pg.getViewport({ scale: 1 }).width });
          var c = el('canvas', 'sd-page');
          c.width = Math.round(vp.width); c.height = Math.round(vp.height);
          c.setAttribute('role', 'img'); c.setAttribute('aria-label', N.t('Page {i} of {n}', { i: i, n: doc.numPages }));
          box.appendChild(c);
          return pg.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
        });
      }
      for (var i = 1; i <= doc.numPages; i++) chain = chain.then(page.bind(null, i));
      return chain.then(function () { return doc.numPages; });
    });
  }

  var AGENT_KEY = 'najm.agent', LAST_KEY = 'najm.sendto';
  function remember(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* this device only */ } }
  function recall(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }

  /* the sheet both steps use: a card that rises from the foot of the screen */
  function sheet(labelId) {
    var box = el('div', 'sd');
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-labelledby', labelId);
    var dim = el('div', 'sd-dim'), card = el('div', 'sd-card');
    box.appendChild(dim); box.appendChild(card);
    var onKey;
    function close() {
      box.classList.remove('in');
      document.removeEventListener('keydown', onKey);
      setTimeout(function () { if (box.parentNode) box.parentNode.removeChild(box); }, 300);
    }
    onKey = function (e) { if (e.key === 'Escape') close(); };
    dim.addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    function show() { document.body.appendChild(box); void box.offsetWidth; box.classList.add('in'); }
    return { box: box, card: card, close: close, show: show };
  }
  /* a row of choices, one pressed */
  function choices(list, onPick) {
    var wrap = el('div', 'sd-opts');
    list.forEach(function (x) {
      var b = el('button', 'sd-opt');
      b.type = 'button'; b.dataset.v = x.v;
      b.setAttribute('aria-pressed', 'false');
      b.appendChild(el('span', 'sd-opt-t', x.t));
      if (x.s) b.appendChild(el('span', 'sd-opt-s', x.s));
      if (x.lang) b.lang = x.lang;
      b.addEventListener('click', function () { onPick(x.v, true); });
      wrap.appendChild(b);
    });
    wrap.set = function (v) { [].forEach.call(wrap.children, function (b) { b.setAttribute('aria-pressed', String(b.dataset.v === v)); }); };
    return wrap;
  }

  /* names that BEGIN with the letters first, then the ones that contain them (Main Marks) */
  function matches(list, q, max) {
    q = q.trim().toLowerCase();
    if (!q) return list.slice(0, max);
    var a = [], b = [];
    list.forEach(function (n) { var s = n.toLowerCase(), i = s.indexOf(q); if (i === 0) a.push(n); else if (i > 0) b.push(n); });
    return a.concat(b).slice(0, max);
  }

  function start(o) {
    var me = N.me() || {}, mine = N.companies(me);
    /* build 10: the offer comes out in the app's language (Main Marks js/offerpdf.js, MM.lang) */
    var lang = N.lang === 'ar' ? 'ar' : 'en';
    var last = recall(LAST_KEY) || {};
    var codes = o.items.map(function (x) { return window.VELN_UNITS.floors[x.f].code + '-' + x.u.no; });

    /* fail closed before anything opens: the offer must work out */
    try { N.offer.work(o); } catch (e) { N.toast(N.t('This offer cannot be sent: {why}', { why: e.message })); return; }

    var made = {}, ready = {};
    function prepare(lg) {
      if (!ready[lg]) {
        ready[lg] = N.offer.pdf(Object.assign({}, o, { lang: lg })).then(function (r) { made[lg] = r; check(); return r; }, function (e) {
          made[lg] = { error: e }; check(); throw e;
        });
        ready[lg].catch(function () { /* told on the sheet */ });
      }
      return ready[lg];
    }

    var S = sheet('sdWhoH'), card = S.card;
    card.appendChild(el('p', 'sd-k', N.t('Before you send') + ' · ' + codes.join(', ')));
    var h = el('h3', 'sd-h', N.t('Who is this offer for?')); h.id = 'sdWhoH';
    card.appendChild(h);
    var audience = null, format = null, fmtByHand = false;
    var who = choices([
      { v: 'broker', t: N.t('Special request'), s: N.t('A broker asked for it, for their company.') },
      { v: 'broadcast', t: N.t('General broadcast'), s: N.t('Groups, channels, status. No single company.') }
    ], function (v) { pickAudience(v); });
    card.appendChild(who);

    var co = el('div', 'sd-co');
    var lab = el('label', 'sd-k', N.t('Which company asked?')); lab.setAttribute('for', 'sdCo');
    co.appendChild(lab);
    var inp = el('input', 'sd-in'); inp.id = 'sdCo'; inp.type = 'text'; inp.autocomplete = 'off';
    inp.placeholder = mine.length ? N.t('Type the company’s name') : N.t('Type the brokerage company');
    inp.setAttribute('role', 'combobox'); inp.setAttribute('aria-expanded', 'false'); inp.setAttribute('aria-controls', 'sdCoList');
    co.appendChild(inp);
    var drop = el('div', 'sd-drop'); drop.id = 'sdCoList'; drop.setAttribute('role', 'listbox'); drop.hidden = true;
    co.appendChild(drop);
    var coNote = el('p', 'sd-note');
    coNote.textContent = mine.length ? (me.allCompanies ? N.t('All {n} companies (demo account).', { n: mine.length }) : N.t('{n} companies you handle.', { n: mine.length })) : N.t('No companies are listed for you yet. Type the company.');
    co.appendChild(coNote);
    co.hidden = true;
    card.appendChild(co);
    function listed(v) { v = v.trim().toLowerCase(); return mine.filter(function (n) { return n.toLowerCase() === v; })[0] || null; }
    function paintDrop() {
      var m = matches(mine, inp.value, 8);
      drop.textContent = '';
      if (listed(inp.value) || !m.length) { drop.hidden = true; inp.setAttribute('aria-expanded', 'false'); return; }
      m.forEach(function (n) {
        var b = el('button', 'sd-pick', n);
        b.type = 'button'; b.setAttribute('role', 'option');
        /* pointerdown, not click: on a phone the keyboard closing moves the list under the finger */
        b.addEventListener('mousedown', function (e) { e.preventDefault(); });
        b.addEventListener('click', function () { inp.value = n; drop.hidden = true; check(); });
        drop.appendChild(b);
      });
      drop.hidden = false; inp.setAttribute('aria-expanded', 'true');
    }
    inp.addEventListener('input', function () { paintDrop(); check(); });
    inp.addEventListener('focus', paintDrop);
    inp.addEventListener('blur', function () { setTimeout(function () { drop.hidden = true; }, 150); });

    card.appendChild(el('p', 'sd-k', N.t('Send it as')));
    var fmt = choices([
      { v: 'pdf', t: N.t('Offer PDF'), s: N.t('The 6-page offer, for one broker.') },
      { v: 'post', t: N.t('WhatsApp post'), s: N.t('A picture and text, for groups.') }
    ], function (v, byHand) { format = v; fmtByHand = !!byHand; fmt.set(v); check(); });
    card.appendChild(fmt);

    var note = el('p', 'sd-note sd-say'); note.setAttribute('aria-live', 'polite');
    card.appendChild(note);
    var acts = el('div', 'sd-acts');
    var cancel = el('button', 'sd-ghost', N.t('Cancel')); cancel.type = 'button';
    var go = el('button', 'sd-go', N.t('Continue')); go.type = 'button';
    acts.appendChild(cancel); acts.appendChild(go);
    card.appendChild(acts);
    cancel.addEventListener('click', S.close);

    function pickAudience(v) {
      audience = v; who.set(v);
      co.hidden = v !== 'broker';
      if (v === 'broker' && !inp.value && last.company && listed(last.company)) inp.value = listed(last.company);
      if (!fmtByHand) { format = v === 'broker' ? 'pdf' : 'post'; fmt.set(format); }
      if (format === 'pdf') prepare(lang);
      check();
    }
    function check() {
      var m = made[lang];
      var waiting = format === 'pdf' && !m;
      var failed = format === 'pdf' && m && m.error;
      go.textContent = waiting ? N.t('Preparing the offer PDF…') : format === 'post' ? N.t('Make the post') : N.t('See the offer PDF');
      note.textContent = failed ? N.t('The offer PDF could not be made: {why}', { why: m.error.message })
        : audience === 'broker' && inp.value.trim() && !listed(inp.value) ? N.t('Not one of your companies. Check the name before sending.') : '';
      go.disabled = !audience || !format || waiting || !!failed || (audience === 'broker' && !inp.value.trim());
    }
    fmt.addEventListener('click', function () { if (format === 'pdf') prepare(lang); });

    go.addEventListener('click', function () {
      if (go.disabled) return;
      var to = { audience: audience, company: audience === 'broker' ? (listed(inp.value) || inp.value.trim()) : null };
      remember(LAST_KEY, to);
      S.close();
      /* build 13: a send that left the phone is counted in My activity (js/activity-book.js), as Main Marks counts
         every send: to a company a special request, to no one a broadcast. Opening a sheet and closing it is not a send. */
      var counted = function (ch) {
        if (!N.activity) return;
        try { N.activity.sent({ company: to.company, units: codes, line: o.line && o.line.name, plan: (o.plan && o.plan.id) || '', ch: ch }); } catch (e) { /* the send itself goes on */ }
      };
      if (format === 'post') { post(o, to, lang, counted); return; }
      showPdf(made[lang], N.offer.message(Object.assign({}, o, { lang: lang, agent: { name: me.name } })), to, codes, lang, counted);
    });

    S.show();
    if (last.audience) pickAudience(last.audience); else check();
    S.box.querySelector('.sd-opt').focus();
  }

  /* build 9: the PDF, made, is SHOWN first, then kept or sent from here. WhatsApp is one way
     out, not the only one: api.whatsapp.com is blocked on some networks, and the hidden
     download it relied on is refused inside the claude.ai frame. Every button is its own tap
     with the file already made, so an iPhone still opens its share sheet. */
  function showPdf(made, text, to, codes, lang, counted) {
    var file;
    try { file = new File([made.blob], made.name, { type: 'application/pdf' }); } catch (e) { file = made.blob; file.name = made.name; }
    var phone = handheld() && canShare({ files: [file] });
    var S = sheet('sdPdfH'), card = S.card;
    card.classList.add('sd-post');
    var head = el('div', 'sd-head'), hl = el('div');
    hl.appendChild(el('p', 'sd-k', N.t('Offer PDF') + ' · ' + (to.audience === 'broker' && to.company ? to.company : N.t('General broadcast'))));
    var h = el('h3', 'sd-h', codes.join(' + ')); h.id = 'sdPdfH';
    hl.appendChild(h);
    head.appendChild(hl);
    var x = el('button', 'sd-x', '×'); x.type = 'button'; x.setAttribute('aria-label', N.t('Close'));
    x.addEventListener('click', function () { S.close(); });
    head.appendChild(x);
    card.appendChild(head);
    card.appendChild(el('p', 'sd-note', N.t('{n} pages', { n: made.pages }) + ' · ' + (lang === 'ar' ? N.t('Arabic') : N.t('English')) + ' · ' + N.t('{n} KB', { n: Math.max(1, Math.round(made.blob.size / 1024)) })));
    var pages = el('div', 'sd-pages'); pages.tabIndex = 0;
    pages.setAttribute('aria-label', N.t('The offer PDF, page by page'));
    pages.appendChild(el('p', 'sd-note', N.t('Opening the pages…')));
    card.appendChild(pages);

    var acts = el('div', 'sd-acts');
    var share = el('button', 'sd-go', N.t('Share PDF')); share.type = 'button'; share.hidden = !phone;
    var keep = el('button', phone ? 'sd-ghost' : 'sd-go', N.t('Save PDF')); keep.type = 'button';
    acts.appendChild(keep); acts.appendChild(share);
    card.appendChild(acts);
    var more = el('div', 'sd-more');
    var openIt = el('button', 'sd-ghost', N.t('Open in a new tab')); openIt.type = 'button';
    var copy = el('button', 'sd-ghost', N.t('Copy text')); copy.type = 'button';
    var wa = el('button', 'sd-ghost', N.t('Text to WhatsApp')); wa.type = 'button';
    more.appendChild(openIt); more.appendChild(copy); more.appendChild(wa);
    card.appendChild(more);
    /* the words that travel with the PDF, to read or change before copying */
    var words = el('details', 'sd-words');
    words.appendChild(el('summary', null, N.t('The text that goes with it')));
    var ta = el('textarea', 'sd-text'); ta.rows = 7; ta.value = text; ta.dir = lang === 'ar' ? 'rtl' : 'ltr';
    ta.setAttribute('aria-label', N.t('The text that goes with the PDF. You can edit it before copying.'));
    words.appendChild(ta);
    card.appendChild(words);
    var note = el('p', 'sd-note sd-say'); note.setAttribute('aria-live', 'polite');
    card.appendChild(note);

    var SAID = { saved: N.t('Saved. Attach it in WhatsApp; the text is copied.'), browser: N.t('Downloaded. Attach it in WhatsApp; the text is copied.'),
      declined: N.t('Not saved.'), busy: N.t('A save is already waiting for you. Answer it first.'),
      unavailable: N.t('Saving is not allowed in this view. Use Share PDF.') };
    function said(r) { return r === 'failed' ? N.t('The PDF could not be saved ({code}). Use Share PDF.', { code: lastCode }) : SAID[r]; }
    keep.addEventListener('click', function () {
      /* the text first: once a save or share prompt is open the page has lost focus and the clipboard refuses */
      copyText(ta.value, null);
      keepFile(file).then(function (r) { if (r === 'saved' || r === 'browser') counted('pdf'); note.textContent = said(r); });
    });
    share.addEventListener('click', function () {
      var copied = copyText(ta.value, null);
      var payload = canShare({ files: [file], text: ta.value }) ? { files: [file], text: ta.value } : { files: [file] };
      shareOrTimeOut(payload).then(function () {
        counted('pdf');
        note.textContent = copied ? N.t('Shared. If WhatsApp shows the PDF without the text, paste it: it is copied.') : N.t('Shared.');
      }, function (e) {
        if (e && e.name === 'AbortError') { note.textContent = 'Not sent.'; return; }
        /* the share sheet refused (the viewer's frame may not allow it): keep the file instead */
        keepFile(file).then(function (r) { if (r === 'saved' || r === 'browser') counted('pdf'); note.textContent = r === 'declined' ? N.t('Not saved.') : N.t('The share sheet did not open.') + ' ' + said(r); });
      });
    });
    openIt.addEventListener('click', function () {
      var url = URL.createObjectURL(file), tab = null;
      try { tab = root.open(url, '_blank'); } catch (e) { tab = null; }
      note.textContent = tab ? '' : N.t('A new tab was not allowed here. Use Save PDF.');
      setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
    });
    copy.addEventListener('click', function () { note.textContent = copyText(ta.value, ta) ? N.t('Copied. Paste it with the PDF.') : N.t('Open “The text that goes with it” and copy it.'); });
    wa.addEventListener('click', function () { whatsapp(ta.value); counted('pdf'); note.textContent = N.t('WhatsApp opens with the text only. Attach the saved PDF there.'); });

    S.show();
    x.focus();
    viewerSave();
    preview(made.blob, pages).catch(function (e) {
      pages.textContent = '';
      pages.appendChild(el('p', 'sd-note', N.t('The preview could not be shown here ({why}). Save or open the PDF to read it.', { why: e.message })));
    });
  }

  /* ---- the WhatsApp post: the picture, the text, and the agent's name if asked ---- */
  function post(o, to, lang, counted) {
    var me = N.me() || {};
    var agent = recall(AGENT_KEY) || { on: false, name: me.name || '', phone: '' };
    if (!agent.name) agent.name = me.name || '';
    var codes = o.items.map(function (x) { return window.VELN_UNITS.floors[x.f].code + '-' + x.u.no; });
    var file = null, url = null, noPicture = false;
    var S = sheet('sdPostH'), card = S.card;
    card.classList.add('sd-post');
    var head = el('div', 'sd-head');
    var hl = el('div');
    hl.appendChild(el('p', 'sd-k', N.t('WhatsApp post') + ' · ' + (to.audience === 'broker' && to.company ? to.company : N.t('General broadcast'))));
    var h = el('h3', 'sd-h', codes.join(' + ')); h.id = 'sdPostH';
    hl.appendChild(h);
    head.appendChild(hl);
    var x = el('button', 'sd-x', '×'); x.type = 'button'; x.setAttribute('aria-label', N.t('Close'));
    x.addEventListener('click', function () { S.close(); });
    head.appendChild(x);
    card.appendChild(head);
    var shot = el('div', 'sd-shot');
    shot.appendChild(el('p', 'sd-note', N.t('Making the picture…')));
    card.appendChild(shot);
    var row = el('label', 'sd-check');
    var on = el('input'); on.type = 'checkbox'; on.checked = !!agent.on;
    row.appendChild(on); row.appendChild(el('span', null, N.t('Add my name and number')));
    card.appendChild(row);
    var ab = el('div', 'sd-agent');
    var nameIn = el('input', 'sd-in'); nameIn.type = 'text'; nameIn.placeholder = N.t('Your name'); nameIn.value = agent.name; nameIn.autocomplete = 'name';
    var phoneIn = el('input', 'sd-in'); phoneIn.type = 'tel'; phoneIn.placeholder = N.t('Your mobile number'); phoneIn.value = agent.phone || ''; phoneIn.dir = 'ltr'; phoneIn.autocomplete = 'tel';
    ab.appendChild(nameIn); ab.appendChild(phoneIn); ab.hidden = !on.checked;
    card.appendChild(ab);
    var ta = el('textarea', 'sd-text'); ta.rows = 12;
    ta.setAttribute('aria-label', N.t('The post text. You can edit it before sending.'));
    card.appendChild(ta);
    var note = el('p', 'sd-note sd-say'); note.setAttribute('aria-live', 'polite');
    var acts = el('div', 'sd-acts');
    var copy = el('button', 'sd-ghost', N.t('Copy text')); copy.type = 'button';
    var send = el('button', 'sd-go', N.t('Send on WhatsApp')); send.type = 'button';
    acts.appendChild(copy); acts.appendChild(send);
    card.appendChild(acts);
    card.appendChild(note);

    function write() {
      try {
        ta.value = N.offer.caption(Object.assign({}, o, { lang: lang, agent: on.checked ? { name: nameIn.value, phone: phoneIn.value } : null }));
      } catch (e) { ta.value = ''; note.textContent = N.t('The post could not be made: {why}', { why: e.message }); }
      ta.dir = lang === 'ar' ? 'rtl' : 'ltr';
      send.disabled = !ta.value || (!file && !noPicture);
      copy.disabled = !ta.value;
    }
    function keep() { remember(AGENT_KEY, { on: on.checked, name: nameIn.value, phone: phoneIn.value }); write(); }
    on.addEventListener('change', function () { ab.hidden = !on.checked; keep(); if (on.checked && !phoneIn.value) phoneIn.focus(); });
    nameIn.addEventListener('input', keep); phoneIn.addEventListener('input', keep);
    copy.addEventListener('click', function () { note.textContent = copyText(ta.value, ta) ? N.t('Copied. Paste it into WhatsApp.') : N.t('Select the text above and copy it.'); });
    /* the picture was made when the sheet opened, so the share runs straight from the tap */
    send.addEventListener('click', function () {
      if (send.disabled) return;
      var copied = copyText(ta.value, ta);
      if (file && handheld() && canShare({ files: [file] })) {
        var payload = canShare({ files: [file], text: ta.value }) ? { files: [file], text: ta.value } : { files: [file] };
        shareOrTimeOut(payload).then(function () {
          counted('post');
          note.textContent = copied ? N.t('Sent to the share sheet. If WhatsApp shows the picture without the text, paste it: it is copied.') : N.t('Sent to the share sheet.');
        }, function (e) {
          if (e && e.name === 'AbortError') { note.textContent = 'Not sent.'; return; }
          /* build 12: through the viewer's save, never the blocked plain download */
          keepFile(file).then(function (r) {
            if (r === 'saved' || r === 'browser') counted('post');
            note.textContent = r === 'saved' || r === 'browser' ? N.t('The share sheet did not open, so the picture was saved and the text copied. Attach the picture in WhatsApp and paste the text.')
              : N.t('The share sheet did not open.') + ' ' + notKept(r);
          });
        });
        return;
      }
      whatsapp(ta.value);
      counted('post');
      if (file) keepFile(file).then(function (r) { note.textContent = r === 'saved' || r === 'browser' ? N.t('WhatsApp opened with the text. The picture is saved: attach it there.') : notKept(r); });
    });

    write();
    S.show();
    x.focus();
    N.offer.picture(Object.assign({}, o, { lang: lang })).then(function (blob) {
      file = new File([blob], 'VELN - ' + codes.join(' ') + '.jpg', { type: 'image/jpeg' });
      url = URL.createObjectURL(blob);
      shot.textContent = '';
      var im = el('img'); im.src = url;
      im.alt = N.t('The picture that goes with the post: VELN at night with the floor lit, and the whole floor plan with the unit lit and pinned');
      shot.appendChild(im);
      write();
    }, function (e) {
      noPicture = true;
      shot.textContent = '';
      shot.appendChild(el('p', 'sd-note', N.t('The picture could not be made: {why}. The text goes alone.', { why: e.message })));
      write();
    });
  }

  N.send = { start: start };
}(typeof window !== 'undefined' ? window : globalThis));
