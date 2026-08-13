<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';

export interface SearchableOption {
  value: string | number;
  label: string;
}

const props = withDefaults(
  defineProps<{
    modelValue: string | number | null;
    options: SearchableOption[];
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
  }>(),
  {
    placeholder: 'Selecciona',
    required: false,
    disabled: false,
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: string | number | null];
}>();

const isOpen = ref(false);
const searchText = ref('');
const rootElement = ref<HTMLElement | null>(null);
const searchInput = ref<HTMLInputElement | null>(null);

const selectedOption = computed(() =>
  props.options.find((option) => option.value === props.modelValue) || null,
);

const filteredOptions = computed(() => {
  const query = searchText.value.trim().toLowerCase();
  if (!query) {
    return props.options;
  }
  return props.options.filter((option) =>
    option.label.toLowerCase().includes(query),
  );
});

const displayLabel = computed(() => selectedOption.value?.label || '');

watch(isOpen, async (open) => {
  if (open) {
    searchText.value = '';
    await Promise.resolve();
    searchInput.value?.focus();
  }
});

function toggleOpen() {
  if (props.disabled) return;
  isOpen.value = !isOpen.value;
}

function selectOption(option: SearchableOption) {
  emit('update:modelValue', option.value);
  isOpen.value = false;
  searchText.value = '';
}

function handleClickOutside(event: MouseEvent) {
  if (!rootElement.value) return;
  if (!rootElement.value.contains(event.target as Node)) {
    isOpen.value = false;
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<template>
  <div ref="rootElement" class="relative mt-1">
    <button
      type="button"
      class="flex w-full items-center justify-between rounded-md border border-black/15 bg-white px-3 py-2 text-left text-sm disabled:opacity-60"
      :disabled="disabled"
      :aria-expanded="isOpen"
      @click="toggleOpen"
    >
      <span :class="displayLabel ? 'text-inherit' : 'text-black/40'">
        {{ displayLabel || placeholder }}
      </span>
      <span class="ml-2 text-xs opacity-60">▾</span>
    </button>

    <input
      v-if="required"
      class="pointer-events-none absolute h-0 w-0 opacity-0"
      tabindex="-1"
      :value="modelValue === 0 || modelValue === null || modelValue === '' ? '' : String(modelValue)"
      required
    />

    <div
      v-if="isOpen"
      class="absolute top-full left-0 z-50 mt-1 w-full overflow-hidden rounded-md border border-black/10 bg-white shadow-lg"
    >
      <div class="border-b border-black/10 p-2">
        <input
          ref="searchInput"
          v-model="searchText"
          type="search"
          placeholder="Buscar..."
          class="w-full rounded-md border border-black/15 px-3 py-2 text-sm"
          @keydown.esc.stop="isOpen = false"
        />
      </div>
      <ul class="max-h-56 overflow-y-auto py-1">
        <li v-if="!filteredOptions.length" class="px-3 py-2 text-sm text-black/50">
          Sin resultados
        </li>
        <li
          v-for="option in filteredOptions"
          :key="String(option.value)"
        >
          <button
            type="button"
            class="w-full px-3 py-2 text-left text-sm hover:bg-[#1f6f5b]/10"
            :class="{
              'bg-[#1f6f5b] text-white hover:bg-[#195a4a]': option.value === modelValue,
            }"
            @click="selectOption(option)"
          >
            {{ option.label }}
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>
