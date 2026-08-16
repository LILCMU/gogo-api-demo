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

- [Protocol reference](docs/protocol.md) — packet framing, command tables, device register map
- [Offline datalog](docs/offline-datalog.md) — sync state machine and record format

## Requirements

- **Chromium-based browser** — WebHID is not in Firefox or Safari
- **Node 14** — the toolchain is Vue CLI 4 and has not been updated
- A GoGo Board over USB for anything device-facing

## Setup

```bash
npm install
npm run serve    # dev server, hot reload
npm test         # unit tests for src/gogo/
npm run build    # production build to dist/
./deploy.sh      # build + force-push dist/ to gh-pages
```

On Node 17 or newer, webpack 4 dies with `ERR_OSSL_EVP_UNSUPPORTED`. Either use Node 14 or prefix the command:

```bash
NODE_OPTIONS=--openssl-legacy-provider npm run build
```

Live demo: https://lilcmu.github.io/gogo-api-demo

## Status

Current hardware is **GoGo Board 7.x**; parts of this demo still assume 6.x. The drift is documented — see [Changes since 6.x](docs/protocol.md#changes-since-6x).

Offline datalog and the firmware-version read are both on the 7.x format.
