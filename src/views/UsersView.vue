<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import apiClient from '../api/client';
import SearchableSelect from '../components/SearchableSelect.vue';
import { withPageReady } from '../composables/usePageReady';

interface OwnedAcopio {
  id: number;
  name: string;
  status: string;
  responsibleName: string;
  membershipRole?: 'owner' | 'manager';
}

interface ManagerRow {
  id: number;
  idUser: number;
  user?: {
    id: number;
    name: string;
    email: string;
    invitationStatus?: 'pending' | 'active';
  };
}

const ownedAcopios = ref<OwnedAcopio[]>([]);
const selectedAcopioId = ref<number>(0);
const managers = ref<ManagerRow[]>([]);
const loading = ref(false);
const message = ref('');
const errorMessage = ref('');
const editingUserId = ref<number | null>(null);
const resendingUserId = ref<number | null>(null);

const createForm = reactive({
  name: '',
  email: '',
});

const editForm = reactive({
  name: '',
  email: '',
  resetPassword: false,
});

const hasOwnedAcopios = computed(() => ownedAcopios.value.length > 0);

const ownedAcopioOptions = computed(() =>
  ownedAcopios.value.map((acopio) => ({
    value: acopio.id,
    label: acopio.name,
  })),
);

function invitationStatusLabel(status: string | undefined) {
  return status === 'pending' ? 'Pendiente' : 'Activo';
}

function isPendingManager(manager: ManagerRow) {
  return manager.user?.invitationStatus === 'pending';
}

async function loadOwnedAcopios() {
  const response = await apiClient.get<OwnedAcopio[]>('/auth/my-acopios');
  ownedAcopios.value = response.data.filter(
    (acopio) => acopio.membershipRole !== 'manager'
  );
  if (ownedAcopios.value.length && !selectedAcopioId.value) {
    selectedAcopioId.value = ownedAcopios.value[0].id;
  }
}

async function loadManagers() {
  if (!selectedAcopioId.value) {
    managers.value = [];
    return;
  }
  loading.value = true;
  errorMessage.value = '';
  try {
    const response = await apiClient.get<ManagerRow[]>(
      `/acopios/${selectedAcopioId.value}/managers`
    );
    managers.value = response.data;
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || 'No se pudieron cargar usuarios';
  } finally {
    loading.value = false;
  }
}

async function createUser() {
  errorMessage.value = '';
  message.value = '';
  try {
    await apiClient.post(`/acopios/${selectedAcopioId.value}/managers`, {
      name: createForm.name,
      email: createForm.email,
    });
    createForm.name = '';
    createForm.email = '';
    message.value = 'Invitación enviada por correo';
    await loadManagers();
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || 'No se pudo crear el usuario';
  }
}

function startEdit(manager: ManagerRow) {
  editingUserId.value = manager.idUser;
  editForm.name = manager.user?.name || '';
  editForm.email = manager.user?.email || '';
  editForm.resetPassword = false;
}

function cancelEdit() {
  editingUserId.value = null;
}

async function saveEdit() {
  if (!editingUserId.value) return;
  errorMessage.value = '';
  message.value = '';
  try {
    await apiClient.put(
      `/acopios/${selectedAcopioId.value}/managers/${editingUserId.value}`,
      {
        name: editForm.name,
        email: editForm.email,
        resetPassword: editForm.resetPassword,
      }
    );
    message.value = editForm.resetPassword
      ? 'Usuario actualizado e invitación reenviada'
      : 'Usuario actualizado';
    editingUserId.value = null;
    await loadManagers();
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || 'No se pudo actualizar el usuario';
  }
}

async function resendInvitation(manager: ManagerRow) {
  if (!isPendingManager(manager)) {
    return;
  }
  errorMessage.value = '';
  message.value = '';
  resendingUserId.value = manager.idUser;
  try {
    await apiClient.post(
      `/acopios/${selectedAcopioId.value}/managers/${manager.idUser}/resend-invitation`
    );
    message.value = 'Invitación reenviada por correo';
  } catch (error: any) {
    errorMessage.value =
      error?.response?.data?.message || 'No se pudo reenviar la invitación';
  } finally {
    resendingUserId.value = null;
  }
}

async function deleteUser(idUser: number) {
  if (!confirm('¿Eliminar este usuario del acopio?')) return;
  errorMessage.value = '';
  message.value = '';
  try {
    await apiClient.delete(`/acopios/${selectedAcopioId.value}/managers/${idUser}`);
    message.value = 'Usuario eliminado del acopio';
    await loadManagers();
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || 'No se pudo eliminar el usuario';
  }
}

onMounted(async () => {
  await withPageReady(async () => {
    await loadOwnedAcopios();
    await loadManagers();
  });
});

