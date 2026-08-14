<template>
  <header class="app-header">
    <img class="app-header__logo" src="@/assets/gogo-logo.png" alt="GoGo Board" />

    <nav class="app-header__nav">
      <router-link to="/live">Live</router-link>
      <router-link to="/control">Control</router-link>
      <router-link to="/datalog">Datalog</router-link>
      <span class="app-header__divider"></span>
      <router-link to="/logo">Logo</router-link>
      <router-link to="/packets">Packets</router-link>
    </nav>

    <span class="app-header__status" :class="boardStatus ? 'is-connected' : 'is-disconnected'">
      {{ boardStatus ? "Connected" : "No board" }}
    </span>
  </header>
</template>

<script>
import { mapGetters } from "vuex";

export default {
  name: "AppHeader",
  computed: {
    ...mapGetters(["boardStatus"]),
  },
};
</script>

<style>
.app-header {
  display: flex;
  align-items: center;
  gap: 28px;
  padding: 14px 24px;
  background: var(--card-bg);
  border-bottom: 1px solid var(--hairline);
}

.app-header__logo { width: 132px; height: 39px; }

.app-header__nav { display: flex; align-items: center; gap: 18px; }

.app-header__nav a {
  font-weight: 700;
  font-size: 14px;
  color: var(--muted);
  text-decoration: none;
}

.app-header__nav a.router-link-active { color: var(--gogo-ink); }

.app-header__divider {
  width: 1px;
  height: 18px;
  background: var(--hairline);
}

.app-header__status {
  margin-left: auto;
  font-size: 12px;
  font-weight: 700;
  padding: 6px 14px;
  border-radius: var(--radius-pill);
}

.app-header__status.is-connected { background: var(--gogo-green); color: var(--gogo-ink); }
.app-header__status.is-disconnected { background: #eef1f4; color: var(--muted); }
</style>
