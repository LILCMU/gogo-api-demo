//? Wire format reference: docs/protocol.md
//? Verified against GoGo Board 7.x firmware (include/gogo-firmware.h).

export const FRAME_SIZE = 63

export const PACKET_TYPE = {
  REPORT: 0,
  RESPONSE: 20,
  IMAGE: 21,
}

export const CATEGORY = {
  CONTROL: 0,
  MEMORY: 1,
  DATA_DRIVEN: 4,
  EVENT_REQUEST: 20,
}

export const CMD = {
  MOTOR_ON_OFF: 2,
  MOTOR_DIRECTION: 3,
  MOTOR_REVERSE: 4,
  MOTOR_SET_POWER: 6,
  MOTOR_SET_ACTIVE: 7,
  MOTOR_TOGGLE_ACTIVE: 8,
  SERVO_SET_HEAD: 9,
  LED_CONTROL: 10,
  BEEP: 11,
  AUTORUN_STATE: 12,
  LOGO_CONTROL: 13,
  SERVO_SET_ACTIVE: 14,
  SERVO_THISWAY: 15,
  SERVO_THATWAY: 16,
  SERVO_SET_ANGLE: 17,
  SERVO_TOGGLE_ACTIVE: 18,
  RELAY_SET_POWER: 19,
  READ_RTC: 51,
  SHOW_TEXT: 60,
}

export const MEMORY_CMD = {
  SET_LOGO_POINTER: 1,
  WRITE_BYTES: 3,
}

export const EVENT_CMD = {
  GOGO_ID: 1,
  GET_DATALOG: 2,
  CLEAR_DATALOG: 3,
}

export const REG = {
  PACKET_TYPE: 0,
  SENSOR_START: 1,
  JOYSTICK: 9,
  SERVO_ACTIVE: 11,
  SERVO_ANGLE: 12,
  SERVO_MODE: 16,
  BOARD_TYPE: 17,
  HARDWARE_ID: 18,
  FIRMWARE: 19,
  MOTOR_ACTIVE: 22,
  MOTOR_ON_OFF: 23,
  MOTOR_DIRECTION: 24,
  MOTOR_POWER: 25,
  RELAY_POWER: 29,
  IR_VALUE: 33,
  RELAY_STATUS: 35,
  CLOCK: 36,
  WIFI: 43,
  DATALOG: 44,
  MESSAGING: 45,
  ORIENTATION: 46,
  PROXIMITY: 47,
  GESTURE: 48,
  LIGHT: 49,
  LOUDNESS: 53,
  ACCEL_X: 54,
  TEMPERATURE: 60,
  HUMIDITY: 61,
  GRADING: 62,
}

export const BOARD_TYPE = {
  0: 'No board',
  1: 'GoGo Board 4',
  2: 'Pi Topping',
  3: 'Wireless GoGo',
  4: 'GoGo Board 6',
  5: 'GoGo Bright',
  6: 'GoGo Board 7',
}

export const DATALOG_STATUS = {
  IN_PROGRESS: 1,
  FAILURE: 2,
  EMPTY: 3,
  FILE_SIZE: 4,
  LOOKUP_TABLE: 5,
  RECORDS: 6,
}

export const SENSOR_COUNT = 4
export const MOTOR_COUNT = 4
export const SERVO_COUNT = 4
export const RELAY_COUNT = 4

//? The board frames commands as 64 bytes where index 0 is the HID report ID.
//? WebHID's sendReport() supplies that byte itself, so we emit the 63 that follow:
//? category at 0, command at 1, params from 2.
export function buildCommand(category, command, params = []) {
  if (params.length > FRAME_SIZE - 2) {
    throw new RangeError('command params too long for a 63-byte frame')
  }

  const payload = new Uint8Array(FRAME_SIZE)
  payload[0] = category
  payload[1] = command
  params.forEach((value, i) => {
    payload[2 + i] = value
  })

  return payload
}

function u16 (bytes, index) {
  return (bytes[index] << 8) | bytes[index + 1]
}

function i16 (bytes, index) {
  const value = u16(bytes, index)
  return value > 0x7fff ? value - 0x10000 : value
}

function range (bytes, start, count) {
  return Array.from({ length: count }, (unused, i) => bytes[start + i])
}

//? high nibble is the board version, low nibble the PCB revision letter (A = 0)
function hardwareVersion (id) {
  if (!id) return null
  return String(id >> 4) + String.fromCharCode('A'.charCodeAt(0) + (id & 0x0f))
}

export function isReport (bytes) {
  return !!bytes && bytes[REG.PACKET_TYPE] === PACKET_TYPE.REPORT
}

