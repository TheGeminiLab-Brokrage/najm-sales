/* ------------------------------------------------------------------
   Najm: the payment schedule. Main Marks' js/plans.js, carried over
   unchanged in its rules (it was proven there to the pound).

   Najm (build 8, confirmed by Najm 2026-11-03): terms.discountOn 'balance'.
   The down payment is a share of the ORIGINAL price; the plan's discount is
   taken off what is LEFT after it; that discounted rest is the instalments.

   ONE function builds the schedule; the screen, and later the PDF and
   the post, all call it. It derives every figure, never transcribes a
   rounded percentage, and refuses to return a schedule that does not
   foot. The plans themselves are in js/config.js.
   ------------------------------------------------------------------ */

(function (root) {
  'use strict';

  var NJ = root.NJ || (root.NJ = {});

  /* Every figure a customer sees is a whole pound. Round once, here. */
  function egp(v) { return Math.round(v); }

  function addMonths(date, n) {
    var d = new Date(date.getTime());
    var day = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + n);
    /* 31 Jan + 1 month is 28 Feb, not 3 March. */
    d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
    return d;
  }

  /* the maintenance deposit, on every plan, cash too: its share, its date */
  function maintOf(terms, list, payable, start) {
    var mm = terms.maintenance;
    if (!mm || !mm.pct) return null;
    var month = (mm.months !== undefined && mm.months !== null)
      ? mm.months
      : (terms.deliveryMonths || 0) - (mm.dueMonthsBeforeDelivery || 0);
    return {
      pct: mm.pct,
      amount: egp((mm.on === 'discounted' ? payable : list) * mm.pct),
      months: month,
      due: addMonths(start, month),
      delivery: terms.deliveryMonths ? addMonths(start, terms.deliveryMonths) : null,
      label: mm.label || 'Maintenance'
    };
  }

  /* o: { listPrice, discount, plan, terms, from } */
  function schedule(o) {
    var list = egp(o.listPrice);
    var plan = o.plan;
    var terms = o.terms || {};
    if (!(list > 0)) return null;                         /* fail closed */
    var start = o.from ? new Date(o.from.getTime()) : new Date();

    /* SPOT CASH ("Go cash. Take 40% off"): the whole discounted
       price on contract, no instalments. The discount is the plan's. */
    if (plan && plan.cash) {
      var cd = egp(list * (o.discount || 0)), cp = list - cd, cm = maintOf(terms, list, cp, start);
      return {
        list: list, discountPct: o.discount || 0, discount: cd, payable: cp, downOn: 'discounted',
        down: cp, milestones: [], balance: 0, count: 0, each: 0, lastInstalment: 0,
        everyMonths: 0, years: 0, cash: true,
        rows: [{ no: 0, kind: 'down', label: 'Cash payment', months: 0, due: new Date(start.getTime()), amount: cp }],
        maintenance: cm, extras: [], start: start, deliveryMonths: terms.deliveryMonths || null,
        cashTotal: cp + (cm ? cm.amount : 0)
      };
    }
    /* A FIXED INSTALMENT (Najm's zone shares, 2026-11-15): each instalment is a stated
       share of the price (3% = 30,000 on a 1,000,000 share), paid until the rest is
       cleared; the last one carries what is left (15% down at 4.5% a quarter: 18 x 45,000
       and a last 40,000). The count is DERIVED from the amounts, then checked against
       the term the config states, so a plan that does not end where Najm said is never
       shown. Worked in whole pounds, so 750,000 / 30,000 is exactly 25, never 25.0000001. */
    var fixed = plan && plan.each > 0;
    if (!plan || !(plan.down >= 0) || !(fixed ? plan.months > 0 : plan.years > 0)) return null;
    var every = plan.every || terms.instalmentEvery || 3;  /* months */

    var discountPct = o.discount || 0;
    var onBalance = (plan.discountOn || terms.discountOn) === 'balance';
    var discount, payable, down;
    if (onBalance) {
      /* Najm: the down payment on the original price, the discount on the rest */
      down = egp(list * plan.down);
      discount = egp((list - down) * discountPct);
      payable = list - discount;
    } else {
      discount = egp(list * discountPct);
      payable = list - discount;
      /* Rule 2. Which price the down payment is a share of is the client's
         decision, not ours, so it is stated in config and read here. */
      var downBase = (plan.downOn || terms.downOn) === 'list' ? list : payable;
      down = egp(downBase * plan.down);
    }

    /* Rule 3. Milestones are percentages of the payable price at stated
       months. They come out of what the instalments carry. */
    var milestones = (plan.milestones || []).map(function (m) {
      return { pct: m.pct, months: m.months, amount: egp(payable * m.pct), label: m.label || 'Milestone' };
    });
    var milestoneTotal = milestones.reduce(function (s, m) { return s + m.amount; }, 0);

    var balance = payable - down - milestoneTotal;
    if (balance < 0) return null;

    var termMonths = fixed ? plan.months : plan.years * 12;
    var count, each;
    if (fixed) {
      each = egp(list * plan.each);
      if (!(each > 0)) return null;
      count = Math.ceil(balance / each);
    } else {
      count = Math.round(termMonths / every);
      /* Guard the count itself: a schedule quietly one instalment short is
         worth real money and looks completely normal on the page. */
      if (count !== termMonths / every) return null;
      each = egp(balance / count);
    }

    var rows = [{ no: 0, kind: 'down', label: 'Down payment', months: 0, due: new Date(start.getTime()), amount: down }];
    var running = 0, i, amt;
    for (i = 1; i <= count; i++) {
      /* The LAST instalment carries the rounding drift, so the rows sum
         to the balance exactly rather than approximately. */
      amt = (i === count) ? (balance - each * (count - 1)) : each;
      running += amt;
      rows.push({
        no: i, kind: 'instalment',
        label: 'Instalment ' + i + ' of ' + count,
        months: i * every, due: addMonths(start, i * every), amount: amt
      });
    }
    milestones.forEach(function (m) {
      rows.push({ no: null, kind: 'milestone', label: m.label, months: m.months, due: addMonths(start, m.months), amount: m.amount });
    });

    /* a plan that says maintenance: false has none (the zone shares, his answer 2026-11-15) */
    var maintenance = plan.maintenance === false ? null : maintOf(terms, list, payable, start);

    /* An extra with no month is carried but NOT counted, and it says so.
       Inventing when a club fee is owed is inventing a number. */
    var extras = (terms.extras || []).map(function (x) {
      return { key: x.key, label: x.label, amount: egp(x.amount), months: x.months, dated: x.months !== undefined && x.months !== null };
    });

    rows.sort(function (a, b) { return a.months - b.months; });

    var out = {
      list: list,
      discountPct: discountPct,
      discount: discount,
      payable: payable,
      downOn: onBalance || (plan.downOn || terms.downOn) === 'list' ? 'list' : 'discounted',
      discountOn: onBalance ? 'balance' : 'list',
      down: down,
      milestones: milestones,
      balance: balance,
      count: count,
      each: each,
      lastInstalment: each ? (balance - each * (count - 1)) : 0,
      everyMonths: every,
      years: termMonths / 12,
      months: termMonths,
      fixed: fixed,
      rows: rows,
      maintenance: maintenance,
      extras: extras,
      start: start,
      deliveryMonths: terms.deliveryMonths || null
    };

    /* What the customer actually hands over, all in — and only the parts
       whose timing we know. */
    out.cashTotal = payable +
      (maintenance ? maintenance.amount : 0) +
      extras.filter(function (x) { return x.dated; }).reduce(function (s, x) { return s + x.amount; }, 0);

    /* ---- self-checks. A schedule that does not foot must not render.
       Returning nothing is visible; returning a wrong number is not. --- */
    var problems = [];
    if (running !== balance) problems.push('instalments sum to ' + running + ', balance is ' + balance);
    if (down + balance + milestoneTotal !== payable) problems.push('down + milestones + instalments do not equal the discounted price');
    if (list - discount !== payable) problems.push('list - discount does not equal the discounted price');
    if (onBalance && discount !== egp((list - down) * discountPct)) problems.push('the discount is not on the amount left after the down payment');
    var instalments = rows.filter(function (r) { return r.kind === 'instalment'; });
    if (instalments.length !== count) problems.push('expected ' + count + ' instalments, built ' + instalments.length);
    if (instalments.length && instalments[instalments.length - 1].months !== termMonths) {
      problems.push('the last instalment does not land on the end of the term');
    }
    /* a fixed instalment: the last is never larger than the others, and never nothing */
    if (fixed && instalments.length && !(out.lastInstalment > 0 && out.lastInstalment <= each)) {
      problems.push('the last instalment is ' + out.lastInstalment + ', the others ' + each);
    }
    if (problems.length) { out.broken = problems; return out; }

    return out;
  }

  /* The monthly-equivalent figure a broker asks for. Quarterly
     instalments divided by the months between them — and the caller must
     say which it is showing, because they are not the same sentence. */
  function perMonth(s) { return s ? Math.round(s.each / s.everyMonths) : 0; }

  /* The plans a unit may be offered on TODAY. One rule, read by the unit
     details and by "Find a unit", so the search never tests a plan the
     offer would not show: an offer past its `until` date is gone, and a
     plan is never offered on a type it names in `notFor`. */
  function applicable(plans, type, today) {
    var d = today ? new Date(today.getTime()) : new Date();
    d.setHours(0, 0, 0, 0);
    return (plans || []).filter(function (pl) {
      if (pl.until && d > new Date(pl.until + 'T23:59:59')) return false;
      if (pl.notFor && pl.notFor.indexOf(type) !== -1) return false;
      return true;
    });
  }

  var api = { schedule: schedule, addMonths: addMonths, egp: egp, perMonth: perMonth, applicable: applicable };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { NJ.plans = api; }
}(typeof window !== 'undefined' ? window : globalThis));
