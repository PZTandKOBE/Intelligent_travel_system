<template>
  <div class="flex flex-col h-screen bg-gray-50 relative overflow-hidden font-sans">
    
    <div v-if="isRainy" class="weather-layer rain-container pointer-events-none">
      <div class="rain-layer layer-1"></div>
      <div class="rain-layer layer-2"></div>
      <div class="rain-overlay"></div>
    </div>
    
    <div v-if="isSunny" class="weather-layer sun-container pointer-events-none">
      <div class="sun-beams"></div> <div class="sun-glow"></div>  </div>

    <van-nav-bar 
      :title="title" 
      left-arrow 
      @click-left="handleBack" 
      fixed 
      placeholder 
      z-index="50"
      :border="false"
      class="custom-nav relative z-50"
    >
      <template #right>
        <div @click="router.push('/user')" class="flex items-center justify-center w-9 h-9 bg-white/50 backdrop-blur-md rounded-full cursor-pointer hover:bg-white/80 transition-all shadow-sm active:scale-95">
          <span class="text-base">👤</span>
        </div>
      </template>
    </van-nav-bar>

    <div class="flex-1 overflow-y-auto p-4 space-y-6 relative z-10" ref="chatContainer">
      <div v-for="msg in chatStore.messages" :key="msg.id" class="flex flex-col">
        
        <div class="text-center text-xs text-gray-400/80 mb-3 scale-90">
          {{ formatTime(msg.createdAt) }}
        </div>

        <div :class="['flex', msg.role === 'user' ? 'justify-end' : 'justify-start']">
          
          <div v-if="msg.role === 'assistant'" class="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center mr-3 flex-shrink-0 border-2 border-white shadow-sm overflow-hidden">
            <span class="text-xl">🤖</span>
          </div>

          <div class="flex flex-col max-w-[80%]">
            
            <div v-if="msg.content || msg.isLoading" 
              :class="[
                'px-4 py-3 rounded-2xl text-[15px] leading-relaxed shadow-sm break-words transition-all',
                msg.role === 'user' 
                  ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-tr-sm shadow-indigo-100' 
                  : 'bg-white/90 backdrop-blur-sm text-gray-800 rounded-tl-sm border border-gray-100 shadow-gray-100'
              ]"
            >
              <div v-if="msg.isLoading && !msg.content" class="flex items-center space-x-2 py-1">
                <van-loading type="spinner" color="#6366f1" size="16px" />
                <span class="text-xs text-indigo-400 font-medium animate-pulse">正在检索非遗知识库...</span>
              </div>

              <div v-else class="whitespace-pre-wrap">{{ msg.content }}</div>
            </div>

            <LocationCard 
              v-if="msg.type === 'location' && msg.location" 
              :data="msg.location"
              class="mt-3 shadow-md"
            />
            <template v-if="msg.type === 'product' && msg.products">
              <ProductCard 
                v-for="(prod, idx) in msg.products" 
                :key="idx"
                :data="prod"
                class="mt-3 shadow-md"
              />
            </template>
          </div>

          <div v-if="msg.role === 'user'" class="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center ml-3 flex-shrink-0 border-2 border-white shadow-sm">
            <span class="text-xl">👤</span>
          </div>
        </div>
      </div>
    </div>

    <div class="bg-white/80 backdrop-blur-xl px-4 py-3 border-t border-gray-100/50 flex items-center gap-3 safe-area-bottom relative z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
      <input 
        v-model="inputContent" 
        @keyup.enter="handleSend"
        type="text" 
        class="flex-1 bg-gray-100/80 rounded-full px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-white transition-all placeholder-gray-400"
        placeholder="问问附近的非遗体验..." 
        :disabled="chatStore.isStreaming"
      />
      
      <button 
        @click="handleSend"
        :disabled="!inputContent.trim() || chatStore.isStreaming"
        :class="[
          'rounded-full p-3 transition-all duration-300',
          inputContent.trim() && !chatStore.isStreaming 
            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-100 hover:bg-indigo-700' 
            : 'bg-gray-100 text-gray-300 scale-95'
        ]"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 transform rotate-90" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, watch, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useChatStore } from '../../stores/chatStore';
import LocationCard from './LocationCard.vue';
import ProductCard from './ProductCard.vue';
import { showToast } from 'vant';

const route = useRoute();
const router = useRouter();
const chatStore = useChatStore();
const inputContent = ref('');
const chatContainer = ref<HTMLElement | null>(null);

const title = computed(() => route.query.id ? '历史回顾' : '非遗伴游');

// 智能天气判断
const isRainy = computed(() => {
  const w = chatStore.currentWeather || '';
  return /雨|Rain|Shower|Drizzle|Storm/i.test(w);
});

