<template>
  <section class="page">
    <div class="page-head">
      <h1 class="page-title">Live</h1>
      <p class="page-lede">
        Every report the board sends, decoded as it arrives. Four sensor ports, four onboard
        sensors, roughly twenty frames a second.
      </p>
    </div>

    <board-onboarding v-if="!report" title="Plug in a GoGo Board to start reading">
      The browser talks to the board over WebHID. Nothing is installed and nothing leaves this page.
    </board-onboarding>

    <template v-else>
      <div class="chips">
        <span class="chip"><span class="chip__k">Board</span>{{ report.board.typeName }}</span>
        <span class="chip"><span class="chip__k">Hardware</span>{{ report.board.version }}</span>
        <span class="chip"><span class="chip__k">Firmware</span>{{ report.board.firmware }}</span>
      </div>

      <div class="section-row">
        <h2 class="section-label">Sensor ports <span class="section-label__note">0&ndash;1023</span></h2>
        <guide-link to="/reference/protocol#device-register">How the register is laid out</guide-link>
      </div>
      <div class="tile-grid">
        <stat-tile
          v-for="(value, i) in report.sensors"
          :key="i"
          :label="'Sensor ' + (i + 1)"
          :value="value"
          :tone="sensorTones[i]"
          :max="SENSOR_MAX"
        />
      </div>

      <div class="section-row">
        <h2 class="section-label">On the board <span class="section-label__note">built-in, no wiring needed</span></h2>
        <guide-link to="/reference/protocol#builtin-sensors">Where these bytes live</guide-link>
      </div>
      <dark-panel>
        <div class="readout"><span>Temp</span><strong>{{ report.builtin.temperature }}&deg;C</strong></div>
        <div class="readout"><span>Humidity</span><strong>{{ report.builtin.humidity }}%</strong></div>
        <div class="readout"><span>Light</span><strong>{{ report.builtin.light }}</strong></div>
        <div class="readout"><span>Sound</span><strong>{{ report.builtin.loudness }}dB</strong></div>
      </dark-panel>

      <div class="section-row">
        <h2 class="section-label">Accelerometer <span class="section-label__note">1 g at rest on one axis</span></h2>
        <guide-link to="/reference/protocol#builtin-sensors">Bytes 54&ndash;59 are milli-g</guide-link>
      </div>
      <dark-panel class="dark-panel--three">
        <div class="readout"><span>X</span><strong>{{ g(report.builtin.accel.x) }}<small>g</small></strong></div>
        <div class="readout"><span>Y</span><strong>{{ g(report.builtin.accel.y) }}<small>g</small></strong></div>
        <div class="readout"><span>Z</span><strong>{{ g(report.builtin.accel.z) }}<small>g</small></strong></div>
      </dark-panel>
    </template>
  </section>
</template>

<script>
import { mapGetters } from "vuex";
import StatTile from "@/components/StatTile.vue";
import DarkPanel from "@/components/DarkPanel.vue";
import BoardOnboarding from "@/components/BoardOnboarding.vue";
import GuideLink from "@/components/GuideLink.vue";

//? one tint per sensor port, in port order — constant, so not reactive state
const SENSOR_TONES = ["green", "orange", "blue", "pink"];

//? 10-bit ADC — the ceiling the tile bars are drawn against
const SENSOR_MAX = 1023;

export default {
  name: "Live",
  components: { StatTile, DarkPanel, BoardOnboarding, GuideLink },
  computed: {
    ...mapGetters(["report"]),

    sensorTones: () => SENSOR_TONES,
    SENSOR_MAX: () => SENSOR_MAX,
  },
  methods: {
    //? bytes 54-59 are milli-g already scaled by firmware, so this is a plain
    //? divide — not a conversion from raw IMU counts
    g: function (milliG) {
      return (milliG / 1000).toFixed(2);
    },
  },
};
</script>
