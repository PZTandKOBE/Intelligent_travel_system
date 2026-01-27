<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { useGameStore } from '../../stores/gameStore';
import { useRouter } from 'vue-router';
import { showLoadingToast } from 'vant';

const gameStore = useGameStore();
const router = useRouter();

// 内部状态
const selectedAnswer = ref<string>('');
const showResultModal = ref(false); // 单题结果弹窗
const currentResult = ref<any>(null); // 单题结果数据

// 游戏设置
const gameMode = ref('normal'); 
const projectName = ref(''); 
const rankingTab = ref<'weekly' | 'monthly'>('weekly'); 

// 计时器
const timeSpent = ref(0);
let timer: any = null;

onMounted(() => {
  gameStore.fetchRankings('weekly');
});

watch(rankingTab, (newVal) => {
  gameStore.fetchRankings(newVal);
});

const handleStartGame = async () => {
  const toast = showLoadingToast({
    message: '准备题库中...',
    forbidClick: true,
    duration: 0 // 持续展示
  });
  const success = await gameStore.startGame(gameMode.value, 1, projectName.value);
  toast.close();
  if (success) {
    startTimer();
  }
};

const handleBack = () => {
  router.back();
};

const startTimer = () => {
  timeSpent.value = 0;
  clearInterval(timer);
  timer = setInterval(() => {
    timeSpent.value++;
  }, 1000);
};

const handleOptionSelect = (opt: string) => {
  selectedAnswer.value = opt;
};

const submit = async () => {
  if (!selectedAnswer.value) return;
  
  clearInterval(timer);
  const toast = showLoadingToast({
    message: '提交答案中...',
    forbidClick: true,
  });
  const result = await gameStore.submitAnswer(selectedAnswer.value, timeSpent.value);
  toast.close();
  
  if (result) {
    currentResult.value = result;
    showResultModal.value = true;
  }
};

const next = () => {
  showResultModal.value = false;
  selectedAnswer.value = '';
  currentResult.value = null;
  
  const hasNext = gameStore.nextQuestion();
  if (hasNext) {
    startTimer();
  } else {
    gameStore.completeGame();
  }
};

// 工具：数字转字母 (0->A, 1->B)
const indexToChar = (i: number) => String.fromCharCode(65 + i);

// 🛠️ 工具：格式化正确率显示
const formatAccuracy = (val: number) => {
  if (!val) return '0%';
  if (val > 1) return val.toFixed(0) + '%';
  return (val * 100).toFixed(0) + '%';
};

const modeOptions = [
  { text: '普通模式', value: 'normal', icon: '🌟', desc: '经典玩法，轻松挑战' },
  { text: '挑战模式', value: 'challenge', icon: '🔥', desc: '限时答题，更高难度' },
  { text: '每日一练', value: 'daily', icon: '📅', desc: '每天更新，保持手感' },
];

const currentModeDesc = computed(() => {
  return modeOptions.find(m => m.value === gameMode.value)?.desc || '';
});
</script>

