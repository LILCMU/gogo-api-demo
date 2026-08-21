# GoGo Logo

The language the board itself runs: program shape, port addressing, and every command GoGo Board 7 firmware 3.2.6 implements, with its real call form and whether it can be used inside an expression.

Derived from the compiler's `reserved` table and PLY grammar in `gogo-logo-compiler/tinkerlogo.py` at `LOGO_VERSION 3.0`, then verified against `gogoboard-7.x/gogo-firmware` at tag `version-3.2.6`. `src/reference/logo.js` holds the same facts shaped for the in-app block renderer; the two can drift, and this file is the source of truth.

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

A port is chosen by a prefix ending in a comma, never by an argument. `a, on` turns motor A on; `on 1` is not valid syntax. Motor letters combine, so `abc, on` drives three motors in one statement.

| Prefix | Selects |
|---|---|
| `a,  b,  c,  d,` | one motor |
| `abc,` | several motors at once, any combination of a to d |
| `output1,  ...  output4,` | the same motors by number |
| `output12,` | several motors by number |
| `servo1,  ...  servo4,` | one servo |
| `relay1,  ...  relay4,` | one relay |

Every port also has read-back forms that name the port in the word itself: the tests ending in `?` and the plain value readers. All of them are reporters, so they sit inside an expression.

| Signature | Kind | Notes |
|---|---|---|
| `aon?` | reporter | motor A is running. Same shape on b, c, d and output1 to output4 |
| `aoff?` | reporter | motor A is stopped |
| `athisway?` | reporter | motor A is turning thisway |
| `athatway?` | reporter | motor A is turning thatway |
| `apower` | reporter | motor A power setting |
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
| `waituntil [ n ]` | statement | blocks until the test inside the brackets is non-zero |
| `when n [ ... ]` | statement | watcher: runs the block whenever the test becomes true |
| `whenoff` | statement | stops the when watcher |
| `ifstatechange n [ ... ]` | statement | runs the block when the test value changes |
| `dobackground [ ... ]` | statement | runs the block as a background task |
| `dobackgroundoff` | statement | stops the background task |
| `break` | statement | leaves the innermost loop |
| `stop` | statement | ends the current procedure |
| `output n\|s` | statement | ends the current procedure and returns a value |
| `wait n` | statement | pauses the program |

## Values and operators

`set NAME n|s` writes a variable and a bare name reads it. Numbers are written plainly, text in double quotes, and a bracketed list is a block rather than a value.

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
| `atan n` | reporter | |
| `min n n` | reporter | |
| `max n n` | reporter | |
| `random n` | reporter | |
| `constrain n n n` | reporter | |
| `map n n n n n` | reporter | |
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
| `a, on` | statement | runs the selected motors |
| `a, off` | statement | stops the selected motors |
| `a, onfor n` | statement | runs the selected motors, then stops them after the given time |
| `a, thisway` | statement | sets direction. cw is the same command |
| `a, thatway` | statement | the opposite direction. ccw is the same command |
| `a, rd` | statement | reverses the current direction |
| `a, setpower n` | statement | power 0-100. The board reports it back as 0-255 PWM |
| `stopall` | statement | stops every motor. Takes no prefix |
| `servo1, seth n` | statement | angle 0-180 |
| `servo1, seta n` | statement | angle 0-180 |
| `servo1, lt n` | statement | angle 0-180, one direction |
| `servo1, rt n` | statement | angle 0-180, the other direction |
| `servo1, setservopower n` | statement | |
| `relay1, relaysetpower n` | statement | power 0-100, reported back as percent. A non-zero power switches the relay on |

## Sensing

Port reads come in two spellings: a numbered word, and a reader taking the port as an argument. They compile to the same thing, so pick whichever reads better at the call site.

| Signature | Kind | Notes |
|---|---|---|
| `readsensor n` | reporter | port 1-8 |
| `sensorN` | reporter | N = 1-8. Compiles to readsensor N |
| `inputN` | reporter | N = 1-8. Compiles to readsensor N |
| `readswitch n` | reporter | port 1-8 |
| `switchN` | reporter | N = 1-8. Compiles to readswitch N |
| `readfilteredinput n` | reporter | port 1-8 |
| `filteredinputN` | reporter | N = 1-8 |
| `readfilteredvariable n` | reporter | |
| `readboardsensor n` | reporter | the sensors built into the board |
| `readacceleration n` | reporter | one accelerometer axis |
| `readloudness` | reporter | |
| `ir` | reporter | last code received from an infrared remote |
| `newir?` | reporter | true while an unread ir code is waiting |
| `serial` | reporter | |
| `newserial?` | reporter | |
| `send n\|s` | statement | transmits a number or text out the serial port |
| `handgesture` | reporter | |
| `newhandgesture?` | reporter | |
| `boardgesture` | reporter | |
| `newboardgesture?` | reporter | |
| `timer` | reporter | counts up in milliseconds |
| `resett` | statement | zeroes the timer |
| `tickcount` | reporter | |
| `cleartick` | statement | zeroes the tick count |
| `settickrate n` | statement | |
| `setinputfilter n n` | statement | |
| `setinputthreshold n n` | statement | |
| `setinputweight n n` | statement | |
| `setvariablefilter n n` | statement | |
| `setvariablethreshold n n` | statement | |
| `setvariableweight n n` | statement | |
| `resetinputminmax n` | statement | |
| `resetvariableminmax n` | statement | |

