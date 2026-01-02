<template>
  <div class="min-h-screen bg-gray-50">
    <van-nav-bar title="历史会话" left-arrow @click-left="$router.back()" fixed placeholder />

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
        <p class="text-sm text-gray-500 line-clamp-2">
          {{ item.lastMessage || '点击查看详情...' }}
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

// 格式化时间
const formatTime = (timestamp: number) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
};

// 获取列表
onMounted(() => {
  chatStore.fetchConversations();
});

// 跳转逻辑：带上 id 参数
const goToChat = (id: string) => {
  router.push({ path: '/chat', query: { id } });
};
</script>