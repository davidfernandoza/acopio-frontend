<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { ChevronLeft, ChevronRight } from '@lucide/vue';
import { resolveMediaUrl } from '../utils/media';

const props = withDefaults(
  defineProps<{
    slides: Array<{ id: number; imageUrl: string; alt?: string }>;
    paused?: boolean;
    showAdjacent?: boolean;
  }>(),
  {
    paused: false,
    showAdjacent: false,
  },
);

const emit = defineEmits<{
  select: [index: number];
}>();

const SLIDE_WIDTH_PX = 220;
const SLIDE_GAP_PX = 24;
const SLIDE_STEP_PX = SLIDE_WIDTH_PX + SLIDE_GAP_PX;
const AUTO_ADVANCE_MS = 3000;
const TRANSITION_MS = 700;

const activeSlideIndex = ref(0);
const slideDirection = ref<1 | -1>(1);
const skipHomeTransition = ref(false);
const isHomeHovered = ref(false);
let carouselTimer: ReturnType<typeof setInterval> | null = null;

const homeTrackSlides = computed(() => {
  if (props.showAdjacent || props.slides.length === 0) {
    return [];
  }
  if (props.slides.length === 1) {
    return props.slides;
  }
  return [...props.slides, ...props.slides];
});

const homeTrackStyle = computed(() => {
  const transform = `translate3d(-${activeSlideIndex.value * SLIDE_STEP_PX}px, 0, 0)`;
  if (skipHomeTransition.value) {
    return {
      transform,
      transition: 'none',
    };
  }
  return {
    transform,
    transition: `transform ${TRANSITION_MS}ms ease-in-out`,
  };
});

const homeActiveDotIndex = computed(() =>
  props.slides.length ? activeSlideIndex.value % props.slides.length : 0,
);

const showHomeControls = computed(() => !props.showAdjacent && props.slides.length > 1);

const previousSlideIndex = computed(() => {
  if (props.slides.length < 2) {
    return null;
  }
  return (activeSlideIndex.value - 1 + props.slides.length) % props.slides.length;
});

const nextSlideIndex = computed(() => {
  if (props.slides.length < 2) {
    return null;
  }
  return (activeSlideIndex.value + 1) % props.slides.length;
});

const showPreviousSlide = computed(
  () =>
    props.showAdjacent &&
    previousSlideIndex.value !== null &&
    previousSlideIndex.value !== nextSlideIndex.value,
);

const showNextSlide = computed(() => props.showAdjacent && nextSlideIndex.value !== null);

const galleryTransitionName = computed(() =>
  slideDirection.value === 1 ? 'gallery-next' : 'gallery-prev',
);

function stopCarousel() {
  if (carouselTimer) {
    clearInterval(carouselTimer);
    carouselTimer = null;
  }
}

function advanceHomeSlide() {
  if (props.paused || isHomeHovered.value || props.slides.length <= 1) {
    return;
  }
  activeSlideIndex.value += 1;
}

function startCarousel() {
  stopCarousel();
  if (props.paused || props.slides.length <= 1) {
    return;
  }
  carouselTimer = setInterval(() => {
    if (props.showAdjacent) {
      goToSlide((activeSlideIndex.value + 1) % props.slides.length, 1);
      return;
    }
    advanceHomeSlide();
  }, AUTO_ADVANCE_MS);
}

function goToSlide(nextIndex: number, direction?: 1 | -1) {
  if (nextIndex === activeSlideIndex.value || !props.slides.length) {
    return;
  }
  if (direction) {
    slideDirection.value = direction;
  } else {
    const slideCount = props.slides.length;
    const forwardSteps = (nextIndex - activeSlideIndex.value + slideCount) % slideCount;
    const backwardSteps = (activeSlideIndex.value - nextIndex + slideCount) % slideCount;
    slideDirection.value = forwardSteps <= backwardSteps ? 1 : -1;
  }
  activeSlideIndex.value = nextIndex;
}

