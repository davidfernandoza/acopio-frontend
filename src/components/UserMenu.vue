<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();
const isOpen = ref(false);
const menuRoot = ref<HTMLElement | null>(null);

const isUserSectionActive = computed(
  () => route.name === 'users' || route.name === 'security',
);

function toggleMenu() {
  isOpen.value = !isOpen.value;
}

function closeMenu() {
  isOpen.value = false;
}

function handleClickOutside(event: MouseEvent) {
  if (!menuRoot.value) return;
  if (!menuRoot.value.contains(event.target as Node)) {
    closeMenu();
  }
}

function logout() {
  closeMenu();
  authStore.logout();
  router.push('/login');
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<template>
  <div ref="menuRoot" class="relative inline-flex flex-col items-stretch">
    <button
      type="button"
      class="nav-btn"
      :class="{ 'nav-btn-primary': isUserSectionActive }"
      @click="toggleMenu"
    >
      {{ authStore.user?.name }}
      <span class="ml-1 text-xs opacity-60">▾</span>
    </button>
    <div
      v-if="isOpen"
      class="absolute top-full right-0 z-50 min-w-full whitespace-nowrap rounded-md border border-black/10 bg-white py-1 shadow-lg"
    >
      <RouterLink
        v-if="authStore.user?.canManageUsers"
        to="/usuarios"
        class="nav-menu-item"
        :class="{ 'nav-menu-item-active': route.name === 'users' }"
        @click="closeMenu"
      >
        Usuarios
      </RouterLink>
      <RouterLink
        to="/seguridad"
        class="nav-menu-item"
        :class="{ 'nav-menu-item-active': route.name === 'security' }"
        @click="closeMenu"
      >
        Seguridad
      </RouterLink>
      <button
        type="button"
        class="nav-menu-item text-[#c45c26] hover:bg-[#c45c26]/10"
        @click="logout"
      >
        Salir
      </button>
    </div>
  </div>
</template>
