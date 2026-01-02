<template>
  <div class="min-h-screen bg-gray-50 pb-10">
    <van-nav-bar title="个人中心" left-arrow @click-left="$router.back()" fixed placeholder />

    <div class="bg-white p-6 mb-4">
      <div class="flex items-center">
        <div class="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-2xl border-2 border-indigo-50 overflow-hidden">
          <img v-if="userStore.userInfo?.avatar" :src="userStore.userInfo.avatar" class="w-full h-full object-cover" />
          <span v-else>👤</span>
        </div>
        
        <div class="ml-4 flex-1">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-bold text-gray-800">
              {{ userStore.userInfo?.nickname || '非遗探索者' }}
            </h2>
            <span class="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
              ID: {{ userStore.userInfo?.id || '---' }}
            </span>
          </div>
          <p class="text-sm text-gray-500 mt-1">{{ userStore.userInfo?.email || 'email@example.com' }}</p>
        </div>
      </div>
    </div>

    <div class="space-y-3 px-4">
      
      <div class="bg-white rounded-xl overflow-hidden shadow-sm">
        <van-cell title="修改资料" is-link icon="edit" @click="showEditDialog = true" />
        <van-cell title="我的游览报告" is-link icon="description" label="查看 AI 生成的 PDF 行程单" to="/user/document" />
        <van-cell title="历史会话" is-link icon="chat-o" to="/chat/history" />
      </div>

      <div class="bg-white rounded-xl overflow-hidden shadow-sm">
        <van-cell title="关于我们" is-link icon="info-o" />
        <van-cell title="意见反馈" is-link icon="comment-o" />
      </div>

      <button 
        @click="handleLogout"
        class="w-full bg-white text-red-500 font-medium py-3.5 rounded-xl shadow-sm hover:bg-gray-50 active:scale-95 transition-all mt-6"
      >
        退出登录
      </button>
    </div>

    <van-dialog v-model:show="showEditDialog" title="修改资料" show-cancel-button @confirm="handleUpdateProfile">
      <div class="p-4 bg-gray-50">
        <div class="bg-white px-3 py-2 rounded-lg border border-gray-200">
          <input 
            v-model="editForm.nickname" 
            type="text" 
            placeholder="请输入新的昵称"
            class="w-full text-sm outline-none"
          />
        </div>
      </div>
    </van-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../../stores/userStore';
import { showDialog } from 'vant';

const router = useRouter();
const userStore = useUserStore();

const showEditDialog = ref(false);
const editForm = reactive({
  nickname: ''
});

onMounted(() => {
  // 确保进入页面时有最新的用户信息
  userStore.fetchUserInfo();
  if (userStore.userInfo?.nickname) {
    editForm.nickname = userStore.userInfo.nickname;
  }
});

const handleUpdateProfile = async () => {
  if (!editForm.nickname.trim()) return;
  await userStore.updateProfile(editForm.nickname);
};

const handleLogout = () => {
  showDialog({
    title: '提示',
    message: '确定要退出登录吗？',
    showCancelButton: true,
  }).then(async (action) => {
    if (action === 'confirm') {
      await userStore.logout();
      router.replace('/login');
    }
  });
};
</script>

<style scoped>
/* Vant 样式覆盖 (可选) */
:deep(.van-cell__left-icon) {
  color: #4f46e5; /* Indigo-600 */
}
</style>