# Demo webapp — pre-merge findings and backlog

Output of three independent reviews of `feature/demo-redesign` (37 commits): source
code as a reference implementation, UX/UI of each page, and documentation as a
protocol reference. Each reviewer worked from the branch diff plus the live app or
the 7.x firmware source.

Blockers are listed first because they gate the merge. Everything after is backlog,
ordered by value inside each section.

---

## Blockers

### Transport

**T1 — `connect()` can make pairing impossible.** `src/gogo/transport.js:49`

```js
if (!devices.length && prompt) { …requestDevice… }
const device = devices.find(isGogoDevice)
```

`getDevices()` returns every HID device this origin has been granted, not just GoGo
ones. Grant any unrelated device and the array is non-empty, so the picker never
opens, `find(isGogoDevice)` returns undefined, and the user cannot connect — with no
recovery short of clearing site permissions. The error then raised claims "found a
GoGo Board but not its raw HID interface", which may be false.

Guard on `!devices.some(isGogoDevice)` instead. Introduced when the Task 4 fix wave
replaced the `devices[0]` fallback and left the length check unchanged. Unreachable
without the right permission state, which is why no review before this one saw it.

### Datalog page

This page was migrated rather than rewritten and is the only view still carrying its
pre-refactor shape. It is also the sole worked example of a multi-packet protocol
flow, so it is what a copier studies hardest.

**T2 — the sync state machine runs from a side-effecting computed.**
`src/views/Datalog.vue:30,110-113`. `computePacket` pushes to `dataChunk`, increments
`percentage`, assigns status text and calls `finishSync()` → `clearResponse()` — i.e.
**it commits a Vuex mutation during render**. It only executes because the template
interpolates `{{ computePacket }}`; deleting that as cosmetic cleanup silently kills
syncing. Convert to a `watch` on `lastResponse`. `CLAUDE.md`'s gotcha note currently
warns readers *away* from this fix and must change in the same commit.

**T3 — date offsets compound.** `src/views/Datalog.vue:127-136`. `updateRenderGraph`
mutates `field.data[i][0] += dateTimeOffset` in place on the live series. Picking a
second date adds it on top of the first, so timestamps silently drift (original + A +
B). Derive the shifted series from an untouched copy. `if (this.datalogRecords)` at
line 129 is always true for an array; the intended guard is `.length`.

**T4 — off the design system.** Roots on `.Graph` rather than `.page`, so it ignores
the 900px column; redefines `button {}`, `.sync-bt`, `.delete-bt` instead of using
`.btn`; wraps `<button>` children directly in a `<ul>` (invalid HTML); carries dead
`h3`/`li`/`a`/`textarea` rules from an older page.

**T5 — delete confirmation fails contrast and brand rule.** The `modal-vue` dialog
renders white on `--gogo-pink` at ~4.1:1, under 4.5:1, breaking the project's own
rule that brand colours never carry white text. The dialog is also off-system: square
corners, system font, and copy reading "delete data from GoGoBoard ?".

**T6 — keyboard focus is invisible.** `src/views/Datalog.vue:363` sets
`button { outline: none }`, removing the UA focus ring. Confirmed by tab-walking the
live page. Compounding this, the app authors **no** `:focus-visible` rule anywhere —
`grep focus src/` returns nothing — so the UA default is the only focus indicator the
other four pages have, and this page removes it.

**T7 — dead code a reader will assume is load-bearing.** Unused `Dropdown` import and
registration, unused `cmdCategory`/`cmdID`/`cmdParams`/`renderData`/`timestamp`,
unused `msg` prop, empty `mounted()`/`created()`, orphan `.channel-dropdown` rule.

### Logo page

**T8 — claims success on failure.** After a failed send the heading still reads
"Compiled opcodes · sent to the board" while the message below says the board is not
connected. Make the suffix conditional on success.

**T9 — protocol knowledge lives in a view.** `src/views/Logo.vue:146-165` holds the
60-byte chunk size, the length-prefix framing, and the rule that the firmware commits
to NVS only on a chunk shorter than 60 — so an exact multiple needs a trailing empty
write. This falsifies the repo's central claim that `src/gogo/protocol.js` contains
the protocol: lift that file alone and you cannot write Logo memory. Move it to
`protocol.js` as a constant plus a pure helper returning the `WRITE_BYTES` param
sequence, which also puts the `% 60` rule under test.

### Cross-page

**T10 — the disconnected state explains nothing.** With no board, Control shows Beep
plus twelve motor buttons and eight sliders, all inert, with no on-page text. The only
explanation is `:title="actionHint"`, which is hover-only and therefore unreachable on
the tablets that are in scope. `.btn[disabled] { opacity: 0.4 }` also renders the
disabled Beep as pale grey on pale green.

