// src/stores/chatStore.ts
import { defineStore } from 'pinia';
import { ref } from 'vue';
import http from '../utils/request';
import type { ChatHistoryResponse, ConversationItem, ChatInitResponse, ChatMessage } from '../types/api';
import { showToast } from 'vant';

export const useChatStore = defineStore('chat', () => {
  // ==================== 状态定义 ====================
  const historyList = ref<ConversationItem[]>([]);
  const messages = ref<ChatMessage[]>([]); 
  const currentConversationId = ref<number | null>(null);
  const isStreaming = ref(false);
  const currentWeather = ref<string>(''); 
  
  // ✨ 新增：用于存储当前用户的经纬度
  const userLocation = ref<{ lat: number; lng: number } | null>(null);

  // ==================== 核心功能 ====================

  /**
   * 初始化会话
   */
  const initChat = async (lat?: number, lng?: number) => {
    try {
      // ✨ 1. 保存位置信息到状态中，供 sendMessage 使用
      if (lat && lng) {
        userLocation.value = { lat, lng };
      }

      // 如果没有经纬度，传空对象或者不传，视后端需求而定
      const payload = (lat && lng) ? { lat, lng } : {};
      const res = await http.post<ChatInitResponse>('/chat/init', payload);
      
      if (res) {
        if (res.envContext) {
          currentWeather.value = res.envContext.weather || '';
        }
        
        // 只有当消息列表为空时才添加欢迎语
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
      // ✨ 2. 构造请求体时，带上 userLocation 中的经纬度
      const payload: any = {
        message: content,
        conversationId: currentConversationId.value,
      };

      // 如果有位置信息，则注入到 payload 中
      if (userLocation.value) {
        payload.lat = userLocation.value.lat;
        payload.lng = userLocation.value.lng;
      }

      const response = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload) // 发送完整的 payload
      });

      if (!response.ok) throw new Error(`请求报错: ${response.status}`);
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('无法获取流');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        
        // ⚡️ 预处理：有些后端会把 event 和 data 粘在一起没有换行
        const normalizedChunk = chunk
          .replace(/event:(.*?)data:/g, 'event:$1\ndata:')
          .replace(/(?<!\n)data:/g, '\ndata:');

        const lines = normalizedChunk.split('\n');
        
        for (const line of lines) {
          if (!line.trim()) continue; 
          
          let contentToParse = line;
          
          // 🚨 SSE 字段解析逻辑
          if (line.startsWith('event:') || line.startsWith('id:')) {
            continue;
          }
          
          if (line.startsWith('data:')) {
            contentToParse = line.slice(5).trim();
          }

          if (contentToParse === '[DONE]') continue;
          if (!contentToParse) continue;

          try {
            const data = JSON.parse(contentToParse);
            if (assistantMsg.value.isLoading) assistantMsg.value.isLoading = false;

            if (typeof data === 'object' && data !== null) {
              if (data.message) assistantMsg.value.content += data.message;
              else if (data.content) assistantMsg.value.content += data.content;
              else if (data.location) {
                 assistantMsg.value.type = 'location';
                 assistantMsg.value.location = data.location;
              }
              else if (data.products) {
                 assistantMsg.value.type = 'product';
                 assistantMsg.value.products = data.products;
              }
              else if (data.conversationId) {
                currentConversationId.value = data.conversationId;
              }
            } else {
              assistantMsg.value.content += String(data);
            }
          } catch (e) {
            if (assistantMsg.value.isLoading) assistantMsg.value.isLoading = false;
            assistantMsg.value.content += contentToParse;
          }
        }
      }
    } catch (error) {
      console.error('发送中断:', error);
      assistantMsg.value.content += '\n[连接中断]';
    } finally {
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