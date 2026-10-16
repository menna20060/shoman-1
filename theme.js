/* Shoman: dark only. Late-filled text fix + FX layer (smooth scroll, progress, parallax, header tuck, card spotlight). */
(function () {
  var root = document.documentElement;

  /* ---- page curtain: arriving side (runs immediately, before first paint of the body) ---- */
  var REDUCE = false; try { REDUCE = matchMedia('(prefers-reduced-motion:reduce)').matches; } catch (e) {}
  function makeCurtain() {
    var c = document.createElement('div'); c.className = 'shoman-curtain'; c.setAttribute('aria-hidden', 'true');
    c.innerHTML = '<span>Shoman</span>'; return c;
  }
  var arriving = null;
  try {
    if (!REDUCE && sessionStorage.getItem('shoman-arrive')) {
      sessionStorage.removeItem('shoman-arrive');
      arriving = makeCurtain(); arriving.classList.add('cov'); root.appendChild(arriving);
    }
  } catch (e) {}
  function lift() {
    if (!arriving) return;
    var c = arriving; arriving = null;
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      c.classList.add('out'); setTimeout(function () { if (c.parentNode) c.parentNode.removeChild(c); }, 1100);
    }); });
  }
  addEventListener('load', lift); setTimeout(lift, 1400);

  /* ---- page curtain: leaving side (capture phase so it replaces the page's own quick fade) ---- */
  if (!REDUCE) window.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href]'); if (!a) return;
    if ((a.target && a.target !== '_self') || a.hasAttribute('download')) return;
    var u; try { u = new URL(a.href, location.href); } catch (x) { return; }
    if (u.protocol !== location.protocol || u.host !== location.host) return;
    if (u.pathname === location.pathname && u.search === location.search) return;
    if (!/\.html?$|\/$/.test(u.pathname)) return;
    e.preventDefault(); e.stopImmediatePropagation();
    try { sessionStorage.setItem('shoman-arrive', '1'); } catch (x) {}
    var c = makeCurtain(); document.documentElement.appendChild(c);
    c.getBoundingClientRect(); c.classList.add('in');
    setTimeout(function () { location.href = u.href; }, 620);
  }, true);
  addEventListener('pageshow', function (e) {
    if (!e.persisted) return;
    [].forEach.call(document.querySelectorAll('.shoman-curtain'), function (n) { n.parentNode.removeChild(n); });
  });
  try { localStorage.removeItem('shoman-theme'); } catch (e) {}
  root.removeAttribute('data-theme');

  /* Fix for a bug already in the pages: the seat side panel (seats.html) and the project
     lightbox (index/projects) are written AFTER the page's language script runs, so their
     data-en / data-ar text was never filled on first load. Fill any such empty node once parsed. */
  function fillLate() {
    var l = root.lang === 'ar' ? 'ar' : 'en';
    var nodes = document.querySelectorAll('[data-en]');
    for (var i = 0; i < nodes.length; i++) {
      var e = nodes[i];
      if (e.id !== 'h1' && !e.firstChild) { var v = e.getAttribute('data-' + l); if (v != null) e.innerHTML = v; }
    }
  }

  /* FX layer */
  function fx() {
    var reduce = false;
    try { reduce = matchMedia('(prefers-reduced-motion:reduce)').matches; } catch (e) {}
    if (reduce) return;
    root.classList.add('fx');
    var bar = document.createElement('div'); bar.className = 'shoman-progress'; bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);
    var secs = [].filter.call(document.querySelectorAll('.sec'), function (x) { return x.querySelector(':scope > .vb'); });
    var hero = document.getElementById('home'), cur = window.scrollY, tgt = cur, raf = 0, ticking = false, lastY = cur, hid = false;
    var fine = false; try { fine = matchMedia('(pointer:fine)').matches; } catch (e) {}
    function max() { return Math.max(0, root.scrollHeight - window.innerHeight); }
    function paint() {
      var y = window.scrollY, m = max();
      bar.style.transform = 'scaleX(' + (m ? Math.min(1, y / m) : 0) + ')';
      if (hero) {
        var h = hero.offsetHeight || 1, p = Math.min(Math.max(y / h, 0), 1);
        hero.style.setProperty('--hy', (p * h * -0.06).toFixed(1) + 'px');
        hero.style.setProperty('--ho', (1 - p * 0.9).toFixed(3));
      }
      var vh = window.innerHeight;
      for (var i = 0; i < secs.length; i++) {
        var r = secs[i].getBoundingClientRect();
        if (r.bottom < -100 || r.top > vh + 100) continue;
        var q = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2);
        secs[i].style.setProperty('--py', (q * -r.height * 0.045).toFixed(1) + 'px');
      }
      ticking = false;
    }
    function inScrollable(el) {
      while (el && el !== document.body && el.nodeType === 1) {
        var o = getComputedStyle(el).overflowY;
        if ((o === 'auto' || o === 'scroll') && el.scrollHeight > el.clientHeight + 1) return true;
        el = el.parentNode;
      }
      return false;
    }
    function tick() {
      cur += (tgt - cur) * 0.1;
      if (Math.abs(tgt - cur) < 0.4) { cur = tgt; raf = 0; } else raf = requestAnimationFrame(tick);
      window.scrollTo({ top: cur, behavior: 'instant' });
    }
    if (fine) {
      window.addEventListener('wheel', function (e) {
        if (e.ctrlKey || e.defaultPrevented || document.body.style.overflow === 'hidden' || inScrollable(e.target)) return;
        e.preventDefault();
        var d = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaY;
        if (!raf) cur = window.scrollY;
        tgt = Math.min(max(), Math.max(0, tgt + d));
        if (!raf) raf = requestAnimationFrame(tick);
      }, { passive: false });
    }
    window.addEventListener('scroll', function () {
      if (!raf) { cur = tgt = window.scrollY; }
      if (!ticking) { ticking = true; requestAnimationFrame(paint); }
      /* header tucks away while reading down, returns on scroll up */
      var y = window.scrollY, hd = document.querySelector('header');
      if (hd) {
        var open = hd.matches(':hover,:focus-within') || document.querySelector('.mnav.on');
        var hide = y > 240 && y > lastY + 2 && !open;
        if (hide !== hid && (hide || y < lastY - 2 || y <= 240)) { hid = hide; root.classList.toggle('nav-hide', hide); }
      }
      lastY = y;
    }, { passive: true });
    window.addEventListener('resize', paint);
    paint();
    /* in-page anchors glide with the same easing as the wheel */
    function glide(y) { tgt = Math.min(max(), Math.max(0, y)); if (!raf) { cur = window.scrollY; raf = requestAnimationFrame(tick); } }
    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey) return;
      var a = e.target.closest && e.target.closest('a[href*="#"]'); if (!a) return;
      var u; try { u = new URL(a.href, location.href); } catch (x) { return; }
      if (u.pathname !== location.pathname || !u.hash || u.hash.length < 2) return;
      var el; try { el = document.querySelector(u.hash); } catch (x) { return; }
      if (!el) return;
      e.preventDefault();
      history.pushState(null, '', u.hash);
      glide(el.getBoundingClientRect().top + window.scrollY - 90);
    });
    /* scroll velocity -> tiny skew on media frames, plus fx2 hooks */
    var vel = 0, lastS = window.scrollY;
    (function vloop() {
      var y = window.scrollY; vel += ((y - lastS) - vel) * 0.18; lastS = y;
      var sk = Math.max(-1.6, Math.min(1.6, vel * 0.06));
      root.style.setProperty('--sk', sk.toFixed(3) + 'deg');
      requestAnimationFrame(vloop);
    })();

    if (fine) {
      /* soft light that follows the pointer inside cards (the card itself never moves) */
      document.addEventListener('pointermove', function (e) {
        var c = e.target.closest && e.target.closest('.card,.pc,.pcard');
        if (!c) return;
        var sp = c.querySelector(':scope > .shoman-spot');
        if (!sp) { sp = document.createElement('i'); sp.className = 'shoman-spot'; sp.setAttribute('aria-hidden', 'true'); c.appendChild(sp); }
        var r = c.getBoundingClientRect();
        c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        c.style.setProperty('--my', (e.clientY - r.top) + 'px');
        var px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        c.style.setProperty('--ry', (px * 9).toFixed(2) + 'deg');
        c.style.setProperty('--rx', (py * -9).toFixed(2) + 'deg');
      }, { passive: true });
    }
  }
  /* Stat numbers count up from zero when they scroll into view. Layout never shifts:
     the figure is zero-padded to its final width while it runs, then the original text is restored. */
  function counters() {
    var els = document.querySelectorAll('dl dd');
    if (!els.length) return;
    var reduce = false;
    try { reduce = matchMedia('(prefers-reduced-motion:reduce)').matches; } catch (e) {}
    if (reduce) return;
    var items = [];
    for (var i = 0; i < els.length; i++) {
      var t = els[i].textContent.trim(), m = t.match(/^(\D*)([\d,]+)(\D*)$/);
      if (!m) continue;
      var num = parseInt(m[2].replace(/,/g, ''), 10);
      items.push({ el: els[i], pre: m[1], suf: m[3], num: num, len: Math.max(String(num).length, m[2].length), comma: m[2].indexOf(',') > -1, final: t, i: items.length });
    }
    function fmt(it, v) {
      var s = it.comma ? v.toLocaleString('en-US') : String(v);
      if (!it.comma) while (s.length < it.len) s = '0' + s;
      return it.pre + s + it.suf;
    }
    function run(it) {
      var dur = 1900, delay = it.i * 130, t0 = null;
      function step(ts) {
        if (t0 === null) t0 = ts + delay;
        var p = Math.min(1, Math.max(0, (ts - t0) / dur));
        var e = 1 - Math.pow(1 - p, 4);
        if (p < 1) { it.el.textContent = fmt(it, Math.round(it.num * e)); requestAnimationFrame(step); }
        else it.el.textContent = it.final;
      }
      requestAnimationFrame(step);
    }
    for (var k = 0; k < items.length; k++) items[k].el.textContent = fmt(items[k], 0);
    if (!('IntersectionObserver' in window)) { items.forEach(function (it) { it.el.textContent = it.final; }); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        for (var j = 0; j < items.length; j++) if (items[j].el === e.target) run(items[j]);
      });
    }, { threshold: 0.5 });
    items.forEach(function (it) { io.observe(it.el); });
  }
  /* Background videos: force muted autoplay, retry on first interaction, and fall back to the
     original remote file if the local copy in /media cannot be loaded. */
  function videos() {
    var vs = document.querySelectorAll('video.vb');
    function go(v) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
    for (var i = 0; i < vs.length; i++) (function (v) {
      v.muted = true; v.defaultMuted = true; v.setAttribute('playsinline', '');
      var tried = false;
      v.addEventListener('error', function () {
        if (tried) return; tried = true;
        var f = (v.getAttribute('src') || '').split('/').pop();
        if (f) { v.src = 'https://hirael.com/media/templates/prism/' + f; v.load(); go(v); }
      });
      go(v);
    })(vs[i]);
    function kick() { for (var j = 0; j < vs.length; j++) if (vs[j].paused) go(vs[j]); }
    ['pointerdown', 'keydown', 'touchstart', 'scroll'].forEach(function (t) { addEventListener(t, kick, { once: true, passive: true }); });
  }

  /* Extra interactivity: cursor ring + ambient glow, magnetic buttons, ripples, heading reveals, hero pointer parallax */
  function fx2() {
    if (REDUCE) return;
    var fine = false; try { fine = matchMedia('(pointer:fine)').matches; } catch (e) {}

    /* headings and pills ease in as they scroll into view */
    var hs = [].slice.call(document.querySelectorAll('h2.h, .pill'));
    if ('IntersectionObserver' in window) {
      var hio = new IntersectionObserver(function (es) { es.forEach(function (e) {
        if (e.isIntersecting) { hio.unobserve(e.target); e.target.classList.add('hv-in'); }
      }); }, { threshold: 0.2 });
      hs.forEach(function (h) { h.classList.add('hv'); hio.observe(h); });
    }

    /* ripple on buttons (works on touch too) */
    document.addEventListener('pointerdown', function (e) {
      var b = e.target.closest && e.target.closest('.btn,.gbtn,.chip,.tb'); if (!b) return;
      var r = b.getBoundingClientRect(), s = Math.max(r.width, r.height) * 2, i = document.createElement('i');
      i.className = 'shoman-rp'; i.style.cssText = 'width:' + s + 'px;height:' + s + 'px;left:' + (e.clientX - r.left - s / 2) + 'px;top:' + (e.clientY - r.top - s / 2) + 'px';
      b.appendChild(i); setTimeout(function () { if (i.parentNode) i.parentNode.removeChild(i); }, 750);
    }, { passive: true });

    if (!fine) return;

    var ring = document.createElement('div'); ring.className = 'shoman-ring'; ring.setAttribute('aria-hidden', 'true');
    var glow = document.createElement('div'); glow.className = 'shoman-glow'; glow.setAttribute('aria-hidden', 'true');
    document.body.appendChild(glow); document.body.appendChild(ring);
    var mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my, gx = mx, gy = my, seen = false, big = false;
    addEventListener('pointermove', function (e) {
      mx = e.clientX; my = e.clientY;
      if (!seen) { seen = true; rx = gx = mx; ry = gy = my; root.classList.add('cur-on'); }
      var t = e.target.closest ? e.target.closest('a,button,.card,.pc,.pcard,[role=button],input,textarea,select,label') : null;
      var nb = !!t; if (nb !== big) { big = nb; ring.classList.toggle('big', big); }
      /* magnetic pull */
      var m = e.target.closest ? e.target.closest('.btn,.gbtn,.logo,.lang') : null;
      if (m) {
        var r = m.getBoundingClientRect();
        m.style.translate = ((e.clientX - (r.left + r.width / 2)) * 0.22).toFixed(1) + 'px ' + ((e.clientY - (r.top + r.height / 2)) * 0.3).toFixed(1) + 'px';
        m.__mag = true;
      }
      /* hero content leans gently toward the pointer */
      var hero = document.querySelector('#home .hin');
      if (hero) {
        hero.style.setProperty('--hx', ((e.clientX / innerWidth - 0.5) * -14).toFixed(1) + 'px');
        hero.style.setProperty('--hz', ((e.clientY / innerHeight - 0.5) * -8).toFixed(1) + 'px');
      }
    }, { passive: true });
    document.addEventListener('pointerout', function (e) {
      var m = e.target.closest && e.target.closest('.btn,.gbtn,.logo,.lang');
      if (m && m.__mag && !m.contains(e.relatedTarget)) { m.style.translate = ''; m.__mag = false; }
    });
    document.addEventListener('pointerdown', function () { ring.classList.add('down'); });
    addEventListener('pointerup', function () { ring.classList.remove('down'); });
    document.addEventListener('mouseleave', function () { root.classList.remove('cur-on'); seen = false; });
    (function loop() {
      rx += (mx - rx) * 0.22; ry += (my - ry) * 0.22; gx += (mx - gx) * 0.06; gy += (my - gy) * 0.06;
      ring.style.transform = 'translate3d(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px,0) translate(-50%,-50%)';
      glow.style.transform = 'translate3d(' + gx.toFixed(1) + 'px,' + gy.toFixed(1) + 'px,0) translate(-50%,-50%)';
      requestAnimationFrame(loop);
    })();
  }
  function init() { fillLate(); fx(); fx2(); counters(); videos(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
