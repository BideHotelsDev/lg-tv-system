# bide guest TV — Phase 1b HTML5 guest pages

**Design specification**

| | |
|---|---|
| Date | 2026-08-28 |
| Phase | 1b — bide content pages (no LG licence required) |
| Author | Kyle Mendoza, Technology & Development, bide |
| Status | For review |
| Source documents | `docs/reference/bide_TV_Scope_and_Information_Pack_Kyle_v1.docx` (v1.0, Aug 2026) · `docs/reference/bide_tv_welcome_screen.html` (approved mockup) |

---

## 1. Purpose

Build the bide guest TV content as a set of TV-first HTML5 pages, hosted on bide's own stack, so that content updates without touching a single television. These are the same pages Pro:Centric will surface in Phase 1c, so building them now is a head start rather than throwaway work.

### 1.1 In scope

- Five guest-facing content pages: welcome, house guide, explore the NC500, eat & drink, your stay
- Two short "how to" pages behind the Watch and Cast tiles, which cannot launch apps before Phase 1c (§6.2)
- A shared design system derived from the approved mockup, working on both TV platforms in the estate
- Per-room personalisation without a PMS
- Per-property configuration supporting Phase 5 replication
- Offline and failure behaviour
- A verification path that catches mistakes on the dev kit rather than in guest rooms

### 1.2 Out of scope

- Pro:Centric portal configuration (Phase 1c — requires licence)
- MEWS integration and guest-name personalisation (Phase 2)
- Upsell and messaging engine (Phase 3)
- Owner welcome video (Phase 4)
- Weather / KP-index integration (Phase 3 — see §8.5)
- Any content management system or admin UI (see §5.1)
- Any bide Investments content, per the channel firewall in §11 of the scope pack

---

## 2. Context

### 2.1 Where these pages sit

The platform has three layers. This spec covers layer 3 only.

| Layer | What it is | Needs LG licence? |
|---|---|---|
| 1 — TV local | Hotel-mode lockdown, splash, app launcher, casting | No |
| 2 — Pro:Centric | Branded portal shell, remote management | Yes |
| **3 — bide content** | **These pages, hosted on bide's stack** | **No** |

The branded interface is **not** an application installed on the television. LG's Pro:Centric Developer Program — the route that would allow a bespoke on-TV app — is partner-exclusive, gated behind a regional sales engineer and an NDA/DLA contract, and is explicitly excluded by §3.2 of the scope pack. What we build is a web application on bide's own hosting that the television points at. This distinction drives every decision below.

### 2.2 Hardware reality

The estate is not a single platform. Confirmed specifications:

| | LG 43UK762H | LG 32LN661H |
|---|---|---|
| Where | 9 sets live at The View; 1 in the dev kit | 2 in the dev kit |
| Resolution | 1920 × 1080 | **1366 × 768** |
| Platform | webOS 25 | **webOS 22** |
| Web engine | Chromium 120 (Dec 2023) | **Chromium 87 (Oct 2020)** |
| Pro:Centric | Cloud-ready | Cloud 1.0 / Direct 5.0 |

Both models are confirmed by JP-UK as Pro:Centric Cloud supported.

### 2.3 The dev kit

One 43" and two 32" sets are held off-estate as a development and test kit, separate from the nine live sets at The View. This is a deliberate strategic choice: it allows every configuration step, every clone file and every page to be proven against **both** platforms without a guest ever seeing a half-built screen, and it doubles as the master-TV bench required to author `.tlx` clone files remotely (see §2.4).

### 2.4 Remote manageability

Once a television is pointed at a Pro:Centric server, LG's E-Z Installation provides remote download of splash screen images, TV configuration and firmware, administered through the Pro:Centric Admin Client. Practical consequences:

- **One on-site visit per set, ever** — to point installer menu items `098 PRO:CENTRIC` and `119 DATA CHANNEL` at the Cloud server. Everything after that is remote.
- **Remote clone distribution is limited** to Installer Menu and Setup Menu profiles. Notably, pre-loaded application selections cannot be edited in the Cloud Configuration Tool and require a `.tlx` exported from a **master TV of the same model** — which is what the dev kit provides.
- **Configuration updates land on a daily cycle**, via the Wake For Update mechanism (items `121` / `122`), not instantly.

This yields a governing principle for this spec:

> **Anything that might change goes in the web layer, not the TV layer.**

Content in these pages is instant, licence-free and identical across both models. Anything baked into TV configuration is next-day, model-specific, and must be maintained twice.

