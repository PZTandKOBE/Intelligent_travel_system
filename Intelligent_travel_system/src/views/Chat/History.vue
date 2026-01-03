<template>
  <div class="min-h-screen bg-gray-50">
    <van-nav-bar 
      title="历史会话" 
      left-arrow 
      @click-left="goToUser" 
      fixed 
      placeholder 
    />

    <div class="p-4 space-y-3">
      <van-empty v-if="chatStore.conversationList.length === 0" description="暂无历史会话" />

      <div 
        v-for="item in chatStore.conversationList" 
        :key="item.id"
        @click="goToChat(item.id)"
        class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 active:scale-[0.98] transition-transform cursor-pointer"
      >
        <div class="flex justify-between items-start mb-2">
          <h3 class="font-bold text-gray-800 text-base line-clamp-1">{{ item.title || '无标题会话' }}</h3>
          <span class="text-xs text-gray-400 whitespace-nowrap ml-2">
            {{ formatTime(item.updatedAt || item.createdAt) }}
          </span>
        </div>
        
        <p class="text-sm text-gray-500 line-clamp-2" v-if="item.lastMessage">
          {{ item.lastMessage }}
        </p>
        <p class="text-sm text-gray-400 line-clamp-2" v-else>
          点击查看详情...
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useChatStore } from '../../stores/chatStore';

const router = useRouter();
const chatStore = useChatStore();

const formatTime = (timestamp: string | number) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
};

onMounted(() => {
  chatStore.fetchConversations();
});

const goToChat = (id: number) => {
  router.push({ path: '/chat', query: { id: id.toString() } });
};

const goToUser = () => {
  router.push('/user');
};
</script>