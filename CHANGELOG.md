# Changelog

## 2.3.1

Two view-layer consistency fixes. Nothing in `src/gogo/` changed, so a project
that copied the device service is unaffected.

### Changed

- **The connect prompt shows on Live only.** `BoardOnboarding` repeated the same
  three-step instructions on Control and Datalog. Live is where a reader lands
  first, so the panel stays there; the other two pages already signal the
  disconnected state through their disabled controls and the `actionHint`
  tooltip.
- **One page width across all six pages.** `.page--wide` (1180px) and `.page`
  (1040px) put the pages on two different left edges — Datalog, Packets and
  Reference started 70px further left than Live, Control and Logo. `.page` is
  now 1180px everywhere and `.page--wide` is gone, which keeps the room
  Datalog's chart and Packets' byte dump need. Horizontal padding was never the
  difference; it was `var(--space-5)` on every page throughout.

## 2.3.0

The HID display commands, documented. `src/gogo/protocol.js` gains six `CMD`
entries and nothing else, so a project that copied the device service takes an
additive change or none at all.

### Added

- **Display commands in the protocol reference** (`/reference/protocol`,
  `docs/protocol.md`). `61` long text, `62` clear screen and `65`–`68`
  background colour, text colour, text position and text style — the wire
  contract for all seven, `60` included: the screen takeover with no command to
  hand the screen back, the 5 s on-device confirmation line and its eight hue
  names, replace-vs-append between `60` and `61`, the multi-packet separator
  rule, attribute lifetime, and how malformed parameters degrade.
- **`SHOW_LONG_TEXT`, `CLEAR_SCREEN`, `SET_BG_COLOR`, `SET_TEXT_COLOR`,
  `SET_TEXT_POSITION`, `SET_TEXT_STYLE`** in `CMD`, each carrying the note that
  it needs the test build.
- **Text coordinates are text-area-relative and unclamped.** `67 0 0` lands
  6 px in on each side, not against the bezel, and nothing bounds-checks after
  that — on a 160 × 128 panel, x above `153` or y above `121` puts the text off
  screen silently. `61`'s wrap column, 13 px / 24 px line advance and bottom
  stop are written out with it.
- **A migration table in the Logo reference** for what one program draws on
  released firmware versus the test build: `cls` filling the background you set
  instead of white, `textpos` measured from the text area, `show` trimming
  trailing whitespace before centring.
- **The unclaimed-display trap.** `bgcolor`, `textcolor`, `textpos`, `textstyle`
  and `cls` do not claim the display, so the main page repaints over them on its
  own schedule and re-rolls a random background. A `show` first makes them hold.

### Notes

Commands `61`, `62` and `65`–`68` are implemented on the firmware branch
`feature/expose-logovm-text-commands-hid`, built as `v4.0.0-hidtext`, and `60`'s
behaviour changed on the same branch. They are in **no released firmware**. The
docs mark them by branch and build rather than by version on purpose: a stock
board and the test build both report `4.0.0`, so the version register cannot
tell them apart.

Nothing here has been exercised from this app on a board. No view sends the new
commands — the Packets page builds them by hand.

## 2.2.0

The Logo language, documented. Nothing in `src/gogo/` changed, so a project that
copied the device service is unaffected.

### Added

- **Logo language reference** (`/reference/logo`, `docs/logo-language.md`). Every
  command GoGo Board 7 actually runs, with its call form, whether it is a
  statement or a reporter, and what it returns. `docs/logo-language.md` is
  authoritative; `src/reference/logo.js` is the same material shaped for the
  renderer, and a structural test keeps the two in step.
- **A signature key** beside the contents, since the notation (`n`, `s`, `n|s`,
  `[ ... ]`, `NAME`, `output1,`) appears on every table and nothing defined it.
- **Building a screen with assets**, its own section: the 20x8 character grid,
  the alignment values, a worked program, and the two things that bite. Asset
  ids are handed out by creation order and nothing tells you what they are.
- **Syntax at a glance** on the Logo page, plus deep links into the reference,
  and eight example programs in place of the previous two.
- **Run and Stop** beside Compile and download, sending cat 0 cmd 13. They act
  on whatever is already stored on the board.
- **String operator semantics.** `+` joins, `-` removes, and the left operand
  decides which. `"n = " + 5` gives `"n = 5.00"`; the ordering comparisons on
  strings compare length, not alphabet.
- **A firmware 4 section.** Commands that compile today and stop the board, kept
  visible rather than hidden, so the difference between "does not exist" and
  "not yet" is legible.

### Fixed

- **The editor advertised commands the board cannot run.** `logoMode.js`
  highlighted the compiler's whole reserved table. Around seventy of those words
  compile and then fail silently on firmware 3.2.6, in seven distinct ways: no
  handler at all, a case commented out, an empty stub, a handler that pushes a
  constant, one that pops its operands and discards them, a command addressing
  hardware this board does not carry, and port aliases that read past the end of
  the array. All are out of the editor and the reference, with the evidence in
  `.claude/knowledges/logo-language.md`.
- **Port addressing was invisible.** `output1,`, `aon?`, `apower` and `:param`
  rendered as anonymous variables, which is the syntax that carries the most
  meaning per character in this language.
- **Sensor ports are 1 to 4, not 1 to 8.** The board has four and nothing bounds
  checks, so `sensor5` and friends returned the joystick and servo registers as
  plausible readings.
- The example chip row overflowed below about 700px.
- Compile and download shared its green with Run; the download actions now take
  the blue.

### Notes

Nothing here has been exercised on a physical board. Firmware claims come from
reading `gogo-firmware` at `version-3.2.6`, `develop` and
`feature/broadcast-with-value`. The eight examples compile through the live
compiler endpoint.

The paired editor change for GoGoCode is in its MR !32.

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
