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
