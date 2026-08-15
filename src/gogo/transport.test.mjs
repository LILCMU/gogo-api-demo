import { test } from 'node:test'
import assert from 'node:assert/strict'

const GOGO_VENDOR_ID = 0x0461
const GOGO_PRODUCT_ID = 0x0020

//? Node's built-in `navigator` global has only a getter, so plain assignment
//? throws in strict-mode ESM; redefine the property instead.
function stubNavigator (hid) {
  Object.defineProperty(globalThis, 'navigator', {
    value: hid === undefined ? {} : { hid },
    configurable: true,
    writable: true,
  })
}

function fakeHid ({ getDevices, requestDevice }) {
  return {
    getDevices: getDevices || (async () => []),
    requestDevice: requestDevice || (async () => []),
    addEventListener: () => {},
  }
}

function fakeDevice ({ vendorId, productId, collections = [{}] }) {
  const device = {
    vendorId,
    productId,
    collections,
    opened: false,
    open: async () => { device.opened = true },
    close: async () => { device.opened = false },
    sendReport: async () => {},
  }
  return device
}

//? navigator.hid does not exist in Node, so it must be stubbed before each
//? GogoTransport is constructed; the module reads it inside the constructor.
const { GogoTransport } = await import('./transport.js')

test('connect() with no WebHID at all emits error and returns null', async () => {
  stubNavigator(undefined)
  const transport = new GogoTransport()
  let emittedError = null
  transport.on('error', (error) => { emittedError = error })

  const result = await transport.connect()

  assert.equal(result, null)
  assert.ok(emittedError instanceof Error)
})

test('connect({ prompt: false }) with no granted devices returns null without prompting', async () => {
  let requestDeviceCalled = false
  stubNavigator(fakeHid({
    getDevices: async () => [],
    requestDevice: async () => { requestDeviceCalled = true; return [] },
  }))
  const transport = new GogoTransport()

  const result = await transport.connect({ prompt: false })

  assert.equal(result, null)
  assert.equal(requestDeviceCalled, false)
})

test('connect() still opens the picker when only a non-GoGo device is granted', async () => {
  //? T1 regression: the old `!devices.length && prompt` guard treated any
  //? granted device as "already paired" and never opened the picker
  const otherDevice = fakeDevice({ vendorId: 0x1111, productId: 0x2222 })
  let requestDeviceCalled = false
  stubNavigator(fakeHid({
    getDevices: async () => [otherDevice],
    requestDevice: async () => { requestDeviceCalled = true; return [] },
  }))
  const transport = new GogoTransport()

  await transport.connect({ prompt: true })

  assert.equal(requestDeviceCalled, true)
})

test('connect() opens a granted GoGo raw-HID device and emits connect', async () => {
  const gogoDevice = fakeDevice({ vendorId: GOGO_VENDOR_ID, productId: GOGO_PRODUCT_ID })
  stubNavigator(fakeHid({
    getDevices: async () => [gogoDevice],
  }))
  const transport = new GogoTransport()
  let connectedDevice = null
  transport.on('connect', (device) => { connectedDevice = device })

  const result = await transport.connect()

  assert.equal(result, gogoDevice)
  assert.equal(gogoDevice.opened, true)
  assert.equal(connectedDevice, gogoDevice)
})
