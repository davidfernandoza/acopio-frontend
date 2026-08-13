<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAcopiosStore } from '../stores/acopios';
import { useAuthStore } from '../stores/auth';
import { useGeoStore } from '../stores/geo';
import {
  geocodeAddress,
  renderEditableLocationMap,
} from '../composables/useGoogleMaps';
import AvatarCropper from '../components/AvatarCropper.vue';
import ImageDropzone from '../components/ImageDropzone.vue';
import NeedIconPicker from '../components/NeedIconPicker.vue';
import QrCropper from '../components/QrCropper.vue';
import SearchableSelect from '../components/SearchableSelect.vue';
import { Plus } from '@lucide/vue';
import {
  createEmptyNeedForm,
  documentTypeOptions,
  needTypeOptions,
  type NeedFormItem,
  type NeedType,
} from '../constants/needIcons';
import { formatThousands, parseThousandsInput } from '../utils/numberFormat';

const router = useRouter();
const acopiosStore = useAcopiosStore();
const authStore = useAuthStore();
const geoStore = useGeoStore();
const errorMessage = ref('');
const submitting = ref(false);
const avatarBlob = ref<Blob | null>(null);
const galleryFiles = ref<File[]>([]);
const mapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const mapElement = ref<HTMLElement | null>(null);
const mapError = ref('');
const isGeocoding = ref(false);
const hasConfirmedAddress = ref(false);
let locationMap: google.maps.Map | null = null;
let locationMarker: google.maps.Marker | null = null;
let skipNextAddressGeocode = false;

const form = reactive({
  name: '',
  description: '',
  status: 'open' as 'open' | 'closed',
  openingMode: 'indefinite' as 'indefinite' | 'scheduled' | 'manual',
  startsAt: '',
  endsAt: '',
  responsibleName: authStore.user?.name || '',
  idCountry: 0,
  idDepartment: 0,
  idCity: 0,
  street: '',
  neighborhood: '',
  reference: '',
  latitude: 0,
  longitude: 0,
  contacts: [
    {
      type: 'whatsapp' as 'whatsapp' | 'email',
      value: '',
      idCountry: 0,
      label: '',
    },
  ],
  needs: [createEmptyNeedForm()] as NeedFormItem[],
  offers: [] as Array<{
    category: string;
    iconKey: string;
    name: string;
    description: string;
  }>,
  managers: [] as Array<{
    name: string;
    email: string;
  }>,
});

const selectedCountry = computed(() =>
  geoStore.countries.find((country) => country.id === form.idCountry)
);
const selectedDepartment = computed(() =>
  geoStore.departments.find((department) => department.id === form.idDepartment)
);
const selectedCity = computed(() =>
  geoStore.cities.find((city) => city.id === form.idCity)
);

const canShowLocationMap = computed(
  () =>
    Boolean(
      hasConfirmedAddress.value &&
      form.idCountry &&
      form.idDepartment &&
      form.idCity &&
      form.street.trim() &&
      mapsApiKey
    )
);

const openingModeOptions = [
  { value: 'indefinite', label: 'Indefinidamente' },
  { value: 'scheduled', label: 'Cierre automático' },
  { value: 'manual', label: 'Cierre manual' },
];

const contactTypeOptions = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
];

const offerCategoryOptions = [
  { value: 'comida', label: 'Comida' },
  { value: 'mercado', label: 'Mercado' },
  { value: 'productos', label: 'Productos' },
  { value: 'otro', label: 'Otro' },
];

const countryOptions = computed(() =>
  geoStore.countries.map((country) => ({
    value: country.id,
    label: country.name,
  })),
);

const countryPhoneOptions = computed(() =>
  geoStore.countries.map((country) => ({
    value: country.id,
    label: `${country.name} (${country.phoneCode})`,
  })),
);

const departmentOptions = computed(() =>
  geoStore.departments.map((department) => ({
    value: department.id,
    label: department.name,
  })),
);