---

## 3. Constraints

### 3.1 Build floor: `chrome >= 87`

Because two of the three dev-kit sets — and any future property's existing hardware — run Chromium 87, the build floor is Chromium 87, not Chromium 120. This is a deliberate replication decision, not defensive hedging: a codebase that renders correctly on a 2020 engine at 1366×768 renders correctly on everything above it.

**Unavailable and therefore not used:** container queries (`container-type`, `cqh`/`cqw`), `:has()`, `aspect-ratio`, `text-wrap: balance`, CSS anchor positioning, `light-dark()`, `structuredClone`, top-level `await`.

**Available and used freely:** CSS custom properties, Grid, Flexbox `gap`, `clamp()` / `min()` / `max()`, `:focus-visible`, `@media (hover)`, `prefers-reduced-motion`, service workers, woff2, ES2020.

### 3.2 Two render targets

1920 × 1080 and 1366 × 768. Note that 1366 × 768 is not exactly 16:9, and hospitality sets may overscan. The layout must be genuinely fluid, with the mockup's 5% inset serving as overscan safe area.

### 3.3 Launch route is unresolved, and the design must not depend on it

The complete installer menu item table (000–122) in LG's Commercial Mode Setup Guide contains **no boot-to-URL setting**. Power-on behaviour is tuner and input oriented (`004 STRT CHANNEL`, `046 STRT AUX SRCE`, `007 STRT VOLUME`). The only item that hands the boot screen to a custom interface is `098 PRO:CENTRIC`, which requires the licence.

However, under IP Environment Setup → Pre-loaded Apps, the **Web Browser** application can be pinned to the Smart Launcher, and the manual states: *"If desired, with the Web Browser application, you may specify the default home page."* Pre-loaded app selections are clonable. When the Pro:Centric application is disabled, the Smart Launcher is reachable via the PORTAL key.

That manual documents a US 2018-generation set. It is strong evidence, not proof, for UK webOS 25 hardware.

**Design response — the pages are indifferent to how they are launched:**

| Route | Availability |
|---|---|
| Boot target | If the dev-kit spike finds a start-up app setting |
| Browser home page, one PORTAL press | Guaranteed floor, no licence |
| Pro:Centric tile | Phase 1c, same URL |
| Future property, other hardware | Same URL |

One artefact, launched four ways. The launch mechanism is configuration, not architecture.

---

## 4. Design system

The approved mockup is the visual contract (§10 of the scope pack). It is a more complete system than "mockup" suggests, and the following is treated as settled.

### 4.1 Settled from the mockup

**Palette** — declared as CSS custom properties; the first four are the brand palette in §11.1 of the pack verbatim.

| Token | Hex |
|---|---|
| Fir Green | `#172D23` |
| Gorse Yellow | `#FAB30C` |
| Slate Black | `#191D1B` |
| Stone Grey | `#F9F8F3` |
| Fir Deep | `#0F211A` |
| Fir Mist | `#244233` |

Plus Stone at 60% / 35% / 14% opacity for hierarchy.

**The ground** — a five-stop vertical gradient (deep → fir → mist at 66% → fir → deep), with the gorse horizon line on the 66% stop and a soft radial glow above it. The signature motif; carries across every page.

**Type** — TT Ramillas (display) at weights 340 and 420; Jost (UI/body) at 300/400/500/600. Display type appears in exactly two places: the wordmark and the greeting. This restraint is load-bearing.

**Layout** — 5% inset on all sides, doubling as overscan safe area.

**One interaction primitive** — focus lifts an element by 1% of screen height, turns border and icon gorse, washes the background gorse at 7%. Nothing else moves. `prefers-reduced-motion` disables it.

### 4.2 Changes from the mockup

**Container units become viewport units.** Every dimension in the mockup is `cqh`/`cqw`, requiring container queries (Chrome 105). On a real television the page *is* the viewport, so `cqh` → `vh` and `cqw` → `vw` is a direct substitution with identical results. The `.tv` wrapper, `container-type` and `aspect-ratio` are removed — they exist only to draw a simulated television inside a desktop browser. The `.hint` element is removed. Everything else in the mockup's stylesheet is Chromium 87 safe.

**Text gains an absolute floor.** Proportional sizing renders the tile descriptions at roughly 20px on the 43" and 14px on the 32". Common practice for TV body text at 1080p is nearer 24–28px at typical viewing distance; 14px on a 32" HD panel viewed from a bed is not legible. Sizes therefore use `clamp()` with a floor, meaning type on the 32" is proportionally larger relative to the screen than on the 43". This is correct for a smaller, lower-resolution panel at a similar viewing distance.

