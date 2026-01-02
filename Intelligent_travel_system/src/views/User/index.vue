<template>
  <div class="min-h-screen bg-gray-50 pb-20">
    <van-nav-bar title="个人中心" fixed placeholder />

    <div class="bg-indigo-600 px-6 pt-10 pb-16 text-white relative overflow-hidden">
      <div class="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full transform translate-x-10 -translate-y-10"></div>
      
      <div class="flex items-center gap-4 relative z-10">
        <div class="w-16 h-16 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center overflow-hidden">
          <img v-if="userStore.userInfo?.userAvatar" :src="userStore.userInfo.userAvatar" class="w-full h-full object-cover" />
          <span v-else class="text-3xl">👤</span>
        </div>
        <div class="flex-1">
          <h2 class="text-xl font-bold mb-1">{{ userStore.userInfo?.userName || '未登录' }}</h2>
          <p class="text-indigo-200 text-sm">{{ userStore.userInfo?.email || '点击登录开启旅程' }}</p>
        </div>
      </div>
    </div>

    <div class="px-4 -mt-8 relative z-20">
      <div class="bg-white rounded-xl shadow-sm overflow-hidden mb-4">
        <van-cell-group :border="false">
          <van-cell title="编辑资料" is-link icon="edit" @click="openEditModal" />
          <van-cell title="我的游览报告" is-link icon="orders-o" to="/user/document" />
        </van-cell-group>
      </div>

      <div class="bg-white rounded-xl shadow-sm overflow-hidden mb-4">
        <van-cell-group :border="false">
          <van-cell title="历史会话" is-link icon="chat-o" to="/chat/history" />
          <van-cell title="关于我们" is-link icon="info-o" @click="showAbout = true" />
          <van-cell title="意见反馈" is-link icon="comment-o" @click="handleFeedback" />
        </van-cell-group>
      </div>

      <div class="px-2 mt-8">
        <van-button block color="#ee0a24" plain @click="handleLogout">退出登录</van-button>
      </div>
    </div>

    <van-dialog v-model:show="showEdit" title="编辑资料" show-cancel-button @confirm="handleSaveProfile">
      <div class="p-4 space-y-4">
        <div class="flex flex-col items-center mb-4">
           <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-2">
             <img v-if="editForm.avatar" :src="editForm.avatar" class="w-full h-full rounded-full object-cover"/>
             <span v-else class="text-2xl text-gray-400">📷</span>
           </div>
           <p class="text-xs text-gray-400">头像上传功能开发中</p>
        </div>
        <van-field v-model="editForm.nickname" label="昵称" placeholder="请输入新昵称" input-align="right" />
      </div>
    </van-dialog>

    <van-dialog v-model:show="showAbout" title="关于非遗伴游">
      <div class="p-6 text-center text-gray-600 text-sm leading-relaxed">
        <p class="mb-4">非遗文化智能伴游系统</p>
        <p>版本 v1.0.0</p>
        <p class="mt-4 text-xs text-gray-400">
          致力于通过 AI 技术<br>带您领略中华非物质文化遗产的魅力
        </p>
      </div>
    </van-dialog>

    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../../stores/userStore';
import { showToast, showDialog } from 'vant';

const router = useRouter();
const userStore = useUserStore();

const showEdit = ref(false);
const showAbout = ref(false);

const editForm = reactive({
  nickname: '',
  avatar: ''
});

onMounted(() => {
  // 进来时获取最新信息
  userStore.fetchUserInfo();
});

const openEditModal = () => {
  if (!userStore.userInfo) return showToast('请先登录');
  editForm.nickname = userStore.userInfo.userName || '';
  editForm.avatar = userStore.userInfo.userAvatar || '';
  showEdit.value = true;
};

const handleSaveProfile = async () => {
  if (!editForm.nickname) {
    showToast('昵称不能为空');
    return;
  }
  // 调用 Store 更新
  const success = await userStore.updateProfile(editForm.nickname, editForm.avatar);
  if (success) {
    showEdit.value = false;
  }
};

const handleFeedback = () => {
  showToast('该功能暂未开放');
};

const handleLogout = () => {
  showDialog({
    title: '提示',
    message: '确定要退出登录吗？',
    showCancelButton: true,
  }).then(() => {
    userStore.logout();
    router.replace('/login');
  }).catch(() => {});
};
</script>