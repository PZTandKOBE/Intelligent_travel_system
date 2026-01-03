// src/stores/chatStore.ts
import { defineStore } from 'pinia';
import { ref } from 'vue';
import http from '../utils/request';
import type { ChatHistoryResponse, ConversationItem, ChatInitResponse } from '../types/api';
import { showToast } from 'vant';

export const useChatStore = defineStore('chat', () => {
  // ✅ 关键点：这里必须初始化为空数组 []，不能是 null 或 undefined
  const historyList = ref<ConversationItem[]>([]);
  const currentMessages = ref<any[]>([]);
  const currentConversationId = ref<number | null>(null);
  
  const initChat = async (lat?: number, lng?: number) => {
    try {
      const payload = (lat && lng) ? { lat, lng } : {};
      const res = await http.post<ChatInitResponse>('/chat/init', payload);
      return res;
    } catch (error) {
      console.error('初始化会话失败:', error);
      return null;
    }
  };

  const fetchHistory = async () => {
    try {
      const res: any = await http.post('/chat/conversations', { 
        current: 1, 
        pageSize: 100 
      });
      // ✅ 关键点：确保赋值也是数组
      historyList.value = res.records || [];
    } catch (error) {
      console.error('获取历史会话失败:', error);
      showToast('获取历史记录失败');
      // 失败时重置为空数组，防止报错
      historyList.value = [];
    }
  };

  const deleteConversation = async (id: number) => {
    try {
      await http.delete(`/chat/conversation/${id}`);
      showToast('删除成功');
      historyList.value = historyList.value.filter(item => item.id !== id);
      if (currentConversationId.value === id) {
        currentConversationId.value = null;
        currentMessages.value = [];
      }
      return true;
    } catch (error) {
      console.error('删除会话失败:', error);
      return false;
    }
  };

  const updateConversationTitle = async (id: number, newTitle: string) => {
    try {
      await http.put(`/chat/conversation/${id}/title`, { title: newTitle });
      showToast('修改成功');
      const item = historyList.value.find(i => i.id === id);
      if (item) {
        item.title = newTitle;
      }
      return true;
    } catch (error) {
      console.error('重命名失败:', error);
      return false;
    }
  };

  const fetchMessages = async (id: number) => {
    try {
      const res = await http.get<ChatHistoryResponse>(`/chat/history/${id}`);
      currentMessages.value = (res as any) || [];
      currentConversationId.value = id;
    } catch (error) {
      console.error('获取消息详情失败:', error);
      showToast('加载消息失败');
    }
  };

  // ✅ 关键点：必须 return 出来，History.vue 才能读取到
  return {
    historyList,
    currentMessages,
    currentConversationId,
    initChat,
    fetchHistory,
    fetchMessages,
    deleteConversation,
    updateConversationTitle
  };
});