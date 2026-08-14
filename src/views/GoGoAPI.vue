<template>
  <div class="gogo">
    <img alt="gogo-logo" src="@/assets/gogo-logo.png" />
    <div>
      <button @click="connectGoGoDevice()">Connect device</button>
      <h3>GoGo Report</h3>
      <ul>
        {{
          gogoReport
        }}
      </ul>
    </div>

    <div>
      <h3>Sensor values</h3>
      <ul>
        {{
          processSensor
        }}
      </ul>
    </div>

    <div>
      <h3>Logo Program</h3>
      <br />
      <div>
        <textarea v-model="logoProgram" placeholder="Enter the logo program">
        </textarea>
        <div></div>

        <button @click="downloadLogoProgram()">Download</button>
      </div>
    </div>

    <div>
      <h3>Logo Opcodes</h3>
      <br />
      <div>
        <textarea v-model="logoOpcodes" placeholder="Enter the logo opcodes">
        </textarea>
        <div></div>

        <button @click="downloadOpcodeToBoard()">Download</button>
      </div>
    </div>

    <div>
      <h3>Raw commands</h3>
      <br />
      <div>
        <li>Category ID: <input type="number" v-model="cmdCategory" /></li>
        <li>Command ID: <input type="number" v-model="cmdID" /></li>
        <li>Command Params: <input type="text" v-model="cmdParams" /></li>
      </div>
      <br />
      <button @click="sendControlCommand()">Send command</button>
    </div>
  </div>
</template>

<script>
import { mapActions, mapGetters } from "vuex";
import { CONST } from "../store/const";

export default {
  name: "GoGoAPI",
  data: function () {
    return {
      logoProgram: "",
      logoOpcodes: "",
      cmdCategory: 0,
      cmdID: 0,
      cmdParams: "",
    };
  },
  props: {
    msg: String,
  },
  computed: {
    ...mapGetters(["gogoReport", "boardStatus"]),

    //? GoGo 6 and 7 report major.minor.patch from index 19; older boards a single byte at 20
    firmwareVersion: function () {
      var boardType = this.gogoReport[CONST.board_type_index];
      var isGogo6OrLater =
        boardType == CONST.board_type_gogo6 || boardType == CONST.board_type_gogo7;

      return this.gogoReport[
        isGogo6OrLater
          ? CONST.firmware_version_index
          : CONST.legacy_firmware_version_index
      ];
    },

    processSensor: function () {
        var sensor_values = new Uint16Array(CONST.sensor_count)
        for (var i = 0; i < CONST.sensor_count; i++)
        {
            var index = CONST.sensor_start_index + i * 2
            sensor_values[i] = (this.gogoReport[index] << 8) + this.gogoReport[index + 1]
        }
        return sensor_values
    },
  },
  methods: {
    ...mapActions(["connectDevice", "sendHID"]),

    connectGoGoDevice: function () {
      this.connectDevice();
    },

    sendCommand: function (data, callback) {
      var cmdPacket = new Array(64).fill(0); //? HID data 64 bytes ** include report ID
      for (var i in data) {
        cmdPacket[parseInt(i)] = data[i];
      }
      // console.log(cmdPacket);
      this.sendHID(cmdPacket);

      if (typeof callback === "function") {
        callback();
      }
    },

    setLogoMemoryPointer: function (callback) {
      var cmdList = [];
      cmdList[CONST.category_id_index] = 1;
      cmdList[CONST.command_id_index] = 1;
      cmdList[CONST.parameters_index] = 0;
      cmdList[CONST.parameters_index + 1] = 0;
      this.sendCommand(cmdList, callback);
    },

    writeLogoMemory: function (content, callback, offset) {
      offset = offset || 0;
      if (offset > content.length) {
        if (typeof callback === "function") {
          callback();
        }
        return;
      }

      /* Write content to the flash memory */
      var txLength = content.length;

      var cmdList = [];
      cmdList[CONST.category_id_index] = 1;
      cmdList[CONST.command_id_index] = 3;

      //? set parameter 1 for content length
      //* # if the content cannot fit in one packet
      if (txLength - offset > 60) {
        cmdList[CONST.parameters_index] = 60;
      } else {
        cmdList[CONST.parameters_index] = txLength - offset;
      }

      // # copy the content to be transmitted to the output buffer
      for (var i = 0; i < cmdList[CONST.parameters_index]; i++) {
        cmdList[CONST.parameters_index + 1 + Number(i)] =
          content[offset + Number(i)];
      }
      offset += 60;

      this.sendCommand(cmdList, () => {
        setTimeout(() => {
          this.writeLogoMemory(content, callback, offset);
        }, 10);
      });
    },

    downloadOpcodeToBoard: function (logoOpcode) {
      if (!logoOpcode && this.logoOpcodes && this.boardStatus) {
        logoOpcode = JSON.parse(this.logoOpcodes)
      }
      console.info(logoOpcode)

      this.setLogoMemoryPointer(() => {
        this.writeLogoMemory(
          logoOpcode,
          () => {
            setTimeout(() => {
              //* sending beep packet
              var cmdList = [];
              cmdList[CONST.category_id_index] = 0;
              cmdList[CONST.command_id_index] = 11;
              this.sendCommand(cmdList, null);
            }, 15);
          },
          0
        );
      });
    },

    downloadLogoProgram: function () {
      if (this.logoProgram && this.boardStatus) {
        console.log(this.logoProgram);

        var sendingData = {
          logo: this.logoProgram,
          firmware_version: this.firmwareVersion,
          board_type: this.gogoReport[CONST.board_type_index],
          board_version: this.gogoReport[CONST.board_version_index],
        };

        this.$http
          .post(CONST.compiler_url, sendingData, { emulateJSON: true })
          .then(
            (response) => {
              if (response.data.data != undefined) {
                console.info(response.data);
                this.downloadOpcodeToBoard(response.data.data);
              } else {
                console.error(response.data);
              }
            },
            (response) => {
              if (
                response.data &&
                response.data.status &&
                response.data.status >= 500 &&
                response.data.status < 600
              ) {
                console.error("syntax error");
              } else {
                console.error("cloud service unavailable");
              }
            }
          );
      } else {
        console.error("board not connected or no logo program to download");
      }
    },

    sendControlCommand: function () {
      var cmdList = [];
      cmdList[CONST.category_id_index] = Number(this.cmdCategory);
      cmdList[CONST.command_id_index] = Number(this.cmdID);

      var params = "";
      if (this.cmdParams != "") params = this.cmdParams.split(",");

      for (var i in params)
        cmdList[CONST.parameters_index + parseInt(i)] = parseInt(
          params[parseInt(i)]
        );

      this.sendCommand(cmdList, null);
    },
  },
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
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

button {
  font-size: 0.8em;
  cursor: pointer;
  outline: none;
  padding: 0.75em 2em;
  border-radius: 2em;
  display: inline-block;
  color: #09af32;
  background-color: transparent;
  transition: all 0.15s ease;
  box-sizing: border-box;
  border: 1px solid #09af32;
}

button.alt {
  color: #fff;
  background-color: #851e3e;
}
</style>
