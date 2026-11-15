/* ------------------------------------------------------------------
   Najm: THE OFFER, as it leaves the app (build 8). Main Marks' offer PDF
   (js/pdf.js + js/offerpdf.js) and WhatsApp post (js/post.js), in the same
   order and by the same rules, drawn for VELN:

     NJ.offer.work(o)      the offer, worked out here (throws: fail closed)
     NJ.offer.pdf(o)       -> Promise<{ blob, name, pages }>   seven A4 pages (look D)
     NJ.offer.caption(o)   -> the post's text
     NJ.offer.picture(o)   -> Promise<Blob>   the post's picture (JPEG)
     NJ.offer.message(o)   -> the short text that travels with the PDF
   o: { project, line, items: [{ u, f }], plan, lang: 'en' | 'ar', agent, date }

   RULES IT KEEPS (Main Marks, playbook 01)
   - It trusts no caller: every unit must be Available, the plan must be one
     the unit is offered on, every schedule comes from NJ.plans.schedule (the
     engine the screen uses) and is re-added from its rows. Anything else: no
     document at all.
   - The figures follow Najm's rule, confirmed 2026-11-03: the down payment is
     a share of the ORIGINAL price, the discount comes off what is left, the
     instalments are every 3 months from 3 months after the down payment;
     maintenance 8% of the original price, 6 months before delivery; delivery
     3.5 years from the contract.
   - No price on the post's picture (a picture is forwarded for weeks), no
     link into the app, no hotline (Muhanad: "pdf should not have hotline").
     The agent's name and number go on the post only if they ask.
   - Every picture is Najm's own: the VELN renders and the final floor plans.
   - THE PDF'S LOOK is D Navy (build 11, his choice 2026-11-05): VELN's navy and
     gold, Poppins (SIL OFL) embedded. The post keeps VELN's beige.
     Arabic: IBM Plex Sans Arabic (SIL OFL), shaped by js/arabic.js; the page
     is mirrored, never the pictures. The Arabic wording is ours: an Arabic
     reader at Najm must read it before real use.
   ------------------------------------------------------------------ */
