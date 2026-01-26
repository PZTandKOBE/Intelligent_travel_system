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
      const payload: any = {
        gameMode: mode,
        difficulty,
        questionCount: 5 
      };
      
      if (projectName && projectName.trim()) {
        payload.projectName = projectName.trim();
      }

      const data = await http.post<GameSession>('/quiz/start', payload) as unknown as GameSession;
      
      // 🛠️ 【数据修补 1】修复 options 为 null 的问题
      if (data && data.questions) {
        data.questions.forEach(q => {
          if (!q.options || q.options.length === 0) {
            console.warn(`题目 ID ${q.id} 缺少选项，已使用默认数据填充`);
            q.options = ['选项A (数据缺失)', '选项B (数据缺失)', '选项C (数据缺失)', '选项D (数据缺失)'];
          }
          if (!q.questionType) {
            q.questionType = 'single';
          }
        });
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
      console.error(e);
      showToast('开始游戏失败');
      return false;
    }
  };

  // 提交答案
  const submitAnswer = async (answer: string, timeSpent: number) => {
    if (!currentSession.value || !currentQuestion.value) return null;

    try {
      const rawResult = await http.post<any>('/quiz/answer', {
        gameRecordId: currentSession.value.gameRecordId,
        questionId: currentQuestion.value.id,
        userAnswer: answer,
        timeSpent
      }) as unknown as any;

      // 🛠️ 【数据修补 2】修复字段不一致 (isCorrect -> correct)
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
      // 1. 获取原始数据 (any)
      const rawRes = await http.post<any>(`/quiz/complete/${currentSession.value.gameRecordId}`) as unknown as any;
      
      // 2. 🛠️ 【数据修补 3】计算 timeSpent
      let finalTimeSpent = rawRes.timeSpent;
      if (finalTimeSpent === null || finalTimeSpent === undefined) {
        // 如果后端没返回时间，手动计算：结束时间 - 开始时间
        if (rawRes.startedAt && rawRes.completedAt) {
          const start = new Date(rawRes.startedAt).getTime();
          const end = new Date(rawRes.completedAt).getTime();
          finalTimeSpent = Math.floor((end - start) / 1000); // 转为秒
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