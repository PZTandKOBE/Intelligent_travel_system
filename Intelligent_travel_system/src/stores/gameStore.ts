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
  const weeklyRanking = ref<RankingItem[]>([]);
  const myRank = ref<number | null>(null);

  // 开始游戏
  const startGame = async (mode = 'normal', difficulty = 1) => {
    try {
      const res = await http.post<GameSession>('/quiz/start', {
        gameMode: mode,
        difficulty,
        questionCount: 5 // 默认 5 题
      });
      // 兼容后端返回结构，如果包裹在 data 里，request.ts 可能已经处理了解包，或者需要手动处理
      // 假设 request.ts 自动解包 data
      const data = (res as any).data || res;
      
      currentSession.value = data;
      currentQuestionIndex.value = 0;
      if (data.questions && data.questions.length > 0) {
        currentQuestion.value = data.questions[0];
        isPlaying.value = true;
      }
      return true;
    } catch (e) {
      console.error(e);
      showToast('开始游戏失败');
      return false;
    }
  };

  // 提交答案
  const submitAnswer = async (answer: string, timeSpent: number) => {
    if (!currentSession.value || !currentQuestion.value) return null;

    try {
      const res = await http.post<AnswerResult>('/quiz/answer', {
        gameRecordId: currentSession.value.gameRecordId,
        questionId: currentQuestion.value.id,
        userAnswer: answer,
        timeSpent
      });
      const result = (res as any).data || res;
      return result; // 返回给 UI 显示对错和解析
    } catch (e) {
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
      // 题目做完了
      return false;
    }
  };

  // 结算游戏
  const completeGame = async () => {
    if (!currentSession.value) return;
    try {
      const res = await http.post<GameResult>(`/quiz/complete/${currentSession.value.gameRecordId}`);
      lastResult.value = (res as any).data || res;
      isPlaying.value = false;
      currentSession.value = null;
    } catch (e) {
      console.error(e);
    }
  };

  // 获取排行榜
  const fetchRankings = async () => {
    try {
      const res = await http.get<RankingItem[]>('/quiz/ranking/weekly?topN=20');
      weeklyRanking.value = (res as any).data || res;
      
      const myRes = await http.get<number>('/quiz/ranking/my');
      myRank.value = (myRes as any).data;
    } catch (e) {
      console.error(e);
    }
  };

  return {
    isPlaying,
    currentSession,
    currentQuestion,
    currentQuestionIndex,
    lastResult,
    weeklyRanking,
    myRank,
    startGame,
    submitAnswer,
    nextQuestion,
    completeGame,
    fetchRankings
  };
});