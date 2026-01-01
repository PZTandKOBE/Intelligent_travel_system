<template>
  <div class="app-wrapper h-screen w-screen overflow-hidden bg-gray-50 flex flex-col relative">
    
    <div id="weather-layer" class="absolute inset-0 pointer-events-none z-0"></div>

    <div class="flex-1 overflow-y-auto z-10 relative">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <keep-alive include="Home"> <component :is="Component" />
          </keep-alive>
        </transition>
      </router-view>
    </div>

  </div>
</template>

<script setup lang="ts">
// 这里是全局逻辑入口
// 可以在这里初始化 App 级别的状态，比如：
// import { useEnvStore } from '@/stores/envStore'
// const envStore = useEnvStore()
// envStore.initLocation() 
</script>

<style>
/* 简单的淡入淡出动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 修复 Vant 或 Tailwind 可能导致的字体模糊 */
body {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
</style>