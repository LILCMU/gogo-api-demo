<template>
  <section class="page">
    <p v-if="!report" class="page__empty">
      Connect a GoGo Board to see live readings.
    </p>

    <template v-else>
      <div class="pills">
        <span class="pill">{{ report.board.typeName }} {{ report.board.version }}</span>
        <span class="pill">Firmware {{ report.board.firmware }}</span>
      </div>

      <h2 class="section-label">Sensors</h2>
      <div class="tile-grid">
        <stat-tile
          v-for="(value, i) in report.sensors"
          :key="i"
          :label="'Sensor ' + (i + 1)"
          :value="value"
          :tone="tones[i]"
          :inactive="value === 0"
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

export default {
  name: "Live",
  components: { StatTile, DarkPanel },
  data: function () {
    return { tones: ["green", "orange", "blue", "pink"] };
  },
  computed: {
    ...mapGetters(["report"]),
  },
};
</script>
