<template>
  <router-link class="guide-link" :to="to">
    <span class="guide-link__mark" aria-hidden="true">?</span><slot />
  </router-link>
</template>

<script>
export default {
  name: "GuideLink",
  props: {
    to: { type: String, required: true },
  },
};
</script>

<style>
/*? the way out of a page and into the reference for the thing in front of you.
    Quiet by default — it must not compete with the controls it sits beside */
.guide-link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 30px;
  padding: 0 13px;
  border: 1px solid var(--hairline);
  border-radius: var(--radius-pill);
  background: var(--card-bg);
  color: var(--muted);
  font-size: 12.5px;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.guide-link:hover { background: var(--gogo-blue-tint); border-color: var(--gogo-blue); color: var(--gogo-ink); }

.guide-link__mark {
  display: grid;
  place-items: center;
  width: 17px;
  height: 17px;
  border-radius: 50%;
  background: var(--gogo-blue);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
}

/*? pairs a section label with its guide link on one baseline */
.section-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
  margin: var(--space-6) 0 var(--space-3);
}

.section-row .section-label { margin: 0; }
</style>
