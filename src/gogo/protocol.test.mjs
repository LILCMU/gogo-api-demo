import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildCommand, CATEGORY, CMD } from './protocol.js'

test('buildCommand returns a 63-byte payload', () => {
  const payload = buildCommand(CATEGORY.CONTROL, CMD.BEEP)
  assert.ok(payload instanceof Uint8Array)
  assert.equal(payload.length, 63)
})

test('buildCommand puts category and command in the first two bytes', () => {
  //? the report ID is dropped, so category lands at index 0 not 1
  const payload = buildCommand(CATEGORY.CONTROL, CMD.BEEP)
  assert.equal(payload[0], 0)
  assert.equal(payload[1], 11)
})

test('buildCommand writes params from index 2', () => {
  const payload = buildCommand(CATEGORY.CONTROL, CMD.MOTOR_ON_OFF, [0b1111, 1])
  assert.equal(payload[2], 0b1111)
  assert.equal(payload[3], 1)
})

test('buildCommand zero-fills the rest', () => {
  const payload = buildCommand(CATEGORY.CONTROL, CMD.BEEP)
  assert.equal(payload.slice(2).every((b) => b === 0), true)
})

test('buildCommand rejects params that overflow the frame', () => {
  assert.throws(
    () => buildCommand(CATEGORY.CONTROL, CMD.BEEP, new Array(62).fill(1)),
    /too long/
  )
})

import { parseReport, isReport, REG } from './protocol.js'

//? builds a 63-byte type-0 report with specific registers set
function reportBytes (overrides = {}) {
  const bytes = new Uint8Array(63)
  Object.entries(overrides).forEach(([index, value]) => {
    bytes[Number(index)] = value
  })
  return bytes
}

test('isReport is true only for packet type 0', () => {
  assert.equal(isReport(reportBytes()), true)
  assert.equal(isReport(reportBytes({ 0: 20 })), false)
})

test('parseReport returns null for a non-report packet', () => {
  assert.equal(parseReport(reportBytes({ 0: 20 })), null)
})

test('parseReport decodes sensors as big-endian 16-bit pairs', () => {
  //? sensor 1 = 0x0200 = 512, sensor 2 = 0x0058 = 88
  const report = parseReport(reportBytes({ 1: 0x02, 2: 0x00, 3: 0x00, 4: 0x58 }))
  assert.deepEqual(report.sensors, [512, 88, 0, 0])
})

test('parseReport decodes board identity', () => {
  //? type 6 = GoGo Board 7, hardware id 0x7C = version 7 revision M
  const report = parseReport(reportBytes({ 17: 6, 18: 0x7c, 19: 4, 20: 2, 21: 1 }))
  assert.equal(report.board.type, 6)
  assert.equal(report.board.typeName, 'GoGo Board 7')
  assert.equal(report.board.version, '7M')
  assert.equal(report.board.firmware, '4.2.1')
})

test('parseReport reads the firmware major from byte 19, not 20', () => {
  //? the long-standing bug this repo shipped: byte 20 is the minor version
  const report = parseReport(reportBytes({ 17: 6, 19: 4, 20: 2, 21: 1 }))
  assert.equal(report.board.firmwareMajor, 4)
})

test('parseReport decodes accelerometer as signed 16-bit', () => {
  //? 0xFF9C = -100
  const report = parseReport(reportBytes({ 54: 0xff, 55: 0x9c }))
  assert.equal(report.builtin.accel.x, -100)
})

test('parseReport decodes built-in scalars', () => {
  const report = parseReport(reportBytes({ 47: 200, 53: 52, 60: 27, 61: 65 }))
  assert.equal(report.builtin.proximity, 200)
  assert.equal(report.builtin.loudness, 52)
  assert.equal(report.builtin.temperature, 27)
  assert.equal(report.builtin.humidity, 65)
})

test('parseReport decodes light as a big-endian pair', () => {
  const report = parseReport(reportBytes({ 49: 0x01, 50: 0x54 }))
  assert.equal(report.builtin.light, 340)
})

test('parseReport decodes the clock', () => {
  const report = parseReport(reportBytes({ 36: 30, 37: 45, 38: 13, 39: 4, 40: 14, 41: 8, 42: 26 }))
  assert.deepEqual(report.clock, {
    seconds: 30, minutes: 45, hours: 13, dayOfWeek: 4, day: 14, month: 8, year: 26,
  })
})

test('parseReport decodes motor and relay arrays', () => {
  const report = parseReport(reportBytes({ 25: 100, 26: 50, 29: 80, 30: 20 }))
  assert.deepEqual(report.motors.power, [100, 50, 0, 0])
  assert.deepEqual(report.relays.power, [80, 20, 0, 0])
})

import {
  parseResponse, parseDatalogRecords, parseLookupTable, parseFileSizes,
  DATALOG_STATUS, EVENT_CMD,
} from './protocol.js'

test('parseResponse returns null for a report packet', () => {
  assert.equal(parseResponse(new Uint8Array(63)), null)
})

test('parseResponse splits header from payload', () => {
  const bytes = new Uint8Array(63)
  bytes[0] = 20
  bytes[1] = 3
  bytes[2] = EVENT_CMD.GET_DATALOG
  bytes[3] = DATALOG_STATUS.IN_PROGRESS
  bytes[4] = 0xaa
  bytes[5] = 0xbb
  bytes[6] = 0xcc

  const response = parseResponse(bytes)
  assert.equal(response.command, EVENT_CMD.GET_DATALOG)
  assert.equal(response.length, 3)
  assert.equal(response.status, DATALOG_STATUS.IN_PROGRESS)
  assert.deepEqual(Array.from(response.payload), [0xaa, 0xbb, 0xcc])
})

test('parseFileSizes reads two newline-delimited numbers', () => {
  const text = '48\n120\n'
  const bytes = Uint8Array.from(text, (c) => c.charCodeAt(0))
  assert.deepEqual(parseFileSizes(bytes, bytes.length), {
    lookupTableSize: 48,
    recordsSize: 120,
  })
})

test('parseLookupTable splits on commas', () => {
  const text = 'temp,light,sound,'
  const bytes = Uint8Array.from(text, (c) => c.charCodeAt(0))
  assert.deepEqual(parseLookupTable(bytes, bytes.length), ['temp', 'light', 'sound'])
})

test('parseDatalogRecords reads 10-byte little-endian records', () => {
  //? timestamp 1700000000 s, field index 1, value 21.5
  const bytes = new Uint8Array(10)
  const view = new DataView(bytes.buffer)
  view.setUint32(0, 1700000000, true)
  view.setUint16(4, 1, true)
  view.setFloat32(6, 21.5, true)

  const records = parseDatalogRecords(bytes, ['temp', 'light'])
  assert.equal(records.length, 1)
  assert.equal(records[0].timestamp, 1700000000000)
  assert.equal(records[0].field, 'light')
  assert.equal(records[0].value, 21.5)
})

test('parseDatalogRecords ignores a trailing partial record', () => {
  const records = parseDatalogRecords(new Uint8Array(15), ['a'])
  assert.equal(records.length, 1)
})
