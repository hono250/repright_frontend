import './assets/design-tokens.css' 
import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'

// Import views (TODO create these)
import LoginView from './views/LoginView.vue'
import HomeView from './views/HomeView.vue'

// Router setup
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/login'
    },
    {
      path: '/login',
      name: 'Login',
      component: LoginView
    },
    {
      path: '/home',
      name: 'Home',
      component: HomeView,
      meta: { requiresAuth: true } // TODO: implement auth guard later
    }
  ]
})

const app = createApp(App)
app.use(router)
app.mount('#app')