<template>
  <div class="h-screen flex flex-col bg-slate-50 font-sans relative overflow-hidden">
    <div class="absolute inset-0 pointer-events-none overflow-hidden z-0">
      <div class="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-blue-200/30 rounded-full blur-3xl"></div>
      <div class="absolute top-1/4 -right-1/4 w-2/3 h-2/3 bg-indigo-200/30 rounded-full blur-3xl"></div>
    </div>

    <div v-if="!gameStore.isPlaying && !gameStore.lastResult" class="flex flex-col h-full z-10 relative">
      <div class="bg-gradient-to-br from-blue-600 to-indigo-700 pb-8 pt-safe-top rounded-b-[3rem] shadow-xl relative overflow-hidden">
        <div class="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDQwIDQwIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJYbGUgY3g9IjIwIiBjeT0iMjAiIHI9IjIiIGZpbGw9IiNGRkZGRkYiLz48L2c+PC9zdmc+')]"></div>
        
        <van-nav-bar
          title="非遗知识大闯关"
          left-text="返回"
          left-arrow
          @click-left="handleBack"
          class="bg-transparent text-white border-none forced-white-nav"
          :border="false"
        />

        <div class="px-6 mt-2 text-white">
          <h1 class="text-2xl font-bold mb-1">准备好挑战了吗？</h1>
          <p class="text-blue-100 text-sm opacity-90">答题赢积分，解锁更多非遗奥秘！</p>
        </div>
      </div>

      <div class="flex-1 overflow-hidden flex flex-col px-4 -mt-6">
        <div class="bg-white/90 backdrop-blur-md rounded-2xl p-5 shadow-lg mb-4 relative z-10 border border-white/50">
          <div class="mb-5">
            <div class="text-sm text-gray-600 mb-3 font-bold flex items-center">
              <span class="mr-1">🎮</span> 选择模式
            </div>
            <div class="grid grid-cols-3 gap-3">
              <div 
                v-for="mode in modeOptions" 
                :key="mode.value"
                @click="gameMode = mode.value"
                :class="[
                  'flex flex-col items-center justify-center p-3 rounded-xl transition-all cursor-pointer border-2',
                  gameMode === mode.value 
                    ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-md scale-[1.02]' 
                    : 'bg-gray-50 border-transparent text-gray-500 hover:bg-gray-100 hover:border-gray-200'
                ]"
              >
                <span class="text-2xl mb-1">{{ mode.icon }}</span>
                <span class="text-xs font-bold">{{ mode.text }}</span>
              </div>
            </div>
            <p class="text-xs text-gray-400 mt-2 text-center">{{ currentModeDesc }}</p>
          </div>

          <div class="mb-5">
            <div class="text-sm text-gray-600 mb-3 font-bold flex items-center">
              <span class="mr-1">🎯</span> 指定项目 (可选)
            </div>
            <div class="flex items-center bg-gray-50/80 rounded-xl px-4 py-2 border border-gray-200 focus-within:border-blue-400 transition-colors">
              <span class="text-lg mr-3 text-gray-400">🔍</span>
              <input 
                v-model="projectName" 
                type="text" 
                placeholder="输入非遗名称，如：剪纸"
                class="w-full bg-transparent border-none outline-none text-sm py-1 text-gray-700 placeholder-gray-400"
              />
            </div>
          </div>

          <button 
            @click="handleStartGame" 
            class="w-full bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-orange-200/50 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-lg"
          >
            <span>🚀</span> 立即挑战
          </button>
        </div>

        <div class="bg-white/90 backdrop-blur-md flex-1 rounded-2xl shadow-lg flex flex-col overflow-hidden border border-white/50 mb-safe-bottom">
          <div class="border-b border-gray-100">
            <van-tabs v-model:active="rankingTab" shrink animated color="#2563eb" title-active-color="#2563eb" line-width="40px" class="ranking-tabs">
              <van-tab title="🏆 本周榜单" name="weekly"></van-tab>
              <van-tab title="📅 月度榜单" name="monthly"></van-tab>
            </van-tabs>
          </div>
          
          <div class="bg-blue-50/50 px-4 py-2 flex justify-between items-center text-xs text-gray-500 border-b border-blue-100/50">
             <span>我的排名: <b class="text-blue-600 text-sm">{{ gameStore.myRank ? `第 ${gameStore.myRank} 名` : '未上榜' }}</b></span>
             <span v-if="gameStore.myRank" class="text-orange-500">加油，再接再厉！</span>
          </div>

          <div class="flex-1 overflow-y-auto custom-scrollbar">
            <van-empty v-if="gameStore.rankingList.length === 0" description="暂无排名数据" image="https://gw.alipayobjects.com/zos/antfincdn/ZHrcdLPrvN/empty.svg" />
            <div 
              v-else
              v-for="(item, idx) in gameStore.rankingList" 
              :key="item.userId" 
              class="flex items-center py-3 px-4 border-b border-gray-50 last:border-0 hover:bg-gray-50/80 transition-colors relative"
            >
               <div class="w-8 flex justify-center">
                 <span v-if="item.rank === 1" class="text-2xl">🥇</span>
                 <span v-else-if="item.rank === 2" class="text-2xl">🥈</span>
                 <span v-else-if="item.rank === 3" class="text-2xl">🥉</span>
                 <span v-else class="text-gray-400 font-bold text-sm italic">{{ item.rank }}</span>
               </div>
               
               <div class="relative mx-3">
                 <img :src="item.avatar || 'https://via.placeholder.com/40'" class="w-11 h-11 rounded-full bg-gray-200 object-cover border-2 border-white shadow-sm" />
                 <div v-if="item.rank <= 3" class="absolute -bottom-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                   <span class="text-[10px]">👑</span>
                 </div>
               </div>
               
               <div class="flex-1">
                 <div class="font-bold text-gray-800 text-[15px] line-clamp-1">{{ item.username }}</div>
                 <div class="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                   <span class="bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-md font-medium">Lv.{{ item.level }}</span>
                   <span>胜率 {{ (item.bestAccuracy * 100).toFixed(0) }}%</span>
                 </div>
               </div>
               
               <div class="font-black text-blue-600 text-base">{{ item.points }} <span class="text-xs font-normal text-gray-500">分</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="gameStore.isPlaying && gameStore.currentQuestion" class="flex flex-col h-full bg-slate-100 z-10 relative">
      <van-nav-bar
        :title="`第 ${gameStore.currentQuestionIndex + 1} 题`"
        left-arrow
        @click-left="handleBack"
        class="bg-white text-gray-800"
        fixed
        placeholder
      >
        <template #right>
          <div class="bg-blue-50 border border-blue-100 rounded-full px-3 py-1 text-sm text-blue-600 flex items-center gap-1 font-mono font-bold">
            ⏱️ {{ timeSpent }}s
          </div>
        </template>
      </van-nav-bar>

      <div class="flex-1 p-5 flex flex-col justify-center max-w-lg mx-auto w-full">
        <div class="bg-white p-6 rounded-2xl shadow-lg border border-white relative overflow-hidden">
          <div class="absolute top-0 left-0 h-1 bg-blue-500 transition-all duration-300" :style="{ width: `${((gameStore.currentQuestionIndex + 1) / (gameStore.currentSession?.totalQuestions || 5)) * 100}%` }"></div>
          
          <h2 class="text-lg font-bold text-gray-800 mb-8 leading-relaxed pt-4">
            <span class="text-blue-500 mr-2">Q.</span>
            {{ gameStore.currentQuestion.questionText }}
          </h2>
          
          <div class="space-y-3">
            <button 
              v-for="(opt, idx) in gameStore.currentQuestion.options" 
              :key="idx"
              @click="handleOptionSelect(indexToChar(idx))"
              :class="[
                'w-full text-left p-4 rounded-xl border-2 transition-all active:scale-[0.98] flex items-center',
                selectedAnswer === indexToChar(idx) 
                  ? 'border-blue-500 bg-blue-50/80 text-blue-700 font-bold shadow-sm' 
                  : 'border-gray-100 bg-gray-50 text-gray-600 hover:bg-gray-100 hover:border-gray-300'
              ]"
            >
              <span 
                :class="[
                  'inline-flex items-center justify-center w-8 h-8 rounded-full mr-3 font-bold text-sm transition-colors',
                  selectedAnswer === indexToChar(idx) ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'
                ]"
              >
                {{ indexToChar(idx) }}
              </span> 
              <span class="flex-1">{{ opt.replace(/^[A-Z]\./, '') }}</span>
            </button>
          </div>
        </div>
        
        <button 
          @click="submit"
          :disabled="!selectedAnswer"
          class="mt-8 w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-200/50 disabled:from-gray-300 disabled:to-gray-400 disabled:shadow-none disabled:cursor-not-allowed transition-all active:scale-[0.98] text-lg"
        >
          提交答案
        </button>
      </div>
    </div>

    <div v-else-if="gameStore.lastResult" class="h-full flex flex-col items-center justify-center p-6 bg-white z-10 relative overflow-hidden">
       <div class="absolute inset-0 pointer-events-none">
         <div class="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-yellow-200/30 rounded-full blur-3xl animate-pulse"></div>
       </div>
       
       <div class="text-8xl mb-4 animate-bounce drop-shadow-lg">🎉</div>
       <h2 class="text-3xl font-black text-gray-800 mb-2">挑战完成！</h2>
       <p class="text-gray-500 mb-10">本次挑战总得分</p>
       
       <div class="relative mb-12">
         <div class="text-[8rem] font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 leading-none tracking-tighter drop-shadow-sm">
           {{ gameStore.lastResult.totalScore }}
         </div>
         <div class="absolute -right-8 top-4 text-2xl font-bold text-gray-400">分</div>
       </div>
       
       <div class="grid grid-cols-2 gap-5 w-full mb-12 max-w-sm">
         <div class="bg-gray-50 p-5 rounded-2xl text-center border border-gray-100 shadow-sm">
           <div class="text-gray-400 text-sm mb-2 font-medium">正确率</div>
           <div class="font-black text-2xl text-blue-600">{{ formatAccuracy(gameStore.lastResult.accuracy) }}</div>
         </div>
         <div class="bg-gray-50 p-5 rounded-2xl text-center border border-gray-100 shadow-sm">
           <div class="text-gray-400 text-sm mb-2 font-medium">用时</div>
           <div class="font-black text-2xl text-orange-500">{{ gameStore.lastResult.timeSpent }}s</div>
         </div>
       </div>

       <div class="flex flex-col w-full max-w-sm gap-3">
         <button @click="handleStartGame" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-md transition-colors text-lg">
           再来一局
         </button>
         <button @click="gameStore.lastResult = null" class="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-4 rounded-xl transition-colors">
           返回首页
         </button>
       </div>
    </div>

    <div v-if="showResultModal" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50 transition-opacity">
       <div class="bg-white w-full max-w-sm rounded-[2rem] p-6 animate-bounce-in shadow-2xl relative overflow-hidden">
          <div :class="['absolute top-0 left-0 right-0 h-2', currentResult?.correct ? 'bg-green-500' : 'bg-red-500']"></div>
          
          <div class="text-center mb-5 mt-2">
             <div v-if="currentResult?.correct" class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 text-5xl mb-3 shadow-sm animate-scale-in">✅</div>
             <div v-else class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 text-5xl mb-3 shadow-sm animate-scale-in">❌</div>
             
             <h3 class="text-2xl font-black text-gray-800">
               {{ currentResult?.correct ? '回答正确!' : '回答错误' }}
             </h3>
             <p v-if="currentResult?.correct" class="text-green-600 font-bold text-lg mt-1">+{{ currentResult.points }} 积分</p>
             <p v-else class="text-gray-400 font-medium mt-1">正确答案是: <span class="text-blue-600 font-bold">{{ currentResult.correctAnswer }}</span></p>
          </div>

          <div class="bg-yellow-50/80 p-5 rounded-2xl text-[15px] text-yellow-900 mb-6 leading-relaxed border border-yellow-100/50 relative">
            <span class="absolute top-3 left-3 text-2xl opacity-20">💡</span>
            <div class="font-bold mb-2 pl-8">解析：</div>
            <div class="pl-8 opacity-90">{{ currentResult?.explanation }}</div>
          </div>

          <button @click="next" :class="['w-full py-3.5 rounded-xl font-bold shadow-lg text-white transition-all active:scale-[0.98] text-lg', currentResult?.correct ? 'bg-green-500 hover:bg-green-600 shadow-green-200/50' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200/50']">
            {{ gameStore.currentQuestionIndex >= (gameStore.currentSession?.totalQuestions || 5) -1 ? '查看总成绩' : '下一题' }}
          </button>
       </div>
    </div>
  </div>