watch(selectedAcopioId, async () => {
  cancelEdit();
  await loadManagers();
});
</script>

<template>
  <section class="mx-auto max-w-3xl space-y-6">
    <div>
      <h1 class="text-3xl font-semibold">Usuarios</h1>
      <p class="mt-1 text-black/70">
        Administra los usuarios gestores de tus acopios.
      </p>
    </div>

    <p v-if="!hasOwnedAcopios" class="rounded-xl border border-black/10 bg-white/70 p-4 text-sm">
      Solo el dueño de un acopio puede crear usuarios. Crea un acopio primero.
    </p>

    <template v-else>
      <label class="block text-sm">
        Acopio
        <SearchableSelect
          v-model="selectedAcopioId"
          :options="ownedAcopioOptions"
          required
        />
      </label>

      <p v-if="message" class="rounded-md bg-[#1f6f5b]/10 px-3 py-2 text-sm text-[#1f6f5b]">
        {{ message }}
      </p>
      <p v-if="errorMessage" class="rounded-md bg-[#c45c26]/10 px-3 py-2 text-sm text-[#c45c26]">
        {{ errorMessage }}
      </p>

      <form
        class="space-y-3 rounded-xl border border-black/10 bg-white/75 p-4"
        @submit.prevent="createUser"
      >
        <h2 class="text-lg font-semibold">Crear usuario</h2>
        <input
          v-model="createForm.name"
          required
          placeholder="Nombre"
          class="w-full rounded-md border border-black/15 px-3 py-2"
        />
        <input
          v-model="createForm.email"
          type="email"
          required
          placeholder="Correo"
          class="w-full rounded-md border border-black/15 px-3 py-2"
        />
        <button type="submit" class="rounded-md bg-[#1f6f5b] px-3 py-2 text-white">
          Crear y enviar contraseña
        </button>
      </form>

      <div class="rounded-xl border border-black/10 bg-white/75 p-4">
        <h2 class="text-lg font-semibold">Usuarios del acopio</h2>
        <p v-if="loading" class="mt-2 text-sm text-black/50">Cargando...</p>
        <ul v-else class="mt-3 space-y-3">
          <li
            v-for="manager in managers"
            :key="manager.id"
            class="rounded-md border border-black/10 p-3"
          >
            <template v-if="editingUserId === manager.idUser">
              <div class="space-y-2">
                <input v-model="editForm.name" class="w-full rounded-md border border-black/15 px-3 py-2" />
                <input v-model="editForm.email" type="email" class="w-full rounded-md border border-black/15 px-3 py-2" />
                <label v-if="isPendingManager(manager)" class="flex items-center gap-2 text-sm">
                  <input v-model="editForm.resetPassword" type="checkbox" />
                  Regenerar contraseña y enviar por correo
                </label>
                <div class="flex gap-2">
                  <button type="button" class="rounded-md bg-[#1f6f5b] px-3 py-2 text-sm text-white" @click="saveEdit">
                    Guardar
                  </button>
                  <button type="button" class="rounded-md border border-black/15 px-3 py-2 text-sm" @click="cancelEdit">
                    Cancelar
                  </button>
                </div>
              </div>
            </template>
            <template v-else>
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p class="font-medium">{{ manager.user?.name }}</p>
                  <p class="text-sm text-black/60">{{ manager.user?.email }}</p>
                  <p
                    class="mt-1 text-xs font-medium"
                    :class="
                      isPendingManager(manager) ? 'text-[#c45c26]' : 'text-[#1f6f5b]'
                    "
                  >
                    {{ invitationStatusLabel(manager.user?.invitationStatus) }}
                  </p>
                </div>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-if="isPendingManager(manager)"
                    type="button"
                    class="rounded-md border border-[#1f6f5b] px-3 py-1.5 text-sm text-[#1f6f5b] disabled:opacity-60"
                    :disabled="resendingUserId === manager.idUser"
                    @click="resendInvitation(manager)"
                  >
                    {{
                      resendingUserId === manager.idUser
                        ? 'Reenviando…'
                        : 'Reenviar invitación'
                    }}
                  </button>
                  <button
                    type="button"
                    class="rounded-md border border-[#1f6f5b] px-3 py-1.5 text-sm text-[#1f6f5b]"
                    @click="startEdit(manager)"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    class="rounded-md border border-[#c45c26] px-3 py-1.5 text-sm text-[#c45c26]"
                    @click="deleteUser(manager.idUser)"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </template>
          </li>
          <li v-if="!managers.length" class="text-sm text-black/50">
            Aún no hay usuarios gestores en este acopio.
          </li>
        </ul>
      </div>
    </template>
  </section>
</template>
