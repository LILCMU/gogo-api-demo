# GoGo API Demo

Reference webapp for talking to a GoGo Board from the browser. It is the playground where transport and protocol work gets prototyped before it ships in the [GoGoCode](https://code.gogoboard.org) webapp — `src/gogo/` is written framework-free so it can be copied there directly.

Five pages:

- **Live** (`/live`) — the streaming device register, rendered as sensor tiles
- **Control** (`/control`) — motors, servos, relays, beep
- **Datalog** (`/datalog`) — pull records off the board's flash and chart them
- **Logo** (`/logo`) — compile and download a Logo program, or push raw opcodes
- **Packets** (`/packets`) — build and send a raw command packet, inspect the last response

## Copy what you need

`src/gogo/` has no Vue import and no dependency on this app's store or components — it is meant to be lifted wholesale into another project:

- `src/gogo/protocol.js` — packet framing, category/command/register constants, and the pure `build*`/`parse*` functions
- `src/gogo/transport.js` — `GogoTransport`, a small WebHID class wrapping connect/disconnect/send and an `on`/`off` event bus

Everything else in this repo (Vuex store, views, components) is a thin adapter around those two files.

## How it talks to the board

```
Web Application  <-- WebHID -->  GoGo Board
```

The browser opens the board's raw HID interface directly. No helper app, no driver.

Reading is unprompted: the board streams its device register from power-up. Writing is a 63-byte command packet per action. Downloading a Logo program is two steps — POST the source to the cloud compiler, then push the returned bytecode to the board in 60-byte chunks.

## Docs

Illustrated datasheets — diagrams and a worked example packet for every topic:

- [**Wire Protocol**](https://claude.ai/code/artifact/5adc8bd8-8799-4636-b508-db098818c737) — frame layout, command set, device register
- [**Offline Datalog Transfer**](https://claude.ai/code/artifact/5dceaae4-cce4-4823-8a7d-8dfb3b6f1f23) — the staged sync, decoded packet by packet

The same material in markdown, in this repo:

- [Protocol reference](docs/protocol.md) — packet framing, command tables, device register map
- [Offline datalog](docs/offline-datalog.md) — sync state machine and record format

## Requirements

- **Chromium-based browser** — WebHID is not in Firefox or Safari
- **Node 20 or newer** — developed and verified on Node 24 LTS
- A GoGo Board over USB for anything device-facing

## Setup

```bash
npm install
npm run serve    # dev server, hot reload
npm test         # unit tests for src/gogo/
npm run lint     # eslint over src/
npm run build    # production build to dist/
```

## Deploying

Pushing to `master` deploys. `.github/workflows/deploy.yml` runs lint, tests and the production build, then publishes `dist/` to GitHub Pages — so a red test never reaches the live site. It can also be run by hand from the Actions tab.

There is no deploy script to run locally, and nothing pushes to the `gh-pages` branch any more; Pages serves the workflow's artifact directly.

No `NODE_OPTIONS` workaround is needed. The toolchain is Vue CLI 5 on webpack 5; `babel-loader` is pinned past 8.2.2 via an `overrides` entry because that version hashes with md4, which OpenSSL 3 removed.

Live demo: https://lilcmu.github.io/gogo-api-demo

## Status

Tracks **GoGo Board 7.x** throughout, verified against a physical 7F running firmware 4.0.0. What changed from the 6.x protocol is documented — see [Changes since 6.x](docs/protocol.md#changes-since-6x).
