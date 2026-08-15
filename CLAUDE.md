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
device service (`src/gogo/`, no Vue, 35 unit tests) behind five capability pages.
`docs/protocol.md` and `docs/offline-datalog.md` replaced the old Google Sheet and are
verified against firmware source. The visual system uses GoGoCode's real palette.

**The open gate is hardware.** No view logic is covered by automated tests, and
nothing in the app has ever run against a physical board — populated states have only
been faked through the store. Pairing from a fresh browser profile, Logo
compile-and-download, packet send, datalog sync/delete, and the relay control are all
correct on paper only. Treat a board smoke test as the next real milestone, not an
optional check.

**Then the backlog.** `.claude/plans/demo-webapp-backlog.md` holds 47 items from three
pre-merge reviews (code, UX, docs), ordered by value. The highest-value ones:
converge the five views on one error-handling pattern, add an eslint config, and
extract the duplicated `actionHint` / disconnected guard.

**Read `.claude/knowledges/demo-webapp-architecture.md` before non-trivial work here.**
It carries the protocol facts that cost time to learn — the report-ID asymmetry, the
60-byte NVS-commit rule, board-clock datalog timestamps — and the mistakes worth not
repeating.

Docs and code here should stay **lean**: no explanatory comment padding, no restating
what the code says, no AI-generated filler. Terse and correct beats thorough and noisy.

## Commands

```bash
npm install        # Node 14 recommended (per README)
npm run serve      # dev server with hot reload
npm run build      # production build to dist/
npm test           # node --test over src/gogo/**/*.test.mjs
./deploy.sh        # builds, then FORCE-PUSHES dist/ to gh-pages of LILCMU/gogo-api-demo — a live deploy, not a local step
```

There is no linter configured (no eslint plugin in devDependencies). "Verify" here means `npm test`, plus `npm run serve` and a browser for anything view-facing — or at minimum a build, which does catch syntax and import errors.

On Node 17+ the webpack 4 toolchain fails with `ERR_OSSL_EVP_UNSUPPORTED`; prefix with `NODE_OPTIONS=--openssl-legacy-provider`.

WebHID requires Chromium (Chrome/Edge), a secure context, and a user gesture for `requestDevice()`. Nothing device-facing can be exercised without a physical GoGo Board.

## Architecture

Vue 2 SPA (Options API, Vue CLI 4, Vuex, vue-router) that talks to a GoGo Board over **WebHID** directly from the browser, split into a framework-free device service (`src/gogo/`) and five capability pages (`src/views/`).

**`src/gogo/` — the device service.** No Vue import, no dependency on this app's store or components; it is meant to be copied into another project wholesale.

- `protocol.js` — `FRAME_SIZE`, `LOGO_CHUNK_SIZE`, `PACKET_TYPE`, `CATEGORY`/`CMD`/`MEMORY_CMD`/`EVENT_CMD`, the `REG` device-register map, `DATALOG_STATUS`, and the pure functions: `buildCommand`, `parseReport`, `parseResponse`, `parseFileSizes`, `parseLookupTable`, `parseDatalogRecords`, `buildLogoWriteSequence`. Wire format is documented in `docs/protocol.md` (verified against 7.x firmware) — treat it as the source of truth.
- `transport.js` — `GogoTransport`, a WebHID class: `connect({ prompt })`, `disconnect()`, `send(payload)`, `connected` getter, and an `on`/`off` event bus emitting `connect`, `disconnect`, `report`, `error`. `connect` must select by device identity, never by `devices.length` — `getDevices()` returns every device the origin has been granted, so a length check treats any unrelated one as "already paired" and never opens the picker.
- `protocol.test.mjs`, `transport.test.mjs` — `node --test`, run via `npm test`. The transport tests fake `navigator.hid`, which is the only way to cover device code without a board.

