<template>
  <section class="page">
    <div class="page-head">
      <h1 class="page-title">Control</h1>
      <p class="page-lede">
        Send a command, then read what the board sends back. The dark pill on each row is the
        board&rsquo;s own report, not an echo of what you typed.
      </p>
    </div>

    <!--? just the message stays pinned; the frame itself renders inline under
         the control that sent it, where the reader is already looking -->
    <p
      v-if="actionMessage"
      class="action-message status-bar"
      :class="{ 'is-error': actionFailed }"
      aria-live="polite"
    >{{ actionMessage }}</p>

    <div class="section-row">
      <h2 class="section-label">Try it first</h2>
      <guide-link to="/reference/protocol#category-0">The control command set</guide-link>
    </div>
    <div class="beep-card">
      <button class="btn btn--primary btn--large" :disabled="!isBoardReady" :title="actionHint" @click="beep()">
        Beep
      </button>
      <p class="beep-card__hint">
        Category 0, command 11, no parameters. The shortest round trip the protocol has, and the
        fastest way to prove the cable works.
      </p>
    </div>

    <div v-if="isLastSent('beep', 0)" class="row-frame row-frame--standalone">
      <p class="row-frame__note">
        {{ sentNote }}
        <guide-link to="/reference/protocol#frame">How a frame is laid out</guide-link>
      </p>
      <byte-dump :bytes="sentFrame" :highlights="sentHighlights" />
      <p class="bytes-legend">
        <span class="bytes-legend__item" v-for="key in sentLegend" :key="key">
          <span class="bytes-legend__swatch" :class="'bytes-legend__swatch--' + key"></span>{{ LEGEND_LABELS[key] }}
        </span>
      </p>
    </div>

    <div class="section-row">
      <h2 class="section-label">Motors <span class="section-label__note">board reports 0&ndash;255 PWM</span></h2>
      <guide-link to="/reference/protocol#motors">Why the scales differ</guide-link>
    </div>
    <div class="control-rows">
      <template v-for="i in 4">
        <div class="control-row" :key="'motor' + i">
          <span class="control-row__name">Motor {{ i }}</span>
          <button class="btn" :disabled="!isBoardReady" :title="actionHint" @click="motor(i, true)">On</button>
          <button class="btn" :disabled="!isBoardReady" :title="actionHint" @click="motor(i, false)">Off</button>
          <button class="btn" :disabled="!isBoardReady" :title="actionHint" @click="reverse(i)">Reverse</button>
          <span class="board-state" v-if="report">
            <span class="board-state__label">Board</span>
            <strong class="board-state__value">{{ motorState(i) }}</strong>
          </span>
        </div>
        <div v-if="isLastSent('motor', i)" :key="'motor-frame' + i" class="row-frame">
          <p class="row-frame__note">
            {{ sentNote }}
            <guide-link to="/reference/protocol#frame">How a frame is laid out</guide-link>
          </p>
          <byte-dump :bytes="sentFrame" :highlights="sentHighlights" />
          <p class="bytes-legend">
            <span class="bytes-legend__item" v-for="key in sentLegend" :key="key">
              <span class="bytes-legend__swatch" :class="'bytes-legend__swatch--' + key"></span>{{ LEGEND_LABELS[key] }}
            </span>
          </p>
        </div>
      </template>
    </div>

    <div class="section-row">
      <h2 class="section-label">Servos <span class="section-label__note">0&ndash;180&deg;</span></h2>
      <guide-link to="/reference/protocol#servos">Angle is two bytes</guide-link>
    </div>
    <div class="control-rows">
      <template v-for="i in 4">
        <div class="control-row" :key="'servo' + i">
          <span class="control-row__name">Servo {{ i }}</span>
          <input type="range" min="0" max="180" v-model.number="angles[i - 1]"
                 :aria-label="'Servo ' + i + ' angle'"
                 :disabled="!isBoardReady" :title="actionHint" @change="servo(i)" />
          <span class="control-row__value">{{ angles[i - 1] }}°</span>
          <span class="board-state" v-if="report">
            <span class="board-state__label">Board</span>
            <strong class="board-state__value">{{ report.servos.angles[i - 1] }}&deg;</strong>
          </span>
        </div>
        <div v-if="isLastSent('servo', i)" :key="'servo-frame' + i" class="row-frame">
          <p class="row-frame__note">
            {{ sentNote }}
            <guide-link to="/reference/protocol#frame">How a frame is laid out</guide-link>
          </p>
          <byte-dump :bytes="sentFrame" :highlights="sentHighlights" />
          <p class="bytes-legend">
            <span class="bytes-legend__item" v-for="key in sentLegend" :key="key">
              <span class="bytes-legend__swatch" :class="'bytes-legend__swatch--' + key"></span>{{ LEGEND_LABELS[key] }}
            </span>
          </p>
        </div>
      </template>
    </div>

    <div class="section-row">
      <h2 class="section-label">Relays <span class="section-label__note">board reports percent</span></h2>
      <guide-link to="/reference/protocol#relays">Why the scales differ</guide-link>
    </div>
    <div class="control-rows">
      <template v-for="i in 4">
        <div class="control-row" :key="'relay' + i">
          <span class="control-row__name">Relay {{ i }}</span>
          <input type="range" min="0" max="100" v-model.number="relayPower[i - 1]"
                 :aria-label="'Relay ' + i + ' power'"
                 :disabled="!isBoardReady" :title="actionHint" @change="relay(i)" />
          <span class="control-row__value">{{ relayPower[i - 1] }}%</span>
          <span class="board-state" v-if="report">
            <span class="board-state__label">Board</span>
            <strong class="board-state__value">{{ report.relays.power[i - 1] }}%</strong>
          </span>
        </div>
        <div v-if="isLastSent('relay', i)" :key="'relay-frame' + i" class="row-frame">
          <p class="row-frame__note">
            {{ sentNote }}
            <guide-link to="/reference/protocol#frame">How a frame is laid out</guide-link>
          </p>
          <byte-dump :bytes="sentFrame" :highlights="sentHighlights" />
          <p class="bytes-legend">
            <span class="bytes-legend__item" v-for="key in sentLegend" :key="key">
              <span class="bytes-legend__swatch" :class="'bytes-legend__swatch--' + key"></span>{{ LEGEND_LABELS[key] }}
            </span>
          </p>
        </div>
      </template>
    </div>

  </section>
