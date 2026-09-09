<template>
  <section class="page">
    <div class="page-head">
      <h1 class="page-title">Datalog</h1>
      <p class="page-lede">
        Pull records the board wrote while it was unplugged. The sync runs in three stages, and
        each one is a separate packet exchange.
      </p>
    </div>

    <div class="section-row">
      <h2 class="section-label">Sync</h2>
      <guide-link to="/reference/datalog#stages">How the three-stage sync works</guide-link>
    </div>

    <div class="datalog-actions">
      <button
        class="btn btn--primary"
        @click="syncOfflineDatalogRecords()"
        :disabled="!isBoardReady || syncInProgress"
        :title="actionHint"
      >
        Read records
      </button>
      <button
        class="btn btn--danger"
        @click="confirmingDelete = true"
        :disabled="!isBoardReady || syncInProgress"
        :title="actionHint"
      >
        Delete all
      </button>
      <button
        v-if="syncInProgress"
        class="btn"
        @click="cancelSync()"
      >
        Cancel
      </button>
    </div>

    <!--? label, control and help stay in one block — the help text is this
         input's aria-describedby target, so it cannot float off on its own -->
    <div class="datapicker">
      <label for="datalog-date-offset" class="datapicker__label">Date offset</label>
      <date-picker
        v-model="dateTimeOffset"
        type="datetime"
        placeholder="select offset timestamp"
        value-type="timestamp"
        :input-attr="{ id: 'datalog-date-offset', 'aria-describedby': 'datalog-date-offset-help' }"
        @change="onSelectedDate()"
      ></date-picker>
      <!--? datalog timestamps come from the board's clock, real wall-clock time
           only after an RTC/NTP sync — an unsynced board logs from 1970, and
           this offset is a display-only correction for that -->
      <p id="datalog-date-offset-help" class="datapicker__help">
        Optional — only needed if the board's clock hasn't been synced. An unsynced board
        logs records starting from 1970, and this offset shifts them onto real time.
      </p>
    </div>

    <template v-if="syncInProgress">
      <ol class="stages">
        <li
          v-for="(stage, i) in STAGES"
          :key="stage"
          class="stages__item"
          :class="{ 'is-done': syncStage > i, 'is-now': syncStage === i }"
        >
          <span class="stages__tick"></span>{{ stage }}
        </li>
      </ol>

      <div class="progress-bar">
        <progress-bar size="medium" :bar-color="progressBarColor" :val="percentage" />
      </div>
    </template>

    <p class="action-message" :class="{ 'is-error': actionFailed }" aria-live="polite">{{ actionMessage }}</p>

    <div class="section-row">
      <h2 class="section-label">Records</h2>
      <guide-link to="/reference/datalog#record-format">The 10-byte record layout</guide-link>
    </div>

    <p v-if="!datalogRecords.length" class="page__empty page__empty--compact">
      No records loaded. Press Read records to pull them off the board.
    </p>
    <div v-else class="chart-container">
      <datalog-chart ref="datalogChart" />
    </div>

    <!--? the transfer is the interesting part of this page, and it is invisible
         once the chart draws — this is the same wire view the Packets page
         gives, kept for the sync that just ran -->
    <template v-if="syncPackets.length">
      <div class="section-row">
        <h2 class="section-label">Sync packets <span class="section-label__note">{{ syncPacketsNote }}</span></h2>
        <guide-link to="/reference/datalog#stages">What each status means</guide-link>
      </div>

      <p class="wire__lede">The request this page sent, then the frames the board sent back.</p>

      <div class="wire">
        <div class="wire__packet" v-for="packet in wirePackets" :key="packet.key">
          <p class="wire__title">
            <span class="wire__step" :class="{ 'wire__step--end': packet.end }">{{ packet.step }}</span>{{ packet.title }}
            <span class="wire__note">{{ packet.note }}</span>
          </p>
          <byte-dump :bytes="packet.bytes" :highlights="packet.highlights" />
          <p class="bytes-legend">
            <span class="bytes-legend__item" v-for="key in packet.legend" :key="key">
              <span class="bytes-legend__swatch" :class="'bytes-legend__swatch--' + key"></span>{{ LEGEND_LABELS[key] }}
            </span>
          </p>
        </div>
      </div>

      <p class="wire__tail" v-if="hiddenSyncPackets">
        {{ hiddenSyncPackets }} in-progress frame{{ hiddenSyncPackets === 1 ? "" : "s" }} not shown &middot;
        <button class="btn btn--small" @click="showAllSyncPackets = true">Show all</button>
      </p>
    </template>

    <div class="confirm-overlay" v-if="confirmingDelete">
      <div class="confirm-dialog">
        <p>Delete all datalog records from the GoGo Board?</p>
        <p class="confirm-dialog__note">This cannot be undone.</p>
        <div class="confirm-dialog__actions">
          <button class="btn" @click="confirmingDelete = false">Cancel</button>
          <button class="btn btn--danger" @click="clearData()">Delete</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
