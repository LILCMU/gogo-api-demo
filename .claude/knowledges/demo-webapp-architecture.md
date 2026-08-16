# Demo webapp architecture

How this repo is built and why. Promoted from the redesign spec and plan once that
work merged; those working documents are gone and this is the durable record.

## What this repo is for

An internal reference webapp for GoGo Board ↔ browser communication, and the
playground where transport and protocol work is proven before it ships in the
GoGoCode webapp. The WebHID plugin was built here first and then ported.

It has two audiences at once. Children use Live, Control and Datalog. Developers use
Logo and Packets — and read the source, because the repo exists so other teams can
copy from it. That second audience is why the code bar is higher than a demo would
normally justify: its markup and patterns become the standard for whatever is built
from it.

## Structure

`src/gogo/` is framework-free and contains no Vue import of any kind. That is
enforced by a grep in every verification pass, not by convention.

| File | Responsibility |
|---|---|
| `src/gogo/protocol.js` | Constants and pure byte functions. Zero imports. |
| `src/gogo/transport.js` | WebHID lifecycle only. Emits raw byte arrays, interprets nothing. Imports only `FRAME_SIZE`. |
| `src/store/gogo.js` | The single thin file that knows both the service and Vuex. |
| `src/views/` | Five pages, one protocol capability each. |
| `src/components/` | `ByteDump`, `StatTile`, `DarkPanel`, `AppHeader`, `Chart`. |
| `src/styles/tokens.css` | Design tokens. |

Routes: `/live`, `/control`, `/datalog` (child-facing), `/logo`, `/packets`
(developer). `/` redirects to `/live`. The rule that produced this split is **one page
= one capability = one readable file** — a developer opens the page whose name matches
what they want and finds it there.

`protocol.js` exports, beyond the constants: `buildCommand`, `parseReport`,
`parseResponse`, `parseFileSizes`, `parseLookupTable`, `parseDatalogRecords`,
`buildLogoWriteSequence`.

## Protocol facts that cost time to learn

Full wire reference is `docs/protocol.md`, verified against 7.x firmware source. These
are the ones that bite.

**The report-ID asymmetry.** Outbound frames carry a report ID at index 0, supplied by
WebHID's `sendReport(0, payload)` — `buildCommand` emits the 63 bytes that follow and
never includes it. Inbound frames have no report-ID byte at all; `event.data` byte 0 is
the packet type. This is the single most confusing thing about the protocol and the one
place a wrong assumption silently shifts every offset by one.

**Firmware version lives at byte 19, not 20.** Bytes 19/20/21 are major/minor/patch on
GoGo 6 and 7. This repo shipped for years reading byte 20 and advertising the minor
version to the cloud compiler.

**The compiler wants the raw hardware byte.** `board_version` in the compile payload
must be `report.board.hardwareId` (the raw byte, e.g. `0x7C`), never
`report.board.version` (the display string `"7M"`). `parseReport` deliberately exposes
both for this reason.

**Type-20 response layout is command-dependent.** There is no shared status byte. The
datalog commands put status at `[3]` and payload from `[4]`; GoGo ID puts a MAC at
`[3..8]` with no status. `parseResponse` therefore also returns `raw` so a caller can
parse a layout it does not otherwise support. Check `command` before trusting `status`.

**Logo memory writes commit only on a short chunk.** The firmware writes to NVS when it
receives a chunk shorter than 60 bytes, so a program whose length is an exact multiple
of 60 needs a trailing zero-length write or it silently fails to save, with no error
anywhere. `buildLogoWriteSequence` owns this rule and is tested at lengths 0, 59, 60, 61
and 120 — producing `[0]`, `[59]`, `[60,0]`, `[60,1]`, `[60,60,0]`.

**Offline datalog records are 10 bytes on 7.x and carry no channel.** `uint32` seconds,
`uint16` field index into the lookup table, `float32` value, little-endian. Channel
exists only on the online MQTT path. The 6.x record was 16 bytes with a channel.

**Datalog timestamps are board-clock, not wall-clock.** They come from
`gogoTime.getUnixTime()`, real only after an RTC or NTP sync; an unsynced board logs
from a 1970 epoch. This is what the Datalog page's date offset picker exists to
correct — it is a display correction, not a data fix.

