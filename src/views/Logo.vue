<template>
  <section class="page">
    <div class="page-head">
      <h1 class="page-title">Logo</h1>
      <p class="page-lede">
        Compile Logo source in the cloud and write the bytecode to the board in 60-byte chunks.
        Or skip the compiler and send opcodes yourself.
      </p>
    </div>

    <!--? two alternative ways to put a program on the board, never two steps of one flow -->
    <div class="tabs" role="tablist">
      <button
        class="tabs__tab"
        :class="{ 'is-active': mode === 'program' }"
        :aria-selected="mode === 'program'"
        role="tab"
        @click="mode = 'program'"
      >
        Logo source
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

    <p v-if="!isBoardReady" class="page__empty page__empty--compact">
      Connect a GoGo Board to download. Compiling works without one.
    </p>

    <template v-if="mode === 'program'">
      <p class="tabs__hint">Write Logo source, compile it in the cloud, and send the result to the board.</p>

      <div class="section-row">
        <h2 class="section-label">Examples</h2>
        <guide-link to="/reference/logo#control">Loops, tests and other control flow</guide-link>
      </div>
      <div class="control-row">
        <button
          v-for="example in examples"
          :key="example.label"
          class="btn"
          @click="loadExample(example.program)"
        >{{ example.label }}</button>
      </div>

      <div class="section-row">
        <h2 class="section-label">Program</h2>
        <guide-link to="/reference/protocol#logo-download">How a program reaches the board</guide-link>
      </div>

      <!--? on-ramp for someone about to write line one — collapsed so it
           does not compete with the editor once they already know the syntax -->
      <details class="syntax-panel">
        <summary class="syntax-panel__summary">Syntax at a glance</summary>
        <dl class="syntax-panel__list">
          <div>
            <dt><code>to start ... end</code></dt>
            <dd>A program is a list of procedures; the file's first one runs.</dd>
          </div>
          <div>
            <dt><code>a, on</code></dt>
            <dd>Selects a port with a prefix ending in a comma, not an argument.</dd>
          </div>
          <div>
            <dt><code>[ ... ]</code></dt>
            <dd>A bracketed body for loops, tests and watchers.</dd>
          </div>
          <div>
            <dt><code>set counter 0</code></dt>
            <dd>The only assignment the language has; a bare name reads it back.</dd>
          </div>
          <div>
            <dt><code>; a comment</code></dt>
            <dd>Ignored by the compiler, runs to the end of the line.</dd>
          </div>
          <div>
            <dt><code>wait 500</code></dt>
            <dd>Pauses the program before the next statement runs.</dd>
          </div>
        </dl>
        <guide-link to="/reference/logo#shape">The full syntax reference</guide-link>
      </details>

      <span class="field-label">Logo source</span>
      <code-editor v-model="logoProgram" placeholder="Enter the logo program" />
      <button
        class="btn btn--primary"
        @click="downloadLogoProgram()"
        :disabled="!isBoardReady"
        :title="actionHint"
      >
        Compile and download
      </button>

      <template v-if="compiledOpcodes">
        <div class="section-row">
          <h2 class="section-label">Bytecode <span class="section-label__note">{{ bytecodeNote }}</span></h2>
          <button class="btn btn--small" @click="copyOpcodes()">Copy opcodes</button>
        </div>
        <byte-dump :bytes="compiledOpcodes" />

        <!--? the bytecode is not what goes on the wire — these are the frames
             that do, in send order, so the chunking rule is visible not just
             described -->
        <div class="section-row">
          <h2 class="section-label">Packets on the wire <span class="section-label__note">{{ wireNote }}</span></h2>
          <guide-link to="/reference/protocol#logo-download">Why the last chunk must be short</guide-link>
        </div>
        <div class="wire">
          <div class="wire__packet" v-for="packet in wirePackets" :key="packet.key">
            <p class="wire__title">
              <span class="wire__step">{{ packet.step }}</span>{{ packet.title }}
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
        <p class="wire__tail" v-if="wireTrimmed">
          Trailing zero bytes are cut from each dump. Every frame is {{ FRAME_SIZE }} bytes on the wire.
        </p>
      </template>

      <template v-if="compileError">
        <h2 class="section-label">Compiler error</h2>
        <pre class="bytes bytes--error">{{ compileError }}</pre>
      </template>
    </template>

    <template v-else>
      <p class="tabs__hint">Paste a pre-compiled byte array and send it straight to the board, skipping the compiler.</p>

      <div class="section-row">
        <h2 class="section-label">Program</h2>
        <guide-link to="/reference/protocol#logo-download">The 60-byte chunking rule</guide-link>
      </div>
      <span class="field-label">Raw opcodes</span>
      <code-editor v-model="logoOpcodes" mode="application/json" placeholder="[1, 3, 3, 5]" />
      <button
        class="btn btn--primary"
        @click="sendPastedOpcodes()"
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
  FRAME_SIZE,
  LOGO_CHUNK_SIZE,
  buildCommand,
  buildLogoWriteSequence,
} from "@/gogo/protocol";
import { compilerUrl } from "@/config";
import ByteDump from "@/components/ByteDump.vue";
import boardAction from "@/mixins/boardAction";
import GuideLink from "@/components/GuideLink.vue";
import { trimFrame, LEGEND_LABELS } from "@/utils/wireFrame";
import CodeEditor from "@/components/CodeEditor.vue";

