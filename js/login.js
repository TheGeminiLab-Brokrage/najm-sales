/* ------------------------------------------------------------------
   Najm: the sign-in page. Same four jobs as Main Marks' login.js: take
   a work email and a password, say ONE clear thing when they do not
   match, answer "forgot password?" honestly, go where the person was
   heading. Anyone already signed in never sees it.
   ------------------------------------------------------------------ */

(function () {
  'use strict';
  var N = window.NJ, el = N.el;
  document.documentElement.classList.remove('x-arrive');

  function nextPage() {
    var raw = new URLSearchParams(location.search).get('next') || '';
    if (/^[a-z0-9\-]+\.html(\?[^#]*)?$/i.test(raw)) return raw;
    return 'index.html';
  }
  /* signed in already: straight on, unless the first password is still to be changed (build 19) */
  var was = N.auth.current();
  if (was && !was.mustChange) { location.replace(nextPage()); return; }

  /* The entrance. One class, set at once; every animation holds its own
     start state (fill-mode both), moves only opacity and transform, and
     never disables an input. If this script fails, all is simply shown. */
  document.body.classList.add('seq');

  /* the logo inline, so its star can glint; and the star after "Najm" */
  document.getElementById('logo').appendChild(N.inlineSvg('img/najm-logo.svg', 'najm-logo'));
  document.getElementById('ghstar').appendChild(N.starSvg());

  /* a few stars in the sky under the picture, placed once, never in the way */
  var sky = document.querySelector('.sky');
  for (var i = 0; i < 34; i++) {
    var s = el('i');
    s.style.left = (Math.random() * 100).toFixed(1) + '%';
    s.style.top = (Math.random() * 100).toFixed(1) + '%';
    s.style.setProperty('--d', (Math.random() * 4).toFixed(2) + 's');
    s.style.setProperty('--z', (0.5 + Math.random() * 1.3).toFixed(2));
    sky.appendChild(s);
  }

  /* no build number on the sign-in page: it is a production app (Muhanad, 2026-11-15) */

  var form = document.getElementById('signin');
  var who = document.getElementById('who');
  var code = document.getElementById('code');
  var why = document.getElementById('why');
  var go = document.getElementById('go');

  document.getElementById('forgot').addEventListener('click', function () {
    var n = document.getElementById('forgotnote');
    n.textContent = N.auth.real ? N.t('The admin resets it. Nothing is emailed from this app.') : N.t('Your sales manager resets it. Nothing is emailed from this app.');
    n.hidden = false;
  });

  /* the demo accounts, only while the team list is the stand-in one */
  var note = document.getElementById('demonote');
  if (CONFIG.usersDemo) {
    note.hidden = false;
    var list = el('div', 'demo-accounts');
    function acct(u, into) {
      var row = el('button', 'demo-acct');
      row.type = 'button';
      row.appendChild(el('span', 'da-n', u.team ? u.name : u.email));
      row.appendChild(el('span', 'da-r', N.t(u.team ? u.title : CONFIG.roles[u.role].label)));
      row.addEventListener('click', function () {
        who.value = u.email; code.value = u.code; why.hidden = true; go.focus();
      });
      into.appendChild(row);
    }
    CONFIG.users.filter(function (u) { return !u.team; }).forEach(function (u) { acct(u, list); });
    var team = CONFIG.users.filter(function (u) { return u.team; });
    if (team.length) {
      var fold = el('details', 'demo-team');
      fold.appendChild(el('summary', null, N.t('Najm’s sales team · {n}', { n: team.length })));
      team.forEach(function (u) { acct(u, fold); });
      list.appendChild(fold);
    }
    note.appendChild(list);
  }

  function fail(msg) {
    why.textContent = msg;
    why.hidden = false;
    why.setAttribute('role', 'alert');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    why.hidden = true;
    if (changing) { saveNew(); return; }
    /* a refusal is instant: animating a wrong password makes it feel like a slow line. The real
       sign-in (js/store.js) answers later: the button waits, and cannot be pressed twice. */
    var r = N.auth.signIn(who.value, code.value);
    if (r && typeof r.then === 'function') {
      go.disabled = true;
      r.then(function (x) {
        go.disabled = false;
        if (!x.ok) { fail(x.why); code.select(); return; }
        if (x.mustChange) { askNew(); return; }
        accepted();
      });
      return;
    }
    if (!r.ok) { fail(r.why); code.select(); return; }
    accepted();
  });

  /* THE FIRST PASSWORD IS CHANGED BEFORE ANYTHING ELSE (Main Marks, build 127): the same form,
     its two boxes now "New password" and "Type it again" */
  var changing = false;
  function askNew() {
    changing = true;
    var spans = form.querySelectorAll('.field > span');
    spans[0].textContent = N.t('New password'); spans[1].textContent = N.t('Type it again');
    who.type = 'password'; who.value = ''; who.setAttribute('autocomplete', 'new-password'); who.removeAttribute('inputmode');
    code.value = ''; code.setAttribute('autocomplete', 'new-password');
    go.querySelector('.lbl').textContent = N.t('Save and continue');
    document.getElementById('forgot').hidden = true;
    why.textContent = N.t('This first password was given to you. Choose your own before you start.');
    why.hidden = false; why.removeAttribute('role');
    who.focus();
  }
  function saveNew() {
    var s = N.auth.current(), p = N.auth.passwordProblem(who.value, s && s.email);
    why.setAttribute('role', 'alert');
    if (p) { fail(p); who.select(); return; }
    if (who.value !== code.value) { fail(N.t('The two do not match.')); code.select(); return; }
    go.disabled = true;
    N.auth.changePassword(who.value).then(function (x) {
      go.disabled = false;
      if (!x.ok) { fail(x.why); return; }
      changing = false; why.hidden = true;
      accepted();
    });
  }
  if (was && was.mustChange) askNew();

  /* Accepted. About 2 seconds, in four beats:
       0.0-0.7  VERIFYING: the label goes, the ring turns, one teal sweep
       0.7-0.9  CONFIRMED: the tick draws
       0.9-2.2  the star opens out of the button over the whole screen,
                "Access granted / Select a project", and the next page
                is handed over while the screen is still
     Every step is a timer, so a throttled animation cannot strand anyone. */
  function accepted() {
    var next = nextPage();
    if (N.reduced) { N.cross(next, go); return; }
    go.classList.add('is-loading');
    go.disabled = true;
    setTimeout(function () {
      go.classList.remove('is-loading');
      go.classList.add('is-done');
      setTimeout(function () {
        form.classList.add('is-dimmed');
        N.cross(next, go);
      }, 180);
    }, 700);
  }

  who.focus({ preventScroll: true });
  N.warm(['index.html', 'js/projects.js?v=' + CONFIG.stamp].concat(CONFIG.projects.map(function (p) { return p.card; })));
}());
