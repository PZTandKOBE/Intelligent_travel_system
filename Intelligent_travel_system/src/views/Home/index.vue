<template>
  <div class="relative w-full h-full bg-slate-100 flex flex-col items-center justify-center overflow-hidden">
    
    <div class="absolute top-[-10%] right-[-10%] w-64 h-64 bg-blue-200 rounded-full blur-3xl opacity-50"></div>
    <div class="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-purple-200 rounded-full blur-3xl opacity-50"></div>

    <div class="z-10 flex flex-col items-center w-full px-8 animate-fade-in-up">
      <div class="mb-8 text-center">
        <h1 class="text-4xl font-extrabold text-slate-800 tracking-wider mb-2">寻遗</h1>
        <p class="text-sm text-slate-500 tracking-[0.2em] uppercase">Intelligent Travel Agent</p>
      </div>

      <div class="w-full bg-white/80 backdrop-blur-md shadow-xl rounded-2xl p-6 mb-8 border border-white/50">
        <div class="flex items-center space-x-4 mb-4">
          <div class="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-2xl">
            🌍
          </div>
          <div>
            <h3 class="font-bold text-slate-800">环境感知</h3>
            <p class="text-xs text-slate-400">实时分析天气与人流</p>
          </div>
        </div>
        <div class="flex items-center space-x-4">
          <div class="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center text-2xl">
            🎨
          </div>
          <div>
            <h3 class="font-bold text-slate-800">文化伴游</h3>
            <p class="text-xs text-slate-400">深度解读非遗故事</p>
          </div>
        </div>
      </div>

      <van-button 
        type="primary" 
        round 
        block 
        color="linear-gradient(to right, #4facfe 0%, #00f2fe 100%)"
        class="!h-12 !text-lg !font-bold shadow-lg shadow-blue-300/50 transition-transform active:scale-95"
        to="/chat"
      >
        开启旅程
        <van-icon name="arrow" class="ml-1" />
      </van-button>

      <p class="mt-6 text-xs text-slate-400 text-center">
        Powered by AI Agent & Spring AI
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
// 这里可以加一些进入动画的逻辑，暂时留空
</script>

<style scoped>
/* 简单的上浮淡入动画 */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.animate-fade-in-up {
  animation: fadeInUp 0.8s ease-out forwards;
}
</style>