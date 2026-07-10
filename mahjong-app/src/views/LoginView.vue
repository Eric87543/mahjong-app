<template>
  <div class="login-page">
    <div class="login-card">
      <div class="logo">🀄</div>
      <h1>竹北麻將盃</h1>
      <p class="subtitle">請登入 Google 帳號以存取記錄表</p>
      <button class="google-btn" @click="handleLogin">
        <svg class="google-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        使用 Google 登入
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGoogleAuth } from '../composables/useGoogleAuth'

const { login } = useGoogleAuth()

function handleLogin() {
  login()
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f2f5;
  padding: 1rem;
}

.login-card {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
  padding: 2.5rem 2rem;
  text-align: center;
  max-width: 360px;
  width: 100%;
}

.logo {
  font-size: 3.5rem;
  margin-bottom: 0.5rem;
}

h1 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2328;
  margin: 0 0 0.5rem;
}

.subtitle {
  color: #57606a;
  font-size: 0.9rem;
  margin: 0 0 2rem;
}

.google-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 500;
  color: #1f2328;
  background: #fff;
  border: 1.5px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s, box-shadow 0.15s;
  width: 100%;
  justify-content: center;
}

.google-btn:hover {
  background: #f7f8fa;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.google-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}
</style>
