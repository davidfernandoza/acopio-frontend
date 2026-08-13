import { ref } from 'vue';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null);
const canPromptInstall = ref(false);
const isInstalled = ref(false);
const installHint = ref('');
const isPrompting = ref(false);
let listenersRegistered = false;

function isStandaloneMode() {
  const mediaQueryStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const iosStandalone = Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return mediaQueryStandalone || iosStandalone;
}

function isIosDevice() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function handleBeforeInstallPrompt(event: Event) {
  event.preventDefault();
  deferredPrompt.value = event as BeforeInstallPromptEvent;
  canPromptInstall.value = !isStandaloneMode();
  installHint.value = '';
}

function handleAppInstalled() {
  deferredPrompt.value = null;
  canPromptInstall.value = false;
  isInstalled.value = true;
  installHint.value = '';
}

function waitForDeferredPrompt(timeoutMs: number) {
  if (deferredPrompt.value) {
    return Promise.resolve(true);
  }

  return new Promise<boolean>((resolve) => {
    const startedAt = Date.now();
    const intervalId = window.setInterval(() => {
      if (deferredPrompt.value) {
        window.clearInterval(intervalId);
        resolve(true);
        return;
      }
      if (Date.now() - startedAt >= timeoutMs) {
        window.clearInterval(intervalId);
        resolve(false);
      }
    }, 100);
  });
}

export function initPwaInstallListeners() {
  if (typeof window === 'undefined' || listenersRegistered) {
    return;
  }

  listenersRegistered = true;
  isInstalled.value = isStandaloneMode();
  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  window.addEventListener('appinstalled', handleAppInstalled);

  window.matchMedia('(display-mode: standalone)').addEventListener('change', (event) => {
    isInstalled.value = event.matches || isStandaloneMode();
  });
}

export function usePwaInstall() {
  initPwaInstallListeners();

  async function promptInstall() {
    if (isPrompting.value) {
      return false;
    }

    installHint.value = '';

    if (isStandaloneMode()) {
      isInstalled.value = true;
      installHint.value = 'La app ya está instalada en este dispositivo.';
      return false;
    }

    if (!deferredPrompt.value) {
      await waitForDeferredPrompt(2500);
    }

    if (deferredPrompt.value) {
      isPrompting.value = true;
      try {
        const installEvent = deferredPrompt.value;
        await installEvent.prompt();
        const choice = await installEvent.userChoice;
        deferredPrompt.value = null;
        canPromptInstall.value = false;
        if (choice.outcome === 'accepted') {
          isInstalled.value = true;
          installHint.value = '';
          return true;
        }
        installHint.value =
          'Instalación cancelada. Puedes intentarlo de nuevo cuando quieras.';
        return false;
      } catch {
        installHint.value =
          'No se pudo abrir el instalador. Usa el ícono de descarga en la barra de dirección del navegador.';
        return false;
      } finally {
        isPrompting.value = false;
      }
    }

    if (isIosDevice()) {
      installHint.value =
        'En iPhone o iPad: toca Compartir y luego “Agregar a pantalla de inicio”.';
      return false;
    }

    installHint.value =
      'El instalador aún no está listo. Espera unos segundos, recarga la página y vuelve a tocar “Descargar app”. También puedes usar el ícono de descarga en la barra de dirección.';
    return false;
  }

  return {
    canPromptInstall,
    isInstalled,
    installHint,
    isPrompting,
    promptInstall,
  };
}
