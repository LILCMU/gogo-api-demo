<template>
  <section class="page">
    <h1 class="page-title">Live</h1>

    <p v-if="!report" class="page__empty">
      Connect a GoGo Board to see live readings.
    </p>

    <template v-else>
      <div class="pills">
        <span class="pill">{{ boardLabel(report.board) }}</span>
        <span class="pill">Firmware {{ report.board.firmware }}</span>
      </div>

      <h2 class="section-label">Sensors <span class="section-label__note">0&ndash;1023</span></h2>
      <div class="tile-grid">
        <stat-tile
          v-for="(value, i) in report.sensors"
          :key="i"
          :label="'Sensor ' + (i + 1)"
          :value="value"
          :tone="sensorTones[i]"
        />
      </div>

      <h2 class="section-label">On the board</h2>
      <dark-panel>
        <div class="readout"><span>Temp</span><strong>{{ report.builtin.temperature }}°C</strong></div>
        <div class="readout"><span>Humidity</span><strong>{{ report.builtin.humidity }}%</strong></div>
        <div class="readout"><span>Light</span><strong>{{ report.builtin.light }}</strong></div>
        <div class="readout"><span>Sound</span><strong>{{ report.builtin.loudness }}dB</strong></div>
      </dark-panel>
    </template>
  </section>
</template>

<script>
import { mapGetters } from "vuex";
import StatTile from "@/components/StatTile.vue";
import DarkPanel from "@/components/DarkPanel.vue";
import { boardLabel } from "@/utils/formatBoard";

//? one tint per sensor port, in port order — constant, so not reactive state
const SENSOR_TONES = ["green", "orange", "blue", "pink"];

export default {
  name: "Live",
  components: { StatTile, DarkPanel },
  computed: {
    ...mapGetters(["report"]),

    sensorTones: () => SENSOR_TONES,
  },
  methods: { boardLabel },
};
</script>
