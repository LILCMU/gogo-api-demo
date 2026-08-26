//? Structured content behind the in-app GoGo Logo reference.
//?
//? Derived from the compiler's `reserved` table and PLY grammar
//? (~/Developer/gogo-logo-compiler/tinkerlogo.py), then filtered against
//? gogo-firmware `version-3.2.6`. A command the 7.x VM does not implement falls
//? through to a terminal `default:` that halts the program with no error, so
//? only what that firmware handles is listed here. A `case` label with an empty
//? body is the same defect from the other side: `ledon` / `ledoff` dispatch and
//? do nothing, so they are left out too. `rtc_init` is the one empty case that
//? stays, because it never promised a visible action; its Notes cell says so.
//? Commands aimed at hardware GoGo Board 7 does not carry, such as the voice and
//? track family, are out on the same principle.
//?
//? Section ids are a contract: GuideLink `to="/reference/logo#..."` points at
//? them. Renaming one silently breaks a deep link.
//?
//? Notes carry verified semantics only. An empty cell is correct where the VM
//? handler was not read; invented prose is not.

export default {
  title: 'GoGo Logo',
  lede:
    'The language the board itself runs. Program shape, port addressing, and every command ' +
    'GoGo Board 7 firmware 3.2.6 implements, with its real call form and whether it can be ' +
    'used inside an expression.',
  sections: [
    {
      id: 'shape',
      title: 'Program shape',
      blocks: [
        {
          type: 'prose',
          runs: [
            'A program is a list of procedures. Each one opens with ',
            { code: 'to' },
            ' and a name, and closes with ',
            { code: 'end' },
            '. The first procedure in the file is the entry point: the compiler ends it with ',
            { code: 'CODE_END' },
            ' and ends every later procedure with ',
            { code: 'STOP' },
            '.',
          ],
        },
        {
          type: 'note',
          tone: 'info',
          title: 'Name the first procedure autorun to run on power-up',
          runs: [
            'Calling the entry procedure ',
            { code: 'autorun' },
            ' sets the board autorun flag, so the program starts on its own after a power cycle. Any other name leaves it waiting to be started.',
          ],
        },
        {
          type: 'table',
          head: ['Form', 'Meaning'],
          mono: [0],
          rows: [
            ['to NAME :p1 :p2', 'procedure head. Parameters are declared with a leading colon'],
            ['end', 'closes a procedure'],
            ['; text', 'comment, runs to end of line'],
            ['"text"', 'string literal'],
            ['[ ... ]', 'block, passed to repeat, if, while and the event watchers'],
            ['set NAME n|s', 'assignment. The only one the language has'],
          ],
        },
        {
          type: 'prose',
          runs: [
            'Parameters are declared with a colon and read without one. ',
            { code: 'to blink :times' },
            ' declares ',
            { code: 'times' },
            '; the body writes bare ',
            { code: 'times' },
            '. The pre-scan strips a leading ',
            { code: '"' },
            ' or ',
            { code: ':' },
            ' from the declared name.',
          ],
        },
        {
          type: 'note',
          tone: 'gotcha',
          title: 'set is the only assignment',
          runs: [
            'There is no ',
            { code: 'make' },
            ' and no ',
            { code: '=' },
            ' assignment. ',
            { code: 'set counter 0' },
            ' writes, bare ',
            { code: 'counter' },
            ' reads, and ',
            { code: '=' },
            ' is the equality comparison.',
          ],
        },
      ],
    },

    {
      id: 'ports',
      title: 'Addressing ports',
      blocks: [
        {
          type: 'prose',
          runs: [
            'A port is chosen by a prefix ending in a comma, never by an argument. ',
            { code: 'output1, on' },
            ' turns motor 1 on; ',
            { code: 'on 1' },
            ' is not valid syntax. Port numbers combine, so ',
            { code: 'output123, on' },
            ' drives three motors in one statement. The board prints these numbers next to the output ports, so they are the form you can read off the hardware. The letter form ',
            { code: 'a,' },
            ' to ',
            { code: 'd,' },
            ' is the older equivalent spelling and combines the same way; older programs use it.',
          ],
        },
        {
          type: 'table',
          head: ['Prefix', 'Selects'],
          mono: [0],
          rows: [
            ['output1,  ...  output4,', 'one motor'],
            ['output12,', 'several motors at once, any combination of output1 to output4'],
            ['a,  b,  c,  d,', 'the same motors in the older letter spelling'],
            ['abc,', 'several motors by letter'],
            ['servo1,  ...  servo4,', 'one servo'],
            ['relay1,  ...  relay4,', 'one relay'],
          ],
        },
        {
          type: 'prose',
          runs: [
            'Every port also has read-back forms that name the port in the word itself: the tests ending in ',
            { code: '?' },
            ' and the plain value readers. All of them are reporters, so they sit inside an expression.',
          ],
        },
        {
          type: 'table',
          head: ['Signature', 'Kind', 'Notes'],
          mono: [0],
          rows: [
            ['output1on?', 'reporter', 'motor 1 is running. Same shape on output2 to output4, and in the letter spelling as aon?'],
            ['output1off?', 'reporter', 'motor 1 is stopped'],
            ['output1thisway?', 'reporter', 'motor 1 is turning thisway'],
            ['output1thatway?', 'reporter', 'motor 1 is turning thatway'],
            ['output1power', 'reporter', 'motor 1 power setting. This one takes a single port only, unlike the tests above'],
            ['relay1on?', 'reporter', 'relay 1 is on. Same on relay2 to relay4'],
            ['servo1angle', 'reporter', 'servo 1 angle. Same on servo2 to servo4'],
          ],
        },
        {
          type: 'prose',
          runs: [
            'The ask reporters do the same reads with the port as an ordinary numeric argument instead of a prefix, which is what you want when the port number is computed.',
          ],
        },
        {
          type: 'table',
          head: ['Signature', 'Kind', 'Notes'],
          mono: [0],
          rows: [
            ['askport n', 'reporter', 'reads a motor port'],
            ['askservo n', 'reporter', 'reads a servo port'],
            ['askrelay n', 'reporter', 'reads a relay port'],
            ['relayison n', 'reporter', 'relay n is on'],
            ['geta n', 'reporter', 'angle of servo n'],
            ['talkto n', 'statement', 'addresses a remote node'],
          ],
        },
      ],
    },

    {
      id: 'control',
      title: 'Control flow',
      blocks: [
        {
          type: 'prose',
          runs: ['Every loop and test takes its body as a bracketed block. There is no block-less form.'],
        },
        {
          type: 'table',
          head: ['Signature', 'Kind', 'Notes'],
          mono: [0],
          rows: [
            ['repeat n [ ... ]', 'statement', 'runs the block n times'],
            ['forever [ ... ]', 'statement', 'runs the block until the program stops'],
            ['while n [ ... ]', 'statement', 'runs the block while the test is non-zero'],
            ['if n [ ... ]', 'statement', 'runs the block once when the test is non-zero'],
            ['ifelse n [ ... ] [ ... ]', 'statement', 'first block when true, second when false'],
            ['_if n [ ... ]', 'statement', 'starts an else-if chain; must be the first clause'],
            ['_then n [ ... ]', 'statement', 'else-if clause, zero or more, each with its own condition'],
            ['_else [ ... ]', 'statement', 'optional fallback when every condition above was false'],
            ['waituntil [ n ]', 'statement', 'blocks until the test inside the brackets is non-zero'],
            ['when n [ ... ]', 'statement', 'watcher: runs the block whenever the test becomes true'],
            ['whenoff', 'statement', 'stops the when watcher'],
            ['ifstatechange n [ ... ]', 'statement', 'runs the block when the test value changes'],
            ['dobackground [ ... ]', 'statement', 'runs the block as a background task'],
            ['dobackgroundoff', 'statement', 'stops the background task'],
            ['break', 'statement', 'leaves the innermost loop'],
            ['stop', 'statement', 'ends the current procedure'],
            ['output n|s', 'statement', 'ends the current procedure and returns a value'],
            ['wait n', 'statement', 'pauses the program for n milliseconds'],
          ],
        },
        {
          type: 'note',
          tone: 'gotcha',
          title: '_then means else if, not then',
          runs: [
            { code: '_then' },
            ' carries its own condition, so the chain reads as "else if", not "then". A chain always starts with ',
            { code: '_if' },
            ', takes zero or more ',
            { code: '_then' },
            ' clauses each with its own test, and an optional ',
            { code: '_else' },
            ' at the end. GoGoCode\'s block editor is what normally emits it.',
          ],
        },
      ],
    },

    {
      id: 'values',
      title: 'Values and operators',
      blocks: [
        {
          type: 'prose',
          runs: [
            { code: 'set NAME n|s' },
            ' writes a variable and a bare name reads it. Numbers are written plainly, text in double quotes, and a bracketed list is a block rather than a value.',
          ],
        },
        {
          type: 'note',
          tone: 'gotcha',
          title: 'The left operand decides what + means',
          runs: [
            'With a string on the left, ',
            { code: '+' },
            ' joins and ',
            { code: '-' },
            ' removes the first match. With a number on the left it is arithmetic, and a ' +
            'string on the right is parsed as a number, so an unparsable one counts as 0. ' +
            'Order therefore changes the answer.',
          ],
        },
        {
          type: 'table',
          head: ['Expression', 'Result', 'Why'],
          mono: [0, 1],
          rows: [
            ['"a" + "b"', '"ab"', 'both strings, joined'],
            ['"n = " + 5', '"n = 5.00"', 'the number is formatted with two decimals first'],
            ['5 + "3"', '8', 'string on the right is read as a number'],
            ['5 + "abc"', '5', 'unparsable, so it counts as 0'],
            ['"hello world" - "world"', '"hello "', 'removes the first match'],
            ['"cat" = "cat"', 'true', 'string equality compares the text'],
            ['"apple" > "fig"', 'true', 'but the ordering tests compare LENGTH, not alphabet'],
          ],
        },
        {
          type: 'prose',
          runs: ['Precedence, weakest binding at level 1 and tightest at level 10.'],
        },
        {
          type: 'table',
          head: ['Level', 'Operators'],
          mono: [1],
          rows: [
            ['1', 'or   xor'],
            ['2', 'and'],
            ['3', 'not'],
            ['4', '|   ^   &'],
            ['5', '<<   >>'],
            ['6', '<   <=   >   >=   ='],
            ['7', '+   -'],
            ['8', '*   /   %'],
            ['9', 'unary minus'],
            ['10', '**   pow'],
          ],
        },
        {
          type: 'note',
          tone: 'gotcha',
          title: 'pow is infix, and = is comparison',
          runs: [
            { code: 'pow' },
            ' is a word synonym of ',
            { code: '**' },
            ', so it is written ',
            { code: '2 pow 3' },
            ' and not as a call. And there is no ',
            { code: '==' },
            ': a single ',
            { code: '=' },
            ' compares.',
          ],
        },
        {
          type: 'table',
          head: ['Signature', 'Kind', 'Notes'],
          mono: [0],
          rows: [
            ['abs n', 'reporter', ''],
            ['sqrt n', 'reporter', ''],
            ['round n', 'reporter', ''],
            ['ceil n', 'reporter', ''],
            ['floor n', 'reporter', ''],
            ['sin n', 'reporter', ''],
            ['cos n', 'reporter', ''],
            ['tan n', 'reporter', ''],
            ['asin n', 'reporter', ''],
            ['acos n', 'reporter', ''],
            ['atan n', 'reporter', 'single-argument arctangent, in radians. Wrong on firmware 3.2.6, which still reads sub-op 33 as two-argument atan2 and pops an extra operand. Correct from firmware 4.0'],
            ['min n n', 'reporter', ''],
            ['max n n', 'reporter', ''],
            ['random n', 'reporter', '0 to n-1, never n. Reseeds from the millisecond timer on every call, so calls within the same millisecond return the same value'],
            ['constrain n n n', 'reporter', 'value low high, clamps in float math, no guard when low is above high'],
            ['map n n n n n', 'reporter', 'value fromLow fromHigh toLow toHigh, integer math, extrapolates past the range instead of clamping. Returns -1 when fromLow equals fromHigh'],
            ['highbyte n', 'reporter', ''],
            ['lowbyte n', 'reporter', ''],
          ],
        },
        {
          type: 'table',
          head: ['Constant', 'Kind', 'Value'],
          mono: [0, 2],
          rows: [
            ['PI', 'reporter', '3.14159265'],
            ['E', 'reporter', '2.71828183'],
            ['PHI', 'reporter', '1.61803399'],
            ['LN2', 'reporter', '0.69314718'],
            ['LN10', 'reporter', '2.30258509'],
            ['SQRT2', 'reporter', '1.41421356'],
            ['SQRT1_2', 'reporter', '0.70710678'],
            ['INFINITY', 'reporter', 'floating-point infinity'],
          ],
        },
      ],
    },

    {
      id: 'output-cmds',
      title: 'Motors, servos, relays',
      blocks: [
        {
          type: 'prose',
          runs: [
            'Each of these needs its port prefix. The signature below shows one concrete prefix; any prefix from the addressing table works in its place.',
          ],
        },
        {
          type: 'table',
          head: ['Signature', 'Kind', 'Notes'],
          mono: [0],
          rows: [
            ['output1, on', 'statement', 'runs the selected motors'],
            ['output1, off', 'statement', 'stops the selected motors'],
            ['output1, onfor n', 'statement', 'runs the selected motors, then stops them after n milliseconds'],
            ['output1, thisway', 'statement', 'sets direction. cw is the same command'],
            ['output1, thatway', 'statement', 'the opposite direction. ccw is the same command'],
            ['output1, rd', 'statement', 'reverses the current direction'],
            ['output1, setpower n', 'statement', 'power 0-100. The board reports it back as 0-255 PWM'],
            ['stopall', 'statement', 'stops every motor. Takes no prefix'],
            ['servo1, seth n', 'statement', 'angle 0-180'],
            ['servo1, seta n', 'statement', 'angle 0-180'],
            ['servo1, lt n', 'statement', 'angle 0-180, one direction'],
            ['servo1, rt n', 'statement', 'angle 0-180, the other direction'],
            ['relay1, relaysetpower n', 'statement', 'power 0-100, reported back as percent. A non-zero power switches the relay on'],
            ['relay1, setservopower n', 'statement', 'deprecated alias of relaysetpower. It sets relay power despite the name, so it takes a relay prefix'],
          ],
        },
      ],
    },

    {
      id: 'sensing',
      title: 'Sensing',
      blocks: [
        {
          type: 'prose',
          runs: [
            'Port reads come in two spellings: a numbered word, and a reader taking the port as an argument. They compile to the same thing, so pick whichever reads better at the call site.',
          ],
        },
        {
          type: 'table',
          head: ['Signature', 'Kind', 'Notes'],
          mono: [0],
          rows: [
            ['readsensor n', 'reporter', 'port 1-4'],
            ['sensorN', 'reporter', 'N is 1 to 4. Compiles to readsensor N'],
            ['inputN', 'reporter', 'N is 1 to 4. Compiles to readsensor N'],
            ['readswitch n', 'reporter', 'port 1-4'],
            ['switchN', 'reporter', 'N is 1 to 4. Compiles to readswitch N'],
            ['readfilteredinput n', 'reporter', 'port 1-4, the port\'s last filtered sample'],
            ['filteredinputN', 'reporter', 'N is 1 to 4'],
            ['readfilteredvariable n', 'reporter', 'variable name, returns the filter\'s last output, 0 if no filter is set'],
            ['readboardsensor n', 'reporter',
              { text: 'the sensors built into the board, see the index table', to: '#board-sensor-index' }],
            ['readacceleration n', 'reporter', 'one accelerometer axis'],
            ['readloudness', 'reporter', 'on-board microphone level, the same value the type-0 report carries'],
            ['ir', 'reporter', 'last code received from an infrared remote'],
            ['newir?', 'reporter', 'true while an unread ir code is waiting'],
            ['send n|s', 'statement', 'transmits a number or text out the serial port'],
            ['boardgesture', 'reporter',
              { text: 'the current gesture code, see the table. Reading it does not clear the new-gesture flag', to: '#gesture-codes' }],
            ['newboardgesture?', 'reporter', '1 when a new gesture has been detected since the last read, 0 otherwise. boardgesture clears it'],
            ['timer', 'reporter', 'counts up in milliseconds'],
            ['resett', 'statement', 'zeroes the timer'],
            ['tickcount', 'reporter', 'ticks elapsed since the last settickrate or cleartick, counted only while the program runs'],
            ['cleartick', 'statement', 'zeroes the tick count and the partial tick, keeps the period'],
            ['settickrate n', 'statement', 'tick period in milliseconds, not a rate, so larger is slower. Default 10, and it also zeroes the count'],
            ['setinputfilter n n', 'statement', 'port 1-4 then type: 0 average, 1 rate, 2 max, 3 min, 4 amplify. One filter per port, later calls are ignored'],
            ['setinputthreshold n n', 'statement', 'port 1-4 then raw threshold clamped to the sensor range. Rate filter only, and setting it disables the automatic baseline'],
            ['setinputweight n n', 'statement', 'port 1-4 then smoothing weight for the average and amplify filters, out = (prev*w + in)/(w+1), 0 is no smoothing'],
            ['setvariablefilter n n', 'statement', 'variable name then type: 0 average, 1 rate, 2 max, 3 min, 4 amplify. One filter per variable, later calls are ignored'],
            ['setvariablethreshold n n', 'statement', 'variable name then rate threshold, unclamped, and setting it disables the automatic baseline'],
            ['setvariableweight n n', 'statement', 'variable name then smoothing weight for the average and amplify filters, out = (prev*w + in)/(w+1), 0 is no smoothing'],
            ['resetinputminmax n', 'statement', 'port 1-4, reseeds the min or max filter from the port\'s current reading'],
            ['resetvariableminmax n', 'statement', 'variable name, reseeds the min or max filter from the variable\'s current value'],
          ],
        },
        {
          type: 'prose',
          runs: [
            'The argument selects which built-in sensor to read. An index outside this list leaves the stack untouched.',
          ],
        },
        {
          type: 'table',
          id: 'gesture-codes',
          head: ['Value', 'Gesture', 'Notes'],
          mono: [0],
          rows: [
            ['0', 'none', 'no gesture detected'],
            ['1', 'tilt up', ''],
            ['2', 'tilt down', ''],
            ['3', 'tilt left', ''],
            ['4', 'tilt right', ''],
            ['5', 'face up', ''],
            ['6', 'face down', ''],
            ['7', 'free fall', ''],
            ['8', 'shake', ''],
            ['9', 'hit 3g', ''],
            ['10', 'hit 6g', ''],
            ['11', 'hit 8g', ''],
          ],
        },
        {
          type: 'table',
          id: 'board-sensor-index',
          head: ['Index', 'Reads', 'Notes'],
          mono: [0],
          rows: [
            ['0', 'proximity', 'mapped to 0-255'],
            ['1', 'illuminance', 'lux, 16-bit'],
            ['2', 'temperature', ''],
            ['3', 'humidity', ''],
            ['4', 'orientation', 'same value boardgesture reports'],
            ['5', 'acceleration, X axis', 'm/s squared'],
            ['6', 'acceleration, Y axis', 'm/s squared'],
            ['7', 'acceleration, Z axis', 'm/s squared'],
            ['8', 'combined acceleration', 'm/s squared, magnitude of the three axes'],
            ['9', 'loudness', ''],
          ],
        },
      ],
    },

    {
      id: 'display-sound',
      title: 'Display and sound',
      blocks: [
        {
          type: 'table',
          head: ['Signature', 'Kind', 'Notes'],
          mono: [0],
          rows: [
            ['show n|s', 'statement', 'writes a number or text to the display'],
            ['cls', 'statement', 'clears the display'],
            ['textpos n n', 'statement', 'x then y in pixels, not column and row. Both wrap above 255'],
            ['textcolor n', 'statement', 'CHSV hue 0-255 at full saturation, the same scale as bgcolor'],
            ['bgcolor n', 'statement', 'CHSV hue 0-255 at full saturation, fills the screen at once'],
            ['textstyle n', 'statement', 'font, 0 small 1 large 2 bold. Other values are ignored'],
            ['showimage s', 'statement', 'downloads and draws a URL, blocks until the image lands, only paints on the main page'],
            ['beep', 'statement', 'the board buzzer'],
            ['note n n', 'statement', 'pitch then beats, not milliseconds. One beat is 500 ms at the default tempo, so note 60 200 sounds for 100 seconds. Pitch is 1-based chromatic from C with 12 per octave, 0 is silence'],
            ['notetempo n', 'statement', 'beats per minute, default 120, sets how long one beat of note lasts'],
          ],
        },
      ],
    },

    {
      id: 'display-assets',
      title: 'Building a screen with assets',
      blocks: [
        {
          type: 'prose',
          runs: [
            'An asset is a fixed field on the screen that you update by id instead of redrawing text. ',
            { code: 'show' },
            ' paints wherever the cursor happens to be, so a changing value leaves the old one behind ' +
            'unless you clear first. An asset owns its slot: writing to it repaints only that slot.',
          ],
        },
        {
          type: 'prose',
          runs: [
            'Assets sit on a grid of character cells, not pixels. A cell is 8 by 16 pixels and the ' +
            'screen is 160 by 128, which gives ',
            { b: '20 columns and 8 rows' },
            '. Coordinates count from 0 at the top left.',
          ],
        },
        {
          type: 'table',
          head: ['Signature', 'Kind', 'Notes'],
          mono: [0],
          rows: [
            ['assetadd n n n n n|s', 'statement', 'grid x, grid y, length in cells, alignment, then the starting value'],
            ['assetwrite n n|s', 'statement', 'asset id then the new value'],
            ['assetread n', 'reporter', 'the current value, empty string if that id was never added'],
          ],
        },
        {
          type: 'table',
          head: ['Alignment', 'Meaning'],
          mono: [0],
          rows: [
            ['0', 'left'],
            ['1', 'right'],
            ['2', 'centre'],
          ],
        },
        {
          type: 'codeblock',
          lines: [
            'to start',
            '  ; two labels and two fields beside them',
            '  assetadd 0 0 6 0 "temp"',
            '  assetadd 6 0 6 1 0',
            '  assetadd 0 1 6 0 "light"',
            '  assetadd 6 1 6 1 0',
            '  forever [',
            '    assetwrite 1 readboardsensor 2',
            '    assetwrite 3 readsensor 1',
            '    wait 500',
            '  ]',
            'end',
          ],
          caption: 'The four assetadd calls take ids 0 to 3 in order, so the two value fields are 1 and 3.',
        },
        {
          type: 'note',
          tone: 'gotcha',
          title: 'Nothing tells you an asset id',
          runs: [
            { code: 'assetadd' },
            ' returns nothing. Ids are handed out in creation order starting at 0, so you count your ' +
            'own calls to know what to write to later. Writing to an id that was never added is ' +
            'silently ignored, which is what a miscount looks like.',
          ],
        },
        {
          type: 'note',
          tone: 'info',
          title: 'What else to expect',
          runs: [
            'The first asset command takes over the screen and clears it. A number value is formatted ' +
            'with two decimals, so 5 shows as 5.00; pass ',
            { code: 'totext' },
            ' output if that matters. Writing the value an asset already holds does nothing, so the ' +
            'screen does not flicker. The table lives in RAM, so a reset clears every asset.',
          ],
        },
      ],
    },

    {
      id: 'data',
      title: 'Lists, text, time',
      blocks: [
        {
          type: 'table',
          head: ['Signature', 'Kind', 'Notes'],
          mono: [0],
          rows: [
            ['totext n|s', 'reporter', ''],
            ['tonumber n|s', 'reporter', ''],
            ['textlength n|s', 'reporter', ''],
            ['textat n n', 'reporter', 'character position, 0-based'],
            ['textcontains n n', 'reporter', ''],
            ['textisempty n', 'reporter', ''],
            ['textindexof n n', 'reporter', '0-based position of the first match, -1 when the needle is absent'],
            ['textsplit n n', 'reporter', 'returns a list id, usable with list_get and list_len. Every character of the delimiter splits, and empty parts are dropped'],
            ['substring n n n', 'reporter', 'text start length, start is 0-based and the third argument is a character count, not an end index'],
            ['charcodeat n n', 'reporter', 'character code at a 0-based position, 0 when the position is out of range'],
            ['fromcharcode n', 'reporter', ''],
          ],
        },
        {
          type: 'table',
          head: ['Signature', 'Kind', 'Notes'],
          mono: [0],
          rows: [
            ['list_create n ...', 'reporter', 'zero or more items'],
            ['list_push n n|s', 'statement', 'appends to the end'],
            ['list_get n n', 'reporter', '0-based element index, 0 when out of range'],
            ['list_set n n n|s', 'statement', ''],
            ['list_insert n n n|s', 'statement', ''],
            ['list_remove n n', 'statement', ''],
            ['list_len n', 'reporter', 'item count'],
            ['list_find n n|s', 'reporter', '0-based index of the first match, -1 when absent. Types must match, so a number never matches text'],
            ['list_rev n', 'statement', 'reverses in place. Also usable as a reporter'],
            ['list_random n', 'reporter', 'returns a random element without removing it, 0 when the list is empty'],
            ['list_pop_at n n', 'reporter', '0-based, returns the element and removes it, 0 when out of range and the list is left unchanged'],
            ['list_pop_first n', 'reporter', 'returns the first element and removes it, 0 when the list is empty'],
            ['list_pop_last n', 'reporter', 'returns the last element and removes it, 0 when the list is empty'],
          ],
        },
        {
          type: 'note',
          tone: 'warn',
          title: 'The board clock starts unset',
          runs: [
            'A board whose clock was never synced reports times counted from zero, not a real date. This is the same offset that shows up in offline datalog records.',
          ],
        },
        {
          type: 'table',
          head: ['Signature', 'Kind', 'Notes'],
          mono: [0],
          rows: [
            ['year', 'reporter', ''],
            ['month', 'reporter', ''],
            ['day', 'reporter', ''],
            ['dow', 'reporter', 'day of week'],
            ['hours', 'reporter', ''],
            ['minutes', 'reporter', ''],
            ['seconds', 'reporter', ''],
            ['rtc_init', 'statement', 'does nothing on GoGo Board 7. The clock syncs over NTP, so there is no clock to start. Kept because older programs call it'],
          ],
        },
      ],
    },

    {
      id: 'network',
      title: 'Broadcast, MQTT, cloud',
      blocks: [
        {
          type: 'table',
          head: ['Signature', 'Kind', 'Notes'],
          mono: [0],
          rows: [
            ['connectwifi s s', 'statement', 'ssid then password, beeps success, failure, or blocked by remote access'],
            ['setbroadcastchannel n', 'statement', 'channel number, the string form does not compile'],
            ['setbroadcastpassword s', 'statement', 'payload sent with every broadcast, receivers must match it'],
            ['broadcast s', 'statement', 'no WiFi guard, so a broadcast sent offline is silently lost'],
            ['whenreceivebroadcast s [ ... ]', 'statement', 'runs the block when a matching broadcast arrives'],
            ['setmqttbroker s', 'statement', 'broker host without a scheme, the firmware prepends mqtt:// and reconnects. Also spelled setmessagebroker'],
            ['mqttpublish s n|s', 'statement', 'topic then payload, published with no WiFi guard so it is silently lost when offline. Also spelled publishmessage'],
            ['mqttsubscribe s [ ... ]', 'statement', 'topic, runs the block on each new payload. Also spelled subscribemessage'],
            ['mqttmessage', 'reporter', 'last payload from mqttsubscribe as a string, empty until one arrives'],
            ['message', 'reporter', 'exact alias of mqttmessage. Any identifier starting with message is split by the lexer'],
            ['sendgmessage s n|s', 'statement', 'key then value, sent to the host over USB rather than the network'],
            ['whenreceivegmessage s [ ... ]', 'statement', 'runs the block when the host sends that key over USB'],
            ['gmessage s', 'reporter', 'value the host last sent for that key, the number 0 if the key is unknown'],
            ['offlinerecord n s', 'statement', 'value then field. Writes one record to the board offline datalog, rate limited to one record per field per second'],
            ['cloudrecord n s', 'statement', 'value then field, does nothing until setcloudrecorduid is set, one record per field per second'],
            ['publiccloudrecord n s s', 'statement', 'value, field, then channel, one record per field per second'],
            ['setcloudrecorduid s', 'statement', 'cloud account id, required before cloudrecord publishes anything'],
            ['reportgrading n n', 'statement', 'rule index then status, writes one bit of the grading register'],
            ['setiftttkey s', 'statement', 'webhook key, required before sendiftttevent does anything'],
            ['sendiftttevent s n|s', 'statement', 'event name then message, silently returns without WiFi or a key'],
            ['setlinetoken s s', 'statement', 'token then chat id'],
            ['sendlinemessage n|s', 'statement', 'silently returns without WiFi or a token'],
            ['sendlineimage s n|s', 'statement', 'url then message. A numeric message hits an overload that swaps the two, so pass the message as a string'],
            ['sendlinesticker n n n', 'statement', 'package id, sticker id, then message'],
          ],
        },
      ],
    },

    {
      id: 'peripherals',
      title: 'I2C, Vernier, Tasmota, keyboard',
      blocks: [
        {
          type: 'note',
          tone: 'info',
          title: 'An I2C transfer is a sequence, not one call',
          runs: [
            { code: 'i2cstart' },
            ', then ',
            { code: 'i2cwrite' },
            ' with the address, then one ',
            { code: 'i2cwrite' },
            ' per data byte, then ',
            { code: 'i2crequest n' },
            ' and n calls to ',
            { code: 'i2cread' },
            ' if you are reading, then ',
            { code: 'i2cstop' },
            '. Addresses are 7-bit throughout, so an address quoted in 8-bit form has to be halved.',
          ],
        },
        {
          type: 'table',
          head: ['Signature', 'Kind', 'Notes'],
          mono: [0],
          rows: [
            ['i2cstart', 'statement', 'arms the sequence, the next i2cwrite supplies the 7-bit address'],
            ['i2cstop', 'statement', 'ends the transfer, does nothing unless a byte was written or read'],
            ['i2cwrite n', 'statement', 'first call after i2cstart is the 7-bit address, later calls are data bytes'],
            ['i2crequest n', 'statement', 'number of bytes to request from the current address, not an address'],
            ['i2cread', 'reporter', 'returns one buffered byte, 0 if no i2crequest is outstanding'],
            ['i2creadandstop', 'reporter', 'i2cread followed by i2cstop'],
            ['i2c_read_register n n', 'reporter', '7-bit address then register, reads one byte and blocks forever if the device never answers'],
            ['i2c_write_register n n n', 'statement', '7-bit address, register, value'],
            ['vernier_sensor_value n', 'reporter', '0-based field index on the attached Vernier interface, an out-of-range field reads as 0'],
            ['vernier_sensor_unit n', 'reporter', '0-based field index, returns the unit string, returns the number 0 when the field does not exist'],
            ['tasmotasetchannel n', 'statement', 'channel number, the string form does not compile'],
            ['tasmotasendcommand s n|s n|s', 'statement', 'device, command, then payload. An empty device name or the core device goes over serial, not MQTT'],
            ['tasmotamessage s', 'reporter', 'last value for that key from the subscribed device'],
            ['tasmotamessagedevice s s', 'reporter', 'device then key'],
            ['tasmotanewmessagedevice s', 'reporter', 'true when that device has sent something new'],
            ['tasmotawhenreceive s [ ... ]', 'statement', 'subscribes to a device and runs the block on each new message'],
            ['sendkey s', 'statement', 'the board has its own keyboard HID interface'],
            ['presskey s', 'statement', ''],
            ['releasekey s', 'statement', ''],
            ['sendkeydelay n', 'statement', ''],
            ['getpower n', 'reporter', 'the port must be a literal. An expression is scanned as text, so getpower 1 + 1 silently reads motor 1'],
          ],
        },
      ],
    },

    {
      id: 'firmware-4',
      title: 'Coming in firmware 4',
      blocks: [
        {
          type: 'note',
          tone: 'warn',
          title: 'Not available yet',
          runs: [
            'The current stable firmware is ',
            { b: '3.2.6' },
            ', and everything above runs on it. The commands in this section do not. They compile, ' +
            'they download, and the board stops at the first one. They are listed here because the ' +
            'firmware work exists and they will arrive with 4.0.',
          ],
        },
        {
          type: 'table',
          head: ['Signature', 'Kind', 'Notes'],
          mono: [0],
          rows: [
            ['for NAME [ ... ]', 'statement', 'counted loop. Use repeat until this ships'],
            ['foreach NAME [ ... ]', 'statement', 'walks a list, binding each element to NAME'],
            ['repcount', 'reporter', 'the current iteration inside for or repeat'],
            ['vernier_slot n n', 'reporter', 'slot-addressed Vernier read, alongside the existing vernier_sensor_value'],
            ['vernier_slot_unit n n', 'reporter', 'the unit string for that slot'],
            ['broadcastwithvalue s n|s', 'statement', 'broadcasts a message carrying a value'],
            ['broadcastvalue', 'reporter', 'the value carried by the message that just arrived'],
          ],
        },
        {
          type: 'prose',
          runs: [
            'Firmware 4 also gives procedures their own local scope. Today a parameter and any ',
            { code: 'set' },
            ' inside a procedure are global, so two procedures using the same name share it. And ',
            { code: 'atan' },
            ' becomes the single-argument form the compiler already emits; on 3.2.6 it is read as a ' +
            'two-argument atan2 and returns a wrong number.',
          ],
        },
      ],
    },
  ],
}
