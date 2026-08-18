<template>
  <section class="page page--wide">
    <div class="page-head">
      <h1 class="page-title">Packets</h1>
      <p class="page-lede">
        Build a frame byte by byte, send it, and read the reply on the wire. Open this page when
        the reference and the hardware disagree.
      </p>
    </div>

    <div class="card">
      <div class="card__row">
        <h2 class="card__title">Build a packet</h2>
        <guide-link to="/reference/protocol#frame">Frame layout and command tables</guide-link>
      </div>

      <div class="builder">
        <div class="field">
          <label class="field__label" for="packet-category">Category</label>
          <input id="packet-category" class="field__input field__input--n" type="number" v-model.number="category" />
        </div>
        <div class="field">
          <label class="field__label" for="packet-command">Command</label>
          <input id="packet-command" class="field__input field__input--n" type="number" v-model.number="command" />
        </div>
        <div class="field field--grow">
          <label class="field__label" for="packet-params">Parameters, comma separated</label>
          <input id="packet-params" class="field__input" type="text" v-model="params" placeholder="1, 0, 120" />
        </div>
        <button class="btn btn--primary" :disabled="!isBoardReady" :title="actionHint" @click="sendPacket()">Send packet</button>
      </div>

      <div class="chips" v-if="commandName">
        <span class="chip"><span class="chip__k">Category {{ category }}</span>{{ categoryName }}</span>
        <span class="chip"><span class="chip__k">Command {{ command }}</span>{{ commandName }}</span>
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
          <dd>category {{ category }}<template v-if="categoryName"> &middot; {{ categoryName }}</template></dd>
          <dt><span class="bytes-legend__chip bytes-legend__chip--command">byte 1</span></dt>
          <dd>command {{ command }}<template v-if="commandName"> &middot; {{ commandName }}</template></dd>
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
        <h2 class="section-label">Report &middot; type 0 <span class="section-label__note">63 bytes, report ID already dropped</span></h2>
        <guide-link to="/reference/protocol#device-register">The register map</guide-link>
        <button class="btn btn--small" v-if="reportRaw" @click="paused = !paused">
          {{ paused ? "Resume" : "Pause" }}
        </button>
      </div>
      <div class="split" v-if="shownReport">
        <div class="split__main">
          <byte-dump :bytes="shownReport" :highlights="reportHighlights" />
          <p class="bytes-legend">
            <span class="bytes-legend__item"><span class="bytes-legend__swatch bytes-legend__swatch--type"></span>Packet type</span>
            <span class="bytes-legend__item"><span class="bytes-legend__swatch bytes-legend__swatch--sensors"></span>Sensor ports</span>
            <span class="bytes-legend__item"><span class="bytes-legend__swatch bytes-legend__swatch--board"></span>Board identity</span>
            <span class="bytes-legend__item"><span class="bytes-legend__swatch bytes-legend__swatch--builtin"></span>Built-in sensors</span>
            <span class="bytes-legend__item" v-if="paused">Frozen</span>
          </p>
        </div>

        <!--? the dead space to the right of a dump is worth more as a decode
             than as padding — raw bytes and their meaning read together -->
        <dl class="facts" v-if="report">
          <dt><span class="facts__swatch facts__swatch--sensors"></span>Sensors</dt>
          <dd>{{ report.sensors.join(" · ") }}</dd>
          <dt><span class="facts__swatch facts__swatch--board"></span>Board</dt>
          <dd>{{ boardLabel(report.board) }}</dd>
          <dt><span class="facts__swatch facts__swatch--board"></span>Firmware</dt>
          <dd>{{ report.board.firmware }}</dd>
          <dt><span class="facts__swatch facts__swatch--builtin"></span>Temp / RH</dt>
          <dd>{{ report.builtin.temperature }}&deg;C &middot; {{ report.builtin.humidity }}%</dd>
          <dt><span class="facts__swatch facts__swatch--builtin"></span>Light</dt>
          <dd>{{ report.builtin.light }}</dd>
          <dt><span class="facts__swatch facts__swatch--builtin"></span>Sound</dt>
          <dd>{{ report.builtin.loudness }} dB</dd>
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
import GuideLink from "@/components/GuideLink.vue";
import { boardLabel } from "@/utils/formatBoard";

const ROW_SIZE = 16;
//? type-0 reports arrive ~20x a second; nobody can read that, and repainting
//? 63 cells that often is wasteful. Sample it down to something legible.
const REPORT_REFRESH_MS = 200;

export default {
  name: "Packets",
  components: { ByteDump, GuideLink },
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

    //? reverse of the CATEGORY constant, so a renamed category cannot drift
    //? out of sync with the label shown next to it
    categoryName: function () {
      const name = Object.keys(CATEGORY).find((key) => CATEGORY[key] === this.category);
      return name || "unknown";
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
    //? every byte the decode panel beside the dump reads from — a value on the
    //? right with no colour on the left reads as unrelated to the frame
    reportHighlights: function () {
      const highlights = { [REG.PACKET_TYPE]: "bytes__cell--type" };

      for (let i = 0; i < SENSOR_COUNT * 2; i++) {
        highlights[REG.SENSOR_START + i] = "bytes__cell--sensors";
      }
      for (let i = REG.BOARD_TYPE; i <= REG.FIRMWARE + 2; i++) {
        highlights[i] = "bytes__cell--board";
      }

      //? light is 16-bit at 49-50; loudness, temperature and humidity are single bytes
      highlights[REG.LIGHT] = "bytes__cell--builtin";
      highlights[REG.LIGHT + 1] = "bytes__cell--builtin";
      highlights[REG.LOUDNESS] = "bytes__cell--builtin";
      highlights[REG.TEMPERATURE] = "bytes__cell--builtin";
      highlights[REG.HUMIDITY] = "bytes__cell--builtin";

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
  box-shadow: var(--widget-shadow);
  padding: 20px var(--space-5) var(--space-5);
  margin-bottom: var(--space-5);
}

.card__title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--gogo-ink);
}

.card__row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
  margin-bottom: var(--space-3);
}

.builder {
  display: flex;
  align-items: flex-end;
  gap: var(--space-5);
  flex-wrap: wrap;
  margin-bottom: var(--space-3);
}

/*? label above the input, never a placeholder standing in for one */
.field { display: flex; flex-direction: column; gap: 5px; }
.field--grow { flex: 1 1 220px; }

.field__label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
}

/*? native number/text inputs had no sizing at all — ~22px tall, under the
    36px tablet hit-target floor */
.field__input {
  box-sizing: border-box;
  width: 100%;
  height: 38px;
  padding: 6px 12px;
  font-size: 14px;
  font-family: inherit;
  color: var(--gogo-ink);
  background: var(--card-bg);
  border: 2px solid var(--hairline);
  border-radius: var(--radius-inner);
}

.field__input--n { width: 96px; font-variant-numeric: tabular-nums; }
.field__input:focus-visible { outline: none; border-color: var(--gogo-blue); box-shadow: var(--glow-blue); }

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

/*? min-width:0 is what lets this shrink past the dump's natural width — a flex
    item floors at its min-content size otherwise, and .bytes' own overflow-x
    never engages because the parent has already pushed the page wider */
.split__main {
  flex: 0 1 auto;
  min-width: 0;
  max-width: 100%;
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
