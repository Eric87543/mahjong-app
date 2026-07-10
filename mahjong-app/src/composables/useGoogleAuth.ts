import { useAuthStore } from '../stores/authStore'

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
  }
}

let tokenClient: TokenClient | null = null

export function useGoogleAuth() {
  const authStore = useAuthStore()

  function initClient(): TokenClient {
    if (tokenClient) return tokenClient
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string
    if (!clientId) throw new Error('VITE_GOOGLE_CLIENT_ID is not defined')
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      callback(response) {
        if (response.access_token) {
          authStore.setToken(response.access_token)
        }
      },
    })
    return tokenClient
  }

  function login() {
    const client = initClient()
    // If we already have a token, skip the consent screen
    client.requestAccessToken({ prompt: authStore.isLoggedIn ? '' : 'consent' })
  }

  function logout() {
    authStore.clearToken()
    tokenClient = null
  }

  return { login, logout, isLoggedIn: authStore.isLoggedIn }
}
