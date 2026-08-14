<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, RouterLink, useRouter } from 'vue-router';
import { useAcopiosStore } from '../stores/acopios';
import { useAuthStore } from '../stores/auth';
import { renderMap } from '../composables/useGoogleMaps';
import { resolveMediaUrl, buildInitialsAvatarUrl } from '../utils/media';
import { formatThousands } from '../utils/numberFormat';
import NeedIcon from '../components/NeedIcon.vue';
import ImageCarousel from '../components/ImageCarousel.vue';
import { Mail, MapPin } from '@lucide/vue';
import type { AcopioContact, AcopioNeed } from '../types';

const route = useRoute();
const router = useRouter();
const acopiosStore = useAcopiosStore();
const authStore = useAuthStore();
const mapElement = ref<HTMLElement | null>(null);
const mapError = ref('');
const mapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const isGalleryModalOpen = ref(false);
const modalImageIndex = ref(0);
const qrModalNeed = ref<AcopioNeed | null>(null);

const idAcopio = computed(() => Number(route.params.idAcopio));
const galleryImages = computed(() => acopiosStore.currentAcopio?.images || []);
const gallerySlides = computed(() =>
  galleryImages.value.map((image) => ({
    id: image.id,
    imageUrl: image.imageUrl,
    alt: `Foto ${image.sortOrder}`,
  })),
);
const modalImage = computed(() => galleryImages.value[modalImageIndex.value] || null);
const loadError = ref('');

function openGalleryModal(slideIndex: number) {
  modalImageIndex.value = slideIndex;
  isGalleryModalOpen.value = true;
}

function closeGalleryModal() {
  isGalleryModalOpen.value = false;
  if (route.query.imagen) {
    const nextQuery = { ...route.query };
    delete nextQuery.imagen;
    router.replace({ query: nextQuery });
  }
}

function openImageFromQuery() {
  const imageId = Number(route.query.imagen);
  if (!imageId) {
    return;
  }
  const imageIndex = galleryImages.value.findIndex((image) => image.id === imageId);
  if (imageIndex >= 0) {
    openGalleryModal(imageIndex);
  }
}

function onGalleryKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeGalleryModal();
    closeQrModal();
  }
}

function openQrModal(need: AcopioNeed) {
  qrModalNeed.value = need;
}

function closeQrModal() {
  qrModalNeed.value = null;
}

function contactHref(contact: AcopioContact) {
  if (contact.type === 'whatsapp') {
    return contact.whatsappLink || '';
  }
  return contact.mailtoLink || '';
}

function contactLabel(contact: AcopioContact) {
  if (contact.type === 'whatsapp') {
    return `${contact.phoneCode || ''} ${contact.value}`.trim();
  }
  return contact.value;
}

const offerCategoryLabels: Record<string, string> = {
  comida: 'Comida',
  mercado: 'Mercado',
  productos: 'Productos',
  otro: 'Otro',
};

function offerCategoryLabel(category: string) {
  return offerCategoryLabels[category] || category;
}

function scrollProfileToTop() {
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
}

onMounted(async () => {
  window.addEventListener('keydown', onGalleryKeydown);
  scrollProfileToTop();
  loadError.value = '';
  try {
    const acopio = await acopiosStore.fetchAcopio(idAcopio.value);
    openImageFromQuery();
    await nextTick();
    scrollProfileToTop();
    if (!mapsApiKey || !mapElement.value || !acopio.address) {
      return;
    }
    try {
      const map = await renderMap({
        element: mapElement.value,
        latitude: Number(acopio.address.latitude),
        longitude: Number(acopio.address.longitude),
        title: acopio.name,
      });
      google.maps.event.addListenerOnce(map, 'idle', () => {
        scrollProfileToTop();
      });
      scrollProfileToTop();
    } catch (error: any) {
      mapError.value = error?.message || 'No se pudo cargar el mapa';
    }
  } catch (error: unknown) {
    const axiosError = error as { response?: { data?: { message?: string } } };
    loadError.value =
      axiosError?.response?.data?.message || 'No se pudo cargar el perfil del acopio';
  }
});

