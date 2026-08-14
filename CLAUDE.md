# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Internal demo/reference webapp for GoGo Board ↔ webapp communication. Not a product — it is the **playground where transport and protocol work is prototyped before it ships in the GoGoCode webapp**. The WebHID plugin in `src/plugins/webhid-plugin/` was built and proven here, then ported to GoGoCode. New device-facing features should follow the same route.

Sibling repos to consult (local, not vendored here):

| Path | What it is |
|---|---|
| `~/Developer/gogo-code` | GoGoCode webapp — where proven features graduate to. `src/services/const.js`, `deviceControl.js`, `deviceProcess.js` are the maintained protocol layer; `src/plugins/webhid-plugin/` is the descendant of this repo's plugin. |
| `~/Developer/gogo-logo-compiler` | Python Logo compiler behind `CONST.compiler_url`. |
| `~/Developer/gogoboard-7.x/gogo-firmware` | GoGo Board 7.x firmware — **authoritative** for packet layout, category/command IDs, and the type-0 register map (`include/gogo-firmware.h`, `processCMD()` in `src/gogo-firmware.cpp`). |

## Current focus

This repo has been unmaintained for a while and still demos **GoGo Board 6.x**; current hardware is **7.x**. Work in progress:

- bring the app up to 7.x (protocol drift is documented in `docs/protocol.md`); `origin/feature/datalog-v2` already carries the datalog half and is waiting to merge
- replace the stale docs — the old README, `OfflineDatalogNote.md`, and the Google-Sheets protocol table are being folded into maintained markdown under `docs/`
- lower the barrier for future work on this repo

Docs and code here should stay **lean**: no explanatory comment padding, no restating what the code says, no AI-generated filler. Terse and correct beats thorough and noisy.

## Commands

```bash
npm install        # Node 14 recommended (per README)
npm run serve      # dev server with hot reload
npm run build      # production build to dist/
./deploy.sh        # builds, then FORCE-PUSHES dist/ to gh-pages of LILCMU/gogo-api-demo — a live deploy, not a local step
```

There is no test suite and no linter configured (no eslint plugin in devDependencies). "Verify" here means `npm run serve` plus a browser.

WebHID requires Chromium (Chrome/Edge), a secure context, and a user gesture for `requestDevice()`. Nothing device-facing can be exercised without a physical GoGo Board.

## Architecture

Vue 2 SPA (Options API, Vue CLI 4, Vuex, vue-router) that talks to a GoGo Board over **WebHID** directly from the browser.

**Transport — `src/plugins/webhid-plugin/`.** A hand-written Vue plugin deliberately modeled on `vue-native-websocket`'s API:

- `hid-devices.js` — `install()` exposes `Vue.prototype.$webhid` (the raw HIDDevice), `$webhidConnect()`, `$webhidDisconnect()`.
- `observer.js` — owns connect/disconnect lifecycle, wires `oninputreport` → `Emitter` → `passToStore()`, which commits into Vuex using the mutation names from `src/store/mutation-types.js`.
- `emitter.js` — small label→callback bus.

The websocket path (`vue-native-websocket` to the local GoGo Plugin on `ws://localhost:8317`) is **commented-out legacy** in `src/main.js` and `const.js`. It is not broken code awaiting a fix — leave it unless asked.

**Protocol.** Wire format is documented in `docs/protocol.md` (verified against 7.x firmware). All packet layout indices, command IDs, and status codes live in `src/store/const.js`; new protocol constants belong there, not inline. The values in `const.js` are still 6.x — treat `docs/protocol.md` as the source of truth when they disagree.

- Outbound: 64-byte array where index 0 is the HID **report ID**. The store's `sendHID` action strips it (`data.slice(1)`) before `sendReport(0, …)`. So callers build `cmdPacket[1] = category`, `cmdPacket[2] = command`, params from index 3 (`category_id_index` / `command_id_index` / `parameters_index`).
- Inbound (`HID_ONINPUTREPORT` mutation in `src/store/index.js`): if byte 0 is `20` (`response_packet_type`) the packet is a command response → `state.response = {size, command, status, data}`. Anything else is the free-running sensor/status report → `state.socket.message`. Board presence (`state.board.status`) is inferred from packets arriving at all.
- Sensor values in `GoGoAPI.vue` are big-endian 16-bit pairs read from index 1 (`sensor_start_index`) — still correct on 7.x. `firmware_version_index: 20` is **not**: on 7.x byte 19 is the major version and 20 the minor.

**Logo download flow** (`GoGoAPI.vue`): POST source to the AWS compiler (`CONST.compiler_url`, `emulateJSON`) → set memory pointer (cat 1, cmd 1) → `writeLogoMemory` chunks of 60 bytes (cat 1, cmd 3) recursing with a 10 ms `setTimeout` between packets → beep (cat 0, cmd 11). The "Logo Opcodes" textarea skips the compiler and feeds `downloadOpcodeToBoard` a raw JSON byte array.

**Offline datalog** (`src/views/OfflineDatalog.vue` + `src/components/Chart.vue`): multi-packet sync driven by `packet.status` (file size → lookup table → records). See `docs/offline-datalog.md` before touching the unpacking code.

Two gotchas there:

- `computePacket` is a **computed property with side effects** — it is what drives the sync state machine on every new `gogoResponse`. Refactoring it into a "pure" computed breaks syncing.
- The chart is fed by direct ref mutation, `this.$refs.datalogChart.chartOptions.series = …`, not via props.

`develop` parses the 6.x 16-byte record; the 7.x 10-byte migration is written and unmerged on **`origin/feature/datalog-v2`** (drops the channel dropdown, parses via `DataView`). Merge it rather than redoing the work.

## gh-pages coupling

History-mode router + `publicPath: '/gogo-api-demo/'` in production (`vue.config.js`) + the spa-github-pages redirect pair (`public/404.html` and the inline script in `public/index.html`) are one mechanism. Changing any one of the three breaks deep-link routing on GitHub Pages.

## Branching

git-flow is initialized: `feature/*` and `bugfix/*` off `develop`, `release/*`/`hotfix/*` off `master`.
