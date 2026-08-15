import Vue from 'vue'
import VueRouter from 'vue-router'

import Live from '@/views/Live.vue'
import Control from '@/views/Control.vue'
import Datalog from '@/views/Datalog.vue'
import Logo from '@/views/Logo.vue'
import Packets from '@/views/Packets.vue'

Vue.use(VueRouter)

export default new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes: [
    { path: '/', redirect: '/live' },
    { path: '/live', name: 'Live', component: Live },
    { path: '/control', name: 'Control', component: Control },
    { path: '/datalog', name: 'Datalog', component: Datalog },
    { path: '/logo', name: 'Logo', component: Logo },
    { path: '/packets', name: 'Packets', component: Packets },
    { path: '*', redirect: '/live' },
  ],
})
