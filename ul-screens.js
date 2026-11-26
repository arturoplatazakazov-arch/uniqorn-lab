/* Uniqorn Lab — one block = one screen (ul-screens.js, pairs with ul-screens.css).
   Splits the long games block into three screens: three live games per screen,
   then the "coming soon" row. Load after </x-dc>. */
(function () {
  'use strict';
  function split() {
    var games = document.getElementById('games');
    if (!games || document.getElementById('games-3')) return;
    var inner = games.firstElementChild;
    while (inner && getComputedStyle(inner).position === 'absolute') inner = inner.nextElementSibling;
    if (!inner) return;

    /* blocks inside the games section: [heading] [play now + grid] [coming soon + grid] */
    var blocks = [].slice.call(inner.children);
    if (blocks.length < 3) return;
    var live = blocks[1], soon = blocks[2];
    var liveGrid = live.children[1], soonGrid = soon.children[1];
    if (!liveGrid || !soonGrid) return;
    var cards = [].slice.call(liveGrid.children);
    if (cards.length < 4) return;

    games.setAttribute('data-screen-live', '');
    liveGrid.className = (liveGrid.className ? liveGrid.className + ' ' : '') + 'ul-grid';
    soonGrid.className = (soonGrid.className ? soonGrid.className + ' ' : '') + 'ul-grid';

    function screenFrom(node, id) {
      var sec = document.createElement('section');
      sec.id = id;
      sec.setAttribute('data-screen-label', id);
      sec.setAttribute('style', games.getAttribute('style') || '');
      var dots = games.firstElementChild;
      if (dots && getComputedStyle(dots).position === 'absolute') sec.appendChild(dots.cloneNode(true));
      var wrap = document.createElement('div');
      wrap.setAttribute('style', inner.getAttribute('style') || '');
      wrap.appendChild(node);
      sec.appendChild(wrap);
      return sec;
    }

    /* the second half of the live cards gets a screen of its own */
    var half = Math.ceil(cards.length / 2);
    var grid2 = liveGrid.cloneNode(false);
    for (var i = half; i < cards.length; i++) grid2.appendChild(cards[i]);

    var sec2 = screenFrom(grid2, 'games-2');
    var sec3 = screenFrom(soon, 'games-3');
    games.parentNode.insertBefore(sec2, games.nextSibling);
    sec2.parentNode.insertBefore(sec3, sec2.nextSibling);
    if (window.__uCheck) window.__uCheck();
  }

  /* the header sits in the flow above the first section: without taking its
     height off, the hero is centred 68px too low and spills past the fold */
  function headVar() {
    var h = document.querySelector('header');
    if (!h) return;
    var px = Math.round(h.getBoundingClientRect().height);
    if (px > 0) document.documentElement.style.setProperty('--ul-hdr', px + 'px');
  }

  /* the hero headline is set in a pixel font, so no clamp() guess fits every
     window: a line either gets clipped or ends up tiny. Measure instead.
     Wide enough for whole phrases per line — keep them and use the size the
     stylesheet asks for. Too narrow — let the lines wrap at spaces and size
     the type to the longest word, which is far bigger than squeezing the
     whole phrase into one line would allow (24px instead of 16 on a phone). */
  var HERO_MAX = 34;   /* never bigger than this, however much room there is */
  var HERO_WRAP_VP = 700; /* below this width a phrase may break across lines */
  function textWidth(h1, strings) {
    var cs = getComputedStyle(h1);
    var probe = document.createElement('span');
    probe.style.cssText = 'position:absolute;left:-9999px;top:0;white-space:pre;visibility:hidden;pointer-events:none';
    probe.style.fontFamily = cs.fontFamily;
    probe.style.fontSize = cs.fontSize;
    probe.style.fontWeight = cs.fontWeight;
    probe.style.letterSpacing = cs.letterSpacing;
    document.body.appendChild(probe);
    var max = 0;
    strings.forEach(function (s) {
      probe.textContent = s;
      var w = probe.getBoundingClientRect().width;
      if (w > max) max = w;
    });
    probe.remove();
    return max;
  }
  function fitHero() {
    var h1 = document.querySelector('#top h1');
    if (!h1 || !h1.children.length) return;
    var spans = [].slice.call(h1.children);
    /* ul-anim.js re-wraps each line as .ul-line > .ul-li > <span>, and the
       stylesheet's nowrap sits on that innermost span — reach them all */
    var inner = [].slice.call(h1.querySelectorAll('*'));
    h1.style.removeProperty('font-size');
    inner.forEach(function (s) { s.style.removeProperty('white-space'); });
    var avail = h1.clientWidth;
    if (!avail) return;
    var cur = parseFloat(getComputedStyle(h1).fontSize);
    if (!cur) return;
    var lines = spans.map(function (s) { return s.textContent.trim(); });
    var wLine = textWidth(h1, lines);
    if (!wLine) return;
    var fsLine = cur * (avail - 2) / wLine;   /* biggest size with a phrase per line */

    /* desktop keeps the phrasing and the size the design asks for — step in
       only when a line would be clipped */
    if (innerWidth >= 1100) {
      if (wLine <= avail - 2) return;
      h1.style.setProperty('font-size', Math.max(12, Math.floor(fsLine * 10) / 10) + 'px', 'important');
      return;
    }
    /* tablets: still a phrase per line, but filling the column reads far
       better than the 16px the vw-based size falls back to */
    if (innerWidth > HERO_WRAP_VP) {
      h1.style.setProperty('font-size', Math.max(12, Math.floor(Math.min(HERO_MAX, fsLine) * 10) / 10) + 'px', 'important');
      return;
    }

    /* phones: a whole phrase on one line leaves the type tiny, so let the
       lines break at spaces and size them to the longest word instead */
    var words = lines.join(' ').split(/\s+/).filter(Boolean);
    var wWord = textWidth(h1, words);
    var fsWord = wWord ? cur * (avail - 2) / wWord : 0;
    var capLine = Math.min(HERO_MAX, fsLine);
    var capWord = Math.min(HERO_MAX, fsWord);
    var fs, wrap;
    if (capWord > capLine * 1.12) { fs = capWord; wrap = true; }
    else { fs = capLine; wrap = false; }
    fs = Math.max(12, Math.floor(fs * 10) / 10);
    /* ul-anim.css sets the size with !important, so match it */
    h1.style.setProperty('font-size', fs + 'px', 'important');
    if (wrap) inner.forEach(function (s) { s.style.setProperty('white-space', 'normal', 'important'); });
  }

  /* the contact screen is the tallest block: the slot machine can push the
     two buttons past the fold on a short window, in a browser whose chrome
     eats more height than we guessed. Measure and scale it until it fits. */
  function flowChild(sec) {
    var kids = [].slice.call(sec.children);
    for (var i = 0; i < kids.length; i++) {
      if (getComputedStyle(kids[i]).position !== 'absolute') return kids[i];
    }
    return null;
  }
  function fitContact() {
    var sec = document.getElementById('contact');
    if (!sec) return;
    var inner = flowChild(sec);
    if (!inner || inner.children.length < 3) return;
    var slot = inner.children[1];
    slot.style.transform = '';
    slot.style.margin = '';
    if (!matchMedia('(min-width:1100px) and (min-height:680px)').matches) return;
    var cs = getComputedStyle(sec);
    var avail = innerHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    /* measure the children, not the wrapper: a squeezed flex item reports
       its own shrunken height while its children spill past the fold */
    var kids = [].slice.call(inner.children);
    var top = Infinity, bot = -Infinity;
    kids.forEach(function (k) {
      var r = k.getBoundingClientRect();
      if (r.height) { top = Math.min(top, r.top); bot = Math.max(bot, r.bottom); }
    });
    var h = bot - top;
    if (h <= avail - 6) return;
    var sh = slot.getBoundingClientRect().height;
    if (sh < 80) return;
    var k = Math.max(0.55, (sh - (h - avail) - 16) / sh);
    slot.style.transformOrigin = 'center';
    slot.style.transform = 'scale(' + k.toFixed(3) + ')';
    slot.style.margin = (-(sh * (1 - k) / 2)).toFixed(1) + 'px 0';
  }

  /* any other block that still runs a little past its screen is scaled as a
     whole — a few percent is invisible, a clipped line is not */
  function fitRest() {
    var secs = [].slice.call(document.querySelectorAll('section[id]'));
    var on = matchMedia('(min-width:1100px) and (min-height:680px)').matches;
    secs.forEach(function (sec) {
      if (sec.id === 'contact') return;
      var inner = flowChild(sec);
      if (!inner) return;
      inner.style.transform = '';
      if (!on) return;
      var cs = getComputedStyle(sec);
      var avail = innerHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      var r = inner.getBoundingClientRect();
      if (r.height <= avail - 2) return;
      var k = Math.max(0.78, (avail - 10) / r.height);
      inner.style.transformOrigin = 'center';
      inner.style.transform = 'scale(' + k.toFixed(3) + ')';
    });
  }
  var fitting = false;
  function fitAll() {
    if (fitting) return;
    fitting = true;
    try { fitHero(); fitContact(); fitRest(); } catch (e) { console.warn('[ul-screens]', e); }
    fitting = false;
  }

  function boot() {
    headVar();
    var ft;
    function refit() { clearTimeout(ft); ft = setTimeout(fitAll, 120); }
    addEventListener('resize', refit);
    /* headings and reveals keep changing the height for a few seconds after
       load, so keep re-fitting until the page settles, then watch for changes */
    var runs = 0;
    var fitIv = setInterval(function () { fitAll(); if (++runs > 26) clearInterval(fitIv); }, 450);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refit);
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(refit);
      setTimeout(function () {
        [].slice.call(document.querySelectorAll('section[id]')).forEach(function (sec) {
          var inner = flowChild(sec);
          if (inner) ro.observe(inner);
        });
      }, 1500);
    }
    addEventListener('resize', headVar);
    setTimeout(headVar, 1200);
    setTimeout(headVar, 3000);
    var n = 0;
    var iv = setInterval(function () {
      try { split(); } catch (e) { console.warn('[ul-screens]', e); }
      if (document.getElementById('games-3') || ++n > 20) clearInterval(iv);
    }, 400);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
