<template>
  <div class="gogo">
    <img alt="gogo-logo" src="@/assets/gogo-logo.png" />
    <div>
      <button @click="connectGoGoDevice()">Connect device</button>
      <h3>GoGo Report</h3>
      <ul>
        {{
          report && report.board.typeName
        }}
      </ul>
    </div>

    <div>
      <h3>Sensor values</h3>
      <ul>
        {{
          sensors
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

        <button
          @click="downloadLogoProgram()"
          :disabled="!boardStatus"
          :title="actionHint"
        >
          Download
        </button>
      </div>
    </div>

    <div>
      <h3>Logo Opcodes</h3>
      <br />
      <div>
        <textarea v-model="logoOpcodes" placeholder="Enter the logo opcodes">
        </textarea>
        <div></div>

        <button
          @click="downloadOpcodeToBoard()"
          :disabled="!boardStatus"
          :title="actionHint"
        >
          Download
        </button>
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
      <button
        @click="sendControlCommand()"
        :disabled="!boardStatus"
        :title="actionHint"
      >
        Send command
      </button>
    </div>

    <p class="action-message" :class="{ 'is-error': actionFailed }">
      {{ actionMessage }}
    </p>
  </div>
</template>

<script>
import { mapActions, mapGetters } from "vuex";
import { CATEGORY, CMD, MEMORY_CMD } from '@/gogo/protocol'
import { compilerUrl } from '@/config'

export default {
  name: "GoGoAPI",
  data: function () {
    return {
      logoProgram: "",
      logoOpcodes: "",
      cmdCategory: 0,
      cmdID: 0,
      cmdParams: "",
      actionMessage: "",
      actionFailed: false,
    };
  },
  props: {
    msg: String,
  },
  computed: {
    ...mapGetters(["report", "boardStatus"]),

    actionHint: function () {
      return this.boardStatus ? "" : "Connect a GoGo Board first";
    },

    firmwareVersion: function () {
      return this.report ? this.report.board.firmwareMajor : 0;
    },

    sensors: function () {
      return this.report ? this.report.sensors : [];
    },
  },
  methods: {
    ...mapActions(["connect", "send"]),

    connectGoGoDevice: function () {
      this.connect();
    },

    reportAction: function (message, failed) {
      this.actionMessage = message;
      this.actionFailed = !!failed;
    },

    setLogoMemoryPointer: function () {
      return this.send({
        category: CATEGORY.MEMORY,
        command: MEMORY_CMD.SET_LOGO_POINTER,
        params: [0, 0],
      });
    },

    writeLogoMemory: async function (content) {
      for (let offset = 0; offset < content.length; offset += 60) {
        const chunk = content.slice(offset, offset + 60);
        await this.send({
          category: CATEGORY.MEMORY,
          command: MEMORY_CMD.WRITE_BYTES,
          params: [chunk.length].concat(Array.from(chunk)),
        });
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      //? the firmware commits to NVS on a chunk shorter than 60, so a program
      //? whose length is an exact multiple needs a final empty write
      if (content.length % 60 === 0) {
        await this.send({
          category: CATEGORY.MEMORY,
          command: MEMORY_CMD.WRITE_BYTES,
          params: [0],
        });
      }
    },

    downloadOpcodeToBoard: async function (logoOpcode) {
      if (!this.boardStatus) {
        this.reportAction("Connect a GoGo Board first.", true);
        return;
      }

      //? called with no argument from the Logo Opcodes textarea
      if (!logoOpcode) {
        if (!this.logoOpcodes) {
          this.reportAction("Enter the logo opcodes first.", true);
          return;
        }
        try {
          logoOpcode = JSON.parse(this.logoOpcodes);
        } catch (error) {
          this.reportAction("Logo opcodes must be a JSON array of bytes.", true);
          return;
        }
      }

      await this.setLogoMemoryPointer();
      await this.writeLogoMemory(logoOpcode);
      await this.send({ category: CATEGORY.CONTROL, command: CMD.BEEP });
      this.reportAction("Downloaded to the board.", false);
    },

    downloadLogoProgram: function () {
      if (!this.boardStatus) {
        this.reportAction("Connect a GoGo Board first.", true);
        return;
      }
      if (!this.logoProgram) {
        this.reportAction("Enter a logo program first.", true);
        return;
      }

      this.reportAction("Compiling...", false);

      var sendingData = {
        logo: this.logoProgram,
        firmware_version: this.firmwareVersion,
        board_type: this.report.board.type,
        board_version: this.report.board.hardwareId,
      };

      this.$http
        .post(compilerUrl, sendingData, { emulateJSON: true })
        .then(
          (response) => {
            if (response.data.data != undefined) {
              this.downloadOpcodeToBoard(response.data.data);
            } else {
              this.reportAction("Compiler returned no bytecode.", true);
            }
          },
          (response) => {
            if (
              response.data &&
              response.data.status &&
              response.data.status >= 500 &&
              response.data.status < 600
            ) {
              this.reportAction("Syntax error in the logo program.", true);
            } else {
              this.reportAction("Cloud compiler unavailable.", true);
            }
          }
        );
    },

    sendControlCommand: function () {
      if (!this.boardStatus) {
        this.reportAction('Connect a GoGo Board first.', true)
        return
      }
      const params = this.cmdParams
        ? this.cmdParams.split(',').map((value) => parseInt(value, 10))
        : []
      this.send({
        category: Number(this.cmdCategory),
        command: Number(this.cmdID),
        params,
      })
      this.reportAction(
        'Sent category ' + this.cmdCategory + ', command ' + this.cmdID + '.',
        false
      )
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