**Shared UI — `src/components/` and `src/styles/tokens.css`.** `ByteDump` (labelled hexdump, `bytes` plus optional `highlights`, shared by Packets and Logo), `StatTile`, `DarkPanel`, `AppHeader`, `Chart`. Every colour traces to a token; the only literal hex outside `tokens.css` sits where CSS variables cannot resolve (Highcharts' JS config, a third-party prop) and names the token it mirrors. **Brand green `#a5d442` and orange `#f3a73c` may never carry white text** — roughly 1.7:1 and 2.0:1 — which is why tiles use a tint with a saturated stripe and ink values. `--gogo-pink` is fills and borders only; `--gogo-pink-text` is the body-text variant.

**Vuex adapter — `src/store/gogo.js`.** A thin layer over the device service: one `GogoTransport` instance, `bindTransport` wires its events to mutations (`SET_CONNECTED`, `SET_REPORT`, `SET_REPORT_RAW`, `SET_RESPONSE`, `SET_ERROR`, plus `CLEAR_RESPONSE`/`CLEAR_ERROR`), and the `send`/`connect`/`disconnect` actions call straight through to `transport`. Getters: `connected`, `boardStatus`, `report`, `reportRaw`, `lastResponse`, `error`. `boardStatus` (used throughout the views to disable controls) is `connected && !!report` — a report has to have arrived, not just a HID open. `reportRaw` keeps the unparsed frame so Packets can show what actually arrived on the wire.

Actions take `context` first and the payload second — `connect(context, { prompt })`. Writing `connect({ prompt })` silently destructures the context object and the argument never arrives, with a passing build and no warning. The startup call in `src/store/index.js` passes `{ prompt: false }` deliberately: `requestDevice()` throws outside a user gesture, so the picker opens from the header button instead.

- Outbound: `buildCommand(category, command, params)` returns the 63-byte frame with the report-ID byte already dropped (category at 0, command at 1); `transport.send` strips nothing — WebHID's `sendReport(0, payload)` supplies the report ID itself.
- Inbound: every `report` event is tried against `parseReport` (type-0 device register) first, then `parseResponse` (type-20 command response) — whichever matches commits.

**Pages — `src/views/`.** `Live.vue` (streaming sensor tiles), `Control.vue` (motors/servos/relays/beep), `Datalog.vue` (offline datalog sync + chart), `Logo.vue` (compile/download Logo programs and raw opcodes), `Packets.vue` (raw packet builder/sender). Routes are registered in `src/router/index.js`.

**Logo download flow** (`Logo.vue`): POST source to the cloud compiler (`compilerUrl` from `src/config.js`, `emulateJSON`) → set memory pointer (cat 1, cmd 1) → write each chunk from `buildLogoWriteSequence(bytecode)` (cat 1, cmd 3) awaited in sequence with a 10 ms `setTimeout` between packets → beep (cat 0, cmd 11). The page's two tabs are alternatives, not steps: "Raw opcodes" skips the compiler and feeds `downloadOpcodeToBoard` a JSON byte array directly.

`buildLogoWriteSequence` owns the chunking rule because it is protocol, not view logic. The firmware commits to NVS only on a chunk **shorter than 60 bytes**, so a program whose length is an exact multiple of 60 needs a trailing zero-length write or it silently fails to save with no error anywhere. Tested at lengths 0, 59, 60, 61 and 120.

The compile payload sends `board_version: report.board.hardwareId` — the RAW byte. `report.board.version` is the display string (`"7M"`) and sending it breaks compilation.

**Offline datalog** (`Datalog.vue` + `src/components/Chart.vue`): multi-packet sync driven by `packet.status` (file size → lookup table → records), unpacked via `parseFileSizes`/`parseLookupTable`/`parseDatalogRecords` from `src/gogo/protocol.js`. See `docs/offline-datalog.md` before touching the unpacking code.

Gotchas there:

- The sync state machine is driven by a `watch` on the `lastResponse` getter, gated by `startRetrivedOfflineDatalog`, which calls `unpackOfflineDatalogPackets`. It used to run from a computed property (`computePacket`) interpolated into the template as `{{ computePacket }}`, which committed a Vuex mutation during render — do not reintroduce a side-effecting computed here.
- The chart only renders once `datalogRecords` is non-empty (`v-else` on `<datalog-chart ref="datalogChart">`), so the chart is fed by a `$nextTick`-guarded ref mutation, `this.$refs.datalogChart.chartOptions.series = …`, not via props. Skipping the guard throws the first time records arrive on an empty page.
- `datalogRecords` holds the parsed series untouched; the date offset picker derives a shifted copy (`offsetSeries`) rather than mutating `field.data` in place, so picking a date twice does not compound the shift.

Records are on the 7.x 10-byte format, parsed via `DataView`. There is no channel concept offline — series are keyed by field.

## gh-pages coupling

History-mode router + `publicPath: '/gogo-api-demo/'` in production (`vue.config.js`) + the spa-github-pages redirect pair (`public/404.html` and the inline script in `public/index.html`) are one mechanism. Changing any one of the three breaks deep-link routing on GitHub Pages.

## Branching

git-flow is initialized: `feature/*` and `bugfix/*` off `develop`, `release/*`/`hotfix/*` off `master`.