**Starting values are set in CSS and calibrated on the actual 32" during the dev-kit pass** (§10, item 3). They are not derived from arithmetic alone.

Floors are chosen so that they do **not** bind at 1920×1080 — the 43" therefore renders at the mockup's original proportions, and the floors take effect only on the smaller panel.

**The tile rail gains a second layout at 768p.** Six tiles across 1366px yields roughly 187px per tile; the tile descriptions wrap to four or five lines and overflow the 22vh tile height.

- **43" (1920×1080): 6 × 1**, pixel-true to the approved mockup. Single-axis navigation.
- **32" (1366×768): 3 × 2**, via a width media query. Same tiles, same styling, same order, two rows. Roughly double the tile width, so descriptions sit on two comfortable lines.

Descriptions are retained at both sizes — they orient a first-time guest, and dropping them loses more than it saves.

**Per-property recolour is free.** The gradient and horizon line are built from the same custom properties, so the Phase 5 requirement to recolour the horizon motif per property is a handful of hex values in one config file (§7.2). No template changes, no forked stylesheet.

---

## 5. Architecture

### 5.1 Approach: plain static files, no build step

Considered and rejected:

- **A static site generator (11ty / Astro).** Earns its keep when per-property variants multiply. With one property live and one in prospect, it inserts a toolchain between the author and the output for no present gain. The code is organised so this migration is mechanical later.
- **Dynamic server rendering.** The natural home for Phase 2 personalisation, but that belongs in a middleware service. Building a server now means a runtime that can be down at the moment a guest turns on the television, in exchange for capability that is licence-gated. A static site cannot have that failure mode.
- **Any CMS or admin UI.** Content is edited a few times a month at most, by one person. David and Samantha message Kyle, who makes the change. Building an editing interface for that workflow is unjustified.

### 5.2 File layout

```
/                       welcome  (index.html)
/house/                 house guide
/nc500/                 explore the NC500
/eat/                   eat & drink
/stay/                  your stay
/watch/                 how to reach the TV apps (§6.2)
/cast/                  how casting works (§6.2)
/<section>/<item>/      a detail page per card (§6.6)
/debug/                 diagnostic page, unlinked (§9.2)

/assets/bide.css        all tokens and components — one file
/assets/bide.js         remote navigation enhancement + clock
/assets/fonts/          self-hosted TT Ramillas + Jost (woff2)
/config/the-view.js     property configuration (§7.2)
/sw.js                  service worker (§8.3)
```

### 5.3 Separate documents, not a single-page app

Each page is an independently loadable, independently addressable, independently survivable HTML document. On a device where devtools cannot be opened and the hardware cannot be reached, that isolation outweighs any elegance a client-side router would provide. It also lets Pro:Centric link directly to `/house/` as a tile target in Phase 1c with no new work, and lets the remote's Back key behave correctly without reimplementing history.

### 5.4 Accepted duplication

With no build step, the top bar and footer markup repeat across the five documents — roughly fifteen lines each. Injecting them with JavaScript would give a single source, but a script failure would then cost the wordmark, clock and WiFi details on every page simultaneously. Repeating the markup keeps the shell as plain HTML that renders even if scripting fails entirely. This decision reverses cleanly if the project later moves to a static site generator.

### 5.5 Hosting

The existing bide stack on Railway, per §5.2 of the scope pack. Static file serving; no runtime process.

---

## 6. Pages, navigation and remote handling

### 6.1 The five pages

| Page | Content |
|---|---|
| Welcome `/` | Greeting, room, checkout time, WiFi, six-tile rail — the mockup as approved |
| House guide `/house/` | Heating, hot water, quirks of a heritage building, how to reach the team |
| Explore the NC500 `/nc500/` | Dunnet Head, beaches, distilleries, the Orkney ferry |
| Eat & drink `/eat/` | Honest local recommendations |
| Your stay `/stay/` | Late checkout, the bill, message the team, book direct / bide Club |

### 6.2 Watch and Cast tiles in Phase 1b

Two of the six tiles cannot perform their intended function before Pro:Centric exists. "Watch" and "Cast your phone" require launching native webOS applications (iPlayer, ITVX, Screen Share). A web page in the television's browser cannot launch a native application; there is no URI scheme available to it. That capability belongs to the Pro:Centric layer.

