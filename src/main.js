import './styles/tokens.css'
import Vue from 'vue'
import VueResource from 'vue-resource'

import App from './App.vue'
import store from './store'
import router from './router'

Vue.config.productionTip = false

Vue.use(VueResource)

new Vue({
  store,
  router,
  render: (h) => h(App),
}).$mount('#app')
