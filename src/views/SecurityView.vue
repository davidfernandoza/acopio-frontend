<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import apiClient from '../api/client';
import type { AuthUser } from '../types';
import { withPageReady } from '../composables/usePageReady';

const authStore = useAuthStore();
const router = useRouter();
const message = ref('');
const errorMessage = ref('');
const saving = ref(false);

const isGoogleAccount = computed(
  () => authStore.user?.authProvider === 'google',
);

const mustChangePassword = computed(
  () => Boolean(authStore.user?.mustChangePassword),
);

const form = reactive({
  name: '',
  email: '',
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
});

onMounted(async () => {
  await withPageReady(() => {
    form.name = authStore.user?.name || '';
    form.email = authStore.user?.email || '';
  });
});

async function saveCredentials() {
  errorMessage.value = '';
  message.value = '';

  if (!isGoogleAccount.value) {
    if (mustChangePassword.value && !form.newPassword) {
      errorMessage.value = 'Debes definir una nueva contraseña';
      return;
    }
    if (form.newPassword && form.newPassword !== form.confirmPassword) {
      errorMessage.value = 'La confirmación de contraseña no coincide';
      return;
    }
  }

  saving.value = true;
  try {
    const wasForcedPasswordChange = mustChangePassword.value;
    const payload: Record<string, string> = {
      name: form.name,
    };

    if (!isGoogleAccount.value) {
      payload.email = form.email;
      if (form.newPassword) {
        payload.newPassword = form.newPassword;
        if (!wasForcedPasswordChange && form.currentPassword) {
          payload.currentPassword = form.currentPassword;
        }
      }
    }

    const response = await apiClient.put<{ token: string; user: AuthUser }>(
      '/auth/credentials',
      payload,
    );
    authStore.updateSession(response.data.token, response.data.user);
    form.currentPassword = '';
    form.newPassword = '';
    form.confirmPassword = '';
    message.value = wasForcedPasswordChange
      ? 'Contraseña actualizada. Ya puedes usar la plataforma.'
      : isGoogleAccount.value
        ? 'Nombre actualizado'
        : 'Credenciales actualizadas';

    if (wasForcedPasswordChange) {
      await router.push('/');
    }
  } catch (error: unknown) {
    const axiosError = error as { response?: { data?: { message?: string } } };
    errorMessage.value =
      axiosError?.response?.data?.message ||
      'No se pudieron actualizar los datos';
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <section class="mx-auto max-w-lg space-y-6">
    <div>
      <h1 class="text-3xl font-semibold">
        {{ mustChangePassword ? 'Cambia tu contraseña' : 'Seguridad' }}
      </h1>
      <p class="mt-1 text-black/70">
        <template v-if="mustChangePassword">
          Es tu primer ingreso. Define una contraseña nueva para continuar.
        </template>
        <template v-else-if="isGoogleAccount">
          Tu cuenta es de Google: solo puedes cambiar el nombre.
        </template>
        <template v-else>
          Cambia los datos de acceso de tu cuenta.
        </template>
      </p>
    </div>

    <form
      class="space-y-4 rounded-xl border border-black/10 bg-white/75 p-5"
      @submit.prevent="saveCredentials"
    >
      <label class="block text-sm">
        Nombre
        <input
          v-model="form.name"
          required
          class="mt-1 w-full rounded-md border border-black/15 px-3 py-2"
        />
      </label>

      <template v-if="!isGoogleAccount">
        <label class="block text-sm">
          Correo
          <input
            v-model="form.email"
            type="email"
            required
            class="mt-1 w-full rounded-md border border-black/15 px-3 py-2"
          />
        </label>
        <label v-if="!mustChangePassword" class="block text-sm">
          Contraseña actual
          <input
            v-model="form.currentPassword"
            type="password"
            class="mt-1 w-full rounded-md border border-black/15 px-3 py-2"
          />
        </label>
        <label class="block text-sm">
          Nueva contraseña
          <input
            v-model="form.newPassword"
            type="password"
            minlength="6"
            :required="mustChangePassword"
            class="mt-1 w-full rounded-md border border-black/15 px-3 py-2"
          />
        </label>
        <label class="block text-sm">
          Confirmar nueva contraseña
          <input
            v-model="form.confirmPassword"
            type="password"
            minlength="6"
            :required="mustChangePassword"
            class="mt-1 w-full rounded-md border border-black/15 px-3 py-2"
          />
        </label>
      </template>

      <p
        v-else
        class="rounded-md bg-[#1f6f5b]/10 px-3 py-2 text-sm text-[#1f6f5b]"
      >
        Correo de Google: {{ authStore.user?.email }}
      </p>

      <p v-if="message" class="text-sm text-[#1f6f5b]">{{ message }}</p>
      <p v-if="errorMessage" class="text-sm text-[#c45c26]">{{ errorMessage }}</p>

      <div class="flex flex-wrap gap-2">
        <button
          type="submit"
          class="nav-btn nav-btn-primary"
          :disabled="saving"
        >
          {{ mustChangePassword ? 'Guardar y continuar' : 'Guardar cambios' }}
        </button>
        <RouterLink v-if="!mustChangePassword" to="/" class="nav-btn">
          Cancelar
        </RouterLink>
      </div>
    </form>
  </section>
</template>
