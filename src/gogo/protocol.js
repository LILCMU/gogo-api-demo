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
