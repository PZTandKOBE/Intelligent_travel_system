<template>
  <div class="flex flex-col h-screen bg-gray-50">
    <van-nav-bar title="非遗伴游" left-arrow @click-left="$router.back()" fixed placeholder z-index="50">
      <template #right>
        <div @click="$router.push('/user')" class="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full cursor-pointer hover:bg-gray-200 transition-colors">
          <span class="text-sm">👤</span>
        </div>
      </template>
    </van-nav-bar>

    <div class="flex-1 overflow-y-auto p-4 space-y-6" ref="chatContainer">
      <div v-for="msg in chatStore.messages" :key="msg.id" class="flex flex-col">
        
        <div class="text-center text-xs text-gray-400 mb-2">
          {{ formatTime(msg.createdAt) }}
        </div>

        <div :class="['flex', msg.role === 'user' ? 'justify-end' : 'justify-start']">
          
          <div v-if="msg.role === 'assistant'" class="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center mr-3 flex-shrink-0 border border-indigo-200">
            <span class="text-lg">🤖</span>
          </div>

          <div class="flex flex-col max-w-[85%]">
            
            <div v-if="msg.content || msg.isLoading" 
              :class="[
                'p-3 rounded-2xl text-[15px] leading-relaxed shadow-sm break-words',
                msg.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-tr-none' 
                  : 'bg-white text-gray-800 rounded-tl-none'
              ]"
            >
              <div v-if="msg.isLoading && !msg.content" class="flex items-center space-x-1 h-6">
                <div class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                <div class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                <div class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-200"></div>
              </div>

              <div v-else class="whitespace-pre-wrap">{{ msg.content }}</div>
            </div>

            <LocationCard 
              v-if="msg.type === 'location' && msg.location" 
              :data="msg.location"
              class="mt-2"
            />

            <template v-if="msg.type === 'product' && msg.products">
              <ProductCard 
                v-for="(prod, idx) in msg.products" 
                :key="idx"
                :data="prod"
                class="mt-2"
              />
            </template>

          </div>

          <div v-if="msg.role === 'user'" class="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center ml-3 flex-shrink-0">
            <span class="text-lg">👤</span>
          </div>
        </div>
      </div>
    </div>

    <div class="bg-white px-4 py-3 border-t border-gray-100 flex items-center gap-3 safe-area-bottom">
      <button class="text-gray-400 hover:text-indigo-600">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
      </button>

      <input 
        v-model="inputContent" 
        @keyup.enter="handleSend"
        type="text" 
        class="flex-1 bg-gray-100 rounded-full px-5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
        placeholder="问问附近的非遗体验..." 
        :disabled="chatStore.isStreaming"
      />
      
      <button 
        @click="handleSend"
        :disabled="!inputContent.trim() || chatStore.isStreaming"
        :class="[
          'rounded-full p-2 transition-colors',
          inputContent.trim() && !chatStore.isStreaming ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-200 text-gray-400'
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
import { ref, onMounted, nextTick, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useChatStore } from '../../stores/chatStore';
import LocationCard from './LocationCard.vue';
import ProductCard from './ProductCard.vue';

const route = useRoute();
const chatStore = useChatStore();
const inputContent = ref('');
const chatContainer = ref<HTMLElement | null>(null);

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
// 深度监听，保证流式输出时持续滚动
watch(() => chatStore.messages[chatStore.messages.length - 1], () => {
  scrollToBottom();
}, { deep: true });

onMounted(() => {
  const historyId = route.query.id as string;

  if (historyId) {
    chatStore.loadHistory(historyId);
  } else {
    // 默认坐标：广州 (实际开发请接入 navigator.geolocation)
    chatStore.initChat(23.1291, 113.2644);
  }
  
  scrollToBottom();
});

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
</style>