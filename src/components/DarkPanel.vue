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
  padding: var(--pad) 18px;
  display: flex;
  justify-content: space-between;
  gap: 28px;
}
</style>
