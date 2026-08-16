<template>
  <section class="page page--dev">
    <h1 class="page-title">Packets</h1>

    <div class="card">
      <h2 class="card__title">Send a command</h2>

      <div class="control-row">
        <label>Category <input type="number" v-model.number="category" /></label>
        <label>Command <input type="number" v-model.number="command" /></label>
        <label>Params <input type="text" v-model="params" placeholder="1,2,3" /></label>
        <span class="constant-name" v-if="commandName">Command {{ command }} &middot; {{ commandName }}</span>
        <button class="btn btn--primary" :disabled="!isBoardReady" :title="actionHint" @click="sendPacket()">Send</button>
      </div>

      <h2 class="section-label">Frame preview</h2>
      <pre class="bytes" v-if="preview.error">{{ preview.error }}</pre>
      <div class="split" v-else>
        <div class="split__main">
          <byte-dump :bytes="visibleFrame" :highlights="{ 0: 'bytes__cell--category', 1: 'bytes__cell--command' }" />
          <p class="bytes-note" v-if="hiddenFrameBytes">
            bytes {{ visibleFrame.length }}&ndash;62 zero &middot; sent, not shown
            <button class="btn btn--small" @click="showFullFrame = true">Show all</button>
          </p>
          <p class="bytes-note" v-else-if="showFullFrame && trimmedFrameLength < FRAME_SIZE">
            <button class="btn btn--small" @click="showFullFrame = false">Collapse</button>
          </p>
        </div>

        <dl class="facts">
          <dt><span class="bytes-legend__chip bytes-legend__chip--category">byte 0</span></dt>
          <dd>category {{ category }}</dd>
          <dt><span class="bytes-legend__chip bytes-legend__chip--command">byte 1</span></dt>
          <dd>command {{ command }}</dd>
          <dt>bytes 2+</dt>
          <dd>{{ paramBytes.length ? paramBytes.length + " param byte" + (paramBytes.length === 1 ? "" : "s") : "no params" }}</dd>
          <dt>on the wire</dt>
          <dd>{{ FRAME_SIZE }} bytes</dd>
        </dl>
      </div>

      <p class="action-message" :class="{ 'is-error': actionFailed }" aria-live="polite">{{ actionMessage }}</p>
    </div>

    <div class="card">
      <h2 class="card__title">Receiving</h2>

      <div class="card__row">
        <h2 class="section-label">Report &middot; type 0</h2>
        <button class="btn btn--small" v-if="reportRaw" @click="paused = !paused">
          {{ paused ? "Resume" : "Pause" }}
        </button>
      </div>
      <div class="split" v-if="shownReport">
        <div class="split__main">
          <byte-dump :bytes="shownReport" :highlights="reportHighlights" />
          <p class="bytes-legend">
            <span class="bytes-legend__chip bytes-legend__chip--category">byte 0</span> packet type &middot;
            <span class="bytes-legend__chip bytes-legend__chip--sensors">bytes 1&ndash;8</span> sensors &middot;
            <span class="bytes-legend__chip bytes-legend__chip--board">bytes 17&ndash;21</span> board identity
            <template v-if="paused"> &middot; frozen</template>
          </p>
        </div>

        <!--? the dead space to the right of a dump is worth more as a decode
             than as padding — raw bytes and their meaning read together -->
        <dl class="facts" v-if="report">
          <dt>Sensors</dt>
          <dd>{{ report.sensors.join(" · ") }}</dd>
          <dt>Board</dt>
          <dd>{{ boardLabel(report.board) }}</dd>
          <dt>Firmware</dt>
          <dd>{{ report.board.firmware }}</dd>
          <dt>Temp / RH</dt>
          <dd>{{ report.builtin.temperature }}&deg;C &middot; {{ report.builtin.humidity }}%</dd>
          <dt>Light</dt>
          <dd>{{ report.builtin.light }}</dd>
        </dl>
      </div>
      <p v-else class="page__empty page__empty--compact">No report yet. The board streams this continuously once connected.</p>

      <h2 class="section-label">Last response &middot; type 20</h2>
      <div class="split" v-if="lastResponse">
        <div class="split__main">
          <pre class="bytes">command {{ lastResponse.command }}  status {{ lastResponse.status }}  length {{ lastResponse.length }}
{{ hex(lastResponse.payload) }}</pre>
        </div>

        <dl class="facts">
          <dt>Command</dt>
          <dd>{{ lastResponse.command }}<template v-if="lastResponseCommandName"> &middot; {{ lastResponseCommandName }}</template></dd>
          <dt>Status</dt>
          <dd>{{ lastResponse.status }}<template v-if="lastResponseStatusName"> &middot; {{ lastResponseStatusName }}</template></dd>
          <dt>Payload</dt>
          <dd>{{ lastResponse.length }} byte{{ lastResponse.length === 1 ? "" : "s" }}</dd>
        </dl>
      </div>
      <p v-else class="page__empty page__empty--compact">Nothing received yet.</p>
    </div>
  </section>
</template>

<script>
import { mapActions, mapGetters } from "vuex";
import {
  buildCommand,
  describeCommand,
  FRAME_SIZE,
  CATEGORY,
  EVENT_CMD,
  DATALOG_STATUS,
  REG,
  SENSOR_COUNT,
} from "@/gogo/protocol";
import ByteDump from "@/components/ByteDump.vue";
import boardAction from "@/mixins/boardAction";
import { boardLabel } from "@/utils/formatBoard";

