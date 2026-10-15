/* MTI static draft - behaviour. Plain JS, no dependencies (Lenis is loaded from the CDN in each page). */
(() => {
  'use strict';
  const html = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* ---- 1. Smooth scroll (Lenis). If the CDN script did not load, the page scrolls natively. ---- */
  let lenis = null;
  if (window.Lenis && !reduced) {
    lenis = new window.Lenis({ lerp: 0.09, smoothWheel: true, wheelMultiplier: 1 });
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
  const scrollToEl = (el) => {
    if (lenis) lenis.scrollTo(el, { offset: -24, duration: 1.4 });
    else el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  };

  /* ---- 2. Navbar: shrinks on scroll, mobile menu ---- */
  const nav = $('#nav');
  const navWrap = nav && nav.parentElement;
  let lastY = window.scrollY;
  const onScroll = () => {
    if (!nav) return;
    const y = Math.max(0, window.scrollY);
    nav.classList.toggle('sc', y > 20);
    const menuOpen = !!document.querySelector('.mmenu.open');
    const dy = y - lastY;
    if (navWrap) {
      if (y < 80 || menuOpen || dy < -4) navWrap.classList.remove('nav-hide');   /* scrolling up / near top */
      else if (dy > 4) navWrap.classList.add('nav-hide');                         /* scrolling down */
    }
    if (Math.abs(dy) > 4) lastY = y;
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const burger = $('#burger');
  const mmenu = $('#mmenu');
  const setMenu = (open) => {
    if (!burger || !mmenu) return;
    mmenu.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', String(open));
  };
  if (burger) burger.addEventListener('click', () => setMenu(!mmenu.classList.contains('open')));

  /* ---- 3. Links: smooth in-page anchors + fade between pages ---- */
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const href = a.getAttribute('href');
    if (href && href.startsWith('#') && href.length > 1) {
      const el = document.getElementById(href.slice(1));
      if (el) { e.preventDefault(); setMenu(false); scrollToEl(el); }
      return;
    }
    if (a.target === '_blank' || a.hasAttribute('download') || a.origin !== window.location.origin) return;
    if (a.pathname === window.location.pathname && a.hash) return;
    if (reduced) return;
    e.preventDefault();
    html.classList.add('leaving');
    try { sessionStorage.setItem('mtiNav', '1'); } catch (err) { /* ignore */ }
    window.setTimeout(() => { window.location.href = a.href; }, 450);
  });
  window.addEventListener('pageshow', (e) => { if (e.persisted) html.classList.remove('leaving', 'entering', 'lift'); });

  /* prefetch internal pages on hover/touch so the next page is ready when the curtain closes */
  const prefetched = new Set();
  const prefetch = (e) => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.origin !== window.location.origin || a.pathname === window.location.pathname || prefetched.has(a.href)) return;
    prefetched.add(a.href);
    const l = document.createElement('link'); l.rel = 'prefetch'; l.href = a.href; document.head.appendChild(l);
  };
  document.addEventListener('mouseover', prefetch, { passive: true });
  document.addEventListener('touchstart', prefetch, { passive: true });

  /* ---- 4. Reveal one by one (starts once the page curtain begins to lift) ---- */
  const entering = html.classList.contains('entering');
  if (entering) { requestAnimationFrame(() => requestAnimationFrame(() => html.classList.add('lift'))); window.setTimeout(() => html.classList.remove('entering', 'lift'), 1200); }
  const startReveal = () => {
  $$('[data-stagger]').forEach((group) => {
    Array.from(group.children).forEach((child, i) => {
      if (!child.hasAttribute('data-reveal')) {
        child.setAttribute('data-reveal', '');
        child.style.setProperty('--d', i * 110 + 'ms');
      }
    });
  });
  const release = (el) => {
    // once shown, drop the reveal rules so hover transitions on cards work normally
    el.removeAttribute('data-reveal');
    el.classList.remove('is-in');
    el.style.removeProperty('--d');
  };
  const show = (el) => {
    el.classList.add('is-in');
    const delay = parseFloat(el.style.getPropertyValue('--d')) || 0;
    window.setTimeout(() => release(el), delay + 1300);
  };
  const items = $$('[data-reveal]');
  if ('IntersectionObserver' in window && !reduced) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { io.unobserve(en.target); show(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    items.forEach((el) => io.observe(el));
  } else {
    items.forEach(release);
  }
  };
  if (entering) window.setTimeout(startReveal, 380); else startReveal();

  /* ---- 4a. Footer: items appear one by one when the footer comes into view ---- */
  const foot = $('.foot');
  if (foot) {
    $$('.ftop > div', foot).forEach((col, ci) => {
      const parts = ci === 0 ? Array.from(col.children) : [col.querySelector('h4'), ...$$('li', col)].filter(Boolean);
      parts.forEach((el, i) => { el.classList.add('fr'); el.style.setProperty('--d', (ci * 380 + i * 170) + 'ms'); });
    });
    const fb = $('.fbot', foot);
    if (fb) { fb.classList.add('fr'); fb.style.setProperty('--d', '2200ms'); }
    if ('IntersectionObserver' in window && !reduced) {
      const fio = new IntersectionObserver((en) => { if (en[0].isIntersecting) { foot.classList.add('vis'); fio.disconnect(); } }, { threshold: 0.12 });
      fio.observe(foot.parentElement);
    } else foot.classList.add('vis');
  }

  /* ---- 4b. Footer video: play only while visible ---- */
  const fvid = $('.fvid');
  if (fvid && 'IntersectionObserver' in window) {
    new IntersectionObserver((en) => en.forEach((x) => { if (x.isIntersecting) { fvid.closest('.foot').classList.add('vis'); const p = fvid.play(); if (p && p.catch) p.catch(() => {}); } else fvid.pause(); }), { threshold: 0.05 }).observe(fvid.closest(".sfw") || fvid);
  }

  /* ---- 5. Telescopic accordion ---- */
  const accs = $('#accs');
  if (accs) {
    const labels = JSON.parse(accs.getAttribute('data-labels') || '[]');
    const lab = $('#tlab');
    const step = $('#tstep');
    $$('.acr', accs).forEach((row, i) => {
      $('.ach', row).addEventListener('click', () => {
        const wasOpen = row.classList.contains('on');
        $$('.acr', accs).forEach((r) => {
          const on = r === row && !wasOpen;
          r.classList.toggle('on', on);
          $('.ach', r).setAttribute('aria-expanded', String(on));
        });
        if (!wasOpen) {
          if (lab) lab.textContent = labels[i] || '';
          if (step) step.textContent = String(i + 1).padStart(2, '0') + ' / ' + String(labels.length).padStart(2, '0');
        }
      });
    });
  }

  /* ---- 6. Projects filter ---- */
  const prj = $('#prj');
  if (prj) {
    const chips = $$('.chip');
    chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const key = chip.getAttribute('data-filter');
        chips.forEach((c) => c.classList.toggle('on', c === chip));
        $$('.pj', prj).forEach((p) => {
          const match = key === 'all' || p.getAttribute('data-sector') === key;
          p.hidden = !match;
          if (match) { p.classList.remove('pop'); void p.offsetWidth; p.classList.add('pop'); }
        });
      });
    });
  }

  /* ---- 7. Detail overlays: seat side panel + project lightbox ---- */
  const dataEl = $('#mti-data');
  const D = dataEl ? JSON.parse(dataEl.textContent) : null;
  const scrim = $('#scrim'), panel = $('#panel'), lbx = $('#lbx');
  let openEl = null, lastFocus = null;
  const openOv = (el, focusSel) => {
    if (!el) return;
    lastFocus = document.activeElement;
    openEl = el;
    scrim.classList.add('on'); el.classList.add('on');
    if (lenis) lenis.stop();
    html.classList.add('ov-open');
    window.setTimeout(() => { const f = $(focusSel, el) || el; f.focus && f.focus({ preventScroll: true }); }, 60);
  };
  const closeOv = () => {
    if (!openEl) return;
    openEl.classList.remove('on'); scrim.classList.remove('on');
    openEl = null;
    if (lenis) lenis.start();
    html.classList.remove('ov-open');
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  };
  if (D) {
    const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const openSeat = (card) => {
      const m = D.models[Number(card.getAttribute('data-seat'))];
      if (!m) return;
      $('#pn-e').textContent = D.pn.eyebrow;
      $('#pn-t').textContent = m.code;
      const photo = $('.im .sph', card); const svg = photo ? null : $('.im svg', card);
      $('#pn-b').innerHTML =
        '<div class="pimg">' + (photo ? photo.outerHTML : (svg ? svg.outerHTML : '')) + '</div>' +
        '<p class="plead">' + esc(m.desc) + '</p>' +
        '<div class="spec">' + m.spec.map((r) => '<div><b>' + esc(r[0]) + '</b><span>' + esc(r[1]) + '</span></div>').join('') + '</div>' +
        '<div class="pbtns"><a class="gbtn" href="' + D.pn.contactHref + '"><span>' + esc(D.pn.contact) + '</span></a><a class="obtn" href="' + D.pn.optionsHref + '">' + esc(D.pn.options) + '</a></div>';
      Array.from($('#pn-b').children).forEach((c, i) => c.style.setProperty('--i', i));
      panel.scrollTop = 0; $('#pn-b').scrollTop = 0;
      openOv(panel, '#pn-x');
    };
    const openProj = (card) => {
      const i = Number(card.getAttribute('data-proj'));
      const p = D.projects[i];
      if (!p) return;
      $('#lb-a').innerHTML = D.scenes[D.sceneOf[card.getAttribute('data-sector')] || 0];
      $('#lb-t').textContent = p.title;
      $('#lb-m').textContent = p.meta;
      openOv(lbx, '.xb');
    };
    document.addEventListener('click', (e) => {
      const seat = e.target.closest && e.target.closest('[data-seat]');
      if (seat) { openSeat(seat); return; }
      const proj = e.target.closest && e.target.closest('[data-proj]');
      if (proj) openProj(proj);
    });
    document.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-seat],[data-proj]')) {
        e.preventDefault(); e.target.click();
      }
    });
  }
  if (scrim) {
    scrim.addEventListener('click', closeOv);
    document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('#pn-x,[data-close]')) closeOv(); });
    if (lbx) lbx.addEventListener('click', (e) => { if (e.target === lbx) closeOv(); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeOv();
      if (e.key === 'Tab' && openEl) {
        const f = $$('a[href],button:not([disabled])', openEl);
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }
})();

