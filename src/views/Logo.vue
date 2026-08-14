<template>
  <section class="page">
    <h2 class="section-label">Examples</h2>
    <div class="control-row">
      <button
        v-for="example in examples"
        :key="example.label"
        class="btn"
        @click="loadExample(example.program)"
      >{{ example.label }}</button>
    </div>

    <h2 class="section-label">Logo Program</h2>
    <textarea
      class="textarea"
      v-model="logoProgram"
      placeholder="Enter the logo program"
    ></textarea>
    <button
      class="btn btn--primary"
      @click="downloadLogoProgram()"
      :disabled="!boardStatus"
      :title="actionHint"
    >
      Download
    </button>

    <template v-if="compiledOpcodes">
      <h2 class="section-label">Compiled Opcodes</h2>
      <byte-dump :bytes="compiledOpcodes" />
    </template>

    <h2 class="section-label">Logo Opcodes</h2>
    <textarea
      class="textarea textarea--mono"
      v-model="logoOpcodes"
      placeholder="Enter the logo opcodes"
    ></textarea>
    <button
      class="btn btn--primary"
      @click="downloadOpcodeToBoard()"
      :disabled="!boardStatus"
      :title="actionHint"
    >
      Download
    </button>

    <p class="action-message" :class="{ 'is-error': actionFailed }">
      {{ actionMessage }}
    </p>
  </section>
</template>

<script>
import { mapActions, mapGetters } from "vuex";
import { CATEGORY, CMD, MEMORY_CMD } from "@/gogo/protocol";
import { compilerUrl } from "@/config";
import ByteDump from "@/components/ByteDump.vue";

const EXAMPLES = [
  {
    label: "Beep every second",
    program: "to start\n  forever [\n    beep\n    wait 1000\n  ]\nend",
  },
  {
    label: "Beep three times",
    program: "to start\n  repeat 3 [\n    beep\n    wait 100\n  ]\n  show 99\nend",
  },
];

export default {
  name: "Logo",
  components: { ByteDump },
  data: function () {
    return {
      logoProgram: "",
      logoOpcodes: "",
      compiledOpcodes: null,
      actionMessage: "",
      actionFailed: false,
      examples: EXAMPLES,
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

    loadExample: function (program) {
      this.logoProgram = program;
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

      try {
        await this.setLogoMemoryPointer();
        await this.writeLogoMemory(logoOpcode);
        await this.send({ category: CATEGORY.CONTROL, command: CMD.BEEP });
        this.reportAction("Downloaded to the board.", false);
      } catch (error) {
        this.reportAction(error.message, true);
      }
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
              this.compiledOpcodes = response.data.data;
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

<style scoped>
.textarea {
  display: block;
  box-sizing: border-box;
  width: 100%;
  min-height: 120px;
  margin: 0 0 10px;
  padding: var(--pad);
  font-family: inherit;
  font-size: 14px;
  color: var(--gogo-ink);
  background: var(--card-bg);
  border: 1px solid var(--hairline);
  border-radius: var(--radius-card);
  resize: vertical;
}

.textarea--mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
</style>
