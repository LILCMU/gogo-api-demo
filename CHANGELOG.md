# Changelog

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
