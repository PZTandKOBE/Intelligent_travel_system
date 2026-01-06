<template>
  <div 
    class="flex flex-col h-screen bg-gray-50 relative overflow-hidden font-sans"
    @touchstart="handleTouchStart"
    @touchend="handleTouchEnd"
  >
    <div class="absolute inset-0 pointer-events-none z-0 overflow-hidden">
      <div v-if="isRainy" class="weather-layer rain-container">
        <div class="rain-layer layer-1"></div>
        <div class="rain-layer layer-2"></div>
        <div class="rain-overlay"></div>
      </div>
      <div v-if="isSunny" class="weather-layer sun-container">
        <div class="sun-beams"></div>
        <div class="sun-glow"></div>
      </div>
      <div v-if="isCloudy" class="weather-layer cloud-container">
        <div class="cloud x1"></div>
        <div class="cloud x2"></div>
        <div class="cloud x3"></div>
      </div>
      <div v-if="isSnowy" class="weather-layer snow-container">
        <div class="snow layer-1"></div>
        <div class="snow layer-2"></div>
        <div class="snow layer-3"></div>
      </div>
      <div v-if="isFoggy" class="weather-layer fog-container">
        <div class="fog-img fog-img-first"></div>
        <div class="fog-img fog-img-second"></div>
      </div>
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
        <van-icon name="wap-nav" size="24" class="text-gray-700" @click="showHistory = true" />
      </template>
      <template #right>
        <div @click="router.push('/user')" class="flex items-center justify-center w-9 h-9 bg-white/50 backdrop-blur-md rounded-full cursor-pointer hover:bg-white/80 transition-all shadow-sm active:scale-95 overflow-hidden">
           <img 
            v-if="userStore.userInfo?.userAvatar" 
            :src="userStore.userInfo.userAvatar" 
            class="w-full h-full object-cover"
            alt="用户"
           />
           <span v-else class="text-base">👤</span>
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

          <div class="flex flex-col max-w-[85%]">
            <div 
              :class="[
                'px-4 py-3 rounded-2xl text-[15px] leading-relaxed shadow-sm break-words transition-all',
                msg.role === 'user' 
                  ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-tr-sm shadow-indigo-100' 
                  : 'bg-white/90 backdrop-blur-sm text-gray-800 rounded-tl-sm border border-gray-100 shadow-gray-100'
              ]"
            >
              <div v-if="msg.isThinking && !msg.content" class="flex items-center space-x-1 py-1 h-6">
                 <div class="typing-dot"></div>
                 <div class="typing-dot animation-delay-200"></div>
                 <div class="typing-dot animation-delay-400"></div>
                 <span class="ml-2 text-xs text-gray-400">AI正在思考...</span>
              </div>

              <div 
                v-else
                class="message-content markdown-body" 
                v-html="renderMessage(msg.content)"
              ></div>
            </div>

            <template v-if="msg.locations && msg.locations.length > 0">
              <LocationCard 
                v-for="(loc, idx) in msg.locations"
                :key="idx"
                :data="loc"
                class="mt-3 shadow-md"
              />
            </template>
            <LocationCard 
              v-else-if="msg.type === 'location' && msg.location" 
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

          <div v-if="msg.role === 'user'" class="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center ml-3 flex-shrink-0 border-2 border-white shadow-sm overflow-hidden">
            <img 
              v-if="userStore.userInfo?.userAvatar" 
              :src="userStore.userInfo.userAvatar" 
              class="w-full h-full object-cover"
              alt="User"
            />
            <span v-else class="text-xl">👤</span>
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
              'p-3 mb-3 rounded-xl border transition-all cursor-pointer active:scale-95 group relative',
              currentConversationId === item.id 
                ? 'bg-indigo-50 border-indigo-200 shadow-inner' 
                : 'bg-white border-gray-100 shadow-sm hover:shadow-md'
            ]"
          >
            <div class="font-medium text-gray-800 line-clamp-1 mb-1 pr-6">{{ item.title || '新会话' }}</div>
            <div class="text-xs text-gray-400 flex justify-between">
              <span>{{ formatTime(item.updatedAt || item.createdAt) }}</span>
              <span v-if="currentConversationId === item.id" class="text-indigo-500">当前</span>
            </div>
            
            <div class="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity" @click.stop="confirmDelete(item.id)">
               <van-icon name="delete-o" class="text-red-400 hover:text-red-600" />
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
import { useUserStore } from '../../stores/userStore'; // ✅ 引入 userStore
import { showConfirmDialog } from 'vant';
import LocationCard from './LocationCard.vue';
import ProductCard from './ProductCard.vue';
import MarkdownIt from 'markdown-it'; 