const cityOptions = computed(() =>
  geoStore.cities.map((city) => ({
    value: city.id,
    label: city.name,
  })),
);

onMounted(async () => {
  if (!authStore.user && authStore.token) {
    try {
      await authStore.fetchMe();
    } catch {
      // ignore; user can fill responsible manually
    }
  }
  if (!form.responsibleName && authStore.user?.name) {
    form.responsibleName = authStore.user.name;
  }

  await geoStore.loadCountries();
  if (geoStore.countries.length) {
    form.idCountry = geoStore.countries[0].id;
    form.contacts[0].idCountry = geoStore.countries[0].id;
    await geoStore.loadDepartments(form.idCountry);
  }
});

watch(
  () => form.openingMode,
  (openingMode) => {
    if (openingMode === 'scheduled' && !form.startsAt) {
      form.startsAt = getPresentDateTimeLocal();
    }
  }
);

function getPresentDateTimeLocal() {
  const now = new Date();
  const timezoneOffsetMs = now.getTimezoneOffset() * 60_000;
  const localDate = new Date(now.getTime() - timezoneOffsetMs);
  return localDate.toISOString().slice(0, 16);
}

watch(
  () => form.idCountry,
  async (idCountry) => {
    if (!idCountry) return;
    form.idDepartment = 0;
    form.idCity = 0;
    await geoStore.loadDepartments(idCountry);
  }
);

watch(
  () => form.idDepartment,
  async (idDepartment) => {
    if (!idDepartment) return;
    form.idCity = 0;
    await geoStore.loadCities(idDepartment);
  }
);

watch(
  () => form.idCity,
  (idCity) => {
    const city = geoStore.cities.find((item) => item.id === idCity);
    if (!city) {
      return;
    }
    if (!form.street.trim() || (!form.latitude && !form.longitude)) {
      form.latitude = Number(city.latitude);
      form.longitude = Number(city.longitude);
    }
  }
);

function buildAddressQuery() {
  return [
    form.street.trim(),
    selectedCity.value?.name,
    selectedDepartment.value?.name,
    selectedCountry.value?.name,
  ]
    .filter(Boolean)
    .join(', ');
}

function applyMapCoordinates(latitude: number, longitude: number) {
  form.latitude = latitude;
  form.longitude = longitude;
  if (locationMap && locationMarker) {
    const position = { lat: latitude, lng: longitude };
    locationMap.setCenter(position);
    locationMarker.setPosition(position);
  }
}

async function ensureLocationMap() {
  if (!canShowLocationMap.value || !mapElement.value) {
    return;
  }

  if (!form.latitude || !form.longitude) {
    const city = selectedCity.value;
    if (city) {
      form.latitude = Number(city.latitude);
      form.longitude = Number(city.longitude);
    }
  }

  if (!locationMap) {
    const editableMap = await renderEditableLocationMap({
      element: mapElement.value,
      latitude: form.latitude,
      longitude: form.longitude,
      onPositionChange: ({ latitude, longitude }) => {
        skipNextAddressGeocode = true;
        form.latitude = latitude;
        form.longitude = longitude;
      },
    });
    locationMap = editableMap.map;
    locationMarker = editableMap.marker;
    return;
  }

  applyMapCoordinates(form.latitude, form.longitude);
}

async function syncLocationFromAddress() {
  if (!canShowLocationMap.value) {
    mapError.value = '';
    return;
  }

  if (skipNextAddressGeocode) {
    skipNextAddressGeocode = false;
    await nextTick();
    await ensureLocationMap();
    return;
  }

  isGeocoding.value = true;
  mapError.value = '';
  try {
    const geocoded = await geocodeAddress(buildAddressQuery());
    if (geocoded) {
      applyMapCoordinates(geocoded.latitude, geocoded.longitude);
    } else if (selectedCity.value) {
      applyMapCoordinates(
        Number(selectedCity.value.latitude),
        Number(selectedCity.value.longitude)
      );
      mapError.value =
        'No se encontró la dirección exacta; se usó la ciudad como referencia. Ajusta el pin si es necesario.';
    } else {
      mapError.value = 'No se pudo ubicar la dirección en el mapa.';
      return;
    }

    await nextTick();
    if (!mapElement.value) {
      await nextTick();
    }
    await ensureLocationMap();
  } catch (error: any) {
    mapError.value = error?.message || 'No se pudo cargar el mapa de ubicación';
  } finally {
    isGeocoding.value = false;
  }
}

