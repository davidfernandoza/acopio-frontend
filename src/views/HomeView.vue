<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { useAcopiosStore } from '../stores/acopios';
import { focusMapOnLocation, getBrowserLocation, renderMarkersMap } from '../composables/useGoogleMaps';
import { resolveMediaUrl, buildInitialsAvatarUrl } from '../utils/media';
import NeedIcon from '../components/NeedIcon.vue';
import ImageCarousel from '../components/ImageCarousel.vue';
import type { Acopio, CarouselSlide } from '../types';

const acopiosStore = useAcopiosStore();
const router = useRouter();
const mapElement = ref<HTMLElement | null>(null);
const mapError = ref('');
const mapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const searchQuery = ref('');
const expandedAcopioId = ref<number | null>(null);
let markersMap: google.maps.Map | null = null;

const openAcopios = computed(() =>
  acopiosStore.acopios.filter((acopio) => acopio.status === 'open'),
);

const filteredAcopios = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  if (!query) {
    return openAcopios.value;
  }
  return openAcopios.value.filter((acopio) => {
    const cityName = acopio.address?.city?.name || '';
    const street = acopio.address?.street || '';
    return [acopio.name, acopio.description || '', cityName, street]
      .join(' ')
      .toLowerCase()
      .includes(query);
  });
});

const markers = computed(() =>
  filteredAcopios.value
    .filter((acopio) => acopio.address)
    .map((acopio) => ({
      latitude: Number(acopio.address!.latitude),
      longitude: Number(acopio.address!.longitude),
      title: acopio.name,
      onClick: () => router.push(`/acopios/${acopio.id}`),
    }))
);

function addressLabel(acopio: Acopio) {
  const street = acopio.address?.street;
  const cityName = acopio.address?.city?.name;
  if (street && cityName) {
    return `${street}, ${cityName}`;
  }
  return street || cityName || 'Sin dirección';
}

function toggleDetails(idAcopio: number) {
  expandedAcopioId.value = expandedAcopioId.value === idAcopio ? null : idAcopio;
}