function onSideSlideClick(slideIndex: number) {
  goToSlide(slideIndex);
  startCarousel();
}

function onCenterSlideClick() {
  emit('select', activeSlideIndex.value % Math.max(props.slides.length, 1));
}

function originalSlideIndex(slideIndex: number) {
  return props.slides.length ? slideIndex % props.slides.length : 0;
}

async function goHomePrevious() {
  if (props.slides.length <= 1) {
    return;
  }
  if (activeSlideIndex.value === 0) {
    skipHomeTransition.value = true;
    activeSlideIndex.value = props.slides.length;
    await nextTick();
    requestAnimationFrame(() => {
      skipHomeTransition.value = false;
      activeSlideIndex.value = props.slides.length - 1;
    });
  } else {
    activeSlideIndex.value -= 1;
  }
  startCarousel();
}

function goHomeNext() {
  if (props.slides.length <= 1) {
    return;
  }
  activeSlideIndex.value += 1;
  startCarousel();
}

function goHomeToDot(dotIndex: number) {
  if (dotIndex === homeActiveDotIndex.value || props.slides.length <= 1) {
    return;
  }
  activeSlideIndex.value = dotIndex;
  startCarousel();
}

async function onHomeTrackTransitionEnd(event: TransitionEvent) {
  if (event.propertyName !== 'transform') {
    return;
  }
  if (props.showAdjacent || props.slides.length <= 1) {
    return;
  }
  if (activeSlideIndex.value < props.slides.length) {
    return;
  }
  skipHomeTransition.value = true;
  activeSlideIndex.value = activeSlideIndex.value % props.slides.length;
  await nextTick();
  requestAnimationFrame(() => {
    skipHomeTransition.value = false;
  });
}

watch(
  () => [props.slides.length, props.paused, props.showAdjacent] as const,
  () => {
    if (props.showAdjacent) {
      if (activeSlideIndex.value >= props.slides.length) {
        activeSlideIndex.value = 0;
      }
    } else if (activeSlideIndex.value >= Math.max(props.slides.length * 2, 1)) {
      activeSlideIndex.value = 0;
    }
    startCarousel();
  },
  { immediate: true },
);

watch(isHomeHovered, (hovered) => {
  if (!hovered && !props.showAdjacent) {
    startCarousel();
  }
});

onMounted(startCarousel);
onUnmounted(stopCarousel);
</script>

