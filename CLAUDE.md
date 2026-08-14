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

## Current focus

Current hardware is **GoGo Board 7.x**; this demo tracks it — offline datalog and the device-register reads (including firmware version) are both on the 7.x format. Remaining protocol drift against the old 6.x spreadsheet is documented in `docs/protocol.md`.

Docs and code here should stay **lean**: no explanatory comment padding, no restating what the code says, no AI-generated filler. Terse and correct beats thorough and noisy.

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

- `protocol.js` — `FRAME_SIZE`, `PACKET_TYPE`, `CATEGORY`/`CMD`/`MEMORY_CMD`/`EVENT_CMD`, the `REG` device-register map, `DATALOG_STATUS`, and the pure functions: `buildCommand`, `parseReport`, `parseResponse`, `parseFileSizes`, `parseLookupTable`, `parseDatalogRecords`. Wire format is documented in `docs/protocol.md` (verified against 7.x firmware) — treat it as the source of truth.
- `transport.js` — `GogoTransport`, a WebHID class: `connect({ prompt })`, `disconnect()`, `send(payload)`, `connected` getter, and an `on`/`off` event bus emitting `connect`, `disconnect`, `report`, `error`.
- `protocol.test.mjs` — `node --test` coverage for the parse/build functions; run via `npm test`.

**Vuex adapter — `src/store/gogo.js`.** A thin layer over the device service: one `GogoTransport` instance, `bindTransport` wires its events to mutations (`SET_CONNECTED`, `SET_REPORT`, `SET_RESPONSE`, `SET_ERROR`), and the `send`/`connect`/`disconnect` actions call straight through to `transport`. `boardStatus` (used throughout the views to disable controls) is `connected && !!report` — a report has to have arrived, not just a HID open.

- Outbound: `buildCommand(category, command, params)` returns the 63-byte frame with the report-ID byte already dropped (category at 0, command at 1); `transport.send` strips nothing — WebHID's `sendReport(0, payload)` supplies the report ID itself.
- Inbound: every `report` event is tried against `parseReport` (type-0 device register) first, then `parseResponse` (type-20 command response) — whichever matches commits.

**Pages — `src/views/`.** `Live.vue` (streaming sensor tiles), `Control.vue` (motors/servos/relays/beep), `Datalog.vue` (offline datalog sync + chart), `Logo.vue` (compile/download Logo programs and raw opcodes), `Packets.vue` (raw packet builder/sender). Routes are registered in `src/router/index.js`.

**Logo download flow** (`Logo.vue`): POST source to the cloud compiler (`compilerUrl` from `src/config.js`, `emulateJSON`) → set memory pointer (cat 1, cmd 1) → `writeLogoMemory` chunks of 60 bytes (cat 1, cmd 3) awaited in sequence with a 10 ms `setTimeout` between packets → beep (cat 0, cmd 11). The "Logo Opcodes" textarea skips the compiler and feeds `downloadOpcodeToBoard` a raw JSON byte array.

**Offline datalog** (`Datalog.vue` + `src/components/Chart.vue`): multi-packet sync driven by `packet.status` (file size → lookup table → records), unpacked via `parseFileSizes`/`parseLookupTable`/`parseDatalogRecords` from `src/gogo/protocol.js`. See `docs/offline-datalog.md` before touching the unpacking code.

Gotchas there:

- `computePacket` is a **computed property with side effects** — it is what drives the sync state machine on every new `lastResponse`. Refactoring it into a "pure" computed breaks syncing.
- The chart only renders once `datalogRecords` is non-empty (`v-else` on `<datalog-chart ref="datalogChart">`), so the chart is fed by a `$nextTick`-guarded ref mutation, `this.$refs.datalogChart.chartOptions.series = …`, not via props. Skipping the guard throws the first time records arrive on an empty page.

Records are on the 7.x 10-byte format, parsed via `DataView`. There is no channel concept offline — series are keyed by field.

## gh-pages coupling

History-mode router + `publicPath: '/gogo-api-demo/'` in production (`vue.config.js`) + the spa-github-pages redirect pair (`public/404.html` and the inline script in `public/index.html`) are one mechanism. Changing any one of the three breaks deep-link routing on GitHub Pages.

## Branching

git-flow is initialized: `feature/*` and `bugfix/*` off `develop`, `release/*`/`hotfix/*` off `master`.
