/* Uniqorn Lab — screen-by-screen scrolling (ul-snap.js).
   Two modes, set by data-ul-snap on the <script> tag:
     soft — the page scrolls freely but settles on the nearest section start
     deck — hard page-by-page: a snap point every screen height
   Load after </x-dc>, like ul-anim.js. */
(function () {
  'use strict';
  var me = document.currentScript;
  var mode = (me && me.getAttribute('data-ul-snap')) || 'soft';
  var reduce = false;
  try { reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  var css = document.createElement('style');
  css.textContent = mode === 'deck'
    ? 'html{scroll-snap-type:y mandatory;scroll-padding-top:0!important}' +
      'section[id]{scroll-margin-top:0!important}' +
      '.ul-snap-pt{position:absolute;left:0;width:1px;height:1px;pointer-events:none;scroll-snap-align:start;scroll-snap-stop:always}'
    : 'html{scroll-snap-type:y proximity}' +
      'section[id]{scroll-snap-align:start}' +
      'footer{scroll-snap-align:end}';
  document.head.appendChild(css);
  if (reduce) { css.textContent = ''; return; }

  if (mode !== 'deck') return;

  /* page-by-page scrolling only where a block really is one screen tall —
     on a phone the blocks are much taller, so screens would cut them anywhere */
  var deckOK = matchMedia('(min-width:1100px) and (min-height:680px)');
  var deckCSS = css.textContent;
  function applyMode() {
    css.textContent = deckOK.matches ? deckCSS : '';
    host.style.display = deckOK.matches ? '' : 'none';
  }
  if (deckOK.addEventListener) deckOK.addEventListener('change', applyMode);
  else if (deckOK.addListener) deckOK.addListener(applyMode);

  /* deck mode: lay a snap point every screen height, and align it to a
     section start whenever one is close, so screens still begin on a block */
  var host = document.createElement('div');
  host.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:0;pointer-events:none;z-index:-1';
  document.body.appendChild(host);
  applyMode();

  function build() {
    host.innerHTML = '';
    var vh = window.innerHeight;
    var page = document.documentElement.scrollHeight;
    var off = function (el) { return Math.round(el.getBoundingClientRect().top + window.pageYOffset); };
    /* places a screen is allowed to start: section starts, and inside the long
       games block the start of every card row, so screens never cut a card */
    var anchors = [].slice.call(document.querySelectorAll('section[id]')).map(off);
    /* when the one-screen layout is on, every block already is a screen —
       extra anchors inside a block would only stop the deck mid-section */
    var oneScreen = !!document.querySelector('#games[data-screen-live]') &&
      matchMedia('(min-width:1100px) and (min-height:680px)').matches;
    if (!oneScreen) {
      [].slice.call(document.querySelectorAll('section article, section [data-r]'))
        .forEach(function (el) {
          if (el.getBoundingClientRect().height >= 120) anchors.push(off(el) - 46);
        });
    }
    anchors = anchors.filter(function (v, i, a) { return v >= 0 && a.indexOf(v) === i; })
      .sort(function (a, b) { return a - b; });

    var y = 0, guard = 0;
    while (y < page - vh * 0.6 && guard++ < 200) {
      var pt = document.createElement('div');
      pt.className = 'ul-snap-pt';
      pt.style.top = Math.max(0, y) + 'px';
      host.appendChild(pt);
      /* the next screen starts at the first block that did not fit on this one,
         so a screen never cuts a card in half */
      var next = y + vh;
      for (var i = 0; i < anchors.length; i++) {
        if (anchors[i] >= y + vh * 0.55) {
          if (anchors[i] <= y + vh * 1.15) next = anchors[i];
          break;
        }
      }
      y = Math.round(next);
    }
    /* make sure the very bottom of the page can be rested on */
    var last = host.lastChild ? parseInt(host.lastChild.style.top, 10) : 0;
    if (page - vh - last > 24) {
      var end = document.createElement('div');
      end.className = 'ul-snap-pt';
      end.style.top = Math.round(page - vh + 60) + 'px';
      host.appendChild(end);
    }
  }
  var t;
  function rebuild() { clearTimeout(t); t = setTimeout(build, 150); }
  setTimeout(build, 1500);
  setTimeout(build, 3000);
  addEventListener('resize', rebuild);
  addEventListener('load', rebuild);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(rebuild);
  /* the markers are absolute positions: anything that changes the page height
     (late images, web fonts, the games split) makes them stale */
  var h0 = 0;
  setInterval(function () {
    var h = document.documentElement.scrollHeight;
    if (h !== h0) { h0 = h; rebuild(); }
  }, 500);
})();
