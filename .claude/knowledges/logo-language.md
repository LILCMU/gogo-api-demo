# GoGo Logo, as GoGo Board 7 actually runs it

What the language is, which parts of it the board implements, and the traps that cost time
to find. Derived from `~/Developer/gogo-logo-compiler/tinkerlogo.py` at `LOGO_VERSION 3.0`
and `~/Developer/gogoboard-7.x/gogo-firmware` at tag `version-3.2.6`.

`docs/logo-language.md` is the authoritative reference; `src/reference/logo.js` is the same
facts shaped for the in-app renderer at `/reference/logo`, and the two can drift.

## The silent halt

**40 words compile but do not run on GoGo Board 7.** An opcode with no handler falls through
`firstEvalOpcode` to `secondEvalOpcode` to `thirdEvalOpcode`, whose terminal `default:`
clears `LOGO_PROCEDURE_VM_RUNNING` and calls `logoProceduresHalt()`. No error, no beep,
nothing on serial. The program compiles, downloads, and stops dead at that line.

Excluded: the Raspberry Pi companion set (opcodes 200-239: camera, RFID, SMS, mail, sound,
key-value, `say`, `showlogplot`, `newrecordfile`), ultrasonic (119-120), `turnsteppingmotor`
(251), `vernier_slot` / `vernier_slot_unit` (249). Plus five that need firmware 4, which has
no stable release: `for`, `foreach`, `repcount`, `broadcastvalue`, `broadcastwithvalue`. Plus
three reserved by the lexer with no grammar rule at all: `_if`, `_then`, `_else`.

`for` and `foreach` matter most. They are the obvious way to write a counted loop, and they
halt this board. Use `repeat`.

The compiler gates the firmware-4 five through `_require_firmware`, which returns a real
compile error naming the feature. That gate only fires when the compiler is told the board's
firmware version; it passes through on `None`. The other 32 have no gate at all.

Derivation, re-runnable after a firmware release: parse `include/utils/logo-opcodes.h` at the
release tag **anchoring the regex to line start**, then check each declared symbol for any
reference across `src/`, `include/` and `lib/`. Unreferenced means unhandled. At `3.2.6`,
229 declared, 48 unreferenced. Eleven declarations are commented out (`SENSOR4`-`SENSOR8`,
`SWITCH3`-`SWITCH8`); counting those inflates the result by eleven words no keyword reaches.

## Syntax a developer cannot guess

- **Ports are a comma prefix, not an argument**: `a, on`, `servo1, seth 90`,
  `relay1, relaysetpower 60`. Motor letters `a` to `d` combine (`abc, on`). Read-back forms
  name the port inside the word: `aon?`, `athisway?`, `apower`, `servo1angle`, `relay1on?`.
- **The first procedure in the file is the entry point.** It gets `CODE_END`; later ones get
  `STOP`. Naming the first one `autorun` sets the board's autorun flag.
- **Parameters are declared with a colon and read without one**: `to blink :times` then
  `repeat times [ ... ]`. The pre-scan strips the leading `:`.
- `set` is the only assignment. Blocks are `[ ]`. Comments start with `;`. Strings are
  double-quoted. `pow` is an infix operator, a word synonym for `**`.
- Precedence, weakest to tightest: `or`/`xor`, `and`, `not`, `|`/`^`/`&`, `<<`/`>>`,
  comparisons, `+ -`, `* / %`, unary minus, `**`/`pow`. `=` is comparison; there is no `==`.

## Traps found the hard way

**`wait` and `onfor` take milliseconds.** Two firmware comments disagree: `gogo-logovm.cpp`
says 0.1 s, which is stale PIC-era text. `gogo-firmware.cpp:1646` decrements `gblWaitCounter`
by a `millis()`-derived delta, and the compiler passes the operand unscaled
(`wait 1000` emits `NUM16, 3, 232`). Milliseconds.

**Bare `ison` / `isoff` / `isthisway` / `isthatway` silently evaluate to constant false.**
They are in the compiler's `reserved` table, so they look live, and `if ison [beep]` compiles
clean. It emits `NUM8, 0` with the opcode dropped. Root cause at `tinkerlogo.py:3714`:
`create_motor_state_reporter_bytecode` strips one character then suffix-matches, so `"ison"`
becomes `"iso"`, matches no branch, and `parse_talk_to_value("")` returns `0`. The lexer's
`t_ISON` regex only ever matches `[abcd]+on?`, so the reserved-table entries are unreachable
prose. Opcodes 64-67 are reachable **only** through the `aon?` family. Do not highlight or
document the bare words.

**`broadcast` is cloud MQTT.** `setbroadcastchannel` / `broadcast` / `whenreceivebroadcast`
reach `esp_mqtt_client_publish` against `_cloudMQTT` (`gogo-network.cpp:435`). Without WiFi
they run and do nothing visible. `connectwifi`, however, gates nothing: `NWK_CONNECT_WIFI`
only calls `connectWiFi` and beeps, sets no VM state, and no command checks it.

**Sensors read through one parameterised opcode.** `readsensor <port>` (55) and
`readswitch <port>` (56) are the only path. The per-port `SENSORn` / `SWITCHn` opcodes are
retired, commented out of the 3.2.6 header, and 4.0 reclaims 74-80 for local variables and
loop opcodes. The `sensorN` / `switchN` / `inputN` / `filteredinputN` aliases all compile
down to the parameterised form, so they work.

**Deprecated spellings still compile.** `mqttpublish`/`publishmessage`,
`mqttsubscribe`/`subscribemessage`, `setmqttbroker`/`setmessagebroker` share a token.
`cw`/`ccw` are normalised to `thisway`/`thatway` by the parser. Docs teach one spelling each.

## Editor highlighting

`src/components/logoMode.js` is a CodeMirror mode, not just a word list. CodeMirror ships no
Logo mode and GoGoCode fell back to `text/python`, which is not a registered MIME and
highlighted nothing; worse, Python comments start with `#` and Logo's with `;`.

Port addressing is lexed before identifiers, mirroring the compiler, or the syntax that
carries the most meaning per character renders as anonymous variables. The word sets carry
only what the board runs: highlighting a halting word advertises a silent stop.

A copy of this file lives in GoGoCode (`src/services/logoMode.js`). The two drift; when this
one changes, that one needs the same change.

## Still unverified

`constrain` and `map` argument order was never read, so their reference Notes are empty.
Roughly 25 commands (Tasmota, `reportgrading`, some I2C forms) are handled by the VM but
their semantics were never confirmed; their Notes are empty for the same reason. An empty
Notes cell in the reference means unverified, not unimportant.
