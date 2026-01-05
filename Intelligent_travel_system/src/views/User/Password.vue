<template>
  <div class="min-h-screen bg-gray-50">
    <van-nav-bar
      title="修改密码"
      left-text="返回"
      left-arrow
      fixed
      placeholder
      @click-left="onClickLeft"
    />

    <div class="mt-4 px-2">
      <van-form @submit="onSubmit">
        <div class="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
          <van-field
            v-model="form.oldPassword"
            type="password"
            name="oldPassword"
            label="原密码"
            placeholder="请输入原密码"
            :rules="[{ required: true, message: '请填写原密码' }]"
          />
          <van-field
            v-model="form.newPassword"
            type="password"
            name="newPassword"
            label="新密码"
            placeholder="8-20位，建议包含字母和数字"
            :rules="[
              { required: true, message: '请填写新密码' },
              { validator: validatorPassword, message: '密码长度需为8-20位' }
            ]"
          />
          <van-field
            v-model="form.confirmPassword"
            type="password"
            name="confirmPassword"
            label="确认密码"
            placeholder="请再次输入新密码"
            :rules="[
              { required: true, message: '请确认新密码' },
              { validator: validatorSame, message: '两次输入的密码不一致' }
            ]"
          />
        </div>

        <div class="px-4">
          <van-button 
            round 
            block 
            type="primary" 
            native-type="submit"
            color="#4f46e5"
            :loading="loading"
            loading-text="提交中..."
          >
            确认修改
          </van-button>
        </div>
      </van-form>

      <p class="text-center text-gray-400 text-xs mt-6">
        修改密码后需要重新登录以验证身份
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../../stores/userStore';
import { showToast } from 'vant';

const router = useRouter();
const userStore = useUserStore();
const loading = ref(false);

const form = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
});

const onClickLeft = () => {
  router.back();
};

// 校验密码长度 (8-20位)
const validatorPassword = (val: string) => {
  return val.length >= 8 && val.length <= 20;
};

// 校验两次密码是否一致
const validatorSame = (val: string) => {
  return val === form.newPassword;
};

const onSubmit = async () => {
  // 二次校验，防止空值提交（虽然 van-form rules 已经挡住了）
  if (!form.oldPassword || !form.newPassword || !form.confirmPassword) {
    showToast('请填写完整信息');
    return;
  }

  loading.value = true;
  try {
    const success = await userStore.updatePassword({
      oldPassword: form.oldPassword,
      newPassword: form.newPassword,
      confirmPassword: form.confirmPassword
    });
    
    // 如果 Store 返回 true，说明修改成功并正在跳转/登出，不需要取消 loading
    if (!success) {
      loading.value = false;
    }
  } catch (error) {
    loading.value = false;
    showToast('网络请求异常');
  }
};
</script>

<style scoped>
:deep(.van-nav-bar .van-icon),
:deep(.van-nav-bar__text) {
  color: #4f46e5;
}
</style>