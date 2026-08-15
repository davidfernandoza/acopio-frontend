<script setup lang="ts">
import { onMounted } from 'vue';
import { RouterLink, RouterView, useRoute } from 'vue-router';
import { useAuthStore } from './stores/auth';
import { usePwaInstall } from './composables/usePwaInstall';
import UserMenu from './components/UserMenu.vue';
import SiteFooter from './components/SiteFooter.vue';
import WelcomeModal from './components/WelcomeModal.vue';
import PageLoader from './components/PageLoader.vue';

const route = useRoute();
const authStore = useAuthStore();
const { isInstalled, installHint, isPrompting, promptInstall } = usePwaInstall();

onMounted(() => {
  document.getElementById('boot-page-loader')?.remove();
});

async function installApp() {
  await promptInstall();
}
</script>

<template>
  <div class="flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col overflow-x-clip bg-[var(--color-sand)]">
    <header class="sticky top-0 z-40 w-full min-w-0 shrink-0 border-b border-black/10 bg-[#f7f2e8]/95 backdrop-blur">
      <div class="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-2 px-4 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
        <div class="flex flex-wrap items-center gap-2 sm:gap-3">
          <RouterLink
            to="/"
            class="inline-flex items-center gap-2 text-2xl font-semibold tracking-tight text-[#1f6f5b]"
          >
            <img
              src="/icons/icon-192.png"
              alt=""
              class="h-9 w-9 rounded-md"
              width="36"
              height="36"
            />
            Acopio
          </RouterLink>
          <button
            v-if="!isInstalled"
            type="button"
            class="nav-btn"
            :disabled="isPrompting"
            @click="installApp"
          >
            {{ isPrompting ? 'Abriendo…' : 'Descargar app' }}
          </button>
        </div>
        <nav class="flex flex-wrap items-center justify-end gap-2 text-sm sm:gap-3">
          <RouterLink
            to="/"
            class="nav-btn"
            :class="{ 'nav-btn-primary': route.name === 'home' }"
          >
            Mapa
          </RouterLink>
          <RouterLink
            v-if="authStore.isAuthenticated"
            to="/acopios/mios"
            class="nav-btn"
            :class="{
              'nav-btn-primary':
                route.name === 'my-acopios' || route.name === 'acopio-create',
            }"
          >
            Mis acopios
          </RouterLink>
          <RouterLink
            v-if="!authStore.isAuthenticated"
            to="/login"
            class="nav-btn"
            :class="{ 'nav-btn-primary': route.name === 'login' }"
          >
            Gestionar acopio
          </RouterLink>
          <UserMenu v-else />
        </nav>
      </div>
      <p
        v-if="installHint && !isInstalled"
        class="mx-auto max-w-6xl px-4 pb-3 text-xs text-[#1f6f5b]"
      >
        {{ installHint }}
      </p>
    </header>
    <main class="mx-auto flex min-h-screen w-full min-w-0 max-w-6xl flex-1 flex-col overflow-x-clip px-4 py-8">
      <RouterView :key="route.path" />
    </main>
    <SiteFooter class="shrink-0" />
    <WelcomeModal />
    <PageLoader />
  </div>
</template>
