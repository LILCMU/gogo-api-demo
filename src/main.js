import Vue from 'vue'
import App from './App.vue'
import VueResource from 'vue-resource'
import store from './store'
import {
  HID_ONCONNECT,
  HID_ONDISCONNECT,
  HID_ONERROR,
  HID_ONINPUTREPORT,
} from './store/mutation-types'

const mutations = {
  HID_ONCONNECT,
  HID_ONDISCONNECT,
  HID_ONERROR,
  HID_ONINPUTREPORT,
}

// import VueNativeSock from 'vue-native-websocket'
import { CONST } from '@/store/const'
import router from '@/router'
import HIDDevice from './plugins/webhid-plugin/hid-devices'

Vue.config.productionTip = false

Vue.use(VueResource)

Vue.use(HIDDevice, {
  hid_vid: CONST.hid_vid,
  hid_pid: CONST.hid_pid,
}, {
  store: store,
  mutations: mutations,
  format: "json",
})

// Vue.use(VueNativeSock, CONST.websocket_port, {
//   store: store,
//   mutations: mutations,
//   reconnection: true,
//   reconnectionDelay: 3000,
//   format: 'json',
// })
//? add modal
import Modal from "@burhanahmeed/vue-modal-2";
Vue.use(Modal, {
  componentName: "ModalVue"
});


new Vue({
  store,
  router,
  render: h => h(App)
}).$mount('#app')
