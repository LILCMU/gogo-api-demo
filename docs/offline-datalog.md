# Offline Datalog

The board records sensor data to its own flash while disconnected. This page covers pulling those records over USB HID and plotting them. Packet framing is in [protocol.md](protocol.md).

## Using it

- **Sync Data** — pulls all records off the board. A progress bar tracks the transfer (`percentage`, driven by bytes-received against the file-size totals from stage 1 below). Both buttons stay disabled until a board is connected, and again while a sync is in flight.
- **Date offset picker** — a datetime field below the Sync/Delete buttons. Pick a value and it is added to every record's timestamp when the chart renders (see [the timestamp caveat](#stage-3--records-status-6) below); it never touches the synced data itself, so re-picking a new offset replaces the shift rather than compounding it. Leave it unset if the board's clock was already synced.
- Once a sync completes, the chart renders the records, one series per field. Before any sync, the page shows "No records loaded. Press Sync Data to pull them off the board." instead of an empty chart.
- **Delete Data** — opens a confirm dialog ("Delete all datalog records from the GoGo Board?" / "This cannot be undone.") with Cancel and Delete buttons; nothing is erased until Delete is pressed in the dialog. Delete is blocked (with an inline message) while a sync is still running.

## Sync protocol

Send category `20`, command `2`. The board replies with a stream of type-20 packets:

```
[0] 20    [1] payload length    [2] 2    [3] status    [4..62] payload
```

Status drives a four-stage state machine. Each stage is split across as many packets as it needs; every packet is `1` (in progress) except the last of a stage, which carries the stage's own code.

**The type-0 report stream stops for the whole transfer.** The firmware sets
`RESPONSE_REPORT_PACKET_DATALOG_STREAM` before the send loop and clears it only
after, so `sendReportPkt()` returns early throughout. If your client treats the
type-0 stream as a heartbeat, it will conclude the board died mid-sync.

| Status | Meaning |
|---|---|
| 1 | in progress |
| 2 | failure |
| 3 | no records stored |
| 4 | file sizes complete |
| 5 | lookup table complete |
| 6 | records complete |

### Stage 1 — file sizes (status 4)

ASCII, newline-delimited: `<lookup table bytes>\n<records bytes>\n`. Both are needed to size the progress bar and to know when the later stages end.

### Stage 2 — lookup table (status 5)

Comma-delimited ASCII names: `name0,name1,name2,`. Position is the index; records refer to names by index rather than repeating strings.

### Stage 3 — records (status 6)

Fixed 10-byte binary records, little-endian:

| Offset | Size | Field |
|---|---|---|
| 0 | 4 | board-clock timestamp, **seconds** (`uint32`) — see below |
| 4 | 2 | field — index into the lookup table (`uint16`) |
| 6 | 4 | value (`float32`) |

**The timestamp is not necessarily wall-clock time.** It comes from
`gogoTime.getUnixTime()`, which is only real Unix time once the board's clock has
been set — by NTP, or by the host sending category 0 command 50. A board that has
logged since power-up without ever syncing produces timestamps counted from a
1970 epoch, and the chart will place those records in 1970.

This is what the **date offset picker** on the Datalog page is for: it adds a
chosen constant to every record timestamp so an unsynced board's records can be
shifted onto real time. If the board's clock was synced, leave the offset unset.
Treat it as a display correction, never as a fix to the stored data.

### Stage 4 — plot

Group records by field into Highcharts series, then feed them to the chart.

## Chart wiring

`Chart.vue` registers as `datalog-chart` and owns nothing but the Highcharts options. `Datalog.vue` pushes series straight into it:

```js
this.$refs.datalogChart.chartOptions.series = series
```

Direct ref mutation, not props. Three similar names, easy to confuse: `DatalogChart` (import), `datalogChart` (ref), `datalog-chart` (component name).

A `watch` on the store's `lastResponse` getter, gated by the `startRetrivedOfflineDatalog` flag, calls `unpackOfflineDatalogPackets` on each new response packet — that is what advances the state machine. (An earlier version ran this from a computed property, `computePacket`, interpolated into the template as `{{ computePacket }}`; that committed a Vuex mutation during render and has since been replaced by the watch.)

## Board-side behaviour

Records land in LittleFS under `/datalog/` as 30 rotating files of ~10,000 records each (300,000 total); the oldest file is dropped when full. Writes are rate-limited to one record per second per field, so a tight Logo loop will not fill the log.

## 6.x vs 7.x

On 6.x a record was 16 bytes: 8-byte millisecond timestamp, 2-byte channel, 2-byte field, 4-byte value. The 7.x record above is 10 bytes and **carries no channel** — channel survives only on the online (MQTT) path.

The migration landed via `feature/datalog-v2`. It dropped the channel concept along with its dropdown, moved parsing to `DataView`, and gated the unpacker on `packet.command == rcmd_get_offline_datalog` so unrelated type-20 responses can no longer corrupt the receive buffer.
