<template>
  <section class="page">
    <h1 class="page-title">Logo</h1>

    <!--? two alternative ways to put a program on the board, never two steps of one flow -->
    <div class="tabs" role="tablist">
      <button
        class="tabs__tab"
        :class="{ 'is-active': mode === 'program' }"
        :aria-selected="mode === 'program'"
        role="tab"
        @click="mode = 'program'"
      >
        Logo program
      </button>
      <button
        class="tabs__tab"
        :class="{ 'is-active': mode === 'opcodes' }"
        :aria-selected="mode === 'opcodes'"
        role="tab"
        @click="mode = 'opcodes'"
      >
        Raw opcodes
      </button>
    </div>

    <p v-if="!isBoardReady" class="page__empty page__empty--compact">Connect a GoGo Board to use these controls.</p>

    <template v-if="mode === 'program'">
      <p class="tabs__hint">Write Logo source, compile it in the cloud, and send the result to the board.</p>

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
        :disabled="!isBoardReady"
        :title="actionHint"
      >
        Send to board
      </button>

      <template v-if="compiledOpcodes">
        <div class="section-row">
          <h2 class="section-label">{{ compiledOpcodesHeading }}</h2>
          <button class="btn btn--small" @click="copyOpcodes()">Copy opcodes</button>
        </div>
        <byte-dump :bytes="compiledOpcodes" />
      </template>

      <template v-if="compileError">
        <h2 class="section-label">Compiler error</h2>
        <pre class="bytes bytes--error">{{ compileError }}</pre>
      </template>
    </template>

    <template v-else>
      <p class="tabs__hint">Paste a pre-compiled byte array and send it straight to the board, skipping the compiler.</p>

      <h2 class="section-label">Logo Opcodes</h2>
      <textarea
        class="textarea textarea--mono"
        v-model="logoOpcodes"
        placeholder="Enter the logo opcodes"
      ></textarea>
      <button
        class="btn btn--primary"
        @click="downloadOpcodeToBoard()"
        :disabled="!isBoardReady"
        :title="actionHint"
      >
        Send to board
      </button>
    </template>

    <p class="action-message" :class="{ 'is-error': actionFailed }" aria-live="polite">
      {{ actionMessage }}
    </p>
  </section>
</template>

