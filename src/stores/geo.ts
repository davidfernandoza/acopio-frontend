import { defineStore } from 'pinia';
import { ref } from 'vue';
import apiClient from '../api/client';
import type { City, Country, Department } from '../types';

export const useGeoStore = defineStore('geo', () => {
  const countries = ref<Country[]>([]);
  const departments = ref<Department[]>([]);
  const cities = ref<City[]>([]);

  async function loadCountries() {
    const response = await apiClient.get<Country[]>('/countries');
    countries.value = response.data;
  }

  async function loadDepartments(idCountry: number) {
    const response = await apiClient.get<Department[]>(`/countries/${idCountry}/departments`);
    departments.value = response.data;
    cities.value = [];
  }

  async function loadCities(idDepartment: number) {
    const response = await apiClient.get<City[]>(`/departments/${idDepartment}/cities`);
    cities.value = response.data;
  }

  async function getCity(idCity: number) {
    const response = await apiClient.get<City>(`/cities/${idCity}`);
    return response.data;
  }

  return {
    countries,
    departments,
    cities,
    loadCountries,
    loadDepartments,
    loadCities,
    getCity,
  };
});