const route = useRoute();
const router = useRouter();
const chatStore = useChatStore();
const userStore = useUserStore(); // ✅ 初始化 userStore
const inputContent = ref('');
const chatContainer = ref<HTMLElement | null>(null);

const showHistory = ref(false);
const currentConversationId = computed(() => chatStore.currentConversationId);

// 动态计算标题
const title = computed(() => {
  if (route.query.id) {
    const id = Number(route.query.id);
    const item = chatStore.historyList.find(i => i.id === id);
    return item?.title || '历史回顾';
  }
  if (currentConversationId.value) {
    const item = chatStore.historyList.find(i => i.id === currentConversationId.value);
    return item?.title || '非遗伴游';
  }
  return '非遗伴游';
});

// 初始化 Markdown 实例
const md = new MarkdownIt({
  html: true,       
  linkify: true,    
  breaks: true      
});

const quickActions = [
  '📍 附近推荐',
  '🎨 非遗介绍',
  '🛍️ 文创产品',
  '🗺️ 游览路线',
  '🏺 历史渊源'
];

// 天气状态判断
const w = computed(() => (chatStore.envContext.weather || '').toLowerCase());
const isRainy = computed(() => /雨|rain|shower|drizzle|storm/i.test(w.value));
const isSunny = computed(() => /晴|sunny|clear/i.test(w.value));
const isCloudy = computed(() => /云|阴|cloud|overcast/i.test(w.value));
const isSnowy = computed(() => /雪|snow|blizzard/i.test(w.value));
const isFoggy = computed(() => /雾|fog|mist|haze/i.test(w.value));

/**
 * 消息渲染函数
 */
const renderMessage = (content: string) => {
  if (!content) return '';
  
  let processedContent = content;
  // Markdown 渲染
  let html = md.render(processedContent);

  // 样式注入
  html = html.replace(
    /<img src="(.*?)" alt="(.*?)">/g, 
    '<img src="$1" alt="$2" class="chat-image rounded-xl my-2 max-w-full h-auto shadow-sm border border-gray-100" loading="lazy" />'
  );
  html = html.replace(
    /<img src="(.*?)" alt="(.*?)" \/>/g, 
    '<img src="$1" alt="$2" class="chat-image rounded-xl my-2 max-w-full h-auto shadow-sm border border-gray-100" loading="lazy" />'
  );

  return html;
};

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

watch(showHistory, (newVal) => {
  if (newVal) chatStore.fetchHistory();
});

const initOrLoad = async () => {
  const historyId = route.query.id as string;
  if (historyId) {
    await chatStore.loadHistory(historyId);
  } else {
    // 只有在没有消息且未初始化过的情况才初始化
    if (chatStore.messages.length === 0) {
      await chatStore.initChat();
    }
  }
  scrollToBottom();
};

watch(() => route.query.id, () => { initOrLoad(); });
onMounted(() => { initOrLoad(); });

const handleBack = () => {
  if (route.query.id) router.back();
  else showHistory.value = true;
};

const handleQuickAction = (text: string) => {
  if (chatStore.isStreaming) return;
  chatStore.sendMessage(text);
};

const handleSend = () => {
  if (!inputContent.value.trim() || chatStore.isStreaming) return;
  chatStore.sendMessage(inputContent.value);
  inputContent.value = '';
};

