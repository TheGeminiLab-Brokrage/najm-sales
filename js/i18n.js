/* ------------------------------------------------------------------
   Najm: English / Arabic for the whole app (build 10), Main Marks'
   js/i18n.js for Najm. Muhanad, 2026-11-03: "the english and arabic
   offers should be as per the app language selected like main marks app".

   HOW IT WORKS (as Main Marks)
   - The key IS the English text: N.t('Choose a floor'). A string with
     values has {placeholders}: N.t('{n} available', { n: 4 }). So the
     English app reads exactly as before, and tests/i18n-check.js finds
     every key in the code and fails when one has no Arabic.
   - A key with no Arabic falls back to the English and says so ONCE in the
     console: a missing translation shows English, never a blank.
   - Values put into an Arabic sentence (figures, unit codes, "20%") are
     wrapped in a first-strong isolate, or bidi reorders them ("20%" reads
     "%20"; playbook 01, Phase 5).
   - The config's own words (lines, floors, plans, facts) go through N.t
     and N.tx, from the English config holds.
   - The offer PDF and the WhatsApp post come out in the app's language:
     js/send.js reads N.lang, and asks no language of its own.

   WHICH LANGUAGE (as Main Marks)
   - ?lang=ar or ?lang=en applies to THIS VISIT ONLY and is never stored.
   - Only a tap on the switch is remembered (localStorage, this device).
   - Switching reloads the page, so no half-translated screen can exist.

   NOT TRANSLATED, on purpose: the plans, renders and logos, the brand names
   (Najm, VELN), unit codes, brokerage and people's names. Figures stay
   Western digits in both languages, as Najm's own sheets and posts do.

   THE ARABIC: the words the Egyptian sales floor says (Main Marks build 147
   and 148: بروكر، سيلز، برودكاست، نظام السداد، كل 3 شهور); where Main Marks
   already had a line, the same line. It is ours, not Najm's: someone at Najm
   must read it before real use.
   ------------------------------------------------------------------ */