**The type-0 stream stops while each datalog stage streams**, not one cycle. The
firmware raises the suppression flag around every stage's send loop, so reports are
gone for effectively the whole transfer. A client treating it as a heartbeat
concludes the board died mid-sync.

**There is no LED on GoGo 7.** Command 10 is dispatched but its firmware handler body is
commented out, and no NeoPixel command exists in the host-facing protocol. Command 201
is the same shape. These are more dangerous than the unhandled commands, because
checking the firmware shows a `case` and implies they work.

**`connect()` must guard on device identity, not array length.**
`navigator.hid.getDevices()` returns every device the origin has been granted, so
`!devices.length` treats any unrelated granted device as "already paired", never opens
the picker, and leaves the user unable to connect. Guard on
`!devices.some(isGogoDevice)`.

## Design

Direction A2, using GoGoCode's real palette from its `_variables.scss` — green
`#a5d442` (primary), orange `#f3a73c`, blue `#02a8f4`, pink `#db3f8d`, ink `#01354c`,
plus tints and `--gogo-pink-text` for body copy.

**Brand green and orange may never carry white text** — they measure about 1.7:1 and
2.0:1 against a 4.5:1 minimum. That constraint is why tiles use a tint background with a
saturated left stripe and ink values rather than a saturated fill. `--gogo-pink` at
3.87:1 is likewise fills-and-borders only; `--gogo-pink-text` (`#c73980`) is the text
variant.

Every colour traces to a token. The only literal hex outside `tokens.css` is in
positions where CSS variables cannot resolve — Highcharts' JS config and a third-party
`bar-color` prop — and each carries a comment naming the token it mirrors.

## Working in this repo

`npm test` runs Node's built-in test runner over `src/gogo/**/*.test.mjs`. No test
dependency was added: Node detects ES module syntax in `.js` sources, so `.mjs` tests
import them directly. Only `src/gogo/` is covered — **no view logic is under automated
test**, and the WebHID paths have never run against physical hardware.

Node 17+ needs `NODE_OPTIONS=--openssl-legacy-provider` for `npm run build` and
`npm run serve`; the toolchain is Vue CLI 4 with webpack 4.

Do not add `"type": "module"` to `package.json` to silence the test runner's warning —
it would switch `vue.config.js` and `babel.config.js` to ESM and break the build.

To exercise populated UI without a board, commit fake state through the store in the
browser console: `SET_CONNECTED`, `SET_REPORT`, `SET_REPORT_RAW`, `SET_RESPONSE`. This
is the only way to reach the connected views in this environment.

**gh-pages coupling:** history-mode router, `publicPath: '/gogo-api-demo/'` in
production, and the spa-github-pages redirect pair in `public/404.html` and
`public/index.html` are one mechanism. Changing any one breaks deep links.

## Mistakes worth not repeating

**A capability can vanish between tasks.** Splitting the old grab-bag page moved each
feature to a new home, but the Connect button was assigned to nobody and simply
disappeared — leaving an app that could not pair a board at all. Every implementer
missed it because their browsers already held the WebHID grant. Only a whole-branch
review caught it. When decomposing a page, enumerate what leaves it, not just what
each new page receives.

**Fixing one bug can introduce its neighbour.** The `connect()` length-guard defect was
created by an earlier fix that replaced the device-selection fallback and left the
guard above it untouched.

**Vue 2's array-index reactivity caveat does not apply to `v-model`.** `v-model` bound
to a member expression compiles to `$set(arr, i, value)`, which is reactive. The caveat
is about imperative `this.arr[i] = x`. Verify against the installed
`vue-template-compiler` before "fixing" this.

**A Vuex action receives `context` first, payload second.** Writing
`connect({ prompt })` instead of `connect(context, { prompt })` silently destructures
the context object, and the argument never arrives — with a passing build and no
warning.

**Tests that use a zero-valued constant prove nothing.** Asserting `payload[0] === 0`
where the category under test is `CATEGORY.CONTROL` (value 0) passes identically
against an implementation that never writes the byte. Use a nonzero value.
