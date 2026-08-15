# Demo Webapp Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the demo into a set of one-capability pages backed by a framework-free device service, styled in GoGoCode's real palette, so a developer can copy one file and a child can make a board beep.

**Architecture:** Three phases. Phase 1 extracts `src/gogo/protocol.js` (pure, unit-tested) and `src/gogo/transport.js` (WebHID only) behind a thin Vuex adapter, keeping the existing two pages working the whole time. Phase 2 splits those pages into five capability pages. Phase 3 replaces the ad-hoc CSS with a token-based A2 visual system.

**Tech Stack:** Vue 2.6, Vue CLI 4, Vuex 3, vue-router 3, Highcharts 9, WebHID. Tests run on Node's built-in runner — no new dependencies.

Spec: `.claude/specs/demo-webapp-redesign.md`

## Global Constraints

- **Vue 2 + Vue CLI 4 only.** No Vue 3, no build-tool upgrade.
- **Desktop and tablet only.** Do not add mobile breakpoints or fix narrow-viewport overflow.
- **No Vue import may appear in `src/gogo/`.** This is the whole point of the extraction; a `import Vue from 'vue'` there fails the task.
- **Node 17+ needs `NODE_OPTIONS=--openssl-legacy-provider`** for every `npm run build` and `npm run serve`. Every build command below includes it.
- **Palette is fixed** — only these five, traced to `gogo-code/src/sass/_variables.scss`: green `#a5d442`, orange `#f3a73c`, blue `#02a8f4`, pink `#db3f8d`, ink `#01354c`. Tints: `#f1f9e0`, `#fef3e2`, `#e1f4fe`, `#fbe7f1`. Neutrals: page `#f7f8fa`, card `#ffffff`, muted `#5c7a8c`, inactive `#9fb4c0`.
- **Brand green and orange may never carry white text** (1.7:1 and 2.0:1). All values render in ink `#01354c`.
- **Comment style:** the existing code uses `//?` for asides and `//*` for emphasis. Match it. Do not add explanatory comments restating what code does.

## Test Strategy

There was no test runner. This plan adds one without adding a dependency:

- **`src/gogo/protocol.js` is unit-tested** with `node --test`. It is pure functions over byte arrays — the highest-risk code here, since a wrong register offset produces silently wrong data rather than a crash. Node 24 detects ES module syntax in `.js` sources, so `.mjs` test files can import them directly. Verified working before this plan was written.
- **`src/gogo/transport.js` is not unit-tested.** It is a thin wrapper over `navigator.hid`, which does not exist in Node. It is verified by build plus browser behaviour with no board attached.
- **Views are verified in a browser** via the dev server, checking rendered state rather than implementation.

Add to `package.json` scripts in Task 1: `"test": "node --test 'src/gogo/**/*.test.mjs'"`.

## File Structure

**Created**

| File | Responsibility |
|---|---|
| `src/gogo/protocol.js` | Constants, `buildCommand`, `parseReport`, `parseResponse`, `parseDatalogRecords`. No I/O. |
| `src/gogo/protocol.test.mjs` | Unit tests for the above. |
| `src/gogo/transport.js` | WebHID lifecycle, `send`, event emitter. No parsing. |
| `src/config.js` | `compilerUrl` and other non-protocol config. |
| `src/store/gogo.js` | Vuex module adapting transport + protocol. |
| `src/styles/tokens.css` | CSS custom properties for the palette, radii, spacing. |
| `src/components/AppHeader.vue` | Logo top-left, nav tabs, connection pill. |
| `src/components/StatTile.vue` | A2 tile: tint, stripe, label, value. |
| `src/components/DarkPanel.vue` | Ink panel for grouped secondary readings. |
| `src/views/Live.vue` | Type-0 report display. |
| `src/views/Control.vue` | Motor/servo/relay/LED/beep controls. |
| `src/views/Logo.vue` | Compile and download. |
| `src/views/Packets.vue` | Raw packet builder and traffic log. |

**Modified**

| File | Change |
|---|---|
| `src/store/index.js` | Delegates to `src/store/gogo.js`. |
| `src/router/index.js` | Five routes. |
| `src/App.vue` | Uses `AppHeader`, drops centred layout. |
| `src/views/OfflineDatalog.vue` | Renamed to `Datalog.vue`, uses the service. |
| `package.json` | Adds the `test` script. |

**Deleted**

`src/plugins/webhid-plugin/` (all three files), `src/store/const.js`, `src/views/GoGoAPI.vue`.

---

# Phase 1 — Device service

Behaviour-preserving. The existing pages keep working throughout.

### Task 1: Protocol constants and `buildCommand`

**Files:**
- Create: `src/gogo/protocol.js`
- Create: `src/gogo/protocol.test.mjs`
- Modify: `package.json` (scripts block)

**Interfaces:**
- Consumes: nothing.
- Produces: `PACKET_TYPE`, `CATEGORY`, `CMD`, `REG`, `DATALOG_STATUS`, `BOARD_TYPE` objects; `buildCommand(category, command, params = []) -> Uint8Array` of length 63.

- [ ] **Step 1: Add the test script to `package.json`**

In the `"scripts"` block, after `"build"`:

```json
"test": "node --test 'src/gogo/**/*.test.mjs'"
```

- [ ] **Step 2: Write the failing test**

Create `src/gogo/protocol.test.mjs`:

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildCommand, CATEGORY, CMD } from './protocol.js'

test('buildCommand returns a 63-byte payload', () => {
  const payload = buildCommand(CATEGORY.CONTROL, CMD.BEEP)
  assert.ok(payload instanceof Uint8Array)
  assert.equal(payload.length, 63)
})

test('buildCommand puts category and command in the first two bytes', () => {
  //? the report ID is dropped, so category lands at index 0 not 1
  const payload = buildCommand(CATEGORY.CONTROL, CMD.BEEP)
  assert.equal(payload[0], 0)
  assert.equal(payload[1], 11)
})

test('buildCommand writes params from index 2', () => {
  const payload = buildCommand(CATEGORY.CONTROL, CMD.MOTOR_ON_OFF, [0b1111, 1])
  assert.equal(payload[2], 0b1111)
  assert.equal(payload[3], 1)
})

test('buildCommand zero-fills the rest', () => {
  const payload = buildCommand(CATEGORY.CONTROL, CMD.BEEP)
  assert.equal(payload.slice(2).every((b) => b === 0), true)
})

