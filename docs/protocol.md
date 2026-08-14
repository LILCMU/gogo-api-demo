# GoGo Board USB HID Protocol

Replaces the old Google Sheets protocol table. Values here are read from **GoGo Board 7.x firmware** (`gogo-firmware/include/gogo-firmware.h` and `processCMD()` in `src/gogo-firmware.cpp`); parameter semantics come from the original sheet. Where the two disagree, the firmware wins — see [Changes since 6.x](#changes-since-6x).

## Transport

| | |
|---|---|
| Vendor ID | `0x0461` |
| Product ID | `0x0020` |
| Interface | raw HID (usage page `0xFF00`), report ID `0` |
| Payload | 63 bytes each way, fixed length |

The board also exposes a keyboard HID interface on the same device. `navigator.hid.requestDevice()` can return both — pick the one whose `collections` is non-empty.

### Index convention

Both directions use a 64-byte frame where **index 0 is the HID report ID**. Inbound and outbound differ in whether you see that byte:

- **Outbound** — WebHID's `sendReport(0, payload)` supplies the report ID itself; `buildCommand` in `src/gogo/protocol.js` emits the 63 bytes that follow directly, with no report-ID byte to drop. Table index N below is payload index N−1.
- **Inbound** — `oninputreport` gives 63 bytes with **no shift**: `event.data` byte 0 *is* frame byte 0, the packet type.

Unused bytes are zero.

## Host → board

```
[0] report ID (0)      [1] category ID      [2] command ID      [3..63] parameters
```

16-bit parameters are big-endian (high byte first).

### Categories

| ID | Category | Dispatched over USB HID |
|---|---|---|
| 0 | Output / peripheral / system control | yes |
| 1 | Flash + Logo memory | yes |
| 2 | Raspberry Pi | connect-WiFi only |
| 3 | GoGo Arduino | no handler |
| 4 | Data-driven toolkit | yes |
| 5 | *(was Hopher decentralized ops)* | reserved, never shipped |
| 20 | Event request | yes |

### Category 0 — control

| Cmd | Action | `[3]` | `[4]` | `[5]` |
|---|---|---|---|---|
| 2 | Motor on/off | target motors (0 = active ports) | 0 off, 1 on | |
| 3 | Motor direction | target motors | 0 CCW, 1 CW | |
| 4 | Motor reverse direction | target motors | | |
| 6 | Motor set power | target motors | power 0–100 hi | lo |
| 7 | Set active motor ports | bitmask, one bit per port | | |
| 8 | Toggle active motor port | port number | | |
| 9 | Servo set head | target servos (0 = active ports) | head 10–40 hi | lo |
| 14 | Set active servo ports | bitmask, one bit per port | | |
| 15 | Servo thisway | target servos | angle 0–180 hi | lo |
| 16 | Servo thatway | target servos | angle 0–180 hi | lo |
| 17 | Servo set angle | target servos | angle 0–180 hi | lo |
| 18 | Toggle active servo port | port number | | |
| 19 | Relay set power (raw PWM duty) | target relay | power 0–100 hi | lo |
| 10 | LED control | 0 off, 1 on | | |
| 11 | Beep | *(7.x ignores all parameters)* | | |
| 12 | Logo autorun state | 0 disable, 1 enable | | |
| 13 | Logo control | 0 stop, 1 start, 2 toggle | | |
| 50 | Sync RTC from host | seconds, then `[4]` minutes, `[5]` hours, `[6]` day-of-week, `[7]` day, `[8]` month 1–12, `[9]` year from 2000 | | |
| 51 | Read RTC → registers 36–42 | | | |
| 60 | Show short text | NUL-terminated string, up to 60 chars | | |
| 63 | Show image | URL, up to 60 chars — replies with report type 21 | | |
| 64 | Get image URL → report type 21 | | | |
| 100 | Reboot | | | |
| 250 | Enter bootloader | | | |

**No-ops on 7.x.** These are defined but have no HID handler: `1` ping, `5` motor break, `20` set active relay ports, `61` long text, `62` clear screen, `70`–`74` voice recorder, `81`–`83` keyboard, `91` IR send, `200` OTA update, `201` serial firmware update (explicitly deprecated in the source), `220` co-MCU hello (an ESP↔Arduino-bridge frame, not host-facing).

### Category 1 — memory

| Cmd | Action | `[3]` | `[4]` |
|---|---|---|---|
| 1 | Set Logo memory pointer | address hi | address lo |
| 2 | Set absolute flash pointer | address hi | address lo |
| 3 | Write bytes | length (max 60) | bytecode, `length` bytes from `[4]` |
| 4 | Read bytes | length | *(no handler in 7.x)* |

Commands 1 and 2 fall through to the same handler; either resets the upload offset. The firmware buffers writes and commits to NVS when it sees a chunk **shorter than 60 bytes** — so the last chunk must be a short one, and a program whose length is an exact multiple of 60 needs a trailing zero-length write.

### Category 4 — data-driven toolkit

| Cmd | Action | `[3]` | `[4]…` |
|---|---|---|---|
| 1 | WiFi connect | length of `SSID,PASSWORD` | the string |
| 2 | WiFi disconnect | | |
| 3 | Set datalog UID | UID length | UID string |

### Category 20 — event request

| Cmd | Action | Response |
|---|---|---|
| 1 | Get GoGo ID (MAC address) | type 20, MAC at bytes 3–8 |
| 2 | Read offline datalog | type 20 stream — see [offline-datalog.md](offline-datalog.md) |
| 3 | Clear offline datalog | none; board beeps on success |

## Board → host

Byte 0 identifies the packet.

| Type | Meaning |
|---|---|
| 0 | Device register — streamed continuously, ~50 ms |
| 20 | Command response / datalog stream |
| 21 | Image notification |

Type 0 streams unprompted from power-up; no request is needed. A type 20 or 21 packet preempts one report cycle.

### Type 0 — device register

The 63 bytes are a direct copy of the firmware's `gblDeviceRegister`. 16-bit values are big-endian.

| Byte | Field |
|---|---|
| 0 | Packet type (always 0) |
| 1–8 | Sensors 1–4, 2 bytes each |
| 9–10 | Joystick |
| 11 | Active servo ports |
| 12–15 | Servo 1–4 angle (0–180) |
| 16 | Servo mode |
| 17 | Hardware type (`0x06`) |
| 18 | Hardware ID — high nibble board version, low nibble PCB revision (`A`=0) |
| 19–21 | Firmware version — major, minor, patch |
| 22 | Active motor ports |
| 23 | Motor on/off status |
| 24 | Motor direction |
| 25–28 | Motor A–D duty |
| 29–32 | Relay 1–4 duty (0–100) |
| 33 | IR value |
| 34 | Active relay — *documented but never written by 7.x firmware* |
| 35 | Relay on/off status |
| 36–42 | Clock: seconds, minutes, hours, day-of-week, day, month, year |
| 43 | WiFi status — 0 disconnected, 1 connected |
| 44 | Datalog status — 0 disconnected, 1 connected |
| 45 | Messaging status — 0 disconnected, 1 connected |
| 46 | Board orientation — 0 none, 1 tilt up, 2 tilt down, 3 tilt left, 4 tilt right, 5 face up, 6 face down, 7 free fall, 8 shake, 9 hit 3G, 10 hit 6G, 11 hit 8G |
| 47 | Proximity — 0–255, unitless |
| 48 | Hand gesture |
| 49–50 | Ambient light, lux |
| 53 | Loudness — approximate dB SPL (30–120) |
| 54–59 | Accelerometer X, Y, Z — 2 bytes each, signed |
| 60 | Temperature, °C |
| 61 | Relative humidity, %RH |
| 62 | Grading rules status — 1 bit per condition |

Bytes not listed are unallocated.

**Board type** (byte 17): 0 none, 1 gogo4, 2 pi topping (gogo5), 3 wireless gogo, 4 gogo6, 5 gogobright, 6 **gogo7**.

**Hardware ID** (byte 18) packs the PCB identity into two nibbles — high = board version, low = revision letter (`A` = 0). GoGo Board 7M reports `0x7C`.

**Accelerometer scaling.** Bytes 54–59 are scaled raw values, not m/s². Convert per axis: `int16(value) / 1000 * 9.80665`. A raw reading of 2048 (1 g) scales to 999.424 mg → `9.8005 m/s²`.

### Type 20 — command response

```
[0] 20      [1] length      [2] command ID      [3..62] command-specific
```

`length` excludes the type and length bytes themselves. **Everything past byte 2 depends on the command** — there is no shared status byte:

| Command | Layout |
|---|---|
| 1 — GoGo ID | MAC address at `[3..8]`, `length` = 7 |
| 2 — offline datalog | status at `[3]`, payload at `[4..62]` (≤ 59 bytes), `length` = payload size |

Note the two commands disagree on what `length` counts — for GoGo ID it includes the command byte, for datalog it is the payload alone.

Datalog data longer than 59 bytes is split across packets; the status byte says which stage you are on.

> This demo's store parses *every* type-20 packet as `{size: [1], command: [2], status: [3], data: [4..]}`, which silently misreads a GoGo ID response as status `= MAC[0]`. Nothing requests GoGo ID today, so it has never bitten.

### Type 21 — image notification

```
[0] 21      [1] URL length (0 = cleared)      [2..62] URL, zero-padded, no NUL
```

Sent unprompted whenever the board shows or clears an image, and on demand via command `64`. Lets a webapp mirror the board's screen.

## Changes since 6.x

The old spreadsheet described 6.x. Confirmed differences on 7.x:

| Area | 6.x | 7.x |
|---|---|---|
| Register 17 — hardware type | `0x04` | `0x06` |
| Register 18 — hardware ID | `0x61` | version/revision nibbles, e.g. `0x7C` |
| Registers 19–21 | GoGo firmware ID hi/lo, then STM firmware ID | firmware major, minor, patch |
| Register 16 | unallocated | servo mode |
| Registers 49–52 | APDS lux, hue, saturation, value | lux only (49–50) |
| Registers 54–59 | pitch, roll, yaw | accelerometer X, Y, Z (2 bytes each) |
| Registers 60–61 | unallocated | temperature, humidity |
| Motor break (cmd 5) | supported | removed |
| Offline datalog record | 16 bytes, ms timestamp, channel + field | 10 bytes, second timestamp, field only |

Anything the sheet listed under Raspberry Pi control beyond WiFi connect, and the whole Hopher category, never shipped a handler.

**Up to date in this demo:** firmware version is read from byte 19 (major), matching the 7.x layout, and offline datalog is on the 7.x format.
