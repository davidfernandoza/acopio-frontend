<script setup lang="ts">
import { computed, ref } from 'vue';

const props = withDefaults(
  defineProps<{
    modelValue: File[];
    maxFiles?: number;
    disabled?: boolean;
  }>(),
  {
    maxFiles: 3,
    disabled: false,
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: File[]];
}>();

const isDragging = ref(false);
const validationMessage = ref('');
const fileInputRef = ref<HTMLInputElement | null>(null);

const remainingSlots = computed(() => Math.max(0, props.maxFiles - props.modelValue.length));
const canAddFiles = computed(() => !props.disabled && remainingSlots.value > 0);

const allowedMimeTypes = new Set(['image/jpeg', 'image/png']);

function isAllowedImage(file: File) {
  if (allowedMimeTypes.has(file.type)) {
    return true;
  }
  const lowerName = file.name.toLowerCase();
  return lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg') || lowerName.endsWith('.png');
}

function addFiles(incomingFiles: File[]) {
  validationMessage.value = '';
  if (!canAddFiles.value) {
    return;
  }

  const validFiles = incomingFiles.filter(isAllowedImage);
  const rejectedCount = incomingFiles.length - validFiles.length;

  if (rejectedCount > 0) {
    validationMessage.value = 'Solo se permiten archivos JPG y PNG.';
  }

  if (!validFiles.length) {
    return;
  }

  const availableSlots = remainingSlots.value;
  const filesToAdd = validFiles.slice(0, availableSlots);

  if (validFiles.length > availableSlots) {
    validationMessage.value = `Solo puedes agregar ${availableSlots} imagen(es) más (máx. ${props.maxFiles}).`;
  }

  emit('update:modelValue', [...props.modelValue, ...filesToAdd]);
}

function onFileInputChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const selectedFiles = Array.from(input.files || []);
  addFiles(selectedFiles);
  input.value = '';
}

function onDragEnter(event: DragEvent) {
  event.preventDefault();
  if (!canAddFiles.value) return;
  isDragging.value = true;
}

function onDragOver(event: DragEvent) {
  event.preventDefault();
  if (!canAddFiles.value) return;
  isDragging.value = true;
}

function onDragLeave(event: DragEvent) {
  event.preventDefault();
  isDragging.value = false;
}

function onDrop(event: DragEvent) {
  event.preventDefault();
  isDragging.value = false;
  if (!canAddFiles.value) return;
  const droppedFiles = Array.from(event.dataTransfer?.files || []);
  addFiles(droppedFiles);
}

function openFilePicker() {
  if (!canAddFiles.value) return;
  fileInputRef.value?.click();
}

function removeFile(index: number) {
  const nextFiles = props.modelValue.filter((_, fileIndex) => fileIndex !== index);
  emit('update:modelValue', nextFiles);
  validationMessage.value = '';
}
</script>

<template>
  <div class="space-y-3">
    <div
      class="rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors"
      :class="[
        isDragging
          ? 'border-[#1f6f5b] bg-[#1f6f5b]/10'
          : 'border-black/20 bg-black/[0.02]',
        canAddFiles ? 'cursor-pointer' : 'opacity-60',
      ]"
      @dragenter="onDragEnter"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      @drop="onDrop"
      @click="openFilePicker"
    >
      <p class="text-base font-medium text-[#16352c]">Arrastra aquí</p>
      <p class="mt-1 text-sm text-black/55">o</p>
      <button
        type="button"
        class="mt-2 inline-flex rounded-md bg-[#1f6f5b] px-3 py-2 text-sm text-white"
        :disabled="!canAddFiles"
        @click.stop="openFilePicker"
      >
        Seleccionar archivos
      </button>
      <p class="mt-3 text-xs text-black/45">
        Vertical 9:16 · 1080 × 1920 px · JPG o PNG
        <span v-if="canAddFiles"> · puedes agregar hasta {{ remainingSlots }}</span>
      </p>
      <p v-if="!canAddFiles && !disabled" class="mt-1 text-xs text-black/45">
        Ya alcanzaste el máximo de imágenes.
      </p>
      <input
        ref="fileInputRef"
        type="file"
        accept=".jpg,.jpeg,.png,image/jpeg,image/png"
        multiple
        class="hidden"
        :disabled="!canAddFiles"
        @change="onFileInputChange"
      />
    </div>

    <p v-if="validationMessage" class="text-sm text-red-700">{{ validationMessage }}</p>

    <ul v-if="modelValue.length" class="space-y-2 text-sm">
      <li
        v-for="(galleryFile, index) in modelValue"
        :key="`${galleryFile.name}-${galleryFile.size}-${index}`"
        class="flex items-center justify-between rounded-md border border-black/10 px-3 py-2"
      >
        <span class="truncate">{{ galleryFile.name }}</span>
        <button type="button" class="shrink-0 text-black/45" @click="removeFile(index)">
          Quitar
        </button>
      </li>
    </ul>
  </div>
</template>
