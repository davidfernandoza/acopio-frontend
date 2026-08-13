<script setup lang="ts">
import { computed, ref } from 'vue';
import { Cropper } from 'vue-advanced-cropper';
import 'vue-advanced-cropper/dist/style.css';

defineProps<{
  modelValue: File | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: File | null];
}>();

const selectedImageUrl = ref<string | null>(null);
const cropperRef = ref<InstanceType<typeof Cropper> | null>(null);
const showCropper = ref(false);
const localPreviewUrl = ref<string | null>(null);

const previewUrl = computed(() => localPreviewUrl.value);

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) {
    return;
  }
  if (selectedImageUrl.value) {
    URL.revokeObjectURL(selectedImageUrl.value);
  }
  selectedImageUrl.value = URL.createObjectURL(file);
  showCropper.value = true;
  input.value = '';
}

async function applyCrop() {
  const result = cropperRef.value?.getResult();
  const canvas = result?.canvas;
  if (!canvas) {
    return;
  }
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((croppedBlob) => resolve(croppedBlob), 'image/jpeg', 0.9);
  });
  if (blob) {
    if (localPreviewUrl.value) {
      URL.revokeObjectURL(localPreviewUrl.value);
    }
    localPreviewUrl.value = URL.createObjectURL(blob);
    const croppedFile = new File([blob], 'qr.jpg', { type: 'image/jpeg' });
    emit('update:modelValue', croppedFile);
  }
  closeCropper();
}

function closeCropper() {
  showCropper.value = false;
  if (selectedImageUrl.value) {
    URL.revokeObjectURL(selectedImageUrl.value);
    selectedImageUrl.value = null;
  }
}

function clearQr() {
  if (localPreviewUrl.value) {
    URL.revokeObjectURL(localPreviewUrl.value);
  }
  localPreviewUrl.value = null;
  emit('update:modelValue', null);
  closeCropper();
}
</script>

<template>
  <div class="w-full space-y-2">
    <p class="text-sm">QR (opcional)</p>
    <div class="flex w-full items-stretch gap-3">
      <img
        v-if="previewUrl"
        :src="previewUrl"
        alt="QR"
        class="h-10 w-10 shrink-0 rounded-md object-cover ring-2 ring-[#1f6f5b]/30"
      />
      <div
        v-else
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#1f6f5b]/15 text-xs text-[#1f6f5b]"
      >
        QR
      </div>
      <label
        class="flex h-10 min-w-0 flex-1 cursor-pointer items-center justify-center rounded-md bg-[#1f6f5b] px-3 text-sm text-white"
      >
        Seleccionar archivo
        <input type="file" accept="image/*" class="hidden" @change="onFileChange" />
      </label>
    </div>
    <button
      v-if="modelValue"
      type="button"
      class="text-sm text-black/45"
      @click="clearQr"
    >
      Quitar QR
    </button>

    <Teleport to="body">
      <div
        v-if="showCropper && selectedImageUrl"
        class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      >
        <div
          class="w-full max-w-lg rounded-2xl border border-black/10 bg-white p-4 shadow-xl"
          role="dialog"
          aria-modal="true"
          aria-label="Recortar QR"
        >
          <h2 class="mb-3 text-lg font-semibold text-[#1f6f5b]">Recortar QR</h2>
          <Cropper
            ref="cropperRef"
            class="h-80 w-full"
            :src="selectedImageUrl"
            :stencil-props="{ aspectRatio: 1 }"
          />
          <div class="mt-4 flex flex-wrap gap-2">
            <button type="button" class="nav-btn nav-btn-primary" @click="applyCrop">
              Aplicar recorte
            </button>
            <button type="button" class="nav-btn" @click="closeCropper">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