**T11 — a connection error deforms the header.** At 1024px the `SET_ERROR` text renders
inline in `.app-header`, wraps to two lines, and breaks the "Connect a board" button
and "No board" pill across lines.

### Documentation

**T12 — the framing rule is stated wrongly.** `docs/protocol.md:18` says "Both
directions use a 64-byte frame where index 0 is the HID report ID". False inbound —
there is no report-ID byte there at all — and directly contradicted by its own two
bullets beneath. This sentence governs every byte offset in the document.

**T13 — report-stream suppression is understated.** `docs/protocol.md:114` says a type
20 or 21 packet "preempts one report cycle". The firmware suppresses type-0 for the
**entire** datalog transfer (`RESPONSE_REPORT_PACKET_DATALOG_STREAM` is set before the
send loop and cleared after). A client treating type-0 as a heartbeat concludes the
board died mid-sync.

**T14 — datalog timestamps are not trustworthy wall-clock.**
`docs/offline-datalog.md:44` calls them Unix seconds. The value is
`gogoTime.getUnixTime()`, real only after an RTC/NTP sync; an unsynced board logs from
a 1970 epoch. This is *why* the page ships a datetime offset picker — currently
undocumented, and the control looks arbitrary without it.

**T15 — cmd 201 is misfiled.** `docs/protocol.md:73` lists it under "no HID handler",
but it has a dispatch case with a commented-out body, the same class as cmd 10 which
the doc deliberately contrasts against the no-ops.

---

## Backlog — code quality

1. Reset the sync flag when the board disconnects; a mid-sync unplug currently leaves both Datalog buttons disabled until reload.
2. Standardise all views on `Control.vue`'s `message`/`failed` + `run()` pattern, replacing Logo's `actionMessage`/`reportAction`, Packets' inline duplication and Datalog's `offlineDatalogStatus`/`statusFailed` — four names for one concept.
3. Extract the `actionHint` computed and the `if (!boardStatus)` guard, duplicated verbatim across four views and six call sites, into one mixin. The only duplication here that genuinely earns an abstraction.
4. Remove `yAxis.max: 1100` in `Chart.vue` — datalog values are arbitrary float32s, so anything above it is silently clipped and still looks correct.
5. Verify whether the compiler's error body carries `status`; `Logo.vue:228` tests `response.data.status` while vue-resource puts it on `response.status`. If the body has no such field, every compile error including a genuine syntax error reports "Cloud compiler unavailable."
6. Guard `parseReport` against short frames — `isReport` only checks byte 0, so a truncated frame parses to `NaN`/`undefined`, commits, and flips `boardStatus` true.
7. Fix `Chart.vue`'s incoherent `tickInterval` comment and remove the commented-out `stockInit` leftovers.
8. Rename `boardStatus` to `isBoardReady` — it means connected **and** a report has arrived, and it is the disable condition in every view.
9. Rename `startRetrivedOfflineDatalog` to `syncInProgress` — it is a progress flag, and the current name carries a typo.
10. Fix the four `Datalog.vue` comments that restate code instead of explaining why.
11. Close the named test gaps: a 61-param `buildCommand` at the boundary, a short frame into `parseReport`, a `parseResponse` whose length byte overruns, and the `'Unknown board'` fallback.
12. Add `GogoTransport` tests against a fake `navigator.hid` covering all four `connect()` branches — exactly where T1 hid, and the only device code testable without hardware.
13. Remove `chart.js`, `numeral` and `vue-native-websocket` from `package.json`; they appear nowhere in `src/`. `vue-dropdowns` joins them once T7 lands.
14. Hoist `Live.vue`'s `tones` array to a module const, matching how `Logo.vue` hoists `EXAMPLES`.
15. Add an eslint config and `lint` script — nothing enforces style, which is how the semicolon and naming divergences reached this branch.
16. Split `downloadOpcodeToBoard` into a click handler and a programmatic function; one method behaving differently by caller is fragile.
17. Emit a copy rather than a view in `transport.js:108` — the `Uint8Array` aliases the event buffer and is stored long-term in Vuex as `reportRaw`.

## Backlog — UX and UI