**Resolution: in Phase 1b these two tiles link to short "how to" pages** — which remote key to press and what will be found there; for casting, how QR pairing works and what the WiFi details are.

This is not purely a stopgap. No guest arriving in a hotel room knows a hospitality remote, and two tiles explaining how the television works is genuinely useful orientation consistent with the platform's tone. In Phase 1c the same tiles are rewired to launch directly — same design, same position, different target. Nothing is discarded.

The alternative — showing four tiles in 1b and six in 1c — changes the layout under live guests and means the approved six-tile rail does not exist until the licence does.

### 6.3 Navigation model

One model across every page: **focus moves, Enter selects, Back goes home.**

- **Arrow keys** move focus. Welcome rail: single axis on the 43", two axes on the 32" grid. Content pages: vertical only.
- **Enter** activates the focused item.
- **Back** returns to the welcome screen. The webOS Back keycode is handled alongside standard keys, since browsers vary in how they surface it. Every page also carries a visible route home — a key that only sometimes works is worse than no key.
- **Magic Remote pointer** continues to work. The mockup already handles `click` and `mouseenter` alongside keys; this is retained, because some rooms will have a pointer remote and some will not.

**Focus is never lost and never invisible.** Focus lands on the first item at load. The gorse lift is the only focus style, identical on every page.

### 6.4 Tiles are links

Each tile is an `<a href>` rather than a JavaScript-driven element. `bide.js` adds the gorse lift, the clock and the room resolution as enhancement; if it throws, every word remains readable and every link remains a real link.

**Revised after bench testing.** This section originally relied on the browser's own spatial navigation to move between links with the arrow keys. Testing showed desktop Chromium does not do this at all — it sits behind a flag — and whether the webOS browser does is unverified. Relying on it would have meant shipping navigation nobody had ever driven with a remote.

Arrow-key navigation is therefore **handled explicitly in `bide.js`**: a roving focus across the grid, reading the column count from the computed grid so the same code serves the 6×1 and 3×2 layouts, clamping at the edges rather than wrapping. Enter is left to the browser, since a focused anchor follows its own link natively.

The tiles and cards stay real anchors regardless. If `bide.js` fails to load, the content remains readable and the links remain links, navigable by whatever focus handling the television's browser does provide.

### 6.6 Every card is a link

Content cards were originally focusable but inert: focus landed on them, the border turned gorse, and Enter did nothing. A guest cannot distinguish "this is only text" from "this is broken", so every card now has a destination.

- **Informational cards** (house guide, NC500, eat & drink, watch, cast) open a **detail page** — longer prose plus a short practical block: distance, key to press, booking advice. A few cards cross-link to an existing page instead of duplicating one; the WiFi card on the casting page points at the house guide's WiFi page rather than repeating the password in a second place.
- **Action cards** (Your stay: late checkout, message the team, book direct) open a **mock screen**, marked unmistakably with a gorse `MOCK SCREEN — NOT CONNECTED` flag and a note saying what will replace it and when. A half-finished screen that looks finished is how a guest presses something that silently does nothing.

**Back is hierarchical.** A detail page returns to its section; a section returns to the welcome screen. The target is written once into `data-bide-back` on the body, read by both the Back key and the visible footer link, so the two cannot disagree.

**Cost, stated plainly:** this takes the site from 7 pages to 30. Each is small and self-contained, but a new restaurant is now a card *and* a detail page. If the count grows much past this, that is the signal to move to approach B (§5.1) — templates and content files — and the migration stays mechanical.

**What "mock" does and does not mean.** Three different things unlock at three different times, and only one is LG:

| Mock today | Replaced by | When |
|---|---|---|
| Watch / Cast tiles not launching apps | Pro:Centric Cloud — a web page cannot launch a native app | Phase 1c |
| Late checkout, message, book direct | MEWS + GHL. Not an LG product | Phase 3 |
| Detail pages for beaches, restaurants, heating | Nothing — these are bide's own pages, real now | — |

Note also that the **LG Pro:Centric Developer Program is not the route** (§2.1). What gets purchased is the Pro:Centric Cloud subscription.

### 6.7 Actions will hand off to the guest's phone

Recorded here because it constrains Phase 3 and was decided during this build: **a television cannot take typed input.** A D-pad and an on-screen keyboard make any form hostile. So an action is either one-press with nothing to type ("late checkout, please"), or it presents a QR and the guest completes it on their phone — the same handoff the casting flow already teaches them. The TV presents and hands off; the phone transacts.

