<template>
  <section class="page">
    <p v-if="!boardStatus" class="page__empty page__empty--compact">Connect a GoGo Board to use these controls.</p>

    <h2 class="section-label">Try it</h2>
    <button class="btn btn--primary btn--large" :disabled="!boardStatus" :title="actionHint" @click="beep()">
      Beep
    </button>

    <h2 class="section-label">Motors</h2>
    <div class="control-row" v-for="i in 4" :key="'motor' + i">
      <span class="control-row__name">Motor {{ i }}</span>
      <button class="btn" :disabled="!boardStatus" :title="actionHint" @click="motor(i, true)">On</button>
      <button class="btn" :disabled="!boardStatus" :title="actionHint" @click="motor(i, false)">Off</button>
      <button class="btn" :disabled="!boardStatus" :title="actionHint" @click="reverse(i)">Reverse</button>
    </div>

    <h2 class="section-label">Servos</h2>
    <div class="control-row" v-for="i in 4" :key="'servo' + i">
      <span class="control-row__name">Servo {{ i }}</span>
      <input type="range" min="0" max="180" v-model.number="angles[i - 1]"
             :disabled="!boardStatus" :title="actionHint" @change="servo(i)" />
      <span class="control-row__value">{{ angles[i - 1] }}°</span>
    </div>

    <h2 class="section-label">Relays</h2>
    <div class="control-row" v-for="i in 4" :key="'relay' + i">
      <span class="control-row__name">Relay {{ i }}</span>
      <input type="range" min="0" max="100" v-model.number="relayPower[i - 1]"
             :disabled="!boardStatus" :title="actionHint" @change="relay(i)" />
      <span class="control-row__value">{{ relayPower[i - 1] }}%</span>
    </div>

    <p class="action-message" :class="{ 'is-error': failed }">{{ message }}</p>
  </section>
</template>

<script>
import { mapActions, mapGetters } from "vuex";
import { CATEGORY, CMD } from "@/gogo/protocol";

export default {
  name: "Control",
  data: function () {
    return {
      angles: [90, 90, 90, 90],
      relayPower: [0, 0, 0, 0],
      message: "",
      failed: false,
    };
  },
  computed: {
    ...mapGetters(["boardStatus"]),

    actionHint: function () {
      return this.boardStatus ? "" : "Connect a GoGo Board first";
    },
  },
  methods: {
    ...mapActions(["send"]),

    run: async function (command, params, note) {
      if (!this.boardStatus) {
        this.message = "Connect a GoGo Board first.";
        this.failed = true;
        return;
      }
      try {
        await this.send({ category: CATEGORY.CONTROL, command, params });
        this.message = note;
        this.failed = false;
      } catch (error) {
        this.message = error.message;
        this.failed = true;
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
