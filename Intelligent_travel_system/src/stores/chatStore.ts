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

  /**
   * 发送消息 (已修复 JSON 解析报错)
   */
const sendMessage = async (content: string) => {
    if (isStreaming.value || !content.trim()) return;

    // 1. 用户消息上屏
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content,
      type: 'text',
      createdAt: Date.now()
    };
    messages.value.push(userMsg);

    // 2. AI 消息占位
    const assistantMsgId = `ai-${Date.now()}`;
    const assistantMsg = ref<ChatMessage>({
      id: assistantMsgId,
      role: 'assistant',
      content: '', 
      type: 'text',
      isLoading: true, 
      createdAt: Date.now()
    });
    messages.value.push(assistantMsg.value);

    isStreaming.value = true;

    try {
      console.log('开始请求后端...'); // Debug日志
      const response = await fetch('/api/chat/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          message: content,
          conversationId: currentConversationId.value,
        })
      });

      if (!response.ok) {
        throw new Error(`请求报错: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('无法获取流');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        console.log('收到后端原始数据:', chunk); // 👈 关键：看控制台这里输出了什么！

        const lines = chunk.split('\n');
        
        for (const line of lines) {
          // 跳过空行
          if (!line.trim()) continue; 

          // --- ⚡️ 核心修改：万能解析逻辑 ⚡️ ---
          
          let contentToParse = line;
          
          // 1. 如果有 data: 前缀，去掉它，取后面的内容
          if (line.startsWith('data: ')) {
            contentToParse = line.slice(6);
          }
          // 2. 如果是 SSE 的 event: 或 id: 字段，通常不需要显示，跳过
          else if (line.startsWith('event: ') || line.startsWith('id: ')) {
            continue;
          }
          
          // 3. 检查结束标记
          if (contentToParse.trim() === '[DONE]') continue;

          try {
            // 尝试当做 JSON 解析
            const data = JSON.parse(contentToParse);
            
            // 只要收到有效数据，就取消 loading
            if (assistantMsg.value.isLoading) assistantMsg.value.isLoading = false;

            if (typeof data === 'object' && data !== null) {
              // 处理结构化数据
              if (data.message) assistantMsg.value.content += data.message;
              else if (data.content) assistantMsg.value.content += data.content; // 兼容不同字段
              else if (data.location) {
                 assistantMsg.value.type = 'location';
                 assistantMsg.value.location = data.location;
              }
              else if (data.products) {
                 assistantMsg.value.type = 'product';
                 assistantMsg.value.products = data.products;
              }
              else if (data.conversationId) currentConversationId.value = data.conversationId;
            } else {
              // 比如解析出来是纯数字或普通字符串
              assistantMsg.value.content += String(data);
            }
          } catch (e) {
            // ⚡️ 解析 JSON 失败，说明是纯文本
            // 不管带不带 data:，只要 JSON 解析挂了，我们就直接显示文本
            if (assistantMsg.value.isLoading) assistantMsg.value.isLoading = false;
            
            // 这里的 contentToParse 可能是 "你好" 也可能是 "data: 你好" 处理后的结果
            assistantMsg.value.content += contentToParse;
          }
        }
      }
    } catch (error) {
      console.error('发送流程中断:', error);
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