<template>
  <div
    v-if="slides.length && showAdjacent"
    class="gallery-carousel"
  >
    <button
      v-if="showPreviousSlide && previousSlideIndex !== null"
      type="button"
      class="gallery-side"
      @click="onSideSlideClick(previousSlideIndex)"
    >
      <div class="relative overflow-hidden rounded-2xl border border-black/10 bg-[#14212b] shadow-sm">
        <Transition :name="galleryTransitionName">
          <img
            :key="slides[previousSlideIndex].id"
            :src="resolveMediaUrl(slides[previousSlideIndex].imageUrl)"
            :alt="slides[previousSlideIndex].alt || ''"
            class="aspect-[9/16] w-full object-cover"
          />
        </Transition>
      </div>
    </button>
    <div class="gallery-center">
      <div class="relative overflow-hidden rounded-2xl border border-black/10 bg-[#14212b] shadow-lg">
        <Transition :name="galleryTransitionName">
          <div :key="slides[activeSlideIndex].id" class="relative block w-full">
            <img
              :src="resolveMediaUrl(slides[activeSlideIndex].imageUrl)"
              :alt="slides[activeSlideIndex].alt || ''"
              class="aspect-[9/16] w-full object-cover"
            />
            <slot name="overlay" :slide="slides[activeSlideIndex]" :index="activeSlideIndex" />
          </div>
        </Transition>
        <button
          v-if="previousSlideIndex !== null"
          type="button"
          class="gallery-nav gallery-nav--prev"
          aria-label="Imagen anterior"
          @click="onSideSlideClick(previousSlideIndex)"
        >
          <ChevronLeft :size="22" :stroke-width="2.2" />
        </button>
        <button
          v-if="nextSlideIndex !== null"
          type="button"
          class="gallery-nav gallery-nav--next"
          aria-label="Imagen siguiente"
          @click="onSideSlideClick(nextSlideIndex)"
        >
          <ChevronRight :size="22" :stroke-width="2.2" />
        </button>
        <div class="absolute bottom-3 left-3 z-10">
          <button
            type="button"
            class="nav-btn nav-btn-primary nav-btn-compact"
            @click="onCenterSlideClick"
          >
            Ver
          </button>
        </div>
        <div class="pointer-events-none absolute bottom-3 right-4 z-10 flex gap-1">
          <span
            v-for="(slide, index) in slides"
            :key="`dot-${slide.id}`"
            class="h-2 w-2 rounded-full transition-colors duration-300"
            :class="index === activeSlideIndex ? 'bg-white' : 'bg-white/40'"
          />
        </div>
      </div>
    </div>
    <button
      v-if="showNextSlide && nextSlideIndex !== null"
      type="button"
      class="gallery-side"
      @click="onSideSlideClick(nextSlideIndex)"
    >
      <div class="relative overflow-hidden rounded-2xl border border-black/10 bg-[#14212b] shadow-sm">
        <Transition :name="galleryTransitionName">
          <img
            :key="slides[nextSlideIndex].id"
            :src="resolveMediaUrl(slides[nextSlideIndex].imageUrl)"
            :alt="slides[nextSlideIndex].alt || ''"
            class="aspect-[9/16] w-full object-cover"
          />
        </Transition>
      </div>
    </button>
  </div>

  <div
    v-else-if="slides.length"
    class="home-carousel"
    @mouseenter="isHomeHovered = true"
    @mouseleave="isHomeHovered = false"
  >
    <div class="home-carousel-row">
      <button
        v-if="showHomeControls"
        type="button"
        class="home-carousel-nav home-carousel-nav--prev"
        aria-label="Imagen anterior"
        @click="goHomePrevious"
      >
        <ChevronLeft :size="22" :stroke-width="2.2" />
      </button>

      <div class="home-carousel-viewport">
        <div
          class="home-carousel-track"
          :style="homeTrackStyle"
          @transitionend="onHomeTrackTransitionEnd"
        >
          <button
            v-for="(slide, index) in homeTrackSlides"
            :key="`${slide.id}-${index}`"
            type="button"
            class="home-carousel-slide"
            @click="emit('select', originalSlideIndex(index))"
          >
            <img
              :src="resolveMediaUrl(slide.imageUrl)"
              :alt="slide.alt || ''"
              class="aspect-[9/16] w-full object-cover"
              draggable="false"
            />
            <slot name="overlay" :slide="slide" :index="originalSlideIndex(index)" />
          </button>
        </div>
      </div>

      <button
        v-if="showHomeControls"
        type="button"
        class="home-carousel-nav home-carousel-nav--next"
        aria-label="Imagen siguiente"
        @click="goHomeNext"
      >
        <ChevronRight :size="22" :stroke-width="2.2" />
      </button>
    </div>

    <div
      v-if="showHomeControls"
      class="home-carousel-dots"
      role="tablist"
      aria-label="Imágenes del carrusel"
    >
      <button
        v-for="(slide, index) in slides"
        :key="`home-dot-${slide.id}-${index}`"
        type="button"
        class="home-carousel-dot"
        :class="{ 'home-carousel-dot--active': index === homeActiveDotIndex }"
        role="tab"
        :aria-selected="index === homeActiveDotIndex"
        :aria-label="`Ir a imagen ${index + 1} de ${slides.length}`"
        @click="goHomeToDot(index)"
      />
    </div>
  </div>
</template>

