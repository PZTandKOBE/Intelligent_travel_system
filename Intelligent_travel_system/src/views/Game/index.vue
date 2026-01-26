<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useGameStore } from '../../stores/gameStore';
import { useRouter } from 'vue-router';
import { showToast, showLoadingToast, closeToast } from 'vant';

const gameStore = useGameStore();
const router = useRouter();

// 内部状态
const selectedAnswer = ref<string>('');
const showResultModal = ref(false); // 单题结果弹窗
const currentResult = ref<any>(null); // 单题结果数据

// 计时器
const timeSpent = ref(0);
let timer: any = null;

onMounted(() => {
  gameStore.fetchRankings();
});

const handleStartGame = async () => {
  const toast = showLoadingToast('准备题库中...');
  const success = await gameStore.startGame('normal', 1);
  toast.close();
  if (success) {
    startTimer();
  }
};

const startTimer = () => {
  timeSpent.value = 0;
  clearInterval(timer);
  timer = setInterval(() => {
    timeSpent.value++;
  }, 1000);
};

const handleOptionSelect = (opt: string) => {
  // 转换选项索引为 ABC
  // 这里假设 options 数组对应 A, B, C, D
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

const quit = () => {
  router.push('/');
};

// 工具：数字转字母 (0->A, 1->B)
const indexToChar = (i: number) => String.fromCharCode(65 + i);

</script>

<template>
  <div class="h-screen flex flex-col bg-slate-100">
    <div v-if="!gameStore.isPlaying && !gameStore.lastResult" class="p-4 flex flex-col h-full">
      <div class="bg-blue-600 text-white p-6 rounded-2xl shadow-lg mb-6 text-center">
        <h1 class="text-2xl font-bold mb-2">非遗知识大闯关</h1>
        <p class="text-blue-100">挑战你的文化底蕴，赢取积分！</p>
        <button @click="handleStartGame" class="mt-6 bg-yellow-400 text-blue-900 px-8 py-3 rounded-full font-bold shadow-md active:scale-95 transition">
          立即开始
        </button>
      </div>

      <div class="flex-1 bg-white rounded-2xl p-4 shadow-sm overflow-hidden flex flex-col">
        <h3 class="font-bold text-gray-700 mb-4 flex justify-between">
          <span>🏆 本周排行榜</span>
          <span class="text-sm font-normal text-gray-500">我的排名: {{ gameStore.myRank || '未上榜' }}</span>
        </h3>
        <div class="flex-1 overflow-y-auto">
          <div v-for="(item, idx) in gameStore.weeklyRanking" :key="item.userId" class="flex items-center py-3 border-b last:border-0">
             <div class="w-8 font-bold text-center" :class="idx < 3 ? 'text-yellow-500' : 'text-gray-400'">{{ item.rank }}</div>
             <img :src="item.avatar || 'https://via.placeholder.com/40'" class="w-10 h-10 rounded-full mx-3 bg-gray-200" />
             <div class="flex-1">
               <div class="font-medium text-gray-800">{{ item.username }}</div>
               <div class="text-xs text-gray-500">等级 Lv.{{ item.level }}</div>
             </div>
             <div class="font-bold text-blue-600">{{ item.points }} 分</div>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="gameStore.isPlaying && gameStore.currentQuestion" class="flex flex-col h-full">
      <div class="bg-white p-4 flex justify-between items-center shadow-sm">
        <span class="font-bold text-gray-600">第 {{ gameStore.currentQuestionIndex + 1 }} 题</span>
        <div class="bg-gray-200 rounded-full px-3 py-1 text-sm text-gray-600">
          ⏱️ {{ timeSpent }}s
        </div>
      </div>

      <div class="flex-1 p-6 flex flex-col justify-center">
        <div class="bg-white p-6 rounded-2xl shadow-lg">
          <h2 class="text-xl font-bold text-gray-800 mb-6 leading-relaxed">
            {{ gameStore.currentQuestion.questionText }}
          </h2>
          
          <div class="space-y-3">
            <button 
              v-for="(opt, idx) in gameStore.currentQuestion.options" 
              :key="idx"
              @click="handleOptionSelect(indexToChar(idx))"
              :class="[
                'w-full text-left p-4 rounded-xl border-2 transition-all',
                selectedAnswer === indexToChar(idx) 
                  ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold' 
                  : 'border-gray-100 bg-gray-50 text-gray-700'
              ]"
            >
              <span class="mr-2 opacity-50">{{ indexToChar(idx) }}.</span> {{ opt }}
            </button>
          </div>
        </div>
        
        <button 
          @click="submit"
          :disabled="!selectedAnswer"
          class="mt-8 w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg disabled:bg-gray-300 disabled:shadow-none"
        >
          提交答案
        </button>
      </div>
    </div>

    <div v-else-if="gameStore.lastResult" class="h-full flex flex-col items-center justify-center p-6 bg-white">
       <div class="text-6xl mb-4">🎉</div>
       <h2 class="text-2xl font-bold text-gray-800 mb-2">挑战完成！</h2>
       <p class="text-gray-500 mb-8">本次得分</p>
       <div class="text-6xl font-black text-blue-600 mb-8">{{ gameStore.lastResult.totalScore }}</div>
       
       <div class="grid grid-cols-2 gap-4 w-full mb-8">
         <div class="bg-gray-50 p-4 rounded-xl text-center">
           <div class="text-gray-400 text-sm">正确率</div>
           <div class="font-bold text-xl">{{ (gameStore.lastResult.accuracy * 100).toFixed(0) }}%</div>
         </div>
         <div class="bg-gray-50 p-4 rounded-xl text-center">
           <div class="text-gray-400 text-sm">用时</div>
           <div class="font-bold text-xl">{{ gameStore.lastResult.timeSpent }}s</div>
         </div>
       </div>

       <button @click="gameStore.lastResult = null" class="w-full bg-blue-600 text-white py-3 rounded-xl">返回首页</button>
    </div>

    <div v-if="showResultModal" class="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
       <div class="bg-white w-full max-w-sm rounded-2xl p-6 animate-bounce-in">
          <div class="text-center mb-4">
             <i v-if="currentResult?.correct" class="text-5xl text-green-500">✅</i>
             <i v-else class="text-5xl text-red-500">❌</i>
          </div>
          <h3 class="text-center text-lg font-bold mb-2">
            {{ currentResult?.correct ? '回答正确 +'+currentResult.points : '回答错误' }}
          </h3>
          <div class="bg-yellow-50 p-3 rounded-lg text-sm text-yellow-800 mb-6 leading-relaxed">
            <strong>解析：</strong> {{ currentResult?.explanation }}
          </div>
          <button @click="next" class="w-full bg-blue-600 text-white py-3 rounded-xl font-bold">
            {{ gameStore.currentQuestionIndex >= (gameStore.currentSession?.totalQuestions || 5) -1 ? '查看总成绩' : '下一题' }}
          </button>
       </div>
    </div>
  </div>
</template>