<script>
import { mapActions, mapGetters } from "vuex";
import {
  CATEGORY,
  CMD,
  MEMORY_CMD,
  MAX_LOGO_BYTECODE_LENGTH,
  buildLogoWriteSequence,
} from "@/gogo/protocol";
import { compilerUrl } from "@/config";
import ByteDump from "@/components/ByteDump.vue";
import boardAction from "@/mixins/boardAction";

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
  mixins: [boardAction],
  data: function () {
    return {
      mode: "program",
      logoProgram: "",
      logoOpcodes: "",
      compiledOpcodes: null,
      compileError: null,
      sentToBoard: false,
      examples: EXAMPLES,
    };
  },
  computed: {
    ...mapGetters(["report"]),

    compiledOpcodesHeading: function () {
      return this.sentToBoard
        ? "Compiled opcodes · sent to the board"
        : "Compiled opcodes";
    },

    firmwareVersion: function () {
      return this.report ? this.report.board.firmwareMajor : 0;
    },
  },
  methods: {
    ...mapActions(["send"]),

    loadExample: function (program) {
      this.logoProgram = program;
    },

    //? async Clipboard API only — no clipboard library added for this
    copyOpcodes: async function () {
      try {
        await navigator.clipboard.writeText(JSON.stringify(Array.from(this.compiledOpcodes)));
        this.reportAction("Opcodes copied to the clipboard.", false);
      } catch (error) {
        this.reportAction("Could not copy opcodes: " + error.message, true);
      }
    },

    setLogoMemoryPointer: function () {
      return this.send({
        category: CATEGORY.MEMORY,
        command: MEMORY_CMD.SET_LOGO_POINTER,
        params: [0, 0],
      });
    },

    writeLogoMemory: async function (content) {
      for (const params of buildLogoWriteSequence(content)) {
        await this.send({
          category: CATEGORY.MEMORY,
          command: MEMORY_CMD.WRITE_BYTES,
          params,
        });
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    },

    downloadOpcodeToBoard: async function (logoOpcode) {
      if (!this.requireBoard()) {
        this.sentToBoard = false;
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

      //? an empty program is never a legitimate download — most importantly,
      //? it is exactly the zero-length write the firmware treats as "commit"
      if (!logoOpcode.length) {
        this.reportAction("No opcodes to send.", true);
        this.sentToBoard = false;
        return;
      }

      //? guarding here rather than only after a compile also covers the raw
      //? opcodes tab, which can paste an oversized array directly
      if (logoOpcode.length > MAX_LOGO_BYTECODE_LENGTH) {
        this.reportAction(
          "Program is too large for the board: " +
            logoOpcode.length +
            " bytes, limit is " +
            MAX_LOGO_BYTECODE_LENGTH +
            ".",
          true
        );
        this.sentToBoard = false;
        return;
      }

      try {
        await this.setLogoMemoryPointer();
        await this.writeLogoMemory(logoOpcode);
        await this.send({ category: CATEGORY.CONTROL, command: CMD.BEEP });
        this.reportAction("Downloaded to the board.", false);
        this.sentToBoard = true;
      } catch (error) {
        this.reportAction(error.message, true);
        this.sentToBoard = false;
      }
    },

    downloadLogoProgram: function () {
      if (!this.requireBoard()) return;
      if (!this.logoProgram) {
        this.reportAction("Enter a logo program first.", true);
        return;
      }

      this.reportAction("Compiling...", false);
      this.sentToBoard = false;
      this.compileError = null;

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
            //? the compiler returns HTTP 200 for a syntax error too, with
            //? result: false and the error in message — so branch on result,
            //? never on whether data happens to be non-empty
            //*  order mirrors GoGoCode's compileAndDownloadSecond
            //*  (gogo-code/src/services/deviceControl.js:1215): result first,
            //*  then the bytecode-length limit, then download — deliberately
            //*  matched rather than arrived at independently
            const body = response.data;

            if (!body || !body.result) {
              this.compiledOpcodes = null;
              this.compileError = (body && body.message) || null;
              this.reportAction(
                this.compileError ? "Compile error - see details below." : "Compiler returned an unexpected response.",
                true
              );
              return;
            }

            if (body.data.length > MAX_LOGO_BYTECODE_LENGTH) {
              this.compiledOpcodes = null;
              this.compileError = null;
              this.reportAction(
                "Logo program is " + body.data.length + " bytes, over the board's " +
                  MAX_LOGO_BYTECODE_LENGTH + "-byte limit.",
                true
              );
              return;
            }

            this.compileError = null;
            this.compiledOpcodes = body.data;
            this.downloadOpcodeToBoard(body.data);
          },
          () => {
            //? a real transport failure, not a compile error — the compiler
            //? itself always answers with HTTP 200
            this.reportAction("Cloud compiler unavailable.", true);
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

.section-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

/*? .bytes is the monospace block token, already a <pre> that preserves
    whitespace; this just picks up the same error colour as
    .action-message.is-error */
.bytes--error {
  color: var(--gogo-pink-text);
}

.tabs {
  display: flex;
  gap: 4px;
  padding: 4px;
  margin-bottom: 6px;
  background: var(--card-bg);
  border: 1px solid var(--hairline);
  border-radius: var(--radius-pill);
}

.tabs__tab {
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
  color: var(--muted);
  background: transparent;
  border: 0;
  border-radius: var(--radius-pill);
  padding: 9px 20px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.tabs__tab:hover:not(.is-active) {
  background: var(--gogo-green-tint);
}

/*? active state carries weight and fill, not colour alone */
.tabs__tab.is-active {
  color: var(--gogo-ink);
  background: var(--gogo-green);
}

.tabs__hint {
  margin: 0;
  font-size: 13px;
  color: var(--muted);
}
</style>