<style scoped>
.home-carousel {
  display: flex;
  width: 100%;
  min-width: 0;
  flex-direction: column;
  gap: 0.75rem;
}

.home-carousel-row {
  position: relative;
  display: flex;
  width: 100%;
  min-width: 0;
  align-items: center;
}

.home-carousel-viewport {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  overflow-x: hidden;
}

.home-carousel-track {
  display: flex;
  width: max-content;
  gap: 24px;
  will-change: transform;
}

.home-carousel-slide {
  position: relative;
  width: 220px;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: 1rem;
  border: 1px solid rgb(0 0 0 / 0.1);
  background: #14212b;
  padding: 0;
  cursor: pointer;
}

.home-carousel-nav {
  position: absolute;
  top: 50%;
  z-index: 2;
  display: inline-flex;
  height: 2.5rem;
  width: 2.5rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border: 1px solid rgb(31 111 91 / 0.35);
  border-radius: 9999px;
  background: #fff;
  color: #1f6f5b;
  cursor: pointer;
  transform: translateY(-50%);
  transition: background-color 0.2s ease, color 0.2s ease;
}

.home-carousel-nav--prev {
  left: 0.35rem;
}

.home-carousel-nav--next {
  right: 0.35rem;
}

.home-carousel-nav:hover {
  background: #1f6f5b;
  color: #fff;
}

.home-carousel-dots {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.home-carousel-dot {
  height: 0.55rem;
  width: 0.55rem;
  border: 0;
  border-radius: 9999px;
  background: rgb(20 33 43 / 0.25);
  cursor: pointer;
  padding: 0;
  transition: background-color 0.2s ease, transform 0.2s ease;
}

.home-carousel-dot:hover {
  background: rgb(31 111 91 / 0.55);
}

.home-carousel-dot--active {
  width: 1.35rem;
  background: #1f6f5b;
}

.gallery-next-enter-active,
.gallery-next-leave-active,
.gallery-prev-enter-active,
.gallery-prev-leave-active {
  transition: opacity 0.45s ease, transform 0.45s ease;
}

.gallery-next-leave-active,
.gallery-prev-leave-active {
  position: absolute;
  inset: 0;
}

.gallery-next-enter-from {
  opacity: 0;
  transform: translateX(36px) scale(0.96);
}

.gallery-next-leave-to {
  opacity: 0;
  transform: translateX(-36px) scale(0.96);
}

.gallery-prev-enter-from {
  opacity: 0;
  transform: translateX(-36px) scale(0.96);
}

.gallery-prev-leave-to {
  opacity: 0;
  transform: translateX(36px) scale(0.96);
}

.gallery-carousel {
  display: flex;
  width: 100%;
  min-width: 0;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}

.gallery-side {
  display: none;
  width: 140px;
  flex-shrink: 0;
  transform-origin: center;
  transform: scale(0.9);
  cursor: pointer;
  opacity: 0.7;
  padding: 0;
  border: 0;
  background: transparent;
  transition: opacity 0.3s ease;
}

.gallery-side:hover {
  opacity: 0.9;
}

.gallery-center {
  position: relative;
  width: min(220px, 100%);
  flex-shrink: 0;
}

.gallery-nav {
  position: absolute;
  top: 50%;
  z-index: 10;
  display: inline-flex;
  height: 2.5rem;
  width: 2.5rem;
  align-items: center;
  justify-content: center;
  border: 1px solid rgb(255 255 255 / 0.45);
  border-radius: 9999px;
  background: rgb(255 255 255 / 0.92);
  color: #1f6f5b;
  cursor: pointer;
  transform: translateY(-50%);
}

.gallery-nav--prev {
  left: 0.5rem;
}

.gallery-nav--next {
  right: 0.5rem;
}

@media (min-width: 768px) {
  .gallery-carousel {
    gap: 4rem;
  }

  .gallery-side {
    display: block;
  }

  .gallery-nav {
    display: none;
  }
}
</style>
