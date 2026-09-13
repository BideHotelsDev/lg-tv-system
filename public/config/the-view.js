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

  /* Per-TV room identity.

     Each television's configured URL carries an opaque code rather than
     its room number: /?r=hmws9kv, not /?room=4.

     Room numbers are guessable, and the same identifier keys the guest's
     name and bill in Phase 2 and can raise a charge in Phase 3 — a guest
     with a remote should not be able to order breakfast to room 7 by
     typing a different digit.

     Treat this as obscurity, not authentication. It stops casual poking;
     it does not survive someone photographing the URL. Anything that
     costs money or reveals personal data must be confirmed on the guest's
     own device or verified server-side — see spec 6.7 and 7.1.

     Codes avoid 0/O/1/l/I, because they get read off a screen and typed
     into an installer menu by hand.

     `photo` is the backdrop on the welcome screen, from /assets/seed/.
     Every room here is named after somewhere you can see, or nearly see,
     from the building, so the seed photograph is that place rather than
     a picture of a bedroom. Stock photographs of somebody else's hotel
     room would say something untrue about this one; a photograph of the
     Pentland Firth in room 4 does not.

     When The View sends its own room photography, drop the files into
     /assets/seed/ and change the filenames here. Nothing else changes.
     A room with no photo, or a file that fails to load, simply gets the
     plain welcome screen. */
  rooms: {
    'dyh28yp': { number: '1', name: 'The Dunnet',     photo: 'dunnet-bay-wide.jpg' },
    '8gjzty7': { number: '2', name: 'The Scrabster',  photo: 'scrabster-harbour-wide.jpg' },
    'c5f9a5z': { number: '3', name: 'The Holborn',    photo: 'holborn-head-wide.jpg' },
    'hmws9kv': { number: '4', name: 'The Pentland',   photo: 'pentland-firth-wide.jpg' },
    'rbsg3ek': { number: '5', name: 'The Stroma',     photo: 'stroma-wide.jpg' },
    'zvfm59f': { number: '6', name: 'The Castlehill', photo: 'castlehill-wide.jpg' },
    'r5btnxd': { number: '7', name: 'The Brims',      photo: 'brims-wide.jpg' },
    'ttt8sp7': { number: '8', name: 'The Sandside',   photo: 'sandside-wide.jpg' },
    'nx2kts7': { number: '9', name: 'The Ness',       photo: 'thurso-ness-wide.jpg' }
  },

  /* Where the seed photographs live. Self-hosted, always: an external
     image host would be one more thing that has to be up for the welcome
     screen to look finished. */
  photos: {
    base: '/assets/seed/',
    /* A set with no room code still gets a welcome screen, and it may as
       well be the view the property is named for: the Pentland Firth at
       dawn. It is the room LINE that disappears when the room is unknown,
       not the picture — nothing here claims to know which room this is. */
    fallback: 'muckle-skerry-wide.jpg'
  },

  /* Phase 5 replication: recolour the horizon motif per property.
     Leave null to use the default fir/gorse palette. */
  palette: null
};
