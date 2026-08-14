import { defineStore } from 'pinia';
import { ref } from 'vue';
import apiClient from '../api/client';
import type {
  Acopio,
  AcopioContact,
  AcopioNeed,
  AcopioOffer,
  CarouselResponse,
  MapData,
} from '../types';

export const useAcopiosStore = defineStore('acopios', () => {
  const acopios = ref<Acopio[]>([]);
  const currentAcopio = ref<Acopio | null>(null);
  const carousel = ref<CarouselResponse | null>(null);
  const loading = ref(false);

  async function fetchAcopios() {
    loading.value = true;
    try {
      const response = await apiClient.get<Acopio[]>('/acopios');
      acopios.value = response.data;
    } finally {
      loading.value = false;
    }
  }

  async function fetchAcopio(idAcopio: number) {
    loading.value = true;
    try {
      const response = await apiClient.get<Acopio>(`/acopios/${idAcopio}`);
      currentAcopio.value = response.data;
      return response.data;
    } finally {
      loading.value = false;
    }
  }

  async function fetchCarousel() {
    const response = await apiClient.get<CarouselResponse>('/acopios/carousel');
    carousel.value = response.data;
    return response.data;
  }

  async function createAcopio(formData: FormData) {
    const response = await apiClient.post<Acopio>('/acopios', formData);
    return response.data;
  }

  async function updateAcopio(idAcopio: number, payload: Record<string, unknown>) {
    const response = await apiClient.put<Acopio>(`/acopios/${idAcopio}`, payload);
    currentAcopio.value = response.data;
    return response.data;
  }

  async function updateStatus(idAcopio: number, status: 'open' | 'closed') {
    const response = await apiClient.patch<Acopio>(`/acopios/${idAcopio}/status`, { status });
    currentAcopio.value = response.data;
    return response.data;
  }

  async function updateAvatar(idAcopio: number, avatarBlob: Blob) {
    const formData = new FormData();
    formData.append('avatar', avatarBlob, 'avatar.jpg');
    const response = await apiClient.put<Acopio>(`/acopios/${idAcopio}/avatar`, formData);
    currentAcopio.value = response.data;
    return response.data;
  }

  async function addImages(idAcopio: number, imageFiles: File[]) {
    const formData = new FormData();
    for (const imageFile of imageFiles) {
      formData.append('images', imageFile);
    }
    const response = await apiClient.post<Acopio>(`/acopios/${idAcopio}/images`, formData);
    currentAcopio.value = response.data;
    return response.data;
  }

  async function deleteImage(idAcopio: number, idImage: number) {
    const response = await apiClient.delete<Acopio>(`/acopios/${idAcopio}/images/${idImage}`);
    currentAcopio.value = response.data;
    return response.data;
  }

  async function fetchMap(idAcopio: number) {
    const response = await apiClient.get<MapData>(`/acopios/${idAcopio}/map`);
    return response.data;
  }

  async function createNeed(
    idAcopio: number,
    payload: Record<string, unknown>,
    qrFile?: File | null
  ) {
    const formData = new FormData();
    for (const [fieldName, fieldValue] of Object.entries(payload)) {
      if (fieldValue === null || fieldValue === undefined || fieldValue === '') {
        continue;
      }
      formData.append(fieldName, String(fieldValue));
    }
    if (qrFile) {
      formData.append('qr', qrFile);
    }
    const response = await apiClient.post<AcopioNeed>(`/acopios/${idAcopio}/needs`, formData);
    return response.data;
  }

  async function createOffer(idAcopio: number, payload: Record<string, unknown>) {
    const response = await apiClient.post<AcopioOffer>(`/acopios/${idAcopio}/offers`, payload);
    return response.data;
  }

  async function downloadExcelTemplate(templateType: 'needs' | 'offers') {
    const response = await apiClient.get(`/acopios/excel-templates/${templateType}`, {
      responseType: 'blob',
    });
    const fileName =
      templateType === 'needs'
        ? 'plantilla-necesitamos.xlsx'
        : 'plantilla-estamos-dando.xlsx';
    const blobUrl = URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(blobUrl);
  }

  async function parseExcelTemplate(templateType: 'needs' | 'offers', excelFile: File) {
    const formData = new FormData();
    formData.append('file', excelFile);
    const response = await apiClient.post<{ items: unknown[] }>(
      `/acopios/excel-templates/${templateType}/parse`,
      formData
    );
    return response.data.items;
  }

  async function importNeedsExcel(idAcopio: number, excelFile: File) {
    const formData = new FormData();
    formData.append('file', excelFile);
    const response = await apiClient.post<{ importedCount: number }>(
      `/acopios/${idAcopio}/needs/import`,
      formData
    );
    await fetchAcopio(idAcopio);
    return response.data;
  }

  async function importOffersExcel(idAcopio: number, excelFile: File) {
    const formData = new FormData();
    formData.append('file', excelFile);
    const response = await apiClient.post<{ importedCount: number }>(
      `/acopios/${idAcopio}/offers/import`,
      formData
    );
    await fetchAcopio(idAcopio);
    return response.data;
  }

  async function createContact(idAcopio: number, payload: Record<string, unknown>) {
    const response = await apiClient.post<AcopioContact>(
      `/acopios/${idAcopio}/contacts`,
      payload
    );
    return response.data;
  }

  async function deleteNeed(idAcopio: number, idNeed: number) {
    await apiClient.delete(`/acopios/${idAcopio}/needs/${idNeed}`);
    return fetchAcopio(idAcopio);
  }

  async function deleteOffer(idAcopio: number, idOffer: number) {
    await apiClient.delete(`/acopios/${idAcopio}/offers/${idOffer}`);
    return fetchAcopio(idAcopio);
  }

  async function deleteContact(idAcopio: number, idContact: number) {
    await apiClient.delete(`/acopios/${idAcopio}/contacts/${idContact}`);
    return fetchAcopio(idAcopio);
  }

  async function inviteManager(idAcopio: number, payload: { email: string; name: string }) {
    const response = await apiClient.post(`/acopios/${idAcopio}/managers`, payload);
    return response.data;
  }

  async function resendManagerInvitation(idAcopio: number, idUser: number) {
    const response = await apiClient.post(
      `/acopios/${idAcopio}/managers/${idUser}/resend-invitation`
    );
    return response.data;
  }

  async function listManagers(idAcopio: number) {
    const response = await apiClient.get(`/acopios/${idAcopio}/managers`);
    return response.data;
  }

  return {
    acopios,
    currentAcopio,
    carousel,
    loading,
    fetchAcopios,
    fetchAcopio,
    fetchCarousel,
    createAcopio,
    updateAcopio,
    updateStatus,
    updateAvatar,
    addImages,
    deleteImage,
    fetchMap,
    createNeed,
    createOffer,
    createContact,
    deleteNeed,
    deleteOffer,
    deleteContact,
    inviteManager,
    resendManagerInvitation,
    listManagers,
    downloadExcelTemplate,
    parseExcelTemplate,
    importNeedsExcel,
    importOffersExcel,
  };
});
