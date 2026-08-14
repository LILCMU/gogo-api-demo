<template>
  <div class="Graph">
    <div class="datapicker">
      <date-picker v-model="dateTimeOffset" type="datetime" placeholder="select offset timestamp" value-type="timestamp"
        @change="onSelectedDate()"></date-picker>
    </div>
    <ul class="bt-container">
      <button
        class="sync-bt"
        @click="syncOfflineDatalogRecords()"
        :disabled="!boardStatus || startRetrivedOfflineDatalog"
        :title="actionHint"
      >
        Sync Data
      </button>
      <button
        class="delete-bt"
        @click="$vm2.open('modal')"
        :disabled="!boardStatus || startRetrivedOfflineDatalog"
        :title="actionHint"
      >
        Delete Data
      </button>
    </ul>
    <div class="progress-bar">
      <progress-bar v-if="startRetrivedOfflineDatalog" size="medium" bar-color="	#7CFC00" :val="percentage" />
    </div>
    <div id="container">
      {{ offlineDatalogStatus }}
      {{ computePacket }}
    </div>
    <div class="chart-container">
      <datalog-chart ref="datalogChart" />
    </div>
    <div class="modals">
      <modal-vue @on-close="$vm2.close('modal')" name="modal" noHeader :footerOptions="{
        btn1: 'Cancel',
        btn2: 'Delete',
        btn2Style: {
          backgroundColor: 'red',
        },
        btn2OnClick: () => {
          clearData();
        },
        btn1OnClick: () => {
          $vm2.close('modal');
        },
      }">
        <div>
          <p>Are you sure you want to delete data from GoGoBoard ?</p>
        </div>
      </modal-vue>
    </div>
  </div>
</template>

<script>
import { mapActions, mapGetters } from "vuex";
import {
  CATEGORY, EVENT_CMD, DATALOG_STATUS,
  parseFileSizes, parseLookupTable, parseDatalogRecords,
} from '@/gogo/protocol'
import DatalogChart from "@/components/Chart.vue";
import Dropdown from "vue-dropdowns";
import ProgressBar from "vue-simple-progress";
import DatePicker from "vue2-datepicker";
import "vue2-datepicker/index.css";

