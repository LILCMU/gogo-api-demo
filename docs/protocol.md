# GoGo Board USB HID Protocol

Replaces the old Google Sheets protocol table. Values here are read from **GoGo Board 7.x firmware** (`gogo-firmware/include/gogo-firmware.h` and `processCMD()` in `src/gogo-firmware.cpp`); parameter semantics come from the original sheet. Where the two disagree, the firmware wins — see [Changes since 6.x](#changes-since-6x).

There is an illustrated datasheet of this protocol, with worked example packets, at <https://claude.ai/code/artifact/5adc8bd8-8799-4636-b508-db098818c737>.

## Transport

| | |
|---|---|
| Vendor ID | `0x0461` |
| Product ID | `0x0020` |
| Interface | raw HID (usage page `0xFF00`), report ID `0` |
| Payload | 63 bytes each way, fixed length |

The board also exposes a keyboard HID interface on the same device. `navigator.hid.requestDevice()` can return both — pick the one whose `collections` is non-empty.

### Index convention

Outbound frames carry a report ID; inbound frames do not. The tables below use **outbound frame indices** (report ID at index 0) for host → board, and **payload indices** (packet type at index 0, since there is no report-ID byte to offset from) for board → host:

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
| 2 | Raspberry Pi | connect-WiFi only (cmd 15) |
| 3 | GoGo Arduino | no handler |
| 4 | Data-driven toolkit | yes |
| 5 | *(was Hopher decentralized ops)* | reserved, never shipped |
| 20 | Event request | yes |

**Responses.** Most host → board commands are fire-and-forget — the firmware applies
them and sends nothing back over HID; a beep, if any, is the only feedback. Do not
write a blocking wait for an acknowledgement that never arrives. The exceptions:
category 0 commands `63` and `64` (image display) trigger a type-21 response, and
category 20 commands `1` and `2` (event request) trigger a type-20 response. Category
20 command `3` (clear datalog) still replies with nothing but a beep. Verified against
every `case` in `processCMD()`.

### Category 0 — control

> Frame index `[3]` = payload index `2` (see [Index convention](#index-convention)).

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
| 11 | Beep | *(7.x ignores all parameters)* | | |
| 12 | Logo autorun state | 0 disable, 1 enable | | |
| 13 | Logo control | 0 stop, 1 start, 2 toggle | | |
| 50 | Sync RTC from host | seconds, then `[4]` minutes, `[5]` hours, `[6]` day-of-week, `[7]` day, `[8]` month 1–12, `[9]` year from 2000 | | |
| 51 | Read RTC → registers 36–42 | | | |
| 60 | Show short text | NUL-terminated string, up to 60 chars | | |
| 61 | Show long text † | NUL-terminated string, up to 60 chars | | |
| 62 | Clear screen † | 0 pixels only, 1 also reset attributes | | |
| 63 | Show image | URL, up to 60 chars — replies with report type 21 | | |
| 64 | Get image URL → report type 21 | | | |
| 65 | Set background colour † | hue 0–255 | | |
| 66 | Set text colour † | hue 0–255 | | |
| 67 | Set text position † | x 0–255, from the text-area corner | y 0–255 | |
| 68 | Set text style † | 0 small, 1 large, 2 bold | | |
| 100 | Reboot | | | |
| 250 | Enter bootloader | | | |

† **Needs a firmware test build.** Commands `61`, `62` and `65`–`68` are implemented on the firmware branch `feature/expose-logovm-text-commands-hid`, built as `v4.0.0-hidtext`. They are in no released firmware — a stock board reporting `4.0.0` ignores them. Command `60` ships on released firmware, but its behaviour changed on the same branch. See [Display commands](#display-commands).

**No-ops on 7.x.** These are defined but have no HID handler at all: `1` ping, `5` motor break, `20` set active relay ports, `70`–`74` voice recorder, `81`–`83` keyboard, `91` IR send, `200` OTA update, `220` co-MCU hello (an ESP↔Arduino-bridge frame, not host-facing).

**Dispatched but inert — commands `10` and `201`.** These are the more dangerous case, because checking the firmware shows a `case` and suggests they work.

- `10` LED control: `CMD_LED_CONTROL` is dispatched, but its body is commented out pending NeoPixel support, so it reads and discards `[3]` and does nothing. There is no NeoPixel command in the host-facing protocol either — no constant, no dispatch case — so there is currently no way to drive any LED over USB HID on 7.x.
- `201` serial firmware update: dispatched, body commented out, marked DEPRECATED in the source. `RCMD_FIRMWARE_UPDATE_SERIAL` is likewise absent from the event-request switch, so neither route does anything.

### Display commands

Commands `60`, `61`, `62` and `65`–`68` share one set of rules. All seven are fire-and-forget: they reply with nothing over HID, so do not wait for an acknowledgement.

**They take over the screen.** Any of them switches the board to the main page, closes an open on-device menu, and holds the display until the user navigates away with the joystick. There is no "give the screen back" command. `60` used to guard on the page instead — arriving while the child was on Settings or Inputs, it drew nothing at all — and the other six did not exist.

**Confirmation is on the board, not on the wire.** `62` and `65`–`68` have no visible effect of their own, so each writes a line in the footer strip for 5 s: `clear screen`, `bg color: <NAME>`, `text color: <NAME>`, `text pos: <x>,<y>`, `text style: <SMALL|LARGE|BOLD>`. The colour name is the nearest of eight buckets 32 apart — `RED` 0, `ORANGE` 32, `YELLOW` 64, `GREEN` 96, `AQUA` 128, `BLUE` 160, `PURPLE` 192, `PINK` 224, wrapping so 250 reads as `RED`. `60` and `61` draw no confirmation — the text is the confirmation — and wipe a pending one first.

**`60` replaces, `61` appends.**

| | `60` short text | `61` long text |
|---|---|---|
| Screen | cleared on every call | never cleared |
| Layout | one line, centred on the whole screen | word-wrapped, left-aligned, inside a viewport |
| Cursor | ignored, unless a position was set with `67` | read, advanced, and left mid-line |

`60` clears to the background colour set by `65`, so a chosen background survives it. It centres without insets, so roughly 13 characters at the large style reach the bezel; use `67` + `61` when padding matters.

**Coordinates are relative to the text area, and unclamped.** `67` takes one byte each, so x and y both accept `0`–`255`. The firmware adds the 6-pixel inset itself, so `67 0 0` lands at the text area's top-left corner — panel pixel `(6, 6)` — not against the bezel. Nothing bounds the values after that: the panel is 160 × 128, so x above `153` or y above `121` puts the text off it entirely, silently. The confirmation line reports the raw values you sent, not the offset ones.

The rest of the inset is `61`'s word-wrap, not `67`'s. `61` wraps at panel x `154` and returns to panel x `6`; it advances one line by the glyph height plus 2 — **13 px** at the small and bold styles, **24 px** at large — and it stops the moment the current line's bottom would pass panel y `108`, which keeps it clear of the footer strip. In `67` coordinates that means `61` draws nothing at all from y above `91`, or above `80` at the large style. Text that runs past the bottom is dropped, not scrolled.

Before any `67`, the cursor sits at panel `(0, 0)` — the power-on value, hard against the bezel, and *not* what `67 0 0` gives you. Nothing resets it: not a clear, not page navigation. `62` with `[3] = 1` is the only other command that repositions it, to the same corner `67 0 0` uses.

**Splitting text across packets.** Consecutive `61` packets append where the previous one left the cursor; there is no reassembly buffer and no sequence numbering. The renderer prints leading separators but consumes trailing ones, so carry the space at the **start** of the next packet — send `"hello"` then `" world"`, never `"hello "` then `"world"`. A word split mid-packet rejoins correctly unless its first half lands exactly at the right margin, in which case it breaks across lines with no hyphen.

**Attributes apply to the next draw, not retroactively.** `66`, `67` and `68` change nothing already on screen — set them, then draw. `65` is the exception: a background *is* a draw, so it fills the screen immediately. Style `2` is bold at the **same 6 pt size** as style `0`; only style `1` is larger, and there is no large-bold — text getting smaller when you set bold is correct.

**Attributes persist.** Background colour, text colour, position and style set by `65`–`68` survive later commands and page navigation. Only two things clear them: `62` with `[3] = 1`, and a Logo program stopping. There is no per-attribute reset — no hue clears a text colour, no coordinate clears a position.

**Malformed parameters.** `67` is x then y, in that byte order. `68` silently drops an out-of-range style and changes nothing else. `62` treats any mode byte other than `1` as `0`: the inbound path does not zero the tail of a short report, so a stale byte degrades to pixels-only rather than wiping the attributes.

`65`–`68` call the same firmware routines as Logo's `bgcolor`, `textcolor`, `textpos` and `textstyle`, so the two paths produce identical results — see [logo-language.md](logo-language.md).

### Category 1 — memory

> Frame index `[3]` = payload index `2` (see [Index convention](#index-convention)).

| Cmd | Action | `[3]` | `[4]` |
|---|---|---|---|
| 1 | Set Logo memory pointer | address hi | address lo |
| 2 | Set absolute flash pointer | address hi | address lo |
| 3 | Write bytes | length (max 60) | bytecode, `length` bytes from `[4]` |
| 4 | Read bytes | length | *(no handler in 7.x)* |

Commands 1 and 2 fall through to the same handler; either resets the upload offset. The firmware buffers writes and commits to NVS when it sees a chunk **shorter than 60 bytes** — so the last chunk must be a short one, and a program whose length is an exact multiple of 60 needs a trailing zero-length write.

### Category 2 — Raspberry Pi

> Frame index `[3]` = payload index `2` (see [Index convention](#index-convention)).

| Cmd | Action | `[3]` | `[4]…` |
|---|---|---|---|
| 15 | WiFi connect (`CMD_WIFI_CONNECT_RPI`) | length of `SSID,PASSWORD` | the string, max 59 bytes |

Shares `handleWiFiConnect()` with category 4 command 1 below — identical parameters, identical 59-byte cap (`MAX_WIFI_CONFIG_LEN`). Only WiFi connect is wired for this category; there is no category-2 disconnect or UID command.

### Category 4 — data-driven toolkit

> Frame index `[3]` = payload index `2` (see [Index convention](#index-convention)).

| Cmd | Action | `[3]` | `[4]…` |
|---|---|---|---|
| 1 | WiFi connect | length of `SSID,PASSWORD` | the string, max 59 bytes |
| 2 | WiFi disconnect | | |
| 3 | Set datalog UID | UID length, max 59 bytes | UID string |

Commands 1 and 3 both clamp their string length to `MAX_WIFI_CONFIG_LEN` = 59 (`USB_CONFIG_HID_REPORT_SIZE − 4`: the 63-byte HID payload minus the 4 header bytes `[0..3]` — report ID, category, command, length); a longer value is silently truncated, not rejected.

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

Type 0 streams unprompted from power-up; no request is needed. A type 20 or 21 packet preempts one report cycle — **except** during a datalog transfer (category 20, command 2): the firmware sets `RESPONSE_REPORT_PACKET_DATALOG_STREAM` before the send loop and clears it only after, so `sendReportPkt()` returns early and type 0 is suppressed for the **entire** transfer, not one cycle. A client treating type 0 as a heartbeat will conclude the board died mid-sync.

### Type 0 — device register

The 63 bytes are a direct copy of the firmware's `gblDeviceRegister`. 16-bit values are big-endian.

`gblDeviceRegister` is actually 64 bytes (`REGISTER_SIZE`), but `sendReportPkt()` only transmits `USB_CONFIG_HID_REPORT_SIZE` (63) of them over HID. Register index 63 — the 64th byte — cannot be read over USB HID by any host.

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
| 25–28 | Motor A–D duty — **0–255 PWM**, not percent (see below) |
| 29–32 | Relay 1–4 duty — **0–100 percent** (see below) |
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

**Motor and relay duty use different scales, despite adjacent registers and
identical command parameters.** Both `6` (motor set power) and `19` (relay set power)
take a 0–100 value, but they report back differently:

- **Motor** bytes 25–28 hold the scaled PWM duty, `0–255`. The firmware constrains
  `_motorPower` to 0–255 and writes it to the register unchanged, so a command of 40
  reads back as `102`, 50 as `127`, and 100 as `255`. Convert with
  `percent = round(register * 100 / 255)`.
- **Relay** bytes 29–32 hold the percent you sent, `0–100`. `_relayPower` is clamped
  to 0–100, so a command of 40 reads back as `40`.

Confirmed on hardware: sending 100 / 50 / 10 to motor A produced registers
`255 / 127 / 25`, while sending 40 to relay 1 produced `40`. Treating the motor
register as a percentage will report a motor at "102%".

**Accelerometer scaling.** Bytes 54–59 hold milli-g, already scaled by firmware — not raw IMU counts and not m/s². Convert per axis: `int16(value) / 1000 * 9.80665`. Confirmed on hardware: a board lying flat reports accel z = `1001` → `1001 / 1000 * 9.80665` ≈ `9.82 m/s²` (one axis at ~1 g).

Don't confuse the register with the IMU's own internal reading. The LSM6DS3 outputs a raw signed count whose full-scale range puts roughly 2048 counts at 1 g; firmware multiplies that count by `LSM6DS3_ACCEL_SENSITIVITY = 0.488` (mg per count, at the board's ±16 g range setting) *before* writing bytes 54–59 (`gogo-peripherals.cpp`, `updateIMUSensor()`). So `2048 * 0.488 ≈ 1000` mg is where the "2048 = 1 g" figure comes from — it describes the pre-scaling IMU count, not something you divide the register value by. The register is already in milli-g.

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

URL length is capped at 61 bytes (`IMAGE_REPORT_MAX_URL_LEN` = `USB_CONFIG_HID_REPORT_SIZE − 2`, the 2-byte type+length header).

## Worked example

Connect, send a beep, read one type-0 report. Real captures from a GoGo Board 7F on firmware 4.0.0.

1. **Open the device.** `navigator.hid.requestDevice({filters: [{vendorId: 0x0461, productId: 0x0020}]})`, then `device.open()`. Pick the returned collection whose `usagePage` is `0xFF00` — the board also exposes a keyboard interface on the same USB device (see [Transport](#transport)).

2. **Build and send a beep.** `buildCommand(CATEGORY.CONTROL, CMD.BEEP)` (category 0, command 11) returns a 63-byte payload starting `00 0b 00 00 …` — payload index 0 = category, index 1 = command, the rest zero. `device.sendReport(0, payload)` supplies the report-ID byte itself, so the frame that actually reaches the board is `[0]=0 (report ID) [1]=0 (category) [2]=11 (command) [3..]=0` — frame index `[1]` is payload index `0`, per the [Index convention](#index-convention). Category 0 command 11 produces no response (see [Responses](#categories)); nothing more arrives because of this send.

3. **Read a type-0 report.** The board streams these unprompted; no request needed. `oninputreport` hands back 63 bytes with no shift — payload index is frame index here. A report captured from this board:

   | Byte | Value | Decoded |
   |---|---|---|
   | 0 | `0` | packet type — device register |
   | 1–2 | `3, 26` | sensor 1 = `(3 << 8) \| 26` = `794` |
   | 17 | `6` | board type — GoGo Board 7 |
   | 18 | `117` (`0x75`) | hardware ID — high nibble `7` (board version), low nibble `5` → `F` (`A` = 0) → **GoGo Board 7, revision F** |
   | 19 | `4` | firmware **major** |
   | 20 | `0` | firmware **minor** |
   | 21 | `0` | firmware patch → **4.0.0** |
   | 58–59 | *(z-axis, not shown raw)* | accel z = `1001` milli-g ≈ 1 g — see [accelerometer scaling](#type-0--device-register) |

   Firmware version is `bytes[19].bytes[20].bytes[21]` — major, minor, patch. Byte 20 is the **minor** version, not the major: reading the version from byte 20 instead of 19 is a real bug this repo shipped once (`src/gogo/protocol.js` now reads byte 19; regression pinned in `protocol.test.mjs`, `parseReport reads the firmware major from byte 19, not 20`). On this board byte 20 happens to be `0`, so that old bug would have silently reported firmware major `0` instead of `4` — a fixture with matching major/minor values would never have caught it.

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
