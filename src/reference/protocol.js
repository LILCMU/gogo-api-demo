//? Structured content for the in-app Wire Protocol reference.
//?
//? `docs/protocol.md` remains authoritative — it is what is verified against
//? gogo-firmware. This module is the same facts shaped for the block renderer
//? in src/views/Reference.vue; when the markdown changes, change this too.
//?
//? Section ids are a contract: GuideLink `to="/reference/protocol#..."` in the
//? views points at them. Renaming one silently breaks a deep link.

export default {
  title: 'Wire protocol',
  lede:
    'How the browser and a GoGo Board 7.x talk over USB HID: the frame, the command set, ' +
    'and the device register the board streams back. Values are read from the firmware source.',
  sections: [
    {
      id: 'transport',
      title: 'Transport',
      blocks: [
        {
          type: 'table',
          head: ['', ''],
          mono: [1],
          rows: [
            ['Vendor ID', '0x0461'],
            ['Product ID', '0x0020'],
            ['Interface', 'raw HID, usage page 0xFF00, report ID 0'],
            ['Payload', '63 bytes each way, fixed length'],
          ],
        },
        {
          type: 'note',
          tone: 'gotcha',
          title: 'Pick the right collection',
          runs: [
            'The board also exposes a keyboard HID interface on the same device. ',
            { code: 'navigator.hid.requestDevice()' },
            ' can return both — pick the one whose ',
            { code: 'collections' },
            ' is non-empty.',
          ],
        },
      ],
    },

    {
      id: 'frame',
      title: 'Frame layout',
      blocks: [
        {
          type: 'prose',
          runs: ['Every outbound frame has the same four-part shape. 16-bit parameters are big-endian, high byte first. Unused bytes are zero.'],
        },
        {
          type: 'frame',
          fields: [
            { span: 1, index: '0', label: 'report ID', tone: 'ink' },
            { span: 1, index: '1', label: 'category', tone: 'blue' },
            { span: 1, index: '2', label: 'command', tone: 'orange' },
            { span: 6, index: '3–63', label: 'parameters', tone: 'green' },
          ],
        },
        {
          type: 'note',
          tone: 'warn',
          title: 'Outbound and inbound index differently',
          runs: [
            'Outbound frames carry a report ID; inbound frames do not. ',
            { code: 'sendReport(0, payload)' },
            ' supplies the report-ID byte itself, so ',
            { code: 'buildCommand' },
            ' emits the 63 bytes that follow — payload index 0 is the category. Inbound, ',
            { code: 'oninputreport' },
            ' gives 63 bytes with no shift: byte 0 is the packet type.',
          ],
        },
      ],
    },

    {
      id: 'categories',
      title: 'Categories',
      blocks: [
        {
          type: 'table',
          head: ['ID', 'Category', 'Dispatched over USB HID'],
          mono: [0],
          rows: [
            ['0', 'Output, peripheral and system control', 'yes'],
            ['1', 'Flash and Logo memory', 'yes'],
            ['2', 'Raspberry Pi', 'connect-WiFi only, cmd 15'],
            ['3', 'GoGo Arduino', 'no handler'],
            ['4', 'Data-driven toolkit', 'yes'],
            ['5', 'was Hopher decentralized ops', 'reserved, never shipped'],
            ['20', 'Event request', 'yes'],
          ],
        },
        {
          type: 'note',
          tone: 'warn',
          title: 'Most commands never reply',
          runs: [
            'Host to board is fire-and-forget: the firmware applies the command and sends nothing back. ',
            'Do not write a blocking wait for an acknowledgement that never arrives. The exceptions are ',
            'category 0 commands 63 and 64 (type 21), and category 20 commands 1 and 2 (type 20). ',
            'Category 20 command 3 replies with nothing but a beep.',
          ],
        },
      ],
    },

    {
      id: 'category-0',
      title: 'Category 0 — control',
      blocks: [
        {
          type: 'prose',
          runs: ['Frame index 3 is payload index 2. Where a parameter is 16-bit it is sent high byte then low byte.'],
        },
        {
          type: 'table',
          head: ['Cmd', 'Action', 'param 1', 'param 2', 'param 3'],
          mono: [0],
          rows: [
            ['2', 'Motor on/off', 'target motors, 0 = active ports', '0 off, 1 on', ''],
            ['3', 'Motor direction', 'target motors', '0 CCW, 1 CW', ''],
            ['4', 'Motor reverse direction', 'target motors', '', ''],
            ['6', 'Motor set power', 'target motors', 'power 0–100 hi', 'lo'],
            ['7', 'Set active motor ports', 'bitmask, one bit per port', '', ''],
            ['8', 'Toggle active motor port', 'port number', '', ''],
            ['9', 'Servo set head', 'target servos, 0 = active ports', 'head 10–40 hi', 'lo'],
            ['14', 'Set active servo ports', 'bitmask, one bit per port', '', ''],
            ['15', 'Servo thisway', 'target servos', 'angle 0–180 hi', 'lo'],
            ['16', 'Servo thatway', 'target servos', 'angle 0–180 hi', 'lo'],
            ['17', 'Servo set angle', 'target servos', 'angle 0–180 hi', 'lo'],
            ['18', 'Toggle active servo port', 'port number', '', ''],
            ['19', 'Relay set power', 'target relay', 'power 0–100 hi', 'lo'],
            ['11', 'Beep', '7.x ignores all parameters', '', ''],
            ['12', 'Logo autorun state', '0 disable, 1 enable', '', ''],
            ['13', 'Logo control', '0 stop, 1 start, 2 toggle', '', ''],
            ['50', 'Sync RTC from host', 'seconds, minutes, hours, day-of-week, day, month, year from 2000', '', ''],
            ['51', 'Read RTC into registers 36–42', '', '', ''],
            ['60', 'Show short text', 'NUL-terminated string, up to 60 chars', '', ''],
            ['61', 'Show long text †', 'NUL-terminated string, up to 60 chars', '', ''],
            ['62', 'Clear screen †', '0 pixels only, 1 also reset attributes', '', ''],
            ['63', 'Show image', 'URL, up to 60 chars — replies type 21', '', ''],
            ['64', 'Get image URL', 'replies type 21', '', ''],
            ['65', 'Set background colour †', 'hue 0–255', '', ''],
            ['66', 'Set text colour †', 'hue 0–255', '', ''],
            ['67', 'Set text position †', 'x 0–255, from the text-area corner', 'y 0–255', ''],
            ['68', 'Set text style †', '0 small, 1 large, 2 bold', '', ''],
            ['100', 'Reboot', '', '', ''],
            ['250', 'Enter bootloader', '', '', ''],
          ],
        },
        {
          type: 'note',
          tone: 'gotcha',
          title: 'Dispatched but inert — commands 10 and 201',
          runs: [
            'These are the dangerous case, because the firmware shows a ',
            { code: 'case' },
            ' and suggests they work. Command 10 (LED control) reads and discards its parameter; its body is ',
            'commented out pending NeoPixel support, so there is currently no way to drive any LED over USB HID ',
            'on 7.x. Command 201 (serial firmware update) is likewise dispatched with a commented-out body.',
          ],
        },
        {
          type: 'note',
          tone: 'warn',
          title: '† Commands 61, 62 and 65–68 need a firmware test build',
          runs: [
            'They are implemented on the firmware branch ',
            { code: 'feature/expose-logovm-text-commands-hid' },
            ', built as ',
            { code: 'v4.0.0-hidtext' },
            ', and are in no released firmware — a stock board reporting 4.0.0 ignores them. Command 60 ships ',
            'on released firmware, but its behaviour changed on the same branch.',
          ],
        },
        {
          type: 'prose',
          runs: [
            { b: 'No-ops on 7.x.' },
            ' Defined but with no HID handler at all: 1 ping, 5 motor break, 20 set active relay ports, ',
            '70–74 voice recorder, 81–83 keyboard, 91 IR send, 200 OTA update, 220 co-MCU hello.',
          ],
        },
      ],
    },

    {
      id: 'display',
      title: 'Display commands',
      blocks: [
        {
          type: 'prose',
          runs: [
            'Commands 60, 61, 62 and 65–68 share one set of rules. All seven are fire-and-forget — they reply ',
            'with nothing over HID, so never wait for an acknowledgement. Any of them switches the board to the ',
            'main page, closes an open on-device menu, and holds the display until the user navigates away with ',
            'the joystick; there is no “give the screen back” command. Command 60 used to guard on the page ',
            'instead — arriving while the child was on Settings or Inputs, it drew nothing at all — and the ',
            'other six did not exist.',
          ],
        },
        {
          type: 'prose',
          runs: [
            { b: 'Confirmation is on the board, not on the wire.' },
            ' 62 and 65–68 have no visible effect of their own, so each writes a line in the footer strip for 5 s: ',
            { code: 'clear screen' }, ', ', { code: 'bg color: <NAME>' }, ', ', { code: 'text color: <NAME>' },
            ', ', { code: 'text pos: <x>,<y>' }, ', ', { code: 'text style: <SMALL|LARGE|BOLD>' },
            '. The colour name is the nearest of eight buckets 32 apart — RED 0, ORANGE 32, YELLOW 64, GREEN 96, ',
            'AQUA 128, BLUE 160, PURPLE 192, PINK 224 — wrapping, so 250 reads as RED. 60 and 61 draw no ',
            'confirmation, since the text is the confirmation, and wipe a pending one first.',
          ],
        },
        {
          type: 'table',
          head: ['', '60 short text', '61 long text'],
          mono: [],
          rows: [
            ['Screen', 'cleared on every call', 'never cleared'],
            ['Layout', 'one line, centred on the whole screen', 'word-wrapped, left-aligned, inside a viewport'],
            ['Cursor', 'ignored, unless a position was set with 67', 'read, advanced, and left mid-line'],
            ['Semantics', 'replace', 'append'],
          ],
        },
        {
          type: 'prose',
          runs: [
            '60 clears to the background colour set by 65, so a chosen background survives it. It centres without ',
            'insets, so roughly 13 characters at the large style reach the bezel — use 67 with 61 when padding ',
            'matters.',
          ],
        },
        {
          type: 'note',
          tone: 'gotcha',
          title: 'Coordinates are text-area relative, and unclamped',
          runs: [
            '67 takes one byte each, so x and y both accept 0–255. The firmware adds the 6-pixel inset itself, ',
            'so 67 0 0 lands at the text area’s top-left corner — panel pixel (6, 6) — not against the bezel. ',
            'Nothing bounds the values after that: the panel is 160 × 128, so x above 153 or y above 121 puts ',
            'the text off it, silently. The confirmation line reports the raw values you sent, not the offset ',
            'ones. The rest of the inset is 61’s word-wrap — it wraps at panel x 154 and returns to panel x 6, ',
            'advances one line by the glyph height plus 2 (13 px small and bold, 24 px large), and stops the ',
            'moment the line’s bottom would pass panel y 108, clear of the footer strip. In 67 coordinates that ',
            'means 61 draws nothing at all from y above 91, or above 80 at the large style. Text past the bottom ',
            'is dropped, not scrolled.',
          ],
        },
        {
          type: 'prose',
          runs: [
            'Before any 67, the cursor sits at panel (0, 0) — the power-on value, hard against the bezel, and ',
            'not what 67 0 0 gives you. Nothing resets it: not a clear, not page navigation. Command 62 with a ',
            'mode byte of 1 is the only other command that repositions it, to the same corner 67 0 0 uses.',
          ],
        },
        {
          type: 'note',
          tone: 'gotcha',
          title: 'Splitting long text across packets: carry the space forward',
          runs: [
            'Consecutive 61 packets append where the previous one left the cursor — no reassembly buffer, no ',
            'sequence numbering. The renderer prints leading separators but consumes trailing ones, so send ',
            { code: '"hello"' }, ' then ', { code: '" world"' }, ', never ', { code: '"hello "' }, ' then ',
            { code: '"world"' },
            '. A word split mid-packet rejoins correctly unless its first half lands exactly at the right ',
            'margin, in which case it breaks across lines with no hyphen.',
          ],
        },
        {
          type: 'prose',
          runs: [
            { b: 'Attributes apply to the next draw, not retroactively.' },
            ' 66, 67 and 68 change nothing already on screen — set them, then draw. 65 is the exception: a ',
            'background is a draw, so it fills the screen immediately. Style 2 is bold at the same 6 pt size as ',
            'style 0; only style 1 is larger, and there is no large-bold, so text getting smaller when you set ',
            'bold is correct.',
          ],
        },
        {
          type: 'prose',
          runs: [
            { b: 'Attributes persist.' },
            ' Background colour, text colour, position and style set by 65–68 survive later commands and page ',
            'navigation. Only two things clear them: command 62 with a mode byte of 1, and a Logo program ',
            'stopping. There is no per-attribute reset — no hue clears a text colour, no coordinate clears a ',
            'position. 65–68 call the same firmware routines as Logo’s ',
            { code: 'bgcolor' }, ', ', { code: 'textcolor' }, ', ', { code: 'textpos' }, ' and ',
            { code: 'textstyle' }, ', so the two paths produce identical results.',
          ],
        },
        {
          type: 'note',
          tone: 'gotcha',
          title: 'Malformed parameters degrade quietly',
          runs: [
            '67 is x then y, in that byte order. 68 silently drops an out-of-range style and changes nothing ',
            'else. 62 treats any mode byte other than 1 as 0: the inbound path does not zero the tail of a short ',
            'report, so a stale byte degrades to pixels-only rather than wiping the attributes.',
          ],
        },
      ],
    },

    {
      id: 'motors',
      title: 'Motors, servos and relays',
      blocks: [
        {
          type: 'note',
          tone: 'gotcha',
          title: 'Motor and relay duty use different scales',
          runs: [
            'Both command 6 and command 19 take a 0–100 value, but they report back differently. ',
            { b: 'Motor' },
            ' bytes 25–28 hold scaled PWM duty, 0–255: a command of 40 reads back as 102, 50 as 127, 100 as 255. ',
            'Convert with ',
            { code: 'percent = round(register * 100 / 255)' },
            '. ',
            { b: 'Relay' },
            ' bytes 29–32 hold the percent you sent, 0–100: a command of 40 reads back as 40. ',
            'Treating the motor register as a percentage will report a motor at "102%".',
          ],
        },
        {
          type: 'table',
          head: ['Register', 'Field', 'Scale'],
          mono: [0],
          rows: [
            ['22', 'Active motor ports', 'bitmask'],
            ['23', 'Motor on/off status', 'bitmask'],
            ['24', 'Motor direction', 'bitmask, 1 = CW'],
            ['25–28', 'Motor A–D duty', '0–255 PWM'],
            ['29–32', 'Relay 1–4 duty', '0–100 percent'],
            ['35', 'Relay on/off status', 'bitmask'],
            ['11', 'Active servo ports', 'bitmask'],
            ['12–15', 'Servo 1–4 angle', '0–180 degrees'],
          ],
        },
        {
          type: 'prose',
          runs: [
            'Confirmed on hardware: sending 100 / 50 / 10 to motor A produced registers 255 / 127 / 25, ',
            'while sending 40 to relay 1 produced 40.',
          ],
        },
      ],
    },

    {
      id: 'servos',
      title: 'Servo angle is two bytes',
      blocks: [
        {
          type: 'prose',
          runs: [
            'Command 17 takes the target-servo bitmask, then the angle split high byte first. ',
            'An angle of 120 is sent as ',
            { code: '[mask, 0, 120]' },
            '; an angle of 180 as ',
            { code: '[mask, 0, 180]' },
            '. The high byte only matters because the field is 16-bit, not because angles exceed 255.',
          ],
        },
      ],
    },

    {
      id: 'relays',
      title: 'Relay set power',
      blocks: [
        {
          type: 'prose',
          runs: [
            'Command 19, same 16-bit split as servo angle. The value is a raw PWM duty expressed 0–100, ',
            'and unlike motors it comes back from the register on the same scale. See ',
            { b: 'Motors, servos and relays' },
            ' above for why the two disagree.',
          ],
        },
      ],
    },

    {
      id: 'logo-download',
      title: 'Category 1 — memory and Logo download',
      blocks: [
        {
          type: 'table',
          head: ['Cmd', 'Action', 'param 1', 'param 2'],
          mono: [0],
          rows: [
            ['1', 'Set Logo memory pointer', 'address hi', 'address lo'],
            ['2', 'Set absolute flash pointer', 'address hi', 'address lo'],
            ['3', 'Write bytes', 'length, max 60', 'bytecode, length bytes'],
            ['4', 'Read bytes', 'length', 'no handler in 7.x'],
          ],
        },
        {
          type: 'note',
          tone: 'gotcha',
          title: 'A program that is an exact multiple of 60 bytes needs a trailing empty write',
          runs: [
            'The firmware buffers writes and commits to NVS only when it sees a chunk ',
            { b: 'shorter than 60 bytes' },
            '. So the last chunk must be a short one. A 120-byte program sent as two 60-byte chunks is never ',
            'committed, and nothing reports an error. ',
            { code: 'buildLogoWriteSequence' },
            ' owns this rule because it is protocol, not view logic.',
          ],
        },
        {
          type: 'steps',
          title: 'The download flow',
          items: [
            { title: 'Compile', runs: ['POST the source to the cloud compiler and take back the bytecode array.'] },
            { title: 'Set the pointer', runs: ['Category 1, command 1 — resets the upload offset.'] },
            { title: 'Write each chunk', runs: ['Category 1, command 3, one packet per 60 bytes, awaited in sequence.'] },
            { title: 'Beep', runs: ['Category 0, command 11 — the only feedback the board gives.'] },
          ],
        },
      ],
    },

    {
      id: 'events',
      title: 'Category 20 — event request',
      blocks: [
        {
          type: 'table',
          head: ['Cmd', 'Action', 'Response'],
          mono: [0],
          rows: [
            ['1', 'Get GoGo ID (MAC address)', 'type 20, MAC at bytes 3–8'],
            ['2', 'Read offline datalog', 'type 20 stream — see the Datalog reference'],
            ['3', 'Clear offline datalog', 'none; board beeps on success'],
          ],
        },
      ],
    },

    {
      id: 'device-register',
      title: 'Type 0 — device register',
      blocks: [
        {
          type: 'prose',
          runs: [
            'The board streams this unprompted from power-up, roughly every 50 ms. No request is needed. ',
            'The 63 bytes are a direct copy of the firmware’s ',
            { code: 'gblDeviceRegister' },
            '. 16-bit values are big-endian.',
          ],
        },
        {
          type: 'bytemap',
          size: 63,
          regions: [
            { from: 0, to: 0, label: 'Packet type', note: 'always 0', tone: 'ink' },
            { from: 1, to: 8, label: 'Sensors 1–4', note: '2 bytes each, big-endian', tone: 'green' },
            { from: 9, to: 10, label: 'Joystick', tone: 'blue' },
            { from: 11, to: 16, label: 'Servos', note: 'active ports, four angles, mode', tone: 'orange' },
            { from: 17, to: 21, label: 'Board identity', note: 'type, hardware ID, firmware major/minor/patch', tone: 'pink' },
            { from: 22, to: 32, label: 'Motors and relays', note: 'motor duty is PWM, relay duty is percent', tone: 'orange' },
            { from: 33, to: 35, label: 'IR, active relay, relay status', tone: 'blue' },
            { from: 36, to: 42, label: 'Clock', note: 'seconds, minutes, hours, day-of-week, day, month, year', tone: 'ink' },
            { from: 43, to: 46, label: 'Link and orientation status', tone: 'green' },
            { from: 47, to: 53, label: 'Built-in sensors', note: 'proximity, gesture, ambient light, loudness', tone: 'blue' },
            { from: 54, to: 59, label: 'Accelerometer X, Y, Z', note: '2 bytes each, signed milli-g', tone: 'pink' },
            { from: 60, to: 62, label: 'Temperature, humidity, grading rules', tone: 'green' },
          ],
        },
        {
          type: 'note',
          tone: 'gotcha',
          title: 'Firmware version starts at byte 19, not 20',
          runs: [
            'Bytes 19, 20, 21 are major, minor, patch. Reading the major from byte 20 is a real bug this repo ',
            'shipped once: on a 7F running 4.0.0 byte 20 happens to be 0, so the compiler was told firmware ',
            'major 0 instead of 4. A fixture with matching major and minor would never have caught it.',
          ],
        },
        {
          type: 'note',
          tone: 'info',
          title: 'Byte 63 is unreachable',
          runs: [
            { code: 'gblDeviceRegister' },
            ' is 64 bytes, but ',
            { code: 'sendReportPkt()' },
            ' transmits only 63 of them. The 64th byte cannot be read over USB HID by any host.',
          ],
        },
      ],
    },

    {
      id: 'builtin-sensors',
      title: 'Built-in sensors',
      blocks: [
        {
          type: 'table',
          head: ['Byte', 'Field', 'Units'],
          mono: [0],
          rows: [
            ['46', 'Board orientation', '0 none, 1–4 tilt, 5 face up, 6 face down, 7 free fall, 8 shake, 9–11 hit'],
            ['47', 'Proximity', '0–255, unitless'],
            ['48', 'Hand gesture', 'enumerated'],
            ['49–50', 'Ambient light', 'lux'],
            ['53', 'Loudness', 'approximate dB SPL, 30–120'],
            ['54–59', 'Accelerometer X, Y, Z', 'signed milli-g, 2 bytes each'],
            ['60', 'Temperature', '°C'],
            ['61', 'Relative humidity', '%RH'],
          ],
        },
        {
          type: 'note',
          tone: 'info',
          title: 'Accelerometer is already scaled',
          runs: [
            'Bytes 54–59 hold milli-g, not raw IMU counts and not m/s². Convert per axis with ',
            { code: 'int16(value) / 1000 * 9.80665' },
            '. A board lying flat reports z = 1001, about 1 g. The "2048 counts per g" figure describes the ',
            'IMU before firmware multiplies by its sensitivity — it is not something you divide the register by.',
          ],
        },
      ],
    },

    {
      id: 'responses',
      title: 'Type 20 and type 21',
      blocks: [
        {
          type: 'frame',
          fields: [
            { span: 1, index: '0', label: 'type 20', tone: 'ink' },
            { span: 1, index: '1', label: 'length', tone: 'blue' },
            { span: 1, index: '2', label: 'command', tone: 'orange' },
            { span: 6, index: '3–62', label: 'command-specific', tone: 'green' },
          ],
        },
        {
          type: 'note',
          tone: 'warn',
          title: 'There is no shared status byte',
          runs: [
            'Everything past byte 2 depends on the command. GoGo ID puts the MAC at bytes 3–8 with ',
            { code: 'length = 7' },
            '; offline datalog puts a status byte at 3 and the payload at 4–62 with ',
            { code: 'length' },
            ' counting the payload alone. The two commands disagree on what length counts.',
          ],
        },
        {
          type: 'prose',
          runs: [
            { b: 'Type 21' },
            ' is an image notification: byte 0 is 21, byte 1 is the URL length (0 means cleared), bytes 2–62 ',
            'are the URL, zero-padded with no NUL. It is sent unprompted whenever the board shows or clears ',
            'an image, and on demand via command 64.',
          ],
        },
        {
          type: 'note',
          tone: 'gotcha',
          title: 'The type-0 stream stops during a datalog sync',
          runs: [
            'A type 20 or 21 packet normally preempts one report cycle. During a datalog transfer the firmware ',
            'suppresses type 0 for the ',
            { b: 'entire' },
            ' transfer, not one cycle. A client treating type 0 as a heartbeat will conclude the board died mid-sync.',
          ],
        },
      ],
    },

    {
      id: 'worked-example',
      title: 'Worked example',
      blocks: [
        {
          type: 'prose',
          runs: ['Connect, send a beep, read one type-0 report. Real captures from a GoGo Board 7F on firmware 4.0.0.'],
        },
        {
          type: 'steps',
          items: [
            {
              title: 'Open the device',
              runs: [
                { code: 'requestDevice({filters: [{vendorId: 0x0461, productId: 0x0020}]})' },
                ', then ',
                { code: 'device.open()' },
                '. Pick the collection whose usage page is 0xFF00.',
              ],
            },
            {
              title: 'Build and send a beep',
              runs: [
                { code: 'buildCommand(CATEGORY.CONTROL, CMD.BEEP)' },
                ' returns 63 bytes starting ',
                { code: '00 0b 00 00 …' },
                '. Category 0 command 11 produces no response; nothing more arrives because of this send.',
              ],
            },
            {
              title: 'Read a type-0 report',
              runs: ['The board is already streaming. Decode the bytes below.'],
            },
          ],
        },
        {
          type: 'table',
          head: ['Byte', 'Value', 'Decoded'],
          mono: [0, 1],
          rows: [
            ['0', '0', 'packet type — device register'],
            ['1–2', '3, 26', 'sensor 1 = (3 << 8) | 26 = 794'],
            ['17', '6', 'board type — GoGo Board 7'],
            ['18', '117 (0x75)', 'hardware ID — high nibble 7, low nibble 5 → revision F'],
            ['19', '4', 'firmware major'],
            ['20', '0', 'firmware minor'],
            ['21', '0', 'firmware patch → 4.0.0'],
            ['58–59', '1001', 'accel z in milli-g, about 1 g at rest'],
          ],
        },
      ],
    },

    {
      id: 'changes',
      title: 'Changes since 6.x',
      blocks: [
        {
          type: 'prose',
          runs: ['The old spreadsheet described 6.x. These are the confirmed differences on 7.x.'],
        },
        {
          type: 'table',
          head: ['Area', '6.x', '7.x'],
          rows: [
            ['Register 17 — hardware type', '0x04', '0x06'],
            ['Register 18 — hardware ID', '0x61', 'version/revision nibbles, e.g. 0x7C'],
            ['Registers 19–21', 'GoGo firmware ID hi/lo, then STM ID', 'firmware major, minor, patch'],
            ['Register 16', 'unallocated', 'servo mode'],
            ['Registers 49–52', 'APDS lux, hue, saturation, value', 'lux only, 49–50'],
            ['Registers 54–59', 'pitch, roll, yaw', 'accelerometer X, Y, Z'],
            ['Registers 60–61', 'unallocated', 'temperature, humidity'],
            ['Motor break, cmd 5', 'supported', 'removed'],
            ['Offline datalog record', '16 bytes, ms timestamp, channel + field', '10 bytes, second timestamp, field only'],
          ],
        },
      ],
    },
  ],
}
