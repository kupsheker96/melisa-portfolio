/* Shared motion layer for Melisa Ergani's portfolio.
   Runs in <head> before the page renders: decides intro / incoming transition / ink speed, then wires the
   interactions once the page content exists. Everything is skipped with reduced motion, inside embeds
   (the design canvas) and in very tall preview frames. */
(function () {
  'use strict';
  var W = window, D = document, H = D.documentElement;
  var RM = W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var EMB = (function () { try { return W.self !== W.top; } catch (e) { return true; } })();
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
  var forceIntro = /[?&]intro\b/.test(location.search);
  var doIntro = LIVE && !RM && PAGE === 'home' && (forceIntro || (!incoming && !st('localStorage', 'me-intro')));
  var doIn = LIVE && !RM && !doIntro && !!incoming;
  var waiters = [];
  W.__introWait = function (cb) { if (doIntro) waiters.push(cb); else cb(); };
  if (doIntro) { H.classList.add('intro'); H.style.setProperty('--pt-c', BG); st('localStorage', 'me-intro', '1'); }
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
    for (var i = 0; i < g.xs.length - 1; i++) html += '<span class="me-st" style="left:' + g.xs[i] + 'px;width:' + (g.xs[i + 1] - g.xs[i] + 1) + 'px">' + (i < g.xs.length - 2 ? '<i class="me-ln"></i>' : '') + '</span>';
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

  /* ---------- first-visit intro: the four ideas of the statement, then the grid opens onto the name ---------- */
  if (doIntro) onBody(function () {
    var el = wipe(BG, FG, '', '', 'me-intro block');
    var g = strips();
    var ss = el.querySelectorAll('.me-st');
    var lns = el.querySelectorAll('.me-ln');
    for (var i = 0; i < lns.length; i++) lns[i].style.transform = 'scaleY(0)';
    var ic = D.createElement('div'); ic.className = 'me-ic'; ic.style.setProperty('--pd', g.pad + 'px');
    var WORDS = ['design', 'psychology', 'research', 'intuitive'];
    ic.innerHTML = '<span class="tl" style="left:' + g.pad + 'px">Melisa Ergani</span>'
      + '<span class="tr mu">Portfolio //2026</span>'
      + '<span class="bl" style="left:' + g.pad + 'px"><span class="mu">Loading </span><span class="n">000</span></span>'
      + '<span class="br mu">UI/UX &amp; Visual Designer — Ankara</span>'
      + '<div class="me-iw">' + WORDS.map(function (w) { return '<span>' + w + '</span>'; }).join('') + '</div>';
    el.appendChild(ic);
    var t0 = now(), ready = false, n = ic.querySelector('.n'), ws = ic.querySelectorAll('.me-iw span');
    for (var k = 0; k < ws.length; k++) (function (w, k) {
      setTimeout(function () { w.style.setProperty('--wd', (k === ws.length - 1 ? 760 : 980) + 'ms'); if (k === ws.length - 1) w.className = 'last'; w.classList.add('go'); }, 260 + k * 560);
    })(ws[k], k);
    setTimeout(function () {
      for (var i = 0; i < lns.length; i++) anim(lns[i], [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], { duration: 900, delay: i * 70, easing: 'cubic-bezier(.65,0,.2,1)', fill: 'forwards' });
    }, 900);
    rendered(function () { fontsReady(function () { ready = true; }, 2500); });
    var MIN = 2650, MAX = 6000;
    (function tick() {
      var t = now() - t0, p = Math.min(ready ? 1 : 0.94, t / MIN);
      n.textContent = ('00' + Math.round(p * 100)).slice(-3);
      if ((ready && t >= MIN) || t >= MAX) {
        n.textContent = '100';
        setTimeout(function () {
          ic.style.opacity = '0';
          H.classList.remove('intro');
          var ws = waiters; waiters = []; doIntro = false; ws.forEach(function (f) { f(); });
          el.classList.remove('block');
          lift(el);
        }, 260);
        return;
      }
      requestAnimationFrame(tick);
    })();
  });

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
  if (LIVE && !RM) {
    var leaving = false;
    D.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href]'), u = internal(a, e);
      if (!u || leaving) return;
      e.preventDefault(); leaving = true;
      var c = FG, fg = BG, key = pageKey(u), label = /#work$/.test(u.hash) ? 'Work' : (NAMES[key] || ''), kick = '';
      var card = a.closest('.cc-card');
      var inn = card && card.querySelector('.cc-in');
      if (a.getAttribute('data-pt-c')) { c = a.getAttribute('data-pt-c'); fg = a.getAttribute('data-pt-fg') || (lum(c) > 0.5 ? BG : FG); }
      else if (inn) { var cs = getComputedStyle(inn); c = cs.backgroundColor; fg = cs.color; }
      var num = a.querySelector('.cc-ls a > span:first-child, .k');
      if (inn) { var hd = card.querySelector('.cc-h'); kick = (hd ? hd.textContent : '') + (num ? '  ·  ' + num.textContent : ''); }
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
    D.addEventListener('pointerover', warm, { passive: true }); D.addEventListener('touchstart', warm, { passive: true });
    W.addEventListener('pageshow', function (e) {
      leaving = false;
      if (e.persisted) { var ws = D.querySelectorAll('.me-wipe'); for (var i = 0; i < ws.length; i++) ws[i].remove(); H.classList.remove('pt-in', 'intro'); }
    });
  }

  /* ---------- page features, once rendered ---------- */
  onBody(function () { rendered(function () { setTimeout(init, 0); }); });

  function init() {
    clock(); rows(); hero(); hs(); about(); cursor();
    if (!EMB) music();
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
    var secs = D.querySelectorAll('.hs'); if (!secs.length) return;
    var mq = W.matchMedia('(min-width: 760px)');
    var on = function () { return LIVE && !RM && mq.matches; };
    var S = [];
    for (var i = 0; i < secs.length; i++) {
      var sec = secs[i], pin = sec.querySelector('.hs-pin'), tr = sec.querySelector('.hs-track');
      S.push({ sec: sec, pin: pin, tr: tr, ax: sec.querySelector('.xp-ax,.ab-ax'), ys: sec.querySelectorAll('.xp-ax .y'), names: sec.querySelectorAll('.xp-name'), ps: sec.querySelectorAll('.xp-p'), max: 0 });
    }
    var measure = function () {
      H.classList.toggle('hs-on', on());
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
      if (!on()) { H.classList.remove('hs-in'); return; }
      var pinned = false;
      S.forEach(function (s) {
        var r = s.sec.getBoundingClientRect(), p = s.max ? cl((56 - r.top) / s.max) : 0, x = p * s.max;
        if (r.top <= 120 && r.bottom >= W.innerHeight - 60) pinned = true;
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
      H.classList.toggle('hs-in', pinned);
    };
    W.addEventListener('scroll', frame, { passive: true });
    W.addEventListener('resize', measure);
    if (D.fonts && D.fonts.ready) D.fonts.ready.then(measure);
    measure(); setTimeout(measure, 600); setTimeout(measure, 2500);
    // keyboard: arrow keys move a focused track along
    S.forEach(function (s) {
      s.sec.addEventListener('focusin', function (e) {
        if (!on()) return;
        var p = e.target.closest('.xp-p, .hs-track > div'); if (!p) return;
        var target = Math.max(0, Math.min(s.max, p.offsetLeft - s.pin.clientWidth * 0.2));
        var y0 = W.scrollY + s.sec.getBoundingClientRect().top - 56;
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

  /* On repeat while designing — a YouTube embed that never starts on its own */
  function music() {
    var VID = 'uhiwpPRxVMw', START = 76, VOL = 70;
    var saved = null; try { saved = JSON.parse(st('sessionStorage', 'me-mu') || 'null'); } catch (e) { }
    var title = st('localStorage', 'me-mu-title') || '';
    var wrap = D.createElement('div'); wrap.className = 'me-mu';
    wrap.innerHTML = '<div class="me-mc" role="region" aria-label="Music player"><div class="me-mv"><div id="me-yt"></div></div>'
      + '<div class="me-mi"><small>On repeat while designing</small><b class="me-tt"></b><small>Nils Frahm</small></div>'
      + '<div class="me-mk"><button type="button" class="me-mute" aria-pressed="false">Mute</button><a href="https://www.youtube.com/watch?v=' + VID + '" target="_blank" rel="noopener">YouTube ↗</a><button type="button" class="me-off">Turn off</button></div></div>'
      + '<button type="button" class="me-mb" aria-expanded="false"><span class="me-wv" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span><span class="me-lbl"><span class="me-t1">On repeat while designing</span><small class="me-t2">Nils Frahm — play</small></span></button>';
    D.body.appendChild(wrap);
    var btn = wrap.querySelector('.me-mb'), stl = wrap.querySelector('.me-t1'), sb = wrap.querySelector('.me-t2'), tt = wrap.querySelector('.me-tt'), mu = wrap.querySelector('.me-mute');
    var P = null, state = 'off', fade = null, apiP = null;
    var label = function () {
      tt.textContent = title || 'Nils Frahm';
      btn.setAttribute('aria-expanded', state !== 'off' ? 'true' : 'false');
      wrap.classList.toggle('open', state === 'play' || (!!P && state === 'pause')); wrap.classList.toggle('play', state === 'play');
      stl.textContent = state === 'off' ? 'On repeat while designing' : (title || 'Nils Frahm');
      sb.textContent = state === 'play' ? 'Nils Frahm — pause' : state === 'pause' ? 'Nils Frahm — resume' : 'Nils Frahm — play';
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
      clearInterval(fade); if (!P || !P.getVolume) return done && done();
      var from = P.getVolume() || 0, t0 = now();
      fade = setInterval(function () {
        var t = cl((now() - t0) / ms), v = from + (to - from) * (t * t * (3 - 2 * t));
        try { P.setVolume(Math.round(v)); } catch (e) { }
        if (t >= 1) { clearInterval(fade); if (done) done(); }
      }, 50);
    };
    var start = function (at, fadeMs) {
      state = 'play'; label();
      if (P && P.playVideo) { try { P.setVolume(0); P.playVideo(); } catch (e) { } ramp(VOL, fadeMs); return; }
      api().then(function () {
        P = new W.YT.Player('me-yt', {
          host: 'https://www.youtube-nocookie.com', videoId: VID, width: 256, height: 200,
          playerVars: { start: Math.floor(at), autoplay: 1, controls: 0, rel: 0, playsinline: 1, disablekb: 1, fs: 0, iv_load_policy: 3 },
          events: {
            onReady: function (e) { try { e.target.setVolume(0); e.target.seekTo(at, true); e.target.playVideo(); } catch (er) { } ramp(VOL, fadeMs); var d = e.target.getVideoData && e.target.getVideoData(); if (d && d.title) { title = d.title; st('localStorage', 'me-mu-title', title); label(); } },
            onStateChange: function (e) { if (e.data === 1) { state = 'play'; label(); } else if (e.data === 2 && state === 'play') { state = 'pause'; label(); } else if (e.data === 0) { try { P.seekTo(START, true); P.playVideo(); } catch (er) { } } },
            onError: function () { sb.textContent = 'Can’t play here — open on YouTube'; }
          }
        });
      });
    };
    var pause = function () { state = 'pause'; label(); ramp(0, 500, function () { try { P.pauseVideo(); } catch (e) { } }); };
    var off = function () {
      ramp(0, 600, function () { try { P.stopVideo(); P.destroy(); } catch (e) { } P = null; var mv = wrap.querySelector('.me-mv'); mv.innerHTML = '<div id="me-yt"></div>'; });
      state = 'off'; label(); st('sessionStorage', 'me-mu', null);
    };
    btn.addEventListener('click', function () {
      if (state === 'off') start(START, 5000);
      else if (state === 'play') pause();
      else if (P) { state = 'play'; label(); try { P.playVideo(); } catch (e) { } ramp(VOL, 1500); }
      else start(saved && saved.t ? saved.t : START, 1500);
    });
    wrap.querySelector('.me-off').addEventListener('click', off);
    mu.addEventListener('click', function () {
      if (!P) return; var m = P.isMuted && P.isMuted();
      try { m ? P.unMute() : P.mute(); } catch (e) { }
      mu.textContent = m ? 'Mute' : 'Unmute'; mu.setAttribute('aria-pressed', m ? 'false' : 'true');
    });
    // across pages: browsers won't restart sound without a click, so the player waits, ready to resume where it was
    W.__meSaveMusic = function () {
      if (state === 'off' || !P || !P.getCurrentTime) return;
      try { st('sessionStorage', 'me-mu', JSON.stringify({ on: 1, t: P.getCurrentTime() })); } catch (e) { }
    };
    W.addEventListener('pagehide', W.__meSaveMusic);
    if (saved && saved.on) { state = 'pause'; }
    label();
  }
})();
