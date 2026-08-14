<template>
  <section class="page">
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

    <p class="action-message" :class="{ 'is-error': actionFailed }">
      {{ actionMessage }}
    </p>
  </section>
</template>

<script>
import { mapActions, mapGetters } from "vuex";
import { CATEGORY, CMD, MEMORY_CMD } from "@/gogo/protocol";
import { compilerUrl } from "@/config";

export default {
  name: "Logo",
  data: function () {
    return {
      logoProgram: "",
      logoOpcodes: "",
      actionMessage: "",
      actionFailed: false,
    };
  },
  computed: {
    ...mapGetters(["report", "boardStatus"]),

    actionHint: function () {
      return this.boardStatus ? "" : "Connect a GoGo Board first";
    },

    firmwareVersion: function () {
      return this.report ? this.report.board.firmwareMajor : 0;
    },
  },
  methods: {
    ...mapActions(["send"]),

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
  },
};
</script>
