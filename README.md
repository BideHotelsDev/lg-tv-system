# bide guest TV — Phase 1b guest pages

TV-first HTML5 guest pages for the bide guest TV platform, hosted on bide's own
stack. Layer 3 of the platform: the pages the television points at.

**Design spec:** [`docs/superpowers/specs/2026-08-28-bide-tv-guest-pages-design.md`](docs/superpowers/specs/2026-08-28-bide-tv-guest-pages-design.md)
**Visual contract:** `docs/reference/bide_tv_welcome_screen.html`

## Run it locally

```bash
npm run dev          # serves public/ on http://localhost:8080
```

Then open `http://localhost:8080/?room=4`.

Test at **exactly** 1920×1080 and 1366×768, and drive it with arrow keys and
Enter only. If it cannot be operated from the keyboard it cannot be operated
from a remote.

## Compatibility gate

The build floor is **Chromium 87** — the LG 32LN661H runs webOS 22, and two of
the three dev-kit sets are that model. Anything newer than Chrome 87 is a bug
waiting to happen in Thurso.

```bash
npm install          # dev tooling only, nothing ships to the television
npm run check        # doiuse on the CSS, eslint-plugin-compat on the JS
```

## Structure

```
public/
  index.html            welcome screen
  house/ nc500/ eat/ stay/     section pages — every card is a link
  house/heating/ nc500/dunnet-head/ ...   a detail page per card (spec 6.6)
  watch/<app>/          "Opening BBC iPlayer" — simulates the app launching
  cast/paired/          pairing completes by itself, then confirms
  eat/<place>/booked/   pick a sitting, get a confirmation
  stay/late-checkout/until-1pm/ ...  confirmations that name what you chose

The flow is a walkable prototype of the guest experience (spec 6.8). A small
"Prototype" chip marks it; set demo:false in config/the-view.js to remove it
along with the simulated responses.
  watch/ cast/          "how to" pages — these tiles cannot launch native
                        apps until Pro:Centric exists (spec 6.2)
  debug/                diagnostics, unlinked — there are no devtools on a hotel TV
  assets/bide.css       every design token and component
  assets/bide.js        room resolution, clock, arrow-key nav, idle refresh
  config/the-view.js    per-property configuration
  sw.js                 minimal service worker — offline shell
  offline.html          branded fallback, never the browser's error page
```

## Per-TV setup

Each television's browser home page (or boot URL) carries its room:

```
https://<bide-tv-domain>/?room=4
```

The room is stored in `sessionStorage` so it survives navigation between pages.
An absent or unknown room degrades to the generic welcome — never an error.

## Deploying a change

- **Content or config change** — edit and deploy. It reaches the televisions on
  the next page load, or within a few hours via the idle self-refresh.
- **CSS or JS change** — bump the `?v=` query in the HTML files *and* the
  `CACHE` name and `SHELL` list in `sw.js`. If you forget, the service worker
  now revalidates in the background and the change lands one reload later
  rather than never — but bump it anyway.

## Deploying

**Live:** https://guest-tv-production.up.railway.app

Railway service `guest-tv` (project `lg-tv-system`, environment `staging`) is linked to this repo,
so **`git push` to `main` deploys**. Railway builds the `Dockerfile` and runs
Caddy, which is how the cache headers the design depends on are ours to set
rather than the platform's to grant.

Verified live: `no-cache` on HTML, config and the service worker;
`max-age=31536000` on `/assets/*`; unknown paths serve the branded offline
page rather than a server error.

This URL serves the **prototype** — `demo: true`, invented restaurants,
content still pending. Right for the dev kit; not for the nine live rooms.

## Before this goes near The View

Every item on the dev-kit verification list in §10 of the spec, on the 32"
first. It is the harder target in every dimension: older engine, fewer pixels,
smaller panel.