### 6.8 The prototype flow

The pages are built as a **walkable prototype of the guest experience**, not documentation about it. Every tile leads to a screen a guest would meet, every action leads to a confirmation, and there is no commentary in the flow explaining what is or is not wired up.

This was a correction. The first attempt put explanatory notes and `PREVIEW — PHASE 3` chips inside the screens, which is documentation wearing the costume of a product: it makes the flow impossible to feel, which was the entire point of building it.

| Journey | Screens |
|---|---|
| Watch | App row → *Opening BBC iPlayer* with a progress line |
| Cast | Pairing screen with QR → pairs itself after seven seconds → *Paired.* |
| Eat & drink | Three places → a place → pick a sitting → *Table booked.* |
| Late checkout | Pick 12pm / 1pm / 2pm → *That's sorted*, naming the time chosen |
| Message the team | Three one-press requests → *We've got that.* |
| Your bill | Itemised, settled |

**Confirmations are moments, not destinations.** A screen with `data-bide-next` counts down and returns on its own, and any key press skips the wait. That cadence is most of what makes the flow feel like a product rather than a set of linked pages.

**One thing breaks the illusion, deliberately.** A small `Prototype` chip sits above the top bar, drawn only while `demo: true` in the property config. A prototype indistinguishable from a live system is how a guest ends up trusting a screen that cannot do anything. Setting `demo: false` removes the chip and is the switch to throw when the simulated responses are replaced by real ones.

**What is simulated, and what replaces it:**

| Simulated | Replaced by | When |
|---|---|---|
| App tiles opening | Pro:Centric launching the native app | Phase 1c |
| Pairing completing by itself | The TV's own Screen Share app | Phase 1c |
| Table booked, message sent | Partner / GHL routing | Phase 3 |
| Late checkout confirmed | MEWS availability + ops task | Phase 2–3 |
| Bill figures | MEWS | Phase 2 |

**The eat & drink places are invented.** The Harbour Room, Shore Street Kitchen and Bridge Street Bakehouse do not exist. They are there so the booking flow can be walked; the real picks come from David and Samantha, and no real business is described or recommended anywhere in these pages.

**QR slots remain dashed placeholders**, never scannable codes — a guest who scans a fake code and gets nothing is worse served than one who sees no code.

### 6.9 Screen furniture and artwork

Lists of text tell a guest nothing about what watching or browsing feels like, so the browse screens are built the way a television expects: a hero band, horizontal rows of artwork, and row-aware navigation.

**Navigation.** Left and right move along a row; up and down step between rows keeping roughly the same column; edges clamp rather than wrap. A flat index cannot do this because rows are different lengths, so rows are marked `data-nav-row` and `bide.js` walks them as a grid of ragged rows.

**All artwork is inline SVG**, generated from the brand palette — stylised coast scenes for the NC500, interiors for eat & drink, and a hand-drawn map of the north coast. No photography, no map tiles, no provider logos, no external requests of any kind. This keeps the offline shell honest, works on Chromium 87 with no `aspect-ratio`, and costs nothing to serve.

It is also the only defensible option: the restaurants are invented, so photographing them is impossible, and illustrating a real business we have not been to would be worse.

**The map** (`/nc500/map/`) is a stylised coastline from Scrabster to Duncansby with the property marked and each place a focusable pin linking to its page. It is deliberately not survey-accurate — its job is to orient a guest who has just arrived and does not know which way the coast runs.

**Streaming screens use provider names as labels only.** The app tiles say "BBC iPlayer" because that is which app opens; nothing imitates a provider's own interface, branding or artwork, and every programme title is invented. What the real app looks like inside is the provider's business, not bide's.

### 6.5 Scrolling

Free scrolling with a D-pad is hostile. **Content pages are a vertical list of focusable cards; the page scrolls to follow focus.** The guest presses down, the next card takes focus, the page moves itself. They never scroll; they only move between things.

Consequently each card is a self-contained chunk — one heating instruction, one restaurant, one beach — rather than flowing prose. This is a constraint on how content is written, and it improves the content for a television.

**The welcome screen never scrolls**, at either resolution.

---

## 7. Configuration

### 7.1 Per-TV: room identity in the URL

The only difference between the nine sets at The View is which room they are in, and before MEWS exists the only per-set channel available is the URL configured on each television:

```
https://<bide-tv-domain>/?room=4
```

The exact domain is David's to confirm on the existing bide stack (§11); nothing in this design depends on which one it is.