/* ---- FX layer: progress bar, parallax, tilt, magnetic, counters, heading split ---- */
(() => {
  'use strict';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  if (reduced) return;

  /* scroll progress bar */
  const bar = document.createElement('div');
  bar.className = 'sprog';
  document.body.appendChild(bar);

  /* parallax targets */
  const par = [
    ...$$('.hero video').map((el) => ({ el, s: 0.18, z: 1.14 })),
    ...$$('.circle video').map((el) => ({ el, s: 0.06, z: 1, base: 'translate(-50%,-50%)' })),
    ...$$('.tpic').map((el) => ({ el, s: 0.04, z: 1, box: true })),
  ];
  const tick = () => {
    const h = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, scrollY / h) : 0) + ')';
    par.forEach((p) => {
      const r = (p.box ? p.el : p.el.parentElement).getBoundingClientRect();
      if (r.bottom < -100 || r.top > innerHeight + 100) return;
      const d = (r.top + r.height / 2 - innerHeight / 2) * -p.s;
      if (p.box) p.el.style.backgroundPosition = '50% ' + (50 + d * 0.15) + '%';
      else p.el.style.transform = (p.base ? p.base + ' ' : '') + 'translate3d(0,' + d.toFixed(1) + 'px,0)' + (p.z > 1 ? ' scale(' + p.z + ')' : '');
    });
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  /* heading word-by-word reveal */
  $$('.sec-h2, .hero h1').forEach((h) => {
    if (h.children.length) return;
    const words = h.textContent.trim().split(/\s+/);
    h.textContent = '';
    words.forEach((w, i) => {
      const o = document.createElement('span');
      o.className = 'wd';
      const n = document.createElement('span');
      n.textContent = w;
      n.style.transitionDelay = i * 60 + 'ms';
      o.appendChild(n);
      h.appendChild(o);
      if (i < words.length - 1) h.appendChild(document.createTextNode(' '));
    });
    h.classList.add('split');
    const io = new IntersectionObserver((en) => { if (en[0].isIntersecting) { h.classList.add('wd-in'); io.disconnect(); } }, { threshold: 0.3 });
    io.observe(h);
  });

  /* stat counters */
  $$('.stat b').forEach((b) => {
    const m = b.textContent.match(/^(\D*)(\d[\d,.]*)(.*)$/);
    if (!m) return;
    const end = parseFloat(m[2].replace(/,/g, ''));
    const dec = (m[2].split('.')[1] || '').length;
    const io = new IntersectionObserver((en) => {
      if (!en[0].isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const step = (t) => {
        const k = Math.min(1, (t - t0) / 1600);
        const e = 1 - Math.pow(1 - k, 4);
        b.textContent = m[1] + (end * e).toLocaleString('en', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + m[3];
        if (k < 1) requestAnimationFrame(step); else b.textContent = m[1] + m[2] + m[3];
      };
      requestAnimationFrame(step);
    }, { threshold: 0.6 });
    io.observe(b);
  });

})();

/* ---- Sticky footer (reveal-from-behind). Falls back to normal flow if the footer is taller than the screen. ---- */
(() => {
  const wrap = document.querySelector('.sfw');
  const foot = wrap && wrap.querySelector('.foot');
  if (!foot) return;
  const fit = () => {
    const sticky = foot.offsetHeight <= window.innerHeight;
    wrap.classList.toggle('on', sticky);
    wrap.style.height = sticky ? foot.offsetHeight + 'px' : '';
  };
  fit();
  if ('ResizeObserver' in window) new ResizeObserver(fit).observe(foot);
  window.addEventListener('resize', fit);
  window.addEventListener('load', fit);
  const prog = () => {
    const r = wrap.getBoundingClientRect();
    const k = Math.max(0, Math.min(1, (window.innerHeight - r.top) / Math.max(1, foot.offsetHeight) - 0.15));
    foot.style.setProperty('--fp', (k * k * (3 - 2 * k)).toFixed(3));
    requestAnimationFrame(prog);
  };
  requestAnimationFrame(prog);
})();
