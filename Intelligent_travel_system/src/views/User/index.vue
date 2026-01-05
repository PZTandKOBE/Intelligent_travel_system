<template>
  <div class="min-h-screen bg-gray-50 pb-20">
    <van-nav-bar
      title="个人中心"
      left-text="返回"
      left-arrow
      fixed
      placeholder
      @click-left="onClickLeft"
    />

    <div class="bg-indigo-600 text-white pt-8 pb-12 px-6 rounded-b-[2rem] shadow-lg relative overflow-hidden">
      <div class="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full transform translate-x-10 -translate-y-10"></div>
      
      <div class="relative z-10 flex items-center space-x-4">
        <div class="w-20 h-20 rounded-full border-4 border-white/30 overflow-hidden bg-white/20 backdrop-blur-sm shadow-inner">
          <img 
            :src="userStore.userInfo?.userAvatar || defaultAvatar" 
            class="w-full h-full object-cover"
            alt="User Avatar"
          />
        </div>
        
        <div class="flex-1">
          <template v-if="userStore.userInfo">
            <h2 class="text-2xl font-bold">{{ userStore.userInfo.userName }}</h2>
            <p class="text-indigo-100 text-sm mt-1 opacity-90">{{ userStore.userInfo.email }}</p>
          </template>
          <template v-else>
            <h2 class="text-xl font-bold" @click="router.push('/login')">未登录</h2>
            <p class="text-indigo-200 text-sm mt-1">点击登录体验更多功能</p>
          </template>
        </div>

        <button 
          v-if="userStore.userInfo"
          @click="openEditDialog"
          class="bg-white/20 hover:bg-white/30 p-2 rounded-full transition-colors backdrop-blur-md"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
      </div>
    </div>

    <div class="px-4 -mt-6 relative z-20">
      <div class="bg-white rounded-xl shadow-sm overflow-hidden mb-4">
        <van-cell title="我的游览报告" is-link to="/user/documents" icon="orders-o" size="large" />
        <van-cell title="历史会话" is-link to="/chat/history" icon="chat-o" size="large" />
        <van-cell title="修改密码" is-link to="/user/password" icon="lock" size="large" />
      </div>

      <div class="bg-white rounded-xl shadow-sm overflow-hidden" v-if="userStore.userInfo">
        <van-cell title="退出登录" @click="handleLogout" icon="revoke" class="text-red-500" size="large" center />
      </div>
    </div>

    <van-dialog 
      v-model:show="showEditDialog" 
      title="编辑资料" 
      show-cancel-button
      :before-close="onBeforeClose"
    >
      <div class="p-6 flex flex-col items-center space-y-6">
        <van-uploader :after-read="onAvatarUpload" max-count="1" :show-upload="false">
           <div class="relative group cursor-pointer">
              <div class="w-24 h-24 rounded-full overflow-hidden border-2 border-gray-200">
                <img 
                  :src="editForm.userAvatar || userStore.userInfo?.userAvatar || defaultAvatar" 
                  class="w-full h-full object-cover"
                />
              </div>
              <div class="absolute inset-0 bg-black/40 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                <span class="text-white text-xs">更换头像</span>
              </div>
           </div>
        </van-uploader>

        <van-field
          v-model="editForm.userName"
          label="昵称"
          placeholder="请输入新昵称"
          input-align="right"
          border
        />
      </div>
    </van-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../../stores/userStore';
import { showToast, showDialog } from 'vant';

const router = useRouter();
const userStore = useUserStore();
const defaultAvatar = 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png';

const showEditDialog = ref(false);
const editForm = reactive({
  userName: '',
  userAvatar: ''
});

const onClickLeft = () => {
  router.push('/');
};

onMounted(() => {
  if (!userStore.userInfo) {
    userStore.fetchUserInfo();
  }
});

const openEditDialog = () => {
  if (userStore.userInfo) {
    editForm.userName = userStore.userInfo.userName;
    editForm.userAvatar = userStore.userInfo.userAvatar || '';
    showEditDialog.value = true;
  }
};

const onAvatarUpload = async (file: any) => {
  showToast({ message: '上传中...', type: 'loading' });
  const url = await userStore.uploadFile(file.file);
  if (url) {
    editForm.userAvatar = url;
    showToast('上传成功');
  }
};

const onBeforeClose = async (action: string) => {
  if (action === 'confirm') {
    if (!editForm.userName.trim()) {
      showToast('昵称不能为空');
      return false;
    }
    
    const success = await userStore.updateProfile(editForm.userName, editForm.userAvatar);
    if (success) {
      return true;
    } else {
      return false;
    }
  }
  return true;
};

const handleLogout = () => {
  showDialog({
    title: '提示',
    message: '确定要退出登录吗？',
    showCancelButton: true,
  }).then(() => {
    userStore.logout();
  }).catch(() => {});
};
</script>

<style scoped>
:deep(.van-nav-bar__content) {
  background-color: transparent;
}
:deep(.van-nav-bar .van-icon) {
  color: #4f46e5;
}
:deep(.van-nav-bar__text) {
  color: #4f46e5;
}
</style>