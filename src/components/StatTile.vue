<template>
  <div class="tile" :class="'tile--' + tone">
    <span class="tile__label">{{ label }}</span>
    <span class="tile__value">{{ value }}</span>
    <!--? a bare number tells a child nothing about whether 512 is a lot; the
         bar puts it on the port's scale without adding a second reading -->
    <span v-if="max" class="tile__bar"><span class="tile__fill" :style="{ width: fillWidth }"></span></span>
  </div>
</template>

<script>
export default {
  name: "StatTile",
  props: {
    label: { type: String, required: true },
    value: { type: [Number, String], required: true },
    tone: { type: String, default: "green" },
    max: { type: Number, default: 0 },
  },
  computed: {
    fillWidth: function () {
      const ratio = Math.min(1, Math.max(0, Number(this.value) / this.max));
      return (ratio * 100).toFixed(1) + "%";
    },
  },
};
</script>

<style>
.tile {
  border-radius: var(--radius-card);
  padding: var(--space-3) var(--pad) var(--pad);
  /*? $info-widget-border — the brand's left accent stripe */
  border-left: var(--stripe) solid var(--gogo-green);
  background: var(--gogo-green-tint);
  box-shadow: var(--widget-shadow-lo);
}

.tile--orange { border-left-color: var(--gogo-orange); background: var(--gogo-orange-tint); }
.tile--blue   { border-left-color: var(--gogo-blue);   background: var(--gogo-blue-tint); }
.tile--pink   { border-left-color: var(--gogo-pink);   background: var(--gogo-pink-tint); }

.tile__label {
  display: block;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.11em;
  text-transform: uppercase;
  color: var(--muted);
}

.tile__value {
  display: block;
  margin-top: 2px;
  font-size: 34px;
  font-weight: 700;
  line-height: 1.05;
  letter-spacing: -0.03em;
  color: var(--gogo-ink);
  /*? values stream ~20x a second — proportional digits make the tile jitter */
  font-variant-numeric: tabular-nums;
}

.tile__bar {
  display: block;
  margin-top: 10px;
  height: 4px;
  border-radius: 4px;
  background: rgba(1, 53, 76, 0.13);
  overflow: hidden;
}

.tile__fill { display: block; height: 100%; border-radius: 4px; background: var(--gogo-green); }
.tile--orange .tile__fill { background: var(--gogo-orange); }
.tile--blue .tile__fill   { background: var(--gogo-blue); }
.tile--pink .tile__fill   { background: var(--gogo-pink); }
</style>