export function parseReport (bytes) {
  if (!isReport(bytes)) return null

  return {
    sensors: Array.from({ length: SENSOR_COUNT }, (unused, i) =>
      u16(bytes, REG.SENSOR_START + i * 2)
    ),
    joystick: u16(bytes, REG.JOYSTICK),

    board: {
      type: bytes[REG.BOARD_TYPE],
      typeName: BOARD_TYPE[bytes[REG.BOARD_TYPE]] || 'Unknown board',
      //? the cloud compiler expects this raw byte, not the formatted version string
      hardwareId: bytes[REG.HARDWARE_ID],
      version: hardwareVersion(bytes[REG.HARDWARE_ID]),
      firmwareMajor: bytes[REG.FIRMWARE],
      firmware: [
        bytes[REG.FIRMWARE],
        bytes[REG.FIRMWARE + 1],
        bytes[REG.FIRMWARE + 2],
      ].join('.'),
    },

    motors: {
      active: bytes[REG.MOTOR_ACTIVE],
      onOff: bytes[REG.MOTOR_ON_OFF],
      direction: bytes[REG.MOTOR_DIRECTION],
      power: range(bytes, REG.MOTOR_POWER, MOTOR_COUNT),
    },

    servos: {
      active: bytes[REG.SERVO_ACTIVE],
      mode: bytes[REG.SERVO_MODE],
      angles: range(bytes, REG.SERVO_ANGLE, SERVO_COUNT),
    },

    relays: {
      power: range(bytes, REG.RELAY_POWER, RELAY_COUNT),
      status: bytes[REG.RELAY_STATUS],
    },

    ir: bytes[REG.IR_VALUE],

    clock: {
      seconds: bytes[REG.CLOCK],
      minutes: bytes[REG.CLOCK + 1],
      hours: bytes[REG.CLOCK + 2],
      dayOfWeek: bytes[REG.CLOCK + 3],
      day: bytes[REG.CLOCK + 4],
      month: bytes[REG.CLOCK + 5],
      year: bytes[REG.CLOCK + 6],
    },

    wifi: bytes[REG.WIFI],
    datalog: bytes[REG.DATALOG],
    messaging: bytes[REG.MESSAGING],

    builtin: {
      orientation: bytes[REG.ORIENTATION],
      proximity: bytes[REG.PROXIMITY],
      gesture: bytes[REG.GESTURE],
      light: u16(bytes, REG.LIGHT),
      loudness: bytes[REG.LOUDNESS],
      accel: {
        x: i16(bytes, REG.ACCEL_X),
        y: i16(bytes, REG.ACCEL_X + 2),
        z: i16(bytes, REG.ACCEL_X + 4),
      },
      temperature: bytes[REG.TEMPERATURE],
      humidity: bytes[REG.HUMIDITY],
    },

    grading: bytes[REG.GRADING],
  }
}

export const DATALOG_RECORD_SIZE = 10

//? Type-20 layout past byte 2 is command-specific. Datalog puts a status byte
//? at 3 and payload from 4; GoGo ID puts the MAC at 3..8 with no status.
//? Both status and payload are misaligned for non-datalog commands — check
//? `command` before trusting them, and use `raw` to parse layout-specific fields.
export function parseResponse (bytes) {
  if (!bytes || bytes[REG.PACKET_TYPE] !== PACKET_TYPE.RESPONSE) return null

  const length = bytes[1]

  return {
    type: PACKET_TYPE.RESPONSE,
    length,
    command: bytes[2],
    status: bytes[3],
    payload: bytes.slice(4, 4 + length),
    raw: bytes,
  }
}

function toText (bytes, size) {
  return String.fromCharCode.apply(null, Array.from(bytes.slice(0, size)))
}

export function parseFileSizes (bytes, size) {
  const [lookupTableSize, recordsSize] = toText(bytes, size).split('\n')
  return {
    lookupTableSize: parseInt(lookupTableSize, 10),
    recordsSize: parseInt(recordsSize, 10),
  }
}

export function parseLookupTable (bytes, size) {
  return toText(bytes, size).split(',').filter((name) => name.length > 0)
}

//? 7.x offline record: uint32 seconds, uint16 field index, float32 value.
//? Little-endian, and no channel — channel exists only on the online path.
export function parseDatalogRecords (bytes, lookupTable) {
  const view = new DataView(
    bytes.buffer, bytes.byteOffset, bytes.byteLength
  )
  const count = Math.floor(bytes.byteLength / DATALOG_RECORD_SIZE)
  const records = []

  for (let i = 0; i < count; i++) {
    const at = i * DATALOG_RECORD_SIZE
    records.push({
      timestamp: view.getUint32(at, true) * 1000,
      field: lookupTable[view.getUint16(at + 4, true)],
      value: view.getFloat32(at + 6, true),
    })
  }

  return records
}
