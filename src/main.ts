import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { registerSW } from 'virtual:pwa-register';
import App from './App.vue';
import router from './router';
import { initPwaInstallListeners } from './composables/usePwaInstall';
import './style.css';

initPwaInstallListeners();

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  if (import.meta.env.DEV) {
    try {
      await navigator.serviceWorker.register('/sw-dev.js', { scope: '/' });
    } catch (error) {
      console.warn('[pwa] No se pudo registrar el service worker de desarrollo', error);
    }
    return;
  }

  registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      if (registration) {
        void registration.update();
      }
    },
  });
}

void registerServiceWorker();

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount('#app');