export default {
  name: "Datalog",
  components: {
    DatalogChart,
    Dropdown,
    ProgressBar,
    DatePicker,
  },
  data: function () {
    return {
      cmdCategory: 0,
      cmdID: 0,
      cmdParams: "",
      offlineDatalogStatus: "",
      startRetrivedOfflineDatalog: false,
      dataChunk: [],
      lookupTable: [],
      datalogRecords: [],
      lookupTableFileSize: 0,
      datalogRecordsFileSize: 0,
      percentage: 0,
      dateTimeOffset: null,
      timestamp: 0,
      renderData: null,
    };
  },
  props: {
    msg: String,
  },
  computed: {
    ...mapGetters(["lastResponse", "boardStatus"]),

    actionHint: function () {
      return this.boardStatus ? "" : "Connect a GoGo Board first";
    },

    computePacket () {
      if (!this.startRetrivedOfflineDatalog) return ''
      return this.unpackOfflineDatalogPackets(this.lastResponse)
    },
  },
  mounted() { },
  created() { },
  methods: {
    ...mapActions(["send", "clearResponse"]),

    //? Add function for refresh date on you pick
    onSelectedDate() {
      if (this.datalogRecords) {
        this.updateRenderGraph();
      }
    },

    updateRenderGraph() {
      let nRecords = 0;
      if (this.dateTimeOffset != null) {
        this.datalogRecords.forEach((field) => {
          for (let i = 0; i < field["data"].length; i++) {
            field["data"][i][0] += this.dateTimeOffset;
          }
          return field["data"];
        });
      }
      //* pass new series data to highcharts
      this.$refs.datalogChart.chartOptions.series = this.datalogRecords;

      this.datalogRecords.forEach((eachField) => {
        nRecords += eachField["data"].length;
      });

      return "Retrieve a total of " + nRecords + " records.";
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
      if (!packet || packet.command !== EVENT_CMD.GET_DATALOG) return ''

      this.dataChunk.push.apply(this.dataChunk, Array.from(packet.payload))

      const total = this.datalogRecordsFileSize + this.lookupTableFileSize
      if (total) this.percentage += (packet.length / total) * 100

      if (packet.status === DATALOG_STATUS.EMPTY) {
        this.offlineDatalogStatus = 'No records stored on the board.'
        this.finishSync()
        return ''
      }

      if (packet.status === DATALOG_STATUS.FILE_SIZE) {
        const sizes = parseFileSizes(Uint8Array.from(this.dataChunk), packet.length)
        this.lookupTableFileSize = sizes.lookupTableSize
        this.datalogRecordsFileSize = sizes.recordsSize
        this.dataChunk = []
        return 'Reading file sizes...'
      }

      if (packet.status === DATALOG_STATUS.LOOKUP_TABLE) {
        this.lookupTable = parseLookupTable(
          Uint8Array.from(this.dataChunk), this.lookupTableFileSize
        )
        this.dataChunk = []
        return 'Reading field names...'
      }

      if (packet.status === DATALOG_STATUS.RECORDS) {
        const records = parseDatalogRecords(
          Uint8Array.from(this.dataChunk).slice(0, this.datalogRecordsFileSize),
          this.lookupTable
        )
        this.datalogRecords = this.splitRecordsToChartSeries(records)
        this.$refs.datalogChart.chartOptions.series = this.datalogRecords
        this.offlineDatalogStatus = 'Loaded ' + records.length + ' records.'
        this.finishSync()
        return ''
      }

      return 'Syncing...'
    },

    finishSync: function () {
      this.startRetrivedOfflineDatalog = false
      this.clearResponse()
    },

    syncOfflineDatalogRecords: function () {
      if (!this.boardStatus) {
        this.offlineDatalogStatus = "Connect a GoGo Board first.";
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

        this.send({ category: CATEGORY.EVENT_REQUEST, command: EVENT_CMD.GET_DATALOG })
      }
    },

    clearData() {
      //? always dismiss the dialog, otherwise a refused delete leaves it stuck open
      this.$vm2.close("modal");

      if (this.startRetrivedOfflineDatalog) {
        this.offlineDatalogStatus = "Still syncing - try again once it finishes.";
        return;
      }
      if (!this.boardStatus) {
        this.offlineDatalogStatus = "Connect a GoGo Board first.";
        return;
      }

      this.send({ category: CATEGORY.EVENT_REQUEST, command: EVENT_CMD.CLEAR_DATALOG })
      this.offlineDatalogStatus = "Datalog deleted from the GoGo Board.";
    },
  },
};
</script>

<style scoped>
h3 {
  margin: 40px 0 0;
}

ul {
  list-style-type: none;
  padding: 0;
}

li {
  display: inline-block;
  margin: 0 10px;
}

a {
  color: #42b983;
}

textarea {
  width: 500px;
  height: 200px;
}

.Graph {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  flex-direction: column;
}

.chart-container {
  width: 85%;
  margin: auto;
}

.progress-bar {
  width: 50%;
  margin: auto;
}

.bt-container {
  display: flex;
  justify-content: center;
  height: 1em;
  align-items: center;
  width: 100%;
  margin-bottom: 3em;
}

.datapicker {
  display: flex;
  justify-content: center;
  height: 2em;
  margin: 0.5em;
  align-items: center;
  width: 100%;
}

.sync-bt {
  color: #09af32;
  border: 1px solid #09af32;
}

.delete-bt {
  color: #eb4e4e;
  border: 1px solid #eb4e4e;
}

button {
  font-size: 0.8em;
  cursor: pointer;
  outline: none;
  text-align: center;
  padding: 2px 30px;
  margin: 0.5em;
  border-radius: 2em;
  display: inline;
  background-color: transparent;
  transition: all 0.15s ease;
  height: 3em;
}

button.sync-bt:hover {
  background-color: rgba(115, 238, 125, 0.3);
}

button.delete-bt:hover {
  background-color: #fdc9c9;
}

.channel-dropdown {
  border-radius: 5px;
  margin: 0.5em 1em;
}

.datapicker date-picker {
  margin: 0.5em 1em;
  border-radius: 5px;
}
</style>
