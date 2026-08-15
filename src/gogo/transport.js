import { FRAME_SIZE } from './protocol.js'

const GOGO_VENDOR_ID = 0x0461
const GOGO_PRODUCT_ID = 0x0020
const REPORT_ID = 0

//? The board also exposes a keyboard interface; only the raw HID one has
//? collections, so that is how we tell them apart.
function isRawHidDevice (device) {
  return device.collections && device.collections.length > 0
}

function isGogoDevice (device) {
  return device.vendorId === GOGO_VENDOR_ID &&
    device.productId === GOGO_PRODUCT_ID &&
    isRawHidDevice(device)
}

export class GogoTransport {
  constructor () {
    this.device = null
    this._handlers = new Map()

    if (navigator.hid) {
      navigator.hid.addEventListener('connect', ({ device }) => {
        if (this.connected || !isGogoDevice(device)) return
        this._open(device).catch((error) => this._emit('error', error))
      })
      navigator.hid.addEventListener('disconnect', ({ device }) => {
        if (this.device && device === this.device) this._teardown()
      })
    }
  }

  get connected () {
    return !!this.device && this.device.opened
  }

  //? Called with no user gesture on load, it can only reach already-granted
  //? devices; `prompt` opens the browser picker for a first-time pairing.
  async connect ({ prompt = true } = {}) {
    if (!navigator.hid) {
      this._emit('error', new Error('WebHID is not available in this browser'))
      return null
    }

    let devices = await navigator.hid.getDevices()

    //? getDevices() returns every HID device granted to this origin, not just
    //? GoGo ones, so the picker must open unless a GoGo device is among them
    if (!devices.some(isGogoDevice) && prompt) {
      devices = await navigator.hid.requestDevice({
        filters: [{ vendorId: GOGO_VENDOR_ID, productId: GOGO_PRODUCT_ID }],
      })
    }

    const device = devices.find(isGogoDevice)
    if (!device) {
      const gogoWithoutRawHid = devices.some(
        (d) => d.vendorId === GOGO_VENDOR_ID && d.productId === GOGO_PRODUCT_ID
      )
      if (gogoWithoutRawHid) {
        this._emit('error', new Error('found a GoGo Board but not its raw HID interface'))
      }
      return null
    }

    await this._open(device)
    return device
  }

  async disconnect () {
    if (this.device && this.device.opened) {
      await this.device.close()
    }
    this._teardown()
  }

  async send (payload) {
    if (!this.connected) {
      throw new Error('no GoGo Board connected')
    }
    if (payload.length !== FRAME_SIZE) {
      throw new RangeError('payload must be ' + FRAME_SIZE + ' bytes')
    }
    await this.device.sendReport(REPORT_ID, payload)
  }

  on (event, handler) {
    if (!this._handlers.has(event)) this._handlers.set(event, [])
    this._handlers.get(event).push(handler)
    return this
  }

  off (event, handler) {
    const handlers = this._handlers.get(event)
    if (!handlers) return this
    this._handlers.set(event, handlers.filter((h) => h !== handler))
    return this
  }

  async _open (device) {
    if (this.device && this.device !== device) {
      this.device.oninputreport = null
    }
    this.device = device
    if (!device.opened) await device.open()

    device.oninputreport = (event) => {
      //? event.data is a DataView with byteOffset and byteLength; the buffer may
      //? extend beyond the actual report data, so we use the explicit window.
      //? event.data excludes the report ID, so byte 0 is the packet type
      this._emit('report', new Uint8Array(
        event.data.buffer, event.data.byteOffset, event.data.byteLength
      ))
    }

    this._emit('connect', device)
  }

  _teardown () {
    if (this.device) this.device.oninputreport = null
    this.device = null
    this._emit('disconnect')
  }

  _emit (event, payload) {
    ;(this._handlers.get(event) || []).forEach((handler) => handler(payload))
  }
}
