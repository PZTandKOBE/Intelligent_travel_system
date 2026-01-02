<template>
  <div class="min-h-screen bg-gray-50 pb-10">
    <van-nav-bar title="我的游览报告" left-arrow @click-left="$router.back()" fixed placeholder />

    <div class="p-4 space-y-4">
      <van-empty v-if="userStore.documentList.length === 0" description="暂无生成的游览报告" />

      <div 
        v-for="item in userStore.documentList" 
        :key="item.id"
        @click="openPdf(item.pdfUrl)"
        class="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-start gap-4 active:scale-[0.98] transition-transform cursor-pointer"
      >
        <div class="w-16 h-20 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0 text-red-500">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>

        <div class="flex-1 min-w-0">
          <h3 class="font-bold text-gray-800 text-base truncate">{{ item.title }}</h3>
          <p class="text-xs text-gray-400 mt-1">{{ formatTime(item.createdAt) }}</p>
          <p class="text-sm text-gray-500 mt-2 line-clamp-2 leading-relaxed">
            {{ item.summary || '暂无简介' }}
          </p>
        </div>
        
        <div class="self-center text-gray-300">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useUserStore } from '../../stores/userStore';
import { showToast } from 'vant';

const userStore = useUserStore();

onMounted(() => {
  userStore.fetchDocuments();
});

const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleDateString();
};

const openPdf = (url: string) => {
  if (!url) {
    showToast('文件地址无效');
    return;
  }
  // 简单处理：新窗口打开 PDF
  window.open(url, '_blank');
};
</script>