<template>
  <div class="Graph">
    <div class="datapicker">
      <date-picker v-model="dateTimeOffset" type="datetime" placeholder="select offset timestamp" value-type="timestamp"
        @change="onSelectedDate()"></date-picker>
    </div>
    <ul class="bt-container">
      <button class="sync-bt" @click="syncOfflineDatalogRecords()">
        Sync Data
      </button>
      <button class="delete-bt" @click="$vm2.open('modal')">
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
import { CONST } from "@/store/const";
import DatalogChart from "@/components/Chart.vue";
import Dropdown from "vue-dropdowns";
import ProgressBar from "vue-simple-progress";
import DatePicker from "vue2-datepicker";
import "vue2-datepicker/index.css";

export default {
  name: "Graph",
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
    ...mapGetters(["gogoResponse", "boardStatus"]),

    computePacket() {
      if (this.startRetrivedOfflineDatalog) {
        this.offlineDatalogStatus = this.unpackOfflineDatalogPackets(
          this.gogoResponse
        );
      }
    },
  },
  mounted() { },
  created() { },
  methods: {
    ...mapActions(["sendHID", "clearResponseHID", "debugEnabled"]),

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

    splitRecordsToChartSeries: function (retrievedRecords) {
      let chartSeries = [];
      retrievedRecords.forEach((record) => {
        //* every() -> it stops iterating through the array whenever the callback function returns a falsy value.
        let notFoundExistField = chartSeries.every(
          (eachFieldInChannel) => {
            //! if field exist need to return false
            if (eachFieldInChannel["name"] == record[1]) {
              eachFieldInChannel["data"].push([record[0], record[2]]);
              return false;
            }
            return true;
          }
        );
        //! in case of field not exist
        if (notFoundExistField) {
          chartSeries.push({
            name: record[1],
            data: [[record[0], record[2]]],
            animation: false,
          });
          // console.log('field not exist: ', chartSeries)
        }
      });
      // console.log('chart: ', chartSeries)

      //? sorted by timestamp without changing value ascending
      // for (const [key, channelRecords] of Object.entries(chartSeries)) {
      //   channelRecords.forEach((fieldRecords) => {
      //     fieldRecords["data"].sort((a, b) => a[0] - b[0]);
      //   });
      // }
      return chartSeries;
    },

    unpackOfflineDatalogPackets: function (packet) {
      if (packet.data) {
        this.dataChunk.push.apply(this.dataChunk, packet.data);

        //todo - update progress percentage by retrieved file size
        if (this.datalogRecordsFileSize + this.lookupTableFileSize) {
          this.percentage += (packet.size / (this.datalogRecordsFileSize + this.lookupTableFileSize)) * 100;
        }

        if (packet.status == CONST.offline_datalog_status_empty) {
          this.startRetrivedOfflineDatalog = false;
          this.clearResponseHID();

          return "this file is empty";
        }

        // NOTE: - retrieve files size
        else if (packet.status == CONST.offline_datalog_status_file_size) {
          let startPoint = 0;
          for (let i = 0; i < packet.size; i++) {
            if (String.fromCharCode(this.dataChunk[i]) == "\n") {
              let tmpSize = parseInt(String.fromCharCode.apply(String, this.dataChunk.slice(startPoint, i)));
              !startPoint
                ? (this.lookupTableFileSize = tmpSize)
                : (this.datalogRecordsFileSize = tmpSize);
              startPoint = i + 1;
            }
          }
          this.dataChunk = [];
          startPoint = 0;

          console.log(this.lookupTableFileSize, this.datalogRecordsFileSize);
          return "retrieved file size...";
        }

        // NOTE: - retrieve lookup table
        else if (packet.status == CONST.offline_datalog_status_lookup_table) {
          let startPoint = 0;
          for (let i = 0; i < this.lookupTableFileSize; i++) {
            if (String.fromCharCode(this.dataChunk[i]) == ",") {
              this.lookupTable.push(String.fromCharCode.apply(String, this.dataChunk.slice(startPoint, i)));
              startPoint = i + 1;
            }
          }
          this.dataChunk = [];

          console.log(this.lookupTable);
          console.time('retrieve_records')
          return "retrieved lookup table...";
        }

        // NOTE: - retrieve datalog records and parseing each record
        else if (packet.status == CONST.offline_datalog_status_records) {
          let eachRecord = [];
          let records = [];
          console.time('receive_records')
          for (let i = 1; i <= this.datalogRecordsFileSize; i++) {
            eachRecord.push(this.dataChunk[i - 1]);
            if (i % CONST.offline_datalog_record_size == 0) {
              records.push(eachRecord);
              eachRecord = [];
            }
          }
          console.timeEnd('retrieve_records')
          this.debugEnabled(false);

          console.time('parse_records')
          records.forEach((record) => {
            this.datalogRecords.push([
              parseInt(
                new Uint32Array(new Uint8Array(record.slice(0, 4)).buffer)[0]
              ) * 1000,
              this.lookupTable[
              new Uint16Array(new Uint8Array(record.slice(4, 6)).buffer)[0]
              ],
              new Float32Array(new Uint8Array(record.slice(6, 10)).buffer)[0],
            ]);
          });
          this.dataChunk = [];

          console.timeEnd('parse_records')
          // console.log(records)

          // NOTE: - convert retrieved records to highcharts series object
          console.time('parse_charts')
          this.datalogRecords = this.splitRecordsToChartSeries(records);
          console.timeEnd('parse_charts')
          // console.log(this.datalogRecords);

          //? clearing all related data stream variables
          this.startRetrivedOfflineDatalog = false;
          this.clearResponseHID();

          return this.updateRenderGraph();
        }

        return "Syncing...";
      }
    },

    sendCommand: function (data, callback) {
      var cmdPacket = new Array(64).fill(0); //? HID data 64 bytes ** include report ID
      for (var i in data) {
        cmdPacket[parseInt(i)] = data[i];
      }
      this.sendHID(cmdPacket);

      if (typeof callback === "function") {
        callback();
      }
    },

    syncOfflineDatalogRecords: function () {
      if (!this.startRetrivedOfflineDatalog && this.boardStatus) {
        //? clear all variables
        this.dataChunk = [];
        this.lookupTable = [];
        this.datalogRecords = [];
        this.lookupTableFileSize = 0;
        this.datalogRecordsFileSize = 0;
        this.percentage = 0;

        //? set flag to retrieve new packets
        this.startRetrivedOfflineDatalog = true;

        var cmdList = [];
        cmdList[CONST.category_id_index] = CONST.response_packet_type;
        cmdList[CONST.command_id_index] = CONST.rcmd_get_offline_datalog;

        this.sendCommand(cmdList, null);

        this.debugEnabled(true);
      }
    },

    clearData() {
      if (!this.startRetrivedOfflineDatalog && this.boardStatus) {
        var cmdList = [];
        cmdList[CONST.category_id_index] = CONST.response_packet_type;
        cmdList[CONST.command_id_index] = CONST.rcmd_clear_offline_datalog;

        this.sendCommand(cmdList, null);
        alert("Data in GoGoBoard has been deleted");
        this.$vm2.close("modal");
      }
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
