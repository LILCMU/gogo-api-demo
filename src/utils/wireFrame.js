//? Helpers shared by the pages that show real frames on the wire — Control,
//? Logo and Datalog. The colour roles are reused across frame kinds (a type-0
//? report has no command byte, a write frame has no sensors), so every dump
//? carries its own legend saying what each hue means there.

const ROW_SIZE = 16

export const LEGEND_LABELS = {
  category: 'Category',
  command: 'Command',
  length: 'Length',
  payload: 'Payload',
  type: 'Packet type',
  status: 'Status',
}

//? A 63-byte frame is four dump rows, almost all of them zero. Cut to the last
//? meaningful byte, rounded out to a whole 16-byte row so the columns still
//? line up with ByteDump's header.
export function trimFrame (frame) {
  let end = frame.length
  while (end > 0 && frame[end - 1] === 0) end -= 1

  const rows = Math.max(1, Math.ceil(end / ROW_SIZE))
  return Array.from(frame).slice(0, Math.min(frame.length, rows * ROW_SIZE))
}
