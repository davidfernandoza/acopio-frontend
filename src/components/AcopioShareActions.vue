<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import QRCode from 'qrcode';
import { Download, QrCode, Share2 } from '@lucide/vue';

const props = defineProps<{
  acopioName: string;
  acopioId: number;
}>();

const isShareModalOpen = ref(false);
const isQrModalOpen = ref(false);
const qrDataUrl = ref('');
const copyMessage = ref('');
const shareError = ref('');

const shareUrl = computed(() => {
  if (typeof window === 'undefined') {
    return `/acopios/${props.acopioId}`;
  }
  return `${window.location.origin}/acopios/${props.acopioId}`;
});

const shareText = computed(
  () => `Ayuda en el acopio ${props.acopioName}`,
);

const encodedShareUrl = computed(() => encodeURIComponent(shareUrl.value));
const encodedShareText = computed(() => encodeURIComponent(shareText.value));

const socialLinks = computed(() => [
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    href: `https://wa.me/?text=${encodedShareText.value}%20${encodedShareUrl.value}`,
  },
  {
    id: 'facebook',
    label: 'Facebook',
    href: `https://www.facebook.com/sharer/sharer.php?u=${encodedShareUrl.value}`,
  },
  {
    id: 'instagram',
    label: 'Instagram',
    href: '',
  },
  {
    id: 'email',
    label: 'Email',
    href: `mailto:?subject=${encodeURIComponent(`Acopio: ${props.acopioName}`)}&body=${encodedShareText.value}%20${encodedShareUrl.value}`,
  },
  {
    id: 'x',
    label: 'X',
    href: `https://twitter.com/intent/tweet?text=${encodedShareText.value}&url=${encodedShareUrl.value}`,
  },
  {
    id: 'telegram',
    label: 'Telegram',
    href: `https://t.me/share/url?url=${encodedShareUrl.value}&text=${encodedShareText.value}`,
  },
]);

async function generateQrImage() {
  qrDataUrl.value = await QRCode.toDataURL(shareUrl.value, {
    width: 560,
    margin: 2,
    color: {
      dark: '#14212b',
      light: '#ffffff',
    },
  });
}

async function copyShareLink() {
  copyMessage.value = '';
  try {
    await navigator.clipboard.writeText(`${shareText.value} ${shareUrl.value}`);
    copyMessage.value = 'Enlace copiado';
  } catch {
    copyMessage.value = 'No se pudo copiar el enlace';
  }
}

async function shareToInstagram() {
  copyMessage.value = '';
  try {
    await navigator.clipboard.writeText(`${shareText.value} ${shareUrl.value}`);
    copyMessage.value = 'Enlace copiado. Pégalo en Instagram.';
  } catch {
    copyMessage.value = 'Copia el enlace y pégalo en Instagram.';
  }

  if (navigator.share) {
    await shareWithDevice(isQrModalOpen.value);
    return;
  }

  window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer');
}

async function shareWithDevice(includeQrFile: boolean) {
  shareError.value = '';
  const sharePayload: ShareData = {
    title: props.acopioName,
    text: shareText.value,
    url: shareUrl.value,
  };

  if (includeQrFile && qrDataUrl.value) {
    const qrResponse = await fetch(qrDataUrl.value);
    const qrBlob = await qrResponse.blob();
    const qrFile = new File([qrBlob], `acopio-${props.acopioId}-qr.png`, {
      type: 'image/png',
    });
    if (navigator.canShare?.({ files: [qrFile] })) {
      sharePayload.files = [qrFile];
    }
  }

  if (!navigator.share) {
    if (includeQrFile) {
      isQrModalOpen.value = true;
    } else {
      isShareModalOpen.value = true;
    }
    return;
  }

  try {
    await navigator.share(sharePayload);
  } catch (error: unknown) {
    const shareAbortError = error as { name?: string };
    if (shareAbortError.name === 'AbortError') {
      return;
    }
    shareError.value = 'No se pudo abrir el menú de compartir';
    if (includeQrFile) {
      isQrModalOpen.value = true;
    } else {
      isShareModalOpen.value = true;
    }
  }
}

async function openShareModal() {
  if (navigator.share) {
    await shareWithDevice(false);
    return;
  }
  isShareModalOpen.value = true;
}

async function openQrModal() {
  if (!qrDataUrl.value) {
    await generateQrImage();
  }
  isQrModalOpen.value = true;
}

function closeModals() {
  isShareModalOpen.value = false;
  isQrModalOpen.value = false;
  copyMessage.value = '';
  shareError.value = '';
}

