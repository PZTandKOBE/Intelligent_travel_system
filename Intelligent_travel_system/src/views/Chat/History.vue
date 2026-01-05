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

// 打开弹窗
const openRenameDialog = (item: any) => {
  console.log('点击编辑，当前项:', item);
  if (!item || !item.id) {
    showToast('数据异常：无法获取会话ID');
    return;
  }
  currentEditId.value = item.id;
  renameValue.value = item.title;
  showRename.value = true;
};

// 确认修改（核心逻辑）
const onRenameConfirm = async (action: string) => {
  console.log('触发 onRenameConfirm, action:', action);
  
  if (action === 'confirm') {
    // 1. 校验非空
    if (!renameValue.value.trim()) {
      showToast('标题不能为空');
      return false; // 阻止关闭，停止转圈（Vant机制）
    }

    // 2. 校验ID
    if (currentEditId.value === null) {
      console.error('错误：currentEditId 为 null');
      showToast('系统错误：ID丢失');
      return true; // 关闭弹窗
    }

    console.log(`准备发起请求: ID=${currentEditId.value}, 新标题=${renameValue.value}`);
    
    try {
      // 3. 调用接口
      const success = await chatStore.updateConversationTitle(currentEditId.value, renameValue.value);
      console.log('接口调用结果:', success);

      if (success) {
        return true; // 成功，关闭弹窗
      } else {
        return false; // 失败，保持弹窗（通常 store 内部已经报了错）
      }
    } catch (error) {
      // 4. 捕获所有异常
      console.error('发生未知错误:', error);
      showToast('请求发生异常');
      return false; // 停止转圈，保持弹窗
    }
  }
  
  return true; // 取消操作，直接关闭
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