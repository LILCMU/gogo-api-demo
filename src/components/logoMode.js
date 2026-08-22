import CodeMirror from 'codemirror'

//? CodeMirror ships no Logo mode, so GoGoCode's editor falls back to the Python
//? mode. That is wrong for this language in a way that matters: Logo comments
//? start with `;` and Python's start with `#`, so every comment renders as code
//? and every `#` renders as a comment.
//?
//? Keywords below are the compiler's own vocabulary
//? (~/Developer/gogo-logo-compiler/tinkerlogo.py: the `reserved` table, plus the
//? `t_*` lexer rules that claim words ahead of it, such as `xor` and `talkto`),
//? split into the words that shape a program and the several hundred that call
//? into the board. Regenerate from those if the language gains words.
//?
//? Words the compiler accepts but GoGo Board 7 firmware does not implement are
//? left out on purpose. The 7.x VM halts on an unhandled opcode with no error,
//? so colouring `say` or `readrfid` as a builtin would advertise a command that
//? silently stops the program. The excluded set is the old Raspberry Pi
//? companion commands (opcodes 200-239), ultrasonic, `turnsteppingmotor`,
//? `vernier_slot*`, the firmware-4 words (`for`, `foreach`, `repcount`,
//? `broadcast*value`), `setpos` / `getpos`, whose VM cases sit inside a `/* */`
//? block and so halt like an unhandled opcode, and the voice and track family
//? (`play`, `nexttrack`, `prevtrack`, `gototrack`, `erasetracks`), which addresses
//? an I2C module GoGo Board 7 does not carry.
//? Derivation lives in .claude/knowledges/logo-language.md.
//?
//? `ledon`, `ledoff` and `setcloudrecordlocal` are out for the same reason from
//? the other side: they reach a `case` in the 3.2.6 VM that does nothing with
//? them. Colouring them as builtins would advertise a working command.
//?
//? The port aliases above 4 (`sensor5`-`sensor8` and the matching `switch`,
//? `input` and `filteredinput` words) are out too: the board has four input
//? ports, and the VM bounds-checks none of these, so port 5-8 reads land in
//? unrelated registers.
//?
//? The bare `ison` / `isoff` / `isthisway` / `isthatway` reserved words are left
//? out for the same reason from the other end: the VM implements opcodes 64-67,
//? but the compiler only reaches them through the port-query forms below
//? (`aon?`, `athatway?`, ...). Bare, they compile to `NUM8 0` with the opcode
//? dropped, so they are a constant false, not a read.
//?
//? `_if` / `_then` / `_else` are in STRUCTURE despite the leading underscore.
//? They are a fully implemented else-if chain, not one of the words excluded
//? above; see .claude/knowledges/logo-language.md. The word regex
//? (`[a-zA-Z_][a-zA-Z_0-9]*`) already allows a leading underscore.

const STRUCTURE = new Set([
  'to', 'end', 'repeat', 'forever', 'if', 'ifelse', '_if', '_then', '_else',
  'while', 'waituntil', 'when', 'whenoff',
  'ifstatechange', 'dobackground', 'dobackgroundoff', 'break', 'stop', 'output', 'set',
  'and', 'or', 'not', 'xor',
])