function resetLocationMap() {
  hasConfirmedAddress.value = false;
  locationMap = null;
  locationMarker = null;
  mapError.value = '';
}

async function onAddressBlur() {
  if (!form.street.trim()) {
    resetLocationMap();
    return;
  }

  if (!form.idCountry || !form.idDepartment || !form.idCity) {
    mapError.value =
      'Selecciona país, departamento y ciudad para ubicar la dirección en el mapa.';
    hasConfirmedAddress.value = false;
    return;
  }

  if (!mapsApiKey) {
    return;
  }

  hasConfirmedAddress.value = true;
  await syncLocationFromAddress();
}

watch(
  () => [form.idCountry, form.idDepartment, form.idCity] as const,
  () => {
    if (!form.street.trim() || !form.idCountry || !form.idDepartment || !form.idCity) {
      locationMap = null;
      locationMarker = null;
      if (!form.street.trim()) {
        hasConfirmedAddress.value = false;
      }
      mapError.value = '';
      return;
    }
    if (hasConfirmedAddress.value) {
      void syncLocationFromAddress();
    }
  }
);

watch(
  () => form.street,
  (streetValue) => {
    if (!streetValue.trim()) {
      resetLocationMap();
    }
  }
);

onUnmounted(() => {
  locationMap = null;
  locationMarker = null;
});

function addContact() {
  form.contacts.push({
    type: 'email',
    value: '',
    idCountry: form.idCountry || geoStore.countries[0]?.id || 0,
    label: '',
  });
}

function removeContact(index: number) {
  if (form.contacts.length > 1) {
    form.contacts.splice(index, 1);
  }
}

function addNeed() {
  form.needs.push(createEmptyNeedForm());
}

function removeNeed(index: number) {
  if (form.needs.length > 1) {
    form.needs.splice(index, 1);
  }
}

function onNeedTypeChange(need: NeedFormItem, nextType: NeedType) {
  need.needType = nextType;
  if (nextType === 'money') {
    need.iconKey = 'bank';
  } else if (need.iconKey === 'bank') {
    need.iconKey = 'comida';
    need.bankName = '';
    need.accountNumber = '';
    need.accountHolder = '';
    need.documentType = '';
    need.documentNumber = '';
    need.qrFile = null;
  }
}

function onNeedQuantityInput(need: NeedFormItem, event: Event) {
  const inputElement = event.target as HTMLInputElement;
  const parsedQuantity = parseThousandsInput(inputElement.value);
  need.targetQuantity = parsedQuantity;
  inputElement.value = formatThousands(parsedQuantity);
}

function addOffer() {
  form.offers.push({
    category: 'comida',
    iconKey: 'comida',
    name: '',
    description: '',
  });
}

function removeOffer(index: number) {
  form.offers.splice(index, 1);
}

function addManager() {
  form.managers.push({
    name: '',
    email: '',
  });
}

