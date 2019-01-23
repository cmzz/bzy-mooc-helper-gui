import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/login-page',
      name: 'login-page',
      component: require('@/pages/LoginPage').default
    },
    {
      path: '/',
      name: 'landing-page',
      component: require('@/pages/LandingPage').default
    },
    {
      path: '*',
      redirect: '/'
    }
  ]
})