1. Add a `:focus-visible` rule in `App.vue` applied to buttons, tabs, inputs and nav links. Currently no page authors one.
2. Rename both Logo primary buttons to "Send to board" — in a browser, "Download" reads as save-a-file, the opposite of what it does.
3. Add a persistent visible "Connect a GoGo Board to use these controls" line to Control and Logo, and replace `opacity: 0.4` on disabled buttons with a token that keeps labels legible.
4. Style `input[type=range]` with `--gogo-blue`; the sliders currently render in the OS accent colour, the most off-brand pixels in the app.
5. Style the Packets number/text inputs to the pill vocabulary, and label them with the resolved protocol constant — "Command 11 · BEEP" — so the page teaches while you use it.
6. Reflect board state in Control: drive button emphasis from `report.motors.onOff`/`direction` and slider positions from `report.servos.angles`, so a command visibly round-trips.
7. Give the Datalog datepicker a real `<label>` and one line explaining that it maps board clock ticks onto wall-clock time, and whether it is optional. See T14 — this control is a workaround for a protocol reality.
8. Set `yAxis.min: 0`, disable the Highcharts credit, and extend `colors` to six brand values so series never share a colour — with three series, Sensor 1 and Temperature currently both render blue.
9. Add a decode pane for "Last response · type 20" mirroring the report decode, so request and response read symmetrically.
10. Highlight the byte ranges the report legend names in prose (1–8 sensors, 17–21 board identity) with the tint-chip scheme the send preview already uses.
11. Annotate the Logo compiled dump with byte roles and add a "Copy opcodes" button feeding the Raw opcodes tab.
12. Give each route a `document.title` and an `h1`, and wrap the router view in `<main>`.
13. Add `aria-live="polite"` to the header status and `.action-message`; add `aria-label` to every Control slider, which currently exposes only "slider".
14. Add a disconnect affordance — make the Connected pill a button; the connection is one-way until reload.
15. Raise small hit targets to ≥36px for tablet: nav links, "show all", Pause, and the Packets inputs.
16. Add a "Cancel sync" path so a stalled sync cannot leave both Datalog buttons disabled.
17. Rebalance the Live dark panel, which crams four readouts into the left third of a full-width bar, and add a 0–1023 scale cue to the sensor tiles.
18. Fix copy: "Retrieve a total of 180 records." → "Retrieved 180 records.", "GoGoBoard ?" → "GoGo Board?", "show all" → "Show all", and normalise transport errors to sentence case.
19. Collapse the "GoGo Board 7 7M" pill to one non-repeating string; `typeName` and `version` currently duplicate the 7.

## Backlog — documentation

1. Repeat the frame-index vs payload-index mapping at each command table, or add a payload-index column. The tables use frame indices where `[3]` is the first parameter; `buildCommand`, the tests and the Packets ByteDump all use payload indices where it is at 2. Stated once and never again, so a reader who jumps to a table writes every parameter one byte late.
2. Document category 2 command 15 (`CMD_WIFI_CONNECT_RPI`) with its parameters; the category table says "connect-WiFi only" but never gives the ID.
3. Reword the accelerometer note to separate the register value (milli-g) from the IMU's internal count (2048 = 1 g), which currently invites dividing by 2048.
4. Add payload length caps to the tables: WiFi and datalog UID clamp to 59 bytes, the type-21 URL to 61.
5. Describe `src/components/` and `src/styles/tokens.css` in `CLAUDE.md` — `ByteDump` with its `bytes`/`highlights` props, `StatTile`, `DarkPanel`, `AppHeader`, and the token palette are the substance of this branch and are invisible in the docs.
6. Add `SET_REPORT_RAW`, `CLEAR_RESPONSE`, `CLEAR_ERROR` and the `reportRaw` getter to the store description; `Packets.vue` depends on `reportRaw`.
7. Update `docs/offline-datalog.md`'s "Using it" section — it describes a three-step flow that no longer matches the page, and omits the offset picker and delete confirmation.
8. Add `npm test` to the README setup block.
9. Add a worked end-to-end example to `docs/protocol.md`: connect, build a beep frame, read a type-0 report.
10. Note that `gblDeviceRegister` is 64 bytes but only 63 are transmitted, so register byte 63 is unreachable over HID.
11. State which commands produce no response at all, so implementers do not write blocking waits on acknowledgements that never arrive.

---

## What the reviews said not to churn

`src/gogo/protocol.js` — zero imports, flat constants, comments that explain why
rather than what. Lifts into React or Web Serial unchanged.

`src/gogo/protocol.test.mjs` — encodes intent, not implementation: the
byte-19-not-20 firmware regression, the deliberate nonzero-category case that defeats
`CATEGORY.CONTROL` being 0, distinct accel y/z values chosen so a copy-pasted x offset
fails, and the GoGo ID test proving the documented misalignment.

The transport/store seam, `Control.vue` as the model view, `ByteDump`/`StatTile`/
`DarkPanel`/`tokens.css`, and the Packets page — described by the UX reviewer as the
best teaching material in the app.
