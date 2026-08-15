<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { useAcopiosStore } from '../stores/acopios';
import { useGeoStore } from '../stores/geo';
import {
  geocodeAddress,
  reverseGeocode,
  renderEditableLocationMap,
} from '../composables/useGoogleMaps';
import AvatarCropper from '../components/AvatarCropper.vue';
import ImageDropzone from '../components/ImageDropzone.vue';
import NeedIconPicker from '../components/NeedIconPicker.vue';
import QrCropper from '../components/QrCropper.vue';
import SearchableSelect from '../components/SearchableSelect.vue';
import NeedIcon from '../components/NeedIcon.vue';
import ManageListSection from '../components/ManageListSection.vue';
import ExcelImportPanel from '../components/ExcelImportPanel.vue';
import { resolveMediaUrl } from '../utils/media';
import { formatThousands, parseThousandsInput } from '../utils/numberFormat';
import { withPageReady } from '../composables/usePageReady';
import {
  createEmptyNeedForm,
  defaultProductCategoryKey,
  defaultProductIconKey,
  defaultTalentIconKey,
  documentTypeOptions,
  getNeedNameLabel,
  getNeedTypeLabel,
  groupOffersByCategory,
  groupProductsByCategory,
  MAX_MONEY_NEEDS,
  needTypeOptions,
  offerCategoryOptions,
  productCategoryOptions,
  type NeedType,
} from '../constants/needIcons';
import { MAX_ACOPIO_GALLERY_IMAGES } from '../constants/uploads';

const route = useRoute();
const router = useRouter();
const acopiosStore = useAcopiosStore();
const geoStore = useGeoStore();
const idAcopio = computed(() => Number(route.params.idAcopio));
const message = ref('');
const errorMessage = ref('');
const avatarBlob = ref<Blob | null>(null);
const pendingGalleryFiles = ref<File[]>([]);
const mapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const mapElement = ref<HTMLElement | null>(null);
const mapError = ref('');
const isGeocoding = ref(false);
const hasConfirmedAddress = ref(false);
const skipLocationCascade = ref(true);
const savingInfo = ref(false);
const savingLocation = ref(false);
let locationMap: google.maps.Map | null = null;
let locationMarker: google.maps.Marker | null = null;
let skipNextAddressGeocode = false;
let reverseGeocodeRequestId = 0;

const openingModeOptions = [
  { value: 'indefinite', label: 'Indefinidamente' },
  { value: 'scheduled', label: 'Cierre automático' },
];

const infoForm = reactive({
  name: '',
  description: '',
  responsibleName: '',
  openingMode: 'indefinite' as 'indefinite' | 'scheduled',
  startsAt: '',
  endsAt: '',
});

const locationForm = reactive({
  idCountry: 0,
  idDepartment: 0,
  idCity: 0,
  street: '',
  neighborhood: '',
  reference: '',
  latitude: 0,
  longitude: 0,
});

const contactTypeOptions = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
  { value: 'landline', label: 'Teléfono fijo' },
];

const countryPhoneOptions = computed(() =>
  geoStore.countries.map((country) => ({
    value: country.id,
    label: `${country.name} (${country.phoneCode})`,
  })),
);

const needForm = reactive(createEmptyNeedForm());

const offerForm = reactive({
  category: 'comida',
  iconKey: defaultProductIconKey,
  name: '',
  description: '',
  isAvailable: true,
});

const contactForm = reactive({
  type: 'whatsapp' as 'whatsapp' | 'email' | 'landline',
  value: '',
  idCountry: 0,
  localPrefix: '',
  extension: '',
  label: '',
});

const currentImages = computed(() => acopiosStore.currentAcopio?.images || []);
const currentNeeds = computed(() => acopiosStore.currentAcopio?.needs || []);
const currentOffers = computed(() => acopiosStore.currentAcopio?.offers || []);
const offerGroups = computed(() => groupOffersByCategory(currentOffers.value));
const currentContacts = computed(() => acopiosStore.currentAcopio?.contacts || []);
const remainingImageSlots = computed(() => Math.max(0, MAX_ACOPIO_GALLERY_IMAGES - currentImages.value.length));
const moneyNeedsCount = computed(
  () => currentNeeds.value.filter((need: { needType: string }) => need.needType === 'money').length
);
const currentProductNeeds = computed(() =>
  currentNeeds.value.filter((need: { needType: string }) => need.needType === 'product')
);
const productNeedGroups = computed(() => groupProductsByCategory(currentProductNeeds.value));
const currentTalentNeeds = computed(() =>
  currentNeeds.value.filter((need: { needType: string }) => need.needType === 'talent')
);
const currentMoneyNeeds = computed(() =>
  currentNeeds.value.filter((need: { needType: string }) => need.needType === 'money')
);
const canAddMoneyNeed = computed(
  () => needForm.needType === 'money' || moneyNeedsCount.value < MAX_MONEY_NEEDS
);
const needTypeSelectOptions = computed(() =>
  canAddMoneyNeed.value
    ? needTypeOptions
    : needTypeOptions.filter((option) => option.value !== 'money')
);

