<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import apiClient from '../api/client';

const authStore = useAuthStore();
const router = useRouter();
const authMode = ref<'login' | 'register'>('login');
const email = ref('');
const password = ref('');
const googleButton = ref<HTMLElement | null>(null);
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;
let googleScriptLoaded = false;

const isRecoverModalOpen = ref(false);
const recoverEmail = ref('');
const recoverLoading = ref(false);
const recoverMessage = ref('');
const recoverError = ref('');

async function submitLogin() {
  await authStore.loginWithPassword(email.value, password.value);
  if (authStore.user?.mustChangePassword) {
    await router.push({ name: 'security' });
    return;
  }
  await router.push('/');
}

function openRecoverModal() {
  recoverEmail.value = email.value;
  recoverMessage.value = '';
  recoverError.value = '';
  isRecoverModalOpen.value = true;
}

function closeRecoverModal() {
  if (recoverLoading.value) {
    return;
  }
  isRecoverModalOpen.value = false;
}

async function submitRecoverPassword() {
  recoverMessage.value = '';
  recoverError.value = '';
  recoverLoading.value = true;

  try {
    const response = await apiClient.post<{ message: string }>(
      '/auth/recover-password',
      { email: recoverEmail.value },
    );
    recoverMessage.value =
      response.data.message ||
      'Si el correo corresponde a un gestor, te enviaremos una contraseña temporal.';
  } catch (error: unknown) {
    const axiosError = error as { response?: { data?: { message?: string } } };
    recoverError.value =
      axiosError?.response?.data?.message ||
      'No se pudo procesar la recuperación de contraseña';
  } finally {
    recoverLoading.value = false;
  }
}

function renderGoogleButton() {
  if (!googleClientId || !googleButton.value || !window.google?.accounts?.id) {
    return;
  }
  googleButton.value.innerHTML = '';
  window.google.accounts.id.renderButton(googleButton.value, {
    theme: 'outline',
    size: 'large',
    width: 320,
    text: authMode.value === 'register' ? 'signup_with' : 'signin_with',
  });
}

function ensureGoogleButton() {
  if (!googleClientId) {
    return;
  }

  if (googleScriptLoaded) {
    nextTick(() => renderGoogleButton());
    return;
  }

  const script = document.createElement('script');
  script.src = 'https://accounts.google.com/gsi/client';
  script.async = true;
  script.onload = () => {
    googleScriptLoaded = true;
    window.google?.accounts.id.initialize({
      client_id: googleClientId,
      callback: async (response: { credential: string }) => {
        await authStore.loginWithGoogle(response.credential);
        await router.push('/');
      },
    });
    renderGoogleButton();
  };
  document.head.appendChild(script);
}

function setAuthMode(nextMode: 'login' | 'register') {
  authMode.value = nextMode;
  authStore.errorMessage = '';
}

watch(authMode, async () => {
  await nextTick();
  renderGoogleButton();
});

onMounted(() => {
  ensureGoogleButton();
});
</script>

