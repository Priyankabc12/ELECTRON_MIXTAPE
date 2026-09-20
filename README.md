# mixtape — desktop app

Your terminal player (afplay → vlc, `--intf rc`, `afinfo` for duration) wrapped
in an Electron app with the pixel/y2k UI from your reference images.

## Why Electron (not a plain website)

`vlc` and `afinfo` are OS binaries. A browser tab can't spawn them — only a
Node process can, via `child_process`. Electron gives you a real desktop
window (HTML/CSS/JS) with a Node backend attached, so your original
`spawn('vlc', ...)` logic runs untouched, just triggered by button
clicks/keystrokes instead of raw stdin bytes.

## Setup

1. Requires [VLC](https://www.videolan.org/vlc/) installed, same as before.
2. `npm install`
3. Drop your `.mp3` files into the `song/` folder (same relative path your
   original code used: `./song/<file>.mp3`).
4. `npm start`

## What changed vs. your original script, and why

- **`fucntio` typo / stray `function playSong(){}` stub** — removed. That
  line was a syntax error (`fucntio` isn't valid JS) so the original file
  couldn't have run as-is.
- **stdin byte matching (`data[0] === 0x6e`, etc.) → IPC events.** A GUI
  window doesn't get raw terminal bytes, so `n`/`b`/`p`/Enter/arrows are now
  normal `keydown` listeners in `renderer.js` that call `window.api.next()`,
  `.prev()`, `.togglePlay()`, `.playCursor()`, `.moveCursor()` — which call
  the exact same `spawn('vlc', ['--intf','rc', path])` / `stdin.write('pause\n')`
  logic your original handlers had, just as named functions in `main.js`.
- **`songMenu` is now read from the `song/` folder at startup** (`fs.readdirSync`)
  instead of the hardcoded 3-file array, so you don't have to edit code every
  time you add a song. Falls back to your original placeholder names if the
  folder's empty.
- **`getTotalDurationOfSong` now returns a Promise** instead of firing async
  and hoping the value lands before you use it — same `afinfo` call, just
  awaited properly so the duration shows correctly before the song starts.
- **Added a real Stop.** Your original only fully exited via `Ctrl+C`
  (`0x03`), which killed the whole terminal process — not appropriate for an
  app window. Stop now just kills the current `vlc` process and resets the
  UI, without closing the app.
- **`afinfo` is macOS-only.** If it's missing or errors (e.g. on
  Windows/Linux), duration just shows `0:00` instead of crashing the app.

## UI ↔ your code mapping

| UI action | Key | Calls |
|---|---|---|
| Move highlight | ↑ / ↓ | `moveCursor(±1)` — same as your arrow-key handler |
| Play highlighted | Enter | `playIndex(cursorIndex)` — same as your `0x0d` handler |
| Next track | `n` or NEXT button | `nextSong()` — same as your `0x6e` handler |
| Previous track | `b` or BACK button | `prevSong()` — same as your `0x62` handler |
| Play/Pause | `p` or PLAY button | `togglePlayPause()` — same as your `0x70` handler |
| Stop | `s` or STOP button | new — kills the player process cleanly |

Every keyboard shortcut also flashes its matching on-screen button (the
pixel-art pressed state from your third reference image), so keyboard and
mouse users get the same visual feedback.

## Profile page

The passport-styled page saves to `localStorage` in the browser (Name,
listener-since date, home base, top genre, favorite artist, a signature
field, and an optional photo) — no backend needed, persists between app
launches.

## File structure

```
mixtape-app/
├── package.json
├── main.js         # Electron main process — your vlc/afplay logic lives here
├── preload.js      # exposes safe IPC calls to the UI
├── index.html       # player view + profile view
├── style.css        # pixel/y2k styling
├── renderer.js       # UI logic, keyboard shortcuts, button emphasis
└── song/             # put your .mp3 files here
```
