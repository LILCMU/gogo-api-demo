import { GogoTransport } from '@/gogo/transport'
import { buildCommand, parseReport, parseResponse } from '@/gogo/protocol'

const transport = new GogoTransport()

export default {
  state: {
    connected: false,
    report: null,
    lastResponse: null,
  },

  getters: {
    connected: (state) => state.connected,
    boardStatus: (state) => state.connected && !!state.report,
    report: (state) => state.report,
    lastResponse: (state) => state.lastResponse,
  },

  mutations: {
    SET_CONNECTED (state, connected) {
      state.connected = connected
      if (!connected) state.report = null
    },
    SET_REPORT (state, report) {
      state.report = report
    },
    SET_RESPONSE (state, response) {
      state.lastResponse = response
    },
    CLEAR_RESPONSE (state) {
      state.lastResponse = null
    },
  },

  actions: {
    //? `prompt: false` on the startup attempt — requestDevice() needs a user
    //? gesture, so an unprompted call at load can only reach granted devices
    async connect (context, { prompt = true } = {}) {
      await transport.connect({ prompt })
    },

    async disconnect () {
      await transport.disconnect()
    },

    async send (context, { category, command, params = [] }) {
      await transport.send(buildCommand(category, command, params))
    },

    clearResponse ({ commit }) {
      commit('CLEAR_RESPONSE')
    },

    bindTransport ({ commit }) {
      transport.on('connect', () => commit('SET_CONNECTED', true))
      transport.on('disconnect', () => commit('SET_CONNECTED', false))
      transport.on('report', (bytes) => {
        const report = parseReport(bytes)
        if (report) {
          commit('SET_REPORT', report)
          return
        }
        const response = parseResponse(bytes)
        if (response) commit('SET_RESPONSE', response)
      })
    },
  },
}
