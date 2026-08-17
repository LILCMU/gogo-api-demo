<template>
  <div class="tile" :class="'tile--' + tone">
    <span class="tile__label">{{ label }}</span>
    <span class="tile__value">{{ value }}</span>
  </div>
</template>

<script>
export default {
  name: "StatTile",
  props: {
    label: { type: String, required: true },
    value: { type: [Number, String], required: true },
    tone: { type: String, default: "green" },
  },
};
</script>

<style>
.tile {
  border-radius: var(--radius-card);
  padding: var(--pad);
  border-left: var(--stripe) solid var(--gogo-green);
  background: var(--gogo-green-tint);
}

.tile--orange { border-left-color: var(--gogo-orange); background: var(--gogo-orange-tint); }
.tile--blue   { border-left-color: var(--gogo-blue);   background: var(--gogo-blue-tint); }
.tile--pink   { border-left-color: var(--gogo-pink);   background: var(--gogo-pink-tint); }

.tile__label {
  display: block;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  color: var(--muted);
}

.tile__value {
  display: block;
  font-size: 30px;
  font-weight: 800;
  line-height: 1.15;
  color: var(--gogo-ink);
}
</style>