function downloadQrImage() {
  if (!qrDataUrl.value) {
    return;
  }
  const downloadLink = document.createElement('a');
  downloadLink.href = qrDataUrl.value;
  downloadLink.download = `acopio-${props.acopioId}-qr.png`;
  downloadLink.click();
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeModals();
  }
}

watch(
  () => [props.acopioId, shareUrl.value] as const,
  () => {
    void generateQrImage();
  },
);

onMounted(() => {
  window.addEventListener('keydown', onKeydown);
  void generateQrImage();
});

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown);
});
</script>

<template>
  <div class="flex w-full min-w-0 flex-col gap-2 sm:w-auto">
    <div class="grid grid-cols-2 gap-2 sm:grid-cols-1">
      <button
        type="button"
        class="nav-btn nav-btn-compact w-full"
        @click="openShareModal"
      >
        <Share2 class="mr-1.5 h-4 w-4" :stroke-width="2" />
        Compartir
      </button>
      <button
        type="button"
        class="nav-btn nav-btn-compact w-full"
        @click="openQrModal"
      >
        <QrCode class="mr-1.5 h-4 w-4" :stroke-width="2" />
        QR
      </button>
    </div>
    <p v-if="shareError" class="text-xs text-[#c45c26]">{{ shareError }}</p>
  </div>

  <Teleport to="body">
    <div
      v-if="isShareModalOpen"
      class="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
      @click="closeModals"
    >
      <div
        class="w-full max-w-sm rounded-2xl border border-black/10 bg-white p-4 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-label="Compartir acopio"
        @click.stop
      >
        <div class="mb-3 flex items-center justify-between gap-3">
          <h2 class="text-lg font-semibold text-[#1f6f5b]">Compartir acopio</h2>
          <button type="button" class="nav-btn nav-btn-compact" @click="closeModals">
            Cerrar
          </button>
        </div>
        <p class="break-all text-sm text-black/60">{{ shareUrl }}</p>
        <div class="mt-4 grid grid-cols-2 gap-2">
          <a
            v-for="socialLink in socialLinks.filter((link) => link.href)"
            :key="socialLink.id"
            :href="socialLink.href"
            target="_blank"
            rel="noopener noreferrer"
            class="nav-btn nav-btn-compact w-full"
          >
            {{ socialLink.label }}
          </a>
          <button
            type="button"
            class="nav-btn nav-btn-compact w-full"
            @click="shareToInstagram"
          >
            Instagram
          </button>
        </div>
        <button
          type="button"
          class="nav-btn nav-btn-primary nav-btn-compact mt-3 w-full"
          @click="copyShareLink"
        >
          Copiar enlace
        </button>
        <p v-if="copyMessage" class="mt-2 text-sm text-[#1f6f5b]">{{ copyMessage }}</p>
      </div>
    </div>

    <div
      v-if="isQrModalOpen"
      class="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
      @click="closeModals"
    >
      <div
        class="w-full max-w-sm rounded-2xl border border-black/10 bg-white p-4 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-label="Código QR del acopio"
        @click.stop
      >
        <div class="mb-3 flex items-center justify-between gap-3">
          <h2 class="text-lg font-semibold text-[#1f6f5b]">QR del acopio</h2>
          <button type="button" class="nav-btn nav-btn-compact" @click="closeModals">
            Cerrar
          </button>
        </div>
        <img
          v-if="qrDataUrl"
          :src="qrDataUrl"
          :alt="`Código QR de ${acopioName}`"
          class="mx-auto w-full max-w-[280px] rounded-xl border border-black/10 bg-white object-contain"
        />
        <p class="mt-3 break-all text-center text-xs text-black/50">{{ shareUrl }}</p>
        <div class="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            class="nav-btn nav-btn-primary nav-btn-compact w-full"
            @click="downloadQrImage"
          >
            <Download class="mr-1.5 h-4 w-4" :stroke-width="2" />
            Descargar
          </button>
          <button
            type="button"
            class="nav-btn nav-btn-compact w-full"
            @click="shareWithDevice(true)"
          >
            <Share2 class="mr-1.5 h-4 w-4" :stroke-width="2" />
            Enviar
          </button>
        </div>
        <div class="mt-2 grid grid-cols-2 gap-2">
          <a
            v-for="socialLink in socialLinks.filter((link) => link.href)"
            :key="`qr-${socialLink.id}`"
            :href="socialLink.href"
            target="_blank"
            rel="noopener noreferrer"
            class="nav-btn nav-btn-compact w-full"
          >
            {{ socialLink.label }}
          </a>
          <button
            type="button"
            class="nav-btn nav-btn-compact w-full"
            @click="shareToInstagram"
          >
            Instagram
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
