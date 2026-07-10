import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const SESSION_KEY = 'gapi_access_token'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(sessionStorage.getItem(SESSION_KEY))

  const isLoggedIn = computed(() => !!token.value)

  function setToken(newToken: string) {
    token.value = newToken
    sessionStorage.setItem(SESSION_KEY, newToken)
  }

  function clearToken() {
    token.value = null
    sessionStorage.removeItem(SESSION_KEY)
  }

  return { token, isLoggedIn, setToken, clearToken }
})