## Display and sound

| Signature | Kind | Notes |
|---|---|---|
| `show n\|s` | statement | writes a number or text to the display |
| `cls` | statement | clears the display |
| `textpos n n` | statement | |
| `textcolor n` | statement | |
| `bgcolor n` | statement | |
| `textstyle n` | statement | |
| `setpos n` | statement | |
| `getpos` | reporter | |
| `showimage s` | statement | |
| `assetadd n n n n n\|s` | statement | |
| `assetwrite n n\|s` | statement | |
| `assetread n` | reporter | |
| `beep` | statement | the board buzzer |
| `note n n` | statement | |
| `notetempo n` | statement | |
| `ledon` | statement | |
| `ledoff` | statement | |
| `play` | statement | |
| `nexttrack` | statement | |
| `prevtrack` | statement | |
| `gototrack n` | statement | |
| `erasetracks` | statement | |

## Lists, text, time

| Signature | Kind | Notes |
|---|---|---|
| `totext n\|s` | reporter | |
| `tonumber n\|s` | reporter | |
| `textlength n\|s` | reporter | |
| `textat n n` | reporter | |
| `textcontains n n` | reporter | |
| `textisempty n` | reporter | |
| `textindexof n n` | reporter | |
| `textsplit n n` | reporter | |
| `substring n n n` | reporter | |
| `charcodeat n n` | reporter | |
| `fromcharcode n` | reporter | |

| Signature | Kind | Notes |
|---|---|---|
| `list_create n ...` | reporter | zero or more items |
| `list_push n n\|s` | statement | appends to the end |
| `list_get n n` | reporter | |
| `list_set n n n\|s` | statement | |
| `list_insert n n n\|s` | statement | |
| `list_remove n n` | statement | |
| `list_len n` | reporter | |
| `list_find n n\|s` | reporter | |
| `list_rev n` | statement | reverses in place. Also usable as a reporter |
| `list_random n` | reporter | |
| `list_pop_at n n` | reporter | |
| `list_pop_first n` | reporter | |
| `list_pop_last n` | reporter | |
| `aset NAME n n` | statement | array write |
| `aget NAME n` | reporter | array read |

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
| `rtc_init` | statement | starts the real-time clock |

## Broadcast, MQTT, cloud

| Signature | Kind | Notes |
|---|---|---|
| `connectwifi s s` | statement | |
| `setbroadcastchannel n\|s` | statement | |
| `setbroadcastpassword s` | statement | |
| `broadcast s` | statement | |
| `whenreceivebroadcast s [ ... ]` | statement | runs the block when a matching broadcast arrives |
| `setmqttbroker s` | statement | also spelled setmessagebroker |
| `mqttpublish s n\|s` | statement | also spelled publishmessage |
| `mqttsubscribe s [ ... ]` | statement | also spelled subscribemessage |
| `mqttmessage` | reporter | |
| `message` | reporter | |
| `sendgmessage s n\|s` | statement | |
| `whenreceivegmessage s [ ... ]` | statement | |
| `gmessage s` | reporter | |
| `offlinerecord n s` | statement | writes one record to the board offline datalog |
| `cloudrecord n s` | statement | |
| `publiccloudrecord n s s` | statement | |
| `setcloudrecorduid s` | statement | |
| `setcloudrecordlocal n` | statement | |
| `reportgrading n n` | statement | |
| `setiftttkey s` | statement | |
| `sendiftttevent s n\|s` | statement | |
| `setlinetoken s s` | statement | |
| `sendlinemessage n\|s` | statement | |
| `sendlineimage s n\|s` | statement | |
| `sendlinesticker n n n` | statement | |

## I2C, Vernier, Tasmota, keyboard

| Signature | Kind | Notes |
|---|---|---|
| `i2cstart` | statement | |
| `i2cstop` | statement | |
| `i2cwrite n` | statement | |
| `i2crequest n` | statement | |
| `i2cread` | reporter | |
| `i2creadandstop` | reporter | |
| `i2c_read_register n n` | reporter | |
| `i2c_write_register n n n` | statement | |
| `vernier_sensor_value n` | reporter | |
| `vernier_sensor_unit n` | reporter | |
| `tasmotasetchannel n` | statement | |
| `tasmotasendcommand s n\|s n\|s` | statement | |
| `tasmotamessage s` | reporter | |
| `tasmotamessagedevice s s` | reporter | |
| `tasmotanewmessagedevice s` | reporter | |
| `tasmotawhenreceive s [ ... ]` | statement | |
| `sendkey s` | statement | the board has its own keyboard HID interface |
| `presskey s` | statement | |
| `releasekey s` | statement | |
| `sendkeydelay n` | statement | |
| `getpower n` | reporter | |