</template>

<script>
import { mapActions, mapGetters } from "vuex";
import { CATEGORY, CMD, buildCommand, describeCommand } from "@/gogo/protocol";
import { trimFrame, LEGEND_LABELS } from "@/utils/wireFrame";
import ByteDump from "@/components/ByteDump.vue";
import boardAction from "@/mixins/boardAction";
import GuideLink from "@/components/GuideLink.vue";

export default {
  name: "Control",
  components: { GuideLink, ByteDump },
  mixins: [boardAction],
  data: function () {
    return {
      angles: [90, 90, 90, 90],
      relayPower: [0, 0, 0, 0],
      //? the last frame this page put on the wire, plus which control sent it,
      //? so the dump can render inline against that row
      lastSent: null,
    };
  },
  computed: {
    ...mapGetters(["report"]),

    LEGEND_LABELS: () => LEGEND_LABELS,

    //? rebuilt with the same buildCommand the send path uses, so what is shown
    //? cannot drift from what was sent
    sentFrame: function () {
      if (!this.lastSent) return null;
      return trimFrame(
        buildCommand(CATEGORY.CONTROL, this.lastSent.command, this.lastSent.params)
      );
    },

    sentHighlights: function () {
      if (!this.lastSent) return {};
      const highlights = { 0: "bytes__cell--category", 1: "bytes__cell--command" };
      this.lastSent.params.forEach((unused, i) => {
        highlights[2 + i] = "bytes__cell--payload";
      });
      return highlights;
    },

    sentLegend: function () {
      return this.lastSent && this.lastSent.params.length
        ? ["category", "command", "payload"]
        : ["category", "command"];
    },

    sentNote: function () {
      if (!this.lastSent) return "";
      const name = describeCommand(CATEGORY.CONTROL, this.lastSent.command);
      const count = this.lastSent.params.length;
      return (
        "category 0, command " + this.lastSent.command +
        (name ? " · " + name : "") +
        " · " + (count ? count + " param byte" + (count === 1 ? "" : "s") : "no params")
      );
    },
  },
  methods: {
    ...mapActions(["send"]),

    //? reads the board's reported on/off and direction bitmasks — separate
    //? from the sliders/buttons above, which only ever reflect what was sent
    motorState: function (port) {
      if (!(this.report.motors.onOff & this.mask(port))) return "Off";
      return "On · " + (this.report.motors.direction & this.mask(port) ? "CW" : "CCW");
    },

    run: async function (command, params, note, source) {
      if (!this.requireBoard()) return;
      try {
        await this.send({ category: CATEGORY.CONTROL, command, params });
        this.lastSent = { command: command, params: params, group: source.group, port: source.port };
        this.reportAction(note, false);
      } catch (error) {
        this.reportAction(error.message, true);
      }
    },

    //? port number to the firmware's one-bit-per-port mask
    mask: function (port) {
      return 1 << (port - 1);
    },

    isLastSent: function (group, port) {
      return !!this.lastSent && this.lastSent.group === group && this.lastSent.port === port;
    },

    beep: function () {
      this.run(CMD.BEEP, [], "Beeped.", { group: "beep", port: 0 });
    },

    motor: function (port, on) {
      this.run(CMD.MOTOR_ON_OFF, [this.mask(port), on ? 1 : 0],
        "Motor " + port + (on ? " on." : " off."), { group: "motor", port: port });
    },

    reverse: function (port) {
      this.run(CMD.MOTOR_REVERSE, [this.mask(port)], "Motor " + port + " reversed.",
        { group: "motor", port: port });
    },

    servo: function (port) {
      const angle = this.angles[port - 1];
      this.run(CMD.SERVO_SET_ANGLE, [this.mask(port), angle >> 8, angle & 0xff],
        "Servo " + port + " to " + angle + "°.", { group: "servo", port: port });
    },

    relay: function (port) {
      const power = this.relayPower[port - 1];
      this.run(CMD.RELAY_SET_POWER, [this.mask(port), power >> 8, power & 0xff],
        "Relay " + port + " to " + power + "%.", { group: "relay", port: port });
    },
  },
};
</script>

