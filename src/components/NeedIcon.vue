<script setup lang="ts">
import { computed } from 'vue';
import type { Component } from 'vue';
import {
  Baby,
  Backpack,
  Bath,
  BedDouble,
  BookOpen,
  Bus,
  Droplets,
  Footprints,
  Gift,
  HeartPulse,
  House,
  Landmark,
  Package,
  PawPrint,
  Pencil,
  Phone,
  Pill,
  Shirt,
  Soup,
  SprayCan,
  ToyBrick,
  Users,
  UtensilsCrossed,
  Wrench,
  Zap,
} from '@lucide/vue';

const props = withDefaults(
  defineProps<{
    iconKey?: string | null;
    size?: number;
  }>(),
  {
    iconKey: 'caja',
    size: 22,
  },
);

const iconByKey: Record<string, Component> = {
  caja: Package,
  comida: Soup,
  agua: Droplets,
  ropa: Shirt,
  calzado: Footprints,
  medicamentos: Pill,
  higiene: Bath,
  bebe: Baby,
  panales: Package,
  cobijas: BedDouble,
  utiles: Pencil,
  juguetes: ToyBrick,
  mascotas: PawPrint,
  herramientas: Wrench,
  hogar: House,
  libros: BookOpen,
  transporte: Bus,
  primeros_auxilios: HeartPulse,
  limpieza: SprayCan,
  cocina: UtensilsCrossed,
  energia: Zap,
  comunicacion: Phone,
  voluntarios: Users,
  mochila: Backpack,
  otro: Gift,
  bank: Landmark,
};

const iconComponent = computed(() => iconByKey[props.iconKey || ''] || Package);
</script>

<template>
  <component
    :is="iconComponent"
    :size="size"
    :stroke-width="1.9"
    class="text-[#1f6f5b]"
  />
</template>
