# Demo webapp redesign

## Why

The demo exists so someone can read one page's source, copy the part they need, and build their own tool that talks to a GoGo Board. Two things block that today:

- The reusable logic — build a packet, strip the report ID, send, decode the reply — is tangled into `GoGoAPI.vue` alongside view state. You cannot lift it out without untangling it first.
- One page mixes a child-facing sensor readout with a raw category/command builder, so neither audience is served and neither is easy to find.

It is also the platform's shop window. A reference implementation is copied verbatim, so its markup and styling become the standard for everything built from it.

## Audiences

| | Reads | Wants |
|---|---|---|
| Child | The running app | Plug the board in, see it react, make it do something |
| Developer | The source | Find the file that does X, copy it, adapt it |

Both are served by the same rule: **one page = one capability = one readable file.**

## Pages

Router replaces the current two-page split. `/` redirects to `/live`.

| Route | Page | Capability | Audience |
|---|---|---|---|
| `/live` | Live | Read the type-0 report — sensors, board info, built-in sensors | Child |
| `/control` | Control | Send commands — motors, servos, relay, beep | Child |
| `/datalog` | Datalog | Offline sync and chart | Child |
| `/logo` | Logo | Compile a Logo program and download bytecode | Developer |
| `/packets` | Packets | Build any packet by hand, watch live traffic | Developer |

Each view imports from `src/gogo/` and holds only its own presentation. No view builds a byte frame inline.

## Device service

Two plain-JS modules under `src/gogo/`. **No Vue imports in either.** A team on React or Web Serial can take one file and drop it in.

### `src/gogo/protocol.js` — bytes to meaning, no I/O

Pure functions and constants. No device, no network, no framework, so it is testable and copyable on its own.

```js
export const PACKET_TYPE = { REPORT: 0, RESPONSE: 20, IMAGE: 21 }
export const CATEGORY = { CONTROL: 0, MEMORY: 1, DATA_DRIVEN: 4, EVENT_REQUEST: 20 }
export const CMD = { MOTOR_ON_OFF: 2, /* … */ BEEP: 11 }
export const REG = { SENSOR_START: 1, BOARD_TYPE: 17, FIRMWARE: 19, /* … */ }

buildCommand(category, command, params = [])  // -> Uint8Array(63), ready for sendReport
parseReport(bytes)                            // -> structured type-0 report
parseResponse(bytes)                          // -> { type, length, command, payload }
parseDatalogRecords(bytes, lookupTable)       // -> [{ timestamp, field, value }]
```

`buildCommand` returns the 63-byte payload with the report ID already dropped. That asymmetry — outbound is shifted by one, inbound is not — is the single most confusing thing about this protocol, and this is the one place it is handled.

`parseReport` returns the whole register map decoded, not just four sensors:

```js
{
  sensors: [512, 88, 1004, 0],
  joystick: 0,
  board:   { type: 6, typeName: 'GoGo Board 7', version: '7M', firmware: '4.2.1' },
  motors:  { active, onOff, direction, power: [...] },
  servos:  { active, angles: [...], mode },
  relays:  { power: [...], status },
  ir, clock, wifi, datalog, messaging,
  builtin: { orientation, proximity, gesture, light, loudness,
             accel: { x, y, z }, temperature, humidity },
  grading,
}
```

Decoding the register map is the thing every integrator needs and currently has to write themselves from the spreadsheet. Shipping it correct is most of this repo's value.

### `src/gogo/transport.js` — WebHID only

```js
class GogoTransport {
  connect()            // requestDevice + open, resolves to the device
  disconnect()
  send(payload)        // Uint8Array(63) -> sendReport(0, payload)
  on(event, handler)   // 'connect' | 'disconnect' | 'report' | 'response' | 'error'
  off(event, handler)
}
```

Owns device lifecycle and the `navigator.hid` connect/disconnect listeners. Emits raw byte arrays; it does not interpret them. Callers compose:

```js
transport.send(buildCommand(CATEGORY.CONTROL, CMD.BEEP))
transport.on('report', bytes => { const report = parseReport(bytes) })
```

### `src/store/gogo.js` — Vuex adapter

Thin. Holds `connected`, the latest parsed `report`, and `lastResponse`; exposes `connect` / `disconnect` / `send` actions. This is the only file that knows both Vuex and the service, and it is deliberately small so a reader can see the seam.

