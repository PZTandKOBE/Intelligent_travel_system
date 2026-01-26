<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
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
  const toast = showLoadingToast('准备题库中...');
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
  const result = await gameStore.submitAnswer(selectedAnswer.value, timeSpent.value);
  
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
  // 如果大于 1 (如 60.00)，说明已经是百分制，直接取整
  if (val > 1) return val.toFixed(0) + '%';
  // 如果小于等于 1 (如 0.6)，说明是小数，乘 100
  return (val * 100).toFixed(0) + '%';
};

const modeOptions = [
  { text: '普通', value: 'normal' },
  { text: '挑战', value: 'challenge' },
  { text: '每日', value: 'daily' },
];
</script>

<template>
  <div class="h-screen flex flex-col bg-slate-100 font-sans">
    
    <div v-if="!gameStore.isPlaying && !gameStore.lastResult" class="flex flex-col h-full overflow-hidden">
      <van-nav-bar
        title="非遗知识大闯关"
        left-text="返回"
        left-arrow
        @click-left="handleBack"
        class="bg-blue-600 text-white border-none"
        :border="false"
      />
      <div class="custom-nav-style">
        <div class="bg-blue-600 p-6 pb-12 rounded-b-[2.5rem] shadow-lg relative z-10">
          <p class="text-blue-100 text-center mb-6 text-sm">挑战文化底蕴，赢取积分好礼！</p>
          
          <div class="bg-white rounded-2xl p-4 shadow-md space-y-4">
            <div>
              <div class="text-xs text-gray-400 mb-2 font-bold">选择模式</div>
              <div class="grid grid-cols-3 gap-2 bg-gray-100 p-1 rounded-lg">
                <div 
                  v-for="mode in modeOptions" 
                  :key="mode.value"
                  @click="gameMode = mode.value"
                  :class="[
                    'text-center py-2 text-sm rounded-md transition-all cursor-pointer font-medium',
                    gameMode === mode.value 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700'
                  ]"
                >
                  {{ mode.text }}
                </div>
              </div>
            </div>

            <div>
              <div class="text-xs text-gray-400 mb-2 font-bold">指定项目 (可选)</div>
              <div class="flex items-center bg-gray-50 rounded-lg px-3 py-1 border border-gray-200">
                <span class="text-lg mr-2">🔍</span>
                <input 
                  v-model="projectName" 
                  type="text" 
                  placeholder="输入非遗名称，如：剪纸"
                  class="w-full bg-transparent border-none outline-none text-sm py-2 text-gray-700 placeholder-gray-400"
                />
              </div>
            </div>

            <button 
              @click="handleStartGame" 
              class="w-full bg-yellow-400 hover:bg-yellow-500 text-blue-900 py-3 rounded-xl font-bold shadow-md active:scale-95 transition-transform flex items-center justify-center gap-2"
            >
              <span>🚀</span> 立即挑战
            </button>
          </div>
        </div>
      </div>

      <div class="flex-1 overflow-hidden flex flex-col pt-4 px-4 pb-4">
        <div class="bg-white flex-1 rounded-2xl shadow-sm flex flex-col overflow-hidden">
          <div class="border-b px-2">
            <van-tabs v-model:active="rankingTab" shrink animated color="#2563eb" title-active-color="#2563eb">
              <van-tab title="本周榜单" name="weekly"></van-tab>
              <van-tab title="月度榜单" name="monthly"></van-tab>
            </van-tabs>
          </div>
          
          <div class="bg-gray-50 px-4 py-2 flex justify-between items-center text-xs text-gray-500">
             <span>🏆 我的排名: <b class="text-blue-600">{{ gameStore.myRank || '未上榜' }}</b></span>
          </div>

          <div class="flex-1 overflow-y-auto px-2">
            <van-empty v-if="gameStore.rankingList.length === 0" description="暂无排名数据" />
            <div 
              v-else
              v-for="(item, idx) in gameStore.rankingList" 
              :key="item.userId" 
              class="flex items-center py-3 px-2 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors"
            >
               <div 
                 class="w-8 font-bold text-center text-lg italic" 
                 :class="{
                   'text-yellow-500': item.rank === 1,
                   'text-gray-400': item.rank === 2,
                   'text-orange-600': item.rank === 3,
                   'text-gray-400 font-normal text-sm': item.rank > 3
                 }"
               >
                 {{ item.rank }}
               </div>
               
               <img :src="item.avatar || 'https://via.placeholder.com/40'" class="w-10 h-10 rounded-full mx-3 bg-gray-200 object-cover border border-gray-100" />
               
               <div class="flex-1">
                 <div class="font-medium text-gray-800 text-sm">{{ item.username }}</div>
                 <div class="text-xs text-gray-400 mt-0.5">Lv.{{ item.level }} · 胜率 {{ (item.bestAccuracy * 100).toFixed(0) }}%</div>
               </div>
               
               <div class="font-bold text-blue-600 text-sm">{{ item.points }} 分</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="gameStore.isPlaying && gameStore.currentQuestion" class="flex flex-col h-full">
      <div class="bg-white p-4 flex justify-between items-center shadow-sm z-10">
        <span class="font-bold text-gray-600">第 {{ gameStore.currentQuestionIndex + 1 }} 题</span>
        <div class="bg-blue-50 border border-blue-100 rounded-full px-3 py-1 text-sm text-blue-600 flex items-center gap-1 font-mono">
          ⏱️ {{ timeSpent }}s
        </div>
      </div>

      <div class="flex-1 p-6 flex flex-col justify-center max-w-lg mx-auto w-full">
        <div class="bg-white p-6 rounded-2xl shadow-xl border border-gray-100">
          <h2 class="text-lg font-bold text-gray-800 mb-8 leading-relaxed">
            {{ gameStore.currentQuestion.questionText }}
          </h2>
          
          <div class="space-y-3">
            <button 
              v-for="(opt, idx) in gameStore.currentQuestion.options" 
              :key="idx"
              @click="handleOptionSelect(indexToChar(idx))"
              :class="[
                'w-full text-left p-4 rounded-xl border-2 transition-all active:scale-[0.98]',
                selectedAnswer === indexToChar(idx) 
                  ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold shadow-sm' 
                  : 'border-gray-100 bg-gray-50 text-gray-600 hover:bg-gray-100'
              ]"
            >
              <span class="inline-block w-6 font-mono opacity-50">{{ indexToChar(idx) }}.</span> 
              {{ opt.replace(/^[A-Z]\./, '') }}
            </button>
          </div>
        </div>
        
        <button 
          @click="submit"
          :disabled="!selectedAnswer"
          class="mt-8 w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-200 disabled:bg-gray-300 disabled:shadow-none disabled:cursor-not-allowed transition-all"
        >
          提交答案
        </button>
      </div>
    </div>

    <div v-else-if="gameStore.lastResult" class="h-full flex flex-col items-center justify-center p-6 bg-white">
       <div class="text-7xl mb-4 animate-bounce">🎉</div>
       <h2 class="text-2xl font-bold text-gray-800 mb-2">挑战完成！</h2>
       <p class="text-gray-500 mb-8">本次得分</p>
       <div class="text-6xl font-black text-blue-600 mb-8 tracking-tighter">{{ gameStore.lastResult.totalScore }}</div>
       
       <div class="grid grid-cols-2 gap-4 w-full mb-8 max-w-xs">
         <div class="bg-gray-50 p-4 rounded-2xl text-center border border-gray-100">
           <div class="text-gray-400 text-xs mb-1">正确率</div>
           <div class="font-bold text-xl text-gray-800">{{ formatAccuracy(gameStore.lastResult.accuracy) }}</div>
         </div>
         <div class="bg-gray-50 p-4 rounded-2xl text-center border border-gray-100">
           <div class="text-gray-400 text-xs mb-1">用时</div>
           <div class="font-bold text-xl text-gray-800">{{ gameStore.lastResult.timeSpent }}s</div>
         </div>
       </div>

       <button @click="gameStore.lastResult = null" class="w-full max-w-xs bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl transition-colors">
         返回首页
       </button>
    </div>

    <div v-if="showResultModal" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50">
       <div class="bg-white w-full max-w-sm rounded-3xl p-6 animate-bounce-in shadow-2xl">
          <div class="text-center mb-4">
             <div v-if="currentResult?.correct" class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-4xl mb-2">✅</div>
             <div v-else class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-4xl mb-2">❌</div>
          </div>
          <h3 class="text-center text-xl font-bold mb-2 text-gray-800">
            {{ currentResult?.correct ? '回答正确' : '回答错误' }}
            <span v-if="currentResult?.correct" class="text-green-600 text-base ml-1">+{{ currentResult.points }}分</span>
          </h3>
          <div class="bg-yellow-50 p-4 rounded-xl text-sm text-yellow-800 mb-6 leading-relaxed border border-yellow-100">
            <div class="font-bold mb-1 opacity-80">💡 解析：</div>
            {{ currentResult?.explanation }}
          </div>
          <button @click="next" class="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-colors">
            {{ gameStore.currentQuestionIndex >= (gameStore.currentSession?.totalQuestions || 5) -1 ? '查看总成绩' : '下一题' }}
          </button>
       </div>
    </div>
  </div>
</template>

<style scoped>
/* 覆盖 Vant NavBar 样式以适应深色背景 */
.custom-nav-style :deep(.van-nav-bar) {
  background-color: transparent;
}
.custom-nav-style :deep(.van-nav-bar__title),
.custom-nav-style :deep(.van-nav-bar__text),
.custom-nav-style :deep(.van-icon) {
  color: white !important;
}

@keyframes bounce-in {
  0% { transform: scale(0.8); opacity: 0; }
  60% { transform: scale(1.05); opacity: 1; }
  100% { transform: scale(1); }
}
.animate-bounce-in {
  animation: bounce-in 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
</style>