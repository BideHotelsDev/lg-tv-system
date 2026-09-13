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
  assets/seed/          seed photography, self-hosted, plus its CREDITS.md
  assets/bide.js        room resolution, clock, arrow-key nav, idle refresh
  config/the-view.js    per-property configuration
  sw.js                 minimal service worker — offline shell
  offline.html          branded fallback, never the browser's error page
```

## Seed photography and the map

Two things on these pages are real rather than drawn, and both are built
from licensed sources by scripts in `tools/`. Nothing is fetched at
runtime: every file is served from this repo, so the offline shell stays
honest and no third party learns which rooms are occupied.

### Photographs — `tools/seed/`

```bash
node tools/seed/fetch.mjs      # re-download, resize, rewrite the credits
```

`tools/seed/manifest.json` names sixteen photographs on Wikimedia Commons,
all CC0, CC BY or CC BY-SA. The script fetches them, writes two renditions
into `public/assets/seed/` (1600px for backdrops and hero bands, 560px for
poster cards) and regenerates `public/assets/seed/CREDITS.md`, which the
licences require. The JPEGs are committed; the script exists so the set
can be audited or replaced, not so it runs on deploy.

**This deviates from §6.9 of the spec, deliberately and only for the
prototype.** The spec says all artwork is inline SVG and there is no
photography, for two good reasons: no external requests, and no
illustrating a business we have not been to. The first reason still
holds and is not broken here — the files are ours and are served from
our own origin. The second is why the invented restaurants and the house
guide still use the drawn scenes: a stock photograph of somebody else's
dining room, captioned "The Harbour Room", would be a lie. The NC500
pages are the opposite case. Dunnet Head is a real place a guest will
drive to, and showing them a photograph of it is the whole point.

The nine rooms follow the same rule. Every room at The View is named
after somewhere on this coast, so the welcome screen shows *that place* —
`rooms['hmws9kv'].photo` is the Pentland Firth at dawn, not a stock hotel
bedroom. Free-licence room interiors are, without exception, photographs
of somebody else's mid-range hotel, and putting one behind "Room 4 · The
Pentland" would say something untrue about this room.

**To swap in The View's own photography:** drop the files into
`public/assets/seed/`, change the filenames in `config/the-view.js` and
in the `<img src>` on the NC500 pages, and delete the entries you have
replaced from `manifest.json`. Nothing else changes. When the last one
goes, `CREDITS.md` goes with it.

### The maps — `tools/map/`

```bash
node tools/map/build.mjs coast && node tools/map/inject.mjs coast
node tools/map/build.mjs town  && node tools/map/inject.mjs town
```

Two maps, one builder. **coast** is the north coast for the NC500 guide;
**town** is Thurso at walking scale for eat & drink, with the streets and
the four places pinned. Both are traced from OpenStreetMap through the
Overpass API into `tools/map/*.svg`, and `inject.mjs` pastes each between
the `MAP:BEGIN` / `MAP:END` markers in the pages that show it. Pins sit at
real coordinates.

It is still inline SVG: no tiles, no library, and nothing fetched by the
television. **This is deliberately not Google Maps.** An embedded map is a
third-party script and a live network call on every page load, which is
the one thing the offline shell cannot survive, and it needs an API key
and a billing account to render a map of a town that has not moved since
the nineteenth century. Tracing it once on a laptop costs nothing to
serve, works with the broadband down, and looks like the rest of the
product.

Map data © OpenStreetMap contributors, ODbL. The attribution is recorded
in `public/assets/seed/CREDITS.md` and stays there permanently: unlike
the photographs, the map is not going to be replaced by the property's
own.

Both scripts cache their downloads in `.seed-tmp/`, which is gitignored.
Delete it when you are done.

## Real businesses on the eat & drink pages

The four places on `/eat/` are real: The Northern Plate, Bydand,
Jamieson's and Reid's Bakers. Names, streets and positions come from
OpenStreetMap, and the walking times are measured from the property on
the same data, so every fact on those pages is one somebody else can
check — with one exception.

**The property's own position is a guess.** `here:` in both map configs
in `tools/map/build.mjs` is my reading of where the building is, not a
surveyed point, and it is the only coordinate on these maps that did not
come out of OSM. Both map pins and every walking time hang off it, so
being a hundred metres out moves all of them together. It is marked
`PLACEHOLDER` in the source. Replace it, then rebuild both maps, before
any of this is in front of a guest.

**Nothing on them is a recommendation, and that is the open question.**
§6.9 of the spec had the restaurants invented on purpose: the real picks
were always meant to come from David and Samantha, and a television in a
guest's room saying "where we'd send our own family" about a business
nobody at bide has been to is a claim the property has to stand behind.
So the pages describe and locate; they do not rank, review or praise.
Before this is live, those four need to be the property's four.

Two smaller consequences of using real names:

- **No booking button.** The invented restaurants could answer "Table
  booked for 7:00" because there was nobody to misrepresent. A real one
  cannot. The action is now "Ask us to book a table", which routes to the
  existing message flow and is something the property can actually do.
- **The photographs are stock and say so.** While `demo` is true a line
  under the row reads "Photographs are stock, for layout only". It is
  removed with the prototype chip when `demo` goes false, by which point
  the pictures should be the property's own.

There is now a second page, `/eat/map/`, which is the same town map
full-screen with the four pins as links. The card on `/eat/` is one link
to it; inside the card the pins are drawn but not focusable, because a
pin the size of a pea with half of it cropped outside the card is not
something a guest can aim a remote at. `tools/map/inject.mjs` does that
rewrite — `pins: false` on a target.

## Real programme titles on Watch

`/watch/` names four Netflix originals. That is the only real programme
metadata anywhere in these pages, and it is the names only — set in our
own type, on our own colour. No key art, no stills, no Netflix wordmark,
and nothing shaped like Netflix's own interface: the artwork belongs to
the people who made the programmes, and imitating a provider's UI is what
§6.9 rules out for good reasons.

The hero on that page is an invented drama over a real Caithness
photograph, which is a pairing only an invented programme can honestly
carry.

## Phones and tablets

The television is the product, and the TV layout is built against
viewport *height* in a fixed, non-scrolling column — which is unusable on
anything else. Below 1100px the stylesheet switches to an ordinary
scrolling document: type in px, one or two columns, rows that swipe. No
television reports a viewport narrower than 1366px, so width alone
separates the two and the TV rules are untouched.

This is for the people who open these pages on a laptop in a review or on
a phone next to the installer. It is not a guest-facing mobile product.

## Two kinds of artwork, and which goes where

There is one rule and it is worth keeping: **a photograph where there is
a place, a drawn line where there is an action.**

Eat, Explore, Watch and the welcome screen are about places and things,
so they carry seed photography. The house guide and Your stay are about
what the building does and what the guest can ask for, and there is
nothing to photograph in "your bill" or "late checkout" that would not be
decoration. Those pages use line glyphs: one hand, `fill:none`, 1.4
stroke, the `.glyph` class, the same drawing on the nav icons.

Your stay used to be a third register, filled vector clip art, and it was
the weakest artwork in the prototype. It is now drawn like the house
guide: a clock, a person with a message, a receipt, a key, and a hero
that is the room in line elevation with one gorse mark for the lamp.

The room photograph was tried in the Your stay hero and taken out again.
The hero is a band about six times wider than it is tall, and the room
photographs are horizons: cropped to that shape they are a strip of sky
over a strip of sea with nothing in between. The same picture works on
the welcome screen because there it fills the height of the television.

*(The icon libraries a normal project would reach for are not an option
here. Nothing may make an external request at runtime, and there is
already an established hand across the nav and the house guide. A new
glyph matches that set rather than importing a second one.)*

## Detail pages fit on the screen

Every detail page now fits inside `.detail` at both 1920x1080 and
1366x768, with nothing auto-scrolled on arrival. Three things had to be
true at once for that, and all three had been quietly wrong:

- **No page prints its own title twice.** The stay and house detail pages
  each had the title in `.page-head` and again in a `.hero` panel
  underneath. The panel is gone. It cost 27vh and said nothing new.
- **Nothing scrolls before the guest moves.** Calling `focus()` on an
  element inside a scrolling box makes the browser scroll to it, so a
  page whose only button sat below the text opened with the first
  paragraph already sliced off under the title. The opening focus now
  passes `preventScroll`.
- **The practical facts are not held to a prose measure.** Three short
  labelled facts wrapped onto two lines inside `max-width:72ch` and
  pushed the button off the bottom, while the right half of the screen
  sat empty.

## A row of buttons is a row

`.btn-row` now carries `data-nav-row`. Without it those pages fell
through to the single-column navigation path, where left and right are
ignored outright: on the late checkout screen only the first of the three
times could be reached with a remote at all. Any new row of controls laid
out horizontally needs the same marker.

## The photograph and the description on a detail page

The eat and NC500 detail pages ran description, then facts, then button
straight down the left, with the photograph squeezed into a 20vh band
above them and the right half of the screen empty. On a 1366x768
television that band was 123px: about five centimetres of picture on a
32in screen, seen from a bed.

The facts and the action now share a line at the foot of the page, and
the height that freed up went to the picture:

| | photograph was | is now |
|---|---|---|
| 1920x1080 | 216px, 20% of the screen | 292px, 27% |
| 1366x768 | 123px, 16% | 177px, 23% |

Three other things came with it:

- **The facts read across, not down.** A stacked list in a sidebar was
  taller than the description beside it and pushed the button off the
  bottom. Three short facts on one line are easier to take in at three
  metres anyway, and the button sits at the end of them, where the eye
  already is, instead of last on the page.
- **The measure came down from 72ch to 62ch.** 72ch is a measure for a
  page held in the hand; across a room the eye loses the start of the
  next line well before that.
- **1366x768 is the tighter of the two targets, not the looser one.**
  The type sizes hit their px floors there, so everything except the
  picture is proportionally larger than it is at 1080. That is why the
  picture has its own height in the `max-width:1500px` block, and why
  that number is smaller rather than larger.

Every one of the nine pages fits its screen exactly at both sizes, with
no room spare. Anything added to one of them has to come out of the
photograph, so check the fit rather than assuming it.

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

**Live:** https://the-view.up.railway.app

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
