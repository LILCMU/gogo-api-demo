# GoGo API Demo

Reference webapp for talking to a GoGo Board from the browser. It is the playground where transport and protocol work gets prototyped before it ships in the [GoGoCode](https://code.gogoboard.org) webapp — the WebHID plugin in `src/plugins/webhid-plugin/` was built and proven here first.

Two pages:

- **GoGoAPI** — live sensor report, raw command sender, and Logo program/opcode download
- **Offline Datalog** — pull records off the board's flash and chart them

## How it talks to the board

```
Web Application  <-- WebHID -->  GoGo Board
```

The browser opens the board's raw HID interface directly. No helper app, no driver.

Reading is unprompted: the board streams its device register from power-up. Writing is a 63-byte command packet per action. Downloading a Logo program is two steps — POST the source to the cloud compiler, then push the returned bytecode to the board in 60-byte chunks.

Earlier versions went through a local GoGo Plugin over a websocket (`ws://localhost:8317`). That path is legacy; the code is still in `src/main.js`, commented out.

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

Offline datalog is migrated. Still open: the GoGoAPI page reads the firmware version from the wrong register byte.
