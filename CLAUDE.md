# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Internal demo/reference webapp for GoGo Board ↔ webapp communication. Not a product — it is the **playground where transport and protocol work is prototyped before it ships in the GoGoCode webapp**. `src/gogo/` is written framework-free so it can be copied there directly. New device-facing features should follow the same route.

Sibling repos to consult (local, not vendored here):

| Path | What it is |
|---|---|
| `~/Developer/gogo-code` | GoGoCode webapp — where proven features graduate to. |
| `~/Developer/gogo-logo-compiler` | Python Logo compiler behind the Logo download flow's compiler URL. |
| `~/Developer/gogoboard-7.x/gogo-firmware` | GoGo Board 7.x firmware — **authoritative** for packet layout, category/command IDs, and the type-0 register map (`include/gogo-firmware.h`, `processCMD()` in `src/gogo-firmware.cpp`). |

## Where this is heading

The goal is that another team can open the page matching what they want, read one
file, and copy it. Everything below serves that.

**Shipped.** The app tracks GoGo Board **7.x** and is split into a framework-free
device service (`src/gogo/`, no Vue, 44 unit tests) behind six pages.
`docs/protocol.md` and `docs/offline-datalog.md` replaced the old Google Sheet and are
verified against firmware source. The visual system uses GoGoCode's real palette.

**Hardware: mostly verified.** A smoke test against a physical **GoGo Board 7F,
firmware 4.0.0** confirmed the read and write paths end to end:

- `parseReport` decodes a real frame — board type 6 → "GoGo Board 7", hardware ID
  `0x75` → `7F`, firmware bytes 19–21 → `4.0.0`, sensors big-endian, accelerometer
  ≈1 g at rest. The byte-19 firmware fix is proven on hardware: byte 20 reads `0` on
  this board, so the old code sent `firmware_version: 0` to the compiler.
- Beep, a hand-built packet from the Packets page, and a Logo compile-and-download all
  succeed. A syntax error correctly shows the compiler's message and sends nothing.
- **Closed loop confirmed**: setting servo 1 to 120° came back in the board's own
  report as `angles [90,90,90,90] → [120,90,90,90]`.

- The datalog three-stage sync is verified on real records: a board logging via
  `offlinerecord` produced `lookupTableSize 18` / `recordsSize 1570`, which the parser
  resolved into 157 records across two fields — 157 × 10 bytes exactly, confirming the
  10-byte layout. Timestamps arrived one second apart, matching the firmware's
  per-field rate limit. Those timestamps read as ~351 **seconds**, not a 2026 date,
  because that board's clock was never synced — the documented reason the date-offset
  picker exists, now seen in real data.

- Relay and motors are verified by report echo: relay 1 at 60 came back as
  `relays.power [60,0,0,0]` with `status 0 → 1`; motor on/off and direction both
  round-tripped; motor power tracked the duty scale below.
- **Motor and relay duty use different scales**, found only by driving them. Both
  commands take 0–100, but motor bytes 25–28 report **0–255 PWM** (40 reads back as
  102) while relay bytes 29–32 report **percent** (40 reads back as 40). Documented in
  `docs/protocol.md`. Treating the motor register as a percentage shows "102%".

- The 2.1 UI pass was re-verified end to end on the same board: servo echo 90→120,
  relay 40 reporting back `40` percent, two datalog syncs (`lookupTableSize 18` /
  `recordsSize 1570` → 157 records over 29 frames), and a Logo compile-and-download
  round trip whose write frame read `01 03 10` plus exactly 16 bytecode bytes.

Still unverified on hardware: the datalog **delete** path (deliberately not run — the
test board holds records that must be kept), and *downloading* a program whose length
is an exact multiple of 60. The frames for that case are constructed correctly — the
Logo page renders the trailing `01 03 00` commit frame at length 60 — but no such
program has been written to a board.

No view logic is covered by automated tests; `npm test` covers `src/gogo/` plus structural tests under `src/reference/`.

**The backlog is worked through.** `.claude/plans/demo-webapp-backlog.md` records the
findings of three pre-merge reviews (code, UX, docs); they were cleared in batches —
one error-handling pattern across the views, an eslint config, the extracted
`actionHint` / disconnected guard. Keep it as the record of what was found and why,
not as a to-do list.

**Read `.claude/knowledges/demo-webapp-architecture.md` before non-trivial work here.**
It carries the protocol facts that cost time to learn — the report-ID asymmetry, the
60-byte NVS-commit rule, board-clock datalog timestamps — and the mistakes worth not
repeating.

Docs and code here should stay **lean**: no explanatory comment padding, no restating
what the code says, no AI-generated filler. Terse and correct beats thorough and noisy.

## Commands

```bash
npm install        # Node 20+; developed on Node 24 LTS
npm run serve      # dev server with hot reload
npm run build      # production build to dist/
npm test           # node --test over src/**/*.test.mjs
npm run lint       # eslint over src/, .js/.mjs/.vue
```