(function (root) {
  'use strict';
  var N = root.NJ || (root.NJ = {});
  var V = (root.CONFIG && CONFIG.stamp) || '0';

  /* VELN's CI (js/config.js ci) and two tints of it for legibility on white */
  var GROUND = '#D9D1BD', INK = '#343434', TAUPE = '#6B685A', GOLD = '#EDB964';
  var GOLD_INK = '#8A6A2A';       /* gold small text on white: 4.9:1 */
  var RULE = '#E2DCCD', TINT = '#EFE9DC', WHITE = '#FFFFFF';

  function money(v) { return Math.round(v).toLocaleString('en-US'); }
  function pctOf(f) { return String(Math.round(f * 1000) / 10); }
  function pct2(f) { return (Math.round(f * 10000) / 100) + '%'; }
  /* "10%" inside Arabic text reads "%10": a left-to-right isolate keeps it (Main Marks' post) */
  var LRI = String.fromCharCode(0x2066), PDI = String.fromCharCode(0x2069);
  function isoPct(f) { return LRI + pctOf(f) + '%' + PDI; }

  var MON_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var MONTH_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var MONTH_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

  /* ================================================================ the words */
  var EN = {
    rtl: false,
    egp: function (v) { return 'EGP ' + money(v); },
    day: function (d) { return d.getDate() + ' ' + MON_EN[d.getMonth()] + ' ' + d.getFullYear(); },
    longDay: function (d) { return d.getDate() + ' ' + MONTH_EN[d.getMonth()] + ' ' + d.getFullYear(); },
    m2: function (a) { return (Math.round(a * 100) / 100).toLocaleString('en-US') + ' m²'; },
    word: { shop: 'Shop', pharmacy: 'Pharmacy', office: 'Office', clinic: 'Clinic', zone: 'Zone share' },
    words: { shop: 'Shops', pharmacy: 'Shops', office: 'Offices', clinic: 'Clinics', zone: 'Zone shares' },
    /* the zone shares (2026-11-15) */
    shares: function (n) { return n + (n === 1 ? ' share' : ' shares'); },
    zoneName: function (z) { return z.name + (z.who ? '  ·  ' + z.who : ''); },
    term: function (m) { var y = Math.floor(m / 12), r = m % 12; return (y ? y + (y === 1 ? ' year' : ' years') : '') + (y && r ? ' ' : '') + (r ? r + (r === 1 ? ' month' : ' months') : ''); },
    fShares: 'Shares', fShareCodes: 'Share codes', fZone: 'Zone', fSize: 'Size',
    eachLast: function (v, w) { return 'EGP ' + money(v) + ' each, the last ' + money(w); },
    nLast: function (n, w) { return n + ' payments  ·  the last ' + money(w); },
    floor: { ground: 'Ground floor', first: 'First floor', second: 'Second floor', third: 'Third floor' },
    line: function (l) { return l.name; },
    place: 'New Cairo · Yasmine district',
    offerOf: function (w) { return w + ' offer'; },
    units: function (n) { return n + ' units'; },
    oneDeal: 'One deal',
    sample: 'Sample for review',
    asOf: function (d) { return 'Prices and availability as of ' + d + '. They may change until a contract is signed.'; },
    footer: function (w, code) { return 'VELN  ·  ' + w + ' offer  ·  ' + code; },
    page: function (i, n) { return i + ' / ' + n; },
    by: 'Developed by Najm Developments',
    /* 2 */
    project: 'The project', projectSub: 'VELN  ·  a mixed-use mall in New Cairo',
    facts: [['Where', 'Yasmine district, New Cairo'], ['What', 'A mixed-use mall'], ['Structure', '2 basements · ground · 3 floors'],
      ['Uses', 'Shops · offices · clinics'], ['Delivery', '3.5 years from the contract'], ['Developer', 'Najm Developments']],
    linesHead: 'Three lines, one building',
    lineRow: function (l, fl) { return [l.name, l.kind + ' · ' + fl]; },
    renderSrc: 'Renders: Najm’s VELN material.',
    /* 3 */
    yourFloor: 'Your floor', floorSub: function (line, fl) { return line + '  ·  ' + fl; },
    floorNote: function (w, fl, line) { return 'The lit band is the ' + fl.toLowerCase() + ', where your ' + w.toLowerCase() + ' is: VELN’s ' + line + ' line.'; },
    floorNotes: function (fls, line) { return 'The lit bands are the ' + fls + ', where your units are: VELN’s ' + line + ' line.'; },
    lineFacts: 'The line',
    /* 4 */
    yourUnit: function (w) { return 'Your ' + w.toLowerCase(); }, yourUnits: 'Your units',
    unitSub: function (code, fl) { return code + '  ·  ' + fl; },
    fCode: 'Unit', fSheet: 'Unit code', fLine: 'Line', fFloor: 'Floor', fIndoor: 'Indoor', fOutdoor: 'Outdoor', fPriced: 'Priced on',
    fPerM: 'Price per m²', fList: 'Original price', fDelivered: 'Delivered', fMaint: 'Maintenance',
    pricedNote: 'The price is on the priced area: the indoor area and a share of the outdoor, as Najm prices it.',
    planSrc: 'Drawing: Najm’s final VELN plans.',
    cols: ['', 'Unit', 'Floor', 'Indoor', 'Priced on', 'Original price'],
    /* 5 */
    thePlan: 'Payment plan',
    list: 'Original price', down: 'Down payment', downSub: function (p, d) { return p + '% of the original price  ·  on signing, ' + d; },
    rest: 'Remaining', restSub: 'the original price less the down payment',
    off: 'Your discount', offSub: function (p) { return p + '% off the remaining'; },
    minus: function (v) { return '− EGP ' + money(v); },
    planLabel: function (pl) { return pl.label; },
    delivered: function (v) { return v; },
    inst: 'Instalments', instSub: function (n, a, b) { return n + ' payments, every 3 months  ·  first ' + a + ', last ' + b; },
    each: function (v) { return 'EGP ' + money(v) + ' each'; },
    total: 'Total payable', save: function (v) { return 'You save EGP ' + money(v); },
    cashOff: function (p) { return p + '% off the original price, paid in cash'; },
    cashPay: 'Cash payment', cashSub: function (d) { return 'once, on signing, ' + d; },
    also: 'Also due',
    maint: 'Maintenance', maintSub: function (p, d) { return p + '% of the original price  ·  ' + d + ', 6 months before delivery'; },
    delivery: 'Delivery', deliverySub: '3.5 years from the contract',
    /* 6 */
    schedule: 'Payment schedule', scheduleSub: function (d) { return 'Every payment, dated, from a contract signed on ' + d + '. Instalments are every 3 months; the first falls three months after the down payment.'; },
    cols6: ['Year', 'Instalment', 'Date', 'Amount (EGP)', '%', 'Yearly %'],
    dp: 'DP', dpRow: 'Down payment', cashRow: 'Cash payment', yearN: function (n) { return 'Year ' + n; }, instN: function (n) { return 'Inst. ' + n; },
    plusMaint: function (v, d) { return 'Plus maintenance: EGP ' + money(v) + ' on ' + d + ', 6 months before delivery.'; },
    contd: 'continued'
  };

  var AR = {
    rtl: true,
    egp: function (v) { return money(v) + ' جنيه'; },
    day: function (d) { return d.getDate() + ' ' + MONTH_AR[d.getMonth()] + ' ' + d.getFullYear(); },
    longDay: function (d) { return d.getDate() + ' ' + MONTH_AR[d.getMonth()] + ' ' + d.getFullYear(); },
    m2: function (a) { return (Math.round(a * 100) / 100).toLocaleString('en-US') + ' متر'; },
    word: { shop: 'محل', pharmacy: 'صيدلية', office: 'مكتب إداري', clinic: 'عيادة', zone: 'حصة' },
    words: { shop: 'محلات', pharmacy: 'محلات', office: 'مكاتب إدارية', clinic: 'عيادات', zone: 'حصص' },
    shares: function (n) { return n === 1 ? 'حصة واحدة' : n === 2 ? 'حصتين' : n + (n <= 10 ? ' حصص' : ' حصة'); },
    zoneName: function (z) { return String(z.name).replace(/^Zone/, 'زون') + (z.who ? '  ·  ' + z.who : ''); },
    term: function (m) { var y = Math.floor(m / 12), r = m % 12; return (y ? y + (y <= 10 ? ' سنين' : ' سنة') : '') + (y && r ? ' و' : '') + (r ? r + (r <= 10 ? ' شهور' : ' شهر') : ''); },
    fShares: 'عدد الحصص', fShareCodes: 'أكواد الحصص', fZone: 'الزون', fSize: 'المساحة',
    eachLast: function (v, w) { return money(v) + ' جنيه للقسط، والأخير ' + money(w); },
    nLast: function (n, w) { return n + ' قسطاً  ·  الأخير ' + money(w); },
    floor: { ground: 'الدور الأرضي', first: 'الدور الأول', second: 'الدور الثاني', third: 'الدور الثالث' },
    line: function (l) { return ({ commercial: 'التجاري', admin: 'الإداري', medical: 'الطبي' })[l.id] || l.name; },
    place: 'القاهرة الجديدة · حي الياسمين',
    offerOf: function (w) { return 'عرض ' + w; },
    units: function (n) { return n + ' وحدات'; },
    oneDeal: 'صفقة واحدة',
    sample: 'عينة للمراجعة',
    asOf: function (d) { return 'الأسعار والوحدات المتاحة حتى ' + d + '، وقد تتغير حتى توقيع العقد.'; },
    footer: function (w, code) { return 'VELN  ·  عرض ' + w + '  ·  ' + code; },
    page: function (i, n) { return i + ' / ' + n; },
    by: 'تطوير نجم للتطوير العقاري',
    project: 'المشروع', projectSub: 'VELN  ·  مول متعدد الاستخدامات في القاهرة الجديدة',
    facts: [['الموقع', 'حي الياسمين، القاهرة الجديدة'], ['المشروع', 'مول متعدد الاستخدامات'], ['المبنى', 'بدروم 2 · أرضي · 3 أدوار'],
      ['الاستخدامات', 'محلات · مكاتب · عيادات'], ['الاستلام', 'بعد 3.5 سنة من التعاقد'], ['المطور', 'نجم للتطوير العقاري']],
    linesHead: 'ثلاثة أنشطة في مبنى واحد',
    lineRow: function (l, fl) { return [({ commercial: 'التجاري', admin: 'الإداري', medical: 'الطبي' })[l.id] || l.name,
      ({ Shops: 'محلات', Offices: 'مكاتب إدارية', Clinics: 'عيادات' })[l.kind] + ' · ' + fl]; },
    renderSrc: 'الصور: من مواد نجم لمشروع VELN.',
    yourFloor: 'الدور', floorSub: function (line, fl) { return 'النشاط ' + line + '  ·  ' + fl; },
    floorNote: function (w, fl, line) { return 'الجزء المضيء هو ' + fl + '، حيث ' + w.split(' ').map(function (x) { return 'ال' + x; }).join(' ') + ' الخاص بك، ضمن النشاط ' + line + ' في VELN.'; },
    floorNotes: function (fls, line) { return 'الأجزاء المضيئة هي ' + fls + '، حيث وحداتك، ضمن النشاط ' + line + ' في VELN.'; },
    lineFacts: 'النشاط',
    yourUnit: function (w) { return w; }, yourUnits: 'الوحدات',
    unitSub: function (code, fl) { return code + '  ·  ' + fl; },
    fCode: 'الوحدة', fSheet: 'كود الوحدة', fLine: 'النشاط', fFloor: 'الدور', fIndoor: 'المساحة الداخلية', fOutdoor: 'المساحة الخارجية', fPriced: 'المساحة المحسوبة',
    fPerM: 'سعر المتر', fList: 'السعر الأصلي', fDelivered: 'التسليم', fMaint: 'الصيانة',
    pricedNote: 'السعر على المساحة المحسوبة: المساحة الداخلية وجزء من الخارجية، كما تحسبها نجم.',
    planSrc: 'الرسم: مخططات نجم النهائية لمشروع VELN.',
    cols: ['', 'الوحدة', 'الدور', 'الداخلية', 'المحسوبة', 'السعر الأصلي'],
    thePlan: 'نظام السداد',
    list: 'السعر الأصلي', down: 'المقدم', downSub: function (p, d) { return p + '% من السعر الأصلي  ·  عند التعاقد، ' + d; },
    rest: 'الباقي', restSub: 'السعر الأصلي بعد خصم المقدم',
    off: 'الخصم', offSub: function (p) { return 'خصم ' + p + '% على الباقي'; },
    /* no space after the sign: with one, the shaper put the minus on the far side of the figure */
    minus: function (v) { return '−' + money(v) + ' جنيه'; },
    planLabel: function (pl) {
      var yrs = function (n) { return n + (n <= 10 ? ' سنين' : ' سنة'); };
      if (pl.cash) return 'كاش · خصم ' + pctOf(pl.discount) + '%';
      if (pl.months) return 'مقدم ' + pctOf(pl.down) + '% · ' + AR.term(pl.months) + (pl.discount ? ' · خصم ' + pctOf(pl.discount) + '%' : '');
      var lead = pl.only === 'pharmacy' ? 'عرض الصيدلية · ' : pl.only === 'hypermarket' ? 'عرض الهايبر ماركت · ' : pl.id === 'semi' ? 'نص كاش · ' : '';
      return lead + 'مقدم ' + pctOf(pl.down) + '% · ' + yrs(pl.years) + (pl.discount ? ' · خصم ' + pctOf(pl.discount) + '%' : '');
    },
    delivered: function (v) { return ({ 'Core & shell': 'كور آند شيل', 'Fully finished with AC': 'تشطيب كامل بالتكييف' })[v] || v; },
    inst: 'الأقساط', instSub: function (n, a, b) { return n + ' قسطاً، كل 3 شهور  ·  الأول ' + a + '، والأخير ' + b; },
    each: function (v) { return money(v) + ' جنيه للقسط'; },
    total: 'الإجمالي', save: function (v) { return 'توفير ' + money(v) + ' جنيه'; },
    cashOff: function (p) { return 'خصم ' + p + '% من السعر الأصلي للدفع كاش'; },
    cashPay: 'دفعة كاش', cashSub: function (d) { return 'مرة واحدة عند التعاقد، ' + d; },
    also: 'مستحق أيضاً',
    maint: 'الصيانة', maintSub: function (p, d) { return p + '% من السعر الأصلي  ·  ' + d + '، قبل الاستلام بـ 6 شهور'; },
    delivery: 'الاستلام', deliverySub: 'بعد 3.5 سنة من التعاقد',
    schedule: 'جدول السداد', scheduleSub: function (d) { return 'كل دفعة بتاريخها، من عقد بتاريخ ' + d + '. الأقساط كل 3 شهور، والقسط الأول بعد 3 شهور من المقدم.'; },
    cols6: ['السنة', 'القسط', 'التاريخ', 'المبلغ (جنيه)', '%', '% السنة'],
    dp: 'مقدم', dpRow: 'المقدم', cashRow: 'دفعة كاش', yearN: function (n) { return 'السنة ' + n; }, instN: function (n) { return 'قسط ' + n; },
    plusMaint: function (v, d) { return 'يضاف إليها الصيانة: ' + money(v) + ' جنيه في ' + d + '، قبل الاستلام بـ 6 شهور.'; },
    contd: 'تابع'
  };

  /* ============================================================ the offer */
  function plansFor(p, kind) {
    if (p.hold && p.hold[kind]) return [];
    var own = p.plans.filter(function (pl) { return pl.only === kind; });
    return own.length ? own : p.plans.filter(function (pl) { return !pl.only; });
  }
  function wordOf(l, u) { return l.id === 'commercial' ? (u.kind === 'pharmacy' ? 'pharmacy' : 'shop') : l.id === 'admin' ? 'office' : 'clinic'; }

  /* zone share codes, as few words as they can be: VL-TH-Z1-01, -02, -03 and -05 read
     "VL-TH-Z1-01 – VL-TH-Z1-03 + VL-TH-Z1-05" (short: "Z1-01–Z1-03+Z1-05", no spaces: inside an
     Arabic line a spaced range is split by the right-to-left order). Every share is named, so
     operations reserve exactly these. js/project.js shows the long form. */
  function shareCodes(shares, short) {
    var out = [], run = null;
    function nm(c) { return short ? String(c).replace(/^.*-(Z\d+-\d+)$/, '$1') : String(c); }
    function close() { if (run) out.push(run.a === run.b ? nm(run.a) : nm(run.a) + (short ? '–' : ' – ') + nm(run.b)); }
    shares.forEach(function (s) {
      var m = /^(.*-)(\d+)$/.exec(s.code), head = m ? m[1] : s.code, n = m ? +m[2] : NaN;
      if (run && run.head === head && n === run.n + 1) { run.b = s.code; run.n = n; return; }
      close(); run = { head: head, n: n, a: s.code, b: s.code };
    });
    close();
    return out.join(short ? '+' : ' + ');
  }

  /* A ZONE DEAL (2026-11-15): { z, shares, f }, the shares the agent chose by number. Made into
     one "unit" the pages already know how to print: the shares' areas and prices added, the
     zone's own outline on the plan. Every share is checked again against the inventory. */
  function zoneItem(x, p, pl, book, when) {
    var fl = book.floors[x.f], z = fl && (fl.zones || []).filter(function (q) { return x.z && q.no === x.z.no; })[0];
    if (!z) throw new Error('that zone is not on the plan');
    var list = x.shares || [], seen = {};
    if (!list.length) throw new Error('no share chosen');
    list.forEach(function (s) {
      var real = z.shares.filter(function (q) { return q.code === (s && s.code); })[0];
      if (!real || real.status !== 'Available' || seen[real.code]) throw new Error('share ' + (s && s.code) + ' is not available, so it cannot be offered');
      seen[real.code] = true;
    });
    if (!plansFor(p, 'zone').some(function (y) { return y.id === pl.id; })) throw new Error('the plan ' + pl.label + ' is not offered on zone shares');
    var shares = list.map(function (s) { return z.shares.filter(function (q) { return q.code === s.code; })[0]; });
    var add = function (k) { return shares.reduce(function (n, q) { return n + (q[k] || 0); }, 0); };
    var rates = shares.map(function (q) { return q.perM; }), lo = Math.min.apply(null, rates), hi = Math.max.apply(null, rates);
    var U = { no: z.no, code: shareCodes(shares), kind: 'zone', status: 'Available', indoor: add('area'), outdoor: 0, area: add('area'),
      price: add('price'), maintenance: 0, perM: lo === hi ? lo : null, perMRange: [lo, hi], poly: z.poly, at: z.at, zone: z, shares: shares };
    var s = N.plans.schedule({ listPrice: U.price, discount: pl.discount || 0, plan: pl, terms: p.planTerms, from: when });
    if (!s) throw new Error('no schedule could be worked out for ' + z.name);
    if (s.broken) throw new Error('the schedule does not add up: ' + s.broken.join('; '));
    return { u: U, f: x.f, fl: fl, code: shareCodes(shares, true), word: 'zone', s: s, zone: true };
  }

  function work(o) {
    var p = o.project, l = o.line, pl = o.plan, book = root.VELN_UNITS, when = o.date || new Date();
    if (!book || !o.items || !o.items.length) throw new Error('nothing to offer');
    if (!pl) throw new Error('no payment plan chosen');
    if (o.items.some(function (x) { return x.z; })) {
      /* a zone goes alone: one zone, its shares, never mixed with units */
      if (o.items.length !== 1) throw new Error('a zone share is offered on its own');
      var zi = zoneItem(o.items[0], p, pl, book, when), ZS = zi.s;
      if (ZS.rows.reduce(function (n, r) { return n + r.amount; }, 0) !== ZS.payable) throw new Error('the schedule does not add up');
      return { p: p, l: l, pl: pl, when: when, items: [zi], one: zi, S: ZS, floors: [zi.f], many: false, joined: false, word: 'zone', zone: true };
    }
    var items = o.items.map(function (x) {
      var u = x.u, fl = book.floors[x.f];
      /* fail closed: the screen prevents all of these, but this is what a buyer acts on */
      if (!u || !fl || u.status !== 'Available' || u.shares) throw new Error('unit ' + (u && u.no) + ' is not available, so it cannot be offered');
      if (!plansFor(p, u.kind).some(function (y) { return y.id === pl.id; })) throw new Error('the plan ' + pl.label + ' is not offered on ' + fl.code + '-' + u.no);
      var s = N.plans.schedule({ listPrice: u.price, discount: pl.discount || 0, plan: pl, terms: p.planTerms, from: when });
      if (!s) throw new Error('no schedule could be worked out for ' + fl.code + '-' + u.no);
      if (s.broken) throw new Error('the schedule does not add up: ' + s.broken.join('; '));
      return { u: u, f: x.f, fl: fl, code: fl.code + '-' + u.no, word: wordOf(l, u), s: s };
    });
    var floors = items.map(function (x) { return x.f; }).filter(function (v, i, a) { return a.indexOf(v) === i; });
    /* SEVERAL UNITS GO OUT AS ONE UNIT (Muhanad, 2026-11-14: "like the Eliwah group app update ...
       it should act in the script and in the offer as one unit"). Eliwah's rule (2026-11-05): one
       unit, the areas added, ONE price and ONE schedule on it; no table of units, no "2 units";
       the codes stay joined ("G-22 + G-8") so operations can reserve each; the plan still lights
       every room. Every page and the post then take the single-unit path. */
    var one = items[0];
    if (items.length > 1) {
      var add = function (k) { return items.reduce(function (n, x) { return n + (x.u[k] || 0); }, 0); };
      var rates = items.map(function (x) { return x.u.perM; });
      var lo = Math.min.apply(null, rates), hi = Math.max.apply(null, rates);
      var U = {
        code: items.map(function (x) { return x.u.code; }).join(' + '),
        indoor: add('indoor'), outdoor: add('outdoor'), area: add('area'), price: add('price'), maintenance: add('maintenance'),
        /* one rate when they share it; otherwise the range, never an average nobody quoted */
        perM: lo === hi ? lo : null, perMRange: [lo, hi],
        kind: items.every(function (x) { return x.u.kind === items[0].u.kind; }) ? items[0].u.kind : 'unit'
      };
      var s1 = N.plans.schedule({ listPrice: U.price, discount: pl.discount || 0, plan: pl, terms: p.planTerms, from: when });
      if (!s1) throw new Error('no schedule could be worked out for ' + items.map(function (x) { return x.code; }).join(' + '));
      if (s1.broken) throw new Error('the schedule does not add up: ' + s1.broken.join('; '));
      one = { u: U, f: items[0].f, fl: items[0].fl, code: items.map(function (x) { return x.code; }).join(' + '), s: s1,
        word: items.every(function (x) { return x.word === items[0].word; }) ? items[0].word : 'shop' };
    }
    var S = one.s;
    /* re-added from the rows: what is printed must equal what is owed, to the pound */
    var added = S.rows.reduce(function (n, r) { return n + r.amount; }, 0);
    if (added !== S.payable) throw new Error('the schedule adds to ' + added + ', the total is ' + S.payable);
    return { p: p, l: l, pl: pl, when: when, items: items, one: one, S: S, floors: floors, many: false, joined: items.length > 1, word: one.word };
  }

  /* ============================================================ the pictures */
  var imgs = {};
  function loadImage(src) {
    if (!imgs[src]) imgs[src] = new Promise(function (ok, no) {
      var im = new Image();
      im.onload = function () { ok(im); };
      im.onerror = function () { delete imgs[src]; no(new Error('Could not load ' + src)); };
      im.src = /^blob:|^data:/.test(src) ? src : src + '?v=' + V;
    });
    return imgs[src];
  }
  /* a white logo (the SVGs are white, for the navy app) in another colour */
  var logos = {};
  function logo(src, colour) {
    var k = src + colour;
    if (!logos[k]) logos[k] = fetch(src + '?v=' + V).then(function (r) { return r.text(); }).then(function (svg) {
      svg = svg.replace(/#ffffff/gi, colour).replace(/#fff\b/gi, colour);
      return loadImage(URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })));
    });
    return logos[k];
  }
  function canvas(w, h) { var c = document.createElement('canvas'); c.width = Math.round(w); c.height = Math.round(h); return c; }
  function path(ctx, pts, ox, oy, k) {
    pts.forEach(function (q, i) { var x = (q[0] - ox) * k, y = (q[1] - oy) * k; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
    ctx.closePath();
  }
  function centre(u) {
    if (u.at) return u.at;
    var x = 0, y = 0;
    u.poly.forEach(function (q) { x += q[0]; y += q[1]; });
    return [x / u.poly.length, y / u.poly.length];
  }

  /* the night render, its own watermark cropped off (stage.view), the floors that
     hold the offer lit in VELN's gold and the rest of the building dimmed */
  function litNight(st, floors, scale) {
    return loadImage(st.img).then(function (im) {
      var v = st.view, k = (scale || 1) * im.naturalWidth / st.w;
      var c = canvas(v[2] * k, v[3] * k), ctx = c.getContext('2d');
      ctx.drawImage(im, v[0] * k, v[1] * k, v[2] * k, v[3] * k, 0, 0, c.width, c.height);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, c.width, c.height);
      floors.forEach(function (f) { path(ctx, st.floors[f], v[0], v[1], k); });
      ctx.fillStyle = 'rgba(14, 16, 22, .52)';
      ctx.fill('evenodd');
      ctx.restore();
      floors.forEach(function (f) {
        ctx.save();
        ctx.beginPath(); path(ctx, st.floors[f], v[0], v[1], k);
        ctx.fillStyle = 'rgba(237, 185, 100, .16)'; ctx.fill();
        ctx.shadowColor = 'rgba(237, 185, 100, .9)'; ctx.shadowBlur = 14 * k;
        ctx.strokeStyle = GOLD; ctx.lineWidth = 3 * k; ctx.lineJoin = 'round'; ctx.stroke();
        ctx.restore();
      });
      return c;
    });
  }
  /* the Ayyam pin (Main Marks js/post.js pin): a teardrop, its TIP on the spot;
     a number in its head when the deal has several units, else a white dot */
  var PIN_D = 'M12 1.2C6.92 1.2 2.8 5.32 2.8 10.4c0 2.6 1.36 5.72 3.2 8.86' +
    ' 1.85 3.15 4.12 6.2 5.36 7.8a.8.8 0 0 0 1.28 0c1.24-1.6 3.51-4.65 5.36-7.8' +
    ' 1.84-3.14 3.2-6.26 3.2-8.86 0-5.08-4.12-9.2-9.2-9.2z';
  function pin(ctx, x, y, h, n) {
    var k = h / 34;
    ctx.save();
    /* a shadow is drawn in screen pixels, whatever the scale */
    ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = h * 0.14; ctx.shadowOffsetY = h * 0.06;
    ctx.translate(x - 12 * k, y - 27.6 * k);
    ctx.scale(k, k);
    var body = root.Path2D ? new root.Path2D(PIN_D) : null;
    ctx.fillStyle = INK;
    if (body) ctx.fill(body); else { ctx.beginPath(); ctx.arc(12, 10.4, 9.2, 0, Math.PI * 2); ctx.fill(); }
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = WHITE; ctx.lineWidth = 1.3;
    if (body) ctx.stroke(body);
    ctx.fillStyle = WHITE;
    if (n) {
      ctx.font = '600 ' + (n > 9 ? 8.6 : 10.4) + 'px Poppins, Arial, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(n), 12, 11);
    } else { ctx.beginPath(); ctx.arc(12, 10.4, 3.4, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
  /* Najm's page prints one room in COLOUR: the bank, in yellow (G-13, F-11), which sat beside the
     gold of the offered unit and read as part of the offer (Muhanad, 2026-11-15: "fade the bank").
     Any room that is not in the offer and is printed in colour is turned to pale grey tones, its
     printed words still readable. Judged from the picture itself (how coloured the room is), not
     from a unit number or a status, so the offer still says nothing about what is sold. The pixels
     are worked directly: a canvas "saturation" blend is not on every phone. */
  function fadePrinted(ctx, units, offered, k) {
    var W = ctx.canvas.width, H = ctx.canvas.height, edge = 7 * k;
    units.forEach(function (u) {
      if (!u.poly || offered.indexOf(u) >= 0) return;
      var xs = u.poly.map(function (q) { return q[0] * k; }), ys = u.poly.map(function (q) { return q[1] * k; });
      var x0 = Math.max(0, Math.floor(Math.min.apply(null, xs) - edge)), y0 = Math.max(0, Math.floor(Math.min.apply(null, ys) - edge));
      var w = Math.min(W, Math.ceil(Math.max.apply(null, xs) + edge)) - x0, h = Math.min(H, Math.ceil(Math.max.apply(null, ys) + edge)) - y0;
      if (w < 2 || h < 2) return;
      /* the room's own shape, with an edge: the printed colour runs a little past the outline */
      var m = canvas(w, h), mc = m.getContext('2d');
      mc.beginPath(); path(mc, u.poly, x0 / k, y0 / k, k);
      mc.fillStyle = '#000'; mc.fill();
      var inside = mc.getImageData(0, 0, w, h).data;
      mc.strokeStyle = '#000'; mc.lineWidth = edge; mc.lineJoin = 'round'; mc.stroke();
      var mask = mc.getImageData(0, 0, w, h).data;
      var img = ctx.getImageData(x0, y0, w, h), d = img.data, n = 0, colour = 0, hx = 0, hy = 0, i, c, t;
      for (i = 0; i < d.length; i += 4) {
        if (inside[i + 3] < 128) continue;
        c = Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]);
        n++; colour += c;
        if (c >= FADE_FROM) { t = hue(d[i], d[i + 1], d[i + 2]) * Math.PI / 180; hx += Math.cos(t); hy += Math.sin(t); }
      }
      if (!n || colour / n < FADE_FROM) return;             /* a plain room: left as printed */
      /* the room's own colour; what is printed in it just outside the outline goes too (the
         bank's yellow stair and door marks sit in a notch of its outline) */
      var own = (Math.atan2(hy, hx) * 180 / Math.PI + 360) % 360;
      for (i = 0; i < d.length; i += 4) {
        var a = mask[i + 3] / 255;
        if (a < 1 && Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]) >= FADE_NEAR) {
          t = Math.abs(hue(d[i], d[i + 1], d[i + 2]) - own);
          if (Math.min(t, 360 - t) <= 25) a = 1;
        }
        if (!a) continue;
        var grey = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        grey += (255 - grey) * FADE_PALE;
        d[i] += (grey - d[i]) * a; d[i + 1] += (grey - d[i + 1]) * a; d[i + 2] += (grey - d[i + 2]) * a;
      }
      ctx.putImageData(img, x0, y0);
    });
  }
  /* how coloured a room must be, on average, to be faded (0 = grey, 255 = pure colour; measured
     on the four pages, 2026-11-15: the yellow bank 139 and 143, every other room 21 or less),
     and how far the grey is paled towards the paper */
  var FADE_FROM = 60, FADE_PALE = 0.45, FADE_NEAR = 36;
  function hue(r, g, b) {
    var mx = Math.max(r, g, b), c = mx - Math.min(r, g, b);
    if (!c) return 0;
    var h = mx === r ? ((g - b) / c) % 6 : mx === g ? (b - r) / c + 2 : (r - g) / c + 4;
    return (h * 60 + 360) % 360;
  }
  /* a room's number disc and its area in Najm's printed red (#D03745), on a page that prints
     neither. Same sizes and placing as the app's plan (js/project.js areaAt), in page px x k. */
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
  }  function printLabels(ctx, units, k) {
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    units.forEach(function (u) {
      if (!u.at) return;
      ctx.beginPath(); ctx.arc(u.at[0] * k, u.at[1] * k, 19 * k, 0, Math.PI * 2);
      ctx.fillStyle = '#A9C6DC'; ctx.fill();
      ctx.fillStyle = '#18263E'; ctx.font = '500 ' + (21 * k) + 'px Poppins, Arial, sans-serif';
      ctx.fillText(String(u.no), u.at[0] * k, u.at[1] * k + 1 * k);
      var lab = Math.round(u.indoor) + ' m²', at = areaAt(u, lab.length);
      if (!at) return;
      ctx.fillStyle = '#D03745'; ctx.font = '600 ' + (at.fs * k) + 'px Poppins, Arial, sans-serif';
      ctx.fillText(lab, at.x * k, at.y * k);
    });
    ctx.restore();
  }
  /* on a page whose rooms carry our number and area, the pin stands in the room ABOVE them, so
     both stay readable; it falls back to the top of the disc in a room too short for it */
  function pinSpot(u, k, pinH) {
    if (!u.at || !u.poly) return centre(u);
    var a = areaAt(u, (Math.round(u.indoor) + ' m²').length), top = u.at[1] - 19, ph = pinH / k;
    if (a && a.y < u.at[1]) top = Math.min(top, a.y - a.fs * 0.45);
    var d, tip;
    for (d = 4; d <= 240; d += 6) {
      tip = [u.at[0], top - d];
      if (inPoly(tip, u.poly) && inPoly([tip[0], tip[1] - ph], u.poly)) return tip;
    }
    /* a small room: the tip in the room above the labels, the pin's body may stand above the room */
    for (d = 1; d <= 12; d += 2) { tip = [u.at[0], top - d]; if (inPoly(tip, u.poly)) return tip; }
    /* no room above: beside the disc */
    for (d = 22; d <= 60; d += 4) {
      if (inPoly([u.at[0] + d, u.at[1]], u.poly)) return [u.at[0] + d, u.at[1]];
      if (inPoly([u.at[0] - d, u.at[1]], u.poly)) return [u.at[0] - d, u.at[1]];
    }
    return [u.at[0], u.at[1] - 19];
  }
  /* the WHOLE floor (Muhanad, 2026-11-03): the rest of the plan softened, each offered
     unit lit in VELN's gold with a small pin on it, numbered when the deal has several */
  function floorPlan(items, f, px, pinH) {
    var mine = items.filter(function (x) { return x.f === f; }), fl = mine[0].fl;
    return loadImage(fl.img).then(function (im) {
      var k = px / fl.w, c = canvas(px, fl.h * k), ctx = c.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.fillStyle = WHITE; ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(im, 0, 0, c.width, c.height);
      fadePrinted(ctx, fl.units || [], mine.map(function (x) { return x.u; }), k);
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, c.width, c.height);
      mine.forEach(function (x) { path(ctx, x.u.poly, 0, 0, k); });
      ctx.fillStyle = 'rgba(255, 255, 255, .4)'; ctx.fill('evenodd');
      ctx.restore();
      mine.forEach(function (x) {
        ctx.save();
        ctx.beginPath(); path(ctx, x.u.poly, 0, 0, k);
        ctx.fillStyle = 'rgba(237, 185, 100, .62)'; ctx.fill();
        ctx.strokeStyle = '#7A5A12'; ctx.lineWidth = Math.max(2, 3 * px / 1000); ctx.lineJoin = 'round'; ctx.stroke();
        ctx.restore();
      });
      /* the medical page prints no number and no area in its rooms: write them as the other
         pages print them (the app's plan does the same, js/project.js) */
      if (fl.labels) printLabels(ctx, fl.units || [], k);
      mine.forEach(function (x) {
        var at = x.u.zone ? x.u.at : fl.labels ? pinSpot(x.u, k, pinH) : centre(x.u);
        pin(ctx, at[0] * k, at[1] * k, pinH, 0);          /* several units are one unit: no numbers (2026-11-14) */
      });
      return c;
    });
  }
  function jpeg(c, q) { return { data: c.toDataURL('image/jpeg', q || 0.86), format: 'JPEG', w: c.width, h: c.height }; }
  function png(im, h) {
    var c = canvas(im.naturalWidth * h / im.naturalHeight, h);
    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
    return { data: c.toDataURL('image/png'), format: 'PNG', w: c.width, h: c.height };
  }

  /* ================================================================ the PDF */
  var loaded = {};
  function script(src) {
    if (!loaded[src]) loaded[src] = new Promise(function (ok, no) {
      var s = document.createElement('script');
      s.src = src + '?v=' + V; s.onload = ok;
      s.onerror = function () { delete loaded[src]; no(new Error('Could not load ' + src)); };
      document.head.appendChild(s);
    });
    return loaded[src];
  }
  function base64(u8) {
    var s = '', CH = 0x8000;
    for (var i = 0; i < u8.length; i += CH) s += String.fromCharCode.apply(null, u8.subarray(i, i + CH));
    return btoa(s);
  }
  var FONTS = [['light', 'Poppins-Light.ttf', 'PoppinsLight'], ['normal', 'Poppins-Regular.ttf', 'Poppins'], ['medium', 'Poppins-Medium.ttf', 'PoppinsMedium'],
    ['semi', 'Poppins-SemiBold.ttf', 'PoppinsSemi'], ['script', 'GreatVibes-Regular.ttf', 'GreatVibes']];
  var FONTS_AR = [['normal', 'IBMPlexSansArabic-Regular.ttf', 'PlexArabic'], ['medium', 'IBMPlexSansArabic-Medium.ttf', 'PlexArabicMedium'],
    ['semi', 'IBMPlexSansArabic-SemiBold.ttf', 'PlexArabicSemi']];
  var faceCache = {};
  function faces(list, lang) {
    if (!faceCache[lang]) {
      faceCache[lang] = Promise.all(list.map(function (f) {
        return fetch('vendor/fonts/' + f[1] + '?v=' + V).then(function (r) {
          if (!r.ok) throw new Error('Could not load the font ' + f[1]);
          return r.arrayBuffer();
        }).then(function (b) { return { lang: lang, weight: f[0], file: f[1], family: f[2], base64: base64(new Uint8Array(b)) }; });
      }));
      faceCache[lang].catch(function () { delete faceCache[lang]; });
    }
    return faceCache[lang];
  }
  /* jsPDF's own Arabic passes, switched off (Main Marks' js/pdf.js disarm, from Qomor):
     the text reaches doc.text() already shaped and in drawing order */
  function disarm(doc, jsPDF) {
    var ev = doc.internal && doc.internal.events;
    if (ev && typeof ev.getTopics === 'function') {
      var topics = ev.getTopics() || {};
      Object.keys(topics.preProcessText || {}).forEach(function (k) { ev.unsubscribe(k); });
    }
    var parser = jsPDF.API && jsPDF.API.__arabicParser__;
    var original = parser && parser.processArabic;
    if (parser) parser.processArabic = function (a) { return typeof a === 'string' ? a : (a && a.text); };
    var text = doc.text.bind(doc);
    doc.text = function (s, x, y, o) { return text(s, x, y, Object.assign({}, o || {}, { isInputVisual: true, isOutputVisual: true })); };
    return function () { if (parser && original) parser.processArabic = original; };
  }

  /* ================================================== the look: D Navy (build 11)
     Chosen by Muhanad 2026-11-05 from the round 2 looks (mock: Desktop\Najm - Veln\
     Offer looks\round 2 mock). VELN's navy, gold figures, pictures to the edges, seven
     pages: cover, the line, location (with the Google Maps button), inside VELN (the
     unit's floor lit), the unit on the plan, the payment plan, the payment sheet.
     Each line has its own pictures (img/offer/): Najm's clean renders. Najm has sent NO
     render of an office: the office line shows the building's upper floors. */
  var NAVY = '#08213D', FG = '#F2EEE6', MUTED = '#A3AEBF';
  var ROW_A = '#112944', ROW_B = '#1D344D', ROW_T = '#263C54';   /* 3.5%, 8.5% and 12% white on the navy */
  var MAPS = 'https://maps.app.goo.gl/yhULzLy2TYg41Zuw5';      /* his link: it opens "Veln Mall" (checked 2026-11-05) */
  var VELN_ON_MAP = [0.464, 0.323];                            /* Najm's own VELN marker on img/offer/map-streets.jpg */
  var NIGHT_VIEW = [100, 159, 1400, 741];                      /* the part of the night render shown, in stage units */
  /* the pictures each line opens on, and where each is held (as CSS background-position) */
  var PICS = {
    shop: { cover: ['s-night-front', 0.14, 0.5], pics: [['s-terrace', 0.5, 0.6], ['s-atrium', 0.5, 0.55], ['s-street-night', 0.3, 0.5]] },
    office: { cover: ['b-bluehour', 0.08, 0.5], pics: [['o-escalator', 0.5, 0.6], ['b-day-two', 0.5, 0.3], ['b-aerial-day', 0.5, 0.5]] },
    clinic: { cover: ['c-dental', 0.42, 0.5], pics: [['c-lobby', 0.5, 0.6], ['c-corridor', 0.5, 0.6], ['c-room', 0.5, 0.45]] }
  };
  function lineKey(word) { return word === 'office' ? 'office' : word === 'clinic' || word === 'zone' ? 'clinic' : 'shop'; }
  function al(w) { return w.split(' ').map(function (x) { return 'ال' + x; }).join(' '); }

  /* the words of look D. The line facts are the Sales Orientation deck's (pp. 42-45), the
     facilities its pages 13-30, the minutes its page 10. The Arabic is ours: Najm must read it. */
  Object.assign(EN, {
    lineFacts: function (l, fl) {
      var dv = fl.delivered, f = {
        commercial: [['Line', 'Commercial'], ['Floors', 'Ground and first'], ['Shop sizes', '28 to 137 m² on the ground floor, 30 to 80 m² on the first'], ['Delivered', dv]],
        admin: [['Line', 'Administrative'], ['Floor', 'Second floor'], ['Office sizes', '29 to 79 m²'], ['Delivered', dv]],
        medical: [['Line', 'Medical'], ['Floor', 'Third floor'], ['Clinic sizes', '21 to 79 m²'], ['Delivered', dv], ['Operated by', 'Healthy Care Medical Group']]
      };
      return f[l.id] || [['Line', l.name], ['Delivered', dv]];
    },
    caps3: { shop: ['Seating at the shop fronts', 'The atrium', 'The shop street at night'], office: ['Escalators through the atrium', 'The glass floors above the shops', 'VELN from above'],
      clinic: ['Reception and waiting', 'The consultation rooms', 'A patient room'] },
    lineSub: function (code, line, fl) { return code + '  ·  ' + line + '  ·  ' + fl; },
    where: 'Where VELN is', whereSub: 'In the heart of Yasmine district, New Cairo', minsHead: 'Minutes from VELN',
    min: function (n) { return n > 1 ? 'MINS' : 'MIN'; },
    mins: [[1, 'Sadat Axis'], [2, 'North 90th Street'], [3, 'Mohamed Naguib Axis'], [3, 'Waterway'], [3, 'Petrosport Club'], [3, 'Dusit Thani LakeView']],
    tagline: 'A prime, vibrant area with strong footfall  ·  excellent visibility  ·  easy to reach',
    mapBtn: 'Open VELN in Google Maps',
    inside: 'Inside VELN', insideSub: function (fl) { return '2 basements, the ground floor and 3 floors above it  ·  ' + fl + ' lit'; },
    stack: [['third', 'Medical'], ['second', 'Administrative'], ['first', 'Commercial'], ['ground', 'Commercial'], ['basements', 'Basements']],
    basements: '2 basements', yours: function (w, many) { return many ? 'your units' : 'your ' + w.toLowerCase(); },
    insideHead: 'What is inside',
    facilities: ['Open-air walkway with cafés, restaurants & boutiques', 'Digital entertainment area: VR, escape room, interactive games', 'Escalators and high-speed elevators', 'Secured parking',
      'Vibrant landscaping', 'Designed restrooms', 'Integrated sound system', 'Regular maintenance service', '24/7 security & monitoring', 'CCTV cameras',
      'Fire safety & suppression', 'High-speed internet & Wi-Fi', 'Energy-saving power, by 40%', 'Electric vehicle charging', 'Emergency water reserve', 'Sustainable & environmentally friendly'],
    onPlan: function (w, many) { return many ? 'Your units on the plan' : 'Your ' + w.toLowerCase() + ' on the plan'; },
    onPlanSub: function (head, w, many) { return head + '  ·  the whole floor, ' + (many ? 'your units' : w.toLowerCase()) + ' in gold'; },
    big: { down: 'Down payment', every: 'Every 3 months', total: 'Total payable', onSign: 'on signing', n: function (n) { return n + ' payments'; },
      save: function (v) { return 'You save ' + money(v); }, cash: 'Cash payment', once: 'once, on signing', off: 'Your discount', listP: 'Original price' },
    sheet: 'Payment sheet', sheetSub: function (codes, plan) { return 'Every payment of ' + codes + '  ·  ' + plan; },
    sheetMaint: function (d) { return 'Maintenance, not in the total  ·  8% of the original price, ' + d; }
  });
  Object.assign(AR, {
    lineFacts: function (l, fl) {
      var dv = AR.delivered(fl.delivered), f = {
        commercial: [['النشاط', 'التجاري'], ['الأدوار', 'الأرضي والأول'], ['مساحات المحلات', 'من 28 إلى 137 متر في الأرضي، ومن 30 إلى 80 متر في الأول'], ['التسليم', dv]],
        admin: [['النشاط', 'الإداري'], ['الدور', 'الدور الثاني'], ['مساحات المكاتب', 'من 29 إلى 79 متر'], ['التسليم', dv]],
        medical: [['النشاط', 'الطبي'], ['الدور', 'الدور الثالث'], ['مساحات العيادات', 'من 21 إلى 79 متر'], ['التسليم', dv], ['التشغيل', 'Healthy Care Medical Group']]
      };
      return f[l.id] || [['النشاط', AR.line(l)], ['التسليم', dv]];
    },
    caps3: { shop: ['جلسات أمام المحلات', 'الأتريوم', 'شارع المحلات ليلاً'], office: ['السلالم المتحركة في الأتريوم', 'الأدوار الزجاجية فوق المحلات', 'VELN من أعلى'],
      clinic: ['الاستقبال والانتظار', 'غرف الكشف', 'غرفة مريض'] },
    lineSub: function (code, line, fl) { return code + '  ·  النشاط ' + line + '  ·  ' + fl; },
    where: 'موقع VELN', whereSub: 'في قلب حي الياسمين، القاهرة الجديدة', minsHead: 'دقائق من VELN',
    min: function (n) { return n > 1 ? 'دقائق' : 'دقيقة'; },
    mins: [[1, 'محور السادات'], [2, 'شارع التسعين الشمالي'], [3, 'محور محمد نجيب'], [3, 'ووتر واي'], [3, 'نادي بتروسبورت'], [3, 'دوسيت ثاني ليك فيو']],
    tagline: 'منطقة حيوية مميزة بحركة كبيرة  ·  واجهة ظاهرة  ·  سهولة في الوصول',
    mapBtn: 'افتح موقع VELN على خرائط جوجل',
    inside: 'داخل VELN', insideSub: function (fl) { return 'بدرومين، الدور الأرضي و3 أدوار فوقه  ·  ' + fl + ' مضاء'; },
    stack: [['third', 'الطبي'], ['second', 'الإداري'], ['first', 'التجاري'], ['ground', 'التجاري'], ['basements', 'البدروم']],
    basements: 'بدرومين', yours: function (w, many) { return many ? 'وحداتك' : al(w) + ' الخاص بك'; },
    insideHead: 'المميزات',
    facilities: ['ممشى مفتوح بمقاهي ومطاعم ومحلات', 'منطقة ترفيه رقمي: واقع افتراضي وغرفة هروب وألعاب تفاعلية', 'سلالم متحركة ومصاعد سريعة', 'جراج مؤمَّن',
      'لاندسكيب مميز', 'دورات مياه مصممة بعناية', 'نظام صوت متكامل', 'خدمة صيانة دورية', 'أمن ومراقبة على مدار الساعة', 'كاميرات مراقبة',
      'أنظمة إطفاء وحماية من الحريق', 'إنترنت وواي فاي سريع', 'توفير في استهلاك الطاقة حتى 40%', 'شحن السيارات الكهربائية', 'خزان مياه احتياطي', 'مشروع مستدام وصديق للبيئة'],
    onPlan: function (w, many) { return many ? 'الوحدات على المخطط' : al(w) + ' على المخطط'; },
    onPlanSub: function (head, w, many) { return head + '  ·  الدور كاملاً، و' + (many ? 'الوحدات' : al(w)) + ' باللون الذهبي'; },
    big: { down: 'المقدم', every: 'كل 3 شهور', total: 'الإجمالي', onSign: 'عند التعاقد', n: function (n) { return n + ' قسطاً'; },
      save: function (v) { return 'توفير ' + money(v); }, cash: 'دفعة كاش', once: 'مرة واحدة عند التعاقد', off: 'الخصم', listP: 'السعر الأصلي' },
    sheet: 'جدول الدفعات', sheetSub: function (codes, plan) { return 'كل دفعات ' + codes + '  ·  ' + plan; },
    sheetMaint: function (d) { return 'الصيانة، خارج الإجمالي  ·  8% من السعر الأصلي، ' + d; }
  });

  /* a picture cut to a box (the box's shape, held at fx, fy as CSS background-position), at px wide */
  function shot(src, ww, hh, fx, fy, px) {
    return loadImage(src).then(function (im) {
      var c = canvas(px, px * hh / ww), ctx = c.getContext('2d');
      var sc = Math.max(c.width / im.naturalWidth, c.height / im.naturalHeight), dw = im.naturalWidth * sc, dh = im.naturalHeight * sc;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(im, (c.width - dw) * fx, (c.height - dh) * fy, dw, dh);
      return c;
    });
  }
  /* the cover picture, its navy veil drawn in: dark under the logos, clear, then into the page */
  function coverShot(p, ww, hh) {
    return shot('img/offer/' + p[0] + '.jpg', ww, hh, p[1], p[2], 1400).then(function (c) {
      var ctx = c.getContext('2d'), g = ctx.createLinearGradient(0, 0, 0, c.height);
      g.addColorStop(0, 'rgba(8,33,61,.7)'); g.addColorStop(0.17, 'rgba(8,33,61,0)'); g.addColorStop(0.8, 'rgba(8,33,61,0)'); g.addColorStop(1, 'rgba(8,33,61,1)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, c.width, c.height);
      return c;
    });
  }
  /* VELN at night, Najm's clean render 01 (3) (the same picture as the app's VELN 17, twice the
     size, no watermark), the offer's floors lit along the app's own outlines (config stage.floors) */
  function litView(st, floors, px) {
    var v = NIGHT_VIEW;
    return loadImage('img/offer/b-night.jpg').then(function (im) {
      var k = im.naturalWidth / st.w, s = px / v[2];
      var c = canvas(px, v[3] * s), ctx = c.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(im, v[0] * k, v[1] * k, v[2] * k, v[3] * k, 0, 0, c.width, c.height);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, c.width, c.height);
      floors.forEach(function (f) { path(ctx, st.floors[f], v[0], v[1], s); });
      ctx.fillStyle = 'rgba(8, 14, 24, .5)'; ctx.fill('evenodd'); ctx.restore();
      floors.forEach(function (f) {
        ctx.save(); ctx.beginPath(); path(ctx, st.floors[f], v[0], v[1], s);
        ctx.fillStyle = 'rgba(237, 185, 100, .14)'; ctx.fill();
        ctx.shadowColor = 'rgba(237, 185, 100, .9)'; ctx.shadowBlur = 6 * s;
        ctx.strokeStyle = GOLD; ctx.lineWidth = 2.4 * s; ctx.lineJoin = 'round'; ctx.stroke();
        ctx.restore();
      });
      return c;
    });
  }

  /* everything the PDF draws, made first: pictures from the canvas, logos recoloured, all at once */
  /* the pin's height on the page, in points: small, a mark, not a label */
  var PIN_PT = 13, PIN_PT_N = 16;
  var BOX = { cover: [595.28, 600], main: [595.28, 307.5], small: [296.2, 165], map: [595.28, 420], night: [595.28, 315] };
  function art(w) {
    var st = w.p.stage, two = !!w.floors[1], P = PICS[lineKey(w.word)];
    var px = two ? 1100 : 1700, shown = two ? 250 : 511.5, pinH = (w.many ? PIN_PT_N : PIN_PT) * px / shown;
    return Promise.all([
      coverShot(P.cover, BOX.cover[0], BOX.cover[1]),
      shot('img/offer/' + P.pics[0][0] + '.jpg', BOX.main[0], BOX.main[1], P.pics[0][1], P.pics[0][2], 1600),
      shot('img/offer/' + P.pics[1][0] + '.jpg', BOX.small[0], BOX.small[1], P.pics[1][1], P.pics[1][2], 800),
      shot('img/offer/' + P.pics[2][0] + '.jpg', BOX.small[0], BOX.small[1], P.pics[2][1], P.pics[2][2], 800),
      loadImage('img/offer/map-streets.jpg'),
      litView(st, w.floors, 1800),
      floorPlan(w.items, w.floors[0], px, pinH),
      logo('img/veln-logo.svg', WHITE), logo('img/najm-logo.svg', WHITE),
      two ? floorPlan(w.items, w.floors[1], px, pinH) : null
    ]).then(function (g) {
      var map = canvas(1800, 1800 * g[4].naturalHeight / g[4].naturalWidth);
      map.getContext('2d').drawImage(g[4], 0, 0, map.width, map.height);
      return { cover: jpeg(g[0], 0.84), main: jpeg(g[1], 0.84), small1: jpeg(g[2], 0.84), small2: jpeg(g[3], 0.84), map: jpeg(map, 0.86), night: jpeg(g[5], 0.84),
        plan: jpeg(g[6], 0.86), plan2: g[9] ? jpeg(g[9], 0.86) : null, velnWhite: png(g[7], 180), najmWhite: png(g[8], 180) };
    });
  }

  function pdf(o) {
    var w = work(o), lang = o.lang === 'ar' ? 'ar' : 'en';
    var fontList = lang === 'ar' ? Promise.all([faces(FONTS, 'en'), faces(FONTS_AR, 'ar'), script('js/arabic.js')]).then(function (r) { return r[0].concat(r[1]); }) : faces(FONTS, 'en');
    return Promise.all([script('vendor/jspdf.umd.min.js'), fontList, art(w)]).then(function (g) {
      var doc = draw(w, { lang: lang, fonts: g[1], art: g[2], jsPDF: root.jspdf.jsPDF, arabic: N.arabic });
      return { blob: doc.output('blob'), pages: doc.getNumberOfPages(),
        name: 'VELN - ' + EN.word[w.word] + ' ' + w.one.code.replace(/–/g, ' to ') + ' - offer' + (lang === 'ar' ? ' - Arabic' : '') + '.pdf' };
    });
  }

  function draw(w, o) {
    var T = o.lang === 'ar' ? AR : EN, RTL = T.rtl, A = o.arabic, art = o.art;
    if (RTL && !A) throw new Error('An Arabic offer needs js/arabic.js.');
    var W = 595.28, H = 841.89, M = 42, PW = W - 2 * M;
    var doc = new o.jsPDF({ unit: 'pt', format: 'a4', compress: true });
    var fams = {}, arFams = {};
    o.fonts.forEach(function (f) {
      doc.addFileToVFS(f.file, f.base64);
      doc.addFont(f.file, f.family, 'normal');
      if (f.lang === 'ar') arFams[f.weight] = f.family; else fams[f.weight] = f.family;
    });
    ['light', 'normal', 'medium', 'semi'].forEach(function (k) { if (!fams[k]) throw new Error('Font "' + k + '" missing: no document.'); });
    if (RTL) ['normal', 'medium', 'semi'].forEach(function (k) { if (!arFams[k]) throw new Error('Arabic font "' + k + '" missing: no document.'); });
    var undo = RTL ? disarm(doc, o.jsPDF) : function () {};
    var S = w.S, pl = w.pl, first = w.one, l = w.l, LK = lineKey(w.word);
    var codes = first.code;
    /* "Ground floor", or "Ground floor + First floor" when the one unit spans two */
    var floorTxt = w.floors.map(function (f) { return T.floor[f]; }).join(' + ');
    var title = w.many ? codes : first.code;
    doc.setProperties({ title: 'VELN — ' + (w.many ? w.items.length + ' units ' + codes : EN.word[w.word] + ' ' + first.code) + ' offer', subject: 'Unit offer', creator: 'Najm sales app' });

    /* ---- drawing helpers, mirrored for Arabic (Main Marks' js/pdf.js) ---- */
    function fill(c) { doc.setFillColor(c); }
    function ink(c) { doc.setTextColor(c); }
    function stroke(c, lw) { doc.setDrawColor(c); doc.setLineWidth(lw); }
    function mx(x, ww) { return RTL ? W - x - (ww || 0) : x; }
    function px(x) { return RTL ? W - x : x; }
    function line(x1, y1, x2, y2) { doc.line(px(x1), y1, px(x2), y2); }
    function rect(x, y, ww, h, style) { doc.rect(mx(x, ww), y, ww, h, style); }
    function rrect(x, y, ww, h, r, style) { doc.roundedRect(mx(x, ww), y, ww, h, r, r, style); }
    var AR_OF = { light: 'normal', normal: 'normal', medium: 'medium', semi: 'semi', script: 'semi' };
    var role = 'normal', size = 10;
    function font(r, sz) { role = r; size = sz; }
    function isAr(s) { return !!A && A.hasArabic(s); }
    function use(s) {
      var ar = isAr(s), fam = ar ? arFams[AR_OF[role]] : fams[role];
      if (!fam) throw new Error('No face for "' + role + '": no document.');
      doc.setFont(fam, 'normal');
      doc.setFontSize(size);
      return { ar: ar, text: ar ? A.forPdf(s) : s };
    }
    function put(s, x, y, opts) {
      opts = opts || {};
      var t = String(s == null ? '' : s), f = use(t), align = opts.align || 'left';
      if (RTL) { x = W - x; align = align === 'left' ? 'right' : align === 'right' ? 'left' : align; }
      var o2 = { align: align };
      if (opts.charSpace && !f.ar) o2.charSpace = opts.charSpace;
      doc.text(f.text, x, y, o2);
    }
    function width(s) { return doc.getTextWidth(use(String(s)).text); }
    function wrap(s, max) {
      var words = String(s).split(' '), out = [], ln = '';
      words.forEach(function (x) { var t = ln ? ln + ' ' + x : x; if (ln && width(t) > max) { out.push(ln); ln = x; } else ln = t; });
      if (ln) out.push(ln);
      return out;
    }
    function caps(s, x, y, sz, c, opts) {
      opts = opts || {};
      var ar = isAr(s);
      font(opts.weight || 'medium', ar ? sz + 1.5 : sz); ink(c);
      put(ar ? s : String(s).toUpperCase(), x, y, { charSpace: sz * 0.22, align: opts.align });
    }
    function clipped(x, y, ww, h, fn) {
      doc.saveGraphicsState(); doc.rect(x, y, ww, h, null); doc.clip(); doc.discardPath(); fn(); doc.restoreGraphicsState();
    }
    /* pictures: placed in reading order (mirrored box), never flipped */
    function image(img, x, y, ww, h) { doc.addImage(img.data, img.format, mx(x, ww), y, ww, h, undefined, 'FAST'); }
    function logoAt(img, x, y, h) { var ww = img.w * h / img.h; image(img, x, y, ww, h); return ww; }
    function ground() { fill(NAVY); doc.rect(0, 0, W, H, 'F'); }

    var asOf = T.asOf(T.day(new Date(root.VELN_UNITS.asOf + 'T12:00:00')));
    var kicker = 'VELN  ·  ' + (w.many ? T.units(w.items.length) + ' · ' + T.oneDeal : T.word[w.word] + ' ' + first.code);
    function head(heading, sub) {
      caps(kicker, M, 47, 7.1, GOLD);
      font('light', 30); ink(FG); put(heading, M, 82);
      if (sub) { font('normal', 8.6); ink(MUTED); put(sub, M, 102); }
    }
    function cap(s, x, y) { font('normal', 6.4); ink(MUTED); put(s, x, y); }
    /* rows: one lighter, the next darker, no hairlines (his rule); a gold edge on the one that matters */
    function rows(list, x, y, ww, opts) {
      opts = opts || {};
      list.forEach(function (r, i) {
        var h = r.sub ? 37 : (opts.tight ? 24 : 28);
        fill(i % 2 ? ROW_B : ROW_A); rect(x, y, ww, h, 'F');
        if (r.mark) { fill(GOLD); rect(x, y, 2.2, h, 'F'); }
        font(r.strong ? 'semi' : 'medium', 8.6); ink(FG); put(r.k, x + 10.5, y + (r.sub ? 15 : h / 2 + 3));
        if (r.sub) { font('normal', 6.4); ink(MUTED); put(r.sub, x + 10.5, y + 27); }
        font(r.strong ? 'semi' : 'medium', r.strong ? 12 : 9.4); ink(r.gold ? GOLD : FG);
        put(r.v, x + ww - 10.5, y + (r.sub ? (r.strong ? 18 : 16) : h / 2 + 3.2), { align: 'right' });
        y += h;
      });
      return y;
    }
    var flNames = w.floors.map(function (f) { return T.floor[f]; });
    var dv = l.facts.filter(function (x) { return x.k === 'Delivered'; })[0];
    var delivered = dv ? dv.v : '—';

    /* ---- 1. the cover: the line's own picture, the unit under it ---- */
    ground();
    image(art.cover, 0, 0, W, BOX.cover[1]);
    logoAt(art.velnWhite, M, 39, 37.5);
    var nw = art.najmWhite.w * 25.5 / art.najmWhite.h;
    image(art.najmWhite, W - M - nw, 45, nw, 25.5);
    caps(T.offerOf(w.many ? T.oneDeal : T.word[w.word]), M, 629, 7.1, GOLD);
    var cs = 78; font('light', cs);
    while (width(first.code) > PW && cs > 30) { cs -= 4; font('light', cs); }
    ink(WHITE); put(first.code, M - 2, 694);
    fill(GOLD); rect(M, 729, 30, 0.8, 'F');
    font('normal', 10.5); ink(FG);
    var where = T.line(l) + '  ·  ' + flNames.join(' + ') + (w.many ? '' : '  ·  ' + T.m2(first.u.indoor) + (first.u.outdoor ? (RTL ? ' داخلي + ' + T.m2(first.u.outdoor) + ' خارجي' : ' indoor  +  ' + T.m2(first.u.outdoor) + ' outdoor') : ''));
    if (w.zone) where = T.line(l) + '  ·  ' + flNames.join(' + ') + '  ·  ' + T.m2(first.u.area) + '  ·  ' + T.shares(first.u.shares.length);
    put(where, M, 751);
    if (w.many) { font('normal', 8.6); ink(MUTED); put(codes, M, 767); }
    font('normal', 8.6); ink(MUTED); put(T.longDay(w.when), M, w.many ? 783 : 768);
    font('normal', 6.2); ink(MUTED); put(asOf, M, H - 21);   /* no "Sample for review": production (2026-11-15) */

    /* ---- 2. the line: its three pictures and what it is ---- */
    doc.addPage(); ground();
    head(w.many ? T.yourUnits : T.yourUnit(T.word[w.word]), T.lineSub(w.many ? codes : first.code, T.line(l), flNames.join(' + ')));
    var C3 = T.caps3[LK];
    image(art.main, 0, 126, W, BOX.main[1]); cap(C3[0], M, 445);
    image(art.small1, 0, 457.5, BOX.small[0], BOX.small[1]); image(art.small2, W - BOX.small[0], 457.5, BOX.small[0], BOX.small[1]);
    cap(C3[1], M, 634); cap(C3[2], W - BOX.small[0] + M, 634);
    rows(T.lineFacts(l, { delivered: delivered }).map(function (f) { return { k: f[0], v: f[1] }; }), M, 645, PW, { tight: true });

    /* ---- 3. where VELN is, with the button to Google Maps ---- */
    doc.addPage(); ground();
    head(T.where, T.whereSub);
    var mapY = 127.5, mapH = BOX.map[1], mh = W * art.map.h / art.map.w, my = mapY + (mapH - mh) / 2;
    clipped(0, mapY, W, mapH, function () { doc.addImage(art.map.data, art.map.format, 0, my, W, mh, undefined, 'FAST'); });
    /* the ring sits on Najm's marker: the picture is never mirrored, so neither is the ring */
    stroke(GOLD, 1.5); doc.circle(W * VELN_ON_MAP[0], my + mh * VELN_ON_MAP[1], 19.5, 'S');
    stroke(NAVY, 0.6); doc.circle(W * VELN_ON_MAP[0], my + mh * VELN_ON_MAP[1], 21.2, 'S');
    caps(T.minsHead, M, 577, 7.1, GOLD);
    var cw = PW / 3;
    T.mins.forEach(function (m, i) {
      var x = M + (i % 3) * cw, y = 609 + Math.floor(i / 3) * 51;
      font('light', 25.5); ink(GOLD); put(String(m[0]), x, y);
      var nw2 = width(String(m[0]));
      font('medium', RTL ? 7.4 : 6.4); ink(MUTED); put(T.min(m[0]), x + nw2 + 4, y, { charSpace: RTL ? 0 : 1.1 });
      font('normal', 7.9); ink(FG); put(m[1], x, y + 17);
    });
    font('normal', 7.9); ink(MUTED); put(T.tagline, M, 724);
    /* the button: gold, a pin, the words; the whole of it is a link */
    font('semi', 9); var bt = width(T.mapBtn), bw = bt + 44, bx = M, by = 742, bh = 26;
    fill(GOLD); rrect(bx, by, bw, bh, bh / 2, 'F');
    var pinX = px(bx + 17), pinY = by + bh / 2 - 1.5;
    fill(NAVY); doc.circle(pinX, pinY, 4.6, 'F'); doc.triangle(pinX - 4, pinY + 2.2, pinX + 4, pinY + 2.2, pinX, pinY + 8.4, 'F');
    fill(GOLD); doc.circle(pinX, pinY, 1.8, 'F');
    font('semi', 9); ink(NAVY); put(T.mapBtn, bx + 29, by + bh / 2 + 3.2);
    doc.link(mx(bx, bw), by, bw, bh, { url: MAPS });
    font('normal', 6.8); ink(MUTED); put(MAPS.replace('https://', ''), bx + bw + 12, by + bh / 2 + 2.4);
    doc.link(mx(bx + bw + 8, 150), by, 150, bh, { url: MAPS });

    /* ---- 4. inside VELN: the unit's floor lit on the building ---- */
    doc.addPage(); ground();
    head(T.inside, T.insideSub(flNames.join(' + ')));
    image(art.night, 0, 127.5, W, BOX.night[1]);
    var sy = 463.5, SW = 225;
    T.stack.forEach(function (s, i) {
      var on = w.floors.indexOf(s[0]) !== -1, h = 25.5;
      fill(i % 2 ? ROW_B : ROW_A); rect(M, sy, SW, h, 'F');
      if (on) { fill(GOLD); rect(M, sy, 2.2, h, 'F'); }
      font(on ? 'medium' : 'normal', 8.3); ink(on ? GOLD : FG); put(s[1] + (on ? '  ·  ' + T.yours(T.word[w.word], w.many) : ''), M + 10.5, sy + 16.2);
      caps(s[0] === 'basements' ? T.basements : T.floor[s[0]], M + SW - 10.5, sy + 16, 6.2, on ? GOLD : MUTED, { weight: 'normal', align: 'right' });
      sy += h;
    });
    var fx0 = 288, fcw = (W - M - fx0 - 18) / 2;
    caps(T.insideHead, fx0, 470, 7.1, GOLD);
    var half = Math.ceil(T.facilities.length / 2);
    [T.facilities.slice(0, half), T.facilities.slice(half)].forEach(function (col, ci) {
      var fy = 488, x = fx0 + ci * (fcw + 18);
      col.forEach(function (f) {
        font('normal', 7.6); var ls = wrap(f, fcw - 10);
        fill(GOLD); doc.circle(px(x + 1.6), fy - 2.4, 1.5, 'F');
        ink(FG); ls.forEach(function (t, j) { put(t, x + 10, fy + j * 11); });
        fy += ls.length * 11 + 4.5;
      });
    });

    /* ---- 5. the unit on the plan: the whole floor, the unit gold and pinned ---- */
    doc.addPage(); ground();
    head(T.onPlan(T.word[w.word], w.many), T.onPlanSub(w.many ? codes : first.code + '  ·  ' + floorTxt, T.word[w.word], w.many));
    var y5 = 129;
    if (art.plan2) {
      /* a deal on two floors: both floors side by side, each named (Arabic: the first on the right) */
      var gw = (PW - 12) / 2, gh = gw * art.plan.h / art.plan.w;
      [art.plan, art.plan2].forEach(function (im, i) {
        var gx = M + i * (gw + 12);
        caps(T.floor[w.floors[i]], gx, y5 + 6, 6.4, GOLD);
        fill(WHITE); rect(gx - 4, y5 + 12, gw + 8, gh + 8, 'F');
        image(im, gx, y5 + 16, gw, gh);
      });
      y5 += 16 + gh + 10;
    } else {
      /* one floor across the page; a long deal shrinks it to leave the table room */
      var ph = PW * art.plan.h / art.plan.w;
      if (w.many) ph = Math.max(220, Math.min(ph, H - 70 - 140 - 62 - w.items.length * 20));
      var pw1 = ph * art.plan.w / art.plan.h, px1 = M + (PW - pw1) / 2;
      fill(WHITE); doc.roundedRect(mx(px1 - 7.5, pw1 + 15), y5, pw1 + 15, ph + 15, 3, 3, 'F');
      image(art.plan, px1, y5 + 7.5, pw1, ph);
      y5 += ph + 15;
    }
    cap(T.planSrc, M, y5 + 13);
    y5 += 26;
    if (!w.many) {
      var u = first.u, colW = (PW - 7.5) / 2;
      var perMTxt = u.perM ? T.egp(u.perM) : (RTL ? money(u.perMRange[0]) + ' – ' + T.egp(u.perMRange[1]) : T.egp(u.perMRange[0]) + ' – ' + money(u.perMRange[1]));
      /* a zone deal: its shares and their codes, the zone, the size; no outdoor, and no maintenance line (none, his answer 2026-11-15) */
      var fs = w.zone ? [[T.fShares, String(u.shares.length)], [T.fZone, T.zoneName(u.zone)], [T.fShareCodes, u.code], [T.fFloor, floorTxt],
        [T.fSize, T.m2(u.area)], [T.fPerM, perMTxt], [T.fList, T.egp(u.price)], [T.fDelivered, T.delivered(delivered)]] : [[T.fSheet, u.code], [T.fLine, T.line(l)], [T.fFloor, floorTxt], [T.fIndoor, T.m2(u.indoor)],
        [T.fOutdoor, u.outdoor ? T.m2(u.outdoor) : '—'], [T.fPriced, T.m2(u.area)], [T.fPerM, u.perM ? T.egp(u.perM) : (RTL ? money(u.perMRange[0]) + ' – ' + T.egp(u.perMRange[1]) : T.egp(u.perMRange[0]) + ' – ' + money(u.perMRange[1]))], [T.fList, T.egp(u.price)],
        [T.fDelivered, T.delivered(delivered)], [T.fMaint, T.egp(u.maintenance)]];
      fs.forEach(function (kv, i) {
        var x = M + (i % 2) * (colW + 7.5), y = y5 + Math.floor(i / 2) * 25.5;
        fill(Math.floor(i / 2) % 2 ? ROW_B : ROW_A); rect(x, y, colW, 25.5, 'F');
        caps(kv[0], x + 9, y + 15.8, 5.6, MUTED, { weight: 'normal' });
        /* a long value (many share codes) steps down in size to stay in its box; still too long:
           the short codes (Z1-01 – Z1-03), which name the same shares */
        var room = colW - 18 - (width(isAr(kv[0]) ? kv[0] : String(kv[0]).toUpperCase()) * 1.3 + 14), v = kv[1], vs = 9;
        font('medium', vs);
        while (vs > 5.5 && width(v) > room) { vs -= 0.5; font('medium', vs); }
        if (width(v) > room && w.zone && v === u.code) { v = first.code; vs = 9; font('medium', vs); while (vs > 5.5 && width(v) > room) { vs -= 0.5; font('medium', vs); } }
        ink(FG); put(v, x + colW - 9, y + 16, { align: 'right' });
      });
    } else {
      var cx = [M, M + 26, M + 92, M + 210, M + 300, W - M];
      fill(GOLD); rect(M, y5 - 12, PW, 20, 'F');
      T.cols.forEach(function (c, i) { font('semi', 7); ink(NAVY); put(c, cx[i] + (i === 5 ? -8 : 6), y5 + 1, { align: i === 5 ? 'right' : 'left' }); });
      w.items.forEach(function (x, i) {
        var y = y5 + 8 + i * 20;
        fill(i % 2 ? ROW_B : ROW_A); rect(M, y, PW, 20, 'F');
        font('semi', 9); ink(GOLD); put(String(i + 1), cx[0] + 6, y + 13.5);
        ink(FG); put(x.code, cx[1] + 6, y + 13.5);
        font('normal', 9); put(T.floor[x.f], cx[2] + 6, y + 13.5); put(T.m2(x.u.indoor), cx[3] + 6, y + 13.5); put(T.m2(x.u.area), cx[4] + 6, y + 13.5);
        put(money(x.u.price), cx[5] - 8, y + 13.5, { align: 'right' });
      });
    }

    /* ---- 6. the payment plan ---- */
    doc.addPage(); ground();
    head(T.thePlan, T.planLabel(pl));
    var mt = S.maintenance, B = T.big, inst = S.rows.filter(function (r) { return r.kind === 'instalment'; });
    var tiles = S.cash ? [[B.cash, money(S.payable), B.once], [B.off, money(S.discount), pctOf(S.discountPct) + '%'], [B.listP, money(S.list), '']]
      : [[B.down, money(S.down), B.onSign], [B.every, money(S.each), S.fixed && S.lastInstalment !== S.each ? T.nLast(S.count, S.lastInstalment) : B.n(S.count)], [B.total, money(S.payable), S.discount ? B.save(S.discount) : '']];
    var tw = (PW - 15) / 3;
    tiles.forEach(function (t, i) {
      var x = M + i * (tw + 7.5);
      fill(ROW_A); rect(x, 135, tw, 74, 'F');
      caps(t[0], x + 12, 155, 6.2, MUTED, { weight: 'normal' });
      font('light', 21); ink(GOLD); put(t[1], x + 12, 182);
      font('normal', 7.1); ink(MUTED); put(t[2], x + 12, 198);
    });
    var y6;
    if (S.cash) {
      y6 = rows([{ k: T.list, v: T.egp(S.list) }, { k: T.off, sub: T.cashOff(pctOf(S.discountPct)), v: T.minus(S.discount), gold: true },
        { k: T.cashPay, sub: T.cashSub(T.day(S.rows[0].due)), v: T.egp(S.payable), strong: true, mark: true }], M, 237, PW);
    } else {
      var rr = [{ k: T.list, v: T.egp(S.list) }, { k: T.down, sub: T.downSub(pctOf(pl.down), T.day(S.rows[0].due)), v: T.egp(S.down), mark: true },
        { k: T.rest, sub: T.restSub, v: T.egp(S.list - S.down) }];
      if (S.discount) rr.push({ k: T.off, sub: T.offSub(pctOf(S.discountPct)), v: T.minus(S.discount), gold: true });
      rr.push({ k: T.inst, sub: T.instSub(S.count, T.day(inst[0].due), T.day(inst[inst.length - 1].due)), v: S.fixed && S.lastInstalment !== S.each ? T.eachLast(S.each, S.lastInstalment) : T.each(S.each) });
      rr.push({ k: T.total, sub: S.discount ? T.save(S.discount) : null, v: T.egp(S.payable), strong: true });
      y6 = rows(rr, M, 237, PW);
    }
    var also = [];
    if (mt) also.push({ k: T.maint, sub: T.maintSub(pctOf(mt.pct), T.day(mt.due)), v: T.egp(mt.amount) });
    if (mt && mt.delivery) also.push({ k: T.delivery, sub: T.deliverySub, v: T.longDay(mt.delivery) });
    if (also.length) { caps(T.also, M, y6 + 34, 7.1, GOLD); rows(also, M, y6 + 44, PW); }

    /* ---- 7. the payment sheet: every payment, the app's own table (js/project.js sheet()) ---- */
    doc.addPage(); ground();
    var sheetSub = T.sheetSub(w.many ? codes : first.code, T.planLabel(pl));
    head(T.sheet, sheetSub);
    /* the column edges: three read from the start, three are right-aligned figures */
    var X = [M + 7.5, M + 56, M + 148], XR = [M + 342, M + 420, W - M - 7.5];
    function header7(y) {
      fill(GOLD); rect(M, y, PW, 19.5, 'F');
      T.cols6.forEach(function (c, i) {
        caps(c, i < 3 ? X[i] : XR[i - 3], y + 12.6, 5.8, NAVY, { weight: 'semi', align: i < 3 ? 'left' : 'right' });
      });
      return y + 19.5;
    }
    var yearly = {};
    S.rows.forEach(function (r) { if (r.kind === 'instalment') { var yy = Math.ceil(r.months / 12); yearly[yy] = (yearly[yy] || 0) + r.amount; } });
    var y7 = header7(129), seen = {}, RH = 17.6, n7 = 0, LAST = H - 104;
    S.rows.forEach(function (r) {
      if (y7 + RH > LAST) { doc.addPage(); ground(); head(T.sheet, sheetSub + '  ·  ' + T.contd); y7 = header7(129); n7 = 0; }
      var cells, dpRow = r.kind === 'down', firstOf = false;
      if (dpRow) {
        if (!r.amount) return;
        cells = [S.cash ? '' : T.dp, S.cash ? T.cashRow : T.dpRow, T.day(r.due), money(r.amount), pct2(r.amount / S.payable), pct2(r.amount / S.payable)];
      } else {
        var yy = Math.ceil(r.months / 12); firstOf = !seen[yy]; seen[yy] = true;
        cells = [firstOf ? T.yearN(yy) : '', T.instN(r.no), T.day(r.due), money(r.amount), pct2(r.amount / S.payable), firstOf ? pct2(yearly[yy] / S.payable) : ''];
      }
      fill(n7 % 2 ? ROW_B : ROW_A); rect(M, y7, PW, RH, 'F');
      if (dpRow) { fill(GOLD); rect(M, y7, 2.2, RH, 'F'); }
      cells.forEach(function (c, i) {
        font(dpRow || (i === 0 && firstOf) ? 'medium' : 'normal', 7.5); ink(dpRow || (i === 0 && firstOf) ? GOLD : FG);
        put(c, i < 3 ? X[i] : XR[i - 3], y7 + 11.6, { align: i < 3 ? 'left' : 'right' });
      });
      y7 += RH; n7++;
    });
    fill(ROW_T); rect(M, y7, PW, 25.5, 'F');
    font('semi', 8.3); ink(FG); put(T.total, X[0], y7 + 16); put(money(S.payable), XR[0], y7 + 16, { align: 'right' }); put('100%', XR[1], y7 + 16, { align: 'right' });
    y7 += 25.5;
    if (mt) {
      fill(ROW_A); rect(M, y7, PW, 25.5, 'F');
      font('normal', 7.1); ink(MUTED); put(T.sheetMaint(T.day(mt.due)), X[0], y7 + 16); put(money(mt.amount), XR[0], y7 + 16, { align: 'right' });
    }

    /* ---- the footers, now the page count is known ---- */
    var pages = doc.getNumberOfPages();
    for (var i = 2; i <= pages; i++) {
      doc.setPage(i);
      font('normal', 6.4); ink(MUTED);
      put(T.footer(w.many ? T.oneDeal : T.word[w.word], title), M, H - 32);
      put(T.page(i, pages), W - M, H - 32, { align: 'right' });
      font('normal', 5.6); put(asOf, M, H - 21);
    }
    undo();
    return doc;
  }

  /* ================================================================ the post */
  var TEXT = {
    en: {
      headline: function (S, pl) {
        if (S.cash) return '🔥 ' + pctOf(S.discountPct) + '% off · cash 🔥';
        return '🔥 ' + (S.discount ? pctOf(S.discountPct) + '% off · ' : '') + pctOf(pl.down) + '% down · ' + EN.term(S.months) + ' to pay 🔥';
      },
      project: '✨ VELN · New Cairo ✨',
      size: function (x) { return x.zone ? '🔷 ' + x.u.zone.name + ' · ' + EN.shares(x.u.shares.length) + ' · ' + Math.round(x.u.area) + ' m²' : '🔷 ' + EN.word[x.word] + ' · ' + Math.round(x.u.indoor) + ' m²'; },
      where: function (x, l, fs) { return '🔷 ' + (fs || [x.f]).map(function (f) { return EN.floor[f]; }).join(' + ') + ' · ' + l.name; },
      price: function (v) { return '👈 Price EGP ' + v; },
      cash: function (v) { return '👈 *One payment, in cash: EGP ' + v + '* 🔥'; },
      down: function (v) { return '👈 *Down payment EGP ' + v + '* 🔥'; },
      quarter: function (v) { return '👈 *Every 3 months EGP ' + v + '* 🔥'; },
      monthly: function (v) { return '👈 That is about EGP ' + v + ' a month'; },
      last: function (v) { return '👈 The last instalment EGP ' + v; },
      save: function (v, p) { return '👈 You save EGP ' + v + ' (' + p + '% off the rest)'; },
      saveCash: function (v) { return '👈 You save EGP ' + v; },
      total: function (v) { return '👈 Total EGP ' + v; },
      delivery: '🗓️ Delivery in 3.5 years',
      many: function (n) { return '🔥 ' + n + ' units · one deal 🔥'; },
      unit: function (i, x) { return KEYCAP[i] + ' 📍*' + x.code + '* · ' + EN.word[x.word] + ' ' + Math.round(x.u.indoor) + ' m² · ' + EN.floor[x.f] + ' · EGP ' + money(x.u.price); },
      together: '💰 Together:',
      contact: function (name, phone) { return '📞 ' + [name, phone].filter(Boolean).join(' · '); }
    },
    ar: {
      headline: function (S, pl) {
        if (S.cash) return '🔥خصم ' + isoPct(S.discountPct) + ' كاش🔥';
        return '🔥' + (S.discount ? 'خصم ' + isoPct(S.discountPct) + ' و' : '') + 'تقسيط على ' + AR.term(S.months) + ' بمقدم ' + isoPct(pl.down) + '🔥';
      },
      project: '✨ VELN · القاهرة الجديدة ✨',
      size: function (x) { return x.zone ? '🔷 ' + String(x.u.zone.name).replace(/^Zone/, 'زون') + ' · ' + AR.shares(x.u.shares.length) + ' · ' + Math.round(x.u.area) + ' متر' : '🔷 ' + AR.word[x.word] + ' ' + Math.round(x.u.indoor) + ' متر'; },
      where: function (x, l, fs) { return '🔷 ' + (fs || [x.f]).map(function (f) { return AR.floor[f]; }).join(' + ') + ' · النشاط ' + AR.line(l); },
      price: function (v) { return '👈السعر ' + v; },
      cash: function (v) { return '👈*الدفع كاش مرة واحدة ' + v + '*🔥'; },
      down: function (v) { return '👈*مقدم ' + v + '*🔥'; },
      quarter: function (v) { return '👈*قسط كل 3 شهور ' + v + '*🔥'; },
      monthly: function (v) { return '👈يعني حوالي ' + v + ' في الشهر'; },
      last: function (v) { return '👈القسط الأخير ' + v; },
      save: function (v, p) { return '👈توفير ' + v + ' (خصم ' + LRI + p + '%' + PDI + ' على الباقي)'; },
      saveCash: function (v) { return '👈توفير ' + v; },
      total: function (v) { return '👈الإجمالي ' + v; },
      delivery: '🗓️ الاستلام بعد 3.5 سنة',
      many: function (n) { return '🔥 ' + n + ' وحدات · صفقة واحدة 🔥'; },
      unit: function (i, x) { return KEYCAP[i] + ' 📍*' + x.code + '* · ' + AR.word[x.word] + ' ' + Math.round(x.u.indoor) + ' متر · ' + AR.floor[x.f] + ' · ' + money(x.u.price); },
      together: '💰 الإجمالي للصفقة:',
      contact: function (name, phone) { return '📞 للتواصل: ' + [name, phone].filter(Boolean).join(' · '); }
    }
  };
  var KEYCAP = ['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(function (d) { return d + String.fromCharCode(0xFE0F, 0x20E3); });

  function caption(o) {
    var w = work(o), S = w.S, T = TEXT[o.lang === 'ar' ? 'ar' : 'en'], lines = [];
    lines.push(T.headline(S, w.pl));
    lines.push(T.project);
    var x = w.one;                     /* several units are one unit (2026-11-14) */
    lines.push('📍' + x.code, T.size(x), T.where(x, w.l, w.floors));
    lines.push(T.price(money(S.list)));
    lines.push('');
    if (S.cash) { lines.push(T.cash(money(S.payable))); lines.push(T.saveCash(money(S.discount))); }
    else {
      lines.push(T.down(money(S.down)));
      lines.push(T.quarter(money(S.each)));
      lines.push(T.monthly(money(Math.ceil(Math.max(S.each, S.lastInstalment || 0) / (S.everyMonths || 3)))));
      if (S.fixed && S.lastInstalment !== S.each) lines.push(T.last(money(S.lastInstalment)));
      if (S.discount) lines.push(T.save(money(S.discount), pctOf(S.discountPct)));
      lines.push(T.total(money(S.payable)));
    }
    if (!w.zone) lines.push('', T.delivery);
    if (o.agent && (o.agent.name || o.agent.phone)) lines.push('', T.contact((o.agent.name || '').trim(), (o.agent.phone || '').trim()));
    return lines.join('\n');
  }
  /* the short text with the PDF: what a broker reads before opening it */
  function message(o) {
    var w = work(o), S = w.S, ar = o.lang === 'ar', T = ar ? AR : EN, lines = [];
    var x = w.one;
    lines.push('*VELN · ' + T.word[x.word] + ' ' + x.code + '*');
    lines.push(w.floors.map(function (f) { return T.floor[f]; }).join(' + ') + ' · ' + T.m2(x.u.indoor) + (w.zone ? ' · ' + T.shares(x.u.shares.length) : ''));
    lines.push((ar ? 'السعر: ' : 'Price: ') + T.egp(S.list));
    lines.push((ar ? 'نظام السداد: ' : 'Plan: ') + T.planLabel(w.pl));
    if (S.cash) lines.push((ar ? 'كاش: ' : 'Cash: ') + T.egp(S.payable));
    else lines.push((ar ? 'مقدم ' : 'Down payment ') + T.egp(S.down) + ' · ' + (ar ? 'قسط كل 3 شهور ' : 'every 3 months ') + T.egp(S.each) + (S.fixed && S.lastInstalment !== S.each ? ' × ' + (S.count - 1) + (ar ? '، والأخير ' : ', the last ') + T.egp(S.lastInstalment) : ' × ' + S.count));
    if (o.agent && o.agent.name) lines.push('', o.agent.name + (o.agent.phone ? ' · ' + o.agent.phone : ''));
    return lines.join('\n');
  }

  /* the Arabic face for the canvas, from the same file the PDF embeds */
  var arFace = null;
  function arabicFace() {
    if (!arFace) {
      arFace = (root.FontFace && document.fonts) ? new FontFace('NajmArabic', 'url(vendor/fonts/IBMPlexSansArabic-Medium.ttf?v=' + V + ')').load()
        .then(function (f) { document.fonts.add(f); }, function () { /* the system's Arabic face draws it */ }) : Promise.resolve();
    }
    return arFace;
  }
  /* ONE tall picture: VELN at night with the floor lit; under it, on VELN's beige, the
     whole floor with the unit lit and pinned, and what it is. No price: a picture is
     forwarded for weeks. */
  function picture(o) {
    var w = work(o), ar = o.lang === 'ar', T = ar ? AR : EN, W = 1200, PAD = 56, two = !!w.floors[1];
    var F = 'Poppins, NajmArabic, "Segoe UI", Arial, sans-serif';
    var ready = document.fonts && document.fonts.load ? Promise.all(['600 100px Poppins', '500 30px Poppins', '400 26px Poppins'].map(function (f) { return document.fonts.load(f, 'A'); })).catch(function () {}) : Promise.resolve();
    /* the plan across the picture (one floor) or two side by side, at their drawn size */
    var PW = two ? (W - 2 * PAD - 24) / 2 : W - 2 * PAD, pinH = two ? 30 : (w.many ? 40 : 36);
    return Promise.all([litNight(w.p.stage, w.floors, 1), floorPlan(w.items, w.floors[0], PW, pinH), two ? floorPlan(w.items, w.floors[1], PW, pinH) : null,
      logo('img/veln-logo.svg', INK), ar ? arabicFace() : null, ready]).then(function (g) {
      var night = g[0], plans = [g[1], g[2]].filter(Boolean), vl = g[3];
      var NH = Math.round(W * night.height / night.width), PH = plans[0].height, label = two ? 44 : 0;
      var shown = w.many ? Math.min(w.items.length, 8) : 0, listH = w.many ? 150 + Math.ceil(shown / 2) * 48 + (w.items.length > shown ? 48 : 0) : 230;
      var BH = 56 + label + PH + 64 + listH + 84, H = NH + BH;
      var c = canvas(W, H), ctx = c.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(night, 0, 0, W, NH);
      ctx.fillStyle = GROUND; ctx.fillRect(0, NH, W, BH);
      ctx.fillStyle = GOLD; ctx.fillRect(0, NH, W, 6);
      var dy = NH + 56;
      ctx.textBaseline = 'alphabetic';
      if ('direction' in ctx) ctx.direction = ar ? 'rtl' : 'ltr';
      plans.forEach(function (pl, i) {
        /* reading order: the first floor on the right in Arabic; the pictures themselves never flip */
        var px = ar ? W - PAD - PW - i * (PW + 24) : PAD + i * (PW + 24);
        if (two) {
          ctx.fillStyle = TAUPE; ctx.font = (ar ? '500 28px ' : '600 22px ') + F; ctx.textAlign = ar ? 'right' : 'left';
          if ('letterSpacing' in ctx && !ar) ctx.letterSpacing = '4px';
          ctx.fillText(ar ? T.floor[w.floors[i]] : T.floor[w.floors[i]].toUpperCase(), ar ? px + PW : px, dy + 26);
          if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
        }
        ctx.fillStyle = WHITE; ctx.fillRect(px - 6, dy + label - 6, PW + 12, PH + 12);
        ctx.drawImage(pl, px, dy + label, PW, PH);
      });
      var y = dy + label + PH + 64;
      var tx = ar ? W - PAD : PAD, ex = ar ? PAD : W - PAD;     /* the text's start and far edges */
      var lh = 60, lw = vl.naturalWidth * lh / vl.naturalHeight;
      ctx.drawImage(vl, ar ? ex : ex - lw, y, lw, lh);
      ctx.textAlign = ar ? 'right' : 'left';
      ctx.fillStyle = TAUPE; ctx.font = (ar ? '500 30px ' : '600 24px ') + F;
      if ('letterSpacing' in ctx && !ar) ctx.letterSpacing = '5px';
      ctx.fillText(w.many ? (ar ? 'صفقة واحدة' : 'ONE DEAL') : (T.word[w.word] + ' · ' + T.line(w.l)).toUpperCase(), tx, y + 24);
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
      ctx.fillStyle = INK;
      if (!w.many) {
        var x = w.one;
        /* a joined code ("G-22 + G-8") shrinks until it clears the VELN logo */
        var cpx = x.code.length > 4 ? 104 : 120;
        ctx.font = '600 ' + cpx + 'px ' + F;
        while (ctx.measureText(x.code).width > W - 2 * PAD - lw - 30 && cpx > 48) { cpx -= 6; ctx.font = '600 ' + cpx + 'px ' + F; }
        ctx.fillText(x.code, tx, y + 144);
        ctx.font = '500 44px ' + F; ctx.fillText((ar ? Math.round(x.u.indoor) + ' متر' : Math.round(x.u.indoor) + ' m²') + (w.zone ? ' · ' + T.shares(x.u.shares.length) : ''), tx, y + 206);
        ctx.fillStyle = TAUPE; ctx.font = '400 30px ' + F; ctx.textAlign = ar ? 'left' : 'right';
        ctx.fillText(w.floors.map(function (f) { return T.floor[f]; }).join(' + ') + ' · VELN', ex, y + 206);
        ctx.textAlign = ar ? 'right' : 'left';
      } else {
        ctx.font = '600 72px ' + F; ctx.fillText(T.units(w.items.length), tx, y + 104);
        /* the units in two columns, numbered as their pins are */
        ctx.font = '500 30px ' + F;
        var colW = (W - 2 * PAD) / 2;
        w.items.slice(0, shown).forEach(function (x, i) {
          var cx = ar ? tx - (i % 2) * colW : tx + (i % 2) * colW;
          /* in Arabic the code and the figure are isolated, or the line reads "1 31 · G-22 متر" */
          ctx.fillText(ar ? (i + 1) + '  ' + LRI + x.code + PDI + ' · ' + LRI + Math.round(x.u.indoor) + PDI + ' متر'
            : (i + 1) + '  ' + x.code + ' · ' + Math.round(x.u.indoor) + ' m²', cx, y + 166 + Math.floor(i / 2) * 48);
        });
        if (w.items.length > shown) {
          ctx.fillStyle = TAUPE;
          ctx.fillText((ar ? '+ ' + (w.items.length - shown) + ' وحدات أخرى' : '+ ' + (w.items.length - shown) + ' more'), tx, y + 166 + Math.ceil(shown / 2) * 48);
        }
      }
      ctx.fillStyle = TAUPE; ctx.font = '400 22px ' + F; ctx.textAlign = ar ? 'right' : 'left';
      ctx.fillText(ar ? 'نجم للتطوير العقاري' : 'Najm Developments', tx, H - 48);
      return new Promise(function (ok, no) { c.toBlob(function (b) { b ? ok(b) : no(new Error('Could not make the picture.')); }, 'image/jpeg', 0.9); });
    });
  }

  N.offer = { shareCodes: shareCodes, work: work, pdf: pdf, caption: caption, message: message, picture: picture, plansFor: plansFor };
}(typeof window !== 'undefined' ? window : globalThis));