`src/plugins/webhid-plugin/` is deleted — `transport.js` replaces it. GoGoCode's own copy of the plugin is untouched; if the new shape proves out here, that is a separate follow-up for GoGoCode.

`src/store/const.js` is superseded: its protocol constants move into `protocol.js` as the named enums above, and its one non-protocol entry (`compiler_url`) moves to a small `src/config.js`. `src/components/Chart.vue` survives as-is — it is already a presentation-only component.

## Visual design

Direction **A2**: chunky blocks, colour carried by a stripe and a soft tint rather than a full-saturation fill.

### Palette

Taken from GoGoCode's `src/sass/_variables.scss` — not invented. The demo's current `#09af32` and `#42b983` are not platform colours and go away.

| Token | Hex | Source | Role |
|---|---|---|---|
| `--gogo-green` | `#a5d442` | `$cc-green` / `$brand-primary` | Primary, connected state |
| `--gogo-orange` | `#f3a73c` | `$cc-orange` | Data accent |
| `--gogo-blue` | `#02a8f4` | `$cc-blue` | Data accent, links |
| `--gogo-pink` | `#db3f8d` | `$cc-pink` | Data accent, destructive |
| `--gogo-ink` | `#01354c` | `$cc-dark-blue` | All body text, dark panels |

Tints for A2 tile backgrounds: green `#f1f9e0`, orange `#fef3e2`, blue `#e1f4fe`, pink `#fbe7f1`.
Neutrals: page `#f7f8fa`, card `#ffffff`, muted text `#5c7a8c`, inactive `#9fb4c0`.

**Contrast rule, and why A2 exists.** `#a5d442` and `#f3a73c` are light — white on them measures roughly 1.7:1 and 2.0:1, far under the 4.5:1 minimum. So brand colours may never carry white text. In A2 every number is `--gogo-ink` on a tint, which clears 4.5:1 on all four, and colour identifies the channel without being load-bearing for legibility.

### Components

- **Tile** — tinted background, 7px left stripe in the full-saturation colour, 18px radius, small muted uppercase label, large ink value. Value drops to `#9fb4c0` when there is no signal, so a real `0` and a dead channel look different. Today they do not.
- **Dark panel** — `--gogo-ink` background, 18px radius, for grouped secondary readings. Gives the page a base.
- **Pill** — 999px radius, tinted, for board info and connection state.
- **Button** — rounded, green primary, pink destructive, with a real disabled state.

### Header

Replaces the centred nav. Left-aligned throughout; the global `text-align: center` in `App.vue` goes.

```
[gogo-logo.png]   Live  Control  Datalog  │  Logo  Packets        ● Connected
```

- Wordmark top-left from this repo's `src/assets/gogo-logo.png` (264×78, rendered ~132×39). GoGoCode has no wordmark to borrow — its navbar logo slot still renders the leftover Vuestic template SVG.
- A divider separates the three child-facing tabs from the two developer ones; no mode switch, both are always reachable.
- Connection state sits far right on every page, carried over from the fix already on `bugfix/disconnected-state-feedback`.

Developer pages inherit the same tokens at lower saturation and use monospace for byte values.

## States

Every page handles four states explicitly. The disconnected work already merged on `bugfix/disconnected-state-feedback` is the baseline and extends to the new pages:

- **Disconnected** — actions disabled with a reason; header pill grey.
- **Empty** — Datalog shows an explicit "no records yet" panel instead of a blank 570px chart. Packets shows an idle traffic log.
- **Working** — sync progress; "Compiling..." on Logo.
- **Failed** — inline message on the page, never `console.error`, never `alert()`.

## Out of scope

- Mobile. Desktop and tablet only, per instruction.
- Vue 3 or Vue CLI upgrade. Still Vue 2 + Vue CLI 4, Node 14 (or `NODE_OPTIONS=--openssl-legacy-provider`).
- A test suite. There is no runner and adding one is its own decision.
- Porting anything back into GoGoCode.

## Success criteria

1. A developer wanting to read a sensor opens `src/gogo/protocol.js`, copies `parseReport`, and needs nothing else from this repo.
2. No `.vue` file constructs a byte frame inline.
3. Every colour in the app traces to a token, and every token traces to a GoGoCode variable.
4. No text sits below 4.5:1 against its background.
5. A child can plug in a board and make it beep without reading anything.
