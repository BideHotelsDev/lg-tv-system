/* ============================================================
   bide guest TV — shared behaviour

   Enhancement only. Every tile and card is a real <a href>, so the
   pages remain readable and every link remains a link if this file
   fails to load or throws.

   Target: Chromium 87. ES2020. No optional catch binding beyond
   what Chrome 87 supports, no .at(), no Object.hasOwn, no
   structuredClone, no top-level await.
   ============================================================ */
(function () {
  'use strict';

  var CFG = window.BIDE || {};
  var ROOM_KEY = 'bide.room';

  /* ---------------------------------------------------------
     Room identity
     The room lives in the URL of each TV's configured home page.
     It must survive navigation: a guest who opens the house guide
     and comes back would otherwise land on a bare "/" and watch the
     room line disappear mid-stay. Parameter first, session second.
     --------------------------------------------------------- */
  function resolveRoom() {
    var room = null;

    try {
      var match = /[?&]room=([^&#]+)/.exec(window.location.search);
      if (match) room = decodeURIComponent(match[1]);
    } catch (e) { /* malformed URL — fall through to storage */ }

    if (room) {
      try { window.sessionStorage.setItem(ROOM_KEY, room); } catch (e) {}
      return room;
    }

    try { room = window.sessionStorage.getItem(ROOM_KEY); } catch (e) {}
    return room;
  }

  function roomName(room) {
    if (!room || !CFG.rooms) return null;
    return CFG.rooms[room] || null;
  }

  /* ---------------------------------------------------------
     Fill in whatever this page asks for.
     Any element with data-bide="key" gets its text set. Missing
     values leave the element alone rather than blanking it, and
     elements marked data-bide-hide-if-empty are removed entirely
     so nothing renders as a gap.
     --------------------------------------------------------- */
  function fill() {
    var room = resolveRoom();
    var name = roomName(room);

    var values = {
      'property': CFG.property ? CFG.property.label : null,
      'wifi-network': CFG.wifi ? CFG.wifi.network : null,
      'wifi-password': CFG.wifi ? CFG.wifi.password : null,
      'checkout-time': CFG.checkout ? CFG.checkout.time : null,
      'room-number': room,
      'room-name': name
    };

    var nodes = document.querySelectorAll('[data-bide]');
    for (var i = 0; i < nodes.length; i++) {
      var key = nodes[i].getAttribute('data-bide');
      var value = values[key];
      if (value) nodes[i].textContent = value;
    }

    /* The room line only makes sense when we know the room.
       No room -> the generic welcome. Not an error, just less personal. */
    var roomLines = document.querySelectorAll('[data-bide-room-line]');
    for (var j = 0; j < roomLines.length; j++) {
      if (room && name) {
        roomLines[j].className += ' is-shown';
      } else {
        roomLines[j].parentNode.removeChild(roomLines[j]);
      }
    }
  }

  /* ---------------------------------------------------------
     Clock — the TV's own time, no network
     --------------------------------------------------------- */
  function startClock() {
    var el = document.getElementById('clock');
    if (!el) return;

    function tick() {
      var d = new Date();
      var h = String(d.getHours());
      var m = String(d.getMinutes());
      el.textContent = (h.length < 2 ? '0' + h : h) + ':' + (m.length < 2 ? '0' + m : m);
    }
    tick();
    window.setInterval(tick, 15000);
  }

  /* ---------------------------------------------------------
     Focus
     The browser's own focus handling does the moving; this only
     paints it, so arrow keys still work if the script dies.
     --------------------------------------------------------- */
  function focusables() {
    return document.querySelectorAll('.tile, .card, .btn, .app, .poster, .apptile, .home-link');
  }

  function startFocus() {
    var items = focusables();
    if (!items.length) return;

    for (var i = 0; i < items.length; i++) {
      (function (el) {
        el.addEventListener('focus', function () {
          el.classList.add('is-focused');
          if (el.scrollIntoView) {
            el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
          }
        });
        el.addEventListener('blur', function () { el.classList.remove('is-focused'); });
        el.addEventListener('mouseenter', function () { el.focus(); });
      })(items[i]);
    }

    /* Focus is never lost and never invisible. */
    var first = document.querySelector('.tile, .card, .btn, .app, .poster, .apptile');
    if (first) first.focus();
  }

  /* ---------------------------------------------------------
     Arrow-key navigation

     Originally this relied on the browser's own spatial navigation.
     Testing showed desktop Chromium does not do it at all (it sits
     behind a flag), and whether the webOS browser does is unverified
     — so relying on it would have meant shipping navigation nobody
     had actually driven with a remote. Handled explicitly here.

     The tiles and cards remain real <a> elements, so if this file
     fails to load the links still work with whatever focus handling
     the television's browser does provide, and Enter still follows
     a focused link natively.
     --------------------------------------------------------- */
  /* Row-based navigation for the streaming screens: left and right move
     along a row, up and down step between rows keeping roughly the same
     position. This is what a remote expects, and a flat index cannot do
     it because rows are different lengths. */
  function startRowNav(rowEls) {
    var rows = [];
    for (var r = 0; r < rowEls.length; r++) {
      var found = rowEls[r].querySelectorAll('.poster, .apptile, .btn, .card');
      if (found.length) rows.push(found);
    }
    if (!rows.length) return false;

    function locate() {
      for (var r = 0; r < rows.length; r++) {
        for (var c = 0; c < rows[r].length; c++) {
          if (rows[r][c] === document.activeElement) return [r, c];
        }
      }
      return null;
    }

    document.addEventListener('keydown', function (e) {
      var at = locate();
      if (!at) return;
      var r = at[0], c = at[1];

      if (e.keyCode === 39) c += 1;
      else if (e.keyCode === 37) c -= 1;
      else if (e.keyCode === 40) r += 1;
      else if (e.keyCode === 38) r -= 1;
      else return;

      e.preventDefault();
      if (r < 0 || r >= rows.length) return;
      if (c < 0) c = 0;
      if (c >= rows[r].length) c = rows[r].length - 1;
      rows[r][c].focus();
    });

    rows[0][0].focus();
    return true;
  }

  function startArrowNav() {
    var rowEls = document.querySelectorAll('[data-nav-row]');
    if (rowEls.length && startRowNav(rowEls)) return;

    var grid = document.querySelector('.tiles') || document.querySelector('.appgrid');
    var items = document.querySelectorAll('.tile, .card, .btn, .app, .poster, .apptile, .home-link');
    if (!items.length) return;

    function columns() {
      if (!grid) return 1;
      var tracks = window.getComputedStyle(grid).gridTemplateColumns;
      if (!tracks) return 1;
      var parts = tracks.split(' ');
      var n = 0;
      for (var i = 0; i < parts.length; i++) { if (parts[i]) n++; }
      return n || 1;
    }

    function activeIndex() {
      for (var i = 0; i < items.length; i++) {
        if (items[i] === document.activeElement) return i;
      }
      return -1;
    }

    document.addEventListener('keydown', function (e) {
      var i = activeIndex();
      if (i < 0) return;

      var cols = columns();
      var next = null;

      if (e.keyCode === 39) { if (cols === 1) return; next = i + 1; }
      else if (e.keyCode === 37) { if (cols === 1) return; next = i - 1; }
      else if (e.keyCode === 40) next = i + cols;
      else if (e.keyCode === 38) next = i - cols;
      else return;

      e.preventDefault();

      /* Clamp at the edges rather than wrapping. Wrapping from the last
         tile back to the first is disorienting with a remote. */
      if (next < 0 || next >= items.length) return;
      items[next].focus();
    });
  }

  /* ---------------------------------------------------------
     Mock actions

     Preview screens represent functionality that is not wired up.
     Every control on them still responds: it shows what would have
     happened and records it, so pressing a button on a real
     television proves the press was received. A preview that does
     nothing when pressed teaches you nothing.

     When a control becomes real, the data-mock attribute comes off
     and a genuine handler goes on. Nothing else changes.
     --------------------------------------------------------- */
  function startMockActions() {
    var controls = document.querySelectorAll('[data-mock]');
    if (!controls.length) return;

    var toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);

    var timer = null;

    function fire(el) {
      var message = el.getAttribute('data-mock') || 'Not connected yet.';
      toast.textContent = message;
      toast.className = 'toast show';

      /* Recorded so it can be read back on /debug/ — there are no
         devtools on a hotel television. */
      try {
        window.sessionStorage.setItem('bide.lastAction', JSON.stringify({
          label: (el.textContent || '').replace(/\s+/g, ' ').substring(0, 60),
          message: message,
          at: new Date().toString()
        }));
      } catch (e) {}

      window.clearTimeout(timer);
      timer = window.setTimeout(function () {
        toast.className = 'toast';
      }, 3200);
    }

    for (var i = 0; i < controls.length; i++) {
      (function (el) {
        el.addEventListener('click', function (e) { e.preventDefault(); fire(el); });
      })(controls[i]);
    }
  }

  /* ---------------------------------------------------------
     Prototype marker

     A small corner chip, drawn only while config.demo is true. It is
     the one thing that breaks the illusion, and it is deliberate: a
     prototype that is indistinguishable from a live system is how a
     guest ends up trusting a screen that cannot do anything. Set
     demo:false in the property config and it disappears along with
     every simulated response.
     --------------------------------------------------------- */
  function startDemoChip() {
    if (!CFG.demo) return;
    var chip = document.createElement('div');
    chip.className = 'demo-chip';
    chip.textContent = 'Prototype';
    document.body.appendChild(chip);
  }

  /* ---------------------------------------------------------
     Screens that move on by themselves

     An "opening BBC iPlayer" screen or a confirmation is a moment,
     not a destination. data-bide-next says where to go and
     data-bide-after says how many seconds to linger, which is what
     makes the flow feel like a product rather than a set of pages.
     Any key press skips the wait.
     --------------------------------------------------------- */
  function startAutoAdvance() {
    var next = document.body.getAttribute('data-bide-next');
    if (!next) return;

    var seconds = parseInt(document.body.getAttribute('data-bide-after'), 10);
    if (isNaN(seconds)) seconds = 5;

    var label = document.querySelector('[data-bide-countdown]');
    var timer = null;
    var done = false;

    function go() {
      if (done) return;
      done = true;
      window.clearInterval(timer);
      window.location.href = next;
    }

    function tick() {
      seconds -= 1;
      if (label) {
        label.textContent = seconds > 0
          ? 'Back in ' + seconds + '\u2026'
          : 'Taking you back\u2026';
      }
      if (seconds <= 0) go();
    }

    if (label) label.textContent = 'Back in ' + seconds + '\u2026';
    timer = window.setInterval(tick, 1000);

    document.addEventListener('keydown', function () { go(); });
    document.addEventListener('click', function () { go(); });
  }

  /* ---------------------------------------------------------
     Back key -> home
     LG's remote sends 461; browsers also surface Backspace and
     Escape depending on context. Handle all three rather than
     betting on one. The visible home link is the real guarantee.
     --------------------------------------------------------- */
  function startBackKey() {
    if (document.body.getAttribute('data-bide-page') === 'welcome') return;

    /* Back goes one level up, not all the way home: a detail page returns to
       its section, a section returns to the welcome screen. The same target
       is written into the visible link in the footer, so the two can never
       disagree. */
    var back = document.body.getAttribute('data-bide-back') || '/';

    document.addEventListener('keydown', function (e) {
      var k = e.keyCode;
      if (k === 461 || k === 27 || (k === 8 && e.target === document.body)) {
        e.preventDefault();
        window.location.href = back;
      }
    });
  }

  /* ---------------------------------------------------------
     Idle self-refresh
     A TV in an empty room can sit on this screen for days and never
     reload, so a content edit would never arrive. Reload only when
     the page is stale AND nobody has touched the remote for a while,
     so it can never happen mid-read.
     --------------------------------------------------------- */
  function startIdleRefresh() {
    var STALE_AFTER = 6 * 60 * 60 * 1000;   /* 6 hours */
    var IDLE_AFTER  = 30 * 60 * 1000;       /* 30 minutes */
    var CHECK_EVERY = 5 * 60 * 1000;        /* 5 minutes */

    var loadedAt = Date.now();
    var lastInput = Date.now();

    function touched() { lastInput = Date.now(); }
    document.addEventListener('keydown', touched, true);
    document.addEventListener('mousemove', touched, true);
    document.addEventListener('click', touched, true);

    window.setInterval(function () {
      var now = Date.now();
      if (now - loadedAt > STALE_AFTER && now - lastInput > IDLE_AFTER) {
        window.location.reload();
      }
    }, CHECK_EVERY);
  }

  /* ---------------------------------------------------------
     Service worker
     Minimal by design — it caches the shell so the welcome screen
     survives a broadband outage, and nothing more. Cache
     invalidation on hardware you cannot reach is the main way this
     project could embarrass itself, so the update path is the most
     heavily tested item on the dev-kit list.
     --------------------------------------------------------- */
  function startServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js').catch(function () {
        /* No offline shell. Everything else still works. */
      });
    });
  }

  function init() {
    try { fill(); } catch (e) {}
    try { startClock(); } catch (e) {}
    try { startFocus(); } catch (e) {}
    try { startArrowNav(); } catch (e) {}
    try { startMockActions(); } catch (e) {}
    try { startDemoChip(); } catch (e) {}
    try { startAutoAdvance(); } catch (e) {}
    try { startBackKey(); } catch (e) {}
    try { startIdleRefresh(); } catch (e) {}
    try { startServiceWorker(); } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
