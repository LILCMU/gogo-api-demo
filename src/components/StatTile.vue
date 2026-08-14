<template>
  <div class="tile" :class="'tile--' + tone">
    <span class="tile__label">{{ label }}</span>
    <span class="tile__value" :class="{ 'is-inactive': inactive }">{{ value }}</span>
  </div>
</template>

<script>
export default {
  name: "StatTile",
  props: {
    label: { type: String, required: true },
    value: { type: [Number, String], required: true },
    tone: { type: String, default: "green" },
    inactive: { type: Boolean, default: false },
  },
};
</script>