Set once per set, during the same installer pass that points the browser home page (or boot target) at the domain. It survives every launch route in §3.3, because in all cases it is simply a URL. No server, no licence, no PMS.

**If the parameter is absent or unrecognised, the page renders the generic welcome with no room line.** Not an error, not a blank screen — a slightly less personal one. A mistyped URL during installation degrades quietly rather than greeting a guest with something broken.

**The room must survive navigation.** Only the configured home page URL carries the parameter. A guest who opens the house guide and returns home would otherwise land on a parameter-less `/` and see the room line silently vanish mid-stay — which reads as a glitch, not a fallback. On first load `bide.js` therefore stores the resolved room in `sessionStorage`, and the welcome screen reads **parameter first, stored value second**. Chromium 87 supports `sessionStorage`, and the storage is per-session so it cannot outlive a checkout wipe. With JavaScript unavailable the screen degrades to the generic welcome, consistent with §8.3.

Phase 2 replaces this mechanism rather than rebuilding around it.

### 7.2 Per-property: one config file

`/config/the-view.js` defines a single global object holding everything that varies but is not page content:

- Property display name (`The View · Thurso`)
- WiFi network name and password
- Default checkout time
- Room map (`4` → `The Pentland`, for all nine rooms)
- Palette overrides for the Phase 5 horizon recolour

It is a plain script defining one object, **not** a JSON file fetched at runtime: no `fetch`, no async, no CORS, no rejectable promise on an older engine. The configuration is simply present before anything reads it.

**WiFi details are deliberately not mirrored into the HTML as a fallback.** Two sources of truth for a password is how a guest reads a stale one off the screen. The failure it would guard against does not occur in isolation — `config.js` is served alongside `bide.css` from the same host, so if it fails to load the stylesheet has failed too, which is the total-failure case handled in §8.3.

### 7.3 Replication

For a second property: copy the directory, swap the config file, rewrite the content pages. The content *is* the per-property difference — a house guide for a different building is different words, not a template variable. The shared stylesheet, script and palette tokens carry the identity; the config carries the facts. This meets §13's acceptance test of a second property stood up from template in under a day.

---

## 8. Failure, caching and fonts

### 8.1 Caching

Televisions cache aggressively, stay powered for days, and cannot be hard-refreshed by anyone.

- **HTML and `config.js`: `Cache-Control: no-cache`** — revalidate on every load, so a content or WiFi-password change lands on the next page view.
- **CSS, JS, fonts: cached long, with a version in the filename**, bumped by hand on deploy. Manual but predictable, and visible in the diff.

### 8.2 Idle self-refresh

"Next page load" is insufficient when a television in an empty room may sit on the welcome screen for days. **If there has been no remote input for 30 minutes and the page has been open more than a few hours, the page quietly reloads.** Idle-gated, so it cannot occur while a guest is reading. This is what makes an edit from a laptop reach nine screens in Thurso with nobody touching them.

### 8.3 Never blank, never broken

Four failure modes and their mitigations:

1. **JavaScript fails** → tiles are real links (§6.4); the browser's native spatial navigation still works; content remains readable.
2. **Fonts load slowly** → `font-display: swap` with a real fallback stack behind each face. A slow font shows the greeting in a fallback serif rather than showing nothing.
3. **Network unavailable at boot** → a **minimal service worker** caches the shell (HTML, CSS, JS, fonts, config). After the first successful load the television renders the full welcome screen with no network at all. Chromium 87 supports service workers; Railway provides the required HTTPS.
4. **Failure past all of the above** → a bide-styled offline page (fir ground, gorse horizon, one calm line) rather than the browser's error screen.

**A bug found on the bench, recorded here because it is the exact failure this section warns about.** The first implementation revalidated cached assets in the background but never passed that revalidation to `event.waitUntil()`. The browser is free to terminate a service worker once it has responded, so the cache write could be killed before it completed — leaving a stale stylesheet that never healed. It surfaced on the very first CSS edit: the page kept rendering old styles while the server was serving new ones. With `waitUntil` in place the fix is verified — an edit with no version bump now lands on the second load. On unreachable hardware that difference is "one reload" versus "drive to Caithness."

**Stated risk.** The service worker is the most bug-prone component in this design. Cache invalidation on unreachable hardware is how a screen ends up serving last month's content with no obvious remedy. It is therefore kept deliberately minimal — cache the shell, revalidate in the background, let the idle reload (§8.2) pick up new versions — and its update path receives the most rigorous dev-kit testing of anything in this spec (§10, item 4).

