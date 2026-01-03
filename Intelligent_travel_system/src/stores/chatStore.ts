// src/stores/chatStore.ts
import { defineStore } from 'pinia';
import { ref } from 'vue';
import http from '../utils/request';
import type { ChatHistoryResponse, ConversationItem, ChatInitResponse, ChatMessage } from '../types/api';
import { showToast } from 'vant';
// ✨ 引入封装好的 SSE 工具
import { fetchStream } from '../utils/sse-client';

export const useChatStore = defineStore('chat', () => {
  // ==================== 状态定义 ====================
  const historyList = ref<ConversationItem[]>([]);
  const messages = ref<ChatMessage[]>([]); 
  const currentConversationId = ref<number | null>(null);
  const isStreaming = ref(false);
  const currentWeather = ref<string>(''); 
  const userLocation = ref<{ lat: number; lng: number } | null>(null);

  // ==================== 核心功能 ====================

  /**
   * 初始化会话
   */
  const initChat = async (lat?: number, lng?: number) => {
    try {
      if (lat && lng) {
        userLocation.value = { lat, lng };
      }

      const payload = (lat && lng) ? { lat, lng } : {};
      const res = await http.post<ChatInitResponse>('/chat/init', payload);
      
      if (res) {
        if (res.envContext) {
          currentWeather.value = res.envContext.weather || '';
        }
        
        if (res.welcomeMessage && messages.value.length === 0) {
          messages.value.push({
            id: 'welcome-' + Date.now(),
            role: 'assistant',
            content: res.welcomeMessage,
            type: 'text',
            createdAt: Date.now()
          });
        }
        
        if (res.conversationId) {
          currentConversationId.value = res.conversationId;
        }
      }
      return res;
    } catch (error) {
      console.error('初始化会话失败:', error);
      return null;
    }
  };

const sendMessage = async (content: string) => {
    if (isStreaming.value || !content.trim()) return;

    // 1. 用户消息上屏
    messages.value.push({
      id: `user-${Date.now()}`,
      role: 'user',
      content: content,
      type: 'text',
      createdAt: Date.now()
    });

    // 2. AI 消息占位
    // 默认 isLoading 为 true，这样一开始就会显示加载动画
    const assistantMsg = ref<ChatMessage>({
      id: `ai-${Date.now()}`,
      role: 'assistant',
      content: '', 
      type: 'text',
      isLoading: true, 
      createdAt: Date.now()
    });
    messages.value.push(assistantMsg.value);

    isStreaming.value = true;

    try {
      // 3. 构造请求体
      const payload: any = {
        message: content,
        conversationId: currentConversationId.value,
      };

      if (userLocation.value) {
        payload.lat = userLocation.value.lat;
        payload.lng = userLocation.value.lng;
      }

      // 4. 使用 fetchStream 处理 SSE
      await fetchStream('/api/chat/send', payload, {
        onMessage: (type, data) => {
          // ============ 核心修改：根据 type 处理状态 ============
          
          if (type === 'status') {
            // 🧠 当后端返回 thinking 时，强制开启加载状态
            if (data === 'thinking') {
              assistantMsg.value.isLoading = true;
            } 
            // 🗣️ 当后端返回 answering 时，关闭加载状态，准备出字
            else if (data === 'answering') {
              assistantMsg.value.isLoading = false;
            }
          }
          
          else if (type === 'message') {
            // 收到消息内容时，确保关闭加载动画（双重保险）
            if (assistantMsg.value.isLoading) {
              assistantMsg.value.isLoading = false;
            }

            // 处理 JSON 数据 (location/product) 或 纯文本
            if (typeof data === 'object' && data !== null) {
              if (data.location) {
                 assistantMsg.value.type = 'location';
                 assistantMsg.value.location = data.location;
              } else if (data.products) {
                 assistantMsg.value.type = 'product';
                 assistantMsg.value.products = data.products;
              } else {
                 // 兼容后端可能把文本放在 message 或 content 字段的情况
                 assistantMsg.value.content += (data.message || data.content || '');
              }
            } else {
              // 纯文本拼接
              assistantMsg.value.content += String(data);
            }
          }
          
          else if (type === 'conversationId') {
            currentConversationId.value = Number(data);
          }
        },
        onDone: () => {
          isStreaming.value = false;
          assistantMsg.value.isLoading = false;
        },
        onError: (err) => {
          console.error('发送中断:', err);
          assistantMsg.value.content += '\n[连接中断]';
          isStreaming.value = false;
          assistantMsg.value.isLoading = false;
        }
      });

    } catch (error) {
      console.error('请求失败:', error);
      assistantMsg.value.content = '[发送失败]';
      isStreaming.value = false;
      assistantMsg.value.isLoading = false;
    }
  };

  /**
   * 加载历史会话详情
   */
  const loadHistory = async (id: string | number) => {
    try {
      messages.value = [];
      const res = await http.get<ChatHistoryResponse>(`/chat/history/${id}`);
      messages.value = (res as any) || [];
      currentConversationId.value = Number(id);
    } catch (error) {
      console.error('加载历史失败:', error);
      showToast('加载历史失败');
    }
  };

  // ==================== 历史记录管理 ====================

  const fetchHistory = async () => {
    try {
      const res: any = await http.post('/chat/conversations', { 
        current: 1, 
        pageSize: 100 
      });
      historyList.value = res.records || [];
    } catch (error) {
      console.error('获取历史会话失败:', error);
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
        messages.value = [];
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

  return {
    historyList,
    messages,
    currentMessages: messages,
    currentConversationId,
    isStreaming,
    currentWeather,
    userLocation,
    initChat,
    sendMessage,
    loadHistory,
    fetchHistory,
    fetchMessages: loadHistory,
    deleteConversation,
    updateConversationTitle
  };
});