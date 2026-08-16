<template>
  <section class="page">
    <h1 class="page-title">Datalog</h1>

    <h2 class="section-label">Sync</h2>

    <div class="datalog-actions">
      <button
        class="btn btn--primary"
        @click="syncOfflineDatalogRecords()"
        :disabled="!boardStatus || startRetrivedOfflineDatalog"
        :title="actionHint"
      >
        Sync Data
      </button>
      <button
        class="btn btn--danger"
        @click="confirmingDelete = true"
        :disabled="!boardStatus || startRetrivedOfflineDatalog"
        :title="actionHint"
      >
        Delete Data
      </button>
    </div>

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

    <div class="progress-bar" v-if="startRetrivedOfflineDatalog">
      <progress-bar size="medium" :bar-color="progressBarColor" :val="percentage" />
    </div>

    <p class="action-message" :class="{ 'is-error': actionFailed }" aria-live="polite">{{ actionMessage }}</p>

    <p v-if="!datalogRecords.length" class="page__empty">
      No records loaded. Press Sync Data to pull them off the board.
    </p>
    <div v-else class="chart-container">
      <datalog-chart ref="datalogChart" />
    </div>

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
  parseFileSizes, parseLookupTable, parseDatalogRecords,
} from '@/gogo/protocol'
import DatalogChart from "@/components/Chart.vue";
import ProgressBar from "vue-simple-progress";
import DatePicker from "vue2-datepicker";
import "vue2-datepicker/index.css";
import boardAction from "@/mixins/boardAction";

export default {
  name: "Datalog",
  components: {
    DatalogChart,
    ProgressBar,
    DatePicker,
  },
  mixins: [boardAction],
  data: function () {
    return {
      startRetrivedOfflineDatalog: false,
      confirmingDelete: false,
      dataChunk: [],
      lookupTable: [],
      datalogRecords: [],
      lookupTableFileSize: 0,
      datalogRecordsFileSize: 0,
      percentage: 0,
      dateTimeOffset: null,
      progressBarColor: "#a5d442", //? --gogo-green
    };
  },
  computed: {
    ...mapGetters(["lastResponse"]),
  },
  watch: {
    lastResponse: function (packet) {
      if (!this.startRetrivedOfflineDatalog) return
      this.unpackOfflineDatalogPackets(packet)
    },

    //* a mid-sync disconnect must not leave both buttons disabled forever —
    //* only reconnecting should ever require a page reload before this fix
    boardStatus: function (connected) {
      if (connected || !this.startRetrivedOfflineDatalog) return
      this.startRetrivedOfflineDatalog = false
      this.dataChunk = []
      this.reportAction('Sync interrupted - board disconnected.', true)
    },
  },
  methods: {
    ...mapActions(["send", "clearResponse"]),

    //? Add function for refresh date on you pick
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
        this.reportAction('Reading file sizes...')
        return
      }

      if (packet.status === DATALOG_STATUS.LOOKUP_TABLE) {
        this.lookupTable = parseLookupTable(
          Uint8Array.from(this.dataChunk), this.lookupTableFileSize
        )
        this.dataChunk = []
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
        this.reportAction('Loaded ' + records.length + ' records.')
        this.finishSync()
        return
      }

      this.reportAction('Syncing...')
    },

    finishSync: function () {
      this.startRetrivedOfflineDatalog = false
      this.clearResponse()
    },

    syncOfflineDatalogRecords: async function () {
      if (!this.requireBoard()) return;

      if (!this.startRetrivedOfflineDatalog) {
        //? clear all variables
        this.dataChunk = [];
        this.lookupTable = [];
        this.datalogRecords = [];
        this.lookupTableFileSize = 0;
        this.datalogRecordsFileSize = 0;
        this.percentage = 0;

        //? set flag to retrieve new packets
        this.startRetrivedOfflineDatalog = true;
        this.actionFailed = false;

        try {
          await this.send({ category: CATEGORY.EVENT_REQUEST, command: EVENT_CMD.GET_DATALOG })
        } catch (error) {
          //? both buttons are disabled while this flag is set, with no other reset
          this.startRetrivedOfflineDatalog = false;
          this.reportAction(error.message, true);
        }
      }
    },

    clearData: async function () {
      //? always dismiss the dialog, otherwise a refused delete leaves it stuck open
      this.confirmingDelete = false;

      if (this.startRetrivedOfflineDatalog) {
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
  justify-content: center;
  gap: var(--gap);
  margin-bottom: 1.5em;
}

.datapicker {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 0.5em;
}

.datapicker__label {
  font-weight: 700;
  font-size: 13px;
  margin-bottom: 4px;
}

.datapicker__help {
  max-width: 480px;
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--muted);
  text-align: center;
}

.progress-bar {
  width: 50%;
  margin: 1em auto;
}

.chart-container {
  width: 100%;
  margin: 1em auto;
}

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
  border-radius: var(--radius-card);
  padding: 24px 28px;
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

.btn--danger {
  color: var(--gogo-pink-text);
  background: var(--gogo-pink-tint);
  border-color: var(--gogo-pink);
}

.btn--danger:hover:not([disabled]) {
  background: var(--gogo-pink-tint);
}
</style>