function showOnMap(acopio: Acopio) {
  if (!acopio.address || !markersMap) {
    mapElement.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  mapElement.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  focusMapOnLocation(
    markersMap,
    Number(acopio.address.latitude),
    Number(acopio.address.longitude),
  );
}

function interleaveSlidesByAcopio(slides: CarouselSlide[]) {
  const slidesByAcopio = new Map<number, CarouselSlide[]>();
  for (const slide of slides) {
    const acopioSlides = slidesByAcopio.get(slide.idAcopio) || [];
    acopioSlides.push(slide);
    slidesByAcopio.set(slide.idAcopio, acopioSlides);
  }

  const acopioSlideGroups = [...slidesByAcopio.values()];
  const interleavedSlides: CarouselSlide[] = [];
  const longestGroupSize = Math.max(0, ...acopioSlideGroups.map((group) => group.length));

  for (let slideIndex = 0; slideIndex < longestGroupSize; slideIndex += 1) {
    for (const acopioSlides of acopioSlideGroups) {
      const nextSlide = acopioSlides[slideIndex];
      if (nextSlide) {
        interleavedSlides.push(nextSlide);
      }
    }
  }

  return interleavedSlides;
}

const slides = computed(() => interleaveSlidesByAcopio(acopiosStore.carousel?.slides || []));

function goToAcopioFromSlide(slideIndex: number) {
  const selectedSlide = slides.value[slideIndex];
  if (!selectedSlide) {
    return;
  }
  router.push({
    path: `/acopios/${selectedSlide.idAcopio}`,
    query: { imagen: String(selectedSlide.id) },
  });
}

const ipLocation = computed(() => acopiosStore.carousel?.userLocation || null);
const browserLocation = ref<{ latitude: number; longitude: number } | null>(null);
const viewerLocation = computed(() => browserLocation.value || ipLocation.value);

async function drawMap() {
  if (!mapElement.value || !mapsApiKey) {
    return;
  }
  try {
    mapError.value = '';
    markersMap = await renderMarkersMap({
      element: mapElement.value,
      markers: markers.value,
      center: viewerLocation.value
        ? {
            latitude: viewerLocation.value.latitude,
            longitude: viewerLocation.value.longitude,
          }
        : undefined,
      userLocation: viewerLocation.value
        ? {
            latitude: viewerLocation.value.latitude,
            longitude: viewerLocation.value.longitude,
          }
        : undefined,
      zoom: viewerLocation.value ? 13 : 5,
    });
  } catch (error: any) {
    mapError.value = error?.message || 'No se pudo cargar el mapa';
  }
}

onMounted(async () => {
  const [, , detectedBrowserLocation] = await Promise.all([
    acopiosStore.fetchAcopios(),
    acopiosStore.fetchCarousel(),
    getBrowserLocation(),
  ]);
  browserLocation.value = detectedBrowserLocation;
  await nextTick();
  await drawMap();
});

watch([markers, viewerLocation], async () => {
  await nextTick();
  await drawMap();
});
</script>

<template>
  <section class="min-w-0 space-y-6">
    <div>
      <h1 class="text-4xl font-semibold tracking-tight text-[#14212b]">Puntos de acopio</h1>
      <p class="mt-2 max-w-2xl text-black/70">
        Encuentra dónde se reciben y brindan ayudas. Abre un acopio para ver qué necesitan y cómo
        contactarlos.
      </p>
    </div>

    <div
      id="mapa-acopios"
      ref="mapElement"
      class="h-[420px] w-full overflow-hidden rounded-2xl border border-black/10 bg-[#d9e8ef]"
    />
    <p v-if="!mapsApiKey" class="text-sm text-[#c45c26]">
      Configura `VITE_GOOGLE_MAPS_API_KEY` para ver el mapa. Mientras tanto, usa el listado.
    </p>
    <p v-if="mapError" class="text-sm text-[#c45c26]">{{ mapError }}</p>

    <div v-if="slides.length" class="min-w-0 space-y-3">
      <h2 class="text-2xl font-semibold">Información</h2>
      <ImageCarousel
        :slides="slides"
        @select="goToAcopioFromSlide"
      >
      <template #overlay="{ index }">
        <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-left text-white">
          <div class="flex items-center gap-2">
            <img
              :src="resolveMediaUrl(slides[index].avatarUrl)"
              :alt="slides[index].acopioName"
              class="h-8 w-8 rounded-full object-cover ring-2 ring-white/40"
            />
            <div>
              <p class="text-sm font-semibold">{{ slides[index].acopioName }}</p>
              <p class="text-xs text-white/80">
                {{ slides[index].cityName || 'Sin ciudad' }} ·
                {{ slides[index].status === 'open' ? 'Abierto' : 'Cerrado' }}
              </p>
            </div>
          </div>
          <p v-if="slides[index].shortDescription" class="mt-1 line-clamp-2 text-xs text-white/85">
            {{ slides[index].shortDescription }}
          </p>
        </div>
      </template>
      </ImageCarousel>
    </div>

    <div class="space-y-4">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <h2 class="text-2xl font-semibold">Acopios abiertos</h2>
        <label class="block w-full text-sm sm:max-w-xs">
          Buscar acopio
          <input
            v-model="searchQuery"
            type="search"
            placeholder="Nombre, ciudad o dirección"
            class="mt-1 w-full rounded-md border border-black/15 px-3 py-2"
          />
        </label>
      </div>

      <p v-if="!filteredAcopios.length" class="text-sm text-black/50">
        No hay acopios abiertos que coincidan con la búsqueda.
      </p>

      <div class="grid gap-4 md:grid-cols-2">
        <article
          v-for="acopio in filteredAcopios"
          :key="acopio.id"
          class="min-w-0 rounded-xl border border-black/10 bg-white/70 p-4"
        >
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="flex min-w-0 flex-1 items-center gap-3">
              <img
                :src="resolveMediaUrl(acopio.avatarUrl) || buildInitialsAvatarUrl(acopio.name)"
                :alt="acopio.name"
                class="h-12 w-12 shrink-0 rounded-full object-cover"
              />
              <div class="min-w-0 flex-1">
                <h2 class="text-xl font-semibold break-words">{{ acopio.name }}</h2>
                <p class="text-sm text-black/60">Abierto</p>
                <a
                  href="#mapa-acopios"
                  class="mt-0.5 block break-words text-sm text-[#1f6f5b] underline"
                  @click.prevent="showOnMap(acopio)"
                >
                  {{ addressLabel(acopio) }}
                </a>
              </div>
            </div>
            <RouterLink
              :to="`/acopios/${acopio.id}`"
              class="nav-btn nav-btn-primary nav-btn-compact shrink-0"
            >
              Ver
            </RouterLink>
          </div>
          <p v-if="acopio.description" class="mt-3 break-words whitespace-pre-wrap text-sm text-black/70">
            {{ acopio.description }}
          </p>
          <button
            type="button"
            class="mt-3 text-sm text-[#1f6f5b]"
            @click="toggleDetails(acopio.id)"
          >
            {{
              expandedAcopioId === acopio.id
                ? 'Ocultar detalle'
                : (acopio.offers || []).length
                  ? 'Qué necesitan y qué dan ▾'
                  : 'Qué necesitan ▾'
            }}
          </button>
          <div
            v-if="expandedAcopioId === acopio.id"
            class="mt-3 grid gap-3 rounded-lg border border-black/10 bg-white p-3 text-sm"
            :class="(acopio.offers || []).length ? 'md:grid-cols-2' : ''"
          >
            <div>
              <p class="font-semibold">Necesitamos</p>
              <ul class="mt-2 space-y-1 text-black/70">
                <li v-for="need in acopio.needs || []" :key="need.id" class="flex items-start gap-2">
                  <NeedIcon :icon-key="need.iconKey" :size="18" />
                  <span class="min-w-0 break-words">
                    {{ need.name }}
                    <span class="text-black/45">
                      · {{ need.needType === 'money' ? 'Dinero' : 'Producto' }}
                    </span>
                    <span v-if="need.description" class="block text-black/45">{{ need.description }}</span>
                  </span>
                </li>
                <li v-if="!(acopio.needs || []).length" class="text-black/45">
                  Aún no registran necesidades.
                </li>
              </ul>
            </div>
            <div v-if="(acopio.offers || []).length">
              <p class="font-semibold">Estamos dando</p>
              <ul class="mt-2 space-y-1 text-black/70">
                <li v-for="offer in acopio.offers || []" :key="offer.id" class="flex items-start gap-2">
                  <NeedIcon :icon-key="offer.iconKey" :size="18" />
                  <span class="min-w-0 break-words">
                    {{ offer.name }}
                    <span class="text-black/45"> · {{ offer.category }}</span>
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>
