<template>
  <div class="app-container">
    <RouterView />

    <!-- 底部導覽列：只有登入後顯示 -->
    <nav v-if="auth.isLoggedIn" class="bottom-nav">
      <RouterLink to="/" class="nav-item" active-class="active" exact-active-class="active">
        <span class="nav-icon">🏠</span>
        <span class="nav-label">主頁</span>
      </RouterLink>
      <RouterLink to="/record" class="nav-item" active-class="active">
        <span class="nav-icon">✏️</span>
        <span class="nav-label">記錄</span>
      </RouterLink>
      <RouterLink to="/history" class="nav-item" active-class="active">
        <span class="nav-icon">📋</span>
        <span class="nav-label">歷史</span>
      </RouterLink>
      <RouterLink to="/stats" class="nav-item" active-class="active">
        <span class="nav-icon">📊</span>
        <span class="nav-label">統計</span>
      </RouterLink>
      <RouterLink to="/settings" class="nav-item" active-class="active">
        <span class="nav-icon">⚙️</span>
        <span class="nav-label">設定</span>
      </RouterLink>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { RouterView, RouterLink } from 'vue-router'
import { useAuthStore } from './stores/authStore'

const auth = useAuthStore()
</script>

<style>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html,
body {
  height: 100%;
  font-family: -apple-system, 'Segoe UI', system-ui, sans-serif;
  background: #f0f2f5;
  color: #1f2328;
}

#app {
  height: 100%;
}
</style>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  background: #fff;
  border-top: 1px solid #e5e7eb;
  z-index: 100;
  padding-bottom: env(safe-area-inset-bottom);
}

.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 0.25rem;
  text-decoration: none;
  color: #57606a;
  font-size: 0.7rem;
  gap: 0.15rem;
  transition: color 0.15s;
}

.nav-item.active {
  color: #3b82d4;
}

.nav-icon {
  font-size: 1.25rem;
  line-height: 1;
}

.nav-label {
  font-size: 0.65rem;
}
</style>