const BUILTIN = new Set([
  'abs', 'acos', 'aget', 'aset', 'asin', 'askport', 'askrelay', 'askservo', 'assetadd',
  'assetread', 'assetwrite', 'atan', 'beep', 'bgcolor', 'boardgesture', 'broadcast', 'ccw',
  'ceil', 'charcodeat', 'cleartick', 'cloudrecord', 'cls', 'connectwifi', 'constrain', 'cos',
  'cw', 'day', 'dow', 'filteredinput1', 'filteredinput2', 'filteredinput3', 'filteredinput4',
  'floor', 'fromcharcode', 'geta', 'getpower', 'gmessage', 'handgesture', 'highbyte', 'hours',
  'i2c_read_register', 'i2c_write_register', 'i2cread', 'i2creadandstop', 'i2crequest',
  'i2cstart', 'i2cstop', 'i2cwrite', 'input1', 'input2', 'input3', 'input4', 'ir', 'list_create',
  'list_find', 'list_get', 'list_insert', 'list_len', 'list_pop_at', 'list_pop_first',
  'list_pop_last', 'list_push', 'list_random', 'list_remove', 'list_rev', 'list_set', 'lowbyte',
  'lt', 'map', 'max', 'message', 'min', 'minutes', 'month', 'mqttmessage', 'mqttpublish',
  'mqttsubscribe', 'note', 'notetempo', 'off', 'offlinerecord', 'on', 'onfor', 'pow', 'presskey',
  'publiccloudrecord', 'publishmessage', 'random', 'rd', 'readacceleration', 'readboardsensor',
  'readfilteredinput', 'readfilteredvariable', 'readloudness', 'readsensor', 'readswitch',
  'relayison', 'relaysetpower', 'releasekey', 'reportgrading', 'resetinputminmax', 'resett',
  'resetvariableminmax', 'round', 'rt', 'rtc_init', 'seconds', 'send', 'sendgmessage',
  'sendiftttevent', 'sendkey', 'sendkeydelay', 'sendlineimage', 'sendlinemessage',
  'sendlinesticker', 'sensor1', 'sensor2', 'sensor3', 'sensor4', 'serial', 'seta',
  'setbroadcastchannel', 'setbroadcastpassword', 'setcloudrecorduid', 'seth', 'setiftttkey',
  'setinputfilter', 'setinputthreshold', 'setinputweight', 'setlinetoken', 'setmessagebroker',
  'setmqttbroker', 'setpower', 'setservopower', 'settickrate', 'setvariablefilter',
  'setvariablethreshold', 'setvariableweight', 'show', 'showimage', 'sin', 'sqrt', 'stopall',
  'subscribemessage', 'substring', 'switch1', 'switch2', 'switch3', 'switch4', 'talkto', 'tan',
  'tasmotamessage', 'tasmotamessagedevice', 'tasmotanewmessagedevice', 'tasmotasendcommand',
  'tasmotasetchannel', 'tasmotawhenreceive', 'textat', 'textcolor', 'textcontains', 'textindexof',
  'textisempty', 'textlength', 'textpos', 'textsplit', 'textstyle', 'thatway', 'thisway',
  'tickcount', 'timer', 'tonumber', 'totext', 'vernier_sensor_unit', 'vernier_sensor_value',
  'wait', 'whenreceivebroadcast', 'whenreceivegmessage', 'year',
])

//? Port addressing is lexed before identifiers, exactly as the compiler does it.
//? `a,` / `servo1,` / `relay12,` select a target; `aon?`, `apower`, `servo1angle`
//? read one back. None of these are in `reserved`, so a plain word match renders
//? the syntax that matters most as anonymous variables.
const PORT_TARGET = /^(?:output[1-4]+|servo[1-4]+|relay[1-4]+|[abcd]+),/
const PORT_QUERY = /^(?:(?:output[1-4]+|[abcd]+)(?:on\?|off\?|thisway\?|thatway\?|cw\?|ccw\?|power)|relay[1-4]+on\?|servo[1-4]angle)/
const EVENT_QUERY = /^new(?:ir|serial|handgesture|boardgesture)\?/

//? mirrors the compiler's lexer: `;.*` comments, `".*?"` strings,
//? `\d+\.\d+` floats and `[a-zA-Z_][a-zA-Z_0-9]*` identifiers
CodeMirror.defineMode('logo', function () {
  return {
    token: function (stream) {
      if (stream.eatSpace()) return null

      if (stream.peek() === ';') {
        stream.skipToEnd()
        return 'comment'
      }

      if (stream.match(/^"[^"]*"?/)) return 'string'
      if (stream.match(/^\d+\.\d+|^\d+/)) return 'number'
      if (stream.match(/^:[a-zA-Z_][a-zA-Z_0-9]*/)) return 'def'
      if (stream.match(PORT_TARGET)) return 'tag'
      if (stream.match(PORT_QUERY) || stream.match(EVENT_QUERY)) return 'builtin'
      if (stream.match(/^(<<|>>|\*\*|>=|<=|[-+*/%&|^<>=])/)) return 'operator'
      if (stream.match(/^[[\]]/)) return 'bracket'

      const word = stream.match(/^[a-zA-Z_][a-zA-Z_0-9]*/)
      if (word) {
        const name = word[0].toLowerCase()
        if (STRUCTURE.has(name)) return 'keyword'
        if (BUILTIN.has(name)) return 'builtin'
        return 'variable'
      }

      stream.next()
      return null
    },
  }
})

CodeMirror.defineMIME('text/x-logo', 'logo')