import { mapActions, mapGetters } from "vuex";
import {
  CATEGORY, EVENT_CMD, DATALOG_STATUS,
  buildCommand,
  parseFileSizes, parseLookupTable, parseDatalogRecords,
} from '@/gogo/protocol'
import DatalogChart from "@/components/Chart.vue";
import ByteDump from "@/components/ByteDump.vue";
import { trimFrame, LEGEND_LABELS } from "@/utils/wireFrame";
import ProgressBar from "vue-simple-progress";
import DatePicker from "vue2-datepicker";
import "vue2-datepicker/index.css";
import boardAction from "@/mixins/boardAction";
import GuideLink from "@/components/GuideLink.vue";

const STAGES = ["File sizes", "Lookup table", "Records"];

const STATUS_NAMES = {
  [DATALOG_STATUS.IN_PROGRESS]: "in progress",
  [DATALOG_STATUS.FAILURE]: "failure",
  [DATALOG_STATUS.EMPTY]: "no records",
  [DATALOG_STATUS.FILE_SIZE]: "file sizes done",
  [DATALOG_STATUS.LOOKUP_TABLE]: "lookup table done",
  [DATALOG_STATUS.RECORDS]: "records done",
};

//? a stage-ending frame is worth seeing; the in-progress ones in between are
//? all the same shape, so only the boundaries are shown until asked
const STAGE_END = [
  DATALOG_STATUS.FILE_SIZE,
  DATALOG_STATUS.LOOKUP_TABLE,
  DATALOG_STATUS.RECORDS,
  DATALOG_STATUS.FAILURE,
  DATALOG_STATUS.EMPTY,
];

