/* Shared motion layer for Melisa Ergani's portfolio.
   Runs in <head> before the page renders: decides intro / incoming transition / ink speed, then wires the
   interactions once the page content exists. Everything is skipped with reduced motion, inside embeds
   (the design canvas) and in very tall preview frames. */
(function () {
  'use strict';
  var W = window, D = document, H = D.documentElement;
  var RM = W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // a page shown inside this site's own music shell (see shell below) behaves like a normal page
  var SHELLED = (function () { try { return W.self !== W.top && !!W.parent.__meShell && W.parent.location.origin === location.origin; } catch (e) { return false; } })();
  var EMB = !SHELLED && (function () { try { return W.self !== W.top; } catch (e) { return true; } })();
  var LIVE = !EMB && W.innerHeight < 1500;
  var FINE = W.matchMedia && W.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var PAGE = W.__mePage || '';
  var BG = '#121316', FG = '#f4f3ef';
  function st(store, k, v) { try { var s = W[store]; if (v === undefined) return s.getItem(k); if (v === null) s.removeItem(k); else s.setItem(k, v); } catch (e) { } return null; }
  function now() { return W.performance ? performance.now() : Date.now(); }
  function cl(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  /* ---------- who is this visitor (ink runs at full length on a first visit, shorter when returning) ---------- */
  var ret;
  if (!st('sessionStorage', 'me-sess')) {
    ret = !!st('localStorage', 'me-first');
    st('sessionStorage', 'me-sess', '1'); st('sessionStorage', 'me-ret', ret ? '1' : '0');
    if (!ret) st('localStorage', 'me-first', String(Date.now()));
  } else ret = st('sessionStorage', 'me-ret') === '1';
  W.__inkK = ret ? 0.5 : 1;

  /* ---------- incoming page transition / first-visit intro: cover the first paint ---------- */
  var incoming = null;
  try { incoming = JSON.parse(st('sessionStorage', 'me-pt') || 'null'); } catch (e) { }
  st('sessionStorage', 'me-pt', null);
  if (incoming && (Date.now() - incoming.ts > 6000)) incoming = null;
  if (SHELLED) incoming = null;
  var doIntro = LIVE && !RM && PAGE === 'home' && !incoming && !SHELLED;
  var doIn = LIVE && !RM && !doIntro && !!incoming;
  var waiters = [];
  W.__introWait = function (cb) { if (doIntro) waiters.push(cb); else cb(); };
  if (doIntro) { H.classList.add('intro'); H.style.setProperty('--pt-c', BG); }
  else if (doIn) { H.classList.add('pt-in'); H.style.setProperty('--pt-c', incoming.c); }

  /* ---------- grid strips: the margin column + the 6 / 4 / 2 content columns ---------- */
  function strips() {
    var vw = H.clientWidth || W.innerWidth, pad = Math.max(16, Math.min(56, vw * 0.04)), inner = vw - 2 * pad;
    var rule = pad + inner * 0.16, n = vw >= 1100 ? 6 : vw >= 640 ? 4 : 2, cw = inner * 0.84 / n, xs = [0, rule];
    for (var i = 1; i < n; i++) xs.push(rule + i * cw);
    xs.push(vw);
    return { xs: xs, pad: pad, rule: rule, vw: vw };
  }
  function lum(c) {
    var m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/.exec(c) || [], h = /^#([0-9a-f]{6})$/i.exec(c || '');
    var r, g, b; if (h) { r = parseInt(h[1].slice(0, 2), 16); g = parseInt(h[1].slice(2, 4), 16); b = parseInt(h[1].slice(4), 16); } else { r = +m[1]; g = +m[2]; b = +m[3]; }
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  }
  function wipe(c, fg, label, kicker, cls) {
    var g = strips(), el = D.createElement('div');
    el.className = 'me-wipe' + (cls ? ' ' + cls : '');
    el.setAttribute('aria-hidden', 'true');
    el.style.setProperty('--c', c); el.style.setProperty('--fg', fg);
    el.style.setProperty('--ln', lum(c) > 0.5 ? 'rgba(18,19,22,.16)' : 'rgba(244,243,239,.2)');
    var html = '';
    for (var i = 0; i < g.xs.length - 1; i++) html += '<span class="me-st" style="left:' + g.xs[i] + 'px;width:' + (g.xs[i + 1] - g.xs[i] + 1) + 'px">' + (i > 0 ? '<i class="me-ln"></i>' : '') + '</span>';
    html += '<span class="me-wl" style="left:' + (g.rule + Math.max(20, Math.min(44, g.vw * 0.026))) + 'px"></span>';
    html += '<span class="me-wk" style="left:' + g.pad + 'px"></span>';
    el.innerHTML = html;
    el.querySelector('.me-wl').textContent = label || '';
    el.querySelector('.me-wk').textContent = kicker || '';
    (D.body || H).appendChild(el);
    return el;
  }
  function anim(el, kf, o) { return el.animate ? el.animate(kf, o) : null; }
  // strips lift away (reveal) or rise to cover (leave)
  function lift(el, done) {
    var ss = el.querySelectorAll('.me-st'), t = el.querySelectorAll('.me-wl,.me-wk'), last = null;
    for (var j = 0; j < t.length; j++) t[j].style.opacity = '0';
    for (var i = 0; i < ss.length; i++) last = anim(ss[i], [{ transform: 'translateY(0)' }, { transform: 'translateY(-101%)' }], { duration: 520, delay: 90 + i * 42, easing: 'cubic-bezier(.7,0,.2,1)', fill: 'forwards' });
    var fin = function () { el.remove(); if (done) done(); };
    if (last) last.onfinish = fin; else fin();
  }
  function cover(el, done) {
    var ss = el.querySelectorAll('.me-st'), last = null, wl = el.querySelectorAll('.me-wl,.me-wk');
    for (var j = 0; j < wl.length; j++) wl[j].style.opacity = '0';
    for (var i = 0; i < ss.length; i++) last = anim(ss[i], [{ transform: 'translateY(101%)' }, { transform: 'translateY(0)' }], { duration: 300, delay: i * 30, easing: 'cubic-bezier(.6,0,.25,1)', fill: 'forwards' });
    setTimeout(function () { for (var j = 0; j < wl.length; j++) wl[j].style.opacity = '1'; }, 160);
    if (last) last.onfinish = done; else done();
  }

  /* ---------- wait for the page component to render ---------- */
  function rendered(cb) {
    var t0 = now();
    (function poll() {
      var r = D.querySelector('[data-inkroot]');
      // the page template is parsed inside <x-dc> first; the live page is rendered outside it
      if ((r && !r.closest('x-dc')) || now() - t0 > 4000) cb(); else setTimeout(poll, 30);
    })();
  }
  function fontsReady(cb, max) {
    var done = false, go = function () { if (!done) { done = true; cb(); } };
    try { D.fonts && D.fonts.ready.then(go); } catch (e) { }
    setTimeout(go, max || 900);
    if (!D.fonts) go();
  }

  function onBody(cb) { if (D.body) cb(); else D.addEventListener('DOMContentLoaded', cb); }

  /* ---------- incoming transition ---------- */
  if (doIn) onBody(function () {
    var el = wipe(incoming.c, incoming.fg, incoming.t, incoming.k);
    H.classList.remove('pt-in');
    rendered(function () { fontsReady(function () { setTimeout(function () { lift(el); }, 60); }, 700); });
  });

  /* ---------- intro (every time Home is opened). Built from the site's own parts: the grid draws itself, four square
     pixels mark the four categories as the page loads, they close into the square of "ME.", the logo inks in and
     the grid columns lift onto the page, the same way every page change opens. ---------- */
  if (doIntro) onBody(function () {
    var g = strips(), CS = ['#5d66ff', '#d9f24a', '#f4f3ef', '#ff4fb0'];
    var sw = wipe(BG, FG, '', '', 'block');
    var lns = sw.querySelectorAll('.me-ln');
    for (var i = 0; i < lns.length; i++) { lns[i].style.transform = 'scaleY(0)'; anim(lns[i], [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], { duration: 1100, delay: 120 + i * 60, easing: 'cubic-bezier(.65,0,.2,1)', fill: 'forwards' }); }
    var el = D.createElement('div'); el.className = 'mi'; el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '<div class="mi-c"><span class="mi-me">ME</span><span class="mi-ds">' + CS.map(function (c, i) { return '<i class="mi-d" style="--c:' + c + '"></i>'; }).join('') + '</span></div>'
      + '<span class="mi-tl" style="left:' + g.pad + 'px">[ Portfolio //2026 ]</span>'
      + '<span class="mi-bl" style="left:' + g.pad + 'px">Melisa Ergani<br><span>UI/UX &amp; Visual Designer, Ankara</span></span>'
      + '<span class="mi-n" style="right:' + g.pad + 'px">000</span>';
    D.body.appendChild(el);
    var ds = el.querySelectorAll('.mi-d'), n = el.querySelector('.mi-n'), t0 = now(), ready = false, lit = 0;
    rendered(function () { fontsReady(function () { ready = true; }, 2500); });
    var MIN = 1900, MAX = 6000;
    var finish = function () {
      n.textContent = '100';
      el.classList.add('fold');                       // pixels close into the square of ME., the letters ink in
      setTimeout(function () {
        el.classList.add('out');                      // the logo blurs away, the grid lifts onto the page
        H.classList.remove('intro');
        var ws = waiters; waiters = []; doIntro = false; ws.forEach(function (f) { f(); });
        sw.classList.remove('block');
        lift(sw);
        setTimeout(function () { el.remove(); }, 500);
      }, 1000);
    };
    (function tick() {
      var t = now() - t0, p = Math.min(ready ? 1 : 0.94, t / MIN);
      n.textContent = ('00' + Math.round(p * 100)).slice(-3);
      // one pixel per quarter of the load, each in its category colour
      while (lit < ds.length && p >= (lit + 1) / (ds.length + 0.6)) ds[lit++].classList.add('in');
      if ((ready && t >= MIN) || t >= MAX) { while (lit < ds.length) ds[lit++].classList.add('in'); return setTimeout(finish, 260); }
      requestAnimationFrame(tick);
    })();
  });

  /* ---------- music shell: while music plays, pages open inside a full-screen frame so the sound never stops ---------- */
  function frameReady(f, cb) {
    var t0 = now();
    (function poll() {
      var ok = false;
      try { var r = f.contentDocument.querySelector('[data-inkroot]'); ok = !!(r && !r.closest('x-dc')); } catch (e) { ok = true; }
      if (ok || now() - t0 > 5000) cb(); else setTimeout(poll, 40);
    })();
  }
  var shell = {
    load: function (url, push, el) {
      var f = D.getElementById('me-frame'), first = !f;
      if (first) { f = D.createElement('iframe'); f.id = 'me-frame'; f.setAttribute('title', 'Page'); f.setAttribute('allow', 'autoplay; fullscreen'); D.body.appendChild(f); }
      f.onload = function () {
        frameReady(f, function () {
          H.classList.add('me-shell');
          var href = url; try { D.title = f.contentDocument.title; href = f.contentWindow.location.href; f.setAttribute('title', D.title); } catch (e) { }
          if (push) history.pushState({ me: 1 }, '', href);
          try { f.contentWindow.focus(); } catch (e) { }
          if (el) lift(el); leaving = false;
        });
      };
      if (first) f.src = url; else { try { f.contentWindow.location.replace(url); } catch (e) { f.src = url; } }
    }
  };
  if (!SHELLED && !EMB) {
    W.__meShell = {
      go: function (href, o) {
        o = o || {};
        var done = function (el) { shell.load(href, true, el); };
        if (RM) return done(null);
        var el = wipe(o.c || FG, o.fg || BG, o.t || '', o.k || '', 'block'); cover(el, function () { done(el); });
      }
    };
    W.addEventListener('popstate', function () {
      if (!D.getElementById('me-frame')) return;
      var u = new URL(location.href), label = NAMES[pageKey(u)] || '';
      if (RM) return shell.load(location.href, false, null);
      var el = wipe(FG, BG, label, '', 'block'); cover(el, function () { shell.load(location.href, false, el); });
    });
  }

  /* ---------- leaving: strips rise in the colour of where you're going, then navigate ---------- */
  var NAMES = { home: 'Melisa Ergani', index: 'Melisa Ergani', about: 'About / CV', social: 'Social Media', genckart: 'PTT GençKart', pody: 'Pody', toyago: 'Toyago',
    skylore: 'Skylore', hubgym: 'Hub Gym', mawu: 'Mawu', logodesign: 'Arabica Kitchen', iste: 'İste Tasarlat', hubgenetics: 'Hub Genetics' };
  function pageKey(u) {
    var f = (u.pathname.split('/').pop() || 'index').toLowerCase().replace(/\.html$/, '').replace(/\.dc$/, '').replace(/^redesign-/, '').replace(/^case-/, '');
    return f || 'index';
  }
  function internal(a, e) {
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return null;
    if (a.target && a.target !== '_self') return null;
    if (a.hasAttribute('download')) return null;
    var href = a.getAttribute('href'); if (!href || href.charAt(0) === '#' || /^(mailto|tel|javascript):/i.test(href)) return null;
    var u; try { u = new URL(a.href, location.href); } catch (er) { return null; }
    if (u.origin !== location.origin) return null;
    if (u.pathname === location.pathname && u.search === location.search) return null;   // same page (hash jump)
    if (!/(\.html|\/)$/.test(u.pathname) && u.pathname.indexOf('.') !== -1) return null;
    return u;
  }
  var leaving = false;
  if (LIVE) {
    D.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href]'), u = internal(a, e);
      if (!u || leaving) return;
      var viaShell = SHELLED || (W.__meMusicPlaying && W.__meMusicPlaying()) || !!D.getElementById('me-frame');
      if (RM && !viaShell) return;   // plain navigation
      e.preventDefault(); leaving = true;
      var c = FG, fg = BG, key = pageKey(u), label = /#work$/.test(u.hash) ? 'Work' : (NAMES[key] || ''), kick = '';
      var card = a.closest('.cc-card');
      var inn = card && card.querySelector('.cc-in');
      if (a.getAttribute('data-pt-c')) { c = a.getAttribute('data-pt-c'); fg = a.getAttribute('data-pt-fg') || (lum(c) > 0.5 ? BG : FG); }
      else if (inn) { var cs = getComputedStyle(inn); c = cs.backgroundColor; fg = cs.color; }
      var num = a.querySelector('.cc-ls a > span:first-child, .k');
      if (inn) { var hd = card.querySelector('.cc-h'); kick = (hd ? hd.textContent : '') + (num ? '  ·  ' + num.textContent : ''); }
      if (SHELLED) { W.parent.__meShell.go(u.href, { c: c, fg: fg, t: label, k: kick }); leaving = false; return; }
      if (viaShell) { W.__meShell.go(u.href, { c: c, fg: fg, t: label, k: kick }); return; }
      var el = wipe(c, fg, label, kick, 'block');
      cover(el, function () {
        try { st('sessionStorage', 'me-pt', JSON.stringify({ c: c, fg: fg, t: label, k: kick, ts: Date.now() })); } catch (er) { }
        W.__meSaveMusic && W.__meSaveMusic();
        location.href = u.href;
      });
    }, true);
    // warm the next page while the pointer is on its way
    var pf = {};
    var warm = function (e) {
      var a = e.target.closest && e.target.closest('a[href]'); if (!a) return;
      var u; try { u = new URL(a.href, location.href); } catch (er) { return; }
      if (u.origin !== location.origin || pf[u.pathname] || u.pathname === location.pathname) return;
      pf[u.pathname] = 1; var l = D.createElement('link'); l.rel = 'prefetch'; l.href = u.pathname; D.head.appendChild(l);
    };
    // inside the shell, links that leave the site open in the whole window
    if (SHELLED) D.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href]'); if (!a || a.target) return;
      try { if (new URL(a.href, location.href).origin !== location.origin && !/^(mailto|tel):/i.test(a.href)) a.target = '_top'; } catch (er) { }
    }, true);
    D.addEventListener('pointerover', warm, { passive: true }); D.addEventListener('touchstart', warm, { passive: true });
    W.addEventListener('pageshow', function (e) {
      leaving = false;
      if (e.persisted) { var ws = D.querySelectorAll('.me-wipe'); for (var i = 0; i < ws.length; i++) ws[i].remove(); H.classList.remove('pt-in', 'intro'); }
    });
  }

  /* ---------- page features, once rendered ---------- */
  onBody(function () { rendered(function () { setTimeout(init, 0); }); });

  function init() {
    clock(); rows(); hero(); hs(); about(); cursor(); play(); words(); brief();
    if (!EMB && !SHELLED) W.__introWait(music);
  }

  /* Ankara time in the hero line */
  function clock() {
    var els = D.querySelectorAll('.me-clock'); if (!els.length) return;
    var f; try { f = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit', hour12: false }); } catch (e) { return; }
    var put = function () { var t = f.format(new Date()); for (var i = 0; i < els.length; i++) els[i].textContent = t; };
    put(); setInterval(put, 15000);
  }

  /* category rows light up their own tile, and tiles light up their row */
  function rows() {
    var cards = D.querySelectorAll('.cc-card');
    for (var c = 0; c < cards.length; c++) (function (card) {
      var as = card.querySelectorAll('.cc-ls a'), ts = card.querySelectorAll('.cc-vis .cc-t:not(.sl)');
      if (!as.length || as.length !== ts.length) return;
      var set = function (i) {
        card.classList.toggle('pv', i >= 0);
        for (var k = 0; k < as.length; k++) { as[k].classList.toggle('on', k === i); ts[k].classList.toggle('on', k === i); }
      };
      for (var i = 0; i < as.length; i++) (function (i) {
        [as[i], ts[i]].forEach(function (el) {
          el.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') set(i); });
          el.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') set(-1); });
        });
        as[i].addEventListener('focus', function () { set(i); }); as[i].addEventListener('blur', function () { set(-1); });
      })(i);
    })(cards[c]);
  }

  /* the name leaves the way it arrived: Melisa rises out of its line, Ergani sinks out of its own (scroll-tied) */
  function hero() {
    if (PAGE !== 'home' || RM || !LIVE) return;
    var top = D.getElementById('top'); if (!top) return;
    var groups = top.querySelectorAll('[data-ink="load"]'); if (groups.length < 2) return;
    var A = groups[0].querySelectorAll('.ik'), B = groups[1].querySelectorAll('.ik'), last = -1;
    var run = function () {
      var p = cl(W.scrollY / (W.innerHeight * 0.95)); if (Math.abs(p - last) < 0.001) return; last = p;
      var f = function (L, dir) {
        for (var i = 0; i < L.length; i++) {
          var j = dir < 0 ? i : L.length - 1 - i, t = cl(p * 1.7 - j * 0.09), e = t * t * (3 - 2 * t);
          L[i].style.transform = e ? 'translateY(' + (dir * e * 104).toFixed(2) + '%)' : '';
        }
      };
      f(A, -1); f(B, 1);
    };
    W.addEventListener('scroll', run, { passive: true }); W.addEventListener('resize', run); run();
  }

  /* horizontal sections: vertical scroll moves the track sideways (desktop); native swipe rows otherwise */
  function hs() {
    var secs = D.querySelectorAll('.mhs'); if (!secs.length) return;
    var mq = W.matchMedia('(min-width: 760px)');
    var on = function () { return LIVE && !RM && mq.matches; };
    var S = [];
    for (var i = 0; i < secs.length; i++) {
      var sec = secs[i], pin = sec.querySelector('.mhs-pin'), tr = sec.querySelector('.mhs-track');
      S.push({ sec: sec, pin: pin, tr: tr, ax: sec.querySelector('.xp-ax,.ab-ax'), ys: sec.querySelectorAll('.xp-ax .y'), names: sec.querySelectorAll('.xp-name'), ps: sec.querySelectorAll('.xp-p'), max: 0 });
    }
    var measure = function () {
      H.classList.toggle('mhs-on', on());
      S.forEach(function (s) {
        if (!on()) { s.sec.style.height = ''; s.tr.style.transform = ''; s.names.forEach(function (n) { n.querySelectorAll('.xl').forEach(function (l) { l.style.transform = ''; }); }); return; }
        var pinH = s.pin.clientHeight, vw = s.pin.clientWidth;
        s.max = Math.max(0, s.tr.scrollWidth - vw);
        s.sec.style.height = (pinH + s.max) + 'px';
      });
      frame();
    };
    var OFF = [-0.42, 0.3, -0.16, 0.48, -0.34, 0.12, -0.5, 0.26, -0.08, 0.4, -0.3, 0.18];
    var frame = function () {
      if (!on()) { H.classList.remove('mhs-in'); return; }
      var pinned = false;
      S.forEach(function (s) {
        var r = s.sec.getBoundingClientRect(), p = s.max ? cl((0 - r.top) / s.max) : 0, x = p * s.max;
        if (r.top <= 64 && r.bottom >= W.innerHeight - 60) pinned = true;
        s.tr.style.transform = 'translate3d(' + (-x).toFixed(1) + 'px,0,0)';
        if (s.ax) s.ax.style.setProperty('--p', p.toFixed(4));
        for (var y = 0; y < s.ys.length; y++) s.ys[y].classList.toggle('on', p >= y / Math.max(1, s.ys.length - 1) - 0.001);
        // place names: letters are scattered while their panel is still to the right, and settle as it arrives
        var vw = s.pin.clientWidth;
        for (var k = 0; k < s.ps.length; k++) {
          var nm = s.ps[k].querySelector('.xp-name'); if (!nm) continue;
          var left = s.ps[k].offsetLeft - x, q = cl((left - vw * 0.12) / (vw * 0.8)), e = q * q;
          var ls = nm.querySelectorAll('.xl');
          for (var m = 0; m < ls.length; m++) ls[m].style.transform = e > 0.001 ? 'translate3d(0,' + (OFF[(m + k * 3) % OFF.length] * e * 1.25).toFixed(3) + 'em,0)' : '';
        }
      });
      H.classList.toggle('mhs-in', pinned);
    };
    W.addEventListener('scroll', frame, { passive: true });
    W.addEventListener('resize', measure);
    if (D.fonts && D.fonts.ready) D.fonts.ready.then(measure);
    measure(); setTimeout(measure, 600); setTimeout(measure, 2500);
    // keyboard: arrow keys move a focused track along
    S.forEach(function (s) {
      s.sec.addEventListener('focusin', function (e) {
        if (!on()) return;
        var p = e.target.closest('.mhs-track > div'); if (!p) return;
        var target = Math.max(0, Math.min(s.max, p.offsetLeft - s.pin.clientWidth * 0.2));
        var y0 = W.scrollY + s.sec.getBoundingClientRect().top;
        W.scrollTo({ top: y0 + target, behavior: 'auto' });
      });
    });
  }

  /* About: the approach paragraph lights up as it is read; some words show their evidence */
  function about() {
    var hp = D.querySelector('.hl-p');
    if (hp && LIVE && !RM) {
      H.classList.add('hl-on');
      var ws = hp.querySelectorAll('.hw'), lastN = -1;
      var run = function () {
        var r = hp.getBoundingClientRect(), vh = W.innerHeight, p = cl((vh * 0.82 - r.top) / (r.height + vh * 0.3));
        var n = Math.round(p * ws.length); if (n === lastN) return; lastN = n;
        for (var i = 0; i < ws.length; i++) ws[i].classList.toggle('lit', i < n);
      };
      W.addEventListener('scroll', run, { passive: true }); W.addEventListener('resize', run); run();
    }
    var evs = D.querySelectorAll('.ev'); if (!evs.length) return;
    var box = D.createElement('div'); box.className = 'me-evp'; box.setAttribute('aria-hidden', 'true'); box.innerHTML = '<img alt=""><span></span>'; D.body.appendChild(box);
    var img = box.querySelector('img'), cap = box.querySelector('span'), cur = null;
    var show = function (ev, x, y) {
      if (cur !== ev) { img.src = ev.getAttribute('data-img'); cap.textContent = ev.getAttribute('data-cap') || ''; cur = ev; }
      var w = box.offsetWidth || 280, h = box.offsetHeight || 220, vw = W.innerWidth, vh = W.innerHeight;
      var px = Math.min(vw - w - 12, Math.max(12, x + 18)), py = y + 22 + h > vh - 12 ? y - h - 18 : y + 22;
      box.style.transform = 'translate3d(' + px + 'px,' + Math.max(12, py) + 'px,0)'; box.classList.add('on');
    };
    var hide = function () { box.classList.remove('on'); cur = null; };
    evs.forEach(function (ev) {
      ev.addEventListener('pointermove', function (e) { if (e.pointerType === 'mouse') show(ev, e.clientX, e.clientY); });
      ev.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') hide(); });
      ev.addEventListener('focus', function () { var r = ev.getBoundingClientRect(); show(ev, r.left, r.bottom); });
      ev.addEventListener('blur', hide);
      ev.addEventListener('click', function (e) { if (cur === ev && box.classList.contains('on')) { hide(); return; } var r = ev.getBoundingClientRect(); show(ev, r.left, r.bottom); e.stopPropagation(); });
    });
    D.addEventListener('click', hide); W.addEventListener('scroll', function () { if (!FINE) hide(); }, { passive: true });
  }

  /* a small label that says what a click will do, only over work */
  function cursor() {
    if (!FINE || !LIVE) return;
    var c = D.createElement('div'); c.className = 'me-cur'; c.setAttribute('aria-hidden', 'true'); D.body.appendChild(c);
    var on = false;
    D.addEventListener('pointermove', function (e) {
      var t = e.target.closest && e.target.closest('.cc-ls a, .cc-t, .xp-pj a, .cc-card a[href*="ocial"]');
      if (!t) { if (on) { c.classList.remove('on'); on = false; } return; }
      var social = /social/i.test(t.getAttribute('href') || '');
      var txt = social ? 'View brands ↗' : 'View case ↗';
      if (c.textContent !== txt) c.textContent = txt;
      c.style.transform = 'translate3d(' + (e.clientX + 16) + 'px,' + (e.clientY + 18) + 'px,0)';
      if (!on) { c.classList.add('on'); on = true; }
    }, { passive: true });
  }

  /* On repeat while designing. Plays when the site opens; where the browser blocks sound until the visitor
     interacts, it starts on their first click / tap / key. Pausing it is remembered. */
  function music() {
    var VID = 'uhiwpPRxVMw', START = 76, VOL = 70;
    var saved = null; try { saved = JSON.parse(st('sessionStorage', 'me-mu') || 'null'); } catch (e) { }
    var off = st('localStorage', 'me-mu-off') === '1';
    var title = st('localStorage', 'me-mu-title') || '';
    var wrap = D.createElement('div'); wrap.className = 'me-mu';
    wrap.innerHTML = '<div class="me-mc" role="region" aria-label="Music player"><div class="me-mv"><div id="me-yt"></div></div>'
      + '<div class="me-mi"><small>On repeat while designing</small><b class="me-tt"></b><small>Nils Frahm</small></div>'
      + '<div class="me-mk"><button type="button" class="me-pp">Pause</button><button type="button" class="me-mute" aria-pressed="false">Mute</button><a href="https://www.youtube.com/watch?v=' + VID + '" target="_blank" rel="noopener">YouTube ↗</a><button type="button" class="me-x" aria-label="Close player">Close ×</button></div></div>'
      + '<button type="button" class="me-mb" aria-expanded="false" aria-label="Music: On repeat while designing, Nils Frahm"><span class="me-wv" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span><span class="me-lbl"><span class="me-t1">On repeat while designing</span><small class="me-t2">Nils Frahm</small></span></button>';
    D.body.appendChild(wrap);
    var btn = wrap.querySelector('.me-mb'), t1 = wrap.querySelector('.me-t1'), t2 = wrap.querySelector('.me-t2'), tt = wrap.querySelector('.me-tt'), mu = wrap.querySelector('.me-mute'), pp = wrap.querySelector('.me-pp');
    var P = null, ready = false, state = off ? 'off' : 'wait', open = false, fade = null, apiP = null, fadeMs = saved && saved.t ? 1500 : 5000, armed = false;
    var label = function () {
      tt.textContent = title || 'Nils Frahm';
      t1.textContent = state === 'play' && title ? title : 'On repeat while designing';
      t2.textContent = state === 'play' ? 'Nils Frahm' : state === 'wait' ? 'Nils Frahm — plays on your first click' : 'Nils Frahm — paused';
      pp.textContent = state === 'play' ? 'Pause' : 'Play';
      wrap.classList.toggle('play', state === 'play'); wrap.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    };
    var api = function () {
      if (apiP) return apiP;
      apiP = new Promise(function (res) {
        if (W.YT && W.YT.Player) return res();
        var prev = W.onYouTubeIframeAPIReady; W.onYouTubeIframeAPIReady = function () { if (prev) prev(); res(); };
        var s = D.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; s.async = true; D.head.appendChild(s);
      });
      return apiP;
    };
    var ramp = function (to, ms, done) {
      clearInterval(fade); if (!P || !P.setVolume) { if (done) done(); return; }
      var from = P.getVolume ? (P.getVolume() || 0) : 0, t0 = now();
      fade = setInterval(function () {
        var t = cl((now() - t0) / ms), v = from + (to - from) * (t * t * (3 - 2 * t));
        try { P.setVolume(Math.round(v)); } catch (e) { }
        if (t >= 1) { clearInterval(fade); if (done) done(); }
      }, 50);
    };
    var go = function () { if (!P || !ready) return; try { P.setVolume(0); P.playVideo(); } catch (e) { } };
    // sound needs a user gesture in most browsers: the first click / tap / key anywhere starts it
    var arm = function () {
      if (armed) return; armed = true;
      var g = function (e) {
        if (state !== 'wait') return disarm();
        if (e.target && e.target.closest && e.target.closest('.me-mu')) return;   // the player's own buttons handle themselves
        go(); disarm();
      };
      var disarm = function () { ['pointerdown', 'keydown', 'touchend'].forEach(function (ev) { D.removeEventListener(ev, g, true); }); armed = false; };
      ['pointerdown', 'keydown', 'touchend'].forEach(function (ev) { D.addEventListener(ev, g, true); });
    };
    var create = function () {
      api().then(function () {
        if (P) return;
        P = new W.YT.Player('me-yt', {
          host: 'https://www.youtube-nocookie.com', videoId: VID, width: 256, height: 200,
          playerVars: { start: Math.floor(saved && saved.t ? saved.t : START), autoplay: 0, controls: 0, rel: 0, playsinline: 1, disablekb: 1, fs: 0, iv_load_policy: 3 },
          events: {
            onReady: function (e) {
              ready = true;
              var d = e.target.getVideoData && e.target.getVideoData(); if (d && d.title) { title = d.title; st('localStorage', 'me-mu-title', title); }
              if (state === 'wait' || state === 'play') { go(); arm(); }
              label();
            },
            onStateChange: function (e) {
              if (e.data === 1) { if (state !== 'play') { state = 'play'; st('localStorage', 'me-mu-off', null); label(); ramp(VOL, fadeMs); fadeMs = 1500; } }
              else if (e.data === 0) { try { P.seekTo(START, true); P.playVideo(); } catch (er) { } }
            },
            onError: function () { t2.textContent = 'Can’t play here — open on YouTube'; }
          }
        });
      });
    };
    var pause = function () { state = 'pause'; st('localStorage', 'me-mu-off', '1'); st('sessionStorage', 'me-mu', null); label(); ramp(0, 500, function () { try { P.pauseVideo(); } catch (e) { } }); };
    var resume = function () { state = 'wait'; st('localStorage', 'me-mu-off', null); fadeMs = 1500; label(); if (P && ready) go(); else create(); };
    btn.addEventListener('click', function () {
      if (state === 'off') { state = 'wait'; fadeMs = 5000; st('localStorage', 'me-mu-off', null); label(); if (P && ready) go(); else create(); }
      else if (state === 'wait' && P && ready) go();
      open = !open; label();
    });
    pp.addEventListener('click', function () { if (state === 'play') pause(); else resume(); });
    wrap.querySelector('.me-x').addEventListener('click', function () { open = false; label(); btn.focus(); });
    D.addEventListener('keydown', function (e) { if (e.key === 'Escape' && open) { open = false; label(); } });
    D.addEventListener('pointerdown', function (e) { if (open && !wrap.contains(e.target)) { open = false; label(); } }, true);
    mu.addEventListener('click', function () {
      if (!P) return; var m = P.isMuted && P.isMuted();
      try { m ? P.unMute() : P.mute(); } catch (e) { }
      mu.textContent = m ? 'Mute' : 'Unmute'; mu.setAttribute('aria-pressed', m ? 'false' : 'true');
    });
    W.__meSaveMusic = function () {
      if (state !== 'play' || !P || !P.getCurrentTime) return;
      try { st('sessionStorage', 'me-mu', JSON.stringify({ t: P.getCurrentTime() })); } catch (e) { }
    };
    W.addEventListener('pagehide', W.__meSaveMusic);
    W.__meMusicPlaying = function () { return state === 'play'; };
    label();
    if (state !== 'off') { create(); arm(); }
  }

  /* Playground: Mawu's six sensory balls, each with its own temperament */
  function play() {
    var stage = D.querySelector('.pg-stage'); if (!stage) return;
    var els = Array.prototype.slice.call(stage.querySelectorAll('.pg-b')), word = stage.querySelector('.pg-w');
    var T = {   // restitution, mass, release boost, air drag
      happiness: { e: 0.86, m: 0.8, k: 1.1, a: 0.0 }, anger: { e: 0.55, m: 1.3, k: 1.45, a: 0.0 }, fear: { e: 0.5, m: 0.7, k: 1, a: 0.0, flee: 1 },
      hate: { e: 0.22, m: 2.4, k: 0.8, a: 0.0 }, sadness: { e: 0.12, m: 1.8, k: 0.7, a: 0.6 }, surprise: { e: 0.94, m: 0.75, k: 1.2, a: 0.0, hop: 1 } };
    var B = els.map(function (el, i) { var n = el.getAttribute('data-e'), t = T[n]; return { el: el, n: n, t: t, x: 0, y: 0, vx: 0, vy: 0, r: 40, a: 0, drag: null }; });
    var still = !LIVE || RM;
    var w = 0, h = 0, raf = 0, last = 0, vis = false, started = false, wordT = 0, mx = -1e4, my = -1e4;
    var size = function () {
      var r = stage.getBoundingClientRect(); w = r.width; h = r.height;
      var d = els[0].offsetWidth || 120; B.forEach(function (b) { b.r = d / 2; });
    };
    var draw = function (b) { b.el.style.transform = 'translate3d(' + (b.x - b.r).toFixed(1) + 'px,' + (b.y - b.r).toFixed(1) + 'px,0) rotate(' + b.a.toFixed(3) + 'rad)'; };
    var layout = function (drop) {
      size();
      var gap = w / (B.length + 1);
      B.forEach(function (b, i) {
        b.x = gap * (i + 1); b.vx = 0; b.vy = 0; b.a = 0;
        b.y = drop ? -b.r - 60 - i * 70 - Math.random() * 60 : h - b.r;
        if (drop) b.vx = (Math.random() - 0.5) * 300;
        draw(b);
      });
    };
    var say = function (n) {
      word.textContent = n; word.classList.add('on'); clearTimeout(wordT);
      wordT = setTimeout(function () { if (!B.some(function (b) { return b.drag; })) word.classList.remove('on'); }, 1400);
    };
    var step = function (dt) {
      var G = 2400, moving = false;
      B.forEach(function (b) {
        if (b.drag) { moving = true; return; }
        b.vy += G * dt;
        if (b.t.a) { b.vx *= 1 - b.t.a * dt; b.vy *= 1 - b.t.a * dt * 0.5; }
        if (b.t.flee && mx > -1e3) {   // fear keeps its distance from the pointer
          var dx = b.x - mx, dy = b.y - my, d = Math.hypot(dx, dy) || 1;
          if (d < b.r * 2.4) { var f = (1 - d / (b.r * 2.4)) * 5200; b.vx += dx / d * f * dt; b.vy += dy / d * f * dt; }
        }
        b.x += b.vx * dt; b.y += b.vy * dt;
        b.a += b.vx * dt / b.r;
        if (b.y > h - b.r) { b.y = h - b.r; if (b.vy > 0) b.vy = -b.vy * b.t.e; if (Math.abs(b.vy) < 40) b.vy = 0; b.vx *= 1 - Math.min(1, 3.2 * dt); }
        if (b.y < b.r - 2000) b.y = b.r - 2000;
        if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx) * b.t.e; }
        if (b.x > w - b.r) { b.x = w - b.r; b.vx = -Math.abs(b.vx) * b.t.e; }
        if (Math.abs(b.vx) > 4 || Math.abs(b.vy) > 4 || b.y < h - b.r - 1) moving = true;
      });
      for (var i = 0; i < B.length; i++) for (var k = i + 1; k < B.length; k++) {
        var p = B[i], q = B[k], dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy), md = p.r + q.r;
        if (d >= md || d === 0) continue;
        var nx = dx / d, ny = dy / d, ov = md - d;
        var ip = p.drag ? 0 : 1 / p.t.m, iq = q.drag ? 0 : 1 / q.t.m; if (!ip && !iq) continue;
        p.x -= nx * ov * ip / (ip + iq); p.y -= ny * ov * ip / (ip + iq); q.x += nx * ov * iq / (ip + iq); q.y += ny * ov * iq / (ip + iq);
        var rv = (q.vx - p.vx) * nx + (q.vy - p.vy) * ny; if (rv > 0) continue;
        var e = Math.min(p.t.e, q.t.e) * 0.9, jn = -(1 + e) * rv / (ip + iq);
        p.vx -= jn * ip * nx; p.vy -= jn * ip * ny; q.vx += jn * iq * nx; q.vy += jn * iq * ny;
        moving = true;
      }
      B.forEach(draw);
      return moving;
    };
    var loop = function (t) {
      var dt = Math.min(0.032, (t - last) / 1000 || 0.016); last = t;
      var mv = step(dt / 2) | step(dt / 2);
      raf = (vis && (mv || B.some(function (b) { return b.drag; }))) ? requestAnimationFrame(loop) : 0;
    };
    var kick = function () { if (!raf && vis && !still) { last = now(); raf = requestAnimationFrame(loop); } };
    if (still) { layout(false); }
    else {
      layout(false); B.forEach(function (b) { b.el.style.opacity = '0'; });
      new IntersectionObserver(function (es) {
        vis = es[0].isIntersecting;
        if (vis && !started) { started = true; layout(true); B.forEach(function (b) { b.el.style.opacity = ''; }); }
        kick();
      }, { threshold: 0.2 }).observe(stage);
      W.addEventListener('resize', function () { var ow = w; size(); B.forEach(function (b) { b.x = Math.min(w - b.r, b.x * (w / (ow || w))); b.y = Math.min(h - b.r, b.y); draw(b); }); kick(); });
      stage.addEventListener('pointermove', function (e) { var r = stage.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; if (B[2] && B.some(function (b) { return b.t.flee; })) kick(); });
      stage.addEventListener('pointerleave', function () { mx = my = -1e4; });
    }
    var again = D.querySelector('.pg-again');
    if (again) again.addEventListener('click', function () { if (still) { layout(false); return; } layout(true); kick(); });
    B.forEach(function (b) {
      var el = b.el, hist = [];
      el.addEventListener('pointerdown', function (e) {
        say(b.n); if (still) return;
        e.preventDefault(); el.setPointerCapture(e.pointerId);
        var r = stage.getBoundingClientRect();
        b.drag = { ox: e.clientX - r.left - b.x, oy: e.clientY - r.top - b.y }; hist = [];
        el.classList.add('held'); kick();
        if (b.t.hop) { b.vy = -900; }
      });
      el.addEventListener('pointermove', function (e) {
        if (!b.drag) return;
        var r = stage.getBoundingClientRect(), x = e.clientX - r.left - b.drag.ox, y = e.clientY - r.top - b.drag.oy;
        b.x = Math.max(b.r, Math.min(w - b.r, x)); b.y = Math.min(h - b.r, y);
        hist.push([now(), b.x, b.y]); if (hist.length > 6) hist.shift();
        draw(b);
      });
      var up = function () {
        if (!b.drag) return; b.drag = null; el.classList.remove('held');
        if (hist.length > 1) { var a = hist[0], z = hist[hist.length - 1], dt = Math.max(16, z[0] - a[0]) / 1000; b.vx = (z[1] - a[1]) / dt * b.t.k; b.vy = (z[2] - a[2]) / dt * b.t.k; }
        b.vx = Math.max(-4200, Math.min(4200, b.vx)); b.vy = Math.max(-4200, Math.min(4200, b.vy));
        kick(); say(b.n);
      };
      el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
      el.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter' && e.key !== ' ') return; e.preventDefault(); say(b.n);
        if (!still) { b.vy = -1400 - Math.random() * 600; b.vx = (Math.random() - 0.5) * 1400; kick(); }
      });
      el.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse' && !B.some(function (q) { return q.drag; })) say(b.n); });
    });
  }

  /* Home: a band of square pixels on the grid. The cursor pushes them aside; pointing at a word in the index below
     gathers them into that word (in its category colour), and they fall back into the grid when you leave. */
  function words() {
    var sec = D.querySelector('.pf'); if (!sec) return;
    var band = sec.querySelector('.pf-band'), cv = band.querySelector('canvas'), ctx = cv.getContext && cv.getContext('2d'); if (!ctx) return;
    var still = !LIVE || RM, W0 = 0, H0 = 0, dpr = 1, S = 6, P = [], N = 0, vis = false, raf = 0, mx = -1e4, my = -1e4, active = null, sz = 1.6, cur = FG, calm = 0;
    var off = D.createElement('canvas'), oc = off.getContext('2d');
    var build = function () {
      var r = band.getBoundingClientRect(); W0 = r.width; H0 = r.height; dpr = Math.min(2, W.devicePixelRatio || 1);
      cv.width = Math.round(W0 * dpr); cv.height = Math.round(H0 * dpr); cv.style.width = W0 + 'px'; cv.style.height = H0 + 'px';
      S = Math.max(4.5, Math.min(7, W0 / 250)); sz = Math.max(1.3, S * 0.3);
      var cols = Math.floor(W0 / S), rows = Math.floor(H0 / S), ox = (W0 - (cols - 1) * S) / 2, oy = (H0 - (rows - 1) * S) / 2;
      P = []; for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) { var hx = ox + x * S, hy = oy + y * S; P.push({ x: hx, y: hy, vx: 0, vy: 0, hx: hx, hy: hy, tx: hx, ty: hy, a: 0.42, ta: 0.42 }); }
      N = P.length; if (active) shape(active, true);
    };
    // the word, drawn once off screen and sampled on the same pixel pitch
    var shape = function (it, keep) {
      active = it;
      if (!it) { cur = FG; P.forEach(function (p) { p.tx = p.hx; p.ty = p.hy; p.ta = 0.42; }); kick(); return; }
      var word = it.getAttribute('data-w'), arrow = it.tagName === 'A';
      cur = it.getAttribute('data-c') || FG;
      off.width = Math.ceil(W0); off.height = Math.ceil(H0); oc.clearRect(0, 0, off.width, off.height);
      var fs = H0 * 1.02; oc.font = '800 ' + fs + 'px Archivo, sans-serif'; try { oc.fontStretch = 'extra-condensed'; } catch (e) { }
      var tw = oc.measureText(word).width, aw = arrow ? fs * 0.62 : 0, gap = arrow ? fs * 0.25 : 0, room = W0 * 0.96;
      if (tw + gap + aw > room) { fs *= room / (tw + gap + aw); oc.font = '800 ' + fs + 'px Archivo, sans-serif'; try { oc.fontStretch = 'extra-condensed'; } catch (e) { } tw = oc.measureText(word).width; aw = arrow ? fs * 0.62 : 0; gap = arrow ? fs * 0.25 : 0; }
      var cap = fs * 0.72, base = (H0 + cap) / 2, x0 = arrow ? 0 : 0;
      oc.fillStyle = '#fff'; oc.textBaseline = 'alphabetic'; oc.fillText(word, x0, base);
      if (arrow) {   // ↗ drawn as strokes, sitting at the right edge like the rows below
        var ax = W0 - aw * 0.95, ay = base - cap, lw = fs * 0.11;
        oc.strokeStyle = '#fff'; oc.lineWidth = lw; oc.lineCap = 'square';
        oc.beginPath(); oc.moveTo(ax + lw, ay + cap - lw); oc.lineTo(ax + aw - lw, ay + lw); oc.moveTo(ax + aw * 0.28, ay + lw); oc.lineTo(ax + aw - lw, ay + lw); oc.lineTo(ax + aw - lw, ay + cap * 0.72); oc.stroke();
      }
      var data = oc.getImageData(0, 0, off.width, off.height).data, T = [];
      for (var y = S / 2; y < H0; y += S) for (var x = S / 2; x < W0; x += S) { if (data[(Math.floor(y) * off.width + Math.floor(x)) * 4 + 3] > 120) T.push([x, y]); }
      // hand the targets to the pixels nearest in column order, so the word gathers from where it stands
      var order = P.slice().sort(function (a, b) { return a.hx - b.hx || a.hy - b.hy; });
      T.sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
      var M = Math.min(T.length, N), used = {};
      order.forEach(function (p) { p.ta = 0; p.tx = p.hx; p.ty = p.hy + (Math.random() - 0.5) * S * 2; });
      for (var t = 0; t < M; t++) { var p = order[Math.floor(t * N / M)]; p.tx = T[t][0]; p.ty = T[t][1]; p.ta = 1; if (!keep && !still) { p.vx += (Math.random() - 0.5) * 9; p.vy += (Math.random() - 0.5) * 9; } }
      kick();
    };
    var draw = function () {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W0, H0);
      var lo = [], hi = [];
      for (var i = 0; i < N; i++) { var p = P[i]; if (p.a < 0.04) continue; (p.a > 0.7 ? hi : lo).push(p); }
      ctx.fillStyle = 'rgba(244,243,239,.4)'; for (var a = 0; a < lo.length; a++) ctx.fillRect(lo[a].x - sz / 2, lo[a].y - sz / 2, sz, sz);
      ctx.fillStyle = cur; var s2 = sz * 1.45; for (var b = 0; b < hi.length; b++) ctx.fillRect(hi[b].x - s2 / 2, hi[b].y - s2 / 2, s2, s2);
    };
    var step = function () {
      var R = Math.max(60, Math.min(110, W0 * 0.07)), R2 = R * R, moving = false;
      for (var i = 0; i < N; i++) {
        var p = P[i];
        if (still) { p.x = p.tx; p.y = p.ty; p.a = p.ta; continue; }
        var ax = (p.tx - p.x) * 0.055, ay = (p.ty - p.y) * 0.055;
        var dx = p.x - mx, dy = p.y - my, d2 = dx * dx + dy * dy;
        if (d2 < R2) { var d = Math.sqrt(d2) || 1, f = (1 - d / R) * 3.2; ax += dx / d * f; ay += dy / d * f; }
        p.vx = (p.vx + ax) * 0.8; p.vy = (p.vy + ay) * 0.8; p.x += p.vx; p.y += p.vy;
        p.a += (p.ta - p.a) * 0.12;
        if (!moving && (Math.abs(p.vx) > 0.05 || Math.abs(p.vy) > 0.05 || Math.abs(p.ta - p.a) > 0.01)) moving = true;
      }
      return moving;
    };
    var loop = function () { var mv = step(); draw(); calm = mv ? 0 : calm + 1; raf = (vis && (calm < 20 || mx > -1e3)) ? requestAnimationFrame(loop) : 0; };
    var kick = function () { if (!raf && (vis || still)) raf = requestAnimationFrame(loop); };
    band.addEventListener('pointermove', function (e) { var r = cv.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; kick(); }, { passive: true });
    band.addEventListener('pointerleave', function () { mx = my = -1e4; kick(); });
    var items = sec.querySelectorAll('.pf-i'), leaveT = 0;
    Array.prototype.forEach.call(items, function (it) {
      var on = function () { clearTimeout(leaveT); if (active !== it) { Array.prototype.forEach.call(items, function (x) { x.classList.toggle('on', x === it); }); shape(it); } };
      var offf = function () { leaveT = setTimeout(function () { it.classList.remove('on'); shape(null); }, 180); };
      it.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') on(); });
      it.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') offf(); });
      it.addEventListener('focus', on); it.addEventListener('blur', offf);
      var since = 0; it.addEventListener('focus', function () { since = now(); });
      if (it.tagName === 'BUTTON') it.addEventListener('click', function () { if (active === it && now() - since > 400) { it.classList.remove('on'); shape(null); } else on(); });
    });
    var start = function () {
      build();
      new IntersectionObserver(function (es) { vis = es[0].isIntersecting; if (vis) kick(); }, { threshold: 0 }).observe(band);
      kick();
    };
    try { D.fonts.load('800 80px Archivo').then(start, start); } catch (e) { start(); }
    var rt; W.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { build(); kick(); }, 150); });
  }

  /* Case pages: the brief stays in the margin column while the project scrolls (wide screens) */
  function brief() {
    if (PAGE !== 'case' || EMB || W.innerHeight >= 1500) return;
    var root = Array.prototype.filter.call(D.querySelectorAll('[data-inkroot]'), function (r) { return !r.closest('x-dc'); })[0]; if (!root) return;
    var hd = root.querySelector(':scope > header'), pn = root.querySelector('nav[aria-label="Project navigation"]'); if (!hd) return;
    var g12 = hd.querySelector('.g12') || hd, row = g12.firstElementChild, lab = row ? row.children : [];
    var h1 = hd.querySelector('h1'), sub = g12.querySelector('.fade');
    var ps = Array.prototype.map.call(g12.querySelectorAll('p'), function (p) { return p.textContent.trim(); }).filter(Boolean);
    var dl = '';
    Array.prototype.forEach.call(g12.querySelectorAll('dl > div'), function (d) {
      var t = d.querySelector('dt'), v = d.querySelector('dd'); if (!t || !v || /Your input/.test(v.textContent)) return;
      dl += '<div><dt></dt><dd></dd></div>';
    });
    var secs = Array.prototype.filter.call(root.querySelectorAll(':scope > section[aria-label]'), function (s) { return s.getAttribute('aria-label') !== 'Summary'; });
    var a = D.createElement('aside'); a.className = 'cb'; a.setAttribute('aria-label', 'Project brief');
    a.innerHTML = '<div class="cb-top"><span></span><span></span></div><b class="cb-t"></b><span class="cb-s"></span><div class="cb-p"></div><dl class="cb-dl">' + dl + '</dl><ol class="cb-ix"></ol>';
    a.querySelector('.cb-top span').textContent = lab[0] ? lab[0].textContent : '';
    a.querySelector('.cb-top span:last-child').textContent = lab[1] ? lab[1].textContent : '';
    a.querySelector('.cb-t').textContent = h1 ? (h1.getAttribute('aria-label') || h1.textContent) : '';
    a.querySelector('.cb-s').textContent = sub ? sub.textContent.trim() : '';
    a.querySelector('.cb-p').innerHTML = ps.map(function () { return '<p></p>'; }).join('');
    Array.prototype.forEach.call(a.querySelectorAll('.cb-p p'), function (p, i) { p.textContent = ps[i]; });
    var di = 0;
    Array.prototype.forEach.call(g12.querySelectorAll('dl > div'), function (d) {
      var t = d.querySelector('dt'), v = d.querySelector('dd'); if (!t || !v || /Your input/.test(v.textContent)) return;
      var slot = a.querySelectorAll('.cb-dl > div')[di++]; slot.querySelector('dt').textContent = t.textContent; slot.querySelector('dd').textContent = v.textContent;
    });
    var ix = a.querySelector('.cb-ix'), items = [];
    secs.forEach(function (s, i) {
      var m = /(\d{2}\.\d{1,2})(?!\d)/.exec(s.textContent || ''), id = s.id || ('s-' + (i + 1)); s.id = id;
      var li = D.createElement('li'), l = D.createElement('a'); l.href = '#' + id;
      l.innerHTML = '<span></span><span></span>'; l.firstChild.textContent = m ? m[1] : ''; l.lastChild.textContent = s.getAttribute('aria-label');
      l.addEventListener('click', function (e) { e.preventDefault(); s.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'start' }); });
      li.appendChild(l); ix.appendChild(li); items.push([s, l]);
    });
    root.appendChild(a);
    var mq = W.matchMedia('(min-width: 1100px)');
    var place = function () {
      var g = strips(), gut = Math.max(14, Math.min(24, g.vw * 0.016));
      H.classList.toggle('cb-on', mq.matches);
      H.style.setProperty('--cb-l', g.pad + 'px'); H.style.setProperty('--cb-w', (g.rule - g.pad - gut) + 'px'); H.style.setProperty('--cb-x', (g.rule + gut) + 'px');
      run();
    };
    var run = function () {
      if (!mq.matches) return;
      var vh = W.innerHeight, show = hd.getBoundingClientRect().bottom < vh * 0.3 && (!pn || pn.getBoundingClientRect().top > vh * 0.75);
      // a full-width pinned strip (Pody's launch) has the screen to itself
      Array.prototype.forEach.call(root.querySelectorAll('.hs'), function (x) { var r = x.getBoundingClientRect(); if (r.top < vh * 0.5 && r.bottom > vh * 0.5) show = false; });
      a.classList.toggle('on', show);
      var cur = -1; items.forEach(function (it, i) { if (it[0].getBoundingClientRect().top < vh * 0.45) cur = i; });
      items.forEach(function (it, i) { it[1].classList.toggle('on', i === cur); });
    };
    W.addEventListener('scroll', run, { passive: true }); W.addEventListener('resize', place); place();
  }
})();
