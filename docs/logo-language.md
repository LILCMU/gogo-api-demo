# GoGo Logo

The language the board itself runs: program shape, port addressing, and every command GoGo Board 7 firmware 3.2.6 implements, with its real call form and whether it can be used inside an expression.

Derived from the compiler's `reserved` table and PLY grammar in `gogo-logo-compiler/tinkerlogo.py` at `LOGO_VERSION 3.0`, then verified against `gogoboard-7.x/gogo-firmware` at tag `version-3.2.6`. `src/reference/logo.js` holds the same facts shaped for the in-app block renderer; the two can drift, and this file is the source of truth.

A word the 3.2.6 VM does not implement is left out: it falls through to a terminal `default:` that halts the program with no error. A word whose `case` label exists with an empty body is left out for the same reason from the other side, since it dispatches and does nothing: that is `ledon` and `ledoff`. `rtc_init` is the one empty case kept here, because it never promised a visible action; its Notes cell says so. Commands aimed at hardware GoGo Board 7 does not carry, such as the voice and track family, are out on the same principle.

Signatures are written in this notation:

| Token | Means |
|---|---|
| `n` | a number, literal or expression |
| `s` | a string in double quotes |
| `n\|s` | either, the command accepts both |
| `[ ... ]` | a block of statements |
| `NAME` | a bare name, not quoted |
| `output1,` | a port prefix, selects the target |

The **Kind** column says where a word may appear. A reporter yields a value and can sit inside an expression; a statement cannot.

## Program shape

A program is a list of procedures. Each one opens with `to` and a name, and closes with `end`. The first procedure in the file is the entry point: the compiler ends it with `CODE_END` and ends every later procedure with `STOP`.

**Name the first procedure `autorun` to run on power-up.** Calling the entry procedure `autorun` sets the board autorun flag, so the program starts on its own after a power cycle. Any other name leaves it waiting to be started.

| Form | Meaning |
|---|---|
| `to NAME :p1 :p2` | procedure head. Parameters are declared with a leading colon |
| `end` | closes a procedure |
| `; text` | comment, runs to end of line |
| `"text"` | string literal |
| `[ ... ]` | block, passed to repeat, if, while and the event watchers |
| `set NAME n\|s` | assignment. The only one the language has |

Parameters are declared with a colon and read without one. `to blink :times` declares `times`; the body writes bare `times`. The pre-scan strips a leading `"` or `:` from the declared name.

**`set` is the only assignment.** There is no `make` and no `=` assignment. `set counter 0` writes, bare `counter` reads, and `=` is the equality comparison.

## Addressing ports

A port is chosen by a prefix ending in a comma, never by an argument. `output1, on` turns motor 1 on; `on 1` is not valid syntax. Port numbers combine, so `output123, on` drives three motors in one statement. The board prints these numbers next to the output ports, so they are the form you can read off the hardware. The letter form `a,` to `d,` is the older equivalent spelling and combines the same way; older programs use it.

| Prefix | Selects |
|---|---|
| `output1,  ...  output4,` | one motor |
| `output12,` | several motors at once, any combination of output1 to output4 |
| `a,  b,  c,  d,` | the same motors in the older letter spelling |
| `abc,` | several motors by letter |
| `servo1,  ...  servo4,` | one servo |
| `relay1,  ...  relay4,` | one relay |

Every port also has read-back forms that name the port in the word itself: the tests ending in `?` and the plain value readers. All of them are reporters, so they sit inside an expression.

| Signature | Kind | Notes |
|---|---|---|
| `output1on?` | reporter | motor 1 is running. Same shape on output2 to output4, and in the letter spelling as aon? |
| `output1off?` | reporter | motor 1 is stopped |
| `output1thisway?` | reporter | motor 1 is turning thisway |
| `output1thatway?` | reporter | motor 1 is turning thatway |
| `output1power` | reporter | motor 1 power setting. This one takes a single port only, unlike the tests above |
| `relay1on?` | reporter | relay 1 is on. Same on relay2 to relay4 |
| `servo1angle` | reporter | servo 1 angle. Same on servo2 to servo4 |

