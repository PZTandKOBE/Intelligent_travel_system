// src/stores/gameStore.ts
import { defineStore } from 'pinia';
import { ref } from 'vue';
import http from '../utils/request';
import type { GameSession, QuizQuestion, AnswerResult, GameResult, RankingItem } from '../types/api';
import { showToast } from 'vant';

export const useGameStore = defineStore('game', () => {
  const isPlaying = ref(false);
  const currentSession = ref<GameSession | null>(null);
  const currentQuestionIndex = ref(0);
  const currentQuestion = ref<QuizQuestion | null>(null);
  const lastResult = ref<GameResult | null>(null);
  
  // 排行榜数据
  const rankingList = ref<RankingItem[]>([]);
  const myRank = ref<number | null>(null);
  const currentRankingType = ref<'weekly' | 'monthly'>('weekly');

  // 开始游戏
  const startGame = async (mode = 'normal', difficulty = 1, projectName?: string) => {
    try {
      // 📝 修改点：显式构造 payload，确保 projectName 字段始终存在
      // 即使是空字符串，也传过去，明确告诉后端"为空"
      const payload: any = {
        gameMode: mode,
        difficulty,
        questionCount: 5,
        projectName: projectName ? projectName.trim() : "" 
      };

      const data = await http.post<GameSession>('/quiz/start', payload) as unknown as GameSession;

      // 🛡️🛡️🛡️【数据防御与清洗】🛡️🛡️🛡️
      if (data && data.questions) {
        data.questions.forEach((q, index) => {
          // 情况 1: 如果 options 是 null 或空数组
          if (!q.options || q.options.length === 0) {
            console.warn(`⚠️ [GameStore] 第 ${index + 1} 题 (ID: ${q.id}) 缺少选项！已触发自动修复。`);
            q.options = [
              '选项A (数据缺失)', 
              '选项B (数据缺失)', 
              '选项C (数据缺失)', 
              '选项D (数据缺失)'
            ];
          } 
          else {
            q.options = q.options.map(opt => opt.replace(/^[A-Z]\.\s*/, ''));
          }
          
          if (!q.questionType) {
            q.questionType = 'single';
          }
        });
      } else {
        console.error('❌ [GameStore] 返回数据中缺少 questions 字段！');
      }

      currentSession.value = data;
      currentQuestionIndex.value = 0;
      
      if (data && data.questions && data.questions.length > 0) {
        currentQuestion.value = data.questions[0];
        isPlaying.value = true;
        return true;
      } else {
        showToast('题库暂无题目');
        return false;
      }
    } catch (e) {
      console.error('❌ [GameStore] startGame 发生异常:', e);
      showToast('开始游戏失败');
      return false;
    }
  };

  // 提交答案
  const submitAnswer = async (answer: string, timeSpent: number) => {
    if (!currentSession.value || !currentQuestion.value) return null;

    try {
      console.log(`🚀 [GameStore] 提交答案: 题目ID=${currentQuestion.value.id}, 答案=${answer}, 用时=${timeSpent}`);
      
      const rawResult = await http.post<any>('/quiz/answer', {
        gameRecordId: currentSession.value.gameRecordId,
        questionId: currentQuestion.value.id,
        userAnswer: answer,
        timeSpent
      }) as unknown as any;

      const result: AnswerResult = {
        correct: rawResult.isCorrect !== undefined ? rawResult.isCorrect : rawResult.correct,
        points: rawResult.score !== undefined ? rawResult.score : rawResult.points,
        correctAnswer: rawResult.correctAnswer,
        explanation: rawResult.explanation,
        totalScore: rawResult.totalScore,
        correctCount: 0, 
        answeredCount: 0 
      };
      
      return result; 
    } catch (e) {
      console.error('❌ [GameStore] 提交失败:', e);
      showToast('提交失败');
      return null;
    }
  };

  // 下一题
  const nextQuestion = () => {
    if (!currentSession.value) return false;
    if (currentQuestionIndex.value < currentSession.value.questions.length - 1) {
      currentQuestionIndex.value++;
      currentQuestion.value = currentSession.value.questions[currentQuestionIndex.value];
      return true;
    } else {
      return false;
    }
  };

  // 结算游戏
  const completeGame = async () => {
    if (!currentSession.value) return;
    try {
      const rawRes = await http.post<any>(`/quiz/complete/${currentSession.value.gameRecordId}`) as unknown as any;
      
      let finalTimeSpent = rawRes.timeSpent;
      if (finalTimeSpent === null || finalTimeSpent === undefined) {
        if (rawRes.startedAt && rawRes.completedAt) {
          const start = new Date(rawRes.startedAt).getTime();
          const end = new Date(rawRes.completedAt).getTime();
          finalTimeSpent = Math.floor((end - start) / 1000);
        } else {
          finalTimeSpent = 0;
        }
      }

      const res: GameResult = {
        ...rawRes,
        timeSpent: finalTimeSpent
      };

      lastResult.value = res;
      isPlaying.value = false;
      currentSession.value = null;
    } catch (e) {
      console.error(e);
    }
  };

  // 获取排行榜
  const fetchRankings = async (type: 'weekly' | 'monthly' = 'weekly') => {
    try {
      currentRankingType.value = type;
      
      const list = await http.get<RankingItem[]>(`/quiz/ranking/${type}?topN=20`) as unknown as RankingItem[];
      rankingList.value = Array.isArray(list) ? list : [];
      
      const rank = await http.get<number>('/quiz/ranking/my') as unknown as number;
      myRank.value = rank; 

    } catch (e) {
      console.error(e);
      rankingList.value = []; 
      myRank.value = null;
    }
  };

  return {
    isPlaying,
    currentSession,
    currentQuestion,
    currentQuestionIndex,
    lastResult,
    rankingList,
    myRank,
    currentRankingType,
    startGame,
    submitAnswer,
    nextQuestion,
    completeGame,
    fetchRankings
  };
});