function removeManager(index: number) {
  form.managers.splice(index, 1);
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateCreateForm(): string | null {
  if (!form.name.trim()) {
    return 'El nombre del acopio es obligatorio';
  }
  if (!form.responsibleName.trim()) {
    return 'El nombre del responsable es obligatorio';
  }
  if (!form.idCountry || !form.idDepartment || !form.idCity) {
    return 'Selecciona país, departamento y ciudad';
  }
  if (!form.street.trim()) {
    return 'La dirección es obligatoria';
  }
  if (!form.latitude || !form.longitude) {
    return 'Completa la dirección y ajusta la ubicación en el mapa antes de guardar.';
  }
  if (form.openingMode === 'scheduled') {
    if (!form.startsAt || !form.endsAt) {
      return 'Debes indicar fecha de inicio y cierre';
    }
    if (new Date(form.endsAt) < new Date(form.startsAt)) {
      return 'La fecha de cierre debe ser posterior a la de inicio';
    }
  }

  const filledContacts = form.contacts.filter((contact) => contact.value.trim());
  if (!filledContacts.length) {
    return 'Debes agregar al menos un contacto';
  }
  for (const contact of filledContacts) {
    if (contact.type === 'whatsapp' && !contact.idCountry) {
      return 'Cada contacto de WhatsApp necesita un país';
    }
    if (contact.type === 'email' && !isValidEmail(contact.value.trim())) {
      return `El correo de contacto no es válido: ${contact.value}`;
    }
  }

  if (!form.needs.length) {
    return 'Debes agregar al menos una necesidad';
  }
  for (const need of form.needs) {
    if (!need.name.trim()) {
      return 'Todas las necesidades deben tener nombre';
    }
    if (need.needType === 'product' && !need.iconKey) {
      return 'Selecciona un ícono para cada necesidad de producto';
    }
    if (need.hasLimit && (!need.targetQuantity || Number(need.targetQuantity) < 1)) {
      return 'Las necesidades con límite necesitan una cantidad válida';
    }
    if (need.needType === 'money') {
      if (!need.bankName.trim() || !need.accountNumber.trim()) {
        return 'Las donaciones en dinero requieren banco y número de cuenta';
      }
    }
  }

  for (const offer of form.offers) {
    if (!offer.name.trim()) {
      return 'Si agregas una oferta, debe tener nombre';
    }
    if (!offer.category.trim() || !offer.iconKey) {
      return 'Cada oferta necesita categoría e ícono';
    }
  }

  const managerEmails = new Set<string>();
  for (const manager of form.managers) {
    const managerName = manager.name.trim();
    const managerEmail = manager.email.trim().toLowerCase();
    if (!managerName || !managerEmail) {
      return 'Completa nombre y correo de todos los gestores, o elimínalos de la lista';
    }
    if (!isValidEmail(managerEmail)) {
      return `El correo del gestor no es válido: ${manager.email}`;
    }
    if (managerEmails.has(managerEmail)) {
      return 'Hay correos de gestores duplicados';
    }
    managerEmails.add(managerEmail);
  }

  return null;
}

async function submitForm() {
  errorMessage.value = '';

  const validationError = validateCreateForm();
  if (validationError) {
    errorMessage.value = validationError;
    return;
  }

  submitting.value = true;
  try {
    const needs = form.needs.map((need) => ({
      needType: need.needType,
      iconKey: need.needType === 'money' ? 'bank' : need.iconKey,
      name: need.name,
      description: need.description || null,
      hasLimit: need.hasLimit,
      targetQuantity: need.hasLimit ? need.targetQuantity : null,
      bankName: need.needType === 'money' ? need.bankName : null,
      accountNumber: need.needType === 'money' ? need.accountNumber : null,
      accountHolder: need.needType === 'money' ? need.accountHolder || null : null,
      documentType: need.needType === 'money' ? need.documentType || null : null,
      documentNumber: need.needType === 'money' ? need.documentNumber || null : null,
    }));

    const contacts = form.contacts
      .filter((contact) => contact.value.trim())
      .map((contact) => ({
        type: contact.type,
        value: contact.value,
        idCountry: contact.type === 'whatsapp' ? contact.idCountry : null,
        label: contact.label || null,
      }));

    const offers = form.offers
      .filter((offer) => offer.name.trim())
      .map((offer) => ({
        category: offer.category,
        iconKey: offer.iconKey,
        name: offer.name,
        description: offer.description || null,
        isAvailable: true,
      }));

    const managers = form.managers.map((manager) => ({
      name: manager.name.trim(),
      email: manager.email.trim(),
    }));

    const payload = {
      name: form.name,
      description: form.description || null,
      status: form.status,
      openingMode: form.openingMode,
      startsAt: form.openingMode === 'scheduled' ? form.startsAt : null,
      endsAt: form.openingMode === 'scheduled' ? form.endsAt : null,
      responsibleName: form.responsibleName,
      address: {
        idCity: form.idCity,
        street: form.street,
        neighborhood: form.neighborhood || null,
        reference: form.reference || null,
        latitude: form.latitude,
        longitude: form.longitude,
      },
      contacts,
      needs,
      offers,
      managers,
    };

    const formData = new FormData();
    formData.append('name', payload.name);
    formData.append('description', payload.description || '');
    formData.append('status', payload.status);
    formData.append('openingMode', payload.openingMode);
    formData.append('startsAt', payload.startsAt || '');
    formData.append('endsAt', payload.endsAt || '');
    formData.append('responsibleName', payload.responsibleName);
    formData.append('address', JSON.stringify(payload.address));
    formData.append('contacts', JSON.stringify(payload.contacts));
    formData.append('needs', JSON.stringify(payload.needs));
    formData.append('offers', JSON.stringify(payload.offers));
    formData.append('managers', JSON.stringify(payload.managers));

    if (avatarBlob.value) {
      formData.append('avatar', avatarBlob.value, 'avatar.jpg');
    }
    for (const galleryFile of galleryFiles.value) {
      formData.append('images', galleryFile);
    }
    form.needs.forEach((need, needIndex) => {
      if (need.needType === 'money' && need.qrFile) {
        formData.append(`needQr_${needIndex}`, need.qrFile);
      }
    });

    const acopio = await acopiosStore.createAcopio(formData);
    await authStore.fetchMe();
    await router.push(`/acopios/${acopio.id}`);
  } catch (error: any) {
    errorMessage.value =
      error?.response?.data?.message ||
      error?.response?.data?.details?.join?.(', ') ||
      'No se pudo crear el acopio';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <section class="mx-auto max-w-3xl space-y-6">
    <div>
      <h1 class="text-3xl font-semibold">Crear acopio</h1>
      <p class="mt-1 text-black/70">Registra ubicación, contactos y lo que están recibiendo.</p>
    </div>

    <form class="space-y-6" @submit.prevent="submitForm">
      <div class="space-y-6 rounded-2xl border border-black/10 bg-white/75 p-6">
        <div class="grid items-start gap-6 md:grid-cols-[auto_1fr] md:gap-8">
          <div>
            <AvatarCropper v-model="avatarBlob" compact :preview-name="form.name || 'Acopio'" />
          </div>
          <div class="space-y-4">
            <label class="block text-sm">
              Nombre
              <input v-model="form.name" required class="mt-1 w-full rounded-md border border-black/15 px-3 py-2" />
            </label>
            <label class="block text-sm">
              Descripción (opcional)
              <textarea v-model="form.description" rows="3"
                class="mt-1 w-full rounded-md border border-black/15 px-3 py-2" />
            </label>
          </div>
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <label class="text-sm">
            Responsable
            <input v-model="form.responsibleName" required placeholder="Nombre del responsable"
              class="mt-1 w-full rounded-md border border-black/15 px-3 py-2" />
          </label>
          <label class="text-sm">
            Acopio habilitado
            <SearchableSelect v-model="form.openingMode" :options="openingModeOptions" required />
          </label>
          <label v-if="form.openingMode === 'scheduled'" class="text-sm">
            Inicio
            <input v-model="form.startsAt" type="datetime-local" required
              class="mt-1 w-full rounded-md border border-black/15 px-3 py-2" />
          </label>
          <label v-if="form.openingMode === 'scheduled'" class="text-sm">
            Fecha de cierre
            <input v-model="form.endsAt" type="datetime-local" required
              class="mt-1 w-full rounded-md border border-black/15 px-3 py-2" />
          </label>
        </div>
      </div>

      <div class="space-y-3 rounded-2xl border border-black/10 bg-white/75 p-6">
        <div>
          <h2 class="text-lg font-semibold">Ubicación (requerido)</h2>
          <p class="text-sm text-black/60">Obligatorio.</p>
        </div>
        <div class="grid gap-3 md:grid-cols-3">
          <label class="text-sm">
            País
            <SearchableSelect v-model="form.idCountry" :options="countryOptions" required />
          </label>
          <label class="text-sm">
            Departamento
            <SearchableSelect v-model="form.idDepartment" :options="departmentOptions" placeholder="Selecciona"
              required />
          </label>
          <label class="text-sm">
            Ciudad
            <SearchableSelect v-model="form.idCity" :options="cityOptions" placeholder="Selecciona" required />
          </label>
        </div>
        <label class="block text-sm">
          Dirección
          <input v-model="form.street" required class="mt-1 w-full rounded-md border border-black/15 px-3 py-2"
            @blur="onAddressBlur" />
        </label>
        <div class="grid gap-3 md:grid-cols-2">
          <label class="text-sm">
            Barrio (opcional)
            <input v-model="form.neighborhood" class="mt-1 w-full rounded-md border border-black/15 px-3 py-2" />
          </label>
          <label class="text-sm">
            Complemento (opcional)
            <input v-model="form.reference" class="mt-1 w-full rounded-md border border-black/15 px-3 py-2" />
          </label>
        </div>
        <p v-if="!mapsApiKey" class="text-xs text-[#c45c26]">
          Configura `VITE_GOOGLE_MAPS_API_KEY` para ubicar el acopio en el mapa.
        </p>
        <template v-else-if="canShowLocationMap">
          <p class="text-xs text-black/55">
            Mueve el pin si la ubicación no coincide. Solo se guardarán latitud y longitud;
            la dirección escrita no cambia.
          </p>
          <p v-if="isGeocoding" class="text-xs text-black/50">Buscando ubicación…</p>
          <div ref="mapElement"
            class="h-[320px] w-full overflow-hidden rounded-xl border border-black/10 bg-[#d9e8ef]" />
          <p v-if="mapError" class="text-xs text-[#c45c26]">{{ mapError }}</p>
          <p v-else class="text-xs text-black/45">
            Coordenadas: {{ form.latitude.toFixed(6) }}, {{ form.longitude.toFixed(6) }}
          </p>
        </template>
        <p v-else-if="mapError" class="text-xs text-[#c45c26]">{{ mapError }}</p>
        <p v-else class="text-xs text-black/45">
          Escribe la dirección y sal del campo para buscarla en el mapa (usa país,
          departamento y ciudad).
        </p>
      </div>

      <div class="space-y-3 rounded-2xl border border-black/10 bg-white/75 p-6">
        <div>
          <h2 class="text-lg font-semibold">Contactos (requerido)</h2>
          <p class="text-sm text-black/60">Mínimo 1.</p>
        </div>
        <div v-for="(contact, index) in form.contacts" :key="index"
          class="space-y-3 rounded-lg border border-black/10 p-3">
          <div class="grid gap-3 md:grid-cols-2">
            <label class="text-sm">
              Tipo
              <SearchableSelect v-model="contact.type" :options="contactTypeOptions" required />
            </label>
            <label v-if="contact.type === 'whatsapp'" class="text-sm">
              Código de país
              <SearchableSelect v-model="contact.idCountry" :options="countryPhoneOptions" required />
            </label>
            <label class="text-sm">
              {{ contact.type === 'email' ? 'Email' : 'Teléfono' }}
              <input v-model="contact.value" required :type="contact.type === 'email' ? 'email' : 'tel'"
                :placeholder="contact.type === 'email' ? 'correo@ejemplo.com' : '3001234567'"
                class="mt-1 w-full rounded-md border border-black/15 px-3 py-2" />
            </label>
            <label class="text-sm">
              Nombre contacto (opcional)
              <input v-model="contact.label" placeholder="Nombre de la persona"
                class="mt-1 w-full rounded-md border border-black/15 px-3 py-2" />
            </label>
          </div>
          <button v-if="form.contacts.length > 1" type="button" class="text-xs text-black/45"
            @click="removeContact(index)">
            Quitar
          </button>
        </div>
        <button
          type="button"
          class="inline-flex items-center gap-1 text-sm text-[#1f6f5b]"
          @click="addContact"
        >
          <Plus :size="16" :stroke-width="2.4" />
          Agregar
        </button>
      </div>

      <div class="space-y-3 rounded-2xl border border-black/10 bg-white/75 p-6">
        <div>
          <h2 class="text-lg font-semibold">Imágenes del acopio (máx. 3, opcional)</h2>
          <p class="mt-1 text-sm text-black/60">
            Formato vertical de celular (9:16). Resolución recomendada: 1080 × 1920 px,
            para que se vean bien en el carrusel y la galería.
          </p>
        </div>
        <ImageDropzone v-model="galleryFiles" :max-files="3" />
      </div>

      <div class="space-y-3 rounded-2xl border border-black/10 bg-white/75 p-6">
        <div>
          <h2 class="text-lg font-semibold">Necesitamos (recaudo) (requerido)</h2>
          <p class="text-sm text-black/60">Mínimo 1.</p>
        </div>
        <div v-for="(need, index) in form.needs" :key="index" class="space-y-3 rounded-lg border border-black/10 p-3">
          <div class="grid gap-3 md:grid-cols-4">
            <label class="text-sm">
              Tipo
              <SearchableSelect :model-value="need.needType" :options="needTypeOptions" required
                @update:model-value="(nextType) => onNeedTypeChange(need, nextType as NeedType)" />
            </label>
            <label class="text-sm md:col-span-2">
              {{ need.needType === 'money' ? 'Nombre de la donación' : 'Nombre del producto' }}
              <input v-model="need.name" required class="mt-1 w-full rounded-md border border-black/15 px-3 py-2" />
            </label>
            <label class="flex items-end justify-between gap-2 text-sm">
              <span class="mb-3 inline-flex items-center gap-2">
                <input v-model="need.hasLimit" type="checkbox" />
                Tiene límite
              </span>
              <button v-if="form.needs.length > 1" type="button" class="mb-3 text-xs text-black/45"
                @click="removeNeed(index)">
                Quitar
              </button>
            </label>
            <label v-if="need.hasLimit" class="text-sm md:col-span-3">
              Cantidad
              <input :value="formatThousands(need.targetQuantity)" type="text" inputmode="numeric" required
                class="mt-1 w-full rounded-md border border-black/15 px-3 py-2"
                @input="onNeedQuantityInput(need, $event)" />
            </label>
          </div>
          <NeedIconPicker v-model="need.iconKey" :need-type="need.needType" />
          <label class="text-sm">
            Descripción (opcional)
            <textarea v-model="need.description" rows="2"
              class="mt-1 w-full rounded-md border border-black/15 px-3 py-2" />
          </label>
          <div v-if="need.needType === 'money'" class="grid gap-3 md:grid-cols-2">
            <label class="text-sm">
              Nombre del banco
              <input v-model="need.bankName" required class="mt-1 w-full rounded-md border border-black/15 px-3 py-2" />
            </label>
            <label class="text-sm">
              Número de cuenta
              <input v-model="need.accountNumber" required
                class="mt-1 w-full rounded-md border border-black/15 px-3 py-2" />
            </label>
            <label class="text-sm">
              Propietario (opcional)
              <input v-model="need.accountHolder" class="mt-1 w-full rounded-md border border-black/15 px-3 py-2" />
            </label>
            <label class="text-sm">
              Tipo de documento (opcional)
              <SearchableSelect v-model="need.documentType" :options="documentTypeOptions" placeholder="Selecciona" />
            </label>
            <label class="text-sm">
              Número de documento (opcional)
              <input v-model="need.documentNumber" class="mt-1 w-full rounded-md border border-black/15 px-3 py-2" />
            </label>
            <QrCropper v-model="need.qrFile" />
          </div>
        </div>
        <button
          type="button"
          class="inline-flex items-center gap-1 text-sm text-[#1f6f5b]"
          @click="addNeed"
        >
          <Plus :size="16" :stroke-width="2.4" />
          Agregar
        </button>
      </div>

      <div class="space-y-3 rounded-2xl border border-black/10 bg-white/75 p-6">
        <div>
          <h2 class="text-lg font-semibold">Estamos dando (opcional)</h2>
        </div>
        <p v-if="!form.offers.length" class="text-sm text-black/50">
          Si tu acopio también entrega ayudas, agrégalas aquí. Las personas irán a recogerlas.
          Si por ahora no das nada, déjalo vacío y complétalo después.
        </p>
        <div v-for="(offer, index) in form.offers" :key="index"
          class="space-y-3 rounded-lg border border-black/10 p-3">
          <div class="grid gap-3 md:grid-cols-2">
            <label class="text-sm">
              Categoría
              <SearchableSelect v-model="offer.category" :options="offerCategoryOptions" required />
            </label>
            <label class="text-sm">
              Nombre
              <input v-model="offer.name" required class="mt-1 w-full rounded-md border border-black/15 px-3 py-2" />
            </label>
          </div>
          <NeedIconPicker v-model="offer.iconKey" />
          <label class="text-sm">
            Descripción (opcional)
            <div class="mt-1 flex gap-2">
              <textarea v-model="offer.description" rows="2"
                class="w-full rounded-md border border-black/15 px-3 py-2" />
              <button type="button" class="text-xs text-black/45" @click="removeOffer(index)">Quitar</button>
            </div>
          </label>
        </div>
        <button
          type="button"
          class="inline-flex items-center gap-1 text-sm text-[#1f6f5b]"
          @click="addOffer"
        >
          <Plus :size="16" :stroke-width="2.4" />
          Agregar
        </button>
      </div>

      <div class="space-y-3 rounded-2xl border border-black/10 bg-white/75 p-6">
        <div>
          <h2 class="text-lg font-semibold">Usuarios que pueden gestionar (opcional)</h2>
        </div>
        <p v-if="!form.managers.length" class="text-sm text-black/50">
          Invita por email a otras personas para que te ayuden a gestionar este acopio.
        </p>
        <div v-for="(manager, index) in form.managers" :key="index"
          class="grid gap-3 rounded-lg border border-black/10 p-3 md:grid-cols-2">
          <label class="text-sm">
            Nombre
            <input v-model="manager.name" required class="mt-1 w-full rounded-md border border-black/15 px-3 py-2" />
          </label>
          <label class="text-sm">
            Correo
            <div class="mt-1 flex gap-2">
              <input v-model="manager.email" type="email" required
                class="w-full rounded-md border border-black/15 px-3 py-2" />
              <button type="button" class="text-xs text-black/45" @click="removeManager(index)">Quitar</button>
            </div>
          </label>
        </div>
        <button
          type="button"
          class="inline-flex items-center gap-1 text-sm text-[#1f6f5b]"
          @click="addManager"
        >
          <Plus :size="16" :stroke-width="2.4" />
          Agregar
        </button>
      </div>

      <p v-if="errorMessage" class="text-sm text-[#c45c26]">{{ errorMessage }}</p>
      <button type="submit" class="nav-btn nav-btn-primary disabled:opacity-60" :disabled="submitting">
        Guardar acopio
      </button>
    </form>
  </section>
</template>
