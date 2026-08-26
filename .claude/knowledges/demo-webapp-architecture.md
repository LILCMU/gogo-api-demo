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

The visual system traces to GoGoCode's own `src/sass/_variables.scss`, not to
choices invented here. Reading the sass is the way to settle any question about
it:

| Token | GoGoCode source |
|---|---|
| Blue header chrome `#02a8f4` | `$top-nav-bg` / `$sidebar-bg` |
| White page ground | `$body-bg` |
| Slate body text `#34495e` | `$body-color` |
| Green glow shadows | `$greeny-box-shadow`, blue and pink variants |
| 30px uppercase tracked pills | `$btn-border-radius` plus the `.btn` rule |
| 12px card radius | `$cc-radius` |
| Green left stripe, 8px | `$info-widget-border` |
| Danger red `#e34a4a` | `$brand-danger` — pink is a data colour here, not an error one |
| Source Sans 3 | `$font-family-sans-serif` |

**Two deliberate divergences, both contrast.** GoGoCode's `.btn-primary` is
white on green (1.7:1) and its nav is white on blue (2.6:1). Both fail AA. This
app uses ink on green (8.4:1) and ink on blue (4.8:1) instead. Do not "fix"
these back to match GoGoCode.

**Brand green and orange may never carry white text** — about 1.7:1 and 2.0:1
against a 4.5:1 minimum. That is why tiles use a tint background with a
saturated left stripe and ink values rather than a saturated fill.

Every colour traces to a token. The only literal hex outside `tokens.css` sits
where CSS variables cannot resolve — Highcharts' JS config and a third-party
`bar-color` prop — and each names the token it mirrors. `--danger-on-ink` is
the lightened red for error text on the ink panels, where `--danger` is only
3.1:1.

Four colour roles are reused across frame kinds in byte dumps (`--category`,
`--command`, `--sensors`/`--payload`/`--status`, `--board`/`--length`). A type-0
report has no command byte and a write frame has no sensors, so no single dump
shows two meanings on one hue — but every dump carries its own legend saying
which meaning applies there.

## The Logo editor

The editor is `vue-codemirror@4` / CodeMirror 5, configured as GoGoCode
configures its own (`base16-dark`, line numbers, active line, close brackets),
so what is prototyped here matches what a learner sees there.

**GoGoCode's editor highlights nothing, and it is a one-character bug.** It
passes `mode: 'text/python'`, which is not a registered CodeMirror MIME — only
`text/x-python` is — so CodeMirror silently falls back to the null mode. Verify
with `cm.getMode().name`, which returns `'null'`, not `'python'`. The failure is
silent, which is why it survived.

**Python is the wrong language for Logo regardless.** Logo comments start with
`;` and Python's with `#`, so every Logo comment renders as code and every `#`
renders as a comment. `src/components/logoMode.js` is a real Logo mode instead,
generated from the compiler's own `reserved` table in
`gogo-logo-compiler/tinkerlogo.py` and mirroring its lexer: `;.*` comments,
`".*?"` strings, `\d+\.\d+` floats, `[a-zA-Z_][a-zA-Z_0-9]*` identifiers. Its
257 reserved words split into 26 structure words returning `keyword` and the
rest — the board calls — returning `builtin`. Regenerate from that table if the
language gains words. `base16-dark` has no `cm-builtin` rule, so the app
supplies one.

## Showing what goes on the wire

Control, Logo and Datalog each render the real frames they put on the wire,
built with the same `buildCommand` / `buildLogoWriteSequence` the send paths
use — so the display cannot drift from what is sent. `src/utils/wireFrame.js`
holds `trimFrame` (cut to the last meaningful 16-byte row) and the shared
`LEGEND_LABELS`.

This is what makes the invisible rules visible: Logo's 60-byte NVS-commit rule
shows as an actual trailing `01 03 00` frame, and a datalog sync's stage-ending
frames read as plain ASCII once highlighted (`14 08 02 04` then `18\n1570\n`).

Control renders its frame **inline under the control that sent it**, with only
a thin pinned status line. An earlier version put the whole panel at the page
bottom, where anyone clicking a motor at the top never saw it; a full pinned
panel fixed visibility but cost 27% of a phone viewport. Note that
`position: sticky; bottom: 0` cannot work on a last child — there is no scroll
room below it.

## The in-app reference

`src/reference/protocol.js` and `datalog.js` hold the reference content as
structured data, rendered by `src/views/Reference.vue` through purpose-built
block types — byte maps, frame diagrams, callouts, tables, steps. It is not a
markdown renderer.

`docs/protocol.md` and `docs/offline-datalog.md` stay **authoritative**; the
modules are the same facts shaped for the renderer, and the two can drift.
Section ids are a contract — `GuideLink` deep-links into them from the tool
pages, so renaming one silently breaks a link. `grep 'to="/reference'` to check.
vue-router needs an explicit `scrollBehavior` honouring `to.hash`, or the guide
links navigate without scrolling.

## Working in this repo

`npm test` runs Node's built-in test runner over `src/gogo/**/*.test.mjs`. No test
dependency was added: Node detects ES module syntax in `.js` sources, so `.mjs` tests
import them directly. Only `src/gogo/` is covered — **no view logic is under automated
test**. The WebHID paths are verified by hand against a physical 7F on firmware 4.0.0,
not by any automated test — see the hardware section in CLAUDE.md for what was covered.

The toolchain is Vue CLI 5 with webpack 5, and needs no `NODE_OPTIONS` workaround.
The `overrides` entry pinning `babel-loader` to `^8.4.1` is what makes that true:
CLI 5.0.9 pins `babel-loader@8.2.2`, which hashes with md4 in `lib/cache.js`. webpack 5
fixed its own md4 use, so the OpenSSL 3 failure survives the CLI upgrade and reappears
from inside a thread-loader worker — a stack trace that names webpack, not babel-loader.

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

**Two layout bugs that only a browser found.** `body` kept its default 8px
margin, which left a white gutter around the blue header — invisible while the
header was white on a grey page. And `.split__main` on Packets floored at the
byte dump's min-content width, so the page scrolled sideways at 390px instead
of the dump scrolling inside itself; `min-width: 0` is what lets a flex item
shrink past its content.

Neither was visible in the source, in lint, or in the build. Drive the built
app at a narrow viewport before believing a layout is done.

**The Logo language itself is documented separately.** See `.claude/knowledges/logo-language.md`
for what GoGo Board 7 actually runs, the seven ways a command can compile and then do nothing,
and the four places in the firmware repo you have to look before concluding one is unimplemented.
