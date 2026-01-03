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

  // ==================== 核心功能 ====================

  /**
   * 初始化会话
   */
  const initChat = async (lat?: number, lng?: number) => {
    try {
      // 如果没有经纬度，传空对象或者不传，视后端需求而定
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
      const response = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          conversationId: currentConversationId.value,
        })
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
        // 这里的正则把 "event:xxxdata:yyy" 强行变成两行
        // 注意：这里假设 data: 总是跟着 event: 出现的
        const normalizedChunk = chunk
          .replace(/event:(.*?)data:/g, 'event:$1\ndata:')
          // 再次确保 data: 前面有换行（防止多个 data 连在一起）
          .replace(/(?<!\n)data:/g, '\ndata:');

        const lines = normalizedChunk.split('\n');
        
        for (const line of lines) {
          if (!line.trim()) continue; 
          
          let contentToParse = line;
          
          // 🚨 关键修复：严格识别 SSE 字段
          
          // 1. 如果是 event 或 id 开头，直接跳过，不渲染！
          if (line.startsWith('event:') || line.startsWith('id:')) {
            continue;
          }
          
          // 2. 如果是 data 开头，提取内容
          if (line.startsWith('data:')) {
            // 去掉前缀 'data:' (5个字符)，并去掉可能的空格
            contentToParse = line.slice(5).trim();
          } else {
            // 3. 既不是 event 也不是 data，可能是之前解析剩下的垃圾，或者纯文本
            // 如果你确定后端只会发 SSE，这里也可以 continue 掉，防止渲染脏数据
            // contentToParse = line; 
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
              // 兼容纯数字/字符串
              assistantMsg.value.content += String(data);
            }
          } catch (e) {
            // JSON 解析失败，说明是纯文本
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
    initChat,
    sendMessage,
    loadHistory,
    fetchHistory,
    fetchMessages: loadHistory,
    deleteConversation,
    updateConversationTitle
  };
});