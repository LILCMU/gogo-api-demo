<template>
  <section class="page">
    <h2 class="section-label">Try it</h2>
    <button class="btn btn--primary btn--large" :disabled="!boardStatus" @click="beep()">
      Beep
    </button>

    <h2 class="section-label">Motors</h2>
    <div class="control-row" v-for="i in 4" :key="'motor' + i">
      <span class="control-row__name">Motor {{ i }}</span>
      <button class="btn" :disabled="!boardStatus" @click="motor(i, true)">On</button>
      <button class="btn" :disabled="!boardStatus" @click="motor(i, false)">Off</button>
      <button class="btn" :disabled="!boardStatus" @click="reverse(i)">Reverse</button>
    </div>

    <h2 class="section-label">Servos</h2>
    <div class="control-row" v-for="i in 4" :key="'servo' + i">
      <span class="control-row__name">Servo {{ i }}</span>
      <input type="range" min="0" max="180" v-model.number="angles[i - 1]"
             :disabled="!boardStatus" @change="servo(i)" />
      <span class="control-row__value">{{ angles[i - 1] }}°</span>
    </div>

    <h2 class="section-label">LED</h2>
    <div class="control-row">
      <button class="btn" :disabled="!boardStatus" @click="led(true)">On</button>
      <button class="btn" :disabled="!boardStatus" @click="led(false)">Off</button>
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
    return { angles: [90, 90, 90, 90], message: "", failed: false };
  },
  computed: {
    ...mapGetters(["boardStatus"]),
  },
  methods: {
    ...mapActions(["send"]),

    run: function (command, params, note) {
      if (!this.boardStatus) {
        this.message = "Connect a GoGo Board first.";
        this.failed = true;
        return;
      }
      this.send({ category: CATEGORY.CONTROL, command, params });
      this.message = note;
      this.failed = false;
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

    led: function (on) {
      this.run(CMD.LED_CONTROL, [on ? 1 : 0], on ? "LED on." : "LED off.");
    },
  },
};
</script>
