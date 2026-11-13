/* Uniqorn Lab — motion layer (ul-anim.js). Paired with ul-anim.css.
   Must be loaded AFTER </x-dc> (the page runtime mangles camelCase inside <helmet>). */
(function () {
  'use strict';
  var reduce = false;
  try { reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  var wide = function () { return window.innerWidth >= 860; };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var safe = function (fn) { try { fn(); } catch (e) { console.warn('[ul-anim]', e); } };

  /* ── 1. scroll progress + sticky header + active nav ───────────── */
  var prog, header;
  function chrome() {
    header = document.querySelector('header');
    if (!document.getElementById('ul-prog')) {
      prog = document.createElement('div');
      prog.id = 'ul-prog';
      document.body.appendChild(prog);
    }
    var secs = [].slice.call(document.querySelectorAll('section[id]'));
    var links = [].slice.call(document.querySelectorAll('header nav a'));
    if (secs.length && links.length && !window.__ulNav) {
      window.__ulNav = true;
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return;
          links.forEach(function (a) {
            if (a.getAttribute('href') === '#' + e.target.id) a.setAttribute('data-ul-active', '');
            else a.removeAttribute('data-ul-active');
          });
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      secs.forEach(function (s) { io.observe(s); });
    }
  }

  /* ── 2. reveal: stagger, direction, hand back to CSS when done ─── */
  var revIO = null;
  function reveals() {
    var els = [].slice.call(document.querySelectorAll('[data-r]'));
    var groups = new Map();
    els.forEach(function (el) {
      var p = el.parentElement;
      if (!p) return;
      if (!groups.has(p)) groups.set(p, []);
      groups.get(p).push(el);
    });
    groups.forEach(function (list) {
      if (list.length < 2) return;
      list.forEach(function (el, i) {
        if (!el.style.getPropertyValue('--d')) el.style.setProperty('--d', (i * 0.09).toFixed(2) + 's');
      });
    });
    dir('#top > div > div', 'l'); dir('#top img[alt*="ascot"]', 'r');
    dir('#teams [data-ring]', 'r');

    /* the page's own runtime marks these with data-in, but it misses a few
       (the hero buttons never appear) — mark them ourselves as they show up */
    if (!revIO && window.IntersectionObserver) {
      revIO = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return;
          e.target.setAttribute('data-in', '');
          revIO.unobserve(e.target);
        });
      }, { rootMargin: '0px 0px -6% 0px', threshold: 0.05 });
    }
    if (revIO) els.forEach(function (el) { if (!el.hasAttribute('data-in')) revIO.observe(el); });
  }
  function dir(sel, d) {
    var el = document.querySelector(sel);
    if (el && el.hasAttribute('data-r') && !el.hasAttribute('data-in')) el.setAttribute('data-ul-dir', d);
  }
  /* once an element's reveal has played out, drop the animation so that
     :hover transforms (which the page sets inline) are not overridden */
  function sweep() {
    var list = document.querySelectorAll('[data-r][data-in]:not([data-ul-done])');
    for (var i = 0; i < list.length; i++) {
      var el = list[i];
      var as = el.getAnimations ? el.getAnimations() : [];
      var running = false;
      for (var j = 0; j < as.length; j++) if (as[j].playState !== 'finished') running = true;
      if (!running) el.setAttribute('data-ul-done', '');
    }
  }

  /* ── 3. headings: lines rise out of a mask, neon glitch ────────── */
  function headings() {
    var hs = [].slice.call(document.querySelectorAll('#top h1, section h2'));
    hs.forEach(function (h) {
      if (h.dataset.ulLines !== undefined) return;
      if (h.hasAttribute('data-a')) return; /* page choreographs this one itself */
      var kids = [].slice.call(h.childNodes).filter(function (n) {
        return !(n.nodeType === 3 && !n.textContent.trim());
      });
      if (!kids.length) return;
      var lines = [[]];
      var allEl = kids.every(function (n) { return n.nodeType === 1 && n.nodeName !== 'BR'; });
      if (allEl && kids.length > 1) { lines = kids.map(function (n) { return [n]; }); }
      else {
        kids.forEach(function (n) {
          if (n.nodeName === 'BR') lines.push([]);
          else lines[lines.length - 1].push(n);
        });
      }
      lines = lines.filter(function (l) { return l.length; });
      h.dataset.ulLines = '';
      var had = h.hasAttribute('data-r');
      h.removeAttribute('data-r');
      h.removeAttribute('data-in');
      var frag = document.createDocumentFragment();
      lines.forEach(function (nodes, i) {
        var wrap = document.createElement('div');
        wrap.className = 'ul-line';
        wrap.style.setProperty('--d', (i * 0.11).toFixed(2) + 's');
        var inner = document.createElement('span');
        inner.className = 'ul-li';
        nodes.forEach(function (n) { inner.appendChild(n); });
        wrap.appendChild(inner);
        frag.appendChild(wrap);
      });
      while (h.firstChild) h.removeChild(h.firstChild); /* drop leftover <br> / whitespace */
      h.appendChild(frag);
      if (reduce) { play(h); return; }
      var io = new IntersectionObserver(function (es, obs) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return;
          play(h);
          obs.disconnect();
        });
      }, { rootMargin: '0px 0px -12% 0px', threshold: 0.15 });
      io.observe(h);
      if (had && h.getBoundingClientRect().top < innerHeight * 0.9) play(h);
    });
  }
  function play(h) {
    if (h.dataset.ulPlayed !== undefined) return;
    h.dataset.ulPlayed = '';
    var ls = [].slice.call(h.querySelectorAll('.ul-line'));
    ls.forEach(function (l) { l.setAttribute('data-ul-in', ''); });
    if (reduce) return;
    var neon = h.querySelector('span[style*="text-fill-color:transparent"]');
    if (neon) {
      var d = (ls.length - 1) * 0.11 + 0.75;
      neon.style.setProperty('--gd', d.toFixed(2) + 's');
      neon.classList.add('ul-glitch');
      setTimeout(function () { neon.classList.remove('ul-glitch'); }, (d + 1) * 1000);
    }
  }

  /* ── 4. ambient glow blobs ─────────────────────────────────────── */
  function blobs() {
    var list = [].slice.call(document.querySelectorAll('section > div[style*="radial-gradient(closest-side"]'));
    list.forEach(function (b, i) {
      if (b.dataset.ulBlob !== undefined) return;
      var base = b.style.transform;
      if (base) { b.style.setProperty('--base', base); b.style.transform = ''; }
      var sx = i % 2 ? -1 : 1;
      b.style.setProperty('--dx', (sx * (34 + (i % 3) * 16)) + 'px');
      b.style.setProperty('--dy', ((i % 2 ? 1 : -1) * (26 + (i % 4) * 10)) + 'px');
      b.style.setProperty('--ds', (1.06 + (i % 3) * 0.05).toFixed(2));
      b.style.setProperty('--dur', (19 + (i % 5) * 3) + 's');
      b.style.setProperty('--dl', (-(i * 1.7)).toFixed(1) + 's');
      b.setAttribute('data-ul-blob', '');
    });
  }

  /* ── 5. hero mascot: idle float + pointer/scroll parallax ──────── */
  function hero() {
    var img = document.querySelector('#top img[alt*="ascot"]');
    if (!img) return;
    var par = img.closest ? img.closest('.ul-par') : null;
    if (par && par.isConnected !== false) return;
    var outer = document.createElement('div');
    outer.className = 'ul-par';
    outer.style.justifySelf = img.style.justifySelf || 'center';
    outer.style.width = '100%';
    var inner = document.createElement('div');
    inner.className = 'ul-float';
    inner.style.display = 'flex';
    inner.style.justifyContent = 'center';
    img.parentNode.insertBefore(outer, img);
    outer.appendChild(inner);
    inner.appendChild(img);
  }

  /* ── 6. game cards: cover zoom, sheen, live dot ────────────────── */
  function cards() {
    var cs = [].slice.call(document.querySelectorAll('#games article, #games a[data-r]'));
    cs.forEach(function (c) {
      if (c.dataset.ulCard !== undefined) return;
      c.dataset.ulCard = '';
      var cover = c.querySelector('img') && c.querySelector('img').parentElement;
      if (cover) {
        cover.classList.add('ul-cover');
        if (!cover.querySelector('.ul-sheen')) {
          var sh = document.createElement('span');
          sh.className = 'ul-sheen';
          cover.appendChild(sh);
        }
      }
      var dot = c.querySelector('span > span');
      if (dot && /live/i.test(dot.parentElement.textContent)) dot.classList.add('ul-dot');
    });
  }

  /* ── 7. magnetic buttons ───────────────────────────────────────── */
  function buttons() {
    var bs = [].slice.call(document.querySelectorAll('a[style*="min-height:4"]'));
    bs.forEach(function (b) {
      if (b.dataset.ulMag !== undefined) return;
      b.dataset.ulMag = '';
      b.setAttribute('data-ul-mag', '');
      if (reduce) return;
      b.addEventListener('pointermove', function (e) {
        if (e.pointerType === 'touch') return;
        var r = b.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2) / r.width;
        var y = (e.clientY - r.top - r.height / 2) / r.height;
        b.style.transform = 'translate3d(' + (x * 9).toFixed(1) + 'px,' + (y * 5).toFixed(1) + 'px,0)';
      });
      b.addEventListener('pointerleave', function () { b.style.transform = ''; });
      b.addEventListener('pointerup', function () { b.style.transform = ''; });
    });
  }

  /* ── 8. numbers count up ───────────────────────────────────────── */
  function numbers() {
    var nodes = [].slice.call(document.querySelectorAll('#why div, #games span'));
    nodes.forEach(function (el) {
      if (el.dataset.ulNum !== undefined || el.children.length) return;
      var t = el.textContent.trim();
      var m = /^(RTP\s+)?(\d{1,3})(?:\.(\d))?(%?)$/.exec(t);
      if (!m) return;
      el.dataset.ulNum = '';
      var dec = m[3] !== undefined ? 1 : 0;
      var target = parseFloat(m[2] + (dec ? '.' + m[3] : ''));
      var start = m[1] ? Math.max(0, target - 6) : 0;
      var pre = m[1] || '', suf = m[4] || '';
      if (reduce) return;
      var io = new IntersectionObserver(function (es, obs) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return;
          obs.disconnect();
          var t0 = performance.now(), dur = 1100;
          (function step(now) {
            var p = clamp((now - t0) / dur, 0, 1);
            var v = start + (target - start) * (1 - Math.pow(1 - p, 3));
            el.textContent = pre + v.toFixed(dec) + suf;
            if (p < 1) requestAnimationFrame(step);
          })(t0);
        });
      }, { threshold: 0.6 });
      io.observe(el);
    });
  }

  /* ── 9. crew: parallax + idle spotlight on desktop ─────────────── */
  var lastPointer = 0;
  function crew() {
    var crewSec = document.querySelector('[data-spot]');
    if (!crewSec || crewSec.dataset.ulCrew !== undefined) return;
    crewSec.dataset.ulCrew = '';
    document.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'touch') lastPointer = Date.now();
    }, { passive: true });
    if (reduce) return;
    setInterval(function () {
      if (!wide() || document.hidden) return;
      if (Date.now() - lastPointer < 2600) return;
      var r = crewSec.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      crewSec.style.setProperty('--mx', (20 + Math.random() * 60).toFixed(1) + '%');
      crewSec.style.setProperty('--my', (24 + Math.random() * 42).toFixed(1) + '%');
    }, 2700);
  }

  /* ── 10. contact slot machine: neon flicker + click to respin ──── */
  function slot() {
    var c = document.getElementById('contact');
    if (!c || c.dataset.ulSlot !== undefined) return;
    var strips = [].slice.call(c.querySelectorAll('[data-a="spin"]'));
    if (!strips.length) return;
    c.dataset.ulSlot = '';
    var sign = [].slice.call(c.querySelectorAll('span')).filter(function (s) {
      return !s.children.length && /uniqorn lab/i.test(s.textContent);
    })[0];
    if (sign && !reduce) sign.classList.add('ul-neon');
    var box = strips[0].parentElement.parentElement;
    if (!box) return;
    box.classList.add('ul-reels');
    box.title = 'Spin';
    box.addEventListener('click', function () {
      if (reduce) return;
      strips.forEach(function (s, i) {
        var t = s.style.getPropertyValue('--t') || (1.6 + i * 0.4) + 's';
        s.style.animation = 'none';
        void s.offsetWidth;
        s.style.animation = 'u-spin ' + t + ' cubic-bezier(.15,.5,.25,1.04) both';
      });
    });
  }

  /* ── 11. one rAF loop for scroll / pointer parallax ────────────── */
  var sy = 0, mx = 0, my = 0, dirty = true, tick = 0;
  function onScroll() { sy = window.pageYOffset || document.documentElement.scrollTop || 0; dirty = true; }
  function onMove(e) {
    if (e.pointerType === 'touch') return;
    mx = (e.clientX / innerWidth - 0.5);
    my = (e.clientY / innerHeight - 0.5);
    dirty = true;
  }
  function frame() {
    if (!document.hidden && ++tick % 20 === 0) safe(sweep);
    if (dirty && !document.hidden) {
      dirty = false;
      safe(function () {
        var max = document.documentElement.scrollHeight - innerHeight;
        prog = prog && prog.isConnected !== false ? prog : document.getElementById('ul-prog');
        if (prog) prog.style.transform = 'scaleX(' + (max > 0 ? clamp(sy / max, 0, 1) : 0) + ')';
        header = header && header.isConnected !== false ? header : document.querySelector('header');
        if (header) {
          if (sy > 30) header.setAttribute('data-ul-stuck', '');
          else header.removeAttribute('data-ul-stuck');
        }
        if (reduce) return;
        var crewImg = document.querySelector('[data-crew-img]');
        var crewSec = document.querySelector('[data-spot]');
        if (crewImg && crewSec) {
          if (wide()) {
            var r = crewSec.getBoundingClientRect();
            var q = clamp((innerHeight - r.top) / (innerHeight + r.height), 0, 1);
            crewImg.style.transform = 'scale(1.08) translate3d(0,' + ((q - 0.5) * -46).toFixed(1) + 'px,0)';
          } else if (crewImg.style.transform) {
            crewImg.style.transform = '';
          }
        }
      });
    }
    requestAnimationFrame(frame);
  }

  /* ── safety net ────────────────────────────────────────────────
     a few headings animate themselves (data-a) and one of them — the contact
     one — never gets its trigger, so it stays invisible at scale(.4).
     If such an element is on screen and still invisible, fade it in. */
  var rescued = false;
  function rescue() {
    if (rescued) return;
    var list = [].slice.call(document.querySelectorAll('[data-a]'));
    if (!list.length || !window.IntersectionObserver) return;
    rescued = true;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        setTimeout(function () {
          if (!el.isConnected || el.hasAttribute('data-ul-rescue')) return;
          if (parseFloat(getComputedStyle(el).opacity) > 0.05) { io.unobserve(el); return; }
          /* leave it alone while its own animation is still playing */
          if (el.getAnimations && el.getAnimations().length) { io.unobserve(el); return; }
          el.setAttribute('data-ul-rescue', '');
          io.unobserve(el);
        }, 2500);
      });
    }, { threshold: 0.1 });
    list.forEach(function (el) { io.observe(el); });
  }

  /* ── boot ──────────────────────────────────────────────────────── */
  function init() {
    safe(chrome); safe(reveals); safe(headings); safe(blobs);
    safe(cards); safe(buttons); safe(numbers); safe(crew); safe(slot); safe(rescue);
    dirty = true;
  }
  function boot() {
    var tries = 0;
    (function waitFor() {
      if (document.querySelector('#games article') || tries++ > 60) {
        init();
        var n = 0, iv = setInterval(function () { init(); if (++n > 6) clearInterval(iv); }, 1200);
        return;
      }
      setTimeout(waitFor, 100);
    })();
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', function () { dirty = true; }, { passive: true });
    document.addEventListener('pointermove', onMove, { passive: true });
    onScroll();
    requestAnimationFrame(frame);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