export default {
  name: "Datalog",
  components: {
    DatalogChart,
    ByteDump,
    ProgressBar,
    DatePicker,
    GuideLink,
  },
  mixins: [boardAction],
  data: function () {
    return {
      syncInProgress: false,
      confirmingDelete: false,
      dataChunk: [],
      lookupTable: [],
      datalogRecords: [],
      lookupTableFileSize: 0,
      datalogRecordsFileSize: 0,
      percentage: 0,
      //? 0 file sizes, 1 lookup table, 2 records — index into STAGES
      syncStage: 0,
      //? every type-20 frame of the last sync, kept for the wire view below
      syncPackets: [],
      showAllSyncPackets: false,
      dateTimeOffset: null,
      progressBarColor: "#a5d442", //? --gogo-green
    };
  },
  computed: {
    ...mapGetters(["lastResponse"]),

    STAGES: () => STAGES,

    LEGEND_LABELS: () => LEGEND_LABELS,

    //* the request frame plus every response frame, in arrival order — built
    //* with the same buildCommand the sync sends, so it cannot drift
    wirePackets: function () {
      const packets = [
        {
          key: "request",
          step: 1,
          end: false,
          title: "Read offline datalog",
          note: "category 20, command 2 · sent by this page",
          highlights: { 0: "bytes__cell--category", 1: "bytes__cell--command" },
          legend: ["category", "command"],
          bytes: trimFrame(buildCommand(CATEGORY.EVENT_REQUEST, EVENT_CMD.GET_DATALOG)),
        },
      ];

      this.shownSyncPackets.forEach((packet, i) => {
        packets.push({
          key: "resp" + packet.n,
          step: i + 2,
          end: packet.end,
          title: "Board response · " + packet.statusName,
          note: "type 20 · status " + packet.status + " · " + packet.length + " payload bytes",
          highlights: packet.highlights,
          legend: ["type", "length", "command", "status", "payload"],
          bytes: packet.bytes,
        });
      });

      return packets;
    },

    shownSyncPackets: function () {
      return this.showAllSyncPackets
        ? this.syncPackets
        : this.syncPackets.filter((packet) => packet.end);
    },

    hiddenSyncPackets: function () {
      return this.syncPackets.length - this.shownSyncPackets.length;
    },

    syncPacketsNote: function () {
      return this.syncPackets.length + " frames received";
    },
  },
  watch: {
    lastResponse: function (packet) {
      if (!this.syncInProgress) return
      this.unpackOfflineDatalogPackets(packet)
    },

    //* a mid-sync disconnect must not leave both buttons disabled forever —
    //* only reconnecting should ever require a page reload before this fix
    isBoardReady: function (connected) {
      if (connected || !this.syncInProgress) return
      this.syncInProgress = false
      this.dataChunk = []
      this.reportAction('Sync interrupted - board disconnected.', true)
    },
  },
  methods: {
    ...mapActions(["send", "clearResponse"]),

    onSelectedDate() {
      if (this.datalogRecords.length) {
        this.updateRenderGraph();
      }
    },

    updateRenderGraph() {
      if (this.$refs.datalogChart) {
        this.$refs.datalogChart.chartOptions.series = this.offsetSeries();
      }
    },

    //* derives a shifted series from the untouched parsed records so
    //* picking a date offset twice does not compound on the live series
    offsetSeries() {
      const offset = this.dateTimeOffset || 0;
      return this.datalogRecords.map((field) => ({
        ...field,
        data: field.data.map(([timestamp, value]) => [timestamp + offset, value]),
      }));
    },

    splitRecordsToChartSeries: function (records) {
      const series = []
      records.forEach((record) => {
        let target = series.find((s) => s.name === record.field)
        if (!target) {
          target = { name: record.field, data: [], animation: false }
          series.push(target)
        }
        target.data.push([record.timestamp, record.value])
      })
      return series
    },

    unpackOfflineDatalogPackets: function (packet) {
      if (!packet || packet.command !== EVENT_CMD.GET_DATALOG) return

      //? byte 1 is the payload length, which the old highlight map skipped —
      //? bytes 0, 2 and 3 are packet type, command and the status that drives
      //? the state machine, and everything from 4 is the payload itself
      const highlights = {
        0: 'bytes__cell--type',
        1: 'bytes__cell--length',
        2: 'bytes__cell--command',
        3: 'bytes__cell--status',
      }
      for (let b = 0; b < packet.length; b += 1) {
        highlights[4 + b] = 'bytes__cell--payload'
      }

      this.syncPackets.push({
        n: this.syncPackets.length + 1,
        status: packet.status,
        statusName: STATUS_NAMES[packet.status] || "status " + packet.status,
        length: packet.length,
        end: STAGE_END.indexOf(packet.status) !== -1,
        highlights: highlights,
        bytes: trimFrame(packet.raw),
      })

      this.dataChunk.push.apply(this.dataChunk, Array.from(packet.payload))

      const total = this.datalogRecordsFileSize + this.lookupTableFileSize
      if (total) this.percentage += (packet.length / total) * 100

      if (packet.status === DATALOG_STATUS.FAILURE) {
        this.reportAction('The board reported a failure while sending records.', true)
        this.finishSync()
        return
      }

      if (packet.status === DATALOG_STATUS.EMPTY) {
        this.reportAction('No records stored on the board.')
        this.finishSync()
        return
      }

      if (packet.status === DATALOG_STATUS.FILE_SIZE) {
        const sizes = parseFileSizes(Uint8Array.from(this.dataChunk), packet.length)
        this.lookupTableFileSize = sizes.lookupTableSize
        this.datalogRecordsFileSize = sizes.recordsSize
        this.dataChunk = []
        this.syncStage = 1
        this.reportAction('Reading file sizes...')
        return
      }

      if (packet.status === DATALOG_STATUS.LOOKUP_TABLE) {
        this.lookupTable = parseLookupTable(
          Uint8Array.from(this.dataChunk), this.lookupTableFileSize
        )
        this.dataChunk = []
        this.syncStage = 2
        this.reportAction('Reading field names...')
        return
      }

      if (packet.status === DATALOG_STATUS.RECORDS) {
        const records = parseDatalogRecords(
          Uint8Array.from(this.dataChunk).slice(0, this.datalogRecordsFileSize),
          this.lookupTable
        )
        this.datalogRecords = this.splitRecordsToChartSeries(records)
        this.$nextTick(() => {
          if (this.$refs.datalogChart) {
            this.$refs.datalogChart.chartOptions.series = this.datalogRecords
          }
        })
        this.syncStage = 3
        this.reportAction('Loaded ' + records.length + ' records.')
        this.finishSync()
        return
      }

      this.reportAction('Syncing...')
    },

    finishSync: function () {
      this.syncInProgress = false
      this.clearResponse()
    },

    //? there is no cancel command in this protocol — this only stops the app
    //? from listening for more datalog packets. The board has no idea the
    //? sync was cancelled and may keep sending records into the void.
    cancelSync: function () {
      this.syncInProgress = false
      this.dataChunk = []
      this.reportAction(
        'Sync cancelled in the app. The board has no cancel command, so it may keep sending records the app is no longer listening for.'
      )
    },

    syncOfflineDatalogRecords: async function () {
      if (!this.requireBoard()) return;

      if (!this.syncInProgress) {
        this.dataChunk = [];
        this.lookupTable = [];
        this.datalogRecords = [];
        this.lookupTableFileSize = 0;
        this.datalogRecordsFileSize = 0;
        this.percentage = 0;
        this.syncStage = 0;
        this.syncPackets = [];
        this.showAllSyncPackets = false;

        this.syncInProgress = true;
        this.actionFailed = false;

        try {
          await this.send({ category: CATEGORY.EVENT_REQUEST, command: EVENT_CMD.GET_DATALOG })
        } catch (error) {
          //? both buttons are disabled while this flag is set, with no other reset
          this.syncInProgress = false;
          this.reportAction(error.message, true);
        }
      }
    },

    clearData: async function () {
      //? always dismiss the dialog, otherwise a refused delete leaves it stuck open
      this.confirmingDelete = false;

      if (this.syncInProgress) {
        this.reportAction("Still syncing - try again once it finishes.", true);
        return;
      }
      if (!this.requireBoard()) return;

      try {
        await this.send({ category: CATEGORY.EVENT_REQUEST, command: EVENT_CMD.CLEAR_DATALOG })
        this.reportAction("Datalog deleted from the GoGo Board.", false);
      } catch (error) {
        this.reportAction(error.message, true);
      }
    },
  },
};
</script>