The ask reporters do the same reads with the port as an ordinary numeric argument instead of a prefix, which is what you want when the port number is computed.

| Signature | Kind | Notes |
|---|---|---|
| `askport n` | reporter | reads a motor port |
| `askservo n` | reporter | reads a servo port |
| `askrelay n` | reporter | reads a relay port |
| `relayison n` | reporter | relay n is on |
| `geta n` | reporter | angle of servo n |
| `talkto n` | statement | addresses a remote node |

## Control flow

Every loop and test takes its body as a bracketed block. There is no block-less form.

| Signature | Kind | Notes |
|---|---|---|
| `repeat n [ ... ]` | statement | runs the block n times |
| `forever [ ... ]` | statement | runs the block until the program stops |
| `while n [ ... ]` | statement | runs the block while the test is non-zero |
| `if n [ ... ]` | statement | runs the block once when the test is non-zero |
| `ifelse n [ ... ] [ ... ]` | statement | first block when true, second when false |
| `_if n [ ... ]` | statement | starts an else-if chain; must be the first clause |
| `_then n [ ... ]` | statement | else-if clause, zero or more, each with its own condition |
| `_else [ ... ]` | statement | optional fallback when every condition above was false |
| `waituntil [ n ]` | statement | blocks until the test inside the brackets is non-zero |
| `when n [ ... ]` | statement | watcher: runs the block whenever the test becomes true |
| `whenoff` | statement | stops the when watcher |
| `ifstatechange n [ ... ]` | statement | runs the block when the test value changes |
| `dobackground [ ... ]` | statement | runs the block as a background task |
| `dobackgroundoff` | statement | stops the background task |
| `break` | statement | leaves the innermost loop |
| `stop` | statement | ends the current procedure |
| `output n\|s` | statement | ends the current procedure and returns a value |
| `wait n` | statement | pauses the program for n milliseconds |

**`_then` means "else if", not "then".** `_then` carries its own condition, so the chain reads as "else if", not "then". A chain always starts with `_if`, takes zero or more `_then` clauses each with its own test, and an optional `_else` at the end. GoGoCode's block editor is what normally emits it.

## Values and operators

`set NAME n|s` writes a variable and a bare name reads it. Numbers are written plainly, text in double quotes, and a bracketed list is a block rather than a value.

**The left operand decides what `+` means.** With a string on the left, `+` joins and `-` removes the first match. With a number on the left it is arithmetic, and a string on the right is parsed as a number, so an unparsable one counts as 0. Order therefore changes the answer.

| Expression | Result | Why |
|---|---|---|
| `"a" + "b"` | `"ab"` | both strings, joined |
| `"n = " + 5` | `"n = 5.00"` | the number is formatted with two decimals first |
| `5 + "3"` | `8` | string on the right is read as a number |
| `5 + "abc"` | `5` | unparsable, so it counts as 0 |
| `"hello world" - "world"` | `"hello "` | removes the first match |
| `"cat" = "cat"` | `true` | string equality compares the text |
| `"apple" > "fig"` | `true` | but the ordering tests compare LENGTH, not alphabet |

Precedence, weakest binding at level 1 and tightest at level 10.

| Level | Operators |
|---|---|
| 1 | `or   xor` |
| 2 | `and` |
| 3 | `not` |
| 4 | `\|   ^   &` |
| 5 | `<<   >>` |
| 6 | `<   <=   >   >=   =` |
| 7 | `+   -` |
| 8 | `*   /   %` |
| 9 | `unary minus` |
| 10 | `**   pow` |

**`pow` is infix, and `=` is comparison.** `pow` is a word synonym of `**`, so it is written `2 pow 3` and not as a call. And there is no `==`: a single `=` compares.