**Deploys are CI-only.** `.github/workflows/deploy.yml` runs on every push to `master`: lint, test, build, then publish `dist/` to GitHub Pages via `actions/deploy-pages`. Pushing to `master` is therefore a live deploy. There is no local deploy script — the old `deploy.sh` was deleted, and nothing writes to the `gh-pages` branch any more (Pages `build_type` is `workflow`, not `legacy`).

"Verify" here means `npm test` and `npm run lint`, plus `npm run serve` and a browser for anything view-facing — or at minimum a build, which does catch syntax and import errors.

No `NODE_OPTIONS` workaround is needed on modern Node. The `overrides` entry pinning `babel-loader` to `^8.4.1` is load-bearing: Vue CLI 5.0.9 pins `babel-loader@8.2.2`, whose `lib/cache.js` hashes with md4, which OpenSSL 3 removed — dropping the override reinstates `ERR_OSSL_EVP_UNSUPPORTED` at build time.

WebHID requires Chromium (Chrome/Edge), a secure context, and a user gesture for `requestDevice()`. Nothing device-facing can be exercised without a physical GoGo Board.

`vue-codemirror@4` / `codemirror@5` back the Logo editor — the same pair GoGoCode uses. The Logo mode is ours (`src/components/logoMode.js`); GoGoCode's `mode: 'text/python'` is not a registered MIME and silently highlights nothing.

**Do not regenerate `logoMode.js`'s word sets from the compiler's `reserved` table.** They are that table minus roughly seventy words the board does not actually run — commands that halt the VM with no error, stubs that do nothing, and port aliases that read the wrong registers. Regenerating would silently put every one of them back. The exclusions and the evidence for each are in `.claude/knowledges/logo-language.md`; `src/reference/logo.test.mjs` is the regression guard. A near-identical copy of this file lives in GoGoCode (`src/services/logoMode.js`) and the two drift.

## Architecture

Vue 2 SPA (Options API, Vue CLI 5, Vuex, vue-router) that talks to a GoGo Board over **WebHID** directly from the browser, split into a framework-free device service (`src/gogo/`) and six pages (`src/views/`).

**`src/gogo/` — the device service.** No Vue import, no dependency on this app's store or components; it is meant to be copied into another project wholesale.

- `protocol.js` — `FRAME_SIZE`, `LOGO_CHUNK_SIZE`, `PACKET_TYPE`, `CATEGORY`/`CMD`/`MEMORY_CMD`/`EVENT_CMD`, the `REG` device-register map, `DATALOG_STATUS`, and the pure functions: `buildCommand`, `parseReport`, `parseResponse`, `parseFileSizes`, `parseLookupTable`, `parseDatalogRecords`, `buildLogoWriteSequence`. Wire format is documented in `docs/protocol.md` (verified against 7.x firmware) — treat it as the source of truth.
- `transport.js` — `GogoTransport`, a WebHID class: `connect({ prompt })`, `disconnect()`, `send(payload)`, `connected` getter, and an `on`/`off` event bus emitting `connect`, `disconnect`, `report`, `error`. `connect` must select by device identity, never by `devices.length` — `getDevices()` returns every device the origin has been granted, so a length check treats any unrelated one as "already paired" and never opens the picker.
- `protocol.test.mjs`, `transport.test.mjs` — `node --test`, run via `npm test`. The transport tests fake `navigator.hid`, which is the only way to cover device code without a board.

