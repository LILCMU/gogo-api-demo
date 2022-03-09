<template>
  <div id="app">
    <div id="nav">
      <div class="messege-container">
      <router-link to="/gogoapi">GoGoAPI</router-link>
      </div>
      <div class="messege-container">
      <p>|</p> 
      </div>
      <div class="messege-container">
      <router-link to="/offline-datalog">Offline Datalog</router-link>
      </div>
    </div>
    <router-view />
  </div>
</template>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  display: flex;
  flex-direction: column;
  justify-content:center;

}

#nav {
  display: flex;
  padding:auto 40%;
  flex-direction: row;
  justify-content:center;
  align-items: center;
  width: 100%;

}

#nav a {
  font-weight: bold;
  color: #2c3e50;
}

#nav a.router-link-exact-active {
  color: #42b983;
}

.messege-container{
  display: flex;
  width: 5%;
  margin: 0.5%;
  justify-content:center;
  align-items: center;
}
/* .messege-container p{
  margin:1px 5rem;
} */
</style>
