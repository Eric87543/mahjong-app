import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const TOKEN_KEY = 'gapi_access_token'
const EMAIL_KEY = 'gapi_user_email'

export const useAuthStore = defineStore('auth', () => {
  // 改用 localStorage：關閉瀏覽器後回來仍保留登入狀態
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY))
  const userEmail = ref<string | null>(localStorage.getItem(EMAIL_KEY))

  const isLoggedIn = computed(() => !!token.value)

  const isAdmin = computed(() => {
    if (!userEmail.value) return false
    const adminList = (import.meta.env.VITE_ADMIN_EMAILS as string | undefined) ?? ''
    return adminList
      .split(',')
      .map(e => e.trim().toLowerCase())
      .includes(userEmail.value!.toLowerCase())
  })

  // 編輯權限完全依賴 Google Sheet 本身的共用設定
  // 所有登入者都顯示記錄 UI，寫入失敗（403）時才顯示錯誤
  const isEditor = computed(() => isLoggedIn.value)

  function setToken(newToken: string) {
    token.value = newToken
    localStorage.setItem(TOKEN_KEY, newToken)
  }

  function setUserEmail(email: string) {
    userEmail.value = email
    localStorage.setItem(EMAIL_KEY, email)
  }

  function clearToken() {
    token.value = null
    userEmail.value = null
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(EMAIL_KEY)
  }

  return { token, userEmail, isLoggedIn, isAdmin, isEditor, setToken, setUserEmail, clearToken }
})
