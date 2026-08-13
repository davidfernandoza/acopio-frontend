<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();
const router = useRouter();
const saving = ref(false);
const errorMessage = ref('');

const isOpen = computed(
  () =>
    Boolean(authStore.isAuthenticated) &&
    Boolean(authStore.user) &&
    authStore.user?.hasSeenWelcome === false,
);

const isManager = computed(() => Boolean(authStore.user?.isManager));
const mustChangePassword = computed(() =>
  Boolean(authStore.user?.mustChangePassword),
);

async function confirmWelcome() {
  if (saving.value) {
    return;
  }

  saving.value = true;
  errorMessage.value = '';

  try {
    await authStore.markWelcomeSeen();
    if (mustChangePassword.value) {
      await router.push({ name: 'security' });
    }
  } catch (error: unknown) {
    const axiosError = error as { response?: { data?: { message?: string } } };
    errorMessage.value =
      axiosError?.response?.data?.message ||
      'No se pudo guardar el mensaje de bienvenida';
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4"
    >
      <div
        class="w-full max-w-md rounded-2xl border border-black/10 bg-white p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-label="Bienvenida"
      >
        <div class="mb-4 flex items-center gap-3">
          <img
            src="/icons/icon-192.png"
            alt=""
            class="h-12 w-12 rounded-xl"
            width="48"
            height="48"
          />
          <div>
            <p class="text-sm font-medium text-[#1f6f5b]">Acopio</p>
            <h2 class="text-2xl font-semibold text-[#14212b]">
              ¡Bienvenido{{ authStore.user?.name ? `, ${authStore.user.name}` : '' }}!
            </h2>
          </div>
        </div>

        <p class="text-sm leading-relaxed text-black/70">
          Nos alegra tenerte aquí. Desde Acopio puedes crear, consultar y gestionar centros de apoyo de forma sencilla.
        </p>

        <div
          v-if="isManager"
          class="mt-4 rounded-xl border border-[#1f6f5b]/20 bg-[#1f6f5b]/5 px-4 py-3 text-sm text-[#16352d]"
        >
          <p class="font-semibold text-[#1f6f5b]">Cuenta de gestor</p>
          <p class="mt-1 leading-relaxed text-black/75">
            Debes cambiar la contraseña temporal por una propia antes de continuar usando la plataforma.
          </p>
        </div>

        <p v-if="errorMessage" class="mt-3 text-sm text-[#c45c26]">
          {{ errorMessage }}
        </p>

        <button
          type="button"
          class="mt-5 w-full rounded-md bg-[#1f6f5b] px-4 py-2.5 text-white disabled:opacity-60"
          :disabled="saving"
          @click="confirmWelcome"
        >
          {{
            mustChangePassword
              ? saving
                ? 'Continuando...'
                : 'Continuar y cambiar contraseña'
              : saving
                ? 'Guardando...'
                : 'Empezar'
          }}
        </button>
      </div>
    </div>
  </Teleport>
</template>