### 8.4 Fonts

TT Ramillas (display) and Jost (UI), both **self-hosted** as woff2 rather than loaded from Google Fonts — one fewer external dependency at boot, and Ramillas is not available there in any case. The mockup's Google Fonts link is removed.

TT Ramillas is licensed, with files held by Asa Rodger / WorkByPage. §12 of the scope pack directs requesting these now; this is the single genuine external dependency in Phase 1b. Until the files arrive, development uses Fraunces as the mockup does, and the swap is a single `@font-face` change with no other edits.

### 8.5 Weather line

The mockup's top bar shows a live weather line. The weather / KP-index integration is Phase 3. It is **omitted from Phase 1b**: a network call that can hang or fail is the wrong thing to place in the top bar of a screen that must never look broken. The clock remains; the layout slot remains, ready.

### 8.6 Greeting before MEWS

Without MEWS there is no guest name. Rather than reduce the greeting to a bare "Fàilte" and lose the gorse accent that gives the screen its rhythm, the accent moves to the room name — the one fact available:

> **Fàilte.**
> You're in Room 4 · *The Pentland*. Checkout is at 11am.

Same layout, same colour weight.

**Note that the checkout _date_ is also unavailable in Phase 1b** — it is guest-specific and arrives with MEWS. The mockup's "staying with us till Saturday, 11am" therefore becomes the property's default checkout time from config (§7.2) until Phase 2. In Phase 2 the name returns to the display line, the room name reverts to plain stone, and the full checkout date returns. The design does not change; the variables move.

---

## 9. Testing and acceptance

### 9.1 Three tiers

Desktop Chrome is not Chromium 87, and a browser window is not a 32" panel across a room.

**Tier 1 — local.** Static file server, tested at exactly 1366×768 and 1920×1080, driven entirely by arrow keys and Enter. No mouse. If it cannot be operated from the keyboard, it cannot be operated from a remote.

**Tier 2 — compatibility gate.** A dev-only `package.json` (nothing ships to the television) with `browserslist` set to `chrome >= 87`, `doiuse` for CSS and `eslint-plugin-compat` for JavaScript. Catches modern features that work locally and fail silently in Thurso.

**Tier 3 — the dev kit, which is the one that counts.** Every page is accepted on the **32" first** — older engine, fewer pixels, smaller panel. If it is right there, the 43" is comfortable. **Nothing reaches The View until the kit passes.**

### 9.2 Diagnostic page

Devtools cannot be opened on a hospitality television. An unlinked `/debug/` page prints, in large readable type: user-agent string, actual viewport dimensions, pass/fail for each depended-upon feature, service worker registration state and served version, and whether the config loaded and which room resolved.

### 9.3 Acceptance criteria

Mapping to deliverable 2 in §13 of the scope pack — "all pages live, on-brand, editable, TV-navigable":

- [ ] All five content pages and both how-to pages reachable and correct on both panels, from a remote, with no mouse
- [ ] Every page navigable by arrow keys alone; focus always visible; Back always returns home
- [ ] `?room=N` resolves correctly for all nine View rooms
- [ ] The room line still renders after navigating to another page and returning home
- [ ] A missing or invalid `room` value degrades to the generic welcome, never an error
- [ ] A content edit deployed from a laptop appears on a television with nobody touching it
- [ ] Disconnecting the network still shows the welcome screen, not a browser error
- [ ] Brand fidelity confirmed against the mockup on the 43", where the design is pixel-true

---

## 10. Dev-kit verification list

Everything deferred to hardware, in one place. Ordered by what blocks the most.

1. **Can the television boot straight to a URL, or is it the browser home page behind one key?** Settles whether §3.3's boot target or browser-home floor is the reality.
2. **Does Railway allow custom `Cache-Control` headers?** §8.1 depends on it. Fallback is versioning the HTML, which is clumsier.
3. **Type-size floors calibrated on the actual 32" panel** (§4.2).
4. **Service worker update path** — deploy a change, confirm it reaches the set, confirm it cannot become stuck on a stale version. Test hardest.
5. **The Back key's actual keycode** on the real remote (§6.3).
6. **Overscan** — does the 5% inset hold, or does the panel eat the edges?
7. **The idle reload firing** (§8.2).
8. **Arrow-key navigation driven from the actual remote**, both layouts (§6.4). The JavaScript handler is verified in desktop Chromium; the remote's key codes are not.
9. **Welcome screen left idle for 30+ minutes — confirm the URL never changes on its own.** A single unexplained navigation occurred during bench testing and did not reproduce across roughly fifteen subsequent loads; it was almost certainly a test-harness race. A screen that wanders off on its own in an empty room is worth ten minutes to rule out.

