<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import apiClient from '../api/client';
import { useAuthStore } from '../stores/auth';

interface MyAcopio {
  id: number;
  name: string;
  status: string;
  responsibleName: string;
  membershipRole: 'owner' | 'manager';
}

const authStore = useAuthStore();
const myAcopios = ref<MyAcopio[]>([]);
const loading = ref(false);
const errorMessage = ref('');

const canCreateAcopio = computed(() => authStore.user?.canCreateAcopio !== false);

async function loadMyAcopios() {
  loading.value = true;
  errorMessage.value = '';
  try {
    const response = await apiClient.get<MyAcopio[]>('/auth/my-acopios');
    myAcopios.value = response.data;
    await authStore.fetchMe();
  } catch (error: unknown) {
    const axiosError = error as { response?: { data?: { message?: string } } };
    errorMessage.value =
      axiosError?.response?.data?.message || 'No se pudieron cargar tus acopios';
  } finally {
    loading.value = false;
  }
}

function statusLabel(status: string) {
  return status === 'open' ? 'Abierto' : 'Cerrado';
}

function membershipLabel(membershipRole: MyAcopio['membershipRole']) {
  return membershipRole === 'owner' ? 'Administrador' : 'Gestor';
}

onMounted(() => {
  void loadMyAcopios();
});
</script>

<template>
  <section class="mx-auto max-w-3xl space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-3xl font-semibold">Mis acopios</h1>
        <p class="mt-1 text-black/70">
          Lista de los acopios que puedes gestionar.
        </p>
      </div>
      <RouterLink
        v-if="canCreateAcopio"
        to="/acopios/nuevo"
        class="nav-btn nav-btn-primary"
      >
        Crear acopio
      </RouterLink>
    </div>

    <p
      v-if="errorMessage"
      class="rounded-md bg-[#c45c26]/10 px-3 py-2 text-sm text-[#c45c26]"
    >
      {{ errorMessage }}
    </p>

    <p v-if="loading" class="text-sm text-black/50">Cargando...</p>

    <p
      v-else-if="!myAcopios.length"
      class="rounded-xl border border-black/10 bg-white/70 p-4 text-sm"
    >
      Aún no tienes acopios.
      <RouterLink
        v-if="canCreateAcopio"
        to="/acopios/nuevo"
        class="ml-1 text-[#1f6f5b] underline"
      >
        Crea el primero
      </RouterLink>
    </p>

    <ul v-else class="space-y-3">
      <li
        v-for="acopio in myAcopios"
        :key="acopio.id"
        class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-black/10 bg-white/75 p-4"
      >
        <div>
          <p class="font-medium">{{ acopio.name }}</p>
          <p class="text-sm text-black/60">
            {{ statusLabel(acopio.status) }} · {{ membershipLabel(acopio.membershipRole) }}
            · Responsable: {{ acopio.responsibleName }}
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <RouterLink
            :to="`/acopios/${acopio.id}`"
            class="nav-btn"
          >
            Ver
          </RouterLink>
          <RouterLink
            :to="`/acopios/${acopio.id}/gestionar`"
            class="nav-btn nav-btn-primary"
          >
            Gestionar
          </RouterLink>
        </div>
      </li>
    </ul>
  </section>
</template>
