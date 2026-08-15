import { defineStore } from 'pinia';
import { ref } from 'vue';

const PAGE_LOADER_SAFETY_TIMEOUT_MS = 15000;

export const usePageLoaderStore = defineStore('pageLoader', () => {
  const isPageLoading = ref(true);
  let currentNavigationId = 1;
  let safetyTimeoutId = 0;

  function armSafetyTimeout() {
    window.clearTimeout(safetyTimeoutId);
    const navigationIdToExpire = currentNavigationId;
    safetyTimeoutId = window.setTimeout(() => {
      if (currentNavigationId === navigationIdToExpire) {
        isPageLoading.value = false;
      }
    }, PAGE_LOADER_SAFETY_TIMEOUT_MS);
  }

  function startRoute() {
    currentNavigationId += 1;
    isPageLoading.value = true;
    armSafetyTimeout();
  }

  function finishRoute(navigationId: number) {
    if (navigationId !== currentNavigationId) {
      return;
    }
    window.clearTimeout(safetyTimeoutId);
    isPageLoading.value = false;
  }

  function getCurrentNavigationId() {
    return currentNavigationId;
  }

  armSafetyTimeout();

  return {
    isPageLoading,
    getCurrentNavigationId,
    startRoute,
    finishRoute,
  };
});
