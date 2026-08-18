//? Structured content for the in-app Offline Datalog reference.
//?
//? `docs/offline-datalog.md` remains authoritative. This module is the same
//? facts shaped for the block renderer in src/views/Reference.vue; when the
//? markdown changes, change this too.
//?
//? Section ids are a contract: GuideLink `to="/reference/datalog#..."` in
//? Datalog.vue points at them.

export default {
  title: 'Offline datalog',
  lede:
    'The board records sensor data to its own flash while disconnected. This is how those records ' +
    'come back over USB HID, and how to read the 10-byte format they arrive in.',
  sections: [
    {
      id: 'using',
      title: 'Using it',
      blocks: [
        {
          type: 'steps',
          items: [
            {
              title: 'Sync Data',
              runs: [
                'Pulls every record off the board. The progress bar tracks bytes received against the ',
                'file-size totals from stage 1. Both buttons stay disabled until a board is connected, and ',
                'again while a sync is in flight.',
              ],
            },
            {
              title: 'Date offset',
              runs: [
                'Adds a chosen constant to every record timestamp when the chart renders. It never touches ',
                'the synced data, so re-picking replaces the shift rather than compounding it. Leave it unset ',
                'if the board’s clock was already synced.',
              ],
            },
            {
              title: 'Delete Data',
              runs: [
                'Opens a confirm dialog. Nothing is erased until Delete is pressed there, and delete is ',
                'blocked while a sync is still running.',
              ],
            },
          ],
        },
      ],
    },

    {
      id: 'stages',
      title: 'The three-stage sync',
      blocks: [
        {
          type: 'prose',
          runs: [
            'Send category 20, command 2. The board replies with a stream of type-20 packets. The status byte ',
            'drives a state machine: every packet is 1 (in progress) except the last of a stage, which carries ',
            'the stage’s own code.',
          ],
        },
        {
          type: 'frame',
          fields: [
            { span: 1, index: '0', label: 'type 20', tone: 'ink' },
            { span: 1, index: '1', label: 'length', tone: 'blue' },
            { span: 1, index: '2', label: 'cmd 2', tone: 'orange' },
            { span: 1, index: '3', label: 'status', tone: 'pink' },
            { span: 5, index: '4–62', label: 'payload, up to 59 bytes', tone: 'green' },
          ],
        },
        {
          type: 'table',
          head: ['Status', 'Meaning'],
          mono: [0],
          rows: [
            ['1', 'in progress'],
            ['2', 'failure — defined in firmware, never sent by 7.x; handle it anyway'],
            ['3', 'no records stored'],
            ['4', 'stage 1 complete — file sizes'],
            ['5', 'stage 2 complete — lookup table'],
            ['6', 'stage 3 complete — records'],
          ],
        },
        {
          type: 'steps',
          items: [
            {
              title: 'Stage 1 — file sizes, status 4',
              runs: [
                'ASCII, newline-delimited: ',
                { code: '<lookup table bytes>\\n<records bytes>\\n' },
                '. Both are needed to size the progress bar and to know when the later stages end.',
              ],
            },
            {
              title: 'Stage 2 — lookup table, status 5',
              runs: [
                'Comma-delimited ASCII names: ',
                { code: 'name0,name1,name2,' },
                '. Position is the index; records refer to names by index rather than repeating strings.',
              ],
            },
            {
              title: 'Stage 3 — records, status 6',
              runs: ['Fixed 10-byte binary records, little-endian. See the layout below.'],
            },
            {
              title: 'Stage 4 — plot',
              runs: ['Group records by field into one series each, then feed them to the chart.'],
            },
          ],
        },
        {
          type: 'note',
          tone: 'warn',
          title: 'The type-0 report stream stops during the transfer',
          runs: [
            'The firmware suppresses type-0 reports around every stage’s send loop, so effectively the whole ',
            'sync is silent on that channel. A client treating type 0 as a heartbeat will conclude the board ',
            'died mid-sync.',
          ],
        },
      ],
    },

    {
      id: 'record-format',
      title: 'The 10-byte record',
      blocks: [
        {
          type: 'bytemap',
          size: 10,
          regions: [
            { from: 0, to: 3, label: 'Board-clock timestamp', note: 'uint32, seconds', tone: 'blue' },
            { from: 4, to: 5, label: 'Field', note: 'uint16, index into the lookup table', tone: 'orange' },
            { from: 6, to: 9, label: 'Value', note: 'float32', tone: 'green' },
          ],
        },
        {
          type: 'note',
          tone: 'gotcha',
          title: 'Records straddle packet boundaries',
          runs: [
            'Payload chunks are up to 59 bytes, which is not a multiple of 10. Concatenate every payload for ',
            'the stage first, then walk the buffer in 10-byte steps. Never parse packet by packet.',
          ],
        },
        {
          type: 'note',
          tone: 'gotcha',
          title: 'The timestamp is not necessarily wall-clock time',
          runs: [
            'It comes from ',
            { code: 'gogoTime.getUnixTime()' },
            ', which is only real Unix time once the board’s clock has been set — by NTP, or by the host ',
            'sending category 0 command 50. A board that has logged since power-up without ever syncing ',
            'produces timestamps counted from a 1970 epoch, and the chart will place those records in 1970. ',
            'That is what the date offset picker is for. Treat it as a display correction, never as a fix ',
            'to the stored data.',
          ],
        },
      ],
    },

    {
      id: 'board-behaviour',
      title: 'Board-side behaviour',
      blocks: [
        {
          type: 'prose',
          runs: [
            'Records land in LittleFS under ',
            { code: '/datalog/' },
            ' as 30 rotating files of about 10,000 records each, 300,000 in total; the oldest file is dropped ',
            'when full. Writes are rate-limited to one record per second per field, so a tight Logo loop will ',
            'not fill the log.',
          ],
        },
      ],
    },

    {
      id: 'changes',
      title: '6.x vs 7.x',
      blocks: [
        {
          type: 'table',
          head: ['', '6.x', '7.x'],
          rows: [
            ['Record size', '16 bytes', '10 bytes'],
            ['Timestamp', '8 bytes, milliseconds', '4 bytes, seconds'],
            ['Channel', '2 bytes', 'not carried at all'],
            ['Field', '2 bytes', '2 bytes'],
            ['Value', '4 bytes', '4 bytes'],
          ],
        },
        {
          type: 'prose',
          runs: [
            'The channel concept survives only on the online MQTT path. There is no channel offline, so ',
            'series are keyed by field alone.',
          ],
        },
      ],
    },
  ],
}
