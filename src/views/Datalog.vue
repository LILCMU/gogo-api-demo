<template>
  <section class="page">
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
      <date-picker v-model="dateTimeOffset" type="datetime" placeholder="select offset timestamp" value-type="timestamp"
        @change="onSelectedDate()"></date-picker>
    </div>

    <div class="progress-bar" v-if="startRetrivedOfflineDatalog">
      <progress-bar size="medium" :bar-color="progressBarColor" :val="percentage" />
    </div>

    <p class="action-message" :class="{ 'is-error': statusFailed }">{{ offlineDatalogStatus }}</p>

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

export default {
  name: "Datalog",
  components: {
    DatalogChart,
    ProgressBar,
    DatePicker,
  },
  data: function () {
    return {
      offlineDatalogStatus: "",
      statusFailed: false,
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
    ...mapGetters(["lastResponse", "boardStatus"]),

    actionHint: function () {
      return this.boardStatus ? "" : "Connect a GoGo Board first";
    },
  },
  watch: {
    lastResponse: function (packet) {
      if (!this.startRetrivedOfflineDatalog) return
      this.unpackOfflineDatalogPackets(packet)
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
        this.offlineDatalogStatus = 'The board reported a failure while sending records.'
        this.statusFailed = true
        this.finishSync()
        return
      }

      if (packet.status === DATALOG_STATUS.EMPTY) {
        this.offlineDatalogStatus = 'No records stored on the board.'
        this.finishSync()
        return
      }

      if (packet.status === DATALOG_STATUS.FILE_SIZE) {
        const sizes = parseFileSizes(Uint8Array.from(this.dataChunk), packet.length)
        this.lookupTableFileSize = sizes.lookupTableSize
        this.datalogRecordsFileSize = sizes.recordsSize
        this.dataChunk = []
        this.offlineDatalogStatus = 'Reading file sizes...'
        return
      }

      if (packet.status === DATALOG_STATUS.LOOKUP_TABLE) {
        this.lookupTable = parseLookupTable(
          Uint8Array.from(this.dataChunk), this.lookupTableFileSize
        )
        this.dataChunk = []
        this.offlineDatalogStatus = 'Reading field names...'
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
        this.offlineDatalogStatus = 'Loaded ' + records.length + ' records.'
        this.finishSync()
        return
      }

      this.offlineDatalogStatus = 'Syncing...'
    },

    finishSync: function () {
      this.startRetrivedOfflineDatalog = false
      this.clearResponse()
    },

    syncOfflineDatalogRecords: async function () {
      if (!this.boardStatus) {
        this.offlineDatalogStatus = "Connect a GoGo Board first.";
        this.statusFailed = true;
        return;
      }

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
        this.statusFailed = false;

        try {
          await this.send({ category: CATEGORY.EVENT_REQUEST, command: EVENT_CMD.GET_DATALOG })
        } catch (error) {
          //? both buttons are disabled while this flag is set, with no other reset
          this.startRetrivedOfflineDatalog = false;
          this.offlineDatalogStatus = error.message;
          this.statusFailed = true;
        }
      }
    },

    clearData: async function () {
      //? always dismiss the dialog, otherwise a refused delete leaves it stuck open
      this.confirmingDelete = false;

      if (this.startRetrivedOfflineDatalog) {
        this.offlineDatalogStatus = "Still syncing - try again once it finishes.";
        this.statusFailed = true;
        return;
      }
      if (!this.boardStatus) {
        this.offlineDatalogStatus = "Connect a GoGo Board first.";
        this.statusFailed = true;
        return;
      }

      try {
        await this.send({ category: CATEGORY.EVENT_REQUEST, command: EVENT_CMD.CLEAR_DATALOG })
        this.offlineDatalogStatus = "Datalog deleted from the GoGo Board.";
        this.statusFailed = false;
      } catch (error) {
        this.offlineDatalogStatus = error.message;
        this.statusFailed = true;
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
  justify-content: center;
  margin: 0.5em;
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
