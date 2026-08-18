<template>
  <div class="dark-panel"><slot /></div>
</template>

<script>
export default { name: "DarkPanel" };
</script>

<style>
/*? readouts spread across the panel rather than huddling at the left edge,
    which left most of a full-width bar empty */
.dark-panel {
  background: var(--gogo-ink);
  border-radius: var(--radius-card);
  box-shadow: var(--widget-shadow);
  padding: 18px var(--space-5);
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--pad);
}

.dark-panel--three { grid-template-columns: repeat(3, 1fr); }

@media (max-width: 640px) {
  .dark-panel { grid-template-columns: repeat(2, 1fr); }
}
</style>
