<template>
  <div class="dark-panel"><slot /></div>
</template>

<script>
export default { name: "DarkPanel" };
</script>

<style>
.dark-panel {
  background: var(--gogo-ink);
  border-radius: var(--radius-card);
  padding: var(--pad) 18px;
  display: flex;
  gap: 28px;
}
</style>
