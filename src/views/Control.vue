<template>
  <section class="page">
    <h1 class="page-title">Control</h1>

    <p v-if="!isBoardReady" class="page__empty page__empty--compact">Connect a GoGo Board to use these controls.</p>

    <h2 class="section-label">Try it</h2>
    <button class="btn btn--primary btn--large" :disabled="!isBoardReady" :title="actionHint" @click="beep()">
      Beep
    </button>

    <h2 class="section-label">Motors</h2>
    <div class="control-row" v-for="i in 4" :key="'motor' + i">
      <span class="control-row__name">Motor {{ i }}</span>
      <button class="btn" :disabled="!isBoardReady" :title="actionHint" @click="motor(i, true)">On</button>
      <button class="btn" :disabled="!isBoardReady" :title="actionHint" @click="motor(i, false)">Off</button>
      <button class="btn" :disabled="!isBoardReady" :title="actionHint" @click="reverse(i)">Reverse</button>
      <span class="board-state" v-if="report">
        <span class="board-state__label">Board</span>
        <strong class="board-state__value">{{ motorState(i) }}</strong>
      </span>
    </div>

    <h2 class="section-label">Servos</h2>
    <div class="control-row" v-for="i in 4" :key="'servo' + i">
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

    <h2 class="section-label">Relays</h2>
    <div class="control-row" v-for="i in 4" :key="'relay' + i">
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

    <p class="action-message" :class="{ 'is-error': actionFailed }" aria-live="polite">{{ actionMessage }}</p>
  </section>
</template>

<script>
import { mapActions, mapGetters } from "vuex";
import { CATEGORY, CMD } from "@/gogo/protocol";
import boardAction from "@/mixins/boardAction";

export default {
  name: "Control",
  mixins: [boardAction],
  data: function () {
    return {
      angles: [90, 90, 90, 90],
      relayPower: [0, 0, 0, 0],
    };
  },
  computed: {
    ...mapGetters(["report"]),
  },
  methods: {
    ...mapActions(["send"]),

    //? reads the board's reported on/off and direction bitmasks — separate
    //? from the sliders/buttons above, which only ever reflect what was sent
    motorState: function (port) {
      if (!(this.report.motors.onOff & this.mask(port))) return "Off";
      return "On · " + (this.report.motors.direction & this.mask(port) ? "CW" : "CCW");
    },

    run: async function (command, params, note) {
      if (!this.requireBoard()) return;
      try {
        await this.send({ category: CATEGORY.CONTROL, command, params });
        this.reportAction(note, false);
      } catch (error) {
        this.reportAction(error.message, true);
      }
    },

    //? port number to the firmware's one-bit-per-port mask
    mask: function (port) {
      return 1 << (port - 1);
    },

    beep: function () {
      this.run(CMD.BEEP, [], "Beeped.");
    },

    motor: function (port, on) {
      this.run(CMD.MOTOR_ON_OFF, [this.mask(port), on ? 1 : 0],
        "Motor " + port + (on ? " on." : " off."));
    },

    reverse: function (port) {
      this.run(CMD.MOTOR_REVERSE, [this.mask(port)], "Motor " + port + " reversed.");
    },

    servo: function (port) {
      const angle = this.angles[port - 1];
      this.run(CMD.SERVO_SET_ANGLE, [this.mask(port), angle >> 8, angle & 0xff],
        "Servo " + port + " to " + angle + "°.");
    },

    relay: function (port) {
      const power = this.relayPower[port - 1];
      this.run(CMD.RELAY_SET_POWER, [this.mask(port), power >> 8, power & 0xff],
        "Relay " + port + " to " + power + "%.");
    },
  },
};
</script>

<style scoped>
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
