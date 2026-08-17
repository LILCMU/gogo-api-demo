import Vue from 'vue'
import VueRouter from 'vue-router'

import Live from '@/views/Live.vue'
import Control from '@/views/Control.vue'
import Datalog from '@/views/Datalog.vue'
import Logo from '@/views/Logo.vue'
import Packets from '@/views/Packets.vue'

Vue.use(VueRouter)

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes: [
    { path: '/', redirect: '/live' },
    { path: '/live', name: 'Live', component: Live, meta: { title: 'Live' } },
    { path: '/control', name: 'Control', component: Control, meta: { title: 'Control' } },
    { path: '/datalog', name: 'Datalog', component: Datalog, meta: { title: 'Datalog' } },
    { path: '/logo', name: 'Logo', component: Logo, meta: { title: 'Logo' } },
    { path: '/packets', name: 'Packets', component: Packets, meta: { title: 'Packets' } },
    { path: '*', redirect: '/live' },
  ],
})

//? single place that sets the tab title, driven by route meta, so no view
//? duplicates this logic
router.afterEach((to) => {
  document.title = to.meta && to.meta.title
    ? to.meta.title + ' · GoGo API Demo'
    : 'GoGo API Demo'
})

export default router
