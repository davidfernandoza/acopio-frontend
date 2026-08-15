import { usePageLoaderStore } from '../stores/pageLoader';

export async function withPageReady(loadPage: () => Promise<void> | void) {
  const pageLoader = usePageLoaderStore();
  const loadingNavigationId = pageLoader.getCurrentNavigationId();
  try {
    await loadPage();
  } finally {
    pageLoader.finishRoute(loadingNavigationId);
  }
}