| Signature | Kind | Notes |
|---|---|---|
| `abs n` | reporter | |
| `sqrt n` | reporter | |
| `round n` | reporter | |
| `ceil n` | reporter | |
| `floor n` | reporter | |
| `sin n` | reporter | |
| `cos n` | reporter | |
| `tan n` | reporter | |
| `asin n` | reporter | |
| `acos n` | reporter | |
| `atan n` | reporter | single-argument arctangent, in radians. Wrong on firmware 3.2.6, which still reads sub-op 33 as two-argument atan2 and pops an extra operand. Correct from firmware 4.0 |
| `min n n` | reporter | |
| `max n n` | reporter | |
| `random n` | reporter | 0 to n-1, never n. Reseeds from the millisecond timer on every call, so calls within the same millisecond return the same value |
| `constrain n n n` | reporter | value low high, clamps in float math, no guard when low is above high |
| `map n n n n n` | reporter | value fromLow fromHigh toLow toHigh, integer math, extrapolates past the range instead of clamping. Returns -1 when fromLow equals fromHigh |
| `highbyte n` | reporter | |
| `lowbyte n` | reporter | |

| Constant | Kind | Value |
|---|---|---|
| `PI` | reporter | `3.14159265` |
| `E` | reporter | `2.71828183` |
| `PHI` | reporter | `1.61803399` |
| `LN2` | reporter | `0.69314718` |
| `LN10` | reporter | `2.30258509` |
| `SQRT2` | reporter | `1.41421356` |
| `SQRT1_2` | reporter | `0.70710678` |
| `INFINITY` | reporter | `floating-point infinity` |

## Motors, servos, relays

Each of these needs its port prefix. The signature below shows one concrete prefix; any prefix from the addressing table works in its place.

| Signature | Kind | Notes |
|---|---|---|
| `output1, on` | statement | runs the selected motors |
| `output1, off` | statement | stops the selected motors |
| `output1, onfor n` | statement | runs the selected motors, then stops them after n milliseconds |
| `output1, thisway` | statement | sets direction. cw is the same command |
| `output1, thatway` | statement | the opposite direction. ccw is the same command |
| `output1, rd` | statement | reverses the current direction |
| `output1, setpower n` | statement | power 0-100. The board reports it back as 0-255 PWM |
| `stopall` | statement | stops every motor. Takes no prefix |
| `servo1, seth n` | statement | angle 0-180 |
| `servo1, seta n` | statement | angle 0-180 |
| `servo1, lt n` | statement | angle 0-180, one direction |
| `servo1, rt n` | statement | angle 0-180, the other direction |
| `relay1, relaysetpower n` | statement | power 0-100, reported back as percent. A non-zero power switches the relay on |
| `relay1, setservopower n` | statement | deprecated alias of relaysetpower. It sets relay power despite the name, so it takes a relay prefix |

## Sensing

Port reads come in two spellings: a numbered word, and a reader taking the port as an argument. They compile to the same thing, so pick whichever reads better at the call site.