**Shared UI — `src/components/` and `src/styles/tokens.css`.** `ByteDump` (labelled hexdump, `bytes` plus optional `highlights`), `ByteMap` (a frame drawn as a coloured byte strip), `StatTile`, `DarkPanel`, `AppHeader`, `Chart`, `BoardOnboarding` (the instructive disconnected state), `GuideLink` (deep-links a section to the reference), `CodeEditor` (+ `logoMode.js`). Every colour traces to a token; the only literal hex outside `tokens.css` sits where CSS variables cannot resolve (Highcharts' JS config, a third-party prop) and names the token it mirrors.

Tokens mirror GoGoCode's `_variables.scss` — blue chrome (`$top-nav-bg`), white ground, green glow shadows (`$greeny-box-shadow`), 30px pills, 12px cards (`$cc-radius`), Source Sans 3. **Brand green `#a5d442` and orange `#f3a73c` may never carry white text** — roughly 1.7:1 and 2.0:1 — which is why tiles use a tint with a saturated stripe and ink values. This app deliberately diverges from GoGoCode on two contrast failures: ink on green, and ink on blue in the header. Errors use `--danger`, or `--danger-on-ink` on the dark panels. See `.claude/knowledges/demo-webapp-architecture.md`.

**Vuex adapter — `src/store/gogo.js`.** A thin layer over the device service: one `GogoTransport` instance, `bindTransport` wires its events to mutations (`SET_CONNECTED`, `SET_REPORT`, `SET_REPORT_RAW`, `SET_RESPONSE`, `SET_ERROR`, plus `CLEAR_RESPONSE`/`CLEAR_ERROR`), and the `send`/`connect`/`disconnect` actions call straight through to `transport`. Getters: `connected`, `isBoardReady`, `report`, `reportRaw`, `lastResponse`, `error`. `isBoardReady` (used throughout the views to disable controls) is `connected && !!report` — a report has to have arrived, not just a HID open. `reportRaw` keeps the unparsed frame so Packets can show what actually arrived on the wire.

Actions take `context` first and the payload second — `connect(context, { prompt })`. Writing `connect({ prompt })` silently destructures the context object and the argument never arrives, with a passing build and no warning. The startup call in `src/store/index.js` passes `{ prompt: false }` deliberately: `requestDevice()` throws outside a user gesture, so the picker opens from the header button instead.

- Outbound: `buildCommand(category, command, params)` returns the 63-byte frame with the report-ID byte already dropped (category at 0, command at 1); `transport.send` strips nothing — WebHID's `sendReport(0, payload)` supplies the report ID itself.
- Inbound: every `report` event is tried against `parseReport` (type-0 device register) first, then `parseResponse` (type-20 command response) — whichever matches commits.

**Pages — `src/views/`.** `Live.vue` (streaming sensor tiles), `Control.vue` (motors/servos/relays/beep), `Datalog.vue` (offline datalog sync + chart), `Logo.vue` (compile/download Logo programs and raw opcodes), `Packets.vue` (raw packet builder/sender), `Reference.vue` (the wire protocol, datalog format and Logo language, rendered from `src/reference/*.js`). Routes are in `src/router/index.js`, which needs its `scrollBehavior` to honour `to.hash` or the guide links navigate without scrolling.

**Control, Logo and Datalog show the frames they put on the wire**, built with the same `buildCommand`/`buildLogoWriteSequence` the send paths use so the view cannot drift from what is sent. `src/utils/wireFrame.js` holds `trimFrame` and the shared legend labels.

**`src/reference/` is not authoritative** — `docs/protocol.md`, `docs/offline-datalog.md` and `docs/logo-language.md` are. The Logo reference documents only what firmware 3.2.6 runs; commands needing firmware 4 live in its own closing section, and `logo.test.mjs` asserts they appear nowhere else. The modules (`protocol.js`, `datalog.js`, `logo.js`) are the same facts shaped for the block renderer, and the two can drift. Section ids are a contract: `GuideLink` deep-links into them, so `grep 'to="/reference'` after renaming one.

**Logo download flow** (`Logo.vue`): POST source to the cloud compiler (`compilerUrl` from `src/config.js`, `emulateJSON`) → set memory pointer (cat 1, cmd 1) → write each chunk from `buildLogoWriteSequence(bytecode)` (cat 1, cmd 3) awaited in sequence with a 10 ms `setTimeout` between packets → beep (cat 0, cmd 11). The page's two tabs are alternatives, not steps: "Raw opcodes" skips the compiler and feeds `downloadOpcodeToBoard` a JSON byte array directly. Run and Stop sit beside the download button and send cat 0, cmd 13 with 1 or 0; they act on whatever is already stored on the board, independent of the editor.

`buildLogoWriteSequence` owns the chunking rule because it is protocol, not view logic. The firmware commits to NVS only on a chunk **shorter than 60 bytes**, so a program whose length is an exact multiple of 60 needs a trailing zero-length write or it silently fails to save with no error anywhere. Tested at lengths 0, 59, 60, 61 and 120.

The compile payload sends `board_version: report.board.hardwareId` — the RAW byte. `report.board.version` is the display string (`"7M"`) and sending it breaks compilation.

**Offline datalog** (`Datalog.vue` + `src/components/Chart.vue`): multi-packet sync driven by `packet.status` (file size → lookup table → records), unpacked via `parseFileSizes`/`parseLookupTable`/`parseDatalogRecords` from `src/gogo/protocol.js`. See `docs/offline-datalog.md` before touching the unpacking code.

Gotchas there:

- The sync state machine is driven by a `watch` on the `lastResponse` getter, gated by `syncInProgress`, which calls `unpackOfflineDatalogPackets`. It used to run from a computed property (`computePacket`) interpolated into the template as `{{ computePacket }}`, which committed a Vuex mutation during render — do not reintroduce a side-effecting computed here.
- The chart only renders once `datalogRecords` is non-empty (`v-else` on `<datalog-chart ref="datalogChart">`), so the chart is fed by a `$nextTick`-guarded ref mutation, `this.$refs.datalogChart.chartOptions.series = …`, not via props. Skipping the guard throws the first time records arrive on an empty page.
- `datalogRecords` holds the parsed series untouched; the date offset picker derives a shifted copy (`offsetSeries`) rather than mutating `field.data` in place, so picking a date twice does not compound the shift.

Records are on the 7.x 10-byte format, parsed via `DataView`. There is no channel concept offline — series are keyed by field.

## gh-pages coupling

History-mode router + `publicPath: '/gogo-api-demo/'` in production (`vue.config.js`) + the spa-github-pages redirect pair (`public/404.html` and the inline script in `public/index.html`) are one mechanism. Changing any one of the three breaks deep-link routing on GitHub Pages.

## Branching

git-flow is initialized: `feature/*` and `bugfix/*` off `develop`, `release/*`/`hotfix/*` off `master`.
