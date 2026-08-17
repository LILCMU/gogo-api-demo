import Vue from 'vue'
import Vuex from 'vuex'
import gogo from './gogo'

Vue.use(Vuex)

const store = new Vuex.Store(gogo)

store.dispatch('bindTransport')
store.dispatch('connect', { prompt: false })

export default store