| Signature | Kind | Notes |
|---|---|---|
| `readsensor n` | reporter | port 1-4 |
| `sensorN` | reporter | N is 1 to 4. Compiles to readsensor N |
| `inputN` | reporter | N is 1 to 4. Compiles to readsensor N |
| `readswitch n` | reporter | port 1-4 |
| `switchN` | reporter | N is 1 to 4. Compiles to readswitch N |
| `readfilteredinput n` | reporter | port 1-4, the port's last filtered sample |
| `filteredinputN` | reporter | N is 1 to 4 |
| `readfilteredvariable n` | reporter | variable name, returns the filter's last output, 0 if no filter is set |
| `readboardsensor n` | reporter | [the sensors built into the board, see the index table](#board-sensor-index) |
| `readacceleration n` | reporter | one accelerometer axis |
| `readloudness` | reporter | on-board microphone level, the same value the type-0 report carries |
| `ir` | reporter | last code received from an infrared remote |
| `newir?` | reporter | true while an unread ir code is waiting |
| `send n\|s` | statement | transmits a number or text out the serial port |
| `boardgesture` | reporter | [the current gesture code, see the table. Reading it does not clear the new-gesture flag](#gesture-codes) |
| `newboardgesture?` | reporter | 1 when a new gesture has been detected since the last read, 0 otherwise. boardgesture clears it |
| `timer` | reporter | counts up in milliseconds |
| `resett` | statement | zeroes the timer |
| `tickcount` | reporter | ticks elapsed since the last settickrate or cleartick, counted only while the program runs |
| `cleartick` | statement | zeroes the tick count and the partial tick, keeps the period |
| `settickrate n` | statement | tick period in milliseconds, not a rate, so larger is slower. Default 10, and it also zeroes the count |
| `setinputfilter n n` | statement | port 1-4 then type: 0 average, 1 rate, 2 max, 3 min, 4 amplify. One filter per port, later calls are ignored |
| `setinputthreshold n n` | statement | port 1-4 then raw threshold clamped to the sensor range. Rate filter only, and setting it disables the automatic baseline |
| `setinputweight n n` | statement | port 1-4 then smoothing weight for the average and amplify filters, out = (prev*w + in)/(w+1), 0 is no smoothing |
| `setvariablefilter n n` | statement | variable name then type: 0 average, 1 rate, 2 max, 3 min, 4 amplify. One filter per variable, later calls are ignored |
| `setvariablethreshold n n` | statement | variable name then rate threshold, unclamped, and setting it disables the automatic baseline |
| `setvariableweight n n` | statement | variable name then smoothing weight for the average and amplify filters, out = (prev*w + in)/(w+1), 0 is no smoothing |
| `resetinputminmax n` | statement | port 1-4, reseeds the min or max filter from the port's current reading |
| `resetvariableminmax n` | statement | variable name, reseeds the min or max filter from the variable's current value |

<a id="gesture-codes"></a>

`boardgesture` and `readboardsensor 4` both report the same gesture code:

| Value | Gesture | Notes |
|---|---|---|
| `0` | none | no gesture detected |
| `1` | tilt up |  |
| `2` | tilt down |  |
| `3` | tilt left |  |
| `4` | tilt right |  |
| `5` | face up |  |
| `6` | face down |  |
| `7` | free fall |  |
| `8` | shake |  |
| `9` | hit 3g |  |
| `10` | hit 6g |  |
| `11` | hit 8g |  |

<a id="board-sensor-index"></a>

The argument selects which built-in sensor to read. An index outside this list leaves the stack untouched.

| Index | Reads | Notes |
|---|---|---|
| `0` | proximity | mapped to 0-255 |
| `1` | illuminance | lux, 16-bit |
| `2` | temperature |  |
| `3` | humidity |  |
| `4` | orientation | same value boardgesture reports |
| `5` | acceleration, X axis | m/s squared |
| `6` | acceleration, Y axis | m/s squared |
| `7` | acceleration, Z axis | m/s squared |
| `8` | combined acceleration | m/s squared, magnitude of the three axes |
| `9` | loudness |  |

## Display and sound

| Signature | Kind | Notes |
|---|---|---|
| `show n\|s` | statement | writes a number or text to the display |
| `cls` | statement | clears the display |
| `textpos n n` | statement | x then y in pixels, not column and row. Both wrap above 255. One-way: once set, `show` draws from the cursor instead of centring, and only stopping the program undoes it |
| `textcolor n` | statement | CHSV hue 0-255 at full saturation, the same scale as bgcolor |
| `bgcolor n` | statement | CHSV hue 0-255 at full saturation, fills the screen at once |
| `textstyle n` | statement | font, 0 small 1 large 2 bold. Bold is the same 6pt size as small, only heavier — 1 is the only larger one, and there is no large-bold. Another value loads no font but still counts as a choice, which stops `show` picking large on its own |
| `showimage s` | statement | downloads and draws a URL, blocks until the image lands, only paints on the main page |
| `beep` | statement | the board buzzer |
| `note n n` | statement | pitch then beats, not milliseconds. One beat is 500 ms at the default tempo, so note 60 200 sounds for 100 seconds. Pitch is 1-based chromatic from C with 12 per octave, 0 is silence |
| `notetempo n` | statement | beats per minute, default 120, sets how long one beat of note lasts |

**Set an attribute and it can vanish within a tick.** `show`, `showimage` and the asset commands claim the display; `bgcolor`, `textcolor`, `textpos`, `textstyle` and `cls` do not. With the display unclaimed the board keeps repainting the main page on its own schedule, and that repaint re-rolls a random background — so `bgcolor 160 wait 1000 cls` visibly loses its blue. Claim the display with a `show` first and everything after it sticks.

**The test build changes what these commands draw.** The firmware branch `feature/expose-logovm-text-commands-hid` (build `v4.0.0-hidtext`) adds nothing to the language, but the same program renders differently. All of these are fixes; `cls` is the one to watch, because a program that sets a background and then calls `cls` expecting white now keeps its own colour.

| Command | Released firmware | Test build |
|---|---|---|
| `cls` | always fills white | fills the background colour you set, white if none |
| `textpos` | measured from the screen corner, so `textpos 0 0` jams text against the bezel | measured from the text area's corner, 6 px in on each side, so `textpos 0 0` lands where wrapped text starts |
| `bgcolor`, `textcolor`, `textpos`, `textstyle` | the main page can repaint over them, per the paragraph above | claim the display, so they take effect and hold |
| `textcolor` | pairs the text with a default background, which can show as a coloured band behind it | pairs it with the background actually in use |
| `show` | centres the string including trailing spaces, so a padded value sits left of centre | trims trailing whitespace before centring |
| `show` after `textstyle` | a smaller font leaves fragments of the larger text behind | clears a band sized for the largest style first |

## Building a screen with assets

An asset is a fixed field on the screen that you update by id instead of redrawing text. `show` paints wherever the cursor happens to be, so a changing value leaves the old one behind unless you clear first. An asset owns its slot: writing to it repaints only that slot.

Assets sit on a grid of character cells, not pixels. A cell is 8 by 16 pixels and the screen is 160 by 128, which gives **20 columns and 8 rows**. Coordinates count from 0 at the top left.

| Signature | Kind | Notes |
|---|---|---|
| `assetadd n n n n n\|s` | statement | grid x, grid y, length in cells, alignment, then the starting value |
| `assetwrite n n\|s` | statement | asset id then the new value |
| `assetread n` | reporter | the current value, empty string if that id was never added |

| Alignment | Meaning |
|---|---|
| `0` | left |
| `1` | right |
| `2` | centre |

```
to start
  ; two labels and two fields beside them
  assetadd 0 0 6 0 "temp"
  assetadd 6 0 6 1 0
  assetadd 0 1 6 0 "light"
  assetadd 6 1 6 1 0
  forever [
    assetwrite 1 readboardsensor 2
    assetwrite 3 readsensor 1
    wait 500
  ]
end
```

The four `assetadd` calls take ids 0 to 3 in order, so the two value fields are 1 and 3.

**Nothing tells you an asset id.** `assetadd` returns nothing. Ids are handed out in creation order starting at 0, so you count your own calls to know what to write to later. Writing to an id that was never added is silently ignored, which is what a miscount looks like.

**What else to expect.** The first asset command takes over the screen and clears it. A number value is formatted with two decimals, so 5 shows as 5.00; pass `totext` output if that matters. Writing the value an asset already holds does nothing, so the screen does not flicker. The table lives in RAM, so a reset clears every asset.

## Lists, text, time

| Signature | Kind | Notes |
|---|---|---|
| `totext n\|s` | reporter | |
| `tonumber n\|s` | reporter | |
| `textlength n\|s` | reporter | |
| `textat n n` | reporter | character position, 0-based |
| `textcontains n n` | reporter | |
| `textisempty n` | reporter | |
| `textindexof n n` | reporter | 0-based position of the first match, -1 when the needle is absent |
| `textsplit n n` | reporter | returns a list id, usable with list_get and list_len. Every character of the delimiter splits, and empty parts are dropped |
| `substring n n n` | reporter | text start length, start is 0-based and the third argument is a character count, not an end index |
| `charcodeat n n` | reporter | character code at a 0-based position, 0 when the position is out of range |
| `fromcharcode n` | reporter | |

| Signature | Kind | Notes |
|---|---|---|
| `list_create n ...` | reporter | zero or more items |
| `list_push n n\|s` | statement | appends to the end |
| `list_get n n` | reporter | 0-based element index, 0 when out of range |
| `list_set n n n\|s` | statement | |
| `list_insert n n n\|s` | statement | |
| `list_remove n n` | statement | |
| `list_len n` | reporter | item count |
| `list_find n n\|s` | reporter | 0-based index of the first match, -1 when absent. Types must match, so a number never matches text |
| `list_rev n` | statement | reverses in place. Also usable as a reporter |
| `list_random n` | reporter | returns a random element without removing it, 0 when the list is empty |
| `list_pop_at n n` | reporter | 0-based, returns the element and removes it, 0 when out of range and the list is left unchanged |
| `list_pop_first n` | reporter | returns the first element and removes it, 0 when the list is empty |
| `list_pop_last n` | reporter | returns the last element and removes it, 0 when the list is empty |

**The board clock starts unset.** A board whose clock was never synced reports times counted from zero, not a real date. This is the same offset that shows up in [offline datalog records](offline-datalog.md).

| Signature | Kind | Notes |
|---|---|---|
| `year` | reporter | |
| `month` | reporter | |
| `day` | reporter | |
| `dow` | reporter | day of week |
| `hours` | reporter | |
| `minutes` | reporter | |
| `seconds` | reporter | |
| `rtc_init` | statement | does nothing on GoGo Board 7. The clock syncs over NTP, so there is no clock to start. Kept because older programs call it |

## Broadcast, MQTT, cloud

| Signature | Kind | Notes |
|---|---|---|
| `connectwifi s s` | statement | ssid then password, beeps success, failure, or blocked by remote access |
| `setbroadcastchannel n` | statement | channel number, the string form does not compile |
| `setbroadcastpassword s` | statement | payload sent with every broadcast, receivers must match it |
| `broadcast s` | statement | no WiFi guard, so a broadcast sent offline is silently lost |
| `whenreceivebroadcast s [ ... ]` | statement | runs the block when a matching broadcast arrives |
| `setmqttbroker s` | statement | broker host without a scheme, the firmware prepends mqtt:// and reconnects. Also spelled setmessagebroker |
| `mqttpublish s n\|s` | statement | topic then payload, published with no WiFi guard so it is silently lost when offline. Also spelled publishmessage |
| `mqttsubscribe s [ ... ]` | statement | topic, runs the block on each new payload. Also spelled subscribemessage |
| `mqttmessage` | reporter | last payload from mqttsubscribe as a string, empty until one arrives |
| `message` | reporter | exact alias of mqttmessage. Any identifier starting with message is split by the lexer |
| `sendgmessage s n\|s` | statement | key then value, sent to the host over USB rather than the network |
| `whenreceivegmessage s [ ... ]` | statement | runs the block when the host sends that key over USB |
| `gmessage s` | reporter | value the host last sent for that key, the number 0 if the key is unknown |
| `offlinerecord n s` | statement | value then field. Writes one record to the board offline datalog, rate limited to one record per field per second |
| `cloudrecord n s` | statement | value then field, does nothing until setcloudrecorduid is set, one record per field per second |
| `publiccloudrecord n s s` | statement | value, field, then channel, one record per field per second |
| `setcloudrecorduid s` | statement | cloud account id, required before cloudrecord publishes anything |
| `reportgrading n n` | statement | rule index then status, writes one bit of the grading register |
| `setiftttkey s` | statement | webhook key, required before sendiftttevent does anything |
| `sendiftttevent s n\|s` | statement | event name then message, silently returns without WiFi or a key |
| `setlinetoken s s` | statement | token then chat id |
| `sendlinemessage n\|s` | statement | silently returns without WiFi or a token |
| `sendlineimage s n\|s` | statement | url then message. A numeric message hits an overload that swaps the two, so pass the message as a string |
| `sendlinesticker n n n` | statement | package id, sticker id, then message |

## I2C, Vernier, Tasmota, keyboard

**An I2C transfer is a sequence, not one call.** `i2cstart`, then `i2cwrite` with the address, then one `i2cwrite` per data byte, then `i2crequest n` and n calls to `i2cread` if you are reading, then `i2cstop`. Addresses are 7-bit throughout, so an address quoted in 8-bit form has to be halved.

| Signature | Kind | Notes |
|---|---|---|
| `i2cstart` | statement | arms the sequence, the next i2cwrite supplies the 7-bit address |
| `i2cstop` | statement | ends the transfer, does nothing unless a byte was written or read |
| `i2cwrite n` | statement | first call after i2cstart is the 7-bit address, later calls are data bytes |
| `i2crequest n` | statement | number of bytes to request from the current address, not an address |
| `i2cread` | reporter | returns one buffered byte, 0 if no i2crequest is outstanding |
| `i2creadandstop` | reporter | i2cread followed by i2cstop |
| `i2c_read_register n n` | reporter | 7-bit address then register, reads one byte and blocks forever if the device never answers |
| `i2c_write_register n n n` | statement | 7-bit address, register, value |
| `vernier_sensor_value n` | reporter | 0-based field index on the attached Vernier interface, an out-of-range field reads as 0 |
| `vernier_sensor_unit n` | reporter | 0-based field index, returns the unit string, returns the number 0 when the field does not exist |
| `tasmotasetchannel n` | statement | channel number, the string form does not compile |
| `tasmotasendcommand s n\|s n\|s` | statement | device, command, then payload. An empty device name or the core device goes over serial, not MQTT |
| `tasmotamessage s` | reporter | last value for that key from the subscribed device |
| `tasmotamessagedevice s s` | reporter | device then key |
| `tasmotanewmessagedevice s` | reporter | true when that device has sent something new |
| `tasmotawhenreceive s [ ... ]` | statement | subscribes to a device and runs the block on each new message |
| `sendkey s` | statement | the board has its own keyboard HID interface |
| `presskey s` | statement | |
| `releasekey s` | statement | |
| `sendkeydelay n` | statement | |
| `getpower n` | reporter | the port must be a literal. An expression is scanned as text, so getpower 1 + 1 silently reads motor 1 |

## Coming in firmware 4

The current stable firmware is **3.2.6**, and everything above runs on it. The commands in this section do not. They compile, they download, and the board stops at the first one. They are listed here because the firmware work exists and they will arrive with 4.0.

| Signature | Kind | Notes |
|---|---|---|
| `for NAME [ ... ]` | statement | counted loop. Use repeat until this ships |
| `foreach NAME [ ... ]` | statement | walks a list, binding each element to NAME |
| `repcount` | reporter | the current iteration inside for or repeat |
| `vernier_slot n n` | reporter | slot-addressed Vernier read, alongside the existing vernier_sensor_value |
| `vernier_slot_unit n n` | reporter | the unit string for that slot |
| `broadcastwithvalue s n\|s` | statement | broadcasts a message carrying a value |
| `broadcastvalue` | reporter | the value carried by the message that just arrived |

Firmware 4 also gives procedures their own local scope. Today a parameter and any `set` inside a procedure are global, so two procedures using the same name share it. And `atan` becomes the single-argument form the compiler already emits; on 3.2.6 it is read as a two-argument atan2 and returns a wrong number.