onUnmounted(() => {
  window.removeEventListener('keydown', onGalleryKeydown);
});

watch(
  () => route.query.imagen,
  () => {
    if (acopiosStore.currentAcopio?.id === idAcopio.value) {
      openImageFromQuery();
    }
  },
);
</script>

<template>
  <p v-if="loadError" class="rounded-md bg-[#c45c26]/10 px-3 py-2 text-sm text-[#c45c26]">
    {{ loadError }}
  </p>
  <section v-else-if="acopiosStore.currentAcopio" class="space-y-8">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div class="flex items-start gap-4">
        <img
          :src="resolveMediaUrl(acopiosStore.currentAcopio.avatarUrl) || buildInitialsAvatarUrl(acopiosStore.currentAcopio.name)"
          :alt="acopiosStore.currentAcopio.name" class="h-20 w-20 rounded-full object-cover ring-2 ring-[#1f6f5b]/25" />
        <div>

          <h1 class="mt-1 flex flex-wrap items-baseline gap-x-3 text-4xl font-semibold">
            {{ acopiosStore.currentAcopio.name }}
            <span class="text-lg font-medium text-black/70">
              {{ acopiosStore.currentAcopio.status === 'open' ? 'Abierto' : 'Cerrado' }}
            </span>
          </h1>
          <p class="mt-2 text-black/70">
            Responsable: {{ acopiosStore.currentAcopio.responsibleName }}
          </p>
          <p class="mt-2 flex items-start gap-2 text-base font-medium text-black/85">
            <MapPin class="mt-0.5 h-5 w-5 shrink-0 text-[#1f6f5b]" :stroke-width="2" />
            <span>
              <template v-if="acopiosStore.currentAcopio.address?.city?.department?.country?.name">
                {{ acopiosStore.currentAcopio.address.city.department.country.name }}
                ·
              </template>
              <template v-if="acopiosStore.currentAcopio.address?.city?.department?.name">
                {{ acopiosStore.currentAcopio.address.city.department.name }}
                ·
              </template>
              {{ acopiosStore.currentAcopio.address?.city?.name || 'Sin ciudad' }}
              <template v-if="acopiosStore.currentAcopio.address?.street">
                · {{ acopiosStore.currentAcopio.address.street }}
              </template>
              <template v-if="acopiosStore.currentAcopio.address?.neighborhood">
                · Barrio: {{ acopiosStore.currentAcopio.address.neighborhood }}
              </template>
              <template v-if="acopiosStore.currentAcopio.address?.reference">
                · {{ acopiosStore.currentAcopio.address.reference }}
              </template>
            </span>
          </p>
          <p
            v-if="acopiosStore.currentAcopio.description"
            class="mt-2 whitespace-pre-wrap text-black/80"
          >
            {{ acopiosStore.currentAcopio.description }}
          </p>
        </div>
      </div>
      <RouterLink v-if="authStore.isAuthenticated" :to="`/acopios/${idAcopio}/gestionar`"
        class="nav-btn nav-btn-primary">
        Gestionar
      </RouterLink>
    </div>

    <div ref="mapElement" class="h-[320px] w-full overflow-hidden rounded-2xl border border-black/10 bg-[#d9e8ef]" />
    <p v-if="!mapsApiKey" class="text-sm text-[#c45c26]">
      Configura `VITE_GOOGLE_MAPS_API_KEY` para ver la ubicación en el mapa.
    </p>
    <p v-if="mapError" class="text-sm text-[#c45c26]">{{ mapError }}</p>

    <div class="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div class="flex min-w-0 flex-1 flex-col gap-6">
      <section class="rounded-xl border border-black/10 bg-white/70 p-4">
        <h2 class="text-lg font-semibold">Contactos</h2>
        <ul class="mt-3 space-y-3 text-sm">
          <li
            v-for="contact in acopiosStore.currentAcopio.contacts || []"
            :key="contact.id"
            class="flex flex-wrap items-center justify-between gap-3"
          >
            <div class="flex min-w-0 flex-1 items-center gap-2">
              <span class="shrink-0 text-[#1f6f5b]" aria-hidden="true">
                <svg
                  v-if="contact.type === 'whatsapp'"
                  viewBox="0 0 24 24"
                  class="h-5 w-5"
                  fill="#25D366"
                >
                  <path
                    d="M20.52 3.48A11.86 11.86 0 0 0 12.04 0C5.44 0 .07 5.37.07 11.97c0 2.11.55 4.17 1.6 6L0 24l6.18-1.62a11.93 11.93 0 0 0 5.86 1.5h.01c6.6 0 11.97-5.37 11.97-11.97 0-3.2-1.25-6.2-3.5-8.43ZM12.05 21.8h-.01a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.67.96.98-3.57-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.9-9.88 2.64 0 5.12 1.03 6.99 2.9a9.82 9.82 0 0 1 2.9 6.98c0 5.45-4.44 9.83-9.94 9.83Zm5.43-7.4c-.3-.15-1.76-.87-2.03-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48a8.97 8.97 0 0 1-1.66-2.06c-.17-.3 0-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35Z"
                  />
                </svg>
                <Mail v-else :size="20" :stroke-width="1.9" />
              </span>
              <a
                v-if="contactHref(contact)"
                :href="contactHref(contact)"
                :target="contact.type === 'whatsapp' ? '_blank' : undefined"
                rel="noopener noreferrer"
                class="break-words text-[#1f6f5b] underline"
              >
                {{ contactLabel(contact) }}
              </a>
              <span v-else>{{ contactLabel(contact) }}</span>
              <span v-if="contact.label" class="min-w-0 break-words text-black/50">
                · {{ contact.label }}
              </span>
            </div>
            <a
              v-if="contactHref(contact)"
              :href="contactHref(contact)"
              :target="contact.type === 'whatsapp' ? '_blank' : undefined"
              rel="noopener noreferrer"
              class="nav-btn nav-btn-primary nav-btn-compact shrink-0"
            >
              Contactar
            </a>
          </li>
          <li v-if="!(acopiosStore.currentAcopio.contacts || []).length" class="text-black/50">
            Aún no hay contactos.
          </li>
        </ul>
      </section>

      <section
        v-if="(acopiosStore.currentAcopio.offers || []).length"
        class="rounded-xl border border-black/10 bg-white/70 p-4"
      >
        <h2 class="text-lg font-semibold">Estamos dando</h2>
        <ul class="mt-3 grid gap-3 sm:grid-cols-2">
          <li
            v-for="offer in acopiosStore.currentAcopio.offers || []"
            :key="offer.id"
            class="rounded-lg border border-black/10 bg-white p-3 text-sm"
          >
            <div class="flex gap-3">
              <NeedIcon :icon-key="offer.iconKey" :size="24" />
              <div class="min-w-0 flex-1">
                <p class="font-medium">
                  {{ offer.name }}
                  <span class="font-normal text-black/60">
                    · {{ offerCategoryLabel(offer.category) }}
                  </span>
                </p>
                <p v-if="offer.description" class="text-black/60">{{ offer.description }}</p>
                <p v-if="!offer.isAvailable" class="text-[#c45c26]">No disponible</p>
              </div>
            </div>
          </li>
        </ul>
      </section>
      </div>

      <div class="flex min-w-0 flex-1 flex-col gap-6">
      <section class="rounded-xl border border-black/10 bg-white/70 p-4">
        <h2 class="text-lg font-semibold">Necesitamos</h2>
        <ul class="mt-3 grid gap-3 sm:grid-cols-2">
          <li
            v-for="need in acopiosStore.currentAcopio.needs || []"
            :key="need.id"
            class="rounded-lg border border-black/10 bg-white p-3 text-sm"
            :class="need.needType === 'money' ? 'sm:col-span-2' : ''"
          >
            <div class="flex flex-wrap gap-3">
              <NeedIcon :icon-key="need.iconKey" :size="24" />
              <div class="min-w-0 flex-1">
                <p class="font-medium">
                  {{ need.name }}
                  <span class="font-normal text-black/60">
                    · {{ need.needType === 'money' ? 'Dinero' : 'Producto' }}
                  </span>
                </p>
                <p v-if="need.description" class="text-black/60">{{ need.description }}</p>
                <p v-if="need.hasLimit" class="text-black/60">
                  {{ formatThousands(need.targetQuantity) }}
                  <span v-if="need.limitReached" class="text-[#c45c26]"> · Límite alcanzado</span>
                </p>
                <ul
                  v-if="need.needType === 'money'"
                  class="mt-1 space-y-0.5 text-black/60"
                >
                  <li v-if="need.bankName">Banco: {{ need.bankName }}</li>
                  <li v-if="need.accountNumber">Cuenta: {{ need.accountNumber }}</li>
                  <li v-if="need.accountHolder">Propietario: {{ need.accountHolder }}</li>
                  <li v-if="need.documentType || need.documentNumber">
                    Documento:
                    {{ need.documentType ? need.documentType.toUpperCase() : '' }}
                    {{ need.documentNumber || '' }}
                  </li>
                </ul>
              </div>
              <div v-if="need.qrUrl" class="flex shrink-0 flex-row items-center gap-2 sm:flex-col">
                <img
                  :src="resolveMediaUrl(need.qrUrl)"
                  alt="QR"
                  class="h-16 w-16 rounded-md border border-black/10 object-cover"
                />
                <button
                  type="button"
                  class="nav-btn nav-btn-compact"
                  @click="openQrModal(need)"
                >
                  Ver QR
                </button>
              </div>
            </div>
          </li>
          <li
            v-if="!(acopiosStore.currentAcopio.needs || []).length"
            class="text-black/50 sm:col-span-2"
          >
            Aún no registran necesidades.
          </li>
        </ul>
      </section>
      </div>
    </div>

    <div v-if="gallerySlides.length" class="space-y-3">
      <h2 class="text-lg font-semibold">Galería</h2>
      <ImageCarousel
        :slides="gallerySlides"
        :paused="isGalleryModalOpen"
        show-adjacent
        @select="openGalleryModal"
      />
    </div>

    <Teleport to="body">
      <div v-if="isGalleryModalOpen && modalImage"
        class="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4" @click="closeGalleryModal">
        <div class="relative" @click.stop>
          <img :src="resolveMediaUrl(modalImage.imageUrl)" :alt="`Foto ${modalImageIndex + 1}`"
            class="max-h-[90vh] max-w-[min(90vw,420px)] rounded-2xl object-contain" />
          <button type="button" class="absolute -right-2 -top-2 rounded-full bg-white px-2 py-1 text-sm text-black"
            @click="closeGalleryModal">
            Cerrar
          </button>
        </div>
      </div>
      <div
        v-if="qrModalNeed?.qrUrl"
        class="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
        @click="closeQrModal"
      >
        <div
          class="w-full max-w-sm rounded-2xl border border-black/10 bg-white p-4 shadow-xl"
          role="dialog"
          aria-modal="true"
          aria-label="Código QR"
          @click.stop
        >
          <div class="mb-3 flex items-center justify-between gap-3">
            <h2 class="text-lg font-semibold text-[#1f6f5b]">{{ qrModalNeed.name }}</h2>
            <button type="button" class="nav-btn" @click="closeQrModal">
              Cerrar
            </button>
          </div>
          <img
            :src="resolveMediaUrl(qrModalNeed.qrUrl)"
            alt="QR"
            class="mx-auto w-full max-w-[280px] rounded-xl border border-black/10 object-contain"
          />
        </div>
      </div>
    </Teleport>
  </section>
</template>
