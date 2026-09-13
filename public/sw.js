/* ============================================================
   bide guest TV — service worker

   Deliberately minimal. Its only job is that the welcome screen
   still renders when the broadband is down. Cache invalidation on
   hardware four hundred miles away is the main way this project
   could embarrass itself, so:

     - HTML is network-first. A live network always wins, so a
       content edit can never be masked by the cache.
     - skipWaiting + clients.claim, so a new version takes effect on
       the next load rather than waiting for every tab to close.
     - Bump CACHE on every deploy that changes the shell.

   Verify the update path on the dev kit before this goes near
   The View (spec 10.4).
   ============================================================ */

var CACHE = 'bide-tv-v19';

var SHELL = [
  '/',
  '/house/',
  '/nc500/',
  '/eat/',
  '/eat/map/',
  '/stay/',
  '/watch/',
  '/cast/',
  '/offline.html',
  '/assets/bide.css?v=19',
  '/assets/bide.js?v=19',
  '/config/the-view.js?v=19'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(SHELL);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        if (key !== CACHE) return caches.delete(key);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;

  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  /* Pages: network first, cache as the safety net, branded offline page as
     the last resort. Never the browser's error screen. */
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.open(CACHE).then(function (cache) {
        return fetch(req).then(function (res) {
          cache.put(req, res.clone());
          return res;
        }).catch(function () {
          /* ignoreSearch so an offline boot at /?r=<code> is served by the
             cached copy of /. The room comes from location.search via
             JavaScript, not from the HTML, so any cached copy is correct. */
          return cache.match(req, { ignoreSearch: true }).then(function (hit) {
            return hit || cache.match('/offline.html');
          });
        });
      })
    );
    return;
  }

  /* Photographs: cache first, and never revalidated.
     A seed photograph is immutable — the filename changes when the
     picture does, because the property config names the file. Putting
     them through stale-while-revalidate would refetch several hundred
     kilobytes on every page load of a television that is already showing
     the right image, over a hotel's broadband, for nothing.

     They are deliberately NOT in SHELL: precaching three megabytes of
     photographs on install would make the first load of the welcome
     screen wait for pictures nobody has asked to see yet. They arrive as
     they are used, and are there from then on. */
  if (req.url.indexOf('/assets/seed/') !== -1) {
    event.respondWith(
      caches.open(CACHE).then(function (cache) {
        return cache.match(req).then(function (hit) {
          if (hit) return hit;
          return fetch(req).then(function (res) {
            if (res && res.status === 200) cache.put(req, res.clone());
            return res;
          });
        });
      })
    );
    return;
  }

  /* Assets: stale-while-revalidate.
     Serve the cached copy immediately so the screen survives an outage, and
     ALWAYS refetch in the background so the next load is correct. The
     revalidation is handed to waitUntil deliberately: without it the browser
     may terminate the worker before the cache write completes, which strands
     every television on a stale stylesheet with no way to recover remotely.
     This was a real bug found on the bench, not a hypothetical. */
  event.respondWith(
    caches.open(CACHE).then(function (cache) {
      return cache.match(req).then(function (hit) {
        var live = fetch(req).then(function (res) {
          cache.put(req, res.clone());
          return res;
        }).catch(function () {
          return hit;
        });
        event.waitUntil(live);
        return hit || live;
      });
    })
  );
});
