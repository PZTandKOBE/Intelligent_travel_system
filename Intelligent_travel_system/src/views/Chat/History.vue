<template>
  <div class="min-h-screen bg-gray-50 pb-safe">
    <van-nav-bar
      title="历史会话"
      left-text="返回"
      left-arrow
      fixed
      placeholder
      @click-left="onClickLeft"
    />

    <div class="pt-2">
      <van-empty v-if="loading && chatStore.historyList?.length === 0" description="加载中..." />
      <van-empty v-else-if="!loading && chatStore.historyList?.length === 0" description="暂无历史会话" />

      <div v-else class="px-3 space-y-3">
        <van-swipe-cell 
          v-for="item in chatStore.historyList" 
          :key="item.id"
          class="bg-white rounded-xl overflow-hidden shadow-sm"
        >
          <van-cell 
            :label="formatTime(item.updatedAt || item.createdAt)" 
            is-link
            center
            class="py-4"
            @click="toChat(item.id)"
          >
            <template #title>
              <div class="flex items-center space-x-2 pr-2">
                <span class="font-medium text-gray-800 truncate text-base">{{ item.title || '新会话' }}</span>
                <van-icon 
                  name="edit" 
                  class="text-gray-400 p-1 cursor-pointer hover:text-indigo-600" 
                  @click.stop="openRenameDialog(item)"
                />
              </div>
            </template>
            
            <template #icon>
               <div class="mr-3 w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                 <van-icon name="chat-o" size="20" />
               </div>
            </template>
          </van-cell>
          
          <template #right>
            <van-button 
              square 
              text="删除" 
              type="danger" 
              class="h-full" 
              @click="handleDelete(item.id)"
            />
          </template>
        </van-swipe-cell>
      </div>
    </div>

    <van-dialog 
      v-model:show="showRename" 
      title="修改标题" 
      show-cancel-button
      :before-close="onRenameConfirm"
    >
      <div class="p-4">
        <van-field
          v-model="renameValue"
          placeholder="请输入新的会话标题"
          border
          class="bg-gray-50 rounded-md"
        />
      </div>
    </van-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useChatStore } from '../../stores/chatStore';
import { showDialog, showToast } from 'vant';

const router = useRouter();
const chatStore = useChatStore();

const loading = ref(false);
const showRename = ref(false);
const renameValue = ref('');
const currentEditId = ref<number | null>(null);

const onClickLeft = () => {
  router.push('/user');
};

const formatTime = (timeStr: string) => {
  if (!timeStr) return '';
  const date = new Date(timeStr);
  return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
};

const toChat = (id: number) => {
  router.push({ path: '/chat', query: { id } });
};

const openRenameDialog = (item: any) => {
  currentEditId.value = item.id;
  renameValue.value = item.title;
  showRename.value = true;
};

const onRenameConfirm = async (action: string) => {
  if (action === 'confirm') {
    if (!renameValue.value.trim()) {
      showToast('标题不能为空');
      return false;
    }
    if (currentEditId.value !== null) {
      const success = await chatStore.updateConversationTitle(currentEditId.value, renameValue.value);
      if (success) return true;
      return false;
    }
  }
  return true;
};

const handleDelete = (id: number) => {
  showDialog({
    title: '确认删除',
    message: '删除后无法恢复，确定要删除该会话吗？',
    showCancelButton: true,
  }).then(async () => {
    await chatStore.deleteConversation(id);
  }).catch(() => {});
};

onMounted(async () => {
  loading.value = true;
  await chatStore.fetchHistory();
  loading.value = false;
});
</script>

<style scoped>
:deep(.van-nav-bar .van-icon),
:deep(.van-nav-bar__text) {
  color: #4f46e5;
}
:deep(.van-swipe-cell__right) {
  display: flex;
  align-items: center;
}
</style>