---

## 11. Dependencies and open items

| Item | Owner | Blocking? |
|---|---|---|
| TT Ramillas font files + licence | Asa Rodger / WorkByPage | Not blocking build; blocking final brand sign-off. Request now. |
| Page content — house guide, NC500 picks, eat & drink, your stay | David / Samantha | Blocking content completion, not structure |
| bide domain + Railway hosting | David / existing stack | Ready per §12 |
| Room map for all nine View rooms | David | Blocking `?room=` configuration |
| Confirmation that Pro:Centric Cloud can surface externally hosted pages | JP-UK | Not blocking 1b; **blocking 1c scope** — see §12.1 |

### 11.1 Brand sign-off

§13 of the scope pack attaches Asa's brand-fidelity sign-off to deliverable 3 (the Pro:Centric interface), not deliverable 2. Deliverable 2 requires only "on-brand" without naming an arbiter. Since this spec proposes deviations from the approved mockup's measurements on the 32" (§4.2), photographing the result on the dev-kit 32" and sharing it is cheap and sensible — but it is not a gate in this plan.

---

## 12. Findings for the scope pack

Items surfaced during this design that are not reflected in the v1.0 information pack and should be fed back.

### 12.1 Pro:Centric Cloud surfacing bide's pages is unconfirmed

§5.2 assumes Pro:Centric will surface these HTML pages in Phase 1c. LG's public documentation describes the Cloud editor as drag-and-drop templates and widgets, and does **not** advertise custom HTML or arbitrary external-URL rendering. It is Pro:Centric **Direct / SI** that is documented as supporting "web apps that reside in the cloud or Internet, with the TV launching a browser to a predefined URL."

**This should join the [TO CONFIRM] list in §9 of the pack, alongside price and tier, before purchase.** It does not affect Phase 1b — the pages are portable to any launch route — but it materially affects 1c's shape.

### 12.2 MEWS is not a named Pro:Centric PMS

Pro:Centric Cloud connects directly with OPERA PMS; other systems integrate via an "External IF (RESTful API)" / Open API. Phase 2 personalisation is therefore middleware mapping MEWS to LG's Open API, and whether that API is included in the PCC-30CL tier is unconfirmed. This affects the Phase 2 estimate.

### 12.3 The 32" exception is no longer an exception

§6.2 treats the 32LN661H as a rare fallback to avoid. With two in the dev kit and unknown hardware at future properties, Chromium 87 and 1366×768 are first-class targets. This is reflected throughout this spec and is the reason for the `chrome >= 87` build floor.

---

## Appendix — sources

Primary sources consulted for the platform and hardware facts above:

- LG *Commercial Mode Setup Guide* (206-4323, UV770H, Rev D) — installer menu item table 000–122, Pre-loaded Apps / Web Browser default home page, E-Z Installation, clone file distribution limits, Wake For Update
- [webOS TV Developer — Web API and Web Engine](https://webostv.developer.lge.com/develop/specifications/web-api-and-web-engine) — Chromium version per platform
- [webOS TV Developer — Enyo and Enact Guide](https://webostv.developer.lge.com/develop/guides/enyo-enact-guide) — Enact version support per webOS TV release
- [Pro:Centric Developer](https://procentric.developer.lge.com/) — programme access requirements, HCAP / IDCAP
- [LG Pro:Centric Cloud (Global)](https://www.lg.com/global/business/commercial-display/software-services/lg-procentric-cloud/) and [(UK)](https://www.lg.com/uk/business/commercial-display/software-services/lg-procentric-cloud/) — editor capabilities, OPERA PMS, Open API
- [LG Pro:Centric Direct](https://www.lg.com/global/business/commercial-display/software-services/lg-procentric-direct/) — cloud/Internet-hosted web apps launched at a predefined URL
- JP-UK product listing, LG 32LN661H — webOS 22, 1366×768, Pro:Centric Cloud 1.0

*Note: the Commercial Mode Setup Guide is for a US 2018-generation set. Its mechanisms are long-standing, but specifics are treated as strong evidence rather than proof for UK webOS 25 hardware, and appear on the dev-kit verification list (§10).*
