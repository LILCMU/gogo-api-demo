# Changelog

## 2.1.0

A UI pass and a new Reference page. Nothing in `src/gogo/` changed, so a project
that copied the device service is unaffected.

### Added

- **Reference pages** (`/reference/protocol`, `/reference/datalog`). The wire
  protocol and offline datalog format rendered in the app as byte maps, frame
  diagrams and callouts rather than prose. `docs/protocol.md` and
  `docs/offline-datalog.md` remain authoritative; `src/reference/*.js` is the
  same material shaped for the renderer.
- **Guide links** beside section headings on every tool page, deep-linking into
  the matching reference anchor so you can read the bytes without losing your
  place.
- **Wire views.** Control, Logo and Datalog now show the frames they actually
  put on the wire, built with the same `buildCommand` / `buildLogoWriteSequence`
  the send paths use. Logo's 60-byte NVS-commit rule is visible as a real
  trailing `01 03 00` frame; a datalog sync shows its stage-ending packets, whose
  payloads read as plain ASCII (`18\n1570\n`, `light,illuminance`).
- **A real Logo editor.** `vue-codemirror` with a Logo mode generated from the
  compiler's own reserved table — `;` comments, 26 structure keywords, and the
  board calls highlighted apart from user identifiers.
- **Onboarding replaces the empty state.** Disconnected pages now explain the
  Chrome requirement, the data cable and the Connect step instead of showing a
  dashed box.
- Accelerometer readings on Live, a sound reading on the Packets decode, and a
  scale bar on each sensor tile so `512` means something.
- Screenshots of all six pages in the README.

### Changed

- **The visual system now traces to GoGoCode's `_variables.scss`** rather than
  being invented here: blue header chrome, white ground, green glow shadows,
  30px uppercase pills, 12px cards, the green left stripe, and Source Sans 3.
  Two deliberate divergences, both contrast: GoGoCode puts white on green
  (1.7:1) and white on blue (2.6:1); this app uses ink on both.
- Navigation groups into three pairs — Live/Control, Datalog/Logo,
  Packets/Reference — and gains the Reference entry.
- Sensor and register values use tabular figures, so streaming numbers no longer
  make tiles jitter.
- The favicon is the board, replacing the Vue default.
- Error colour moved off `--gogo-pink` to `--danger` (`$brand-danger`), with
  `--danger-on-ink` for the dark panels.

### Fixed

- `body` kept its default 8px margin, leaving a white gutter around the header.
- The Packets byte dump forced the page to scroll sideways at 390px instead of
  scrolling inside its own container.
- `<html lang="">` was empty; added a description meta and a skip-to-content link.
- `.btn--danger:hover` set the background it already had.
- The Logo compile error said "see details below" while the detail block renders
  above it.

### Notes

Verified against a physical GoGo Board 7F on firmware 4.0.0: servo echo 90→120,
relay 40 reporting back `40` percent, two datalog syncs of 157 records over 29
frames, and a Logo compile-and-download round trip.

Adds `codemirror` and `vue-codemirror` — the same pair GoGoCode uses. The vendor
bundle grows from 544 KiB to 747 KiB.


## 2.0.0

First release tracking **GoGo Board 7.x**. 99 commits since 1.2.1; the app was
restructured rather than patched, so most of this is breaking.

### Breaking

- **Node 20 or newer** is required, developed and verified on Node 24 LTS. The
  toolchain moved from Vue CLI 4 / webpack 4 to **Vue CLI 5 / webpack 5**, so the
  `NODE_OPTIONS=--openssl-legacy-provider` workaround is gone. An `overrides` entry
  pins `babel-loader` past 8.2.2, whose md4 hashing OpenSSL 3 removed.
- **Targets GoGo Board 7.x.** Offline datalog records are the 10-byte 7.x format
  (4-byte second timestamp, 2-byte field, 4-byte float) and no longer carry a
  channel — channel exists only on the online path. A 6.x client reading a 7.x
  board desynchronises rather than losing a column.
- **Device code moved to `src/gogo/`** as a framework-free service. `protocol.js`
  holds the wire format and pure `build*`/`parse*` functions; `transport.js` holds
  the WebHID class. Neither imports Vue.
- **Store getter `boardStatus` renamed `isBoardReady`.**

### Added

- Five capability pages — Live, Control, Datalog, Logo, Packets — replacing the
  single combined view.
- 44 unit tests over `src/gogo/`, run by Node's built-in runner with no test
  dependency added (`npm test`).
- An eslint config and `npm run lint`.
- `docs/protocol.md` and `docs/offline-datalog.md`, read from 7.x firmware source
  and verified against hardware, replacing the old protocol spreadsheet. Both have
  published illustrated datasheets, linked from the README.
- A design-token system and a redesigned UI built on GoGoCode's palette.

### Fixed

- **Firmware major version is byte 19, not byte 20.** Byte 20 is the minor and
  reads `0` on many boards, so the old code reported firmware version 0 — and sent
  that to the Logo compiler.
- **`connect()` could make pairing impossible.** It guarded on `getDevices().length`,
  which returns every device the origin has been granted; one unrelated grant meant
  the picker never opened and the board could not be selected.
- **A Logo syntax error could wipe the board.** The compiler answers HTTP 200 for
  syntax errors, and the empty bytecode that came back was written as the
  zero-length chunk the firmware treats as a commit. The response's `result` field
  is now checked first, and bytecode is capped at 2048 bytes.
- **Motor and relay duty report on different scales.** Both commands take 0–100,
  but motor registers read back 0–255 PWM while relay registers read back percent.
- The datalog sync state machine no longer runs from a side-effecting computed
  property that committed a Vuex mutation during render.
- Accessibility: contrast failures, sub-36px hit targets, missing form labels,
  missing page titles and `h1`s.

### Security

- Cleared every advisory with a non-breaking fix: 29 → 17, both criticals and 5 of
  7 highs resolved. What remains has no upgrade path that does not break the build —
  the `vue@2.7.16` ReDoS is only "fixed" by Vue 3, and Vue 2 is EOL.

---

Releases before 2.0.0 are not documented here; see `git log`.