<template>
  <section class="mx-auto max-w-md rounded-2xl border border-black/10 bg-white/70 p-6 shadow-sm">
    <div class="grid grid-cols-2 gap-2 rounded-lg border border-black/10 bg-white p-1">
      <button
        type="button"
        class="rounded-md px-3 py-2 text-sm font-medium transition"
        :class="
          authMode === 'login'
            ? 'bg-[#1f6f5b] text-white'
            : 'text-black/70 hover:bg-black/5'
        "
        @click="setAuthMode('login')"
      >
        Iniciar sesión
      </button>
      <button
        type="button"
        class="rounded-md px-3 py-2 text-sm font-medium transition"
        :class="
          authMode === 'register'
            ? 'bg-[#1f6f5b] text-white'
            : 'text-black/70 hover:bg-black/5'
        "
        @click="setAuthMode('register')"
      >
        Crear cuenta
      </button>
    </div>

    <h1 class="mt-5 text-3xl font-semibold text-[#14212b]">
      {{ authMode === 'login' ? 'Iniciar sesión' : 'Crear cuenta' }}
    </h1>

    <div
      v-if="authMode === 'login'"
      class="mt-4 rounded-lg border border-[#1f6f5b]/20 bg-[#1f6f5b]/5 px-3 py-2 text-sm text-black/75"
    >
      <p>
        <span class="font-medium text-[#1f6f5b]">Gestores:</span>
        solo con credenciales (correo y contraseña).
      </p>
      <p class="mt-1">
        <span class="font-medium text-[#1f6f5b]">Administradores:</span>
        solo por Google.
      </p>
    </div>

    <form
      v-if="authMode === 'login'"
      class="mt-6 space-y-4"
      @submit.prevent="submitLogin"
    >
      <label class="block text-sm">
        Correo
        <input
          v-model="email"
          type="email"
          required
          class="mt-1 w-full rounded-md border border-black/15 bg-white px-3 py-2"
        />
      </label>
      <label class="block text-sm">
        Contraseña
        <input
          v-model="password"
          type="password"
          required
          class="mt-1 w-full rounded-md border border-black/15 bg-white px-3 py-2"
        />
      </label>
      <div class="flex justify-end">
        <button
          type="button"
          class="text-sm font-medium text-[#1f6f5b] hover:underline"
          @click="openRecoverModal"
        >
          ¿Olvidaste tu contraseña?
        </button>
      </div>
      <p v-if="authStore.errorMessage" class="text-sm text-[#c45c26]">
        {{ authStore.errorMessage }}
      </p>
      <button
        type="submit"
        class="w-full rounded-md bg-[#1f6f5b] px-4 py-2 text-white disabled:opacity-60"
        :disabled="authStore.loading"
      >
        Entrar
      </button>
      <p class="text-center text-xs text-black/55">
        ¿Eres administrador? Usa Google más abajo.
      </p>
    </form>

    <div v-else class="mt-6 space-y-4">
      <p v-if="authStore.errorMessage" class="text-sm text-[#c45c26]">
        {{ authStore.errorMessage }}
      </p>
      <p class="text-sm text-black/65">
        Crea tu cuenta de administrador con Google. El administrador crea a los gestores dentro del acopio.
      </p>
    </div>

    <div class="my-6 h-px bg-black/10" />
    <div ref="googleButton" class="flex justify-center" />
    <p v-if="!googleClientId" class="mt-3 text-center text-xs text-black/50">
      Configura VITE_GOOGLE_CLIENT_ID para habilitar Google.
    </p>
  </section>

  <Teleport to="body">
    <div
      v-if="isRecoverModalOpen"
      class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      @click="closeRecoverModal"
    >
      <div
        class="w-full max-w-md rounded-2xl border border-black/10 bg-white p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-label="Recuperar contraseña"
        @click.stop
      >
        <div class="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 class="text-xl font-semibold text-[#14212b]">Recuperar contraseña</h2>
            <p class="mt-1 text-sm text-black/65">
              Solo para gestores. Te enviaremos una contraseña temporal al correo.
            </p>
          </div>
          <button type="button" class="nav-btn" :disabled="recoverLoading" @click="closeRecoverModal">
            Cerrar
          </button>
        </div>

        <form class="space-y-4" @submit.prevent="submitRecoverPassword">
          <label class="block text-sm">
            Correo
            <input
              v-model="recoverEmail"
              type="email"
              required
              class="mt-1 w-full rounded-md border border-black/15 bg-white px-3 py-2"
            />
          </label>

          <p v-if="recoverMessage" class="rounded-md bg-[#1f6f5b]/10 px-3 py-2 text-sm text-[#1f6f5b]">
            {{ recoverMessage }}
          </p>
          <p v-if="recoverError" class="text-sm text-[#c45c26]">
            {{ recoverError }}
          </p>

          <button
            type="submit"
            class="w-full rounded-md bg-[#1f6f5b] px-4 py-2 text-white disabled:opacity-60"
            :disabled="recoverLoading"
          >
            {{ recoverLoading ? 'Enviando...' : 'Enviar contraseña temporal' }}
          </button>
        </form>
      </div>
    </div>
  </Teleport>
</template>