(function (root) {
  'use strict';
  var N = root.NJ || (root.NJ = {});
  var KEY = 'najm.language';

  var fromUrl = null;
  try { fromUrl = new URLSearchParams(root.location.search).get('lang'); } catch (e) { /* old browser */ }
  var stored = null;
  try { stored = root.localStorage.getItem(KEY); } catch (e) { /* private mode */ }
  var lang = fromUrl === 'ar' || fromUrl === 'en' ? fromUrl : (stored === 'ar' ? 'ar' : 'en');
  var AR_ON = lang === 'ar';
  if (root.document && document.documentElement) {
    document.documentElement.lang = lang;
    document.documentElement.dir = AR_ON ? 'rtl' : 'ltr';
  }

  var AR = root.NJ_AR || {};

  /* built from code points: a typed escape can land in a file as the raw character */
  var FSI = String.fromCharCode(0x2068), PDI = String.fromCharCode(0x2069);
  var arabicLetter = /[؀-ۿ]/;
  var missing = {};
  function iso(v) { v = String(v); return AR_ON && !arabicLetter.test(v) ? FSI + v + PDI : v; }

  function t(key, vars) {
    var s = key == null ? '' : String(key);
    if (AR_ON && s) {
      if (Object.prototype.hasOwnProperty.call(AR, s)) s = AR[s];
      else if (!missing[s]) { missing[s] = true; if (root.console) console.warn('[i18n] no Arabic for: ' + s); }
    }
    /* a "%" straight after a value goes INSIDE its isolate, or bidi moves it ("5%" -> "%5") */
    return s.replace(/\{(\w+)\}(%?)/g, function (m, k, pct) {
      if (!vars || vars[k] == null) return m;
      return iso(String(vars[k]) + pct);
    });
  }

  function money(v) { return Math.round(v).toLocaleString('en-US'); }
  var FLOOR = { ground: 'الأرضي', first: 'الأول', second: 'الثاني', third: 'الثالث' };
  var FLOOR_EN = { ground: 'Ground', first: 'First', second: 'Second', third: 'Third' };
  var MON_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var MON_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  var tx = {
    /* "Ground floor" / "الدور الأرضي" */
    floor: function (fid) { return AR_ON ? 'الدور ' + (FLOOR[fid] || fid) : (FLOOR_EN[fid] || fid) + ' floor'; },
    /* "Ground" / "الأرضي" */
    floorShort: function (fid) { return AR_ON ? (FLOOR[fid] || fid) : (FLOOR_EN[fid] || fid); },
    /* "Ground + First floors" / "الدور الأرضي + الأول" */
    floors: function (fids) {
      if (AR_ON) return 'الدور ' + fids.map(function (f) { return FLOOR[f] || f; }).join(' + ');
      return fids.map(function (f) { return FLOOR_EN[f] || f; }).join(' + ') + (fids.length > 1 ? ' floors' : ' floor');
    },
    /* a plan's label, as config writes it: "10% down · 7 years · 10% off", "Cash · 40% off",
       "Semi cash · 25% down · 3 years · 25% off", "Pharmacy offer · ...", "Hypermarket · ..." */
    plan: function (label) {
      if (!AR_ON || !label) return label;
      return String(label).split(/\s*·\s*/).map(function (part) {
        var m;
        if ((m = /^(\d+(?:\.\d+)?)%\s*down$/i.exec(part))) return 'مقدم ' + iso(m[1] + '%');
        if ((m = /^(\d+)\s*years?$/i.exec(part))) return iso(m[1]) + (+m[1] <= 10 ? ' سنين' : ' سنة');
        /* the zone shares' terms: "6 years 3 months" */
        if ((m = /^(\d+)\s*years?\s+(\d+)\s*months?$/i.exec(part))) return iso(m[1]) + (+m[1] <= 10 ? ' سنين' : ' سنة') + ' و' + iso(m[2]) + ' شهور';
        if ((m = /^(\d+(?:\.\d+)?)%\s*off$/i.exec(part))) return 'خصم ' + iso(m[1] + '%');
        if (/^cash$/i.test(part)) return 'كاش';
        if (/^semi cash$/i.test(part)) return 'نص كاش';
        if (/^pharmacy offer$/i.test(part)) return 'عرض الصيدلية';
        if (/^hypermarket$/i.test(part)) return 'الهايبر ماركت';
        return t(part);
      }).join(' · ');
    },
    egp: function (v) { return AR_ON ? iso(money(v)) + ' جنيه' : 'EGP ' + money(v); },
    m2: function (v) { return AR_ON ? iso((Math.round(v * 100) / 100).toLocaleString('en-US')) + ' م²' : (Math.round(v * 100) / 100).toLocaleString('en-US') + ' m²'; },
    /* "3 Nov 2026" */
    date: function (d) { return d.getDate() + ' ' + (AR_ON ? MON_AR : MON_EN)[d.getMonth()] + ' ' + d.getFullYear(); },
    /* "03 Nov 2026", the schedule's dates */
    date2: function (d) { return (d.getDate() < 10 ? '0' : '') + d.getDate() + ' ' + (AR_ON ? MON_AR : MON_EN)[d.getMonth()] + ' ' + d.getFullYear(); },
    list: function (a) { return a.join(AR_ON ? '، ' : ', '); }
  };

  function setLang(next) {
    try { root.localStorage.setItem(KEY, next); } catch (e) { /* private mode: this visit only */ }
    var url = new URL(root.location.href);
    url.searchParams.delete('lang');
    if (url.toString() === root.location.href) root.location.reload(); else root.location.href = url.toString();
  }

  /* static text in the HTML */
  function translateStatic() {
    if (!AR_ON) return;
    [].forEach.call(document.querySelectorAll('[data-t]'), function (n) { n.textContent = t(n.getAttribute('data-t')); });
    [].forEach.call(document.querySelectorAll('[data-t-html]'), function (n) { n.innerHTML = t(n.getAttribute('data-t-html')); });
    [].forEach.call(document.querySelectorAll('[data-t-ph]'), function (n) { n.setAttribute('placeholder', t(n.getAttribute('data-t-ph'))); });
    [].forEach.call(document.querySelectorAll('[data-t-aria]'), function (n) { n.setAttribute('aria-label', t(n.getAttribute('data-t-aria'))); });
    var titleKey = document.documentElement.getAttribute('data-t-title');
    if (titleKey) document.title = t(titleKey);
  }

  /* the switch (Main Marks): in the header card beside the initials; on the sign-in, at the top of the form */
  function langSwitch() {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'lang-switch';
    var next = AR_ON ? 'en' : 'ar';
    b.textContent = AR_ON ? 'English' : 'العربية';
    b.lang = next;
    b.dir = AR_ON ? 'ltr' : 'rtl';
    b.setAttribute('aria-label', AR_ON ? 'Switch to English' : 'التبديل إلى العربية');
    b.addEventListener('click', function () { setLang(next); });
    return b;
  }
  function addSwitch() {
    if (document.querySelector('.lang-switch')) return;
    var gate = document.querySelector('.gate-form');
    if (gate) { var b = langSwitch(); b.classList.add('is-gate'); gate.insertBefore(b, gate.firstChild); }
  }

  N.lang = lang;
  N.isArabic = AR_ON;
  N.t = t;
  N.tx = tx;
  N.iso = iso;
  N.setLang = setLang;
  N.langSwitch = langSwitch;
  N.i18n = { keys: function () { return Object.keys(AR); }, missing: function () { return Object.keys(missing); } };

  if (root.document && document.addEventListener) {
    var run = function () { translateStatic(); addSwitch(); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
  }
}(typeof window !== 'undefined' ? window : globalThis));
