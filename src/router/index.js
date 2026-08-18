import Vue from 'vue'
import VueRouter from 'vue-router'

import Live from '@/views/Live.vue'
import Control from '@/views/Control.vue'
import Datalog from '@/views/Datalog.vue'
import Logo from '@/views/Logo.vue'
import Packets from '@/views/Packets.vue'
import Reference from '@/views/Reference.vue'

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
    { path: '/reference', redirect: '/reference/protocol' },
    {
      path: '/reference/:doc(protocol|datalog)',
      name: 'Reference',
      component: Reference,
      props: true,
      meta: { title: 'Reference' },
    },
    { path: '*', redirect: '/live' },
  ],

  //? guide links carry a hash into a page that is not mounted yet; without this
  //? vue-router leaves the scroll position alone and the deep link does nothing
  scrollBehavior: function (to, from, savedPosition) {
    if (to.hash) return { selector: to.hash, offset: { x: 0, y: 20 } }
    if (savedPosition) return savedPosition
    return { x: 0, y: 0 }
  },
})

//? single place that sets the tab title, driven by route meta, so no view
//? duplicates this logic
router.afterEach((to) => {
  document.title = to.meta && to.meta.title
    ? to.meta.title + ' · GoGo API Demo'
    : 'GoGo API Demo'
})

export default router
