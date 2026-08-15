<script setup lang="ts">
import NeedIcon from './NeedIcon.vue';
import { productIconOptions, type NeedType } from '../constants/needIcons';

const props = withDefaults(
  defineProps<{
    modelValue: string;
    needType?: NeedType;
  }>(),
  {
    needType: 'product',
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

function selectIcon(iconKey: string) {
  if (props.needType === 'money') {
    return;
  }
  emit('update:modelValue', iconKey);
}
</script>

<template>
  <div class="space-y-2">
    <p class="text-sm">Icono (opcional)</p>
    <div v-if="needType === 'money'" class="flex items-center gap-3">
      <div
        class="flex h-12 w-12 items-center justify-center rounded-lg border border-[#1f6f5b] bg-[#1f6f5b]/10"
      >
        <NeedIcon icon-key="bank" :size="26" />
      </div>
    </div>
    <div v-else class="flex min-w-0 max-w-full flex-wrap gap-2">
      <button
        v-for="iconOption in productIconOptions"
        :key="iconOption.key"
        type="button"
        class="flex h-12 w-12 items-center justify-center rounded-lg border"
        :class="
          modelValue === iconOption.key
            ? 'border-[#1f6f5b] bg-[#1f6f5b]/10'
            : 'border-black/15 bg-white'
        "
        :title="iconOption.label"
        :aria-label="iconOption.label"
        @click="selectIcon(iconOption.key)"
      >
        <NeedIcon :icon-key="iconOption.key" :size="24" />
      </button>
    </div>
  </div>
</template>
