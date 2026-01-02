<template>
  <div class="min-h-screen bg-gray-50 pb-safe">
    <van-nav-bar
      title="我的游览报告"
      left-text="返回"
      left-arrow
      fixed
      placeholder
      @click-left="router.back()"
    />

    <div class="p-4">
      <div v-if="loading" class="py-10 text-center text-gray-400">
        <van-loading size="24px">加载中...</van-loading>
      </div>

      <div v-else-if="documents.length === 0" class="py-20 text-center text-gray-400 flex flex-col items-center">
        <van-icon name="description" size="64" class="mb-4 opacity-50" />
        <p>暂无生成的游览报告</p>
      </div>

      <div v-else class="space-y-3">
        <div 
          v-for="doc in documents" 
          :key="doc.id"
          class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between active:scale-[0.99] transition-transform"
          @click="openDoc(doc.fileUrl)"
        >
          <div class="flex items-center space-x-3 overflow-hidden">
            <div class="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
              <span class="text-red-500 font-bold text-xs">PDF</span>
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="text-gray-800 font-medium truncate">{{ doc.title || '非遗游览报告' }}</h3>
              <p class="text-xs text-gray-400 mt-1">{{ formatTime(doc.createdAt) }}</p>
            </div>
          </div>
          <van-icon name="arrow" class="text-gray-300" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../../stores/userStore';
import { showToast } from 'vant';

const router = useRouter();
const userStore = useUserStore();
const loading = ref(false);

// 使用 computed 映射 store 中的数据
const documents = computed(() => userStore.documentList);

onMounted(async () => {
  loading.value = true;
  await userStore.fetchDocuments();
  loading.value = false;
});

const openDoc = (url: string) => {
  if (!url) {
    showToast('文件链接无效');
    return;
  }
  // 在新窗口打开 PDF
  window.open(url, '_blank');
};

const formatTime = (val: string | number) => {
  if (!val) return '';
  return new Date(val).toLocaleString();
};
</script>