import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { usePageLoaderStore } from '../stores/pageLoader';

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior(_to, _from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    }
    return { top: 0, left: 0 };
  },
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/HomeView.vue'),
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
    },
    {
      path: '/acopios/nuevo',
      name: 'acopio-create',
      component: () => import('../views/CreateAcopioView.vue'),
      meta: { requiresAuth: true, requiresCanCreateAcopio: true },
    },
    {
      path: '/acopios/mios',
      name: 'my-acopios',
      component: () => import('../views/MyAcopiosView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/acopios/:idAcopio',
      name: 'acopio-detail',
      component: () => import('../views/AcopioDetailView.vue'),
    },
    {
      path: '/acopios/:idAcopio/gestionar',
      name: 'acopio-manage',
      component: () => import('../views/ManageAcopioView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/usuarios',
      name: 'users',
      component: () => import('../views/UsersView.vue'),
      meta: { requiresAuth: true, requiresCanManageUsers: true },
    },
    {
      path: '/seguridad',
      name: 'security',
      component: () => import('../views/SecurityView.vue'),
      meta: { requiresAuth: true },
    },
  ],
});

router.beforeEach(async (to, from) => {
  const pageLoader = usePageLoaderStore();
  if (to.path !== from.path) {
    pageLoader.startRoute();
  }
  const authStore = useAuthStore();
  if (authStore.token && !authStore.user) {
    try {
      await authStore.fetchMe();
    } catch {
      authStore.logout();
    }
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }

  if (
    authStore.isAuthenticated &&
    authStore.user?.mustChangePassword &&
    to.name !== 'security' &&
    to.name !== 'login'
  ) {
    return { name: 'security' };
  }

  if (to.meta.requiresCanCreateAcopio && authStore.user?.canCreateAcopio === false) {
    return { name: 'my-acopios' };
  }

  if (to.meta.requiresCanManageUsers && !authStore.user?.canManageUsers) {
    return { name: 'my-acopios' };
  }

  return true;
});

export default router;
