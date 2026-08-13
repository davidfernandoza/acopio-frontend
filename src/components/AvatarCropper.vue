<script setup lang="ts">
import { computed, ref } from 'vue';
import { Cropper, CircleStencil } from 'vue-advanced-cropper';
import 'vue-advanced-cropper/dist/style.css';

defineProps<{
  modelValue: Blob | null;
  previewName?: string;
  compact?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: Blob | null];
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
    emit('update:modelValue', blob);
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

function clearAvatar() {
  if (localPreviewUrl.value) {
    URL.revokeObjectURL(localPreviewUrl.value);
  }
  localPreviewUrl.value = null;
  emit('update:modelValue', null);
  closeCropper();
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex flex-col items-center gap-3">
      <img
        v-if="previewUrl"
        :src="previewUrl"
        alt="Foto"
        class="rounded-full object-cover ring-2 ring-[#1f6f5b]/30"
        :class="compact ? 'h-36 w-36' : 'h-28 w-28'"
      />
      <div
        v-else
        class="flex items-center justify-center rounded-full bg-[#1f6f5b]/15 text-[#1f6f5b]"
        :class="compact ? 'h-36 w-36 text-base' : 'h-28 w-28 text-sm'"
      >
        foto
      </div>
      <div class="flex flex-col items-center gap-2 text-center">
        <label class="inline-flex cursor-pointer rounded-md bg-[#1f6f5b] px-3 py-2 text-sm text-white">
          Elegir foto
          <input type="file" accept="image/*" class="hidden" @change="onFileChange" />
        </label>
        <button
          v-if="modelValue"
          type="button"
          class="text-sm text-black/45"
          @click="clearAvatar"
        >
          Quitar foto
        </button>
        <p v-if="!compact" class="text-xs text-black/50">
          Si no subes foto se usarán las iniciales de
          {{ previewName || 'el acopio' }}.
        </p>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="showCropper && selectedImageUrl"
        class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      >
        <div
          class="w-full max-w-lg rounded-2xl border border-black/10 bg-white p-4 shadow-xl"
          role="dialog"
          aria-modal="true"
          aria-label="Recortar foto"
        >
          <h2 class="mb-3 text-lg font-semibold text-[#1f6f5b]">Recortar foto</h2>
          <Cropper
            ref="cropperRef"
            class="h-80 w-full"
            :src="selectedImageUrl"
            :stencil-component="CircleStencil"
          />
          <div class="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              class="nav-btn nav-btn-primary"
              @click="applyCrop"
            >
              Aplicar recorte
            </button>
            <button
              type="button"
              class="nav-btn"
              @click="closeCropper"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