// 手势相关
const touchStart = ref({ x: 0, y: 0 });
const minSwipeDistance = 50; 
const handleTouchStart = (e: TouchEvent) => {
  touchStart.value = { x: e.touches[0].clientX, y: e.touches[0].clientY };
};
const handleTouchEnd = (e: TouchEvent) => {
  const touchEnd = { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
  const deltaX = touchEnd.x - touchStart.value.x;
  const deltaY = touchEnd.y - touchStart.value.y;
  if (Math.abs(deltaX) > minSwipeDistance && Math.abs(deltaY) < 50) {
    if (deltaX < 0) showHistory.value = true; // 左滑显示历史
  }
};

const switchConversation = async (id: number) => {
  if (currentConversationId.value === id) {
    showHistory.value = false;
    return;
  }
  await chatStore.loadHistory(id);
  showHistory.value = false;
  if (route.query.id) router.replace({ query: { ...route.query, id: id } });
};

const startNewChat = () => {
  chatStore.resetChat();
  showHistory.value = false;
  if (route.query.id) router.push('/chat');
};

const confirmDelete = (id: number) => {
  showConfirmDialog({
    title: '删除会话',
    message: '确定要删除这条会话记录吗？',
  })
    .then(() => {
      chatStore.deleteConversation(id);
    })
    .catch(() => {});
};
</script>

<style scoped>
.safe-area-bottom {
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}

.no-scrollbar::-webkit-scrollbar {
  display: none;
}

.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.custom-nav {
  --van-nav-bar-background: rgba(255, 255, 255, 0.6);
  --van-nav-bar-title-text-color: #1f2937;
  backdrop-filter: blur(10px);
}

/* ==================== Markdown 样式 ==================== */
.message-content :deep(p) {
  margin: 0.5em 0;
}
.message-content :deep(p:first-child) {
  margin-top: 0;
}
.message-content :deep(p:last-child) {
  margin-bottom: 0;
}
.message-content :deep(ul), 
.message-content :deep(ol) {
  margin: 0.5em 0;
  padding-left: 1.5em;
  list-style-type: disc;
}
.message-content :deep(ol) {
  list-style-type: decimal;
}
.message-content :deep(li) {
  margin: 0.2em 0;
}
.message-content :deep(strong) {
  font-weight: 600;
  color: #4f46e5; /* indigo-600 */
}
.message-content :deep(code) {
  background-color: rgba(0, 0, 0, 0.05);
  padding: 0.1em 0.3em;
  border-radius: 0.2em;
  font-family: monospace;
  font-size: 0.9em;
  color: #e11d48; /* rose-600 */
}
.message-content :deep(pre) {
  background-color: #f8fafc;
  padding: 0.8em;
  border-radius: 0.5em;
  overflow-x: auto;
  margin: 0.5em 0;
  border: 1px solid #e2e8f0;
}
.message-content :deep(pre code) {
  background-color: transparent;
  padding: 0;
  color: inherit;
}
.message-content :deep(blockquote) {
  border-left: 3px solid #cbd5e1;
  padding-left: 0.8em;
  color: #64748b;
  margin: 0.5em 0;
}
.message-content :deep(h1), 
.message-content :deep(h2), 
.message-content :deep(h3) {
  font-weight: 700;
  margin-top: 1em;
  margin-bottom: 0.5em;
  line-height: 1.3;
}
.message-content :deep(h1) { font-size: 1.4em; }
.message-content :deep(h2) { font-size: 1.25em; }
.message-content :deep(h3) { font-size: 1.1em; }
.message-content :deep(a) {
  color: #4f46e5;
  text-decoration: underline;
}

/* ==================== 打字机圆点动画 ==================== */
.typing-dot {
  width: 6px;
  height: 6px;
  background-color: #6366f1;
  border-radius: 50%;
  animation: typing 1.4s infinite ease-in-out both;
  margin-right: 3px;
}

.animation-delay-200 {
  animation-delay: 0.2s;
}

.animation-delay-400 {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%,
  80%,
  100% {
    transform: scale(0);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

/* ==================== 天气背景动画 CSS ==================== */
.weather-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  opacity: 0.6;
}

/* 雨天 */
.rain-container {
  background: linear-gradient(to bottom, #cfd9df 0%, #e2ebf0 100%);
}
.rain-layer {
  position: absolute;
  width: 100%;
  height: 100%;
  background-image: repeating-linear-gradient(transparent, transparent 50px, rgba(79, 70, 229, 0.3) 50px, rgba(79, 70, 229, 0.3) 53px);
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
  background: linear-gradient(to top, rgba(255, 255, 255, 1), transparent);
}
@keyframes rain-fall {
  0% { transform: translateY(-100vh); opacity: 0; }
  50% { opacity: 1; }
  100% { transform: translateY(100vh); opacity: 0; }
}

/* 晴天 */
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
  background: conic-gradient(from 0deg, transparent 0deg, rgba(251, 191, 36, 0.1) 20deg, transparent 40deg, rgba(251, 191, 36, 0.1) 60deg, transparent 80deg);
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

/* 阴/云天 */
.cloud-container {
  background: linear-gradient(to bottom, #e0eafc 0%, #cfdef3 100%);
}
.cloud {
  background: #fff;
  border-radius: 100px;
  position: absolute;
  margin: 120px auto 20px;
  opacity: 0.8;
}
.cloud:after, .cloud:before {
  content: '';
  position: absolute;
  background: inherit;
  z-index: -1;
}
.cloud:after {
  width: 100px;
  height: 100px;
  top: -50px;
  left: 50px;
  border-radius: 100px;
}
.cloud:before {
  width: 120px;
  height: 120px;
  top: -90px;
  right: 50px;
  border-radius: 200px;
}
.x1 {
  width: 250px;
  height: 80px;
  top: 10px;
  left: 10%;
  animation: moveclouds 25s linear infinite;
  transform: scale(0.6);
}
.x2 {
  width: 300px;
  height: 100px;
  top: 80px;
  left: 40%;
  animation: moveclouds 35s linear infinite;
  transform: scale(0.8);
}
.x3 {
  width: 200px;
  height: 60px;
  top: 150px;
  left: 70%;
  animation: moveclouds 20s linear infinite;
  transform: scale(0.4);
}
@keyframes moveclouds {
  0% { margin-left: 100%; }
  100% { margin-left: -100%; }
}

/* 雪天 */
.snow-container {
  background: linear-gradient(to bottom, #E0EAFC 0%, #CFDEF3 100%);
}
.snow {
  position: absolute;
  width: 100%;
  height: 100%;
  background-image: radial-gradient(#fff 2px, transparent 2px);
  background-size: 50px 50px;
}
.layer-1 {
  animation: snow-fall 10s linear infinite;
  opacity: 0.8;
}
.layer-2 {
  background-size: 40px 40px;
  animation: snow-fall 8s linear infinite;
  opacity: 0.6;
}
.layer-3 {
  background-size: 30px 30px;
  animation: snow-fall 6s linear infinite;
  opacity: 0.4;
}
@keyframes snow-fall {
  0% { background-position: 0 0; }
  100% { background-position: 50px 500px; }
}

/* 雾天 */
.fog-container {
  background: #dcdcdc;
}
.fog-img {
  position: absolute;
  height: 100vh;
  width: 300vw;
  /* 使用一个可靠的雾图片源，或者使用本地资源 */
  background: url('https://raw.githubusercontent.com/danielstuart14/CSS_FOG_ANIMATION/master/fog1.png') repeat-x;
  background-size: contain;
}
.fog-img-first {
  animation: fog 60s linear infinite;
}
.fog-img-second {
  animation: fog 40s linear infinite;
  top: 30%;
}
@keyframes fog {
  0% { transform: translate3d(0, 0, 0); }
  100% { transform: translate3d(-200vw, 0, 0); }
}
</style>