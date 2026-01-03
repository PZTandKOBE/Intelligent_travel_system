<template>
  <div 
    class="flex flex-col h-screen bg-gray-50 relative overflow-hidden font-sans"
    @touchstart="handleTouchStart"
    @touchend="handleTouchEnd"
  >
    
    <div v-if="isRainy" class="weather-layer rain-container pointer-events-none">
      <div class="rain-layer layer-1"></div>
      <div class="rain-layer layer-2"></div>
      <div class="rain-overlay"></div>
    </div>
    
    <div v-if="isSunny" class="weather-layer sun-container pointer-events-none">
      <div class="sun-beams"></div> <div class="sun-glow"></div>  
    </div>

    <van-nav-bar 
      :title="title" 
      :left-arrow="!!route.query.id" 
      @click-left="handleBack" 
      fixed 
      placeholder 
      z-index="50"
      :border="false"
      class="custom-nav relative z-50"
    >
      <template #left v-if="!route.query.id">
        <van-icon name="wap-nav" size="24" class="text-gray-700" />
      </template>

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

    <van-popup 
      v-model:show="showHistory" 
      position="right" 
      :style="{ width: '75%', height: '100%' }"
      class="bg-gray-50"
    >
      <div class="flex flex-col h-full">
        <div class="p-4 bg-white shadow-sm border-b flex justify-between items-center">
          <h2 class="text-lg font-bold text-gray-800">历史会话</h2>
          <van-icon name="cross" @click="showHistory = false" class="text-gray-500" />
        </div>
        
        <div class="flex-1 overflow-y-auto p-2">
          <van-empty v-if="!chatStore.historyList?.length" description="暂无历史记录" />
          
          <div 
            v-for="item in chatStore.historyList" 
            :key="item.id"
            @click="switchConversation(item.id)"
            :class="[
              'p-3 mb-3 rounded-xl border transition-all cursor-pointer active:scale-95',
              currentConversationId === item.id 
                ? 'bg-indigo-50 border-indigo-200 shadow-inner' 
                : 'bg-white border-gray-100 shadow-sm hover:shadow-md'
            ]"
          >
            <div class="font-medium text-gray-800 line-clamp-1 mb-1">{{ item.title || '新会话' }}</div>
            <div class="text-xs text-gray-400 flex justify-between">
              <span>{{ formatTime(item.updatedAt || item.createdAt) }}</span>
              <span v-if="currentConversationId === item.id" class="text-indigo-500">当前</span>
            </div>
          </div>
        </div>

        <div class="p-4 border-t bg-white">
           <van-button block type="primary" plain size="small" @click="startNewChat">
             <template #icon><van-icon name="plus" /></template>
             开启新会话
           </van-button>
        </div>
      </div>
    </van-popup>

    <div class="bg-white/80 backdrop-blur-xl border-t border-gray-100/50 safe-area-bottom relative z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.02)] flex flex-col">
      
      <div class="flex gap-2 px-4 pt-3 pb-1 overflow-x-auto no-scrollbar w-full">
        <button
          v-for="item in quickActions"
          :key="item"
          @click="handleQuickAction(item)"
          :disabled="chatStore.isStreaming"
          class="flex-shrink-0 px-3 py-1.5 bg-indigo-50 text-indigo-600 text-xs font-medium rounded-full border border-indigo-100 active:bg-indigo-100 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {{ item }}
        </button>
      </div>

      <div class="flex items-center gap-3 px-4 py-3">
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
            'rounded-full p-3 transition-all duration-300 flex items-center justify-center',
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

// 历史会话侧边栏控制
const showHistory = ref(false);
const currentConversationId = computed(() => chatStore.currentConversationId);

const title = computed(() => route.query.id ? '历史回顾' : '非遗伴游');

// 定义快捷问题列表
const quickActions = [
  '📍 附近推荐',
  '🎨 非遗介绍',
  '🛍️ 文创产品',
  '🗺️ 游览路线',
  '🏺 历史渊源'
];

