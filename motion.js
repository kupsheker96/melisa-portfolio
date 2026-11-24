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
  var navType = ''; try { navType = ((W.performance && performance.getEntriesByType && performance.getEntriesByType('navigation')[0]) || {}).type || ''; } catch (e) { }
  if (!incoming && !SHELLED && navType === 'back_forward') {
    var lp = null; try { lp = JSON.parse(st('sessionStorage', 'me-last') || 'null'); } catch (e) { }
    if (lp && Date.now() - lp.ts < 60000) incoming = { c: lp.c, fg: lp.fg, t: '', k: '', ox: 0.5, oy: 0.5, ts: Date.now(), back: 1 };
  }
  // (Nov 24) a refresh starts from the top with every effect; only back / forward returns to where you were
  if (!EMB) {
    try { history.scrollRestoration = 'manual'; } catch (e) { }
    var backY = null; if (navType === 'back_forward') { try { backY = JSON.parse(st('sessionStorage', 'me-y:' + location.pathname) || 'null'); } catch (e) { } }
    var toTop = function () { if (backY != null) W.scrollTo(0, backY); else if (!location.hash) W.scrollTo(0, 0); };
    toTop(); D.addEventListener('DOMContentLoaded', toTop); W.addEventListener('load', function () { toTop(); setTimeout(toTop, 60); });
    W.addEventListener('pagehide', function () { st('sessionStorage', 'me-y:' + location.pathname, String(Math.round(W.scrollY))); });
  }
  var doIntro = LIVE && !RM && PAGE === 'home' && !incoming && !SHELLED;
  var doIn = LIVE && !RM && !doIntro && !!incoming;
  var waiters = [];
  W.__introWait = function (cb) { if (doIntro) waiters.push(cb); else cb(); };
  if (PAGE === 'home') H.classList.add('me-home');
  if (doIntro) { H.classList.add('intro'); H.style.setProperty('--pt-c', BG); }
  else if (doIn) { H.classList.add('pt-in'); H.style.setProperty('--pt-c', incoming.c); }

  /* ---------- grid strips: the margin column + the 6 / 4 / 2 content columns ---------- */
  function strips() {
    // the same grid the page draws: padding from the viewport width (CSS vw), columns from the visible width
    var iw = W.innerWidth, vw = H.clientWidth || iw, pad = Math.max(16, Math.min(56, iw * 0.04)), inner = vw - 2 * pad;
    var rule = pad + inner * 0.16, n = iw >= 1100 ? 6 : iw >= 640 ? 4 : 2, cw = inner * 0.84 / n, xs = [0, rule];
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

  /* ---------- page transitions (Nov 24): no strips, no loader. The screen fills with the site's square dots in the
     colour of where you are going, spreading from where you clicked; the destination's name inks in; on the new page
     the dots dissolve from the same point. Back / forward does the same, out of the colour of the page you left. ---------- */
  function hash(x, y) { var h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return h - Math.floor(h); }
  function sm(t) { return t * t * (3 - 2 * t); }
  function inkFilter() {
    if (D.getElementById('me-pti')) return;
    var d = D.createElement('div');
    d.innerHTML = '<svg width="0" height="0" style="position:absolute;width:0;height:0" aria-hidden="true"><filter id="me-pti" x="-10%" y="-60%" width="120%" height="220%"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="0" xChannelSelector="R" yChannelSelector="G" result="d"/><feGaussianBlur in="d" stdDeviation="0"/></filter></svg>';
    (D.body || H).appendChild(d.firstChild);
  }
  // the label smudges in (ink -> crisp) or out (crisp -> ink)
  function inkLabel(el, inn, ms, delay) {
    var lb = el.querySelector('.me-wl'), kk = el.querySelector('.me-wk'); if (!lb || !lb.textContent) { if (kk) kk.style.opacity = inn ? '.62' : '0'; return; }
    var f = D.getElementById('me-pti'), dm = f && f.querySelector('feDisplacementMap'), bl = f && f.querySelector('feGaussianBlur'), fs = parseFloat(getComputedStyle(lb).fontSize) || 80;
    var s0 = now() + (delay || 0);
    lb.style.filter = 'url(#me-pti)';
    (function k() {
      var t = cl((now() - s0) / ms), e = inn ? 1 - Math.pow(1 - t, 3) : t * t, a = inn ? 1 - e : e;   // a: how smudged
      if (dm) dm.setAttribute('scale', (a * fs * 0.5).toFixed(2));
      if (bl) bl.setAttribute('stdDeviation', (a * fs * 0.06).toFixed(2));
      lb.style.opacity = (1 - a).toFixed(3); if (kk) kk.style.opacity = ((1 - a) * 0.62).toFixed(3);
      if (t < 1 && el.isConnected) requestAnimationFrame(k); else if (t >= 1 && !a) lb.style.filter = '';
    })();
  }
  function ptMake(c, fg, label, kicker, ox, oy, full) {
    inkFilter();
    var g = strips(), vw = g.vw, vh = W.innerHeight, el = D.createElement('div'), cw = (g.xs[2] - g.xs[1]) || vw / 4;
    var S = cw / Math.max(2, Math.round(cw / (vw < 640 ? 30 : 46)));   // whole dots per grid column, so the dots sit on the grid
    el.className = 'me-pt block'; el.setAttribute('aria-hidden', 'true');
    el.style.setProperty('--c', c); el.style.setProperty('--fg', fg);
    el.innerHTML = '<canvas></canvas><span class="me-wl" style="left:' + (g.rule + Math.max(20, Math.min(44, vw * 0.026))) + 'px"></span><span class="me-wk" style="left:' + g.pad + 'px"></span>';
    el.querySelector('.me-wl').textContent = label || ''; el.querySelector('.me-wk').textContent = kicker || '';
    var cv = el.querySelector('canvas'), dpr = Math.min(2, W.devicePixelRatio || 1), x = cv.getContext('2d');
    cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr); cv.style.width = vw + 'px'; cv.style.height = vh + 'px';
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    ox = (ox == null ? 0.5 : ox) * vw; oy = (oy == null ? 0.5 : oy) * vh;
    var x0 = (g.rule % S) - S, nx = Math.ceil((vw - x0) / S) + 1, ny = Math.ceil(vh / S) + 1, y0 = (vh / 2) % S - S;
    var md = Math.max(Math.hypot(ox, oy), Math.hypot(vw - ox, oy), Math.hypot(ox, vh - oy), Math.hypot(vw - ox, vh - oy)) || 1, C = [];
    for (var j = 0; j < ny; j++) for (var i = 0; i < nx; i++) {
      var cx = x0 + (i + 0.5) * S, cy = y0 + (j + 0.5) * S;
      C.push(cx, cy, Math.hypot(cx - ox, cy - oy) / md * 0.78 + hash(i, j) * 0.22);
    }
    // p 0..1; grow: dots appear (cover), else they shrink away (reveal)
    el._draw = function (p, grow) {
      x.clearRect(0, 0, vw, vh); x.fillStyle = c;
      for (var k = 0; k < C.length; k += 3) {
        var t = sm(cl((p - C[k + 2] * 0.6) / 0.4)), s = grow ? t : 1 - t;
        if (s <= 0.01) continue;
        var w = s >= 0.999 ? S + 1 : s * S;
        x.fillRect(C[k] - w / 2, C[k + 1] - w / 2, w, w);
      }
    };
    if (full) { el._draw(1, true); var lb = el.querySelector('.me-wl'), kk = el.querySelector('.me-wk'); lb.style.opacity = '1'; kk.style.opacity = '.62'; }
    else el._draw(0, true);
    (D.body || H).appendChild(el);
    return el;
  }
  function ptRun(el, ms, grow, done) {
    var s0 = now();
    (function f() {
      var t = cl((now() - s0) / ms);
      el._draw(t, grow);
      if (t < 1) requestAnimationFrame(f); else if (done) done();
    })();
  }
  function ptCover(el, done) { ptRun(el, 430, true, done); inkLabel(el, true, 380, 170); }
  function ptReveal(el, done) {
    inkLabel(el, false, 240, 0);
    setTimeout(function () { ptRun(el, 560, false, function () { el.remove(); if (done) done(); }); }, 90);
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
    var el = ptMake(incoming.c, incoming.fg, incoming.t || (incoming.back ? NAMES[pageKey(location)] || '' : ''), incoming.k, incoming.ox, incoming.oy, true);
    H.classList.remove('pt-in');
    rendered(function () { fontsReady(function () { setTimeout(function () { ptReveal(el); }, 40); }, 700); });
  });

  /* ---------- intro (Nov 24, redesigned to match the landing). The page waits behind the landing's own line screen:
     the name, bigger, builds up out of the lines as the page loads, glimmering through the site's colours, with the
     count in the bottom-left corner. At 100 the site opens with the music (or on the first scroll / click / key where
     the browser wants a gesture first): the glimmer settles into the lavender, the big name sinks back into the lines
     and the landing's name surfaces in its place. lineHero() draws all of it (see W.__meIntro). ---------- */
  if (doIntro) {
    H.classList.add('intro2'); H.classList.remove('intro');
    W.__meIntro = { p: 0, phase: 'load', t0: 0, ready: false };
  }
  if (doIntro) onBody(function () {
    var IN = W.__meIntro, t0 = now(), MIN = 2400, MAX = 7000, ready = false, chosen = false;
    var el = D.createElement('div'); el.className = 'mi2'; el.setAttribute('role', 'status'); el.setAttribute('aria-label', 'Loading');
    el.innerHTML = '<span class="mi2-n" aria-hidden="true">000</span><button type="button" class="mi2-go">Scroll to enter <span aria-hidden="true">↓</span></button>';
    D.body.appendChild(el);
    var nEl = el.querySelector('.mi2-n'), go = el.querySelector('.mi2-go');
    rendered(function () { fontsReady(function () { ready = true; }, 2500); });
    var leave = function (sound) {
      if (chosen) return; chosen = true;
      if (sound) { W.__meWantSound = true; if (W.__meMusicStart) W.__meMusicStart(); }
      else if (W.__meMusicQuiet) W.__meMusicQuiet();
      IN.phase = 'leave'; IN.t0 = now();
      el.classList.add('out');
      ['wheel', 'touchmove', 'keydown'].forEach(function (ev) { W.removeEventListener(ev, scrollIn, { passive: false }); });
      H.classList.add('me-lock'); setTimeout(function () { H.classList.remove('me-lock'); }, 1950);
      setTimeout(function () { H.classList.remove('intro2'); var ws = waiters; waiters = []; doIntro = false; ws.forEach(function (f) { f(); }); }, 650);
      setTimeout(function () { el.remove(); }, 1200);
    };
    var scrollIn = function (e) {
      if (!el.classList.contains('ask')) { if (e.cancelable) e.preventDefault(); return; }   // the page stays put while it loads
      if (e.type === 'keydown' && ['ArrowDown', 'PageDown', ' ', 'Spacebar', 'Enter', 'End'].indexOf(e.key) < 0) return;
      if (e.type === 'wheel' && e.deltaY <= 0) return;
      if (e.cancelable) e.preventDefault();
      leave(true);
    };
    ['wheel', 'touchmove', 'keydown'].forEach(function (ev) { W.addEventListener(ev, scrollIn, { passive: false }); });
    go.addEventListener('click', function () { leave(true); });
    D.addEventListener('pointerdown', function (e) { if (el.classList.contains('ask') && !(e.target.closest && e.target.closest('.me-mu'))) leave(true); }, true);
    var finish = function () {
      nEl.textContent = '100'; IN.p = 1;
      setTimeout(function () {
        var ask = function () { el.classList.add('ask'); };
        if (W.__meMusicTry) W.__meMusicTry(function (ok) { if (ok) leave(true); else ask(); }); else ask();
      }, 700);
      setTimeout(function () { leave(false); }, 16000);   // nobody moved: open anyway; the music starts on their first click
    };
    (function tick() {
      var t = now() - t0, lin = Math.min(1, t / MIN), p = ready && IN.ready !== false ? lin : Math.min(lin, 0.9 + 0.1 * Math.min(1, t / MAX));
      if (!W.__meIntroCanvas && t > 1500) p = Math.min(p, lin);   // no line screen (dot version): just count
      var shown = Math.floor(p * 100);
      nEl.textContent = (shown < 10 ? '00' : shown < 100 ? '0' : '') + shown; IN.p = p;
      if ((p >= 1 && ready && (IN.ready || !W.__meIntroCanvas || t > MAX)) || t >= MAX) return finish();
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
          try { H.classList.toggle('me-mu-top', f.contentDocument.documentElement.classList.contains('me-home')); } catch (e) { }
          var href = url; try { D.title = f.contentDocument.title; href = f.contentWindow.location.href; f.setAttribute('title', D.title); } catch (e) { }
          if (push) history.pushState({ me: 1 }, '', href);
          try { f.contentWindow.focus(); } catch (e) { }
          if (el) ptReveal(el); leaving = false;
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
        var el = ptMake(o.c || FG, o.fg || BG, o.t || '', o.k || '', o.ox, o.oy); ptCover(el, function () { done(el); });
      }
    };
    W.addEventListener('popstate', function () {
      if (!D.getElementById('me-frame')) return;
      var u = new URL(location.href), label = NAMES[pageKey(u)] || '';
      if (RM) return shell.load(location.href, false, null);
      var lc = FG, lf = BG; try { var fb = getComputedStyle(D.getElementById('me-frame').contentDocument.body); if (fb.backgroundColor && fb.backgroundColor !== 'rgba(0, 0, 0, 0)') { lc = fb.backgroundColor; lf = lum(lc) > 0.5 ? BG : FG; } } catch (e) { }
      var el = ptMake(lc, lf, label, '', 0.5, 0.5); ptCover(el, function () { shell.load(location.href, false, el); });
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
      // the dots spread from where you clicked (or from the link, for keyboard)
      var ox = e.clientX, oy = e.clientY;
      if (!ox && !oy) { var ar = a.getBoundingClientRect(); ox = ar.left + ar.width / 2; oy = ar.top + ar.height / 2; }
      ox = cl(ox / (H.clientWidth || W.innerWidth)); oy = cl(oy / W.innerHeight);
      if (SHELLED) { W.parent.__meShell.go(u.href, { c: c, fg: fg, t: label, k: kick, ox: ox, oy: oy }); leaving = false; return; }
      if (viaShell) { W.__meShell.go(u.href, { c: c, fg: fg, t: label, k: kick, ox: ox, oy: oy }); return; }
      var el = ptMake(c, fg, label, kick, ox, oy);
      ptCover(el, function () {
        try { st('sessionStorage', 'me-pt', JSON.stringify({ c: c, fg: fg, t: label, k: kick, ox: ox, oy: oy, ts: Date.now() })); } catch (er) { }
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
      if (e.persisted) {
        var ws = D.querySelectorAll('.me-wipe,.me-pt'); for (var i = 0; i < ws.length; i++) ws[i].remove(); H.classList.remove('pt-in', 'intro');
        // back to a page the browser kept: it dissolves in from the page you left, like any other arrival
        var lp = null; try { lp = JSON.parse(st('sessionStorage', 'me-last') || 'null'); } catch (er) { }
        if (lp && !RM) ptReveal(ptMake(lp.c, lp.fg, NAMES[pageKey(location)] || '', '', 0.5, 0.5, true));
      }
    });
    // remember this page's colour, so going back can dissolve out of it
    W.addEventListener('pagehide', function () {
      try { var b = getComputedStyle(D.body).backgroundColor; if (!b || b === 'rgba(0, 0, 0, 0)') b = getComputedStyle(H).backgroundColor; if (!b || b === 'rgba(0, 0, 0, 0)') b = FG; st('sessionStorage', 'me-last', JSON.stringify({ c: b, fg: lum(b) > 0.5 ? BG : FG, ts: Date.now() })); } catch (er) { }
    });
  }

  /* ---------- page features, once rendered ---------- */
  onBody(function () { rendered(function () { setTimeout(init, 0); }); });

  function init() {
    clock(); rows(); hero(); hs(); about(); cursor(); play(); words(); brief(); topbar(); railDot(); underline(); cards(); bridge();
    if (!EMB && !SHELLED) music();
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
    // each word leaves only once it has been read: it starts when its own line reaches the top fifth of the screen,
    // and its letters rise out behind the line one after another
    var words = [groups[0], groups[1]].map(function (g) { return { g: g, L: g.querySelectorAll('.ik'), box: g.parentNode }; }), last = '';
    var run = function () {
      var vh = W.innerHeight, key = '';
      words.forEach(function (w) {
        var top = w.box.getBoundingClientRect().top, p = cl((vh * 0.2 - top) / (vh * 0.55));
        key += p.toFixed(3);
        for (var i = 0; i < w.L.length; i++) {
          var t = cl(p * 1.4 - i * 0.06), e = t * t * (3 - 2 * t);
          w.L[i].style.transform = e ? 'translateY(' + (-e * 104).toFixed(2) + '%)' : '';
        }
      });
      last = key;
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
      var ax0 = sec.querySelector('.xp-ax,.ab-ax');
      if (ax0 && ax0.classList.contains('ab-ax') && !ax0.querySelector('.q')) { var q0 = D.createElement('i'); q0.className = 'q'; ax0.appendChild(q0); }
      S.push({ sec: sec, pin: pin, tr: tr, ax: ax0, ys: sec.querySelectorAll('.xp-ax .y'), names: sec.querySelectorAll('.xp-name'), ps: sec.querySelectorAll('.xp-p'), max: 0,
        ab: sec.classList.contains('ab-tl'), cs: [].slice.call(tr.children), lx: -1, v: 0, sk: 0 });
    }
    var measure = function () {
      H.classList.toggle('mhs-on', on());
      S.forEach(function (s) {
        if (!on()) { s.sec.style.height = ''; s.tr.style.transform = ''; s.names.forEach(function (n) { n.querySelectorAll('.xl').forEach(function (l) { l.style.transform = ''; }); }); return; }
        var pinH = s.pin.clientHeight, vw = s.pin.clientWidth;
        if (s.ax) s.ax.style.setProperty('--aw', s.ax.clientWidth);
        s.cl = s.cs.map(function (c) { return [c.offsetLeft, c.offsetWidth]; });
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
        if (s.ab && s.cl) {
          var vw0 = s.pin.clientWidth, focal = vw0 * 0.3;
          for (var c = 0; c < s.cs.length; c++) {
            var L = s.cl[c][0] - x, mid = L + s.cl[c][1] / 2;
            var f = 1 - cl(Math.abs(mid - focal) / (vw0 * 0.5)), e = cl((vw0 * 1.02 - L) / (vw0 * 0.3));
            s.cs[c].style.setProperty('--f', (f * f * (3 - 2 * f)).toFixed(3)); s.cs[c].style.setProperty('--e', (e * e * (3 - 2 * e)).toFixed(3));
          }
          if (s.lx >= 0) s.v = x - s.lx; s.lx = x;
          if (!s.lean) { s.lean = true; (function lean() {   // the run leans with scroll speed and straightens when you stop
            s.sk += (Math.max(-5, Math.min(5, -s.v * 0.12)) - s.sk) * 0.14; s.v *= 0.8;
            s.tr.style.transform = 'translate3d(' + (-s.lx).toFixed(1) + 'px,0,0) skewX(' + s.sk.toFixed(3) + 'deg)';
            if (Math.abs(s.sk) > 0.01 || Math.abs(s.v) > 0.05) requestAnimationFrame(lean); else { s.sk = 0; s.tr.style.transform = 'translate3d(' + (-s.lx).toFixed(1) + 'px,0,0)'; s.lean = false; }
          })(); }
        } else
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

  /* On repeat while designing. Starts with the site: on Home the intro asks "with sound"; elsewhere (and when the browser
     holds sound back) it starts on the visitor's first click / tap / key. The button plays and pauses; pausing is
     remembered. The YouTube player itself stays out of sight. */
  /* music (Nov 24): Nils Frahm — Says (Monolink Edit), from 0:13, served with the site so the dots can listen to it.
     An <audio> element plays it; once the browser lets sound run (first click / key), it is routed through an
     AnalyserNode and __meLevels() reports bass / mids / highs for the dot fields. Paused = silent levels. */
  function music() {
    var SRC = 'audio/says.mp3', VOL = 0.72, ART = 'Nils Frahm', SONG = 'Says (Monolink Edit)';
    var saved = null; try { saved = JSON.parse(st('sessionStorage', 'me-mu') || 'null'); } catch (e) { }
    var off = st('localStorage', 'me-mu-off') === '1';
    var wrap = D.createElement('div'); wrap.className = 'me-mu';
    if (PAGE === 'home') H.classList.add('me-mu-top');   // on Home the player takes the first box of the top bar
    wrap.innerHTML = '<button type="button" class="me-mb" aria-pressed="false"><span class="me-wv" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span><span class="me-lbl"><span class="me-t1">On repeat while designing</span><small class="me-t2"></small><span class="me-t3"></span></span></button>';
    D.body.appendChild(wrap);
    var btn = wrap.querySelector('.me-mb'), t2 = wrap.querySelector('.me-t2'), t3 = wrap.querySelector('.me-t3');
    var A = new Audio(); A.src = SRC; A.preload = 'auto'; A.loop = true; A.volume = 0; A.setAttribute('playsinline', '');
    if (saved && saved.t) { try { A.currentTime = saved.t; } catch (e) { } A.addEventListener('loadedmetadata', function () { try { if (A.currentTime < 1) A.currentTime = saved.t; } catch (e) { } }, { once: true }); }
    var state = off ? 'pause' : 'wait', fade = null, fadeMs = saved && saved.t ? 1500 : 5000, armed = false;
    var label = function () {
      t2.textContent = ART + ' — ' + SONG + (state === 'play' ? '' : state === 'wait' ? ' · plays on your first click' : ' · paused');
      t3.textContent = state === 'play' ? 'Says — ' + ART : state === 'wait' ? 'Click for sound' : 'Paused — Says';   // the one-line form in the top bar
      wrap.classList.toggle('play', state === 'play');
      btn.setAttribute('aria-pressed', state === 'play' ? 'true' : 'false');
      btn.setAttribute('aria-label', (state === 'play' ? 'Pause' : 'Play') + ' music: ' + ART + ', ' + SONG);
    };
    var ramp = function (to, ms, done) {
      clearInterval(fade); var from = A.volume, t0 = now();
      fade = setInterval(function () {
        var t = cl((now() - t0) / ms), v = from + (to - from) * (t * t * (3 - 2 * t));
        try { A.volume = Math.max(0, Math.min(1, v)); } catch (e) { }
        if (t >= 1) { clearInterval(fade); if (done) done(); }
      }, 40);
    };
    // the listening part: only connected once the audio context really runs (otherwise the element would go silent)
    var AC = W.AudioContext || W.webkitAudioContext, ctx = null, an = null, wired = false, fbuf = null, lv = { b: 0, m: 0, h: 0, a: 0, on: 0 }, lvT = 0, pk = { b: 0.3, m: 0.25, h: 0.15 };
    var wire = function () {
      if (wired || !AC) return;
      try {
        if (!ctx) ctx = new AC();
        var go2 = function () {
          if (wired || ctx.state !== 'running') return;
          var src = ctx.createMediaElementSource(A); an = ctx.createAnalyser(); an.fftSize = 1024; an.smoothingTimeConstant = 0.78;
          src.connect(an); an.connect(ctx.destination); fbuf = new Uint8Array(an.frequencyBinCount); wired = true;
        };
        if (ctx.state === 'running') go2(); else ctx.resume().then(go2).catch(function () { });
      } catch (e) { }
    };
    var band = function (a, b) { var s = 0; for (var i = a; i < b; i++) s += fbuf[i]; return s / ((b - a) * 255); };
    W.__meLevels = function () {
      var t = now(); if (t - lvT < 12) return lv; lvT = t;
      var on = state === 'play' && !A.paused;
      lv.on += ((on ? 1 : 0) - lv.on) * 0.06;   // wakes up over about a second, settles the same way
      if (wired && fbuf && on) {
        an.getByteFrequencyData(fbuf);
        var hz = ctx.sampleRate / an.fftSize, B = function (f) { return Math.max(1, Math.round(f / hz)); };
        var b = band(B(30), B(180)), m = band(B(250), B(2000)), h = band(B(3000), B(9000));
        // each band is measured against its own recent peak, so quiet passages still move
        pk.b = Math.max(b, pk.b * 0.997, 0.12); pk.m = Math.max(m, pk.m * 0.997, 0.1); pk.h = Math.max(h, pk.h * 0.997, 0.05);
        lv.b = cl(b / pk.b); lv.m = cl(m / pk.m); lv.h = cl(h / pk.h);
        lv.spec = fbuf; lv.hz = hz;
      } else { lv.b *= 0.9; lv.m *= 0.9; lv.h *= 0.9; lv.spec = null; }
      lv.a = (lv.b + lv.m + lv.h) / 3;
      return lv;
    };
    var go = function () {
      wire();
      var p; try { p = A.play(); } catch (e) { p = null; }
      if (p && p.then) p.then(function () { }).catch(function () { if (state === 'wait') arm(); });
    };
    A.addEventListener('playing', function () {
      if (state === 'pause') { A.pause(); return; }
      state = 'play'; st('localStorage', 'me-mu-off', null); label(); ramp(VOL, fadeMs); fadeMs = 1500;
    });
    A.addEventListener('error', function () { t2.textContent = ART + ' · can’t play here'; });
    var arm = function () {
      if (armed) return; armed = true;
      var g = function (e) {
        wire();   // any gesture lets the analyser start, even when the music is already playing
        if (state !== 'wait') return disarm();
        if (e.target && e.target.closest && e.target.closest('.me-mu, .mi')) return;   // those buttons decide for themselves
        go(); disarm();
      };
      var disarm = function () { ['pointerdown', 'keydown', 'touchend'].forEach(function (ev) { D.removeEventListener(ev, g, true); }); armed = false; };
      ['pointerdown', 'keydown', 'touchend'].forEach(function (ev) { D.addEventListener(ev, g, true); });
    };
    // the analyser needs one gesture even when autoplay was allowed
    var wg = function () { wire(); if (wired) ['pointerdown', 'keydown', 'touchend'].forEach(function (ev) { D.removeEventListener(ev, wg, true); }); };
    ['pointerdown', 'keydown', 'touchend'].forEach(function (ev) { D.addEventListener(ev, wg, true); });
    var pause = function () { state = 'pause'; st('localStorage', 'me-mu-off', '1'); st('sessionStorage', 'me-mu', null); label(); ramp(0, 500, function () { A.pause(); }); };
    var play = function () { state = 'wait'; st('localStorage', 'me-mu-off', null); label(); go(); };
    btn.addEventListener('click', function () { if (state === 'play') pause(); else play(); });
    W.__meMusicStart = function () { if (state === 'play') return; fadeMs = 5000; play(); };
    W.__meMusicTry = function (cb) {
      if (state === 'pause') return cb(false);
      go(); setTimeout(function () { cb(state === 'play' || !A.paused); }, 700);
    };
    W.__meMusicQuiet = function () { if (state === 'wait') arm(); };
    W.__meSaveMusic = function () { if (state !== 'play') return; try { st('sessionStorage', 'me-mu', JSON.stringify({ t: A.currentTime })); } catch (e) { } };
    W.addEventListener('pagehide', W.__meSaveMusic);
    W.__meMusicPlaying = function () { return state === 'play'; };
    label();
    if (W.__meWantSound) play();
    else if (state !== 'pause' && !doIntro) { go(); arm(); }
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

  /* Pixel fields. A band of square pixels on the grid: the cursor pushes them aside, and pointing at a word in an index
     gathers them into that word. Used twice on Home: the index band (idle = the bare grid of pixels) and the footer
     (idle = MELISA ERGANI, the contact links reshape it). */
  function pixelField(band, items, o) {
    var cv = D.createElement('canvas'); cv.setAttribute('aria-hidden', 'true'); cv.className = 'pf-cv'; band.appendChild(cv);
    var ctx = cv.getContext && cv.getContext('2d'); if (!ctx) return;
    var still = !LIVE || RM, W0 = 0, H0 = 0, dpr = 1, S = 6, P = [], N = 0, vis = false, raf = 0, mx = -1e4, my = -1e4, spec = null, sz = 1.6, cur = o.fg, calm = 0;
    var off = D.createElement('canvas'), oc = off.getContext('2d');
    var idle = o.idle ? (typeof o.idle === 'object' ? o.idle : { w: o.idle, arrow: '', c: o.fg }) : null;
    var build = function () {
      var pt = parseFloat(getComputedStyle(band).paddingTop) || 0; W0 = band.offsetWidth; H0 = band.offsetHeight - pt; dpr = Math.min(2, W.devicePixelRatio || 1);
      cv.style.top = pt + 'px';
      cv.width = Math.round(W0 * dpr); cv.height = Math.round(H0 * dpr); cv.style.width = W0 + 'px'; cv.style.height = H0 + 'px';
      S = Math.max(4.5, Math.min(7, W0 / (o.pitch || 250))); sz = Math.max(1.3, S * (o.dot || 0.3));
      var cols = Math.floor(W0 / S), rows = Math.floor(H0 / S), ox = (W0 - (cols - 1) * S) / 2, oy = (H0 - (rows - 1) * S) / 2;
      P = []; for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) { var hx = ox + x * S, hy = oy + y * S; P.push({ x: hx, y: hy, vx: 0, vy: 0, hx: hx, hy: hy, tx: hx, ty: hy, a: o.grid ? 0.42 : 0, ta: o.grid ? 0.42 : 0 }); }
      N = P.length; shape(spec || idle, true);
    };
    var font = function (fs) { oc.font = '800 ' + fs + 'px Archivo, sans-serif'; try { oc.fontStretch = 'extra-condensed'; } catch (e) { } };
    var shape = function (sp, keep) {
      spec = sp;
      if (!sp) { cur = o.fg; P.forEach(function (p) { p.tx = p.hx; p.ty = p.hy; p.ta = o.grid ? 0.42 : 0; }); kick(); return; }
      cur = sp.c || o.fg;
      off.width = Math.ceil(W0); off.height = Math.ceil(H0); oc.clearRect(0, 0, off.width, off.height);
      var fs = o.capFill ? H0 / 0.72 : H0 * 1.02; font(fs);
      var ar = sp.arrow, tw = oc.measureText(sp.w).width, aw = ar ? fs * 0.62 : 0, gap = ar ? fs * 0.25 : 0, room = W0 * (o.fit || 0.96);
      if (tw + gap + aw > room) { fs *= room / (tw + gap + aw); font(fs); tw = oc.measureText(sp.w).width; aw = ar ? fs * 0.62 : 0; gap = ar ? fs * 0.25 : 0; }
      var cap = fs * 0.72, base = (H0 + cap) / 2;
      oc.fillStyle = '#fff'; oc.textBaseline = 'alphabetic';
      var parts = (sp.w || '').split(' ');
      if (sp.lines) {   // a sentence on several lines, starting a gutter after the margin line, last line carrying the arrow
        var x0 = sp.px != null ? sp.px : W0 * (sp.x0 || 0) + (sp.x0 ? Math.max(14, Math.min(24, W.innerWidth * 0.016)) : 0), nl = sp.lines.length;
        fs = H0 / (nl * 0.72 * (sp.lh || 1.22)); font(fs);
        var aw2 = ar ? fs * 0.5 : 0, longest = Math.max.apply(null, sp.lines.map(function (l) { return oc.measureText(l).width; }));
        if (longest + aw2 * 1.4 > W0 - x0 - (sp.pr || 0)) { fs *= (W0 - x0 - (sp.pr || 0)) / (longest + aw2 * 1.4); font(fs); }
        cap = fs * 0.72; var lh = cap * (sp.lh || 1.22), top = sp.bottom ? H0 - (nl * lh - (lh - cap)) - S * 4 : (H0 - (nl * lh - (lh - cap))) / 2;
        sp.lines.forEach(function (l, i) { oc.fillText(l, x0, top + cap + i * lh); });
        if (ar) {
          var lw2 = fs * 0.09, axx = x0 + oc.measureText(sp.lines[nl - 1]).width + fs * 0.25, ayy = top + (nl - 1) * lh, aw3 = cap * 0.62;
          oc.strokeStyle = '#fff'; oc.lineWidth = lw2; oc.lineCap = 'square'; oc.beginPath();
          oc.moveTo(axx + aw3 / 2, ayy + lw2); oc.lineTo(axx + aw3 / 2, ayy + cap - lw2); oc.moveTo(axx + lw2, ayy + cap * 0.58); oc.lineTo(axx + aw3 / 2, ayy + cap - lw2); oc.lineTo(axx + aw3 - lw2, ayy + cap * 0.58); oc.stroke();
          ar = '';
        }
      } else if (o.split && !ar && parts.length === 2) {   // like the footer's name: first word on the left edge, second on the right
        var w1 = oc.measureText(parts[0]).width, w2 = oc.measureText(parts[1]).width;
        if (w1 + w2 > W0 * 0.97) { fs *= W0 * 0.97 / (w1 + w2); font(fs); cap = fs * 0.72; base = (H0 + cap) / 2; w1 = oc.measureText(parts[0]).width; w2 = oc.measureText(parts[1]).width; }
        oc.fillText(parts[0], 0, base); oc.fillText(parts[1], W0 - w2, base);
      } else oc.fillText(sp.w, 0, base);
      if (ar) {
        var ax = W0 - aw * 0.95, ay = base - cap, lw = fs * 0.11;
        oc.strokeStyle = '#fff'; oc.lineWidth = lw; oc.lineCap = 'square'; oc.beginPath();
        if (ar === 'up') { var mx2 = ax + aw / 2; oc.moveTo(mx2, ay + cap - lw); oc.lineTo(mx2, ay + lw); oc.moveTo(ax + lw, ay + aw * 0.42); oc.lineTo(mx2, ay + lw); oc.lineTo(ax + aw - lw, ay + aw * 0.42); }
        else { oc.moveTo(ax + lw, ay + cap - lw); oc.lineTo(ax + aw - lw, ay + lw); oc.moveTo(ax + aw * 0.28, ay + lw); oc.lineTo(ax + aw - lw, ay + lw); oc.lineTo(ax + aw - lw, ay + cap * 0.72); }
        oc.stroke();
      }
      var data = oc.getImageData(0, 0, off.width, off.height).data, T = [];
      for (var y = S / 2; y < H0; y += S) for (var x = S / 2; x < W0; x += S) { if (data[(Math.floor(y) * off.width + Math.floor(x)) * 4 + 3] > 120) T.push([x, y]); }
      var order = P.slice().sort(function (a, b) { return a.hx - b.hx || a.hy - b.hy; });
      T.sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
      var M = Math.min(T.length, N);
      order.forEach(function (p) { p.ta = 0; p.tx = p.hx; p.ty = p.hy + (Math.random() - 0.5) * S * 2; });
      for (var t = 0; t < M; t++) { var p = order[Math.floor(t * N / M)]; p.tx = T[t][0]; p.ty = T[t][1]; p.ta = 1; if (!keep && !still) { p.vx += (Math.random() - 0.5) * 9; p.vy += (Math.random() - 0.5) * 9; } }
      kick();
    };
    var hist = o.music ? new Float32Array(240) : null, hi0 = 0, LVL = null, t0 = now();
    var draw = function () {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W0, H0);
      var lo = [], hi = [];
      for (var i = 0; i < N; i++) { var p = P[i]; if (p.a < 0.04) continue; (p.a > 0.7 ? hi : lo).push(p); }
      var s2 = sz * (o.big || 1.45);
      if (o.music) {
        // the same dots, listening: asleep they only breathe; with the song the bass sends rings out from the name's
        // first letter (each dot hears it a moment later the further away it is), the highs make the letters shiver
        var L = LVL = LV() || { b: 0, h: 0, on: 0 }, on = L.on || 0, tt = (now() - t0) / 1000;
        hist[hi0 = (hi0 + 1) % hist.length] = (L.b || 0) * on;
        var ox = o.origin ? o.origin[0] : 0, oy = o.origin ? o.origin[1] : H0 / 2;
        // the whole grid stays (the name is raised out of it, not cut from it); it parts around the cursor like the index
        var RR = Math.max(60, Math.min(110, W0 * 0.07));
        ctx.fillStyle = o.dim;
        for (var a = 0; a < N; a++) {
          var q = P[a], gx = q.hx, gy = q.hy, d = Math.hypot(gx - ox, gy - oy), lag = Math.min(hist.length - 1, Math.floor(d / 7)), bb = hist[(hi0 - lag + hist.length) % hist.length];
          var dmx = gx - mx, dmy = gy - my, dm = Math.hypot(dmx, dmy);
          if (dm < RR) { var fm = (1 - dm / RR); fm *= fm; gx += dmx / (dm || 1) * fm * S * 1.1; gy += dmy / (dm || 1) * fm * S * 1.1; }
          var br = 0.14 * Math.sin(tt * 0.7 + q.hx * 0.01 + q.hy * 0.013), sk = Math.min(S * 0.56, sz * (1 + br + bb * bb * 0.6));
          ctx.fillRect(gx - sk / 2, gy - sk / 2, sk, sk);
        }
        var jit = (L.h || 0) * on * S * 0.16, pulse = 1 + hist[hi0] * 0.25;
        s2 *= pulse;
        // relief: each raised dot casts a short shadow down-right and catches light on its top-left edge
        if (o.relief) {
          var sh = Math.max(1.5, s2 * 0.7);
          ctx.fillStyle = 'rgba(0,0,0,.85)'; for (var c = 0; c < hi.length; c++) ctx.fillRect(hi[c].x - s2 / 2 + sh, hi[c].y - s2 / 2 + sh, s2, s2);
        }
        ctx.fillStyle = cur;
        for (var b = 0; b < hi.length; b++) { var jx = jit ? (Math.random() - 0.5) * jit : 0, jy = jit ? (Math.random() - 0.5) * jit : 0; ctx.fillRect(hi[b].x - s2 / 2 + jx, hi[b].y - s2 / 2 + jy, s2, s2); }
        return;
      }
      ctx.fillStyle = o.dim; for (var a2 = 0; a2 < lo.length; a2++) ctx.fillRect(lo[a2].x - sz / 2, lo[a2].y - sz / 2, sz, sz);
      if (o.relief) { ctx.fillStyle = 'rgba(0,0,0,.72)'; var sh2 = s2 * 0.55; for (var c2 = 0; c2 < hi.length; c2++) ctx.fillRect(hi[c2].x - s2 / 2 + sh2, hi[c2].y - s2 / 2 + sh2, s2, s2); }
      ctx.fillStyle = cur; for (var b2 = 0; b2 < hi.length; b2++) ctx.fillRect(hi[b2].x - s2 / 2, hi[b2].y - s2 / 2, s2, s2);
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
    var loop = function () { var mv = step(); draw(); calm = mv ? 0 : calm + 1; raf = (vis && !D.hidden && (calm < 20 || mx > -1e3 || o.music)) ? requestAnimationFrame(loop) : 0; };
    var kick = function () { if (!raf && (vis || still)) raf = requestAnimationFrame(loop); };
    var hit = o.hit || band;
    hit.addEventListener('pointermove', function (e) { var r = cv.getBoundingClientRect(), k = r.width ? W0 / r.width : 1; mx = (e.clientX - r.left) * k; my = (e.clientY - r.top) * k; kick(); }, { passive: true });
    hit.addEventListener('pointerleave', function () { mx = my = -1e4; kick(); });
    var leaveT = 0, active = null;
    Array.prototype.forEach.call(items, function (it) {
      var sp = { w: it.getAttribute('data-w'), arrow: it.getAttribute('data-arrow') || (it.tagName === 'A' ? 'ne' : ''), c: it.getAttribute('data-c') || o.fg };
      var on = function () { clearTimeout(leaveT); if (active !== it) { active = it; Array.prototype.forEach.call(items, function (x) { x.classList.toggle('on', x === it); }); shape(sp); } };
      var offf = function () { leaveT = setTimeout(function () { it.classList.remove('on'); active = null; shape(idle); }, 180); };
      it.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') on(); });
      it.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') offf(); });
      it.addEventListener('focus', on); it.addEventListener('blur', offf);
      var since = 0; it.addEventListener('focus', function () { since = now(); });
      if (it.tagName === 'BUTTON') it.addEventListener('click', function () { if (active === it && now() - since > 400) { it.classList.remove('on'); active = null; shape(idle); } else on(); });
    });
    var start = function () {
      build();
      new IntersectionObserver(function (es) { vis = es[0].isIntersecting; if (vis) kick(); }, { threshold: 0 }).observe(band);
      kick();
    };
    try { D.fonts.load('800 80px Archivo').then(start, start); } catch (e) { start(); }
    var rt; W.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { build(); kick(); }, 150); });
    return { setIdle: function (sp) { idle = sp; if (!active) shape(idle); }, busy: function () { return !!active; } };
  }

  /* landing, line version (Nov 24, matched to her reference; scroll added the same night). A screen of fine vertical
     lines in the footer's lavender; the name is set in coarse pixels (two lines to a pixel) and shows where the lines
     thicken. It steps sideways and passes through a slow moving light; with the music it keeps time and every line
     carries its own slice of the spectrum; the cursor pushes pixels aside.
     Scrolling, the screen does not leave: it is fixed behind the page. The name rises slower than the page and breaks
     back into plain lines, pixel by pixel, while the black settles into the page colour, so the lines become the
     background of the statement. Then each keyword of the statement surfaces from the same lines (cells thicken in an
     uneven order, lit by the same light) and sinks back as the sentence moves on. (?hero=dots: the dot version.) */
  function lineHero(hb, x0, pr) {
    var host = hb.closest('.mainc') || D.body;
    var cv = D.createElement('canvas'); cv.setAttribute('aria-hidden', 'true'); cv.className = 'me-lf'; host.insertBefore(cv, host.firstChild);
    var x = cv.getContext('2d'); if (!x) return;
    var off = D.createElement('canvas'), oc = off.getContext('2d');
    var dpr = Math.min(2, W.devicePixelRatio || 1), W0 = 0, H0 = 0, TOP = 56, P = 0, K = 2, G = 0, COL = '142,107,255', ph = null, cols = 0, colX = [], gc = 0, gr = 0;
    var NM = null, BM = null, ngr = 0, split = 0, I = null, ORD = null, gx0 = 0, IN = W.__meIntro || null, tr0 = now();
    W.__meIntroCanvas = true; H.classList.add('me-lfon');
    var DPm = null, PCm = null, pcN = -1, pcF = 0, pcX = 0, pcB = 0;
    var vis = true, raf = 0, mx = -1e4, my = -1e4, still = !LIVE || RM, t0 = now(), tm = 0, lastT = now(), lastStep = 0, avg = 0, prevB = 0, sh = [0, 0], LIT = 0;
    var stw = D.querySelector('[data-inkroot] .stw'), sts = stw && stw.querySelector('.sts');
    var font = function (fs) { oc.font = '800 ' + fs + 'px Archivo, sans-serif'; try { oc.fontStretch = 'extra-condensed'; } catch (e) { } };
    // draw some text offscreen and read it back as coarse pixels on the line grid
    var cells = function (rowsN, paint, thr) {
      oc.clearRect(0, 0, off.width, off.height); oc.fillStyle = '#fff'; oc.textBaseline = 'alphabetic'; paint();
      var d = oc.getImageData(0, 0, off.width, off.height).data, ow = off.width, oh = off.height, M = new Uint8Array(gc * rowsN);
      for (var gy = 0; gy < rowsN; gy++) for (var gx = 0; gx < gc; gx++) {
        var px0 = gx0 - G + gx * G, py0 = gy * G, hit = 0, n = 0;
        for (var sy = 0.2; sy < 1; sy += 0.2) for (var sx = 0.2; sx < 1; sx += 0.2) {
          var px = Math.floor(px0 + sx * G), py = Math.floor(py0 + sy * G); n++;
          if (px >= 0 && px < ow && py < oh && d[(py * ow + px) * 4 + 3] > 120) hit++;
        }
        M[gy * gc + gx] = hit / n > (thr || 0.4) ? 1 : 0;
      }
      return M;
    };
    var build = function () {
      TOP = 0; W0 = H.clientWidth || W.innerWidth; H0 = W.innerHeight - TOP; var hbH = hb.offsetHeight;
      if (!W0 || !H0 || !hbH) return;
      cv.width = Math.round(W0 * dpr); cv.height = Math.round(H0 * dpr); cv.style.width = W0 + 'px'; cv.style.height = H0 + 'px';
      var g = strips(), cw = (g.xs[2] - g.xs[1]) || W0 / 4, small = W.innerWidth < 640;
      P = cw / Math.max(K * 3, Math.round(cw / (small ? 7 : 10) / K) * K);   // a whole number of pixels, and of lines, per grid column
      G = P * K; gx0 = g.rule % G;
      colX = []; for (var cx = gx0 + P / 2 - G; cx < W0 + G; cx += P) colX.push(cx); cols = colX.length;
      gc = Math.ceil(cols / K); gr = Math.ceil(H0 / G) + 1; ngr = Math.ceil(hbH / G);
      ph = new Float32Array(cols * 3); for (var pi = 0; pi < cols; pi++) { ph[pi * 3] = hash(pi, 1) * 6.283; ph[pi * 3 + 1] = 0.6 + hash(pi, 2) * 1.8; ph[pi * 3 + 2] = hash(pi, 3); }
      off.width = Math.ceil(W0); off.height = Math.ceil(Math.max(H0, hbH));
      // the name, on the hero band
      var lines = ['MELISA', 'ERGANI'], lhk = 1.2, room = small ? W0 - x0 - pr - G * 3 : Math.min(W0 * 0.68 - x0, W0 - x0 - pr), fs = hbH * 0.72 / (2 * 0.72 * lhk); font(fs);   // (Nov 24) up to about a third from the top, two thirds across
      var longest = Math.max.apply(null, lines.map(function (l) { return oc.measureText(l).width; }));
      if (longest > room) { fs *= room / longest; font(fs); }
      var cap = fs * 0.72, lh = cap * lhk, top = hbH - (2 * lh - (lh - cap)) - G * 2;
      NM = cells(ngr, function () { font(fs); lines.forEach(function (l, i) { oc.fillText(l, x0, top + cap + i * lh); }); });
      // the intro's name: the same, bigger (as much of the screen as it can take), on the same baseline
      // the intro: "DESIGN PORTFOLIO" over the loading percentage, both in the screen's pixels, in the bottom-left corner
      var roomB = W0 - x0 - pr - (small ? G * 2 : 0);
      pcF = hbH * (small ? 0.26 : 0.34) / 0.72; font(pcF); var wP = oc.measureText('100%').width; if (wP > roomB) pcF *= roomB / wP;
      pcX = x0; pcB = hbH - G * 2;
      // big enough that the pixels can draw its letters (eight pixels tall at least); on phones, two lines
      var dL = ['DESIGN', 'PORTFOLIO'], dF = Math.max(hbH * 0.11, G * 7) / 0.72; font(dF);
      var wD = Math.max.apply(null, dL.map(function (l) { return oc.measureText(l).width; })); if (wD > roomB) dF *= roomB / wD;
      var dCap = dF * 0.72, dLh = dCap * 1.3, dB = pcB - pcF * 0.72 - G * 3 - (dL.length - 1) * dLh;
      DPm = cells(ngr, function () { font(dF); dL.forEach(function (l, i) { oc.fillText(l, x0, dB + i * dLh); }); }, 0.28);
      pcN = -1;
      split = Math.round((top + cap + (lh - cap) / 2) / G);
      I = new Float32Array(gc * gr);
      ORD = new Float32Array(gc * gr);
      for (var k = 0; k < ORD.length; k++) { var cx2 = k % gc, cy2 = Math.floor(k / gc); ORD[k] = 0.55 * hash(cx2 + 7, cy2 + 3) + 0.45 * (0.5 + 0.5 * Math.sin(cx2 * 0.17 + cy2 * 0.23)); }
      if (IN) IN.ready = true;
    };
    // the statement's keywords: each one, as it lights, is lit from within the lines behind it
    var kws = [].slice.call(D.querySelectorAll('[data-inkroot] .stmt .kw')), KS = kws.map(function () { return { e: 0, fl: 0, lit: false }; });
    var frame = function () {
      raf = 0; if (!W0 || !NM) return;
      // where the page is: the hero leaving (p0) and the statement's own progress (ta, as the sentence assembles)
      var hr = hb.getBoundingClientRect(), p0 = cl((TOP - hr.top) / (hr.height * 0.85)), ta = -1, gone = false;
      if (stw && sts) {
        var wr = stw.getBoundingClientRect(), stT = parseFloat(getComputedStyle(sts).top) || 0, span = Math.max(1, stw.offsetHeight - sts.offsetHeight);
        ta = (stT - wr.top) / (span * 0.495);
        gone = wr.bottom < TOP;
      }
      cv.style.visibility = gone ? 'hidden' : '';
      if (gone) { raf = 0; return; }
      var t = now(), L = LV() || { b: 0, m: 0, h: 0, a: 0, on: 0 }, on = still ? 0 : (L.on || 0);
      // Nov 24: the screen moves only with the music. Its clock runs at the music's pace, so pausing slows everything
      // to a stop and the name settles, whole and still, in its place; playing picks it up where it stopped.
      tm += Math.min(0.05, (t - lastT) / 1000) * on; lastT = t; var tt = tm;
      var bnow = L.b || 0, flux = bnow - prevB; prevB = bnow; avg += (bnow - avg) * 0.04;
      var beat = on > 0.3 && (flux > 0.09 || bnow > avg * 1.3) && bnow > 0.45 && t - lastStep > 260;
      if (on < 0.3) { sh[0] = 0; sh[1] = 0; }
      else if (p0 < 1 && (beat || t - lastStep > 1400)) {
        lastStep = t;
        var b = Math.random() < 0.5 ? 0 : 1, nv = sh[b];
        while (nv === sh[b]) nv = Math.round((Math.random() * 2 - 1) * 3);
        sh[b] = nv; if (Math.random() < 0.35) sh[1 - b] = 0;
        if (beat) LIT = 1;
      }
      LIT *= 0.9;
      x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, W0, H0);
      if (IN && IN.phase !== 'done') return introFrame(t);
      // the black of the hero settles into the page colour
      var e0 = sm(p0);
      if (e0 < 1) { x.fillStyle = 'rgba(3,3,4,' + (1 - e0).toFixed(3) + ')'; x.fillRect(0, Math.max(0, hr.bottom - TOP > H0 ? 0 : 0), W0, H0); }
      // the lines: their own slow pulse, their slice of the spectrum; quieter once they are the background
      var spec = L.spec, hz = L.hz || 43, LS = W.__meLS || (W.__meLS = new Float32Array(4096)), bgK = 1 - 0.45 * e0;
      for (var c = 0; c < cols; c++) {
        var lv = 0;
        if (spec && on > 0.01) { var fq = 40 * Math.pow(300, (c % 97) / 97), bi = Math.min(spec.length - 1, Math.round(fq / hz)); lv = spec[bi] / 255; lv *= lv; }
        LS[c] = lv;
        var pul = 0.5 + on * 0.5 * Math.sin(tt * ph[c * 3 + 1] + ph[c * 3]), a0 = (0.26 + 0.2 * pul + on * lv * 0.4) * bgK;
        x.fillStyle = 'rgba(' + COL + ',' + a0.toFixed(3) + ')';
        x.fillRect(colX[c] - 0.5, 0, 1 + on * lv * 1.2, H0);
      }
      // the name rides up at 60% of the page's speed, in whole pixels
      var rowOff = Math.round((hr.top - TOP) * 0.6 / G), KR = [];
      if (ta > -0.4 && ta < 1.6) kws.forEach(function (el, i) {
        var o = parseFloat(el.style.opacity || getComputedStyle(el).opacity) || 0, ks = KS[i], on2 = cl((o - 0.38) / 0.6);
        if (on2 > 0.9 && !ks.lit) { ks.lit = true; ks.fl = 1; } else if (on2 < 0.5) ks.lit = false;
        ks.fl *= 0.965;
        var settle = 1 - sm(cl((ta - 0.6) / 0.25));   // once the words take their places in the sentence, the lines let go
        var tg = (0.12 + 0.5 * on2 + 0.7 * ks.fl) * settle * cl((ta + 0.3) / 0.3);
        ks.e += (tg - ks.e) * 0.12;
        if (ks.e < 0.01) return;
        var r = el.getBoundingClientRect(), padX = r.height * 0.5, padY = r.height * 0.35;
        KR.push({ x0: (r.left - padX - gx0 + G) / G, x1: (r.right + padX - gx0 + G) / G, y0: (r.top - padY - TOP) / G, y1: (r.bottom + padY - TOP) / G, e: ks.e });
      });
      var moved = 0, R = Math.max(110, Math.min(200, W0 * 0.12)), mgx = (mx - gx0 + G) / G, mgy = my / G, Rg = R / G;
      for (var gy = 0; gy < gr; gy++) {
        var ny = gy - rowOff, s0 = sh[ny < split ? 0 : 1];
        for (var gx = 0; gx < gc; gx++) {
          var k = gy * gc + gx, od = ORD[k], tgt = 0;
          var field = 1 + on * (-0.5 + 0.5 * Math.sin(gx * 0.23 - tt * 2.5 + Math.sin(gy * 0.19 + tt * 0.5) * 1.6));   // still: evenly lit
          if (p0 < 1 && ny >= 0 && ny < ngr) {
            var sx = gx - s0, sy = ny, push = 0;
            var ddx = (gx + 0.5 - mgx) / Rg, ddy = (gy + 0.5 - mgy) / Rg, dd = Math.sqrt(ddx * ddx + ddy * ddy);
            if (dd < 1 && on > 0.05) { push = (1 - dd) * on; var st2 = push * 2.4; sx -= Math.round(ddx / (dd || 1) * st2); sy -= Math.round(ddy / (dd || 1) * st2 * 1.6); }
            if (sx >= 0 && sx < gc && sy >= 0 && sy < ngr && NM[sy * gc + sx]) {
              var keep = 1 - sm(cl((p0 * 1.25 - od * 0.6) / 0.4));   // pixel by pixel, in an uneven order, back into lines
              tgt = Math.min(1, (0.5 + 0.5 * field) * (1 + LIT * on * 0.6) + push * 0.8) * keep;
            }
          }
          for (var w2 = 0; w2 < KR.length; w2++) {
            var kr = KR[w2]; if (gx + 1 < kr.x0 || gx > kr.x1 || gy + 1 < kr.y0 || gy > kr.y1) continue;
            // a soft-edged plate of thickened lines behind the word: strongest at its middle, uneven at its edges
            var ux = Math.min(gx + 0.5 - kr.x0, kr.x1 - gx - 0.5) / Math.max(1, (kr.x1 - kr.x0) * 0.5), uy = Math.min(gy + 0.5 - kr.y0, kr.y1 - gy - 0.5) / Math.max(1, (kr.y1 - kr.y0) * 0.5);
            var edge = sm(cl(Math.min(ux, uy) * 1.8 + 0.15 - od * 0.75));
            tgt = Math.max(tgt, Math.min(0.6, kr.e * edge * (0.6 + 0.4 * field) * (1 + LIT * on * 0.4)));
          }
          var dI = (tgt - I[k]) * (tgt > I[k] ? 0.3 : 0.18); I[k] += dI; if (dI > moved || -dI > moved) moved = dI < 0 ? -dI : dI;
          var v = I[k]; if (v < 0.04) continue;
          for (var j = 0; j < K; j++) {
            var ci = gx * K + j; if (ci >= cols) break;
            var q0 = ph[ci * 3], q1 = ph[ci * 3 + 1], hv = hash(ci, gy);
            var n = 0.55 + 0.25 * Math.sin(tt * (1.3 + q1 * 1.7) + q0 + gy * 0.9) + 0.2 * Math.sin(tt * (3.1 + hv * 4) + hv * 9);
            n = 0.82 + on * (n * 0.55 + 0.45 * Math.min(1, LS[ci] * 1.6 + 0.2) - 0.82);   // still: every line at one steady width
            var e = v * Math.max(0.3, n), wd = 1.2 + e * (P * 0.8 - 1.2);
            if (e < 0.08) continue;
            x.fillStyle = 'rgba(' + COL + ',' + Math.min(1, 0.5 + e * 1.1).toFixed(3) + ')';
            x.fillRect(colX[ci] - wd / 2, gy * G, wd, G + 0.5);
          }
        }
      }
      if (vis && !D.hidden && !still && (on > 0.001 || moved > 0.002 || KR.length || (W.__meMusicPlaying && W.__meMusicPlaying()))) raf = requestAnimationFrame(frame);
      else if (!still) setTimeout(kick, 400);   // asleep: look again for the music now and then
    };
    // intro text in greyish white; leaving, every pixel of it travels (in whole pixels, so it stays on the line grid)
    // to a pixel of the landing's name, and turns lavender as it lands: one text melting into the other
    var MV = null;
    var morph = function () {
      var src = [], dst = [], k;
      for (k = 0; k < gc * ngr; k++) { if (I[k] > 0.3 && (DPm[k] || (PCm && PCm[k]))) src.push(k); if (NM[k]) dst.push(k); }
      if (!src.length || !dst.length) return [];
      var key = function (k) { return (k % gc) * 4096 + Math.floor(k / gc); };
      src.sort(function (a, b) { return key(a) - key(b); }); dst.sort(function (a, b) { return key(a) - key(b); });
      var M = Math.max(src.length, dst.length), out = [];
      for (var m = 0; m < M; m++) {
        var a = src[Math.floor(m * src.length / M)], b = dst[Math.floor(m * dst.length / M)];
        out.push({ ax: a % gc, ay: Math.floor(a / gc), bx: b % gc, by: Math.floor(b / gc), d: hash(m, 5) * 0.3 + 0.1 * (b % gc) / gc, v: I[a] });
      }
      return out;
    };
    var introFrame = function (t) {
      var tr = (t - tr0) / 1000, p = IN.p || 0, leaving = IN.phase === 'leave', tl = leaving ? cl((t - IN.t0) / 1900) : 0;
      if (tl >= 1) {
        for (var k0 = 0; k0 < I.length; k0++) I[k0] = (Math.floor(k0 / gc) < ngr && NM[k0]) ? 1 : 0;   // hand over without a seam
        IN.phase = 'done'; W.__meIntro = null; IN = null; MV = null; raf = requestAnimationFrame(frame); return;
      }
      x.fillStyle = '#030304'; x.fillRect(0, 0, W0, H0);
      for (var c = 0; c < cols; c++) {
        var pul = 0.5 + 0.5 * Math.sin(tr * ph[c * 3 + 1] + ph[c * 3]);
        x.fillStyle = 'rgba(' + COL + ',' + (0.22 + 0.2 * pul).toFixed(3) + ')'; x.fillRect(colX[c] - 0.5, 0, 1, H0);
      }
      var fr = Math.floor(tr * 9), pn = Math.floor(p * 100);
      var lines = function (gx, gy, v, r, g, b, tt) {   // one pixel: K lines of their own widths
        x.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
        for (var j = 0; j < K; j++) {
          var ci = gx * K + j; if (ci < 0 || ci >= cols) continue;
          var hv = hash(ci, gy), n = 0.62 + 0.24 * Math.sin(tt * (1.6 + hv * 2.4) + hv * 9) + 0.14 * Math.sin(tt * 4.1 + ph[ci * 3]);
          var e = v * n, wd = 1.2 + e * (P * 0.8 - 1.2); if (e < 0.08) continue;
          x.globalAlpha = Math.min(1, 0.45 + e * 1.1); x.fillRect(colX[ci] - wd / 2, gy * G, wd, G + 0.5);
        }
      };
      if (!leaving) {
        if (pn !== pcN) { pcN = pn; PCm = cells(ngr, function () { font(pcF); oc.fillText(pn + '%', pcX, pcB); }); }   // the number, redrawn as it counts
        for (var gy = 0; gy < Math.min(gr, ngr); gy++) for (var gx = 0; gx < gc; gx++) {
          var k = gy * gc + gx, od = ORD[k], on1 = (DPm[k] && od < p * 1.4 + 0.15) || (PCm && PCm[k]);
          var tgt = on1 ? 1 : 0, dI = (tgt - I[k]) * (tgt > I[k] ? 0.4 : 0.5); I[k] += dI;
          var v = I[k]; if (v < 0.04) continue;
          // glimmer in greys: a slow band of light crosses the letters, single pixels flare white
          var gl = 0.5 + 0.5 * Math.sin(gx * 0.16 - gy * 0.11 - tr * 2.4), flare = hash(gx * 3 + fr, gy * 7 - fr) > 0.986;
          var lum = flare ? 255 : Math.round(150 + 94 * gl * gl);
          lines(gx, gy, v * (0.62 + 0.38 * gl), lum, lum, Math.max(0, lum - 4), tr);
        }
      } else {
        if (!MV) MV = morph();
        var lv = [142, 107, 255];
        for (var m = 0; m < MV.length; m++) {
          var q = MV[m], u = cl((tl * 1.25 - q.d) / 0.85), e2 = u * u * (3 - 2 * u);
          var px = Math.round(q.ax + (q.bx - q.ax) * e2), py = Math.round(q.ay + (q.by - q.ay) * e2 - Math.sin(Math.PI * e2) * 2);   // a slight lift on the way
          var lum2 = 225 - 20 * Math.sin(Math.PI * e2), ck = sm(cl((u - 0.35) / 0.55));
          var r = Math.round(lum2 + (lv[0] - lum2) * ck), g2 = Math.round(lum2 + (lv[1] - lum2) * ck), b2 = Math.round(lum2 - 4 + (lv[2] - lum2 + 4) * ck);
          lines(px, py, (q.v + (1 - q.v) * e2) * (0.75 + 0.25 * e2), r, g2, b2, tr);
        }
      }
      x.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    };
    var kick = function () { if (!raf) raf = requestAnimationFrame(frame); };
    W.addEventListener('pointermove', function (e) { if (e.pointerType !== 'mouse') return; mx = e.clientX; my = e.clientY - TOP; }, { passive: true });
    D.addEventListener('pointerleave', function () { mx = my = -1e4; });
    W.addEventListener('scroll', kick, { passive: true });
    D.addEventListener('visibilitychange', kick);
    var start = function () { build(); kick(); };
    try { D.fonts.load('800 80px Archivo').then(start, start); } catch (e) { start(); }
    var rt; W.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(start, 200); });
  }

  /* index links to the category cards (Nov 24): the cards are sticky, so a plain #c-… jump lands where they pile up
     (on the last one). Go to each card's own place in the run instead. */
  function cardJump() {
    D.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#c-"]'); if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey) return;
      var id = a.getAttribute('href').slice(1), cs = [].slice.call(D.querySelectorAll('.cc-card')), i = cs.map(function (c) { return c.id; }).indexOf(id), sec = D.querySelector('.cc');
      if (i < 0 || !sec) return;
      e.preventDefault();
      var step = cs[0].offsetHeight + (parseFloat(getComputedStyle(cs[0]).marginBottom) || 0);
      var y = sec.getBoundingClientRect().top + W.scrollY + (parseFloat(getComputedStyle(sec).paddingTop) || 0) + i * step + W.innerHeight * 0.34;
      W.scrollTo({ top: y, behavior: RM ? 'auto' : 'smooth' });
      try { history.replaceState(history.state, '', '#' + id); } catch (er) { }
    });
  }

  function words() {
    cardJump();
    var sec = D.querySelector('.pf');
    // cards that have faded out (the last one sinks away over the index) stop catching the pointer
    var ccs = Array.prototype.map.call(D.querySelectorAll('.cc-card'), function (c) { return [c, c.querySelector('.cc-in')]; });
    if (ccs.length) { var pe = function () { ccs.forEach(function (x) { var o = x[1] ? parseFloat(x[1].style.opacity || '1') : 1; x[0].style.pointerEvents = o < 0.15 ? 'none' : ''; }); }; var mo = new MutationObserver(pe); ccs.forEach(function (x) { if (x[1]) mo.observe(x[1], { attributes: true, attributeFilter: ['style'] }); }); pe(); }
    if (sec) {
      var bd = sec.querySelector('.pf-band'), ls = sec.querySelector('.pf-ls');
      var api = pixelField(bd, sec.querySelectorAll('.pf-i'), { fg: FG, dim: 'rgba(244,243,239,.4)', grid: true });
      // the band zooms in as it arrives (from far away, out of the dark) and pushes past you as you leave for the footer
      if (LIVE && !RM) {
        var zl = '';
        var zoom = function () {
          var vh = W.innerHeight, r = sec.getBoundingClientRect(), b = bd.getBoundingClientRect();
          var p = cl((vh - r.top) / (vh * 0.85)), e = 1 - Math.pow(1 - p, 3);
          var q = cl((vh * 0.3 - (r.top + bd.offsetTop + bd.offsetHeight)) / (vh * 0.6)), f = q * q;
          var s = (0.5 + 0.5 * e) * (1 + 0.35 * f), o = Math.min(0.45 + 0.55 * e, 1 - 0.85 * f);
          var key = s.toFixed(3) + o.toFixed(3); if (key === zl) return; zl = key;
          bd.style.transform = 'scale(' + s.toFixed(4) + ')'; bd.style.opacity = o.toFixed(3);
          if (ls) { ls.style.opacity = cl(p * 1.6 - 0.6).toFixed(3); ls.style.transform = 'translateY(' + ((1 - cl(p * 1.6 - 0.6)) * 40).toFixed(1) + 'px)'; }
        };
        W.addEventListener('scroll', zoom, { passive: true }); W.addEventListener('resize', zoom); zoom();
      }
    }
    // Home landing (Nov 24): the index's own dot field, full screen, the name standing out of it in relief, big and
    // left-aligned on the margin line; it listens to the music (see pixelField's music option)
    var hb = D.querySelector('.me-pfb');
    if (hb) {
      var hg = strips(), hx = W.innerWidth < 640 ? hg.pad : hg.rule + Math.max(14, Math.min(24, W.innerWidth * 0.016));
      if (!/[?&]hero=dots/.test(location.search)) lineHero(hb, hx, hg.pad);
      else pixelField(hb, [], { fg: FG, dim: 'rgba(244,243,239,.24)', grid: true, idle: { w: 'MELISA ERGANI', lines: ['MELISA', 'ERGANI'], px: hx, pr: hg.pad, lh: 1.12, bottom: true, c: FG }, relief: true, music: true, origin: [hx, hb.offsetHeight * 0.55], hit: D.getElementById('top'), big: 1.5 });
    }
    // Home footer: the name in pixels, ink on lavender; its contact links reshape it
    var wm = D.querySelector('footer .wmark');
    if (wm) {
      var ft = wm.closest('footer');
      var its = [];
      var mail = ft.querySelector('.fmail a'); if (mail) { mail.setAttribute('data-w', 'EMAIL'); its.push(mail); }
      Array.prototype.forEach.call(ft.querySelectorAll('a.crow'), function (a) { var t = /linkedin/i.test(a.href) ? 'LINKEDIN' : /behance/i.test(a.href) ? 'BEHANCE' : ''; if (t) { a.setAttribute('data-w', t); its.push(a); } });
      Array.prototype.forEach.call(ft.querySelectorAll('a'), function (a) { if (/back to top/i.test(a.textContent)) { a.setAttribute('data-w', 'BACK TO TOP'); a.setAttribute('data-arrow', 'up'); its.push(a); } });
      wm.classList.add('pf-on');
      pixelField(wm, its, { fg: '#121316', dim: 'rgba(18,19,22,.22)', grid: false, idle: 'MELISA ERGANI', split: true, capFill: true, fit: 1, hit: ft, pitch: 260, dot: 0.34, big: 1.55 });
    }
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

  /* the top bar steps out of the way while reading down and over the work cards, and returns on any scroll up */
  function topbar() {
    var nav = Array.prototype.filter.call(D.querySelectorAll('nav[aria-label="Main"]'), function (x) { return !x.closest('x-dc'); })[0]; if (!nav) return;
    // everything in the bar starts a gutter after a grid line: the page label after the margin line, the links on the last columns
    var row = nav.firstElementChild, left = row && row.children[0], links = nav.querySelector('.mainnav');
    var lab = left && left.children[1], btn = left && left.querySelector('button');
    var align = function () {
      var g = strips(), gut = Math.round(Math.max(14, Math.min(24, W.innerWidth * 0.016))), n = g.xs.length - 2, as = links ? links.querySelectorAll('a') : [];
      var put = function (el, x) { if (!el) return; el.style.position = 'absolute'; el.style.left = Math.round(x) + 'px'; el.style.top = '50%'; el.style.transform = 'translateY(-50%)'; el.style.margin = '0'; };
      var clear = function (el) { if (el) { el.style.position = el.style.left = el.style.top = el.style.transform = el.style.margin = ''; } };
      if (n < 4) { [lab, btn].concat(Array.prototype.slice.call(as)).forEach(clear); if (lab) lab.style.maxWidth = lab.style.whiteSpace = lab.style.overflow = ''; return; }
      put(lab, g.xs[1] + gut);
      if (lab) { lab.style.whiteSpace = 'nowrap'; lab.style.overflow = 'hidden'; lab.style.textOverflow = 'ellipsis'; lab.style.maxWidth = (btn && n < 6 ? g.xs[2] - g.xs[1] - 2 * gut : (n >= 6 ? g.xs[3] : g.xs[3]) - g.xs[1] - 2 * gut) + 'px'; }
      if (btn) put(btn, (n >= 6 ? g.xs[3] : g.xs[2]) + gut);
      // six columns: one link per column on the last three; four columns: the last two columns, halved
      var X = n >= 6 ? [g.xs[4], g.xs[5], g.xs[6]] : [g.xs[3], (g.xs[3] + g.xs[4]) / 2, g.xs[4]];
      Array.prototype.forEach.call(as, function (a, i) { if (X[i] != null) put(a, X[i] + gut); });
    };
    if (PAGE === 'home') return navBoxes(nav, links);
    align(); W.addEventListener('resize', align); if (D.fonts && D.fonts.ready) D.fonts.ready.then(align);
    var cards = D.getElementById('work'), last = W.scrollY, hid = false;
    var set = function (h) { if (h !== hid) { hid = h; H.classList.toggle('nav-hide', h); } };
    W.addEventListener('scroll', function () {
      var y = W.scrollY, dy = y - last, vh = W.innerHeight; last = y;
      if (y < nav.offsetHeight + 8) return set(false);
      if (cards) { var r = cards.getBoundingClientRect(); if (r.top <= 1 && r.bottom > vh * 0.5) return set(true); }
      if (dy > 3) set(true); else if (dy < -3) set(false);
    }, { passive: true });
  }

  /* Home top bar (Nov 24): outlined boxes, one per grid column, floating over the line screen; each label leans
     toward the cursor as it comes near, like the type in the screen behind it */
  function navBoxes(nav, links) {
    var logo = nav.querySelector('.logo'), as = links ? [].slice.call(links.querySelectorAll('a')) : [], items = (logo ? [logo] : []).concat(as);
    items.forEach(function (a) {
      if (a.querySelector('.nt')) return;
      a.classList.add('nb'); var t = D.createElement('span'); t.className = 'nt';
      while (a.firstChild) t.appendChild(a.firstChild); a.appendChild(t);
    });
    var align = function () {
      var g = strips(), gut = Math.round(Math.max(14, Math.min(24, W.innerWidth * 0.016))), n = g.xs.length - 2, R = g.vw - g.pad;
      var put = function (el, l, r) { el.style.position = 'absolute'; el.style.left = Math.round(l) + 'px'; el.style.width = Math.round(r - l + 1) + 'px'; el.style.top = '8px'; el.style.paddingLeft = gut + 'px'; el.style.margin = '0'; el.style.transform = 'none'; };
      if (n < 4) { items.forEach(function (el) { el.style.position = el.style.left = el.style.width = el.style.top = el.style.paddingLeft = el.style.margin = el.style.transform = ''; }); return; }
      if (logo) put(logo, g.pad, g.rule);
      var X = n >= 6 ? [g.xs[4], g.xs[5], g.xs[6], R] : [g.xs[3], (g.xs[3] + g.xs[4]) / 2, g.xs[4], R];
      as.forEach(function (a, i) { if (X[i + 1] != null) put(a, X[i], X[i + 1]); });
    };
    align(); W.addEventListener('resize', align); if (D.fonts && D.fonts.ready) D.fonts.ready.then(align);
    if (!FINE || RM) return;
    var mx = -1e4, my = -1e4, raf = 0, st = items.map(function () { return { x: 0, y: 0 }; });
    var tick = function () {
      raf = 0; var busy = false;
      items.forEach(function (a, i) {
        var r = a.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, dx = mx - cx, dy = my - cy, d = Math.hypot(dx, dy), reach = Math.max(120, r.width * 0.8);
        var k = d < reach ? (1 - d / reach) : 0, tx = Math.max(-1, Math.min(1, dx / (r.width / 2))) * k * Math.min(16, r.width * 0.12), ty = Math.max(-1, Math.min(1, dy / 20)) * k * 4;
        var s0 = st[i]; s0.x += (tx - s0.x) * 0.18; s0.y += (ty - s0.y) * 0.18;
        a.firstElementChild.style.transform = Math.abs(s0.x) + Math.abs(s0.y) > 0.05 ? 'translate3d(' + s0.x.toFixed(2) + 'px,' + s0.y.toFixed(2) + 'px,0)' : '';
        if (Math.abs(tx - s0.x) + Math.abs(ty - s0.y) > 0.05) busy = true;
      });
      if (busy) raf = requestAnimationFrame(tick);
    };
    W.addEventListener('pointermove', function (e) { if (e.clientY > 140) { if (mx < -1e3) return; mx = my = -1e4; } else { mx = e.clientX; my = e.clientY; } if (!raf) raf = requestAnimationFrame(tick); }, { passive: true });
  }

  /* Home: the dot on the vertical rule grows as you scroll and becomes the UI/UX blue, opening onto the first card */
  /* ---------- category cards (Nov 24). The images develop through the site's square dots as each card arrives
     (scroll-tied, staggered tile by tile, so it runs backwards too); the last card, Social Media, breaks up into the same
     dots over the index. Each card answers the cursor in its own way; the headings widen where the cursor is. ---------- */
  function cards() {
    var cs = [].slice.call(D.querySelectorAll('.cc-card')), sec = D.querySelector('.cc');
    if (!cs.length || !sec || !LIVE || RM) return;
    pixReveal();
    cardLife(cs);
  }

  /* card images resolve from pixels (Nov 24, time-based): a tiny inline preview is shown in big blocks straight away;
     once the real image has loaded and its tile is on screen, the blocks halve and halve again until the picture is
     sharp. Same duration and easing on every card; each image does it once. */
  function fitRect(nw, nh, w, h, fit, pos) {
    var pp = (pos || '50% 50%').split(' '), px = parseFloat(pp[0]) / 100, py = parseFloat(pp[1] || pp[0]) / 100;
    if (isNaN(px)) px = 0.5; if (isNaN(py)) py = 0.5;
    if (fit === 'fill' || !nw || !nh) return [0, 0, w, h];
    var k = fit === 'contain' ? Math.min(w / nw, h / nh) : Math.max(w / nw, h / nh), dw = nw * k, dh = nh * k;
    return [(w - dw) * px, (h - dh) * py, dw, dh];
  }
  function pixReveal() {
    var ims = [].slice.call(D.querySelectorAll('.cc-vis .cc-t img')); if (!ims.length) return;
    var DUR = 1150, dpr = Math.min(2, W.devicePixelRatio || 1), sc = D.createElement('canvas'), sx = sc.getContext('2d');
    var io = 'IntersectionObserver' in W ? new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting && e.target._px) { e.target._px.seen(); io.unobserve(e.target); } });
    }, { threshold: 0.3 }) : null;
    ims.forEach(function (im) {
      var t = im.closest('.cc-t'), sib = [].slice.call(t.parentNode.querySelectorAll('.cc-t')), j = sib.indexOf(t);
      if (!t.offsetWidth) return;   // tiles hidden at this width keep the plain image
      var cv = D.createElement('canvas'), x = cv.getContext('2d'); cv.className = 'me-px'; cv.setAttribute('aria-hidden', 'true');
      t.appendChild(cv); t.classList.add('me-pxw');
      var o = { b: 0, src: null, done: false, seen: null }, bw = 0, bh = 0, B0 = 16;
      var size = function () {
        bw = im.offsetWidth; bh = im.offsetHeight; if (!bw || !bh) return false;
        cv.style.left = im.offsetLeft + 'px'; cv.style.top = im.offsetTop + 'px'; cv.style.width = bw + 'px'; cv.style.height = bh + 'px';
        cv.width = Math.round(bw * dpr); cv.height = Math.round(bh * dpr);
        B0 = Math.max(8, Math.round(t.offsetWidth / 9));   // about nine blocks across the tile to start
        return true;
      };
      var cs0 = getComputedStyle(im), fit = cs0.objectFit, pos = cs0.objectPosition;
      // draw `src` into the image box at block size b (css px): sample small, then scale up without smoothing
      var draw = function (src, b) {
        if (!src || !bw) return;
        var nw = src.naturalWidth || src.width, nh = src.naturalHeight || src.height;
        x.clearRect(0, 0, cv.width, cv.height);
        if (b <= 1) { var r = fitRect(nw, nh, cv.width, cv.height, fit, pos); x.imageSmoothingEnabled = true; x.drawImage(src, r[0], r[1], r[2], r[3]); return; }
        var w = Math.max(1, Math.round(bw / b)), h = Math.max(1, Math.round(bh / b)), r2 = fitRect(nw, nh, w, h, fit, pos);
        sc.width = w; sc.height = h; sx.imageSmoothingEnabled = true; sx.clearRect(0, 0, w, h); sx.drawImage(src, r2[0], r2[1], r2[2], r2[3]);
        x.imageSmoothingEnabled = false; x.drawImage(sc, 0, 0, w, h, 0, 0, cv.width, cv.height);
      };
      size();
      var lq = im.getAttribute('data-lq');
      if (lq) { var li = new Image(); li.onload = function () { if (!o.src) { o.lq = li; draw(li, B0); } }; li.src = lq; }
      var finish = function () {
        o.done = true; t.classList.add('me-pxd');
        setTimeout(function () { cv.remove(); t.classList.remove('me-pxw', 'me-pxd'); }, 260);
      };
      var run = function () {
        if (o.src || o.done) return; o.src = im; if (!size()) return finish();
        var s0 = now() + j * 130, last = -1;   // tiles of one card follow each other
        (function f() {
          var tt = cl((now() - s0) / DUR), e = tt < 0.5 ? 4 * tt * tt * tt : 1 - Math.pow(-2 * tt + 2, 3) / 2;
          var b = Math.max(1, Math.round(Math.pow(B0, 1 - e)));   // B0 -> 1, halving in even steps
          if (b !== last) { last = b; draw(im, b); }
          if (tt < 1) requestAnimationFrame(f); else finish();
        })();
      };
      var loaded = function (cb) {
        if (im.complete && im.naturalWidth) return cb();
        im.addEventListener('load', function () { cb(); }, { once: true });
        im.addEventListener('error', function () { finish(); }, { once: true });
        if (im.loading === 'lazy') im.loading = 'eager';
      };
      o.seen = function () { loaded(function () { (im.decode ? im.decode().catch(function () { }) : Promise.resolve()).then(run); }); };
      t._px = o;
      W.addEventListener('resize', function () { if (!o.done && size()) draw(o.src || o.lq, o.src ? 1 : B0); });
      if (io) io.observe(t); else o.seen();
      // start fetching early so the reveal never waits on the network
      if (im.loading === 'lazy') setTimeout(function () { im.loading = 'eager'; }, 1500);
    });
  }

  /* Social Media -> Index (Nov 24): one movement across the seam. The black card's bottom edge turns to ink (a ragged,
     noise-shaped front climbing the card); along that front the card breaks into the site's square dots, which shrink and
     sink toward the index. The whole card is smudged by the same ink filter the headings use, and the index band
     arrives through the same smudge, easing back to sharp as the card is gone. Scroll-tied, so it runs backwards. */
  function melt(last) {
    var inn = last.querySelector('.cc-in'), tail = D.querySelector('.cc-tail'), band = D.querySelector('#index .pf-band');
    if (!inn || !tail) return;
    var NS = 'http://www.w3.org/2000/svg', sv = D.createElementNS(NS, 'svg');
    sv.setAttribute('aria-hidden', 'true'); sv.setAttribute('width', '0'); sv.setAttribute('height', '0'); sv.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
    // one ink texture, two strengths: the card smudges out with it, the band smudges in with it
    var flt = function (id) { return '<filter id="' + id + '" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.011 0.019" numOctaves="3" seed="11" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="0" xChannelSelector="R" yChannelSelector="G"/></filter>'; };
    sv.innerHTML = '<clipPath id="me-melt" clipPathUnits="objectBoundingBox"><path d="M0 0H1V1H0z"/></clipPath>' + (FINE ? flt('me-ink-a') + flt('me-ink-b') : '');
    D.body.appendChild(sv);
    var pa = sv.querySelector('path'), dA = sv.querySelector('#me-ink-a feDisplacementMap'), dB = sv.querySelector('#me-ink-b feDisplacementMap');
    var nx = 0, ny = 0, cols = [], last0 = -1, on = false;
    var measure = function () {
      var w = inn.offsetWidth, h = inn.offsetHeight, S = W.innerWidth < 640 ? 18 : 24;
      nx = Math.max(8, Math.round(w / S)); ny = Math.max(8, Math.round(h / S)); cols = [];
      // a slow, uneven front (three waves) and a little grain per cell
      for (var i = 0; i < nx; i++) {
        var cx = (i + 0.5) / nx, row = [];
        for (var j = 0; j < ny; j++) row.push(hash(i, j + 91));
        cols.push({ cx: cx, n: 0.5 * Math.sin(cx * 7.3 + 1.3) + 0.3 * Math.sin(cx * 15.1 + 0.4) + 0.2 * Math.sin(cx * 31.7 + 2.2), g: row });
      }
      last0 = -1;
    };
    var set = function (z) {
      var want = z > 0 && z < 1 || z >= 1;
      if (want !== on) {
        on = want; var v = on ? 'url(#me-melt)' : '';
        inn.style.clipPath = v; inn.style.webkitClipPath = v;
        // the ink pulls the edges in; a margin of the card's own black keeps the screen edges covered
        inn.style.boxShadow = on && FINE ? '0 0 0 48px ' + getComputedStyle(inn).backgroundColor : '';
        if (FINE) { last.style.filter = on ? 'url(#me-ink-a)' : ''; if (band) band.style.filter = on && z < 1 ? 'url(#me-ink-b)' : ''; }
      }
      last.classList.toggle('me-dz', z > 0.6);
      if (!on) return;
      var E = sm(z), F = 1.32 - 1.78 * E, hw = 0.5 / nx, hh = 0.5 / ny, d = '';
      for (var i = 0; i < nx; i++) {
        var c = cols[i], x0 = c.cx - hw, run = 0, j;
        // above the front the card is whole: one strip per column
        for (j = 0; j < ny; j++) { var cy = (j + 0.5) / ny, u = (cy - F + c.n * 0.11 + c.g[j] * 0.15) / 0.34; if (u > 0) break; run = j + 1; }
        if (run) { var xa = i ? x0 : -0.06, wa = 2 * hw + (i ? 0 : 0.06) + (i === nx - 1 ? 0.06 : 0); d += 'M' + xa.toFixed(4) + ' -0.08h' + wa.toFixed(4) + 'v' + (run / ny + 0.08).toFixed(4) + 'h' + (-wa).toFixed(4) + 'z'; }
        for (; j < ny; j++) {
          var cy2 = (j + 0.5) / ny, u2 = sm(cl((cy2 - F + c.n * 0.11 + c.g[j] * 0.15) / 0.34)), s = 1 - u2;
          if (s <= 0.03) continue;
          var a = hw * s, b = hh * s, dy = u2 * (0.035 + 0.05 * c.g[j]);   // dots sink as they shrink, into the index
          d += 'M' + (c.cx - a).toFixed(4) + ' ' + (cy2 + dy - b).toFixed(4) + 'h' + (2 * a).toFixed(4) + 'v' + (2 * b).toFixed(4) + 'h' + (-2 * a).toFixed(4) + 'z';
        }
      }
      pa.setAttribute('d', d || 'M0 0z');
      if (dA) dA.setAttribute('scale', (34 * Math.sin(Math.PI * Math.min(1, E * 1.15))).toFixed(2));   // ink swells mid-way, settles at the end
      if (dB) { dB.setAttribute('scale', (30 * (1 - E)).toFixed(2)); if (band) band.style.filter = z < 1 ? 'url(#me-ink-b)' : ''; }
    };
    var frame = function () {
      var vh = W.innerHeight, tr = tail.getBoundingClientRect(), tl = cl((vh - tr.top) / (tail.offsetHeight || 1));
      var z = Math.round(cl((tl - 0.5) / 0.5) * 400) / 400;
      if (z === last0) return; last0 = z;
      set(z);
    };
    var raf = 0, kick = function () { if (!raf) raf = requestAnimationFrame(function () { raf = 0; frame(); }); };
    measure(); frame();
    W.addEventListener('scroll', kick, { passive: true });
    W.addEventListener('resize', function () { measure(); kick(); });
  }

  /* the cards answer the cursor, each its own way (pointer devices); the Social arrow also answers touch */
  function cardLife(cs) {
    cs.forEach(function (card) {
      var inn = card.querySelector('.cc-in'), id = card.id, ts = [].slice.call(card.querySelectorAll('.cc-vis .cc-t')), arw = card.querySelector('.me-arw');
      if (!inn) return;
      // touch: the arrow presses in the direction it points, and the whole card is the way in
      if (arw) {
        arw.addEventListener('pointerdown', function () { arw.classList.add('pr'); });
        ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) { arw.addEventListener(ev, function () { arw.classList.remove('pr'); }); });
        arw.addEventListener('click', function () { arw.classList.add('go'); });
        inn.addEventListener('click', function (e) { if (!e.target.closest('a')) { arw.classList.add('go'); arw.click(); } });
        inn.classList.add('me-go');
        W.addEventListener('pageshow', function () { arw.classList.remove('go', 'pr'); });
      }
      if (!FINE) return;
      H.classList.add('me-cl');
      // headings: letters widen where the cursor is
      var h2 = card.querySelector('.cc-h'), Ls = [];
      if (h2 && !h2.querySelector('.cc-l')) {
        var txt = h2.textContent; h2.setAttribute('aria-label', txt);
        h2.innerHTML = txt.split('').map(function (ch) { return ch === ' ' ? ' ' : '<span class="cc-l" aria-hidden="true">' + ch.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</span>'; }).join('');
        Ls = [].slice.call(h2.querySelectorAll('.cc-l'));
      }
      var st0 = { x: 0, y: 0, a: 0, px: -1e4, py: -1e4 }, cur = { x: 0, y: 0, a: 0 }, box = null, lx = [], tb = [], hov = -1, run = false, lens = { x: 0.5, y: 0.5 };
      var measure = function () {
        box = inn.getBoundingClientRect();
        // letter centres measured at rest (no widening), so measuring never fights the animation
        Ls.forEach(function (l) { l.style.fontStretch = ''; });
        lx = Ls.map(function (l) { var r = l.getBoundingClientRect(); return r.left + r.width / 2; });
        tb = ts.map(function (t) { return t.getBoundingClientRect(); });
      };
      var tick = function () {
        var k = 0.12;
        cur.x += (st0.x - cur.x) * k; cur.y += (st0.y - cur.y) * k; cur.a += (st0.a - cur.a) * k;
        var a = cur.a, n = ts.length, mid = (n - 1) / 2;
        ts.forEach(function (t, j) {
          var lift = j === hov ? 1 : 0, tf = '', im = t.querySelector('img');
          t._h = (t._h || 0) + (lift - (t._h || 0)) * 0.16;
          if (id === 'c-uiux') {   // layered depth: each screen sits on its own plane
            var dp = [1.5, 0.55, 1.05, 0.25, 0.8][j % 5];
            tf = 'translate3d(' + (cur.x * 18 * dp).toFixed(2) + 'px,' + (cur.y * 12 * dp - t._h * 10).toFixed(2) + 'px,0) rotateY(' + (cur.x * 5 * a).toFixed(2) + 'deg) rotateX(' + (-cur.y * 4 * a).toFixed(2) + 'deg)';
            if (im) im.style.transform = 'translate3d(' + (-cur.x * 6 * dp).toFixed(2) + 'px,' + (-cur.y * 6 * dp).toFixed(2) + 'px,0) scale(' + (1 + 0.06 * a).toFixed(3) + ')';
          } else if (id === 'c-product') {   // a lens: the object under the cursor comes closer
            tf = 'translate3d(' + (cur.x * 8).toFixed(2) + 'px,' + (-t._h * 8).toFixed(2) + 'px,0)';
            if (im) { im.style.transformOrigin = (lens.x * 100).toFixed(1) + '% ' + (lens.y * 100).toFixed(1) + '%'; im.style.transform = 'scale(' + (1 + 0.32 * t._h).toFixed(3) + ')'; }
          } else if (id === 'c-branding') {   // a fanned hand of cards, leaning toward the cursor
            var off = j - mid, rot = off * 3.2 * a + cur.x * 2.4 * a;
            tf = 'translate3d(' + (off * 10 * a + cur.x * 10).toFixed(2) + 'px,' + (-(1 - Math.abs(off) / (n || 1)) * 18 * a - t._h * 14).toFixed(2) + 'px,0) rotate(' + rot.toFixed(2) + 'deg)';
          } else {   // Social: the posts drift behind the arrow
            tf = 'translate3d(' + (cur.x * (6 + j * 3)).toFixed(2) + 'px,' + (cur.y * 6 - t._h * 8).toFixed(2) + 'px,0)';
          }
          t.style.transform = tf;
        });
        // the heading's letters widen near the cursor
        if (Ls.length) for (var i = 0; i < Ls.length; i++) {
          var dx = (lx[i] - st0.px) / 170, w = 62 + 26 * a * Math.exp(-dx * dx);
          var pw = Ls[i]._w || 62; w = pw + (w - pw) * 0.22; Ls[i]._w = w;
          Ls[i].style.fontStretch = w.toFixed(1) + '%';
        }
        if (arw) {
          var ar = arw._b, ax = 0, ay = 0, sc = 1;
          if (ar) {
            var dx2 = st0.px - (ar.left + ar.width / 2), dy2 = st0.py - (ar.top + ar.height / 2), dd = Math.hypot(dx2, dy2), pull = a * Math.max(0, 1 - dd / 420);
            ax = cur.x * 16 + dx2 * 0.16 * pull; ay = cur.y * 16 + dy2 * 0.16 * pull; sc = 1 + 0.16 * pull;
          }
          arw.style.setProperty('--ax', ax.toFixed(2) + 'px'); arw.style.setProperty('--ay', ay.toFixed(2) + 'px'); arw.style.setProperty('--as', sc.toFixed(3));
        }
        var still = Math.abs(cur.x - st0.x) + Math.abs(cur.y - st0.y) + Math.abs(cur.a - st0.a) < 0.002 && ts.every(function (t, j) { return Math.abs((t._h || 0) - (j === hov ? 1 : 0)) < 0.004; });
        if (still && !st0.a) {   // settled back at rest: hand the styles back
          ts.forEach(function (t) { t.style.transform = ''; var im = t.querySelector('img'); if (im) { im.style.transform = ''; im.style.transformOrigin = ''; } });
          Ls.forEach(function (l) { l.style.fontStretch = ''; l._w = 62; });
          run = false; return;
        }
        requestAnimationFrame(tick);
      };
      var go = function () { if (!run) { run = true; requestAnimationFrame(tick); } };
      inn.addEventListener('pointerenter', function (e) { if (e.pointerType !== 'mouse') return; measure(); if (arw) arw._b = arw.getBoundingClientRect(); st0.a = 1; card.classList.add('me-live'); go(); });
      inn.addEventListener('pointermove', function (e) {
        if (e.pointerType !== 'mouse') return; if (!box) measure();
        st0.px = e.clientX; st0.py = e.clientY;
        st0.x = cl((e.clientX - box.left) / box.width) * 2 - 1; st0.y = cl((e.clientY - box.top) / box.height) * 2 - 1;
        hov = -1;
        for (var j = 0; j < tb.length; j++) { var b = tb[j]; if (e.clientX >= b.left && e.clientX <= b.right && e.clientY >= b.top && e.clientY <= b.bottom) { hov = j; lens.x = cl((e.clientX - b.left) / b.width); lens.y = cl((e.clientY - b.top) / b.height); } }
        go();
      });
      inn.addEventListener('pointerleave', function () { st0.x = 0; st0.y = 0; st0.a = 0; hov = -1; card.classList.remove('me-live'); go(); });
      W.addEventListener('scroll', function () { box = null; if (arw) arw._b = null; if (st0.a) { measure(); if (arw) arw._b = arw.getBoundingClientRect(); } }, { passive: true });
    });
  }

  /* Home -> About bridge: the sentence lights word by word as it comes up */
  function bridge() {
    var t = D.querySelector('.br-t'); if (!t || !LIVE || RM) return;
    H.classList.add('br-on');
    var ws = t.querySelectorAll('.bw'), lastN = -1;
    var run = function () {
      var r = t.getBoundingClientRect(), vh = W.innerHeight, p = cl((vh * 0.88 - r.top) / (r.height + vh * 0.32));
      var n = Math.round(p * ws.length); if (n === lastN) return; lastN = n;
      for (var i = 0; i < ws.length; i++) ws[i].classList.toggle('lit', i < n);
    };
    W.addEventListener('scroll', run, { passive: true }); W.addEventListener('resize', run); run();
  }

  function LV() { try { return W.__meLevels ? W.__meLevels() : (SHELLED && W.parent.__meLevels ? W.parent.__meLevels() : null); } catch (e) { return null; } }
  function railDot() {
    var mk = D.querySelector('[data-inkroot] .vmark'), cards = D.getElementById('work'); if (!mk || !cards || !LIVE || RM) return;
    var o = D.createElement('div'); o.className = 'me-dot'; o.setAttribute('aria-hidden', 'true'); D.body.appendChild(o);
    H.classList.add('dot-on');
    // the dot turns into a square of the UI/UX blue (the card's own colour) that fills the screen before the card arrives;
    // the card then rises into the blue, so the switch to the section is one colour field
    var blue = getComputedStyle(D.querySelector('#c-uiux .cc-in') || D.body).backgroundColor || 'rgb(43,53,255)';
    var A = [142, 107, 255], B = (/(\d+),\s*(\d+),\s*(\d+)/.exec(blue) || [0, 43, 53, 255]).slice(1, 4).map(Number), last = '';
    var dot = null;
    var run = function () {
      // the square opens from the full stop at the end of the statement (the rule's dot if there is none)
      if (!dot) { var scs = D.querySelectorAll('[data-inkroot] .stmt .sc'); dot = scs.length && /\.\s*$/.test(scs[scs.length - 1].textContent) ? scs[scs.length - 1] : mk; }
      var r = dot.getBoundingClientRect(), vh = W.innerHeight, vw = W.innerWidth;
      var cx = Math.max(0, Math.min(vw, r.left + r.width / 2)), cy = Math.max(0, Math.min(vh, dot === mk ? r.top + r.height / 2 : r.top + r.height * 0.74));
      var ct = cards.getBoundingClientRect().top;
      var q = cl((1.9 * vh - ct) / (0.9 * vh)), e = q * q * (3 - 2 * q);            // full exactly when the card reaches the screen
      var r0 = dot === mk ? 3.5 : Math.max(3, r.width * 0.32), far = Math.max(cx, vw - cx, cy, vh - cy) + 2, R = r0 + (far - r0) * Math.pow(e, 1.5);
      if (dot !== mk) dot.style.opacity = q > 0 ? '0' : '';
      var t = cl(q / 0.18), c = A.map(function (a, i) { return Math.round(a + (B[i] - a) * t); });
      var top = Math.max(0, cy - R), left = Math.max(0, cx - R), right = Math.max(0, vw - (cx + R)), bot = Math.max(0, vh - (cy + R));
      // above the rising card only, but reaching 80px into its empty top margin (same colour): scrolling moves the card
      // before this can follow, and without the overlap the page showed through the seam as a dark line
      if (ct < vh) bot = Math.max(bot, vh - ct - Math.min(80, Math.max(0, vh - ct)));
      var hide = ct <= 0.5 || r.top > vh + 40 || (q <= 0 && (r.bottom < -40));
      var key = [top, right, bot, left, c.join(), hide].map(function (x) { return typeof x === 'number' ? x.toFixed(1) : x; }).join('|'); if (key === last) return; last = key;
      o.style.visibility = hide ? 'hidden' : 'visible';
      o.style.background = 'rgb(' + c.join(',') + ')';
      o.style.clipPath = 'inset(' + top.toFixed(1) + 'px ' + right.toFixed(1) + 'px ' + bot.toFixed(1) + 'px ' + left.toFixed(1) + 'px)';
    };
    W.addEventListener('scroll', run, { passive: true }); W.addEventListener('resize', run); run();
    var t0 = now(); (function warm() { run(); if (now() - t0 < 3000) requestAnimationFrame(warm); })();
  }

  /* Home: once the statement has assembled, the circuit line carries on under the sentence, line by line, and stops at
     the full stop at its end (which then opens into the blue square). Tied to the scroll, reversible. */
  /* the statement's line (Nov 24, after the reference): once the sentence has assembled, one pen line runs below it and
     draws a small object for each keyword — a chair for design, a head for psychology, a speech bubble for research,
     a phone for intuitive — each captioned on the grid. The keyword it is drawing lights in the sentence; the phone's
     screen fills with the full stop's lavender at the end. Scroll-tied, so it undraws on the way back. */
  var SKETCH = [
    { k: 'Design', t: 'how things are made', p: [[[0, 100], [20, 100], [20, 12], [31, 12], [31, 54], [80, 54], [80, 100], [100, 100]], [[31, 70], [80, 70]]] },
    { k: 'Psychology', t: 'why people use them', p: [[[0, 100], [30, 100], [30, 82], [23, 68], [20, 48], [25, 29], [37, 16], [53, 11], [67, 16], [77, 29], [79, 41], [87, 54], [79, 57], [81, 64], [76, 70], [65, 72], [62, 82], [62, 100], [100, 100]],
      [[50, 42], [53, 40], [55, 44], [51, 48], [45, 45], [45, 38], [52, 33], [60, 37], [61, 46], [55, 53]]] },
    { k: 'Research', t: 'where I start', p: [[[0, 100], [24, 100], [24, 88], [31, 76], [12, 76], [12, 22], [88, 22], [88, 76], [44, 76], [24, 88], [24, 100], [100, 100]],
      [[40, 41], [43, 34], [51, 31], [59, 35], [59, 43], [51, 48], [50, 56]], [[50, 63], [50, 66]]] },
    { k: 'Intuitive', t: 'until it feels intuitive', p: [[[0, 100], [32, 100], [32, 9], [36, 3], [64, 3], [68, 9], [68, 100], [100, 100]], [[45, 93], [55, 93]]], screen: [37, 12, 26, 72] }
  ];
  function hand(pts, seed) {   // a steady but human hand: points every 3 units, a slow wobble across the stroke
    var out = [], acc = 0;
    for (var i = 0; i < pts.length - 1; i++) {
      var a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), n = Math.max(1, Math.round(L / 3)), nx = -dy / (L || 1), ny = dx / (L || 1);
      for (var k = 0; k < n; k++) {
        var t = k / n, wob = (k === 0 ? 0 : 1) * (0.9 * Math.sin((acc + t * L) * 0.21 + seed) + 0.5 * Math.sin((acc + t * L) * 0.53 + seed * 2.3));
        out.push([a[0] + dx * t + nx * wob, a[1] + dy * t + ny * wob]);
      }
      acc += L;
    }
    out.push(pts[pts.length - 1]);
    return out;
  }
  function underline() {
    var w = D.querySelector('[data-inkroot] .stw'), st = w && w.querySelector('.sts'), p = st && st.querySelector('.stmt'); if (!p || !LIVE || RM) return;
    var NS = 'http://www.w3.org/2000/svg', svg = D.createElementNS(NS, 'svg'), tip = D.createElementNS(NS, 'rect'), scr = D.createElementNS(NS, 'rect'), g = D.createElementNS(NS, 'g');
    svg.setAttribute('class', 'me-ul'); svg.setAttribute('aria-hidden', 'true');
    g.setAttribute('fill', 'none'); g.setAttribute('stroke', 'rgba(244,243,239,.62)'); g.setAttribute('stroke-width', '1.25'); g.setAttribute('stroke-linecap', 'round'); g.setAttribute('stroke-linejoin', 'round');
    tip.setAttribute('width', '5'); tip.setAttribute('height', '5'); tip.setAttribute('fill', '#8e6bff');
    scr.setAttribute('fill', '#8e6bff'); scr.setAttribute('opacity', '0');
    svg.appendChild(scr); svg.appendChild(g); svg.appendChild(tip); st.appendChild(svg);
    var kws = [].slice.call(p.querySelectorAll('.kw')), caps = SKETCH.map(function (o, i) {
      var c = D.createElement('div'); c.className = 'me-kc'; c.setAttribute('aria-hidden', 'true');
      c.innerHTML = '<b>0' + (i + 1) + '&nbsp;&nbsp;' + o.k + '</b><span>' + o.t + '</span>'; st.appendChild(c); return c;
    });
    // the drawing is a run of strokes (dashes restart on every lifted pen, so each stroke is its own path), drawn in order
    var segs = [], total = 0, geo = '', marks = [], scrAt = 1;
    var build = function () {
      var sr = st.getBoundingClientRect(), pr = p.getBoundingClientRect(); if (!sr.width) return;
      var vl = D.querySelector('[data-inkroot] .vl'), x0 = (vl ? vl.getBoundingClientRect().left : sr.left) - sr.left, R = sr.width;
      var below = sr.height - (pr.bottom - sr.top), slot = (R - x0) / 4, small = W.innerWidth < 640;
      var s = Math.max(40, Math.min(small ? 64 : 132, slot * 0.62, below - (small ? 70 : 96)));
      var top = (pr.bottom - sr.top) + Math.max(20, (below - s - (small ? 46 : 60)) / 2), yb = top + s;
      var key = [x0, R, s, yb].map(Math.round).join(',');
      if (key === geo) return; geo = key;
      while (g.firstChild) g.removeChild(g.firstChild); segs = []; total = 0; marks = [];
      var add = function (pts) {
        var d = 'M' + pts.map(function (q) { return q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join('L');
        var el = D.createElementNS(NS, 'path'); el.setAttribute('d', d); g.appendChild(el);
        var L = el.getTotalLength(); el.style.strokeDasharray = L + ' ' + (L + 1); el.style.strokeDashoffset = L;
        segs.push({ el: el, a: total, L: L }); total += L;
      };
      var main = [[x0, -Math.max(0, sr.top)], [x0, yb]];   // (Nov 24) the pen comes down the margin rule, so the rule and the line are one
      SKETCH.forEach(function (o, i) {
        var cx = x0 + slot * (i + 0.5), L0 = cx - s / 2;
        var P = function (q) { return [L0 + q[0] * s / 100, yb - s + q[1] * s / 100]; };
        var a0 = total + (function () { var l = 0; for (var k = 1; k < main.length; k++) l += Math.hypot(main[k][0] - main[k - 1][0], main[k][1] - main[k - 1][1]); return l + Math.hypot(L0 - main[main.length - 1][0], 0); })();
        main.push([L0, yb]);
        hand(o.p[0], i * 3.1).forEach(function (q) { main.push(P(q)); });
        // the outline is part of the one line; lifted-pen details follow it
        var ex = main[main.length - 1];
        add(main); main = [ex];
        o.p.slice(1).forEach(function (pl, j) { add(hand(pl, i * 3.1 + j + 1).map(P)); });
        marks.push([a0, total]);
        caps[i].style.left = L0.toFixed(1) + 'px'; caps[i].style.top = (yb + 12).toFixed(1) + 'px'; caps[i].style.width = Math.max(40, slot - 8).toFixed(0) + 'px';
        if (o.screen) { var q0 = P([o.screen[0], o.screen[1]]); scr.setAttribute('x', q0[0].toFixed(1)); scr.setAttribute('y', q0[1].toFixed(1)); scr.setAttribute('width', (o.screen[2] * s / 100).toFixed(1)); scr.setAttribute('height', (o.screen[3] * s / 100).toFixed(1)); }
      });
      marks = marks.map(function (m) { return [m[0] / total, m[1] / total]; }); scrAt = marks.length ? marks[marks.length - 1][1] : 1;
    };
    var run = function () {
      build(); if (!total) return;
      var r = w.getBoundingClientRect(), top = parseFloat(getComputedStyle(st).top) || 0;
      var f = cl((top - r.top) / Math.max(1, w.offsetHeight - st.offsetHeight)), u = cl((f - 0.52) / 0.3), at = u * total, pt = null;
      segs.forEach(function (sg) {
        var k = cl((at - sg.a) / sg.L); sg.el.style.strokeDashoffset = (sg.L * (1 - k)).toFixed(1);
        if (k > 0 && k < 1) pt = sg.el.getPointAtLength(sg.L * k);
      });
      if (pt) { tip.setAttribute('x', (pt.x - 2.5).toFixed(1)); tip.setAttribute('y', (pt.y - 2.5).toFixed(1)); }
      tip.style.opacity = pt ? '1' : '0';
      svg.style.opacity = u > 0 ? '1' : '0';
      marks.forEach(function (m, i) {
        if (kws[i]) kws[i].classList.toggle('me-on', u >= m[0] && u < m[1] + 0.04);
        caps[i].classList.toggle('on', u >= m[1] - 0.02);
      });
      scr.setAttribute('opacity', cl((u - scrAt + 0.01) / 0.04).toFixed(3));
    };
    W.addEventListener('scroll', run, { passive: true }); W.addEventListener('resize', function () { geo = ''; run(); });
    if (D.fonts && D.fonts.ready) D.fonts.ready.then(function () { geo = ''; run(); });
    run();
  }
})();
