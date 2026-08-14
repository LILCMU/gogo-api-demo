import './styles/tokens.css'
import Vue from 'vue'
import VueResource from 'vue-resource'
import Modal from '@burhanahmeed/vue-modal-2'

import App from './App.vue'
import store from './store'
import router from './router'

Vue.config.productionTip = false

Vue.use(VueResource)
Vue.use(Modal, { componentName: 'ModalVue' })

new Vue({
  store,
  router,
  render: (h) => h(App),
}).$mount('#app')