// 智能天气判断
const isRainy = computed(() => {
  const w = chatStore.currentWeather || '';
  return /雨|Rain|Shower|Drizzle|Storm/i.test(w);
});

const isSunny = computed(() => {
  const w = chatStore.currentWeather || '';
  return /晴|Sunny|Clear/i.test(w);
});

// 格式化时间
const formatTime = (time: string | number) => {
  const date = new Date(time);
  const isToday = new Date().toDateString() === date.toDateString();
  return isNaN(date.getTime()) 
    ? '' 
    : isToday 
      ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
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

// 监听侧边栏打开，获取历史记录
watch(showHistory, (newVal) => {
  if (newVal) {
    chatStore.fetchHistory();
  }
});

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
             // 默认广州
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

// ⭐ 修复后的 handleBack 逻辑 ⭐
const handleBack = () => {
  if (route.query.id) {
    // 只有在查看历史记录时，才执行返回
    router.back();
  } else {
    // 在主会话界面，点击左上角直接打开侧边栏
    showHistory.value = true;
  }
};

// 处理快捷标签点击
const handleQuickAction = (text: string) => {
  if (chatStore.isStreaming) return;
  chatStore.sendMessage(text);
};

const handleSend = () => {
  if (!inputContent.value.trim() || chatStore.isStreaming) return;
  chatStore.sendMessage(inputContent.value);
  inputContent.value = '';
};

// ================== 手势滑动逻辑 ==================
const touchStart = ref({ x: 0, y: 0 });
const minSwipeDistance = 50; // 最小滑动距离

const handleTouchStart = (e: TouchEvent) => {
  touchStart.value = {
    x: e.touches[0].clientX,
    y: e.touches[0].clientY
  };
};

const handleTouchEnd = (e: TouchEvent) => {
  const touchEnd = {
    x: e.changedTouches[0].clientX,
    y: e.changedTouches[0].clientY
  };

  const deltaX = touchEnd.x - touchStart.value.x;
  const deltaY = touchEnd.y - touchStart.value.y;

  // 检测水平滑动：X轴距离足够，且Y轴偏移较小（防止斜滑触发）
  if (Math.abs(deltaX) > minSwipeDistance && Math.abs(deltaY) < 50) {
    if (deltaX < 0) {
      // 向左滑动 (Right -> Left): 打开右侧侧边栏
      showHistory.value = true;
    } 
  }
};

// ================== 历史记录操作 ==================
const switchConversation = async (id: number) => {
  if (currentConversationId.value === id) {
    showHistory.value = false;
    return;
  }
  
  await chatStore.loadHistory(id);
  showHistory.value = false;
  
  if (route.query.id) {
    router.replace({ query: { ...route.query, id: id } });
  }
};

const startNewChat = () => {
  // chatStore.$reset(); 
  chatStore.messages = [];
  chatStore.currentConversationId = null;
  
  initOrLoad();
  
  showHistory.value = false;
  if (route.query.id) {
    router.push('/chat');
  }
};
</script>

<style scoped>
.safe-area-bottom {
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}

/* 隐藏横向滚动条但保留滚动功能 */
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
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
  opacity: 0.6; 
}

/* 2. 🌧️ 雨天效果 */
.rain-container {
  background: linear-gradient(to bottom, #cfd9df 0%, #e2ebf0 100%);
}

.rain-layer {
  position: absolute;
  width: 100%;
  height: 100%;
  background-image: repeating-linear-gradient(
    transparent,
    transparent 50px,
    rgba(79, 70, 229, 0.3) 50px,
    rgba(79, 70, 229, 0.3) 53px
  );
  background-size: 2px 100%;
  opacity: 0;
}

.layer-1 {
  animation: rain-fall 1s linear infinite;
  opacity: 0.6;
}
.layer-2 {
  background-size: 3px 100%; 
  animation: rain-fall 0.7s linear infinite;
  opacity: 0.4;
  left: 20%; 
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

/* 3. ☀️ 晴天效果 */
.sun-container {
  background: linear-gradient(to bottom, #fff7e6 0%, #ffffff 100%); 
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