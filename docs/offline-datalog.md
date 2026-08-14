# Offline Datalog

The board records sensor data to its own flash while disconnected. This page covers pulling those records over USB HID and plotting them. Packet framing is in [protocol.md](protocol.md).

## Using it

1. **Sync Data** — pulls all records off the board; a progress bar tracks the transfer.
2. **Select channel** — the dropdown fills in once the sync completes. *(Removed on `feature/datalog-v2` — see [6.x vs 7.x](#6x-vs-7x).)*
3. The chart renders the records.
4. **Delete Data** — erases the board's records. Not undoable.

## Sync protocol

Send category `20`, command `2`. The board replies with a stream of type-20 packets:

```
[0] 20    [1] payload length    [2] 2    [3] status    [4..62] payload
```

Status drives a four-stage state machine. Each stage is split across as many packets as it needs; every packet is `1` (in progress) except the last of a stage, which carries the stage's own code.

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
| 0 | 4 | Unix timestamp, **seconds** (`uint32`) |
| 4 | 2 | field — index into the lookup table (`uint16`) |
| 6 | 4 | value (`float32`) |

### Stage 4 — plot

Group records by field into Highcharts series, then feed them to the chart.

## Chart wiring

`Chart.vue` registers as `datalog-chart` and owns nothing but the Highcharts options. `OfflineDatalog.vue` pushes series straight into it:

```js
this.$refs.datalogChart.chartOptions.series = series
```

Direct ref mutation, not props. Three similar names, easy to confuse: `DatalogChart` (import), `datalogChart` (ref), `datalog-chart` (component name).

`computePacket` is a computed property with side effects — it is what advances the state machine on each new response packet. It is load-bearing; refactoring it into a pure computed stops syncing.

## Board-side behaviour

Records land in LittleFS under `/datalog/` as 30 rotating files of ~10,000 records each (300,000 total); the oldest file is dropped when full. Writes are rate-limited to one record per second per field, so a tight Logo loop will not fill the log.

## 6.x vs 7.x

On 6.x a record was 16 bytes: 8-byte millisecond timestamp, 2-byte channel, 2-byte field, 4-byte value. The 7.x record above is 10 bytes and **carries no channel** — channel survives only on the online (MQTT) path.

`develop` still parses the 6.x record and still has the channel dropdown. The 7.x version lives on the unmerged **`feature/datalog-v2`** branch, which:

- sets `offline_datalog_record_size` to 10 and parses via `DataView` (little-endian: `getUint32` timestamp ×1000, `getUint16` field index, `getFloat32` value)
- drops the channel concept — series are keyed by field, and the dropdown goes away
- gates the unpacker on `packet.command == rcmd_get_offline_datalog`, so unrelated type-20 responses no longer corrupt the buffer
- adds an opt-in raw-packet debug buffer to the store

Merge that branch rather than reimplementing the migration.
