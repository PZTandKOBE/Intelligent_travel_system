<template>
  <div class="min-h-screen bg-white flex flex-col justify-center px-8 relative overflow-hidden">
    
    <div class="absolute -top-20 -right-20 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-50"></div>
    <div class="absolute -bottom-20 -left-20 w-64 h-64 bg-pink-50 rounded-full blur-3xl opacity-50"></div>

    <div class="mb-10 text-center relative z-10">
      <div class="w-20 h-20 bg-indigo-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg mb-6 transform rotate-3">
        <span class="text-4xl">🏮</span>
      </div>
      <h1 class="text-3xl font-bold text-gray-900 tracking-tight">非遗伴游</h1>
      <p class="text-gray-400 mt-2 text-sm">{{ isRegister ? '注册账号开启文化之旅' : '欢迎回来，继续探索非遗' }}</p>
    </div>

    <div class="space-y-5 relative z-10">
      
      <div class="bg-gray-50 rounded-xl px-4 py-3 border border-gray-100 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:bg-white transition-all">
        <label class="block text-xs text-gray-400 mb-1">邮箱 Email</label>
        <input 
          v-model="form.email" 
          type="email" 
          class="w-full bg-transparent outline-none text-gray-800 font-medium placeholder-gray-300"
          placeholder="name@example.com"
        />
      </div>

      <div v-if="isRegister" class="flex gap-3">
        <div class="flex-1 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:bg-white transition-all">
          <label class="block text-xs text-gray-400 mb-1">验证码 Code</label>
          <input 
            v-model="form.code" 
            type="text" 
            class="w-full bg-transparent outline-none text-gray-800 font-medium placeholder-gray-300"
            placeholder="6位验证码"
            maxlength="6"
          />
        </div>
        <button 
          @click="handleSendCode"
          :disabled="codeTimer > 0 || !form.email"
          :class="[
            'w-28 rounded-xl font-medium text-xs shadow-sm transition-all flex items-center justify-center',
            codeTimer > 0 
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
              : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
          ]"
        >
          {{ codeTimer > 0 ? `${codeTimer}s后重发` : '获取验证码' }}
        </button>
      </div>

      <div class="bg-gray-50 rounded-xl px-4 py-3 border border-gray-100 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:bg-white transition-all">
        <label class="block text-xs text-gray-400 mb-1">密码 Password</label>
        <input 
          v-model="form.password" 
          type="password" 
          class="w-full bg-transparent outline-none text-gray-800 font-medium placeholder-gray-300"
          placeholder="••••••••"
          @keyup.enter="handleSubmit"
        />
      </div>

      <button 
        @click="handleSubmit"
        :disabled="loading"
        class="w-full bg-indigo-600 text-white rounded-xl py-3.5 font-bold text-lg shadow-indigo-200 shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
      >
        <van-loading v-if="loading" type="spinner" size="20px" color="#fff" />
        <span v-else>{{ isRegister ? '注册账号' : '立即登录' }}</span>
      </button>

      <div class="text-center mt-6">
        <p class="text-sm text-gray-500">
          {{ isRegister ? '已有账号？' : '还没有账号？' }}
          <span 
            @click="toggleMode" 
            class="text-indigo-600 font-bold cursor-pointer hover:underline"
          >
            {{ isRegister ? '去登录' : '去注册' }}
          </span>
        </p>
      </div>
    </div>

    <div class="mt-auto pt-10 text-center">
      <p class="text-xs text-gray-300">
        登录即代表同意《用户协议》与《隐私政策》
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../../stores/userStore';
import { showToast } from 'vant';

const router = useRouter();
const userStore = useUserStore();

const isRegister = ref(false); // 当前是否为注册模式
const loading = ref(false);
const codeTimer = ref(0); // 倒计时秒数
let timerInterval: any = null;

const form = reactive({
  email: '',
  password: '',
  code: ''
});

// 切换模式
const toggleMode = () => {
  isRegister.value = !isRegister.value;
  // 切换时不清除 email，方便用户，但清除密码和验证码
  form.password = '';
  form.code = '';
};

// 发送验证码
const handleSendCode = async () => {
  if (!form.email || !form.email.includes('@')) {
    showToast('请输入正确的邮箱地址');
    return;
  }
  
  // 调用 Store 发送验证码
  const success = await userStore.sendCode(form.email);
  
  if (success) {
    // 开启倒计时
    codeTimer.value = 60;
    timerInterval = setInterval(() => {
      codeTimer.value--;
      if (codeTimer.value <= 0) {
        clearInterval(timerInterval);
      }
    }, 1000);
  }
};

// 组件销毁前清除定时器，防止内存泄漏
onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval);
});

// 表单验证
const validate = () => {
  if (!form.email) return showToast('请输入邮箱') && false;
  if (!form.password) return showToast('请输入密码') && false;
  if (isRegister.value && !form.code) return showToast('请输入验证码') && false;
  return true;
};

// 提交表单
const handleSubmit = async () => {
  if (!validate()) return;
  
  loading.value = true;
  
  try {
    let success = false;
    if (isRegister.value) {
      // 注册流程
      success = await userStore.register({
        email: form.email,
        password: form.password,
        code: form.code
      });
      if (success) {
        // 注册成功，切换回登录模式，让用户登录
        isRegister.value = false;
        form.password = '';
        form.code = '';
      }
    } else {
      // 登录流程
      success = await userStore.login({
        email: form.email,
        password: form.password
      });
      if (success) {
        // 登录成功，跳转到 Chat 页
        router.replace('/chat');
      }
    }
  } finally {
    loading.value = false;
  }
};
</script>