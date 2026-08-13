<script setup lang="ts" generic="T extends { id: number }">
import { computed, onUnmounted, ref, watch } from 'vue';

const props = defineProps<{
  items: T[];
  title: string;
  emptyMessage: string;
  getItemWrapperClass?: (item: T) => string;
}>();

const visibleListLimit = 3;
const isModalOpen = ref(false);

const previewItems = computed(() => props.items.slice(0, visibleListLimit));
const hasMoreItems = computed(() => props.items.length > visibleListLimit);

function openModal() {
  isModalOpen.value = true;
}

function closeModal() {
  isModalOpen.value = false;
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeModal();
  }
}

watch(isModalOpen, (isOpen) => {
  if (isOpen) {
    window.addEventListener('keydown', onKeydown);
    return;
  }
  window.removeEventListener('keydown', onKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown);
});

function onOverlayClick() {
  closeModal();
}

watch(
  () => props.items.length,
  (itemCount) => {
    if (itemCount <= visibleListLimit && isModalOpen.value && itemCount === 0) {
      closeModal();
    }
  },
);
</script>

<template>
  <div class="space-y-3">
    <ul class="flex flex-wrap gap-2">
      <li
        v-for="item in previewItems"
        :key="item.id"
        class="max-w-full"
        :class="getItemWrapperClass?.(item)"
      >
        <slot name="item" :item="item" />
      </li>
      <li v-if="hasMoreItems" class="flex">
        <button
          type="button"
          class="inline-flex h-full items-center rounded-md border border-[#1f6f5b] bg-white px-10 py-2 text-left"
          @click="openModal"
        >
          <span>
            <p class="font-medium leading-tight text-[#1f6f5b]">Ver más</p>
            <p class="text-sm leading-tight text-black/60">{{ items.length }} en total</p>
          </span>
        </button>
      </li>
      <li v-if="!items.length" class="w-full text-sm text-black/50">
        {{ emptyMessage }}
      </li>
    </ul>
    <hr class="border-black/10" />
  </div>

  <Teleport to="body">
    <div
      v-if="isModalOpen"
      class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      @click="onOverlayClick"
    >
      <div
        class="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-black/10 bg-white p-4 shadow-xl"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
        @click.stop
      >
        <div class="mb-3 flex items-center justify-between gap-3">
          <h2 class="text-lg font-semibold text-[#1f6f5b]">{{ title }}</h2>
          <button type="button" class="nav-btn" @click="closeModal">
            Cerrar
          </button>
        </div>
        <ul class="flex flex-wrap gap-2">
          <li
            v-for="item in items"
            :key="item.id"
            class="max-w-full"
            :class="getItemWrapperClass?.(item)"
          >
            <slot name="item" :item="item" />
          </li>
          <li v-if="!items.length" class="w-full text-sm text-black/50">
            {{ emptyMessage }}
          </li>
        </ul>
      </div>
    </div>
  </Teleport>
</template>
