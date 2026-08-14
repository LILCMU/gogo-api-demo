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
