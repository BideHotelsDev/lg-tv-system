/* ============================================================
   bide guest TV — property configuration: The View, Thurso
   One file per property. Everything that varies between properties
   but is not page content lives here.

   Loaded as a plain script, not fetched as JSON: no promises to
   reject, no CORS, no async on a 2020 browser engine. It is simply
   present before anything reads it.
   ============================================================ */

window.BIDE = {

  /* Prototype mode. While true the flow simulates responses so it can
     be walked end to end, and a small "Prototype" chip sits in the
     corner. Set to false before any of this faces a real guest. */
  demo: true,

  property: {
    name: 'The View',
    location: 'Thurso',
    label: 'The View · Thurso'
  },

  wifi: {
    network: 'bide-guest',
    password: 'pentland'
  },

  /* Guest-specific checkout dates arrive with MEWS in Phase 2.
     Until then the welcome screen shows the property default. */
  checkout: {
    time: '11am'
  },

  /* Per-TV room identity, resolved from ?room= on the configured
     home page URL. Confirm the full nine with David before install. */
  rooms: {
    '1': 'The Dunnet',
    '2': 'The Scrabster',
    '3': 'The Holborn',
    '4': 'The Pentland',
    '5': 'The Stroma',
    '6': 'The Castlehill',
    '7': 'The Brims',
    '8': 'The Sandside',
    '9': 'The Ness'
  },

  /* Phase 5 replication: recolour the horizon motif per property.
     Leave null to use the default fir/gorse palette. */
  palette: null
};
