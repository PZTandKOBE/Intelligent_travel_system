<template>
  <div class="flex flex-col h-full bg-gray-50">
    <van-nav-bar 
      title="非遗伴游助手" 
      left-arrow 
      fixed
      placeholder
      @click-left="onClickLeft"
      class="!bg-white/90 !backdrop-blur-sm z-50"
    />

    <div class="flex-1 overflow-y-auto p-4 space-y-4" ref="messageContainer">
      
      <div class="flex items-start space-x-3">
        <div class="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-400 to-cyan-300 flex items-center justify-center text-white text-xs shadow-sm flex-shrink-0">
          AI
        </div>
        <div class="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm text-sm text-slate-700 max-w-[80%] leading-relaxed border border-gray-100">
          你好！我是你的非遗智能伴游。我探测到你当前在 <strong>苏州</strong>，天气 <strong>小雨</strong> 🌧️。
          <br><br>
          建议你去附近的 <strong>苏绣博物馆</strong> 体验室内手作，需要我为你规划路线吗？
        </div>
      </div>

      <div class="flex items-start justify-end space-x-3">
        <div class="bg-blue-600 p-3 rounded-2xl rounded-tr-none shadow-md text-sm text-white max-w-[80%] leading-relaxed">
          好啊，请告诉我怎么走，还有附近有什么好吃的？
        </div>
        <div class="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs flex-shrink-0">
          Me
        </div>
      </div>

    </div>

    <div class="bg-white p-3 border-t border-gray-100 pb-safe"> <div class="flex items-center gap-2 bg-gray-100 rounded-full px-4 py-1">
        <input 
          type="text" 
          placeholder="问问关于非遗的故事..." 
          class="flex-1 bg-transparent border-none outline-none text-sm h-10 text-slate-700 placeholder-gray-400"
        >
        <van-button 
          round 
          size="small" 
          type="primary" 
          color="linear-gradient(to right, #4facfe 0%, #00f2fe 100%)"
          class="!px-4 !h-8 !min-w-[4rem]"
        >
          发送
        </van-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const onClickLeft = () => {
  router.back()
}
</script>

<style scoped>
/* 隐藏滚动条但保持滚动功能 */
.overflow-y-auto::-webkit-scrollbar {
  display: none;
}
/* 适配 iOS 底部安全区 (需要在 postcss 或 tailwind 中开启 safe-area 支持，或者手动写) */
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom, 20px);
}
</style>