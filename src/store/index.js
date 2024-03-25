import Vue from 'vue'
import Vuex from 'vuex'
import {
  HID_ONCONNECT,
  HID_ONDISCONNECT,
  HID_ONERROR,
  HID_ONINPUTREPORT,
} from './mutation-types.js'
import { CONST } from './const'

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    socket: {
      isConnected: false,
      message: 'disconnected',
    },
    board: {
      status: false
    },
    response: {
      command: 0,
      data: 0,
      size: 0,
      status: 0
    },
    debug: {
      enabled: false,
      message: [],
    }
  },
  mutations: {
    [HID_ONCONNECT](state, event) {
      state.socket.isConnected = true
      state.board.status = false
      console.log(HID_ONCONNECT)
    },
    [HID_ONDISCONNECT](state, event) {
      state.socket.isConnected = false
      state.socket.message = 'disconnected'
      state.board.status = false
      console.log(HID_ONDISCONNECT);
    },
    [HID_ONERROR](state, event) {
      console.error(state, event)
    },
    [HID_ONINPUTREPORT](state, message) {
      if (message != undefined) {
        if (message[0] == CONST.response_packet_type) {
          if (state.debug.enabled) {
            state.debug.message.push(message)
          }
          state.response.size = message[1]
          state.response.command = message[2]
          state.response.status = message[3]
          state.response.data = message.filter(function (value, index) { return index > 3; })
        }
        else {
          state.socket.message = message
        }
        if (!state.board.status)
          state.board.status = true
      }
      else {
        if (state.board.status) {
          state.board.status = false
          state.socket.message = "disconnected"
        }
      }
    },
    clear_response_socket(state) {
      state.response.size = 0
      state.response.status = 0
      state.response.data = 0
      state.response.command = 0
    },
    set_debug_state(state, enabled) {
      state.debug.enabled = enabled
      console.log(state.debug.message)
      state.debug.message = []
    }
  },
  actions: {
    connectDevice: function (context) {
      Vue.prototype.$webhidConnect()
    },
    sendHID: async function (context, data) {
      if (Vue.prototype.$webhid) {
        let sendData = data.slice(1)  //? data must be 63 bytes without report id
        await Vue.prototype.$webhid.sendReport(0, new Uint8Array(sendData))
      }
    },
    clearResponseHID: function (context) {
      context.commit('clear_response_socket')
    },
    debugEnabled: function(context, enabled) {
      context.commit('set_debug_state', enabled)
    }
  },
  modules: {
  },
  getters: {
    gogoReport: state => state.socket.message,
    gogoResponse: state => state.response,
    boardStatus: state => state.board.status,
  }
})

