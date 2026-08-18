import CodeMirror from 'codemirror'

//? CodeMirror ships no Logo mode, so GoGoCode's editor falls back to the Python
//? mode. That is wrong for this language in a way that matters: Logo comments
//? start with `;` and Python's start with `#`, so every comment renders as code
//? and every `#` renders as a comment.
//?
//? Keywords below are the compiler's own reserved table
//? (~/Developer/gogo-logo-compiler/tinkerlogo.py, `reserved`), split into the
//? words that shape a program and the several hundred that call into the board.
//? Regenerate from that table if the language gains words.

const STRUCTURE = new Set([
  'to', 'end', 'repeat', 'forever', 'if', 'ifelse', '_if', '_then', '_else', 'while', 'for',
  'foreach', 'waituntil', 'when', 'whenoff', 'ifstatechange', 'dobackground',
  'dobackgroundoff', 'break', 'stop', 'output', 'set', 'repcount', 'and', 'or', 'not',
])

const BUILTIN = new Set([
  'abs', 'acos', 'aget', 'aset', 'asin', 'askport', 'askrelay', 'askservo', 'assetadd',
  'assetread', 'assetwrite', 'atan', 'beep', 'bgcolor', 'boardgesture', 'broadcast',
  'broadcastvalue', 'broadcastwithvalue', 'cameraison', 'ccw', 'ceil', 'charcodeat',
  'clearkeys', 'cleartick', 'closecamera', 'closerfid', 'cloudrecord', 'cls', 'connectwifi',
  'constrain', 'cos', 'cw', 'day', 'dow', 'erasetracks', 'filteredinput1', 'filteredinput2',
  'filteredinput3', 'filteredinput4', 'filteredinput5', 'filteredinput6', 'filteredinput7',
  'filteredinput8', 'floor', 'fromcharcode', 'geta', 'getpos', 'getpower', 'gmessage',
  'gototrack', 'handgesture', 'highbyte', 'hours', 'i2c_read_register', 'i2c_write_register',
  'i2cread', 'i2creadandstop', 'i2crequest', 'i2cstart', 'i2cstop', 'i2cwrite', 'input1',
  'input2', 'input3', 'input4', 'input5', 'input6', 'input7', 'input8', 'intkey', 'ir',
  'isfindingface', 'isoff', 'ison', 'isthatway', 'isthisway', 'key', 'ledoff', 'ledon',
  'list_create', 'list_find', 'list_get', 'list_insert', 'list_len', 'list_pop_at',
  'list_pop_first', 'list_pop_last', 'list_push', 'list_random', 'list_remove', 'list_rev',
  'list_set', 'lowbyte', 'lt', 'map', 'max', 'min', 'minutes', 'month', 'mqttmessage',
  'mqttpublish', 'mqttsubscribe', 'newrecordfile', 'nexttrack', 'note', 'notetempo', 'off',
  'offlinerecord', 'on', 'onfor', 'play', 'playsound', 'pow', 'presskey', 'prevtrack',
  'publiccloudrecord', 'publishmessage', 'random', 'rd', 'readacceleration',
  'readboardsensor', 'readfilteredinput', 'readfilteredvariable', 'readloudness', 'readrfid',
  'readsensor', 'readswitch', 'relayison', 'relaysetpower', 'releasekey', 'reportgrading',
  'resetinputminmax', 'resett', 'resetvariableminmax', 'rfidbeep', 'round', 'rt', 'rtc_init',
  'say', 'seconds', 'send', 'sendgmessage', 'sendiftttevent', 'sendkey', 'sendkeydelay',
  'sendlineimage', 'sendlinemessage', 'sendlinesticker', 'sendmail', 'sendsms', 'sensor1',
  'sensor2', 'sensor3', 'sensor4', 'sensor5', 'sensor6', 'sensor7', 'sensor8', 'serial',
  'seta', 'setbroadcastchannel', 'setbroadcastpassword', 'setcloudrecordlocal',
  'setcloudrecorduid', 'seth', 'setiftttkey', 'setinputfilter', 'setinputthreshold',
  'setinputweight', 'setlinetoken', 'setmessagebroker', 'setmqttbroker', 'setpos', 'setpower',
  'setservopower', 'settickrate', 'setvariablefilter', 'setvariablethreshold',
  'setvariableweight', 'show', 'showimage', 'showlogplot', 'sin', 'sqrt', 'startfindface',
  'startultrasonic', 'stopall', 'stopfindface', 'stopsound', 'subscribemessage', 'substring',
  'switch1', 'switch2', 'switch3', 'switch4', 'switch5', 'switch6', 'switch7', 'switch8',
  'takesnapshot', 'tan', 'tasmotamessage', 'tasmotamessagedevice', 'tasmotanewmessagedevice',
  'tasmotasendcommand', 'tasmotasetchannel', 'tasmotawhenreceive', 'textat', 'textcolor',
  'textcontains', 'textindexof', 'textisempty', 'textlength', 'textpos', 'textsplit',
  'textstyle', 'thatway', 'thisway', 'tickcount', 'timer', 'tonumber', 'totext',
  'turnsteppingmotor', 'usecamera', 'userfid', 'usesms', 'vernier_sensor_unit',
  'vernier_sensor_value', 'vernier_slot', 'vernier_slot_unit', 'wait', 'whenreceivebroadcast',
  'whenreceivegmessage', 'writerfid', 'year',
])

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