<style scoped>
/*? one line, pinned — enough to confirm the click landed without the byte
    dump following the reader down the page */
.status-bar {
  position: sticky;
  top: 0;
  z-index: 5;
  margin: 0 0 var(--space-5);
  padding: 10px var(--pad);
  background: var(--card-bg);
  border-left: var(--stripe) solid var(--gogo-blue);
  border-radius: var(--radius-card);
  box-shadow: 0 4px 16px rgba(1, 53, 76, 0.14);
}

/*? the frame renders against the row that sent it, so it needs no pointer —
    being there is the explanation */
.row-frame {
  padding: var(--space-3) var(--pad) var(--pad);
  background: var(--sunk-bg);
}

.row-frame--standalone {
  margin-top: var(--space-2);
  border-radius: var(--radius-card);
  box-shadow: var(--widget-shadow-lo);
}

.row-frame__note {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
  margin: 0 0 var(--space-2);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}

.beep-card {
  display: flex;
  align-items: center;
  gap: var(--space-5);
  flex-wrap: wrap;
  padding: 20px var(--space-5);
  background: var(--card-bg);
  border-left: var(--stripe) solid var(--gogo-blue);
  border-radius: var(--radius-card);
  box-shadow: var(--widget-shadow);
}

.beep-card__hint { flex: 1 1 280px; margin: 0; font-size: 13.5px; color: var(--muted); max-width: 62ch; }

/*? ink background with light text — the same contrast DarkPanel/.readout use
    on Live — deliberately unlike the light card the control itself sits in,
    so "what the board reports" reads as a different source from "what you set" */
.board-state {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  padding: 4px 10px;
  background: var(--gogo-ink);
  border-radius: var(--radius-pill);
}

.board-state__label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: var(--dark-panel-label);
}

.board-state__value {
  font-size: 13px;
  font-weight: 700;
  color: var(--dark-panel-value);
}
</style>
