import { useAuthStore } from '../stores/authStore'
import { useRouter } from 'vue-router'

declare global {
  interface Window {
    google: typeof google
  }
}

// Minimal type shim for Google Identity Services token client
interface TokenClient {
  requestAccessToken: (opts?: { prompt?: string }) => void
}

declare namespace google {
  namespace accounts {
    namespace oauth2 {
      function initTokenClient(config: {
        client_id: string
        scope: string
        callback: (response: { access_token?: string; error?: string }) => void
      }): TokenClient
    }
    namespace id {
      function initialize(config: {
        client_id: string
        callback: (response: { credential?: string }) => void
        auto_select?: boolean
      }): void
      function prompt(): void
    }
  }
}

// 從 JWT ID token（credential）中 decode email（不需任何 API 呼叫）
function decodeEmailFromIdToken(credential: string): string | null {
  try {
    const payload = credential.split('.')[1]
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as { email?: string }
    return json.email ?? null
  } catch {
    return null
  }
}

let tokenClient: TokenClient | null = null

export function useGoogleAuth() {
  const authStore = useAuthStore()
  const router = useRouter()

  function initIdClient(clientId: string): void {
    window.google.accounts.id.initialize({
      client_id: clientId,
      auto_select: true,
      callback(response) {
        if (response.credential) {
          const email = decodeEmailFromIdToken(response.credential)
          if (email) authStore.setUserEmail(email)
        }
      },
    })
    // 靜默嘗試取得 email（不彈出 UI）
    window.google.accounts.id.prompt()
  }

  function initClient(): TokenClient {
    if (tokenClient) return tokenClient
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string
    if (!clientId) throw new Error('VITE_GOOGLE_CLIENT_ID is not defined')

    // 用 ID token 流程靜默取得 email（不需額外 scope）
    initIdClient(clientId)

    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      callback(response) {
        if (response.access_token) {
          authStore.setToken(response.access_token)
          router.push({ name: 'home' })
        }
      },
    })
    return tokenClient
  }

  function login() {
    const client = initClient()
    // 登入頁永遠強制彈出授權視窗，避免舊的過期 token 造成靜默失敗沒反應
    client.requestAccessToken({ prompt: 'consent' })
  }

  function silentRefresh() {
    const client = initClient()
    // 已登入狀態下靜默刷新 token（不彈視窗）
    client.requestAccessToken({ prompt: '' })
  }

  function logout() {
    authStore.clearToken()
    tokenClient = null
  }

  return { login, logout, silentRefresh, isLoggedIn: authStore.isLoggedIn }
}
