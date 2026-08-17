import { GogoTransport } from '@/gogo/transport'
import { buildCommand, parseReport, parseResponse } from '@/gogo/protocol'

const transport = new GogoTransport()

export default {
  state: {
    connected: false,
    report: null,
    reportRaw: null,
    lastResponse: null,
    error: null,
  },

  getters: {
    connected: (state) => state.connected,
    isBoardReady: (state) => state.connected && !!state.report,
    report: (state) => state.report,
    reportRaw: (state) => state.reportRaw,
    lastResponse: (state) => state.lastResponse,
    error: (state) => state.error,
  },

  mutations: {
    SET_CONNECTED (state, connected) {
      state.connected = connected
      if (!connected) {
        state.report = null
        state.reportRaw = null
      }
    },
    SET_REPORT (state, report) {
      state.report = report
    },
    //? the raw frame is kept alongside the parsed one purely so the Packets
    //? page can show what actually arrived on the wire
    SET_REPORT_RAW (state, bytes) {
      state.reportRaw = bytes
    },
    SET_RESPONSE (state, response) {
      state.lastResponse = response
    },
    CLEAR_RESPONSE (state) {
      state.lastResponse = null
    },
    SET_ERROR (state, message) {
      state.error = message
    },
    CLEAR_ERROR (state) {
      state.error = null
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
      transport.on('connect', () => {
        commit('CLEAR_ERROR')
        commit('SET_CONNECTED', true)
      })
      transport.on('disconnect', () => commit('SET_CONNECTED', false))
      transport.on('report', (bytes) => {
        const report = parseReport(bytes)
        if (report) {
          commit('SET_REPORT', report)
          commit('SET_REPORT_RAW', bytes)
          return
        }
        const response = parseResponse(bytes)
        if (response) commit('SET_RESPONSE', response)
      })
      //? transport errors have no other route to the UI
      transport.on('error', (error) => commit('SET_ERROR', error.message))
    },
  },
}