const countryOptions = computed(() =>
  geoStore.countries.map((country) => ({
    value: country.id,
    label: country.name,
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

const selectedCountry = computed(() =>
  geoStore.countries.find((country) => country.id === locationForm.idCountry)
);
const selectedDepartment = computed(() =>
  geoStore.departments.find((department) => department.id === locationForm.idDepartment)
);
const selectedCity = computed(() =>
  geoStore.cities.find((city) => city.id === locationForm.idCity)
);

const canShowLocationMap = computed(
  () =>
    Boolean(
      hasConfirmedAddress.value &&
      locationForm.idCountry &&
      locationForm.idDepartment &&
      locationForm.idCity &&
      locationForm.street.trim() &&
      mapsApiKey
    )
);

function formatDisplayDate(isoValue: string | null) {
  if (!isoValue) {
    return '';
  }
  const parsedDate = new Date(isoValue);
  if (Number.isNaN(parsedDate.getTime())) {
    return '';
  }
  return parsedDate.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function toDateInputValue(isoValue: string | null) {
  if (!isoValue) {
    return '';
  }
  const parsedDate = new Date(isoValue);
  if (Number.isNaN(parsedDate.getTime())) {
    return '';
  }
  const timezoneOffsetMs = parsedDate.getTimezoneOffset() * 60_000;
  return new Date(parsedDate.getTime() - timezoneOffsetMs).toISOString().slice(0, 10);
}

function fromStartDateInput(dateValue: string) {
  if (!dateValue) {
    return null;
  }
  const [year, month, day] = dateValue.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0).toISOString();
}

function fromEndDateInput(dateValue: string) {
  if (!dateValue) {
    return null;
  }
  const [year, month, day] = dateValue.split('-').map(Number);
  return new Date(year, month - 1, day, 23, 59, 59, 999).toISOString();
}

function fillInfoForm() {
  const currentAcopio = acopiosStore.currentAcopio;
  if (!currentAcopio) {
    return;
  }
  infoForm.name = currentAcopio.name;
  infoForm.description = currentAcopio.description || '';
  infoForm.responsibleName = currentAcopio.responsibleName;
  infoForm.openingMode =
    currentAcopio.openingMode === 'scheduled' ? 'scheduled' : 'indefinite';
  infoForm.startsAt = toDateInputValue(currentAcopio.startsAt);
  infoForm.endsAt = toDateInputValue(currentAcopio.endsAt);
}

async function fillLocationForm() {
  const currentAddress = acopiosStore.currentAcopio?.address;
  if (!currentAddress) {
    return;
  }

  skipLocationCascade.value = true;
  const city = currentAddress.city;
  const department = city?.department;
  const country = department?.country;

  locationForm.street = currentAddress.street;
  locationForm.neighborhood = currentAddress.neighborhood || '';
  locationForm.reference = currentAddress.reference || '';
  locationForm.latitude = Number(currentAddress.latitude);
  locationForm.longitude = Number(currentAddress.longitude);

  if (country?.id) {
    locationForm.idCountry = country.id;
    await geoStore.loadDepartments(country.id);
  }
  if (department?.id) {
    locationForm.idDepartment = department.id;
    await geoStore.loadCities(department.id);
  }
  if (city?.id) {
    locationForm.idCity = city.id;
  }

  hasConfirmedAddress.value = Boolean(locationForm.street.trim());
  skipLocationCascade.value = false;
  await nextTick();
  await ensureLocationMap();
}

function buildAddressQuery() {
  return [
    locationForm.street.trim(),
    selectedCity.value?.name,
    selectedDepartment.value?.name,
    selectedCountry.value?.name,
  ]
    .filter(Boolean)
    .join(', ');
}

function applyMapCoordinates(latitude: number, longitude: number) {
  locationForm.latitude = latitude;
  locationForm.longitude = longitude;
  if (locationMap && locationMarker) {
    const position = { lat: latitude, lng: longitude };
    locationMap.setCenter(position);
    locationMarker.setPosition(position);
  }
}

function normalizeGeoName(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function findGeoMatch<T extends { name: string }>(items: T[], candidateName: string) {
  if (!candidateName) {
    return undefined;
  }
  const normalizedCandidate = normalizeGeoName(candidateName);
  return items.find((item) => {
    const normalizedItem = normalizeGeoName(item.name);
    return (
      normalizedItem === normalizedCandidate ||
      normalizedItem.startsWith(normalizedCandidate) ||
      normalizedCandidate.startsWith(normalizedItem)
    );
  });
}

async function applyAddressFromMapCoordinates(latitude: number, longitude: number) {
  const requestId = ++reverseGeocodeRequestId;
  isGeocoding.value = true;
  mapError.value = '';
  skipNextAddressGeocode = true;

  try {
    const geocodedAddress = await reverseGeocode(latitude, longitude);
    if (requestId !== reverseGeocodeRequestId) {
      return;
    }
    if (!geocodedAddress) {
      mapError.value = 'No se encontró una dirección para esa ubicación.';
      return;
    }

    skipNextAddressGeocode = true;
    locationForm.street = geocodedAddress.street;
    if (geocodedAddress.neighborhood) {
      locationForm.neighborhood = geocodedAddress.neighborhood;
    }

    const matchedCountry = findGeoMatch(geoStore.countries, geocodedAddress.countryName);
    if (!matchedCountry) {
      return;
    }

    skipLocationCascade.value = true;
    try {
      if (matchedCountry.id !== locationForm.idCountry) {
        locationForm.idCountry = matchedCountry.id;
        await geoStore.loadDepartments(matchedCountry.id);
      }

      const matchedDepartment =
        findGeoMatch(geoStore.departments, geocodedAddress.departmentName) ||
        findGeoMatch(geoStore.departments, geocodedAddress.cityName);
      if (matchedDepartment && matchedDepartment.id !== locationForm.idDepartment) {
        locationForm.idDepartment = matchedDepartment.id;
        await geoStore.loadCities(matchedDepartment.id);
      }

      const matchedCity =
        findGeoMatch(geoStore.cities, geocodedAddress.cityName) ||
        findGeoMatch(geoStore.cities, geocodedAddress.departmentName);
      if (matchedCity) {
        locationForm.idCity = matchedCity.id;
      }
    } finally {
      skipLocationCascade.value = false;
    }
  } catch (error: unknown) {
    if (requestId !== reverseGeocodeRequestId) {
      return;
    }
    const geocodeError = error as { message?: string };
    mapError.value = geocodeError?.message || 'No se pudo obtener la dirección de Google Maps.';
  } finally {
    if (requestId === reverseGeocodeRequestId) {
      isGeocoding.value = false;
    }
  }
}

async function ensureLocationMap() {
  if (!canShowLocationMap.value || !mapElement.value) {
    return;
  }

  if (!locationForm.latitude || !locationForm.longitude) {
    const city = selectedCity.value;
    if (city) {
      locationForm.latitude = Number(city.latitude);
      locationForm.longitude = Number(city.longitude);
    }
  }

  if (!locationMap) {
    const editableMap = await renderEditableLocationMap({
      element: mapElement.value,
      latitude: locationForm.latitude,
      longitude: locationForm.longitude,
      onPositionChange: ({ latitude, longitude }) => {
        skipNextAddressGeocode = true;
        locationForm.latitude = latitude;
        locationForm.longitude = longitude;
        void applyAddressFromMapCoordinates(latitude, longitude);
      },
    });
    locationMap = editableMap.map;
    locationMarker = editableMap.marker;
    return;
  }

  applyMapCoordinates(locationForm.latitude, locationForm.longitude);
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
    await ensureLocationMap();
  } catch (error: unknown) {
    const mapLoadError = error as { message?: string };
    mapError.value = mapLoadError?.message || 'No se pudo cargar el mapa de ubicación';
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
  if (!locationForm.street.trim()) {
    resetLocationMap();
    return;
  }

  if (!locationForm.idCountry || !locationForm.idDepartment || !locationForm.idCity) {
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

async function submitInfo() {
  savingInfo.value = true;
  errorMessage.value = '';
  if (infoForm.openingMode === 'scheduled') {
    if (!infoForm.startsAt || !infoForm.endsAt) {
      errorMessage.value = 'Debes indicar fecha de inicio y cierre';
      savingInfo.value = false;
      return;
    }
    if (new Date(infoForm.endsAt) < new Date(infoForm.startsAt)) {
      errorMessage.value = 'La fecha de cierre debe ser posterior a la de inicio';
      savingInfo.value = false;
      return;
    }
  }
  try {
    await acopiosStore.updateAcopio(idAcopio.value, {
      name: infoForm.name,
      description: infoForm.description || null,
      responsibleName: infoForm.responsibleName,
      openingMode: infoForm.openingMode,
      startsAt: infoForm.openingMode === 'scheduled' ? fromStartDateInput(infoForm.startsAt) : null,
      endsAt: infoForm.openingMode === 'scheduled' ? fromEndDateInput(infoForm.endsAt) : null,
    });
    fillInfoForm();
    message.value = 'Información actualizada';
  } catch (error: unknown) {
    const axiosError = error as { response?: { data?: { message?: string } } };
    errorMessage.value = axiosError?.response?.data?.message || 'No se pudo actualizar la información';
  } finally {
    savingInfo.value = false;
  }
}

async function submitLocation() {
  savingLocation.value = true;
  errorMessage.value = '';
  try {
    if (!locationForm.latitude || !locationForm.longitude) {
      errorMessage.value =
        'Completa la dirección y ajusta la ubicación en el mapa antes de guardar.';
      return;
    }
    await acopiosStore.updateAcopio(idAcopio.value, {
      address: {
        idCity: locationForm.idCity,
        street: locationForm.street,
        neighborhood: locationForm.neighborhood || null,
        reference: locationForm.reference || null,
        latitude: locationForm.latitude,
        longitude: locationForm.longitude,
      },
    });
    message.value = 'Ubicación actualizada';
  } catch (error: unknown) {
    const axiosError = error as { response?: { data?: { message?: string } } };
    errorMessage.value = axiosError?.response?.data?.message || 'No se pudo actualizar la ubicación';
  } finally {
    savingLocation.value = false;
  }
}

onMounted(async () => {
  await withPageReady(async () => {
    await geoStore.loadCountries();
    if (geoStore.countries.length) {
      contactForm.idCountry = geoStore.countries[0].id;
    }
    const acopio = await acopiosStore.fetchAcopio(idAcopio.value);
    if (!acopio.canManage) {
      await router.replace(`/acopios/${idAcopio.value}`);
      return;
    }
    fillInfoForm();
    await fillLocationForm();
  });
});

watch(
  () => locationForm.idCountry,
  async (idCountry) => {
    if (skipLocationCascade.value || !idCountry) {
      return;
    }
    locationForm.idDepartment = 0;
    locationForm.idCity = 0;
    locationMap = null;
    locationMarker = null;
    await geoStore.loadDepartments(idCountry);
  }
);

watch(
  () => locationForm.idDepartment,
  async (idDepartment) => {
    if (skipLocationCascade.value || !idDepartment) {
      return;
    }
    locationForm.idCity = 0;
    locationMap = null;
    locationMarker = null;
    await geoStore.loadCities(idDepartment);
  }
);

watch(
  () => infoForm.openingMode,
  (openingMode) => {
    if (openingMode === 'scheduled' && !infoForm.startsAt) {
      infoForm.startsAt = toDateInputValue(new Date().toISOString());
    }
  }
);

watch(avatarBlob, async (blob) => {
  if (!blob) return;
  errorMessage.value = '';
  try {
    await acopiosStore.updateAvatar(idAcopio.value, blob);
    avatarBlob.value = null;
    message.value = 'Foto actualizada';
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || 'No se pudo actualizar la foto';
  }
});

async function toggleStatus() {
  if (!acopiosStore.currentAcopio) return;
  const nextStatus = acopiosStore.currentAcopio.status === 'open' ? 'closed' : 'open';
  try {
    await acopiosStore.updateStatus(idAcopio.value, nextStatus);
    message.value = `Acopio marcado como ${nextStatus === 'open' ? 'abierto' : 'cerrado'}`;
  } catch (error: unknown) {
    const axiosError = error as { response?: { data?: { message?: string } } };
    errorMessage.value =
      axiosError?.response?.data?.message || 'No se pudo actualizar el estado';
  }
}

async function submitImages() {
  if (!pendingGalleryFiles.value.length) return;
  errorMessage.value = '';
  try {
    await acopiosStore.addImages(idAcopio.value, pendingGalleryFiles.value);
    pendingGalleryFiles.value = [];
    message.value = 'Imágenes agregadas';
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || 'No se pudieron subir las imágenes';
  }
}

async function removeImage(idImage: number) {
  errorMessage.value = '';
  try {
    await acopiosStore.deleteImage(idAcopio.value, idImage);
    message.value = 'Imagen eliminada';
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || 'No se pudo eliminar la imagen';
  }
}

async function submitNeed() {
  errorMessage.value = '';
  if (needForm.needType === 'money' && moneyNeedsCount.value >= MAX_MONEY_NEEDS) {
    errorMessage.value = `Solo se permiten ${MAX_MONEY_NEEDS} registros de dinero por acopio`;
    return;
  }
  try {
    await acopiosStore.createNeed(
      idAcopio.value,
      {
        needType: needForm.needType,
        categoryKey: needForm.needType === 'product' ? needForm.categoryKey || defaultProductCategoryKey : null,
        iconKey: needForm.needType === 'money' ? 'bank' : needForm.iconKey,
        name: needForm.name,
        description: needForm.description || null,
        hasLimit: needForm.hasLimit,
        targetQuantity: needForm.hasLimit ? needForm.targetQuantity : null,
        bankName: needForm.needType === 'money' ? needForm.bankName : null,
        accountNumber: needForm.needType === 'money' ? needForm.accountNumber : null,
        accountHolder: needForm.needType === 'money' ? needForm.accountHolder || null : null,
        documentType: needForm.needType === 'money' ? needForm.documentType || null : null,
        documentNumber: needForm.needType === 'money' ? needForm.documentNumber || null : null,
      },
      needForm.qrFile
    );
    await acopiosStore.fetchAcopio(idAcopio.value);
    Object.assign(needForm, createEmptyNeedForm());
    message.value = 'Necesidad agregada';
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || 'No se pudo agregar la necesidad';
  }
}

function onNeedTypeChange(nextType: NeedType) {
  if (nextType === 'money' && needForm.needType !== 'money' && moneyNeedsCount.value >= MAX_MONEY_NEEDS) {
    errorMessage.value = `Solo se permiten ${MAX_MONEY_NEEDS} registros de dinero por acopio`;
    return;
  }
  needForm.needType = nextType;
  if (nextType === 'money') {
    needForm.iconKey = 'bank';
    needForm.categoryKey = '';
  } else if (nextType === 'talent') {
    needForm.categoryKey = '';
    if (needForm.iconKey === 'bank') {
      needForm.iconKey = defaultTalentIconKey;
    }
    needForm.bankName = '';
    needForm.accountNumber = '';
    needForm.accountHolder = '';
    needForm.documentType = '';
    needForm.documentNumber = '';
    needForm.qrFile = null;
  } else {
    if (needForm.iconKey === 'bank') {
      needForm.iconKey = defaultProductIconKey;
    }
    needForm.bankName = '';
    needForm.accountNumber = '';
    needForm.accountHolder = '';
    needForm.documentType = '';
    needForm.documentNumber = '';
    needForm.qrFile = null;
  }
}

function onNeedQuantityInput(event: Event) {
  const inputElement = event.target as HTMLInputElement;
  const parsedQuantity = parseThousandsInput(inputElement.value);
  needForm.targetQuantity = parsedQuantity;
  inputElement.value = formatThousands(parsedQuantity);
}

async function submitOffer() {
  errorMessage.value = '';
  try {
    await acopiosStore.createOffer(idAcopio.value, { ...offerForm });
    await acopiosStore.fetchAcopio(idAcopio.value);
    offerForm.name = '';
    offerForm.description = '';
    offerForm.iconKey = defaultProductIconKey;
    message.value = 'Ayuda publicada';
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || 'No se pudo publicar la ayuda';
  }
}

async function submitContact() {
  errorMessage.value = '';
  try {
    await acopiosStore.createContact(idAcopio.value, {
      type: contactForm.type,
      value: contactForm.value,
      idCountry: contactForm.type === 'whatsapp' ? contactForm.idCountry : null,
      localPrefix: contactForm.type === 'landline' ? contactForm.localPrefix : null,
      extension: contactForm.type === 'landline' ? contactForm.extension || null : null,
      label: contactForm.label || null,
    });
    await acopiosStore.fetchAcopio(idAcopio.value);
    contactForm.value = '';
    contactForm.localPrefix = '';
    contactForm.extension = '';
    contactForm.label = '';
    message.value = 'Contacto agregado';
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || 'No se pudo agregar el contacto';
  }
}

async function removeNeed(idNeed: number) {
  errorMessage.value = '';
  try {
    await acopiosStore.deleteNeed(idAcopio.value, idNeed);
    message.value = 'Necesidad eliminada';
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || 'No se pudo eliminar la necesidad';
  }
}

async function removeOffer(idOffer: number) {
  errorMessage.value = '';
  try {
    await acopiosStore.deleteOffer(idAcopio.value, idOffer);
    message.value = 'Ayuda eliminada';
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || 'No se pudo eliminar la ayuda';
  }
}

async function removeContact(idContact: number) {
  errorMessage.value = '';
  try {
    await acopiosStore.deleteContact(idAcopio.value, idContact);
    message.value = 'Contacto eliminado';
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || 'No se pudo eliminar el contacto';
  }
}
</script>

<template>
  <section v-if="acopiosStore.currentAcopio" class="min-w-0 space-y-8">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-3xl font-semibold">Gestionar {{ acopiosStore.currentAcopio.name }}</h1>
        <p class="text-sm text-black/60">
          Estado actual: {{ acopiosStore.currentAcopio.status === 'open' ? 'Abierto' : 'Cerrado' }}
          <span v-if="acopiosStore.currentAcopio.openingMode === 'scheduled'">
            · Se cierra automáticamente el
            {{ formatDisplayDate(acopiosStore.currentAcopio.endsAt) || 'día de cierre' }}
          </span>
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <RouterLink :to="`/acopios/${idAcopio}`" class="nav-btn">
          Ver
        </RouterLink>
        <button v-if="acopiosStore.currentAcopio.openingMode !== 'scheduled'" type="button"
          class="inline-flex h-9 min-w-[8.5rem] items-center justify-center rounded-md bg-[#c45c26] px-3 text-sm text-white hover:bg-[#a34b1f]"
          @click="toggleStatus">
          {{ acopiosStore.currentAcopio.status === 'open' ? 'Cerrar acopio' : 'Abrir acopio' }}
        </button>
      </div>
    </div>

    <p v-if="message" class="rounded-md bg-[#1f6f5b]/10 px-3 py-2 text-sm text-[#1f6f5b]">{{ message }}</p>
    <p v-if="errorMessage" class="rounded-md bg-[#c45c26]/10 px-3 py-2 text-sm text-[#c45c26]">{{ errorMessage }}</p>

    <div class="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div class="flex min-w-0 flex-1 flex-col gap-6">
        <form class="min-w-0 max-w-full overflow-x-clip rounded-xl border border-black/10 bg-white/75 p-4 space-y-3" @submit.prevent="submitInfo">
          <h2 class="text-lg font-semibold">Información del acopio</h2>
          <label class="block text-sm">
            Nombre
            <input v-model="infoForm.name" required class="mt-1 w-full rounded-md border border-black/15 px-3 py-2" />
          </label>
          <label class="block text-sm">
            Descripción (opcional)
            <textarea v-model="infoForm.description" rows="3"
              class="mt-1 w-full rounded-md border border-black/15 px-3 py-2" />
          </label>
          <label class="block text-sm">
            Responsable
            <input v-model="infoForm.responsibleName" required
              class="mt-1 w-full rounded-md border border-black/15 px-3 py-2" />
          </label>
          <label class="block text-sm">
            Acopio habilitado
            <SearchableSelect v-model="infoForm.openingMode" :options="openingModeOptions" required />
          </label>
          <div v-if="infoForm.openingMode === 'scheduled'" class="grid gap-3 md:grid-cols-2">
            <label class="text-sm">
              Inicio
              <input v-model="infoForm.startsAt" type="date" required
                class="mt-1 w-full rounded-md border border-black/15 px-3 py-2" />
            </label>
            <label class="text-sm">
              Fecha de cierre
              <input v-model="infoForm.endsAt" type="date" :min="infoForm.startsAt || undefined" required
                class="mt-1 w-full rounded-md border border-black/15 px-3 py-2" />
            </label>
            <p class="text-sm text-black/60 md:col-span-2">
              Al llegar a la fecha de cierre el acopio se cierra automáticamente.
            </p>
          </div>
          <button type="submit" class="nav-btn nav-btn-primary" :disabled="savingInfo">
            Guardar información
          </button>
        </form>

        <section class="min-w-0 max-w-full overflow-x-clip rounded-xl border border-black/10 bg-white/75 p-4 space-y-3">
          <img v-if="acopiosStore.currentAcopio.avatarUrl" :src="resolveMediaUrl(acopiosStore.currentAcopio.avatarUrl)"
            alt="Foto actual" class="h-16 w-16 rounded-full object-cover" />
          <AvatarCropper v-model="avatarBlob" :preview-name="acopiosStore.currentAcopio.name" />
        </section>

        <form class="min-w-0 max-w-full overflow-x-clip rounded-xl border border-black/10 bg-white/75 p-4 space-y-3" @submit.prevent="submitNeed">
          <h2 class="text-lg font-semibold">Necesitamos (recaudo)</h2>
          <p class="text-sm text-black/60">
            Agrégalos manualmente o con Excel.
          </p>
          <ExcelImportPanel template-type="needs" :id-acopio="idAcopio"
            @imported="message = `Se importaron ${$event} registro(s)`" @error="errorMessage = ''"
            @success="errorMessage = ''" />
          <template v-if="productNeedGroups.length">
            <h3 class="text-sm font-semibold text-[#1f6f5b]">Productos</h3>
            <div v-for="subgroup in productNeedGroups" :key="subgroup.key">
              <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-black/45">
                {{ subgroup.title }}
              </p>
              <ManageListSection :items="subgroup.items" :title="subgroup.title"
                empty-message="Aún no hay productos en esta categoría.">
                <template #item="{ item: need }">
                  <div
                    class="inline-flex max-w-full items-center gap-2 rounded-md border border-black/10 bg-white px-2.5 py-2">
                    <div class="flex min-w-0 items-center gap-2">
                      <NeedIcon :icon-key="need.iconKey" :size="24" />
                      <div class="min-w-0">
                        <p class="font-medium">{{ need.name }}</p>
                        <p v-if="need.hasLimit" class="text-sm text-black/60">
                          {{ formatThousands(need.targetQuantity) }}
                        </p>
                      </div>
                    </div>
                    <button type="button"
                      class="shrink-0 rounded-md border border-[#c45c26] px-2 py-1 text-xs text-[#c45c26]"
                      @click="removeNeed(need.id)">
                      Eliminar
                    </button>
                  </div>
                </template>
              </ManageListSection>
            </div>
          </template>
          <template v-else>
            <h3 class="text-sm font-semibold text-[#1f6f5b]">Productos</h3>
            <ManageListSection :items="currentProductNeeds" title="Productos"
              empty-message="Aún no hay productos. Agrégalos manualmente o con Excel." />
          </template>

          <h3 class="text-sm font-semibold text-[#1f6f5b]">Talento</h3>
          <ManageListSection :items="currentTalentNeeds" title="Talento"
            empty-message="Aún no hay talentos. Agrégalos manualmente o con Excel.">
            <template #item="{ item: need }">
              <div
                class="inline-flex max-w-full items-center gap-2 rounded-md border border-black/10 bg-white px-2.5 py-2">
                <div class="flex min-w-0 items-center gap-2">
                  <NeedIcon :icon-key="need.iconKey" :size="24" />
                  <div class="min-w-0">
                    <p class="font-medium">{{ need.name }}</p>
                    <p class="text-sm text-black/60">
                      {{ getNeedTypeLabel(need.needType) }}
                      <template v-if="need.hasLimit">
                        · {{ formatThousands(need.targetQuantity) }}
                      </template>
                    </p>
                  </div>
                </div>
                <button type="button"
                  class="shrink-0 rounded-md border border-[#c45c26] px-2 py-1 text-xs text-[#c45c26]"
                  @click="removeNeed(need.id)">
                  Eliminar
                </button>
              </div>
            </template>
          </ManageListSection>

          <h3 class="text-sm font-semibold text-[#1f6f5b]">Donaciones</h3>
          <p class="text-sm text-black/60">
            Las donaciones se agregan manualmente (máx. {{ MAX_MONEY_NEEDS }}).
          </p>
          <ManageListSection :items="currentMoneyNeeds" title="Donaciones" empty-message="Aún no hay donaciones.">
            <template #item="{ item: need }">
              <div
                class="inline-flex max-w-full items-center gap-2 rounded-md border border-black/10 bg-white px-2.5 py-2">
                <div class="flex min-w-0 items-center gap-2">
                  <NeedIcon :icon-key="need.iconKey" :size="24" />
                  <div class="min-w-0">
                    <p class="font-medium">{{ need.name }}</p>
                    <p class="text-sm text-black/60">
                      Donación
                      <template v-if="need.hasLimit">
                        · {{ formatThousands(need.targetQuantity) }}
                      </template>
                    </p>
                  </div>
                </div>
                <button type="button"
                  class="shrink-0 rounded-md border border-[#c45c26] px-2 py-1 text-xs text-[#c45c26]"
                  @click="removeNeed(need.id)">
                  Eliminar
                </button>
              </div>
            </template>
          </ManageListSection>
          <h3 class="text-sm font-medium text-black/70">Agregar necesidad</h3>
          <SearchableSelect :model-value="needForm.needType" :options="needTypeSelectOptions" required
            @update:model-value="(nextType) => onNeedTypeChange(nextType as NeedType)" />
          <label v-if="needForm.needType === 'product'" class="text-sm">
            Categoría (opcional)
            <SearchableSelect v-model="needForm.categoryKey" :options="productCategoryOptions"
              placeholder="Selecciona" />
          </label>
          <label class="text-sm">
            {{ getNeedNameLabel(needForm.needType) }}
            <input v-model="needForm.name" required class="mt-1 w-full rounded-md border border-black/15 px-3 py-2" />
          </label>
          <NeedIconPicker v-model="needForm.iconKey" :need-type="needForm.needType" />
          <label class="text-sm">
            Descripción (opcional)
            <textarea v-model="needForm.description" rows="2"
              class="mt-1 w-full rounded-md border border-black/15 px-3 py-2" />
          </label>
          <label class="flex items-center gap-2 text-sm">
            <input v-model="needForm.hasLimit" type="checkbox" />
            Tiene límite
          </label>
          <label v-if="needForm.hasLimit" class="block text-sm">
            Cantidad
            <input :value="formatThousands(needForm.targetQuantity)" type="text" inputmode="numeric" required
              class="mt-1 w-full rounded-md border border-black/15 px-3 py-2" @input="onNeedQuantityInput" />
          </label>
          <template v-if="needForm.needType === 'money'">
            <input v-model="needForm.bankName" required placeholder="Nombre del banco"
              class="w-full rounded-md border border-black/15 px-3 py-2" />
            <input v-model="needForm.accountNumber" required placeholder="Número de cuenta"
              class="w-full rounded-md border border-black/15 px-3 py-2" />
            <label class="text-sm">
              Propietario (opcional)
              <input v-model="needForm.accountHolder" class="mt-1 w-full rounded-md border border-black/15 px-3 py-2" />
            </label>
            <label class="text-sm">
              Tipo de documento (opcional)
              <SearchableSelect v-model="needForm.documentType" :options="documentTypeOptions"
                placeholder="Selecciona" />
            </label>
            <label class="text-sm">
              Número de documento (opcional)
              <input v-model="needForm.documentNumber"
                class="mt-1 w-full rounded-md border border-black/15 px-3 py-2" />
            </label>
            <QrCropper v-model="needForm.qrFile" />
          </template>
          <button type="submit" class="rounded-md bg-[#1f6f5b] px-3 py-2 text-white">Guardar necesidad</button>
        </form>

        <form class="min-w-0 max-w-full overflow-x-clip rounded-xl border border-black/10 bg-white/75 p-4 space-y-3" @submit.prevent="submitContact">
          <h2 class="text-lg font-semibold">Contactos</h2>
          <ManageListSection :items="currentContacts" title="Contactos" empty-message="Aún no hay contactos.">
            <template #item="{ item: contact }">
              <div
                class="inline-flex max-w-full items-center gap-2 rounded-md border border-black/10 bg-white px-2.5 py-2">
                <div class="min-w-0">
                  <p class="font-medium">
                    {{
                      contact.type === 'whatsapp'
                        ? 'WhatsApp'
                        : contact.type === 'landline'
                          ? 'Teléfono fijo'
                          : 'Email'
                    }}
                    <span v-if="contact.label" class="font-normal text-black/50"> · {{ contact.label }}</span>
                  </p>
                  <p class="text-sm text-black/60">
                    <template v-if="contact.type === 'whatsapp'">
                      {{ contact.phoneCode }} {{ contact.value }}
                    </template>
                    <template v-else-if="contact.type === 'landline'">
                      ({{ contact.localPrefix }}) {{ contact.value }}
                      <span v-if="contact.extension"> ext. {{ contact.extension }}</span>
                    </template>
                    <template v-else>{{ contact.value }}</template>
                  </p>
                </div>
                <button type="button"
                  class="shrink-0 rounded-md border border-[#c45c26] px-2 py-1 text-xs text-[#c45c26]"
                  @click="removeContact(contact.id)">
                  Eliminar
                </button>
              </div>
            </template>
          </ManageListSection>
          <h3 class="text-sm font-medium text-black/70">Agregar contacto</h3>
          <SearchableSelect v-model="contactForm.type" :options="contactTypeOptions" required />
          <SearchableSelect v-if="contactForm.type === 'whatsapp'" v-model="contactForm.idCountry"
            :options="countryPhoneOptions" placeholder="Código de país" required />
          <input v-if="contactForm.type === 'landline'" v-model="contactForm.localPrefix" required type="tel"
            inputmode="numeric" placeholder="Prefijo local EJ: 604"
            class="w-full rounded-md border border-black/15 px-3 py-2" />
          <input v-model="contactForm.value" required :type="contactForm.type === 'email' ? 'email' : 'tel'"
            :placeholder="contactForm.type === 'email'
                ? 'Email'
                : contactForm.type === 'landline'
                  ? 'Número de teléfono'
                  : 'Teléfono'
              " class="w-full rounded-md border border-black/15 px-3 py-2" />
          <input v-if="contactForm.type === 'landline'" v-model="contactForm.extension" type="tel" inputmode="numeric"
            placeholder="Extensión (opcional)" class="w-full rounded-md border border-black/15 px-3 py-2" />
          <input v-model="contactForm.label" placeholder="Nombre contacto (opcional)"
            class="w-full rounded-md border border-black/15 px-3 py-2" />
          <button type="submit" class="rounded-md bg-[#1f6f5b] px-3 py-2 text-white">Guardar contacto</button>
        </form>
      </div>

      <div class="flex min-w-0 flex-1 flex-col gap-6">
        <form class="min-w-0 max-w-full overflow-x-clip rounded-xl border border-black/10 bg-white/75 p-4 space-y-3" @submit.prevent="submitLocation">
          <h2 class="text-lg font-semibold">Ubicación</h2>
          <div class="grid gap-3 md:grid-cols-3">
            <label class="text-sm">
              País
              <SearchableSelect v-model="locationForm.idCountry" :options="countryOptions" required />
            </label>
            <label class="text-sm">
              Departamento
              <SearchableSelect v-model="locationForm.idDepartment" :options="departmentOptions"
                placeholder="Selecciona" required />
            </label>
            <label class="text-sm">
              Ciudad
              <SearchableSelect v-model="locationForm.idCity" :options="cityOptions" placeholder="Selecciona"
                required />
            </label>
          </div>
          <label class="block text-sm">
            Dirección
            <input v-model="locationForm.street" required
              class="mt-1 w-full rounded-md border border-black/15 px-3 py-2" @blur="onAddressBlur" />
          </label>
          <div class="grid gap-3 md:grid-cols-2">
            <label class="text-sm">
              Barrio (opcional)
              <input v-model="locationForm.neighborhood"
                class="mt-1 w-full rounded-md border border-black/15 px-3 py-2" />
            </label>
            <label class="text-sm">
              Complemento (opcional)
              <input v-model="locationForm.reference" class="mt-1 w-full rounded-md border border-black/15 px-3 py-2" />
            </label>
          </div>
          <p v-if="!mapsApiKey" class="text-xs text-[#c45c26]">
            Configura `VITE_GOOGLE_MAPS_API_KEY` para ubicar el acopio en el mapa.
          </p>
          <template v-else-if="canShowLocationMap">
            <p class="text-xs text-black/55">
              Mueve el pin o toca el mapa para ajustar la ubicación. La dirección se
              actualizará con la que indique Google Maps.
            </p>
            <p v-if="isGeocoding" class="text-xs text-black/50">Buscando dirección…</p>
            <div ref="mapElement"
              class="h-[240px] w-full overflow-hidden rounded-xl border border-black/10 bg-[#d9e8ef]" />
            <p v-if="mapError" class="text-xs text-[#c45c26]">{{ mapError }}</p>
            <p v-else class="text-xs text-black/45">
              Coordenadas: {{ locationForm.latitude.toFixed(6) }}, {{ locationForm.longitude.toFixed(6) }}
            </p>
          </template>
          <p v-else-if="mapError" class="text-xs text-[#c45c26]">{{ mapError }}</p>
          <p v-else class="text-xs text-black/45">
            Escribe la dirección y sal del campo para buscarla en el mapa.
          </p>
          <button type="submit" class="nav-btn nav-btn-primary" :disabled="savingLocation">
            Guardar ubicación
          </button>
        </form>

        <section class="min-w-0 max-w-full overflow-x-clip rounded-xl border border-black/10 bg-white/75 p-4 space-y-3">
          <div>
            <h2 class="text-lg font-semibold">Imágenes ({{ currentImages.length }}/{{ MAX_ACOPIO_GALLERY_IMAGES }},
              opcional)
            </h2>
            <p class="mt-1 text-sm text-black/60">
              Formato vertical de celular (9:16). Resolución recomendada: 1080 × 1920 px,
              para que se vean bien en el carrusel y la galería.
            </p>
          </div>
          <div v-if="currentImages.length" class="grid grid-cols-3 gap-2">
            <div v-for="image in currentImages" :key="image.id" class="relative">
              <img :src="resolveMediaUrl(image.imageUrl)" :alt="`Imagen ${image.sortOrder}`"
                class="aspect-[9/16] w-full rounded-md object-cover" />
              <button type="button" class="absolute right-1 top-1 rounded bg-black/70 px-2 py-0.5 text-xs text-white"
                @click="removeImage(image.id)">
                X
              </button>
            </div>
          </div>
          <hr class="border-black/10" />
          <ImageDropzone v-if="remainingImageSlots > 0" v-model="pendingGalleryFiles"
            :max-files="remainingImageSlots" />
          <p v-else class="text-sm text-black/50">Ya alcanzaste el máximo de {{ MAX_ACOPIO_GALLERY_IMAGES }} imágenes.
          </p>
          <button v-if="pendingGalleryFiles.length" type="button" class="rounded-md bg-[#1f6f5b] px-3 py-2 text-white"
            @click="submitImages">
            Subir {{ pendingGalleryFiles.length }} imagen(es)
          </button>
        </section>

        <form class="min-w-0 max-w-full overflow-x-clip rounded-xl border border-black/10 bg-white/75 p-4 space-y-3" @submit.prevent="submitOffer">
          <h2 class="text-lg font-semibold">Estamos dando (opcional)</h2>
          <p class="text-sm text-black/60">
            Agrégalos manualmente o con Excel.
          </p>
          <ExcelImportPanel template-type="offers" :id-acopio="idAcopio"
            @imported="message = `Se importaron ${$event} ayuda(s)`" @error="errorMessage = ''"
            @success="errorMessage = ''" />
          <template v-if="offerGroups.length">
            <div v-for="group in offerGroups" :key="group.key">
              <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-black/45">
                {{ group.title }}
              </p>
              <ManageListSection :items="group.items" :title="group.title"
                empty-message="Aún no hay ayudas en esta categoría.">
                <template #item="{ item: offer }">
                  <div
                    class="inline-flex max-w-full items-center gap-2 rounded-md border border-black/10 bg-white px-2.5 py-2">
                    <div class="flex min-w-0 items-center gap-2">
                      <NeedIcon :icon-key="offer.iconKey" :size="24" />
                      <div class="min-w-0">
                        <p class="font-medium">{{ offer.name }}</p>
                      </div>
                    </div>
                    <button type="button"
                      class="shrink-0 rounded-md border border-[#c45c26] px-2 py-1 text-xs text-[#c45c26]"
                      @click="removeOffer(offer.id)">
                      Eliminar
                    </button>
                  </div>
                </template>
              </ManageListSection>
            </div>
          </template>
          <ManageListSection v-else :items="currentOffers" title="Estamos dando"
            empty-message="Aún no hay ayudas. Agrégalos manualmente o con Excel." />
          <h3 class="text-sm font-medium text-black/70">Agregar ayuda</h3>
          <SearchableSelect v-model="offerForm.category" :options="offerCategoryOptions" required />
          <input v-model="offerForm.name" required placeholder="Nombre"
            class="w-full rounded-md border border-black/15 px-3 py-2" />
          <NeedIconPicker v-model="offerForm.iconKey" />
          <textarea v-model="offerForm.description" rows="3" placeholder="Descripción (opcional)"
            class="w-full rounded-md border border-black/15 px-3 py-2" />
          <button type="submit" class="rounded-md bg-[#1f6f5b] px-3 py-2 text-white">Publicar ayuda</button>
        </form>
      </div>
    </div>
  </section>
</template>