</template>

<style scoped>
/* 安全区域适配 */
.pt-safe-top {
  padding-top: constant(safe-area-inset-top);
  padding-top: env(safe-area-inset-top);
}
.mb-safe-bottom {
  margin-bottom: constant(safe-area-inset-bottom);
  margin-bottom: env(safe-area-inset-bottom);
}

/* 强制覆盖 Vant NavBar 样式以适应深色背景 */
.forced-white-nav :deep(.van-nav-bar__title),
.forced-white-nav :deep(.van-nav-bar__text),
.forced-white-nav :deep(.van-icon) {
  color: white !important;
}
.forced-white-nav :deep(.van-nav-bar__content) {
  background-color: transparent !important;
}

/* 自定义滚动条 */
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}

/* 动画定义 */
@keyframes bounce-in {
  0% { transform: scale(0.8) translateY(20px); opacity: 0; }
  60% { transform: scale(1.05) translateY(-5px); opacity: 1; }
  100% { transform: scale(1) translateY(0); }
}
.animate-bounce-in {
  animation: bounce-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes scale-in {
  from { transform: scale(0); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
.animate-scale-in {
  animation: scale-in 0.3s ease-out backwards;
  animation-delay: 0.1s;
}

/* Vant Tabs 样式覆盖 */
.ranking-tabs :deep(.van-tabs__wrap) {
  border-bottom: none !important;
}
.ranking-tabs :deep(.van-tab--active) {
  font-weight: 800;
}
</style>