const EXAMPLES = [
  {
    label: "Blink",
    program: "to start\n  forever [\n    ledon\n    wait 500\n    ledoff\n    wait 500\n  ]\nend",
  },
  {
    label: "Motor and direction",
    program:
      "to start\n  ab, setpower 60    ; power 0 to 100\n  ab, thisway\n  ab, onfor 1000\n  ab, thatway\n  ab, onfor 1000\nend",
  },
  {
    label: "Servo sweep",
    program:
      "to start\n  set angle 0\n  repeat 7 [\n    servo1, seth angle\n    set angle angle + 30\n    wait 200\n  ]\nend",
  },
  {
    label: "Sensor threshold",
    program:
      "to start\n  forever [\n    if readsensor 1 > 500 [\n      beep\n      wait 300\n    ]\n  ]\nend",
  },
  {
    label: "Counter and procedure",
    program:
      "to start\n  set count 0\n  repeat 3 [\n    set count count + 1\n    beeps count\n  ]\nend\n\nto beeps :times\n  repeat times [ beep wait 200 ]\nend",
  },
  {
    label: "Display and sound",
    program:
      'to start\n  cls\n  textpos 0 0\n  show "Hello"\n  note 60 200\n  wait 300\n  note 64 200\nend',
  },
  {
    label: "Broadcast",
    program:
      '; broadcast goes through the cloud broker, so this needs WiFi to do anything\nto start\n  setbroadcastchannel 1\n  whenreceivebroadcast "blink" [ ledon wait 300 ledoff ]\n  forever [\n    broadcast "blink"\n    wait 1000\n  ]\nend',
  },
  {
    label: "Log to datalog",
    program:
      'to start\n  forever [\n    offlinerecord readsensor 1 "light"\n    wait 1000\n  ]\nend',
  },
];

export default {
  name: "Logo",
  components: { ByteDump, GuideLink, CodeEditor },
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

    FRAME_SIZE: () => FRAME_SIZE,

    LEGEND_LABELS: () => LEGEND_LABELS,

    bytecodeNote: function () {
      const chunks = buildLogoWriteSequence(this.compiledOpcodes).length;
      return (
        this.compiledOpcodes.length + " bytes, " +
        chunks + " chunk" + (chunks === 1 ? "" : "s") + " of " + LOGO_CHUNK_SIZE +
        (this.sentToBoard ? " · sent" : "")
      );
    },

    wireNote: function () {
      return this.wirePackets.length + " frames, in send order";
    },

    //* the exact frames downloadOpcodeToBoard puts on the wire: one pointer
    //* reset, then one write per chunk. Built with the same buildCommand the
    //* send path uses, so this cannot drift from what is actually sent
    wirePackets: function () {
      const packets = [
        {
          key: "pointer",
          step: 1,
          title: "Set Logo memory pointer",
          note: "category 1, command 1, address 0",
          //? bytes 2-3 are the address, not a length — this command has none
          highlights: {
            0: "bytes__cell--category",
            1: "bytes__cell--command",
            2: "bytes__cell--payload",
            3: "bytes__cell--payload",
          },
          legend: ["category", "command", "payload"],
          bytes: trimFrame(buildCommand(CATEGORY.MEMORY, MEMORY_CMD.SET_LOGO_POINTER, [0, 0])),
        },
      ];

      const writes = buildLogoWriteSequence(this.compiledOpcodes);
      writes.forEach((params, i) => {
        const length = params[0];

        //? byte 2 is the chunk length and bytes 3+ are the bytecode itself —
        //? the length is what the firmware's NVS-commit rule turns on, so it
        //? gets its own colour rather than disappearing into the payload
        const highlights = {
          0: "bytes__cell--category",
          1: "bytes__cell--command",
          2: "bytes__cell--length",
        };
        for (let b = 0; b < length; b += 1) {
          highlights[3 + b] = "bytes__cell--payload";
        }

        packets.push({
          key: "write" + i,
          step: i + 2,
          title: length === 0 ? "Write bytes · zero-length commit" : "Write bytes",
          note:
            "category 1, command 3 · " +
            (length === 0
              ? "empty, forces the NVS commit"
              : length + " byte" + (length === 1 ? "" : "s")),
          highlights: highlights,
          legend: length === 0
            ? ["category", "command", "length"]
            : ["category", "command", "length", "payload"],
          bytes: trimFrame(buildCommand(CATEGORY.MEMORY, MEMORY_CMD.WRITE_BYTES, params)),
        });
      });

      return packets;
    },

    wireTrimmed: function () {
      return this.wirePackets.some((packet) => packet.bytes.length < FRAME_SIZE);
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

    //* click handler for the Raw opcodes tab — parses the editor content, then hands
    //* off to sendOpcodes, which is what the compile path calls directly
    sendPastedOpcodes: async function () {
      if (!this.logoOpcodes) {
        this.reportAction("Enter the logo opcodes first.", true);
        return;
      }

      let parsed;
      try {
        parsed = JSON.parse(this.logoOpcodes);
      } catch (error) {
        this.reportAction("Logo opcodes must be a JSON array of bytes.", true);
        return;
      }

      await this.sendOpcodes(parsed);
    },

    sendOpcodes: async function (logoOpcode) {
      if (!this.requireBoard()) {
        this.sentToBoard = false;
        return;
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
                this.compileError ? "Compile error - nothing was sent to the board." : "Compiler returned an unexpected response.",
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
            this.sendOpcodes(body.data);
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
.field-label {
  display: block;
  margin-bottom: 5px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
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
  color: var(--danger-on-ink);
}

.tabs {
  display: inline-flex;
  gap: 3px;
  padding: 4px;
  margin-bottom: var(--space-2);
  background: var(--sunk-bg);
  border-radius: var(--radius-pill);
}

.tabs__tab {
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
  background: transparent;
  border: 0;
  border-radius: var(--radius-pill);
  min-height: 34px;
  padding: 0 20px;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.tabs__tab:hover:not(.is-active) {
  background: var(--card-bg);
  color: var(--gogo-ink);
}

/*? active state carries weight and fill, not colour alone */
.tabs__tab.is-active {
  color: var(--gogo-ink);
  background: var(--gogo-green);
  box-shadow: var(--glow-green);
}

.tabs__hint {
  margin: 0;
  font-size: 13px;
  color: var(--muted);
}

.syntax-panel {
  margin: var(--space-3) 0 var(--space-5);
  background: var(--sunk-bg);
  border-radius: var(--radius-card);
}

.syntax-panel__summary {
  cursor: pointer;
  padding: var(--space-3) var(--pad);
  font-size: 12.5px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--gogo-ink);
}

.syntax-panel__summary::marker { color: var(--gogo-blue); }

.syntax-panel__list {
  display: grid;
  gap: var(--space-3);
  margin: 0;
  padding: 0 var(--pad) var(--pad);
}

.syntax-panel__list dt {
  font-family: var(--font-mono);
  font-size: 12.5px;
  color: var(--gogo-ink);
}

.syntax-panel__list dt code {
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--card-bg);
}

.syntax-panel__list dd {
  margin: 2px 0 0;
  font-size: 13px;
  color: var(--muted);
}

.syntax-panel > .guide-link {
  margin: 0 var(--pad) var(--pad);
}
</style>
