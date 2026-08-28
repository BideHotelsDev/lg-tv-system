# The View — per-TV URLs

One URL per television, set once during installation as the browser home page
(or the boot target, if the installer menu allows one — dev-kit item 1).

Base URL: `https://guest-tv-production.up.railway.app`

| Room | Room name | Path |
|---|---|---|
| 1 | The Dunnet | `/?r=dyh28yp` |
| 2 | The Scrabster | `/?r=8gjzty7` |
| 3 | The Holborn | `/?r=c5f9a5z` |
| 4 | The Pentland | `/?r=hmws9kv` |
| 5 | The Stroma | `/?r=rbsg3ek` |
| 6 | The Castlehill | `/?r=zvfm59f` |
| 7 | The Brims | `/?r=r5btnxd` |
| 8 | The Sandside | `/?r=ttt8sp7` |
| 9 | The Ness | `/?r=nx2kts7` |

So room 4 is configured as:

```
https://guest-tv-production.up.railway.app/?r=hmws9kv
```

## Why codes and not room numbers

`?room=4` is guessable. The same identifier keys the guest's name and bill in
Phase 2 and can raise a charge in Phase 3, so a guest with a remote should not
be able to reach another room by typing a different digit.

## What this does and does not protect

It stops casual poking from the remote in the room. **It is not a secret.**
The code-to-room mapping ships in `/config/the-view.js`, which any browser on
the guest WiFi can fetch — a static site cannot resolve a room without shipping
the mapping.

The real fix arrives with Phase 2, when there is a server: the television sends
its code, the middleware resolves it, and the mapping never leaves the server.
Until then, treat the room identity as a convenience, not a credential, and
keep anything that costs money or reveals personal data behind confirmation on
the guest's own device (spec 6.7).

Codes avoid the characters 0, O, 1, l and I, because they are typed by hand
into an installer menu.
