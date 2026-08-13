import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import apiClient from '../api/client';
import type { AuthUser } from '../types';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (element: HTMLElement, config: Record<string, unknown>) => void;
        };
      };
    };
  }
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('acopio_token'));
  const user = ref<AuthUser | null>(null);
  const loading = ref(false);
  const errorMessage = ref('');

  const isAuthenticated = computed(() => Boolean(token.value));

  function persistSession(nextToken: string, nextUser: AuthUser) {
    token.value = nextToken;
    user.value = nextUser;
    localStorage.setItem('acopio_token', nextToken);
  }

  function logout() {
    token.value = null;
    user.value = null;
    localStorage.removeItem('acopio_token');
  }

  async function fetchMe() {
    if (!token.value) {
      return;
    }
    const response = await apiClient.get<AuthUser>('/auth/me');
    user.value = response.data;
  }

  async function loginWithPassword(email: string, password: string) {
    loading.value = true;
    errorMessage.value = '';
    try {
      const response = await apiClient.post<{ token: string; user: AuthUser }>('/auth/login', {
        email,
        password,
      });
      persistSession(response.data.token, response.data.user);
    } catch (error: any) {
      errorMessage.value = error?.response?.data?.message || 'No se pudo iniciar sesión';
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function loginWithGoogle(idToken: string) {
    loading.value = true;
    errorMessage.value = '';
    try {
      const response = await apiClient.post<{ token: string; user: AuthUser }>('/auth/google', {
        idToken,
      });
      persistSession(response.data.token, response.data.user);
    } catch (error: any) {
      errorMessage.value = error?.response?.data?.message || 'No se pudo iniciar con Google';
      throw error;
    } finally {
      loading.value = false;
    }
  }

  function updateSession(nextToken: string, nextUser: AuthUser) {
    persistSession(nextToken, nextUser);
  }

  async function markWelcomeSeen() {
    const response = await apiClient.post<AuthUser>('/auth/welcome-seen', {});
    user.value = response.data;
  }

  return {
    token,
    user,
    loading,
    errorMessage,
    isAuthenticated,
    fetchMe,
    loginWithPassword,
    loginWithGoogle,
    updateSession,
    markWelcomeSeen,
    logout,
  };
});
