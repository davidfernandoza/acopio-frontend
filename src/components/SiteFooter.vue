<script setup lang="ts">
import { reactive, ref } from 'vue';
import apiClient from '../api/client';

const form = reactive({
  name: '',
  email: '',
  message: '',
});
const submitting = ref(false);
const successMessage = ref('');
const errorMessage = ref('');

async function submitContactForm() {
  submitting.value = true;
  successMessage.value = '';
  errorMessage.value = '';
  try {
    await apiClient.post('/contact', {
      name: form.name.trim(),
      email: form.email.trim(),
      message: form.message.trim(),
    });
    successMessage.value = 'Mensaje enviado. Te responderemos pronto.';
    form.name = '';
    form.email = '';
    form.message = '';
  } catch (error: unknown) {
    const axiosError = error as {
      response?: { data?: { message?: string; details?: string[] } };
    };
    errorMessage.value =
      axiosError.response?.data?.details?.[0] ||
      axiosError.response?.data?.message ||
      'No se pudo enviar el mensaje';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <footer class="bg-[#14212b] text-[#f7f2e8]">
    <div class="mx-auto grid max-w-6xl gap-10 px-4 py-10 md:grid-cols-2">
      <div>
        <p class="text-2xl font-semibold tracking-tight text-[#7dbaa8]">Acopio</p>
        <p class="mt-3 max-w-md text-sm text-white/70">
          Encuentra y gestiona puntos de acopio de ayuda.
        </p>
        <p class="mt-6 text-sm text-white/55">
          Soporte:
          <a href="mailto:soporte@acopio.lat" class="text-[#7dbaa8] underline">
            soporte@acopio.lat
          </a>
        </p>
      </div>

      <form class="space-y-3" @submit.prevent="submitContactForm">
        <h2 class="text-lg font-semibold">Contacto</h2>
        <label class="block text-sm">
          Nombre
          <input v-model="form.name" type="text" required minlength="2" maxlength="180"
            class="mt-1 w-full rounded-md border border-white/15 bg-white/5 px-3 py-2 text-[#f7f2e8] outline-none placeholder:text-white/35 focus:border-[#7dbaa8]"
            placeholder="Tu nombre" />
        </label>
        <label class="block text-sm">
          Correo
          <input v-model="form.email" type="email" required
            class="mt-1 w-full rounded-md border border-white/15 bg-white/5 px-3 py-2 text-[#f7f2e8] outline-none placeholder:text-white/35 focus:border-[#7dbaa8]"
            placeholder="tu@correo.com" />
        </label>
        <label class="block text-sm">
          Mensaje
          <textarea v-model="form.message" required minlength="10" maxlength="4000" rows="4"
            class="mt-1 w-full rounded-md border border-white/15 bg-white/5 px-3 py-2 text-[#f7f2e8] outline-none placeholder:text-white/35 focus:border-[#7dbaa8]"
            placeholder="¿En qué podemos ayudarte?" />
        </label>
        <p v-if="successMessage" class="text-sm text-[#7dbaa8]">{{ successMessage }}</p>
        <p v-if="errorMessage" class="text-sm text-[#f0a070]">{{ errorMessage }}</p>
        <button type="submit" class="nav-btn nav-btn-primary disabled:opacity-60" :disabled="submitting">
          {{ submitting ? 'Enviando…' : 'Enviar mensaje' }}
        </button>
      </form>
    </div>
  </footer>
</template>