<style scoped>
.datalog-actions {
  display: flex;
  gap: var(--gap);
  flex-wrap: wrap;
  margin-bottom: var(--space-4);
}

.datapicker {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 5px;
  margin-bottom: var(--space-5);
}

.datapicker__label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
}

.datapicker__help {
  max-width: 62ch;
  margin: 2px 0 0;
  font-size: 12.5px;
  color: var(--muted);
}

.progress-bar {
  margin: var(--space-3) 0 var(--space-5);
}

/*? the transfer is three separate packet exchanges — showing which one is
    running turns a stalled bar into a diagnosable state */
.stages {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  flex-wrap: wrap;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--faint);
}

.stages__item { display: inline-flex; align-items: center; gap: 7px; }
.stages__item.is-done { color: var(--gogo-ink); }
.stages__item.is-now { color: var(--gogo-blue); }

.stages__tick { width: 8px; height: 8px; border-radius: 50%; background: var(--inactive-control); }
.stages__item.is-done .stages__tick { background: var(--gogo-green); }
.stages__item.is-now .stages__tick { background: var(--gogo-blue); box-shadow: 0 0 0 4px rgba(2, 168, 244, 0.18); }

.chart-container {
  width: 100%;
  padding: var(--pad) 20px 20px;
  background: var(--card-bg);
  border-radius: var(--radius-card);
  box-shadow: var(--widget-shadow);
}

.wire__lede { margin: 0 0 var(--space-3); font-size: 13.5px; color: var(--muted); max-width: 62ch; }

.confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(1, 53, 76, 0.45); /*? --gogo-ink, translucent */
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.confirm-dialog {
  background: var(--card-bg);
  border-left: var(--stripe) solid var(--danger);
  border-radius: var(--radius-card);
  box-shadow: var(--widget-shadow);
  padding: var(--space-5) 28px;
  max-width: 360px;
  width: calc(100% - 48px);
}

.confirm-dialog__note {
  color: var(--muted);
  font-size: 13px;
  margin-top: 4px;
}

.confirm-dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 20px;
}
</style>