const isSunny = computed(() => {
  const w = chatStore.currentWeather || '';
  return /晴|Sunny|Clear/i.test(w);
});

const formatTime = (time: string | number) => {
  const date = new Date(time);
  return isNaN(date.getTime()) ? '' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const scrollToBottom = () => {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
    }
  });
};

watch(() => chatStore.messages.length, scrollToBottom);
watch(() => chatStore.messages[chatStore.messages.length - 1], () => scrollToBottom(), { deep: true });

const initOrLoad = async () => {
  const historyId = route.query.id as string;
  if (historyId) {
    await chatStore.loadHistory(historyId);
  } else {
    if (chatStore.messages.length === 0 || chatStore.currentConversationId !== null) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => chatStore.initChat(pos.coords.latitude, pos.coords.longitude),
          () => {
             showToast('定位未开启，默认广州');
             chatStore.initChat(23.1291, 113.2644);
          },
          { timeout: 5000 }
        );
      } else {
        chatStore.initChat(23.1291, 113.2644);
      }
    }
  }
  scrollToBottom();
};

watch(() => route.query.id, () => {
  initOrLoad();
});

onMounted(() => {
  initOrLoad();
});

const handleBack = () => {
  if (route.query.id) router.back();
  else router.push('/');
};

const handleSend = () => {
  if (!inputContent.value.trim() || chatStore.isStreaming) return;
  chatStore.sendMessage(inputContent.value);
  inputContent.value = '';
};
</script>

<style scoped>
.safe-area-bottom {
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}

/* 导航栏透明处理 */
.custom-nav {
  --van-nav-bar-background: rgba(255, 255, 255, 0.6);
  --van-nav-bar-title-text-color: #1f2937;
  backdrop-filter: blur(10px);
}

/* ================== 天气动画核心 CSS ================== */

/* 1. 全局容器 */
.weather-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  opacity: 0.6; /* 稍微透明一点，不抢内容 */
}

/* 2. 🌧️ 雨天效果 (背景图视差法) */
.rain-container {
  background: linear-gradient(to bottom, #cfd9df 0%, #e2ebf0 100%);
}

.rain-layer {
  position: absolute;
  width: 100%;
  height: 100%;
  /* 我们可以用 CSS 渐变模拟下雨，或者用 SVG 背景图。这里用 CSS repeating-linear-gradient */
  background-image: repeating-linear-gradient(
    transparent,
    transparent 50px,
    rgba(79, 70, 229, 0.3) 50px,
    rgba(79, 70, 229, 0.3) 53px
  );
  background-size: 2px 100%; /* 细长的雨滴 */
  opacity: 0;
}

.layer-1 {
  animation: rain-fall 1s linear infinite;
  opacity: 0.6;
}
.layer-2 {
  background-size: 3px 100%; /* 更粗的雨滴 */
  animation: rain-fall 0.7s linear infinite;
  opacity: 0.4;
  left: 20%; /* 错位 */
}

.rain-overlay {
  position: absolute;
  bottom: 0;
  width: 100%;
  height: 30%;
  background: linear-gradient(to top, rgba(255,255,255,1), transparent);
}

@keyframes rain-fall {
  0% { transform: translateY(-100vh); opacity: 0; }
  50% { opacity: 1; }
  100% { transform: translateY(100vh); opacity: 0; }
}

/* 3. ☀️ 晴天效果 (光芒旋转) */
.sun-container {
  background: linear-gradient(to bottom, #fff7e6 0%, #ffffff 100%); /* 暖色背景 */
}

.sun-glow {
  position: absolute;
  top: -150px;
  right: -150px;
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(251, 191, 36, 0.2) 0%, rgba(251, 191, 36, 0) 70%);
  border-radius: 50%;
  animation: sun-pulse 6s ease-in-out infinite alternate;
}

.sun-beams {
  position: absolute;
  top: -200px;
  right: -200px;
  width: 600px;
  height: 600px;
  /* 使用 conic-gradient 制作光芒 */
  background: conic-gradient(
    from 0deg,
    transparent 0deg,
    rgba(251, 191, 36, 0.1) 20deg,
    transparent 40deg,
    rgba(251, 191, 36, 0.1) 60deg,
    transparent 80deg,
    rgba(251, 191, 36, 0.1) 100deg,
    transparent 120deg,
    rgba(251, 191, 36, 0.1) 140deg,
    transparent 160deg
  );
  border-radius: 50%;
  animation: sun-rotate 20s linear infinite;
}

@keyframes sun-pulse {
  0% { transform: scale(1); opacity: 0.8; }
  100% { transform: scale(1.1); opacity: 1; }
}

@keyframes sun-rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>