const ROW_SIZE = 16;
//? type-0 reports arrive ~20x a second; nobody can read that, and repainting
//? 63 cells that often is wasteful. Sample it down to something legible.
const REPORT_REFRESH_MS = 200;

export default {
  name: "Packets",
  components: { ByteDump },
  mixins: [boardAction],
  data: function () {
    return {
      category: 0,
      command: 11,
      params: "",
      showFullFrame: false,
      paused: false,
      shownReport: null,
      lastShownAt: 0,
      FRAME_SIZE,
    };
  },
  computed: {
    ...mapGetters(["lastResponse", "reportRaw", "report"]),

    commandName: function () {
      return describeCommand(this.category, this.command);
    },

    //? every type-20 response in this app comes from an EVENT_REQUEST command
    //? (see docs/protocol.md, "Responses") — the response itself carries no
    //? category byte, so resolving its name assumes that fixed category
    lastResponseCommandName: function () {
      return this.lastResponse
        ? describeCommand(CATEGORY.EVENT_REQUEST, this.lastResponse.command)
        : null;
    },

    //? status is only a shared concept for the datalog command — GoGo ID
    //? puts a MAC where the status byte would be, so nothing to name there
    lastResponseStatusName: function () {
      if (!this.lastResponse || this.lastResponse.command !== EVENT_CMD.GET_DATALOG) return null;
      return Object.keys(DATALOG_STATUS).find(
        (name) => DATALOG_STATUS[name] === this.lastResponse.status
      ) || null;
    },

    //? byte ranges the report legend used to describe in prose, now fed to
    //? ByteDump's highlight map instead
    reportHighlights: function () {
      const highlights = { [REG.PACKET_TYPE]: "bytes__cell--category" };
      for (let i = 0; i < SENSOR_COUNT * 2; i++) {
        highlights[REG.SENSOR_START + i] = "bytes__cell--sensors";
      }
      for (let i = REG.BOARD_TYPE; i <= REG.FIRMWARE + 2; i++) {
        highlights[i] = "bytes__cell--board";
      }
      return highlights;
    },

    paramBytes: function () {
      return this.params
        ? this.params.split(",").map((v) => parseInt(v, 10) || 0)
        : [];
    },

    preview: function () {
      try {
        return { bytes: buildCommand(this.category, this.command, this.paramBytes) };
      } catch (error) {
        return { error: error.message };
      }
    },

    //? most commands leave the tail zeroed, so show whole rows up to the last
    //? byte actually used — string params naturally push this out further
    trimmedFrameLength: function () {
      const bytes = this.preview.bytes;
      if (!bytes) return 0;

      let lastUsed = 1;
      for (let i = bytes.length - 1; i > 1; i--) {
        if (bytes[i] !== 0) {
          lastUsed = i;
          break;
        }
      }
      return Math.min(
        (Math.floor(lastUsed / ROW_SIZE) + 1) * ROW_SIZE,
        bytes.length
      );
    },

    visibleFrame: function () {
      const bytes = this.preview.bytes;
      if (!bytes) return [];
      const length = this.showFullFrame ? bytes.length : this.trimmedFrameLength;
      return Array.from(bytes).slice(0, length);
    },

    hiddenFrameBytes: function () {
      const bytes = this.preview.bytes;
      if (!bytes) return 0;
      return bytes.length - this.visibleFrame.length;
    },
  },
  watch: {
    reportRaw: function (bytes) {
      if (this.paused || !bytes) return;

      const now = Date.now();
      if (now - this.lastShownAt < REPORT_REFRESH_MS) return;

      this.lastShownAt = now;
      this.shownReport = Array.from(bytes);
    },
  },
  methods: {
    ...mapActions(["send"]),

    boardLabel,

    hex: function (bytes) {
      return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(" ");
    },

    sendPacket: async function () {
      if (!this.requireBoard()) return;

      try {
        await this.send({
          category: this.category,
          command: this.command,
          params: this.paramBytes,
        });
        this.reportAction("Sent.", false);
      } catch (error) {
        this.reportAction(error.message, true);
      }
    },
  },
};
</script>

<style scoped>
.card {
  background: var(--card-bg);
  border-radius: var(--radius-card);
  padding: 18px 20px 20px;
  margin-bottom: var(--gap);
}

.card__title {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 700;
  color: var(--gogo-ink);
}

.card__row {
  display: flex;
  align-items: center;
  gap: 10px;
}

/*? native number/text inputs had no sizing at all — ~22px tall, under the
    36px tablet hit-target floor */
.control-row input {
  box-sizing: border-box;
  height: 36px;
  padding: 6px 10px;
  font-size: 14px;
  font-family: inherit;
  color: var(--gogo-ink);
  background: var(--card-bg);
  border: 1px solid var(--hairline);
  border-radius: var(--radius-card);
}

.bytes-note {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--muted);
}

.constant-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--gogo-ink);
}

/*? the dump has a fixed natural width; the remainder carries the decode */
.split {
  display: flex;
  align-items: flex-start;
  gap: 28px;
  flex-wrap: wrap;
}

.split__main {
  flex: 0 1 auto;
}

.facts {
  flex: 1 1 240px;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px 14px;
  margin: 0;
  font-size: 13px;
}

.facts dt {
  color: var(--muted);
  white-space: nowrap;
}

.facts dd {
  margin: 0;
  color: var(--gogo-ink);
  font-weight: 600;
}
</style>
