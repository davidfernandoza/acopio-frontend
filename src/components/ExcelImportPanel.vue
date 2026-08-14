<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import { useAcopiosStore } from '../stores/acopios';

const props = defineProps<{
  templateType: 'needs' | 'offers';
  idAcopio?: number;
  helpText?: string;
}>();

const emit = defineEmits<{
  parsed: [items: any[]];
  imported: [importedCount: number];
  error: [message: string];
  success: [message: string];
}>();

const acopiosStore = useAcopiosStore();
const uploading = ref(false);
const fileInputRef = ref<HTMLInputElement | null>(null);
const isSuccessModalOpen = ref(false);
const successMessage = ref('');
const isErrorModalOpen = ref(false);
const errorMessage = ref('');

function closeSuccessModal() {
  isSuccessModalOpen.value = false;
}

function closeErrorModal() {
  isErrorModalOpen.value = false;
}

function onFeedbackKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeSuccessModal();
    closeErrorModal();
  }
}

watch([isSuccessModalOpen, isErrorModalOpen], ([isSuccessOpen, isErrorOpen]) => {
  if (isSuccessOpen || isErrorOpen) {
    window.addEventListener('keydown', onFeedbackKeydown);
    return;
  }
  window.removeEventListener('keydown', onFeedbackKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', onFeedbackKeydown);
});

function showSuccessModal(message: string) {
  closeErrorModal();
  successMessage.value = message;
  isSuccessModalOpen.value = true;
  emit('success', message);
}

function showErrorModal(message: string) {
  closeSuccessModal();
  errorMessage.value = message;
  isErrorModalOpen.value = true;
  emit('error', message);
}

function excelErrorMessage(error: unknown, fallbackMessage: string) {
  const axiosError = error as { response?: { data?: { message?: string } } };
  return axiosError?.response?.data?.message || fallbackMessage;
}

const errorDetails = computed(() =>
  errorMessage.value
    .split(' | ')
    .map((detail) => detail.trim())
    .filter(Boolean)
);

async function downloadTemplate() {
  try {
    await acopiosStore.downloadExcelTemplate(props.templateType);
  } catch (error: unknown) {
    showErrorModal(excelErrorMessage(error, 'No se pudo descargar la plantilla'));
  }
}

function openFilePicker() {
  fileInputRef.value?.click();
}

async function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const excelFile = input.files?.[0];
  input.value = '';
  if (!excelFile) {
    return;
  }

  uploading.value = true;
  try {
    if (props.idAcopio) {
      const imported =
        props.templateType === 'needs'
          ? await acopiosStore.importNeedsExcel(props.idAcopio, excelFile)
          : await acopiosStore.importOffersExcel(props.idAcopio, excelFile);
      emit('imported', imported.importedCount);
      showSuccessModal(`Se importaron ${imported.importedCount} registro(s) correctamente.`);
    } else {
      const items = await acopiosStore.parseExcelTemplate(props.templateType, excelFile);
      emit('parsed', items);
      showSuccessModal(`Se cargaron ${items.length} registro(s) desde el Excel correctamente.`);
    }
  } catch (error: unknown) {
    showErrorModal(excelErrorMessage(error, 'No se pudo leer el Excel'));
  } finally {
    uploading.value = false;
  }
}
</script>

<template>
  <div class="space-y-2 rounded-lg border border-dashed border-black/15 bg-black/[0.02] p-3">
    <div class="flex flex-wrap items-center gap-2">
      <button type="button" class="nav-btn" @click="downloadTemplate">
        Descargar plantilla
      </button>
      <button
        type="button"
        class="nav-btn nav-btn-primary"
        :disabled="uploading"
        @click="openFilePicker"
      >
        {{ uploading ? 'Subiendo…' : 'Subir Excel' }}
      </button>
      <input
        ref="fileInputRef"
        type="file"
        accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        class="hidden"
        @change="onFileChange"
      />
    </div>
    <p v-if="helpText" class="text-xs text-black/55">{{ helpText }}</p>
  </div>

  <Teleport to="body">
    <div
      v-if="isSuccessModalOpen"
      class="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4"
      @click="closeSuccessModal"
    >
      <div
        class="w-full max-w-md rounded-2xl border border-black/10 bg-white p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-label="Carga exitosa"
        @click.stop
      >
        <h2 class="text-xl font-semibold text-[#1f6f5b]">Carga exitosa</h2>
        <p class="mt-2 text-sm leading-relaxed text-black/70">
          {{ successMessage }}
        </p>
        <button
          type="button"
          class="mt-5 w-full rounded-md bg-[#1f6f5b] px-4 py-2.5 text-white"
          @click="closeSuccessModal"
        >
          Entendido
        </button>
      </div>
    </div>
    <div
      v-if="isErrorModalOpen"
      class="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4"
      @click="closeErrorModal"
    >
      <div
        class="w-full max-w-md rounded-2xl border border-black/10 bg-white p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-label="Error al cargar Excel"
        @click.stop
      >
        <h2 class="text-xl font-semibold text-[#c45c26]">No se pudo cargar el Excel</h2>
        <ul v-if="errorDetails.length > 1" class="mt-3 max-h-64 space-y-1.5 overflow-y-auto text-sm text-black/70">
          <li v-for="(detail, index) in errorDetails" :key="index">
            {{ detail }}
          </li>
        </ul>
        <p v-else class="mt-2 text-sm leading-relaxed text-black/70">
          {{ errorMessage }}
        </p>
        <button
          type="button"
          class="mt-5 w-full rounded-md bg-[#c45c26] px-4 py-2.5 text-white"
          @click="closeErrorModal"
        >
          Entendido
        </button>
      </div>
    </div>
  </Teleport>
</template>