test('buildCommand rejects params that overflow the frame', () => {
  assert.throws(
    () => buildCommand(CATEGORY.CONTROL, CMD.BEEP, new Array(62).fill(1)),
    /too long/
  )
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './protocol.js'`

- [ ] **Step 4: Write the constants and `buildCommand`**

Create `src/gogo/protocol.js`:

```js
//? Wire format reference: docs/protocol.md
//? Verified against GoGo Board 7.x firmware (include/gogo-firmware.h).

export const FRAME_SIZE = 63

export const PACKET_TYPE = {
  REPORT: 0,
  RESPONSE: 20,
  IMAGE: 21,
}

export const CATEGORY = {
  CONTROL: 0,
  MEMORY: 1,
  DATA_DRIVEN: 4,
  EVENT_REQUEST: 20,
}

export const CMD = {
  MOTOR_ON_OFF: 2,
  MOTOR_DIRECTION: 3,
  MOTOR_REVERSE: 4,
  MOTOR_SET_POWER: 6,
  MOTOR_SET_ACTIVE: 7,
  MOTOR_TOGGLE_ACTIVE: 8,
  SERVO_SET_HEAD: 9,
  LED_CONTROL: 10,
  BEEP: 11,
  AUTORUN_STATE: 12,
  LOGO_CONTROL: 13,
  SERVO_SET_ACTIVE: 14,
  SERVO_THISWAY: 15,
  SERVO_THATWAY: 16,
  SERVO_SET_ANGLE: 17,
  SERVO_TOGGLE_ACTIVE: 18,
  RELAY_SET_POWER: 19,
  READ_RTC: 51,
  SHOW_TEXT: 60,
}

export const MEMORY_CMD = {
  SET_LOGO_POINTER: 1,
  WRITE_BYTES: 3,
}

export const EVENT_CMD = {
  GOGO_ID: 1,
  GET_DATALOG: 2,
  CLEAR_DATALOG: 3,
}

export const REG = {
  PACKET_TYPE: 0,
  SENSOR_START: 1,
  JOYSTICK: 9,
  SERVO_ACTIVE: 11,
  SERVO_ANGLE: 12,
  SERVO_MODE: 16,
  BOARD_TYPE: 17,
  HARDWARE_ID: 18,
  FIRMWARE: 19,
  MOTOR_ACTIVE: 22,
  MOTOR_ON_OFF: 23,
  MOTOR_DIRECTION: 24,
  MOTOR_POWER: 25,
  RELAY_POWER: 29,
  IR_VALUE: 33,
  RELAY_STATUS: 35,
  CLOCK: 36,
  WIFI: 43,
  DATALOG: 44,
  MESSAGING: 45,
  ORIENTATION: 46,
  PROXIMITY: 47,
  GESTURE: 48,
  LIGHT: 49,
  LOUDNESS: 53,
  ACCEL_X: 54,
  TEMPERATURE: 60,
  HUMIDITY: 61,
  GRADING: 62,
}

export const BOARD_TYPE = {
  0: 'No board',
  1: 'GoGo Board 4',
  2: 'Pi Topping',
  3: 'Wireless GoGo',
  4: 'GoGo Board 6',
  5: 'GoGo Bright',
  6: 'GoGo Board 7',
}

export const DATALOG_STATUS = {
  IN_PROGRESS: 1,
  FAILURE: 2,
  EMPTY: 3,
  FILE_SIZE: 4,
  LOOKUP_TABLE: 5,
  RECORDS: 6,
}

export const SENSOR_COUNT = 4
export const MOTOR_COUNT = 4
export const SERVO_COUNT = 4
export const RELAY_COUNT = 4

//? The board frames commands as 64 bytes where index 0 is the HID report ID.
//? WebHID's sendReport() supplies that byte itself, so we emit the 63 that follow:
//? category at 0, command at 1, params from 2.
export function buildCommand(category, command, params = []) {
  if (params.length > FRAME_SIZE - 2) {
    throw new RangeError('command params too long for a 63-byte frame')
  }

  const payload = new Uint8Array(FRAME_SIZE)
  payload[0] = category
  payload[1] = command
  params.forEach((value, i) => {
    payload[2 + i] = value
  })

  return payload
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test`
Expected: PASS, 5 tests

- [ ] **Step 6: Commit**

```bash
git add src/gogo/protocol.js src/gogo/protocol.test.mjs package.json
git commit -m "feat(gogo): protocol constants and command frame builder"
```

---

### Task 2: `parseReport`

**Files:**
- Modify: `src/gogo/protocol.js`
- Modify: `src/gogo/protocol.test.mjs`

**Interfaces:**
- Consumes: `REG`, `BOARD_TYPE`, `SENSOR_COUNT`, `MOTOR_COUNT`, `SERVO_COUNT`, `RELAY_COUNT` from Task 1.
- Produces: `parseReport(bytes) -> object | null`, shape documented in the implementation below. `isReport(bytes) -> boolean`.

- [ ] **Step 1: Write the failing test**

Append to `src/gogo/protocol.test.mjs`:

```js
import { parseReport, isReport, REG } from './protocol.js'

//? builds a 63-byte type-0 report with specific registers set
function reportBytes (overrides = {}) {
  const bytes = new Uint8Array(63)
  Object.entries(overrides).forEach(([index, value]) => {
    bytes[Number(index)] = value
  })
  return bytes
}

test('isReport is true only for packet type 0', () => {
  assert.equal(isReport(reportBytes()), true)
  assert.equal(isReport(reportBytes({ 0: 20 })), false)
})

test('parseReport returns null for a non-report packet', () => {
  assert.equal(parseReport(reportBytes({ 0: 20 })), null)
})

test('parseReport decodes sensors as big-endian 16-bit pairs', () => {
  //? sensor 1 = 0x0200 = 512, sensor 2 = 0x0058 = 88
  const report = parseReport(reportBytes({ 1: 0x02, 2: 0x00, 3: 0x00, 4: 0x58 }))
  assert.deepEqual(report.sensors, [512, 88, 0, 0])
})

test('parseReport decodes board identity', () => {
  //? type 6 = GoGo Board 7, hardware id 0x7C = version 7 revision M
  const report = parseReport(reportBytes({ 17: 6, 18: 0x7c, 19: 4, 20: 2, 21: 1 }))
  assert.equal(report.board.type, 6)
  assert.equal(report.board.typeName, 'GoGo Board 7')
  assert.equal(report.board.version, '7M')
  assert.equal(report.board.firmware, '4.2.1')
})

test('parseReport reads the firmware major from byte 19, not 20', () => {
  //? the long-standing bug this repo shipped: byte 20 is the minor version
  const report = parseReport(reportBytes({ 17: 6, 19: 4, 20: 2, 21: 1 }))
  assert.equal(report.board.firmwareMajor, 4)
})

test('parseReport decodes accelerometer as signed 16-bit', () => {
  //? 0xFF9C = -100
  const report = parseReport(reportBytes({ 54: 0xff, 55: 0x9c }))
  assert.equal(report.builtin.accel.x, -100)
})

test('parseReport decodes built-in scalars', () => {
  const report = parseReport(reportBytes({ 47: 200, 53: 52, 60: 27, 61: 65 }))
  assert.equal(report.builtin.proximity, 200)
  assert.equal(report.builtin.loudness, 52)
  assert.equal(report.builtin.temperature, 27)
  assert.equal(report.builtin.humidity, 65)
})

test('parseReport decodes light as a big-endian pair', () => {
  const report = parseReport(reportBytes({ 49: 0x01, 50: 0x54 }))
  assert.equal(report.builtin.light, 340)
})

test('parseReport decodes the clock', () => {
  const report = parseReport(reportBytes({ 36: 30, 37: 45, 38: 13, 39: 4, 40: 14, 41: 8, 42: 26 }))
  assert.deepEqual(report.clock, {
    seconds: 30, minutes: 45, hours: 13, dayOfWeek: 4, day: 14, month: 8, year: 26,
  })
})

test('parseReport decodes motor and relay arrays', () => {
  const report = parseReport(reportBytes({ 25: 100, 26: 50, 29: 80, 30: 20 }))
  assert.deepEqual(report.motors.power, [100, 50, 0, 0])
  assert.deepEqual(report.relays.power, [80, 20, 0, 0])
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `parseReport is not a function` (or an import error)

- [ ] **Step 3: Implement `parseReport`**

Append to `src/gogo/protocol.js`:

```js
function u16 (bytes, index) {
  return (bytes[index] << 8) | bytes[index + 1]
}

function i16 (bytes, index) {
  const value = u16(bytes, index)
  return value > 0x7fff ? value - 0x10000 : value
}

function range (bytes, start, count) {
  return Array.from({ length: count }, (unused, i) => bytes[start + i])
}

//? high nibble is the board version, low nibble the PCB revision letter (A = 0)
function hardwareVersion (id) {
  if (!id) return null
  return String(id >> 4) + String.fromCharCode('A'.charCodeAt(0) + (id & 0x0f))
}

export function isReport (bytes) {
  return !!bytes && bytes[REG.PACKET_TYPE] === PACKET_TYPE.REPORT
}

export function parseReport (bytes) {
  if (!isReport(bytes)) return null

  return {
    sensors: Array.from({ length: SENSOR_COUNT }, (unused, i) =>
      u16(bytes, REG.SENSOR_START + i * 2)
    ),
    joystick: u16(bytes, REG.JOYSTICK),

    board: {
      type: bytes[REG.BOARD_TYPE],
      typeName: BOARD_TYPE[bytes[REG.BOARD_TYPE]] || 'Unknown board',
      version: hardwareVersion(bytes[REG.HARDWARE_ID]),
      firmwareMajor: bytes[REG.FIRMWARE],
      firmware: [
        bytes[REG.FIRMWARE],
        bytes[REG.FIRMWARE + 1],
        bytes[REG.FIRMWARE + 2],
      ].join('.'),
    },

    motors: {
      active: bytes[REG.MOTOR_ACTIVE],
      onOff: bytes[REG.MOTOR_ON_OFF],
      direction: bytes[REG.MOTOR_DIRECTION],
      power: range(bytes, REG.MOTOR_POWER, MOTOR_COUNT),
    },

    servos: {
      active: bytes[REG.SERVO_ACTIVE],
      mode: bytes[REG.SERVO_MODE],
      angles: range(bytes, REG.SERVO_ANGLE, SERVO_COUNT),
    },

    relays: {
      power: range(bytes, REG.RELAY_POWER, RELAY_COUNT),
      status: bytes[REG.RELAY_STATUS],
    },

    ir: bytes[REG.IR_VALUE],

    clock: {
      seconds: bytes[REG.CLOCK],
      minutes: bytes[REG.CLOCK + 1],
      hours: bytes[REG.CLOCK + 2],
      dayOfWeek: bytes[REG.CLOCK + 3],
      day: bytes[REG.CLOCK + 4],
      month: bytes[REG.CLOCK + 5],
      year: bytes[REG.CLOCK + 6],
    },

    wifi: bytes[REG.WIFI],
    datalog: bytes[REG.DATALOG],
    messaging: bytes[REG.MESSAGING],

    builtin: {
      orientation: bytes[REG.ORIENTATION],
      proximity: bytes[REG.PROXIMITY],
      gesture: bytes[REG.GESTURE],
      light: u16(bytes, REG.LIGHT),
      loudness: bytes[REG.LOUDNESS],
      accel: {
        x: i16(bytes, REG.ACCEL_X),
        y: i16(bytes, REG.ACCEL_X + 2),
        z: i16(bytes, REG.ACCEL_X + 4),
      },
      temperature: bytes[REG.TEMPERATURE],
      humidity: bytes[REG.HUMIDITY],
    },

    grading: bytes[REG.GRADING],
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test`
Expected: PASS, 15 tests total

- [ ] **Step 5: Commit**

```bash
git add src/gogo/protocol.js src/gogo/protocol.test.mjs
git commit -m "feat(gogo): decode the full type-0 device register map"
```

---

### Task 3: `parseResponse` and `parseDatalogRecords`

**Files:**
- Modify: `src/gogo/protocol.js`
- Modify: `src/gogo/protocol.test.mjs`

**Interfaces:**
- Consumes: `PACKET_TYPE`, `EVENT_CMD` from Task 1.
- Produces: `parseResponse(bytes) -> { type, length, command, status, payload } | null`, `parseDatalogRecords(bytes, lookupTable) -> [{ timestamp, field, value }]`, `parseLookupTable(bytes, size) -> string[]`, `parseFileSizes(bytes, size) -> { lookupTableSize, recordsSize }`.

- [ ] **Step 1: Write the failing test**

Append to `src/gogo/protocol.test.mjs`:

```js
import {
  parseResponse, parseDatalogRecords, parseLookupTable, parseFileSizes,
  DATALOG_STATUS, EVENT_CMD,
} from './protocol.js'

test('parseResponse returns null for a report packet', () => {
  assert.equal(parseResponse(new Uint8Array(63)), null)
})

test('parseResponse splits header from payload', () => {
  const bytes = new Uint8Array(63)
  bytes[0] = 20
  bytes[1] = 3
  bytes[2] = EVENT_CMD.GET_DATALOG
  bytes[3] = DATALOG_STATUS.IN_PROGRESS
  bytes[4] = 0xaa
  bytes[5] = 0xbb
  bytes[6] = 0xcc

  const response = parseResponse(bytes)
  assert.equal(response.command, EVENT_CMD.GET_DATALOG)
  assert.equal(response.length, 3)
  assert.equal(response.status, DATALOG_STATUS.IN_PROGRESS)
  assert.deepEqual(Array.from(response.payload), [0xaa, 0xbb, 0xcc])
})

test('parseFileSizes reads two newline-delimited numbers', () => {
  const text = '48\n120\n'
  const bytes = Uint8Array.from(text, (c) => c.charCodeAt(0))
  assert.deepEqual(parseFileSizes(bytes, bytes.length), {
    lookupTableSize: 48,
    recordsSize: 120,
  })
})

test('parseLookupTable splits on commas', () => {
  const text = 'temp,light,sound,'
  const bytes = Uint8Array.from(text, (c) => c.charCodeAt(0))
  assert.deepEqual(parseLookupTable(bytes, bytes.length), ['temp', 'light', 'sound'])
})

test('parseDatalogRecords reads 10-byte little-endian records', () => {
  //? timestamp 1700000000 s, field index 1, value 21.5
  const bytes = new Uint8Array(10)
  const view = new DataView(bytes.buffer)
  view.setUint32(0, 1700000000, true)
  view.setUint16(4, 1, true)
  view.setFloat32(6, 21.5, true)

  const records = parseDatalogRecords(bytes, ['temp', 'light'])
  assert.equal(records.length, 1)
  assert.equal(records[0].timestamp, 1700000000000)
  assert.equal(records[0].field, 'light')
  assert.equal(records[0].value, 21.5)
})

test('parseDatalogRecords ignores a trailing partial record', () => {
  const records = parseDatalogRecords(new Uint8Array(15), ['a'])
  assert.equal(records.length, 1)
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `parseResponse is not a function`

- [ ] **Step 3: Implement the parsers**

Append to `src/gogo/protocol.js`:

```js
export const DATALOG_RECORD_SIZE = 10

//? Type-20 layout past byte 2 is command-specific. Datalog puts a status byte
//? at 3 and payload from 4; GoGo ID puts the MAC at 3..8 with no status.
//? Callers must check `command` before trusting `status`.
export function parseResponse (bytes) {
  if (!bytes || bytes[REG.PACKET_TYPE] !== PACKET_TYPE.RESPONSE) return null

  const length = bytes[1]

  return {
    type: PACKET_TYPE.RESPONSE,
    length,
    command: bytes[2],
    status: bytes[3],
    payload: bytes.slice(4, 4 + length),
  }
}

function toText (bytes, size) {
  return String.fromCharCode.apply(null, Array.from(bytes.slice(0, size)))
}

export function parseFileSizes (bytes, size) {
  const [lookupTableSize, recordsSize] = toText(bytes, size).split('\n')
  return {
    lookupTableSize: parseInt(lookupTableSize, 10),
    recordsSize: parseInt(recordsSize, 10),
  }
}

export function parseLookupTable (bytes, size) {
  return toText(bytes, size).split(',').filter((name) => name.length > 0)
}

//? 7.x offline record: uint32 seconds, uint16 field index, float32 value.
//? Little-endian, and no channel — channel exists only on the online path.
export function parseDatalogRecords (bytes, lookupTable) {
  const view = new DataView(
    bytes.buffer, bytes.byteOffset, bytes.byteLength
  )
  const count = Math.floor(bytes.byteLength / DATALOG_RECORD_SIZE)
  const records = []

  for (let i = 0; i < count; i++) {
    const at = i * DATALOG_RECORD_SIZE
    records.push({
      timestamp: view.getUint32(at, true) * 1000,
      field: lookupTable[view.getUint16(at + 4, true)],
      value: view.getFloat32(at + 6, true),
    })
  }

  return records
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test`
Expected: PASS, 21 tests total

- [ ] **Step 5: Commit**

```bash
git add src/gogo/protocol.js src/gogo/protocol.test.mjs
git commit -m "feat(gogo): decode type-20 responses and offline datalog records"
```

---

### Task 4: `transport.js`

**Files:**
- Create: `src/gogo/transport.js`

**Interfaces:**
- Consumes: `FRAME_SIZE` from Task 1.
- Produces: `class GogoTransport` with `connect()`, `disconnect()`, `send(payload)`, `on(event, handler)`, `off(event, handler)`, and a `connected` getter. Events: `connect`, `disconnect`, `report`, `error`. The `report` handler receives a `Uint8Array` of 63 bytes.

There is no unit test — `navigator.hid` does not exist in Node. Verified by build and by browser behaviour in Task 6.

> **Amended after review.** The code block below shipped with six defects, all
> found in review and corrected in commit `7cb77c8`, which is authoritative.
> Public surface is unchanged — same methods, same `connected` getter, same four
> event names. The corrections were:
>
> 1. The `disconnect` listener must gate on `this.device && device === this.device`.
>    Without it, teardown fires on any HID disconnect, and twice per unplug,
>    because one board enumerates two HID interfaces.
> 2. A new `isGogoDevice()` helper ANDs vendor ID, product ID and raw-HID-ness;
>    the `connect` listener filters on it so a foreign device cannot hijack.
> 3. That listener catches `_open()`'s rejection and emits `error`, rather than
>    leaving an unhandled promise rejection.
> 4. `_open()` clears the previous device's `oninputreport` before reassigning.
> 5. Report bytes use `new Uint8Array(buffer, byteOffset, byteLength)` — the
>    DataView is not guaranteed to span its whole ArrayBuffer.
> 6. Device selection is `devices.find(isGogoDevice)` with no `devices[0]`
>    fallback, which could otherwise open the keyboard interface.

- [ ] **Step 1: Write the transport**

Create `src/gogo/transport.js`:

```js
import { FRAME_SIZE } from './protocol.js'

const GOGO_VENDOR_ID = 0x0461
const GOGO_PRODUCT_ID = 0x0020
const REPORT_ID = 0

//? The board also exposes a keyboard interface; only the raw HID one has
//? collections, so that is how we tell them apart.
function isRawHidDevice (device) {
  return device.collections && device.collections.length > 0
}

export class GogoTransport {
  constructor () {
    this.device = null
    this._handlers = new Map()

    if (navigator.hid) {
      navigator.hid.addEventListener('connect', ({ device }) => {
        if (isRawHidDevice(device)) this._open(device)
      })
      navigator.hid.addEventListener('disconnect', () => this._teardown())
    }
  }

  get connected () {
    return !!this.device && this.device.opened
  }

  //? Called with no user gesture on load, it can only reach already-granted
  //? devices; `prompt` opens the browser picker for a first-time pairing.
  async connect ({ prompt = true } = {}) {
    if (!navigator.hid) {
      this._emit('error', new Error('WebHID is not available in this browser'))
      return null
    }

    let devices = await navigator.hid.getDevices()

    if (!devices.length && prompt) {
      devices = await navigator.hid.requestDevice({
        filters: [{ vendorId: GOGO_VENDOR_ID, productId: GOGO_PRODUCT_ID }],
      })
    }

    const device = devices.find(isRawHidDevice) || devices[0]
    if (!device) return null

    await this._open(device)
    return device
  }

  async disconnect () {
    if (this.device && this.device.opened) {
      await this.device.close()
    }
    this._teardown()
  }

  async send (payload) {
    if (!this.connected) {
      throw new Error('no GoGo Board connected')
    }
    if (payload.length !== FRAME_SIZE) {
      throw new RangeError('payload must be ' + FRAME_SIZE + ' bytes')
    }
    await this.device.sendReport(REPORT_ID, payload)
  }

  on (event, handler) {
    if (!this._handlers.has(event)) this._handlers.set(event, [])
    this._handlers.get(event).push(handler)
    return this
  }

  off (event, handler) {
    const handlers = this._handlers.get(event)
    if (!handlers) return this
    this._handlers.set(event, handlers.filter((h) => h !== handler))
    return this
  }

  async _open (device) {
    this.device = device
    if (!device.opened) await device.open()

    device.oninputreport = (event) => {
      //? event.data excludes the report ID, so byte 0 is the packet type
      this._emit('report', new Uint8Array(event.data.buffer))
    }

    this._emit('connect', device)
  }

  _teardown () {
    if (this.device) this.device.oninputreport = null
    this.device = null
    this._emit('disconnect')
  }

  _emit (event, payload) {
    ;(this._handlers.get(event) || []).forEach((handler) => handler(payload))
  }
}
```

- [ ] **Step 2: Verify no Vue import leaked in**

Run: `grep -rn "vue" src/gogo/`
Expected: no output

- [ ] **Step 3: Verify it builds**

Run: `NODE_OPTIONS=--openssl-legacy-provider npm run build`
Expected: `DONE Build complete.`

- [ ] **Step 4: Commit**

```bash
git add src/gogo/transport.js
git commit -m "feat(gogo): WebHID transport with no framework dependency"
```

---

### Task 5: Vuex adapter and config

**Files:**
- Create: `src/store/gogo.js`
- Create: `src/config.js`
- Modify: `src/store/index.js`

**Interfaces:**
- Consumes: `GogoTransport` (Task 4); `parseReport`, `parseResponse`, `buildCommand` (Tasks 1–3).
- Produces: Vuex getters `connected`, `report`, `lastResponse`, `boardStatus`; actions `connect()`, `disconnect()`, `send({ category, command, params })`, `clearResponse()`.

`boardStatus` is kept as an alias for `connected` so the existing views and the disconnected-state work keep functioning until Phase 2 renames them.

> **Amended after review.** The module below shipped without any handling for the
> transport's `error` event, which fires on a browser lacking WebHID, on a board
> found without its raw HID interface, and on a failed reopen after reconnect.
> All three vanished silently. Corrected in commit `e5d526b`: `error: null` in
> state, an `error` getter, `SET_ERROR` / `CLEAR_ERROR` mutations, and a
> `transport.on('error', …)` subscription storing `error.message`. The `connect`
> subscription now clears a stale error as well as setting the connected flag.

- [ ] **Step 1: Write the config module**

Create `src/config.js`:

```js
export const compilerUrl = 'https://public-api.gogoboard.org/logo/dev/compile'
```

- [ ] **Step 2: Write the Vuex module**

Create `src/store/gogo.js`:

```js
import { GogoTransport } from '@/gogo/transport'
import { buildCommand, parseReport, parseResponse } from '@/gogo/protocol'

const transport = new GogoTransport()

export default {
  state: {
    connected: false,
    report: null,
    lastResponse: null,
  },

  getters: {
    connected: (state) => state.connected,
    boardStatus: (state) => state.connected && !!state.report,
    report: (state) => state.report,
    lastResponse: (state) => state.lastResponse,
  },

  mutations: {
    SET_CONNECTED (state, connected) {
      state.connected = connected
      if (!connected) state.report = null
    },
    SET_REPORT (state, report) {
      state.report = report
    },
    SET_RESPONSE (state, response) {
      state.lastResponse = response
    },
    CLEAR_RESPONSE (state) {
      state.lastResponse = null
    },
  },

  actions: {
    //? `prompt: false` on the startup attempt — requestDevice() needs a user
    //? gesture, so an unprompted call at load can only reach granted devices
    async connect (context, { prompt = true } = {}) {
      await transport.connect({ prompt })
    },

    async disconnect () {
      await transport.disconnect()
    },

    async send (context, { category, command, params = [] }) {
      await transport.send(buildCommand(category, command, params))
    },

    clearResponse ({ commit }) {
      commit('CLEAR_RESPONSE')
    },

    bindTransport ({ commit }) {
      transport.on('connect', () => commit('SET_CONNECTED', true))
      transport.on('disconnect', () => commit('SET_CONNECTED', false))
      transport.on('report', (bytes) => {
        const report = parseReport(bytes)
        if (report) {
          commit('SET_REPORT', report)
          return
        }
        const response = parseResponse(bytes)
        if (response) commit('SET_RESPONSE', response)
      })
    },
  },
}
```

- [ ] **Step 3: Wire it into the root store**

Replace the whole body of `src/store/index.js`:

```js
import Vue from 'vue'
import Vuex from 'vuex'
import gogo from './gogo'

Vue.use(Vuex)

const store = new Vuex.Store(gogo)

store.dispatch('bindTransport')
store.dispatch('connect', { prompt: false })

export default store
```

The startup `connect` must pass `prompt: false`. `navigator.hid.requestDevice()` throws without a user gesture, so an unprompted call at page load may only reach devices the user already granted. The picker opens from a button instead.

- [ ] **Step 4: Verify it builds**

Run: `NODE_OPTIONS=--openssl-legacy-provider npm run build`
Expected: `DONE Build complete.`

Build failures here will name the old `CONST` imports in the views — leave them for Task 6.

- [ ] **Step 5: Commit**

```bash
git add src/store/gogo.js src/store/index.js src/config.js
git commit -m "feat(store): adapt the gogo service to Vuex"
```

---

### Task 6: Move the existing views onto the service

**Files:**
- Modify: `src/views/GoGoAPI.vue`
- Modify: `src/views/OfflineDatalog.vue`
- Modify: `src/main.js`
- Delete: `src/plugins/webhid-plugin/emitter.js`, `src/plugins/webhid-plugin/hid-devices.js`, `src/plugins/webhid-plugin/observer.js`, `src/store/const.js`, `src/store/mutation-types.js`

**Interfaces:**
- Consumes: everything from Tasks 1–5.
- Produces: nothing new. This task is behaviour-preserving — the two pages look and act the same, on the new service.

> **Amended after review.** Two defects in the code below were found during
> implementation and corrected in commit `e20b091`:
>
> 1. The compile payload sent `board.version`, the formatted string (`"7M"`).
>    Production GoGoCode sends the raw byte at index 18 (`deviceProcess.js:391`),
>    so this would have broken cloud compilation. `parseReport` now also exposes
>    `board.hardwareId` (raw byte, unit-tested) and the payload sends that.
>    `board.version` remains for display.
> 2. The datalog terminal messages were returned from the `computePacket`
>    computed, but the same branches call `finishSync()`, which flips the flag
>    that computed guards on — so the completion message rendered once and
>    vanished. Terminal messages now go to the persistent `offlineDatalogStatus`
>    property and those branches return `''`. Transient progress messages are
>    unchanged.

- [ ] **Step 1: Strip the plugin from `src/main.js`**

Replace the whole file:

```js
import Vue from 'vue'
import VueResource from 'vue-resource'
import Modal from '@burhanahmeed/vue-modal-2'

import App from './App.vue'
import store from './store'
import router from './router'

Vue.config.productionTip = false

Vue.use(VueResource)
Vue.use(Modal, { componentName: 'ModalVue' })

new Vue({
  store,
  router,
  render: (h) => h(App),
}).$mount('#app')
```

- [ ] **Step 2: Point `GoGoAPI.vue` at the service**

In the `<script>` block, replace the `CONST` import with:

```js
import { CATEGORY, CMD, MEMORY_CMD } from '@/gogo/protocol'
import { compilerUrl } from '@/config'
```

Replace `mapGetters(['gogoReport', 'boardStatus'])` with `mapGetters(['report', 'boardStatus'])` and `mapActions(['connectDevice', 'sendHID'])` with `mapActions(['connect', 'send'])`.

Replace the `firmwareVersion` computed with:

```js
firmwareVersion: function () {
  return this.report ? this.report.board.firmwareMajor : 0
},
```

Replace the `processSensor` computed with:

```js
sensors: function () {
  return this.report ? this.report.sensors : []
},
```

Update the template to render `sensors` instead of `processSensor`, and `report && report.board.typeName` instead of the raw `gogoReport` dump.

Replace every `sendCommand(cmdList, cb)` call with a direct `send`:

```js
sendControlCommand: function () {
  if (!this.boardStatus) {
    this.reportAction('Connect a GoGo Board first.', true)
    return
  }
  const params = this.cmdParams
    ? this.cmdParams.split(',').map((value) => parseInt(value, 10))
    : []
  this.send({
    category: Number(this.cmdCategory),
    command: Number(this.cmdID),
    params,
  })
  this.reportAction(
    'Sent category ' + this.cmdCategory + ', command ' + this.cmdID + '.',
    false
  )
},
```

Rename the existing `report()` method to `reportAction()` throughout the file — `report` now collides with the Vuex getter.

Rewrite the two memory helpers:

```js
setLogoMemoryPointer: function () {
  return this.send({
    category: CATEGORY.MEMORY,
    command: MEMORY_CMD.SET_LOGO_POINTER,
    params: [0, 0],
  })
},

writeLogoMemory: async function (content) {
  for (let offset = 0; offset < content.length; offset += 60) {
    const chunk = content.slice(offset, offset + 60)
    await this.send({
      category: CATEGORY.MEMORY,
      command: MEMORY_CMD.WRITE_BYTES,
      params: [chunk.length].concat(Array.from(chunk)),
    })
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
  //? the firmware commits to NVS on a chunk shorter than 60, so a program
  //? whose length is an exact multiple needs a final empty write
  if (content.length % 60 === 0) {
    await this.send({
      category: CATEGORY.MEMORY,
      command: MEMORY_CMD.WRITE_BYTES,
      params: [0],
    })
  }
},
```

And make `downloadOpcodeToBoard` await them:

```js
downloadOpcodeToBoard: async function (logoOpcode) {
  if (!this.boardStatus) {
    this.reportAction('Connect a GoGo Board first.', true)
    return
  }
  if (!logoOpcode) {
    if (!this.logoOpcodes) {
      this.reportAction('Enter the logo opcodes first.', true)
      return
    }
    try {
      logoOpcode = JSON.parse(this.logoOpcodes)
    } catch (error) {
      this.reportAction('Logo opcodes must be a JSON array of bytes.', true)
      return
    }
  }

  await this.setLogoMemoryPointer()
  await this.writeLogoMemory(logoOpcode)
  await this.send({ category: CATEGORY.CONTROL, command: CMD.BEEP })
  this.reportAction('Downloaded to the board.', false)
},
```

Change `compilerUrl` usage in `downloadLogoProgram` from `CONST.compiler_url` to `compilerUrl`.

- [ ] **Step 3: Point `OfflineDatalog.vue` at the service**

Replace the `CONST` import with:

```js
import {
  CATEGORY, EVENT_CMD, DATALOG_STATUS,
  parseFileSizes, parseLookupTable, parseDatalogRecords,
} from '@/gogo/protocol'
```

Replace `mapGetters(['gogoResponse', 'boardStatus'])` with `mapGetters(['lastResponse', 'boardStatus'])`, and `mapActions(['sendHID', 'clearResponseHID', 'debugEnabled'])` with `mapActions(['send', 'clearResponse'])`.

Replace the `computePacket` computed and the body of `unpackOfflineDatalogPackets` so the parsing calls the service instead of doing it inline:

```js
computePacket () {
  if (!this.startRetrivedOfflineDatalog) return ''
  return this.unpackOfflineDatalogPackets(this.lastResponse)
},
```

```js
unpackOfflineDatalogPackets: function (packet) {
  if (!packet || packet.command !== EVENT_CMD.GET_DATALOG) return ''

  this.dataChunk.push.apply(this.dataChunk, Array.from(packet.payload))

  const total = this.datalogRecordsFileSize + this.lookupTableFileSize
  if (total) this.percentage += (packet.length / total) * 100

  if (packet.status === DATALOG_STATUS.EMPTY) {
    this.finishSync()
    return 'No records stored on the board.'
  }

  if (packet.status === DATALOG_STATUS.FILE_SIZE) {
    const sizes = parseFileSizes(Uint8Array.from(this.dataChunk), packet.length)
    this.lookupTableFileSize = sizes.lookupTableSize
    this.datalogRecordsFileSize = sizes.recordsSize
    this.dataChunk = []
    return 'Reading file sizes...'
  }

  if (packet.status === DATALOG_STATUS.LOOKUP_TABLE) {
    this.lookupTable = parseLookupTable(
      Uint8Array.from(this.dataChunk), this.lookupTableFileSize
    )
    this.dataChunk = []
    return 'Reading field names...'
  }

  if (packet.status === DATALOG_STATUS.RECORDS) {
    const records = parseDatalogRecords(
      Uint8Array.from(this.dataChunk).slice(0, this.datalogRecordsFileSize),
      this.lookupTable
    )
    this.datalogRecords = this.splitRecordsToChartSeries(records)
    this.$refs.datalogChart.chartOptions.series = this.datalogRecords
    this.finishSync()
    return 'Loaded ' + records.length + ' records.'
  }

  return 'Syncing...'
},

finishSync: function () {
  this.startRetrivedOfflineDatalog = false
  this.clearResponse()
},
```

Update `splitRecordsToChartSeries` to take the `{ timestamp, field, value }` objects the service now returns:

```js
splitRecordsToChartSeries: function (records) {
  const series = []
  records.forEach((record) => {
    let target = series.find((s) => s.name === record.field)
    if (!target) {
      target = { name: record.field, data: [], animation: false }
      series.push(target)
    }
    target.data.push([record.timestamp, record.value])
  })
  return series
},
```

Replace the two `sendCommand` calls:

```js
this.send({ category: CATEGORY.EVENT_REQUEST, command: EVENT_CMD.GET_DATALOG })
```
```js
this.send({ category: CATEGORY.EVENT_REQUEST, command: EVENT_CMD.CLEAR_DATALOG })
```

Delete the now-unused `sendCommand` method and the `debugEnabled` calls.

- [ ] **Step 4: Delete the plugin and old constants**

```bash
git rm -r src/plugins/webhid-plugin
git rm src/store/const.js src/store/mutation-types.js
```

- [ ] **Step 5: Verify nothing still imports them**

Run: `grep -rn "webhid-plugin\|store/const\|mutation-types" src/`
Expected: no output

- [ ] **Step 6: Verify build and tests**

Run: `npm test && NODE_OPTIONS=--openssl-legacy-provider npm run build`
Expected: 21 tests pass, `DONE Build complete.`

- [ ] **Step 7: Verify in a browser with no board attached**

Run: `NODE_OPTIONS=--openssl-legacy-provider npm run serve`

Open `http://localhost:8080/gogoapi` and check:
- the connection indicator reads "No GoGo Board connected"
- Download and Send command are disabled
- no uncaught errors in the console

Open `http://localhost:8080/offline-datalog` and check Sync Data and Delete Data are disabled.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor: move both views onto the extracted gogo service

Deletes the webhid plugin, store/const.js and mutation-types.js. The
pages behave as before; all packet building and parsing now lives in
src/gogo/."
```

---

# Phase 2 — Page split

### Task 7: Router, header shell, and `Live.vue`

**Files:**
- Create: `src/components/AppHeader.vue`, `src/views/Live.vue`
- Modify: `src/router/index.js`, `src/App.vue`
- Rename: `src/views/OfflineDatalog.vue` → `src/views/Datalog.vue`

**Interfaces:**
- Consumes: `report`, `boardStatus` getters (Task 5).
- Produces: routes `/live`, `/control`, `/datalog`, `/logo`, `/packets`; `AppHeader` component taking no props.

- [ ] **Step 1: Write the header**

Create `src/components/AppHeader.vue`:

```vue
<template>
  <header class="app-header">
    <img class="app-header__logo" src="@/assets/gogo-logo.png" alt="GoGo Board" />

    <nav class="app-header__nav">
      <router-link to="/live">Live</router-link>
      <router-link to="/control">Control</router-link>
      <router-link to="/datalog">Datalog</router-link>
      <span class="app-header__divider"></span>
      <router-link to="/logo">Logo</router-link>
      <router-link to="/packets">Packets</router-link>
    </nav>

    <span class="app-header__status" :class="boardStatus ? 'is-connected' : 'is-disconnected'">
      {{ boardStatus ? "Connected" : "No board" }}
    </span>
  </header>
</template>

<script>
import { mapGetters } from "vuex";

export default {
  name: "AppHeader",
  computed: {
    ...mapGetters(["boardStatus"]),
  },
};
</script>
```

Styling arrives in Task 11; leave the `<style>` block out for now.

- [ ] **Step 2: Rewrite the router**

Replace `src/router/index.js`:

```js
import Vue from 'vue'
import VueRouter from 'vue-router'

import Live from '@/views/Live.vue'
import Control from '@/views/Control.vue'
import Datalog from '@/views/Datalog.vue'
import Logo from '@/views/Logo.vue'
import Packets from '@/views/Packets.vue'

Vue.use(VueRouter)

export default new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes: [
    { path: '/', redirect: '/live' },
    { path: '/live', name: 'Live', component: Live },
    { path: '/control', name: 'Control', component: Control },
    { path: '/datalog', name: 'Datalog', component: Datalog },
    { path: '/logo', name: 'Logo', component: Logo },
    { path: '/packets', name: 'Packets', component: Packets },
    { path: '*', redirect: '/live' },
  ],
})
```

- [ ] **Step 3: Write `Live.vue`**

Create `src/views/Live.vue`:

```vue
<template>
  <section class="page">
    <p v-if="!report" class="page__empty">
      Connect a GoGo Board to see live readings.
    </p>

    <template v-else>
      <div class="pills">
        <span class="pill">{{ report.board.typeName }} {{ report.board.version }}</span>
        <span class="pill">Firmware {{ report.board.firmware }}</span>
      </div>

      <h2 class="section-label">Sensors</h2>
      <div class="tile-grid">
        <stat-tile
          v-for="(value, i) in report.sensors"
          :key="i"
          :label="'Sensor ' + (i + 1)"
          :value="value"
          :tone="tones[i]"
          :inactive="value === 0"
        />
      </div>

      <h2 class="section-label">On the board</h2>
      <dark-panel>
        <div class="readout"><span>Temp</span><strong>{{ report.builtin.temperature }}°C</strong></div>
        <div class="readout"><span>Humidity</span><strong>{{ report.builtin.humidity }}%</strong></div>
        <div class="readout"><span>Light</span><strong>{{ report.builtin.light }}</strong></div>
        <div class="readout"><span>Sound</span><strong>{{ report.builtin.loudness }}dB</strong></div>
      </dark-panel>
    </template>
  </section>
</template>

<script>
import { mapGetters } from "vuex";
import StatTile from "@/components/StatTile.vue";
import DarkPanel from "@/components/DarkPanel.vue";

export default {
  name: "Live",
  components: { StatTile, DarkPanel },
  data: function () {
    return { tones: ["green", "orange", "blue", "pink"] };
  },
  computed: {
    ...mapGetters(["report"]),
  },
};
</script>
```

- [ ] **Step 4: Write the two presentational components**

Create `src/components/StatTile.vue`:

```vue
<template>
  <div class="tile" :class="'tile--' + tone">
    <span class="tile__label">{{ label }}</span>
    <span class="tile__value" :class="{ 'is-inactive': inactive }">{{ value }}</span>
  </div>
</template>

<script>
export default {
  name: "StatTile",
  props: {
    label: { type: String, required: true },
    value: { type: [Number, String], required: true },
    tone: { type: String, default: "green" },
    inactive: { type: Boolean, default: false },
  },
};
</script>
```

Create `src/components/DarkPanel.vue`:

```vue
<template>
  <div class="dark-panel"><slot /></div>
</template>

<script>
export default { name: "DarkPanel" };
</script>
```

- [ ] **Step 5: Update `App.vue` to use the header**

Replace the template and script:

```vue
<template>
  <div id="app">
    <app-header />
    <router-view />
  </div>
</template>

<script>
import AppHeader from "@/components/AppHeader.vue";

export default {
  name: "App",
  components: { AppHeader },
};
</script>
```

Leave the existing `<style>` block; Task 11 replaces it.

- [ ] **Step 6: Rename the datalog view**

```bash
git mv src/views/OfflineDatalog.vue src/views/Datalog.vue
```

Change its `name: "Graph"` to `name: "Datalog"`.

- [ ] **Step 7: Stub the three views the router now needs**

Tasks 8–10 fill these in. Create each with only an empty page section so the
build stays green and this task stays independently reviewable.

`src/views/Control.vue`, `src/views/Logo.vue`, `src/views/Packets.vue`, each:

```vue
<template>
  <section class="page"></section>
</template>

<script>
export default { name: "Control" };
</script>
```

Use the matching `name` in each file: `Control`, `Logo`, `Packets`.

- [ ] **Step 8: Verify build**

Run: `NODE_OPTIONS=--openssl-legacy-provider npm run build`
Expected: `DONE Build complete.`

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(views): header, router and Live page"
```

---

### Task 8: `Control.vue`

**Files:**
- Create: `src/views/Control.vue`

**Interfaces:**
- Consumes: `send` action, `boardStatus` getter, `CATEGORY`/`CMD` from protocol.
- Produces: nothing.

Spec success criterion 5 says a child must be able to make the board beep without reading anything, so Beep is the first control on the page and needs no configuration.

> **Amended after review.** The `run()` helper below fires the async `send`
> without awaiting it, then writes the success message immediately — so a send
> that rejects (no device, malformed frame, board dropped mid-write) produces an
> unhandled rejection AND a UI claiming success. Corrected in commit `3c09d30`:
> `run` is `async`, awaits inside a try/catch, sets the success message only
> after the await resolves, and on failure sets `message` to `error.message`
> with `failed = true`. Callers need no change — `run` no longer rejects.
>
> **The same defect exists in Task 10's `sendPacket`.** Apply the same shape there.

- [ ] **Step 1: Write the view**

Create `src/views/Control.vue`:

```vue
<template>
  <section class="page">
    <h2 class="section-label">Try it</h2>
    <button class="btn btn--primary btn--large" :disabled="!boardStatus" @click="beep()">
      Beep
    </button>

    <h2 class="section-label">Motors</h2>
    <div class="control-row" v-for="i in 4" :key="'motor' + i">
      <span class="control-row__name">Motor {{ i }}</span>
      <button class="btn" :disabled="!boardStatus" @click="motor(i, true)">On</button>
      <button class="btn" :disabled="!boardStatus" @click="motor(i, false)">Off</button>
      <button class="btn" :disabled="!boardStatus" @click="reverse(i)">Reverse</button>
    </div>

    <h2 class="section-label">Servos</h2>
    <div class="control-row" v-for="i in 4" :key="'servo' + i">
      <span class="control-row__name">Servo {{ i }}</span>
      <input type="range" min="0" max="180" v-model.number="angles[i - 1]"
             :disabled="!boardStatus" @change="servo(i)" />
      <span class="control-row__value">{{ angles[i - 1] }}°</span>
    </div>

    <h2 class="section-label">LED</h2>
    <div class="control-row">
      <button class="btn" :disabled="!boardStatus" @click="led(true)">On</button>
      <button class="btn" :disabled="!boardStatus" @click="led(false)">Off</button>
    </div>

    <p class="action-message" :class="{ 'is-error': failed }">{{ message }}</p>
  </section>
</template>

<script>
import { mapActions, mapGetters } from "vuex";
import { CATEGORY, CMD } from "@/gogo/protocol";

export default {
  name: "Control",
  data: function () {
    return { angles: [90, 90, 90, 90], message: "", failed: false };
  },
  computed: {
    ...mapGetters(["boardStatus"]),
  },
  methods: {
    ...mapActions(["send"]),

    run: function (command, params, note) {
      if (!this.boardStatus) {
        this.message = "Connect a GoGo Board first.";
        this.failed = true;
        return;
      }
      this.send({ category: CATEGORY.CONTROL, command, params });
      this.message = note;
      this.failed = false;
    },

    //? port number to the firmware's one-bit-per-port mask
    mask: function (port) {
      return 1 << (port - 1);
    },

    beep: function () {
      this.run(CMD.BEEP, [], "Beeped.");
    },

    motor: function (port, on) {
      this.run(CMD.MOTOR_ON_OFF, [this.mask(port), on ? 1 : 0],
        "Motor " + port + (on ? " on." : " off."));
    },

    reverse: function (port) {
      this.run(CMD.MOTOR_REVERSE, [this.mask(port)], "Motor " + port + " reversed.");
    },

    servo: function (port) {
      const angle = this.angles[port - 1];
      this.run(CMD.SERVO_SET_ANGLE, [this.mask(port), angle >> 8, angle & 0xff],
        "Servo " + port + " to " + angle + "°.");
    },

    led: function (on) {
      this.run(CMD.LED_CONTROL, [on ? 1 : 0], on ? "LED on." : "LED off.");
    },
  },
};
</script>
```

- [ ] **Step 2: Commit**

```bash
git add src/views/Control.vue
git commit -m "feat(views): Control page"
```

---

### Task 9: `Logo.vue`

**Files:**
- Create: `src/views/Logo.vue`
- Delete: `src/views/GoGoAPI.vue`

**Interfaces:**
- Consumes: `send`, `boardStatus`, `report`; `compilerUrl` from `src/config.js`; `CATEGORY`, `CMD`, `MEMORY_CMD`.
- Produces: nothing.

Move the compile-and-download logic out of `GoGoAPI.vue` as it stands after Task 6, unchanged apart from the class name.

- [ ] **Step 1: Create the view**

Create `src/views/Logo.vue` with a template holding the two textareas (Logo Program, Logo Opcodes), each with its own Download button disabled on `!boardStatus`, plus the `action-message` line.

Copy `firmwareVersion`, `downloadLogoProgram`, `downloadOpcodeToBoard`, `setLogoMemoryPointer`, `writeLogoMemory` and `reportAction` verbatim from `GoGoAPI.vue` as they stand after Task 6.

- [ ] **Step 2: Delete the old view**

```bash
git rm src/views/GoGoAPI.vue
```

- [ ] **Step 3: Verify nothing references it**

Run: `grep -rn "GoGoAPI" src/`
Expected: no output

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(views): Logo page, replacing GoGoAPI"
```

---

### Task 10: `Packets.vue`

**Files:**
- Create: `src/views/Packets.vue`

**Interfaces:**
- Consumes: `send`, `boardStatus`, `lastResponse`, `report`; `buildCommand`.
- Produces: nothing.

- [ ] **Step 1: Write the view**

Create `src/views/Packets.vue`:

```vue
<template>
  <section class="page page--dev">
    <h2 class="section-label">Build a packet</h2>
    <div class="control-row">
      <label>Category <input type="number" v-model.number="category" /></label>
      <label>Command <input type="number" v-model.number="command" /></label>
      <label>Params <input type="text" v-model="params" placeholder="1,2,3" /></label>
      <button class="btn btn--primary" :disabled="!boardStatus" @click="sendPacket()">Send</button>
    </div>

    <h2 class="section-label">Frame preview</h2>
    <pre class="bytes">{{ preview }}</pre>

    <h2 class="section-label">Last response</h2>
    <pre class="bytes" v-if="lastResponse">command {{ lastResponse.command }}  status {{ lastResponse.status }}  length {{ lastResponse.length }}
{{ hex(lastResponse.payload) }}</pre>
    <p v-else class="page__empty">Nothing received yet.</p>

    <p class="action-message" :class="{ 'is-error': failed }">{{ message }}</p>
  </section>
</template>

<script>
import { mapActions, mapGetters } from "vuex";
import { buildCommand } from "@/gogo/protocol";

export default {
  name: "Packets",
  data: function () {
    return { category: 0, command: 11, params: "", message: "", failed: false };
  },
  computed: {
    ...mapGetters(["boardStatus", "lastResponse"]),

    paramBytes: function () {
      return this.params
        ? this.params.split(",").map((v) => parseInt(v, 10) || 0)
        : [];
    },

    preview: function () {
      try {
        return this.hex(buildCommand(this.category, this.command, this.paramBytes));
      } catch (error) {
        return error.message;
      }
    },
  },
  methods: {
    ...mapActions(["send"]),

    hex: function (bytes) {
      return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(" ");
    },

    sendPacket: function () {
      if (!this.boardStatus) {
        this.message = "Connect a GoGo Board first.";
        this.failed = true;
        return;
      }
      this.send({
        category: this.category,
        command: this.command,
        params: this.paramBytes,
      });
      this.message = "Sent.";
      this.failed = false;
    },
  },
};
</script>
```

- [ ] **Step 2: Verify build and tests**

Run: `npm test && NODE_OPTIONS=--openssl-legacy-provider npm run build`
Expected: 21 tests pass, `DONE Build complete.`

- [ ] **Step 3: Verify every route renders**

Run: `NODE_OPTIONS=--openssl-legacy-provider npm run serve`

Visit `/live`, `/control`, `/datalog`, `/logo`, `/packets`. Each renders with no console errors, and `/` redirects to `/live`.

- [ ] **Step 4: Commit**

```bash
git add src/views/Packets.vue
git commit -m "feat(views): Packets page"
```

---

# Phase 3 — Visual system

### Task 11: Tokens and the A2 component styles

**Files:**
- Create: `src/styles/tokens.css`
- Modify: `src/App.vue`, `src/components/AppHeader.vue`, `src/components/StatTile.vue`, `src/components/DarkPanel.vue`, `src/main.js`

**Interfaces:**
- Consumes: nothing.
- Produces: CSS custom properties and the shared `.page`, `.tile`, `.dark-panel`, `.btn`, `.pill`, `.section-label`, `.action-message`, `.bytes`, `.control-row` classes used by every view written in Phase 2.

> **Amended after review.** Two colours below failed the spec's own success
> criterion 4 (nothing below 4.5:1). Corrected in commit `9316b34`:
>
> 1. `--muted` was `#5c7a8c`, measuring 4.19:1 for `.tile__label` on the green
>    tint. Now `#4f6b7d` — verified 5.19 / 5.13 / 4.98 / 4.77:1 on the green,
>    orange, blue and pink tints.
> 2. `.tile__value.is-inactive` rendered `#9fb4c0` on a tint at 1.98:1, failing
>    even the 3:1 large-text floor. The dimming is **removed entirely** rather
>    than darkened — a zero is real data and now renders in ink like any other
>    reading. This also resolves a separate review finding that dimming conflated
>    "nothing plugged into this port" with "the sensor genuinely reads zero".
>    The `inactive` prop, its class binding and the `--inactive` token are gone.

- [ ] **Step 1: Write the tokens**

Create `src/styles/tokens.css`:

```css
:root {
  /* palette — gogo-code/src/sass/_variables.scss */
  --gogo-green: #a5d442;
  --gogo-orange: #f3a73c;
  --gogo-blue: #02a8f4;
  --gogo-pink: #db3f8d;
  --gogo-ink: #01354c;

  --gogo-green-tint: #f1f9e0;
  --gogo-orange-tint: #fef3e2;
  --gogo-blue-tint: #e1f4fe;
  --gogo-pink-tint: #fbe7f1;

  --page-bg: #f7f8fa;
  --card-bg: #ffffff;
  --muted: #5c7a8c;
  --inactive: #9fb4c0;
  --hairline: #e4e9ee;

  --radius-card: 18px;
  --radius-pill: 999px;
  --stripe: 7px;

  --gap: 10px;
  --pad: 14px;
}
```

- [ ] **Step 2: Import it globally**

Add to the top of `src/main.js`, before the other imports:

```js
import './styles/tokens.css'
```

- [ ] **Step 3: Style the app shell**

Replace the `<style>` block in `src/App.vue`:

```css
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: var(--gogo-ink);
  background: var(--page-bg);
  min-height: 100vh;
}

.page {
  max-width: 900px;
  margin: 0 auto;
  padding: 28px 24px 60px;
}

.page__empty {
  color: var(--muted);
  background: var(--card-bg);
  border: 1px dashed var(--hairline);
  border-radius: var(--radius-card);
  padding: 40px;
  text-align: center;
}

.section-label {
  font-size: 11px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--muted);
  font-weight: 700;
  margin: 26px 0 10px;
}

.tile-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--gap);
}

.pills { display: flex; gap: 8px; }

.pill {
  background: var(--gogo-green-tint);
  color: var(--gogo-ink);
  font-size: 12px;
  font-weight: 700;
  padding: 6px 14px;
  border-radius: var(--radius-pill);
}

.btn {
  font-size: 14px;
  font-weight: 700;
  color: var(--gogo-ink);
  background: var(--card-bg);
  border: 2px solid var(--hairline);
  border-radius: var(--radius-pill);
  padding: 9px 20px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.btn:hover:not([disabled]) { background: var(--gogo-green-tint); }

.btn--primary { background: var(--gogo-green); border-color: var(--gogo-green); }

.btn--large { font-size: 18px; padding: 16px 44px; }

.btn[disabled] { opacity: 0.4; cursor: not-allowed; }

.control-row {
  display: flex;
  align-items: center;
  gap: var(--gap);
  background: var(--card-bg);
  border-radius: var(--radius-card);
  padding: 12px var(--pad);
  margin-bottom: 8px;
}

.control-row__name { font-weight: 700; min-width: 90px; }
.control-row__value { color: var(--muted); min-width: 48px; }

.readout { display: flex; flex-direction: column; gap: 2px; }
.readout span { font-size: 11px; color: #8fb3c4; font-weight: 700; }
.readout strong { font-size: 18px; color: #fff; }

.bytes {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 13px;
  background: var(--card-bg);
  border-radius: var(--radius-card);
  padding: var(--pad);
  overflow-x: auto;
  color: var(--gogo-ink);
}

.action-message { min-height: 1.2em; margin-top: 16px; font-size: 14px; color: var(--muted); }
.action-message.is-error { color: var(--gogo-pink); }
```

- [ ] **Step 4: Style the tile**

Add to `src/components/StatTile.vue`:

```css
.tile {
  border-radius: var(--radius-card);
  padding: var(--pad);
  border-left: var(--stripe) solid var(--gogo-green);
  background: var(--gogo-green-tint);
}

.tile--orange { border-left-color: var(--gogo-orange); background: var(--gogo-orange-tint); }
.tile--blue   { border-left-color: var(--gogo-blue);   background: var(--gogo-blue-tint); }
.tile--pink   { border-left-color: var(--gogo-pink);   background: var(--gogo-pink-tint); }

.tile__label {
  display: block;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  color: var(--muted);
}

.tile__value {
  display: block;
  font-size: 30px;
  font-weight: 800;
  line-height: 1.15;
  color: var(--gogo-ink);
}

.tile__value.is-inactive { color: var(--inactive); }
```

- [ ] **Step 5: Style the dark panel and header**

Add to `src/components/DarkPanel.vue`:

```css
.dark-panel {
  background: var(--gogo-ink);
  border-radius: var(--radius-card);
  padding: var(--pad) 18px;
  display: flex;
  gap: 28px;
}
```

Add to `src/components/AppHeader.vue`:

```css
.app-header {
  display: flex;
  align-items: center;
  gap: 28px;
  padding: 14px 24px;
  background: var(--card-bg);
  border-bottom: 1px solid var(--hairline);
}

.app-header__logo { width: 132px; height: 39px; }

.app-header__nav { display: flex; align-items: center; gap: 18px; }

.app-header__nav a {
  font-weight: 700;
  font-size: 14px;
  color: var(--muted);
  text-decoration: none;
}

.app-header__nav a.router-link-active { color: var(--gogo-ink); }

.app-header__divider {
  width: 1px;
  height: 18px;
  background: var(--hairline);
}

.app-header__status {
  margin-left: auto;
  font-size: 12px;
  font-weight: 700;
  padding: 6px 14px;
  border-radius: var(--radius-pill);
}

.app-header__status.is-connected { background: var(--gogo-green); color: var(--gogo-ink); }
.app-header__status.is-disconnected { background: #eef1f4; color: var(--muted); }
```

- [ ] **Step 6: Verify build**

Run: `NODE_OPTIONS=--openssl-legacy-provider npm run build`
Expected: `DONE Build complete.`

- [ ] **Step 7: Verify in a browser**

Run: `NODE_OPTIONS=--openssl-legacy-provider npm run serve`

At 1280×900 with no board attached, check:
- the logo sits top-left and nav is left-aligned; nothing is centred
- `/live` shows the empty-state panel, not a bare page
- the connection pill reads "No board" in grey
- `/datalog` shows an empty-state message rather than a blank chart area

Then confirm no colour outside the token list appears:

Run: `grep -rnoE "#[0-9a-fA-F]{6}" src/views src/components | grep -v tokens.css`
Expected: only `#8fb3c4`, `#fff` and `#eef1f4` from the readout, dark-panel and status rules above.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(ui): A2 visual system on GoGoCode's palette

Tokens in one stylesheet; colour identifies a channel via a stripe and
tint while every value stays in ink, since brand green and orange cannot
carry white text."
```

---

### Task 12: Datalog empty state, colour tokens, docs refresh

**Files:**
- Modify: `src/views/Datalog.vue`, `src/components/Chart.vue`, `README.md`, `CLAUDE.md`, `docs/protocol.md`

> **Scope added during execution.** Task 11 styled everything in its Modify list,
> but `Datalog.vue` and `Chart.vue` were not on it and still carry pre-refactor
> hardcoded colours — `#7CFC00`, `#09af32`, `#eb4e4e`, `#fdc9c9`, `#42b983`,
> `#77a1e5`, `#2c3e50`. Two of those (`#42b983`, `#09af32`) are not GoGoCode
> palette colours at all. That leaves the branch short of success criterion 3,
> "every colour traces to a token", so tokenising them is folded in here — this
> task already opens `Datalog.vue`.
>
> Map them as: progress bar and sync affordances → `--gogo-green`; destructive
> delete affordances → `--gogo-pink` with `--gogo-pink-tint` for hover; all text
> → `--gogo-ink`. `Chart.vue` configures Highcharts in JS, where CSS variables do
> not resolve, so it takes the literal palette hex with a comment naming the
> token each one mirrors: series colours `#02a8f4` and `#db3f8d`, text `#01354c`.

- [ ] **Step 1: Add the empty state to `Datalog.vue`**

Wrap the chart so it only renders once there are records:

```vue
<p v-if="!datalogRecords.length" class="page__empty">
  No records loaded. Press Sync Data to pull them off the board.
</p>
<div v-else class="chart-container">
  <datalog-chart ref="datalogChart" />
</div>
```

Because `$refs.datalogChart` is now conditional, guard the assignment in `unpackOfflineDatalogPackets`:

```js
this.datalogRecords = this.splitRecordsToChartSeries(records)
this.$nextTick(() => {
  if (this.$refs.datalogChart) {
    this.$refs.datalogChart.chartOptions.series = this.datalogRecords
  }
})
```

- [ ] **Step 2: Update the docs**

In `README.md`, replace the two-page description with the five pages and add a "Copy what you need" section pointing at `src/gogo/protocol.js` and `src/gogo/transport.js`.

In `CLAUDE.md`, replace the Architecture section's plugin and protocol paragraphs with the `src/gogo/` structure, and add `npm test` to the Commands block.

In `docs/protocol.md`, change the closing "Not yet updated in this demo" note — the firmware-version bug is fixed and the datalog migration has landed.

- [ ] **Step 3: Verify**

Run: `npm test && NODE_OPTIONS=--openssl-legacy-provider npm run build`
Expected: 21 tests pass, `DONE Build complete.`

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(datalog): empty state; docs: describe the new structure"
```

---

## Self-review notes

Checked against the spec:

- Five pages — Tasks 7–10. ✅
- `protocol.js` with the four named functions — Tasks 1–3. ✅
- `transport.js` with the documented class surface — Task 4. ✅
- Thin Vuex adapter — Task 5. ✅
- `const.js` superseded, `config.js` created, `Chart.vue` untouched — Tasks 5–6. ✅
- Plugin deleted — Task 6. ✅
- A2 tiles, palette tokens, contrast rule — Task 11. ✅
- Header with logo top-left, divided nav, connection pill — Tasks 7 and 11. ✅
- Four states per page — disconnected in Tasks 8/10, empty in Tasks 7 and 12. ✅
- Success criterion 5, beep with no configuration — Task 8, first control on the page. ✅

Known gap carried forward deliberately: the Datalog date-offset picker is left as-is. The spec flagged it as an open question and it is not worth blocking the redesign on.
