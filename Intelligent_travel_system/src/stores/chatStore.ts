import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { ChatMessage, ChatInitResponse, ConversationItem } from '../types/api';
import http from '../utils/request';
import { fetchStream } from '../utils/sse-client';

export const useChatStore = defineStore('chat', () => {
  const messages = ref<ChatMessage[]>([]);
  const isStreaming = ref(false);
  const currentConversationId = ref<number | null>(null);
  const conversationList = ref<ConversationItem[]>([]);

  const addMessage = (msg: ChatMessage) => {
    messages.value.push(msg);
  };

  // 1. 初始化会话
  const initChat = async (lat: number, lng: number) => {
    messages.value = [];
    currentConversationId.value = null; 
    try {
      const data = await http.post<ChatInitResponse>('/chat/init', { lat, lng });
      currentConversationId.value = data.conversationId;
      addMessage({
        id: 'init-welcome',
        role: 'assistant',
        content: `${data.welcomeMessage}\n\n当前天气：${data.envContext.weather} ${data.envContext.temperature}℃`,
        type: 'text', // 初始欢迎语通常是文本
        createdAt: Date.now(),
      });
    } catch (e) {
      console.error('Init failed', e);
      addMessage({
        id: 'init-fail',
        role: 'assistant',
        content: '你好！我是非遗小助手。',
        type: 'text',
        createdAt: Date.now(),
      });
    }
  };

  // 2. 发送消息 (核心修复: URL)
  const sendMessage = async (content: string) => {
    if (!content.trim() || isStreaming.value) return;

    // 用户消息上屏
    addMessage({
      id: Date.now().toString(),
      role: 'user',
      content,
      type: 'text',
      createdAt: Date.now(),
    });

    // AI 消息预占位
    const aiMsgId = (Date.now() + 1).toString();
    const aiMsg = ref<ChatMessage>({
      id: aiMsgId,
      role: 'assistant',
      content: '',
      type: 'text',
      isLoading: true,
      createdAt: Date.now(),
    });
    messages.value.push(aiMsg.value);
    isStreaming.value = true;

    const body: any = { message: content };
    if (currentConversationId.value) {
      body.conversationId = currentConversationId.value;
    }

    // ✅ 修复：必须加上 /api 前缀，否则 fetch 不会走 vite proxy
    await fetchStream(
      '/api/chat/send', 
      body,
      {
        onMessage: (type, data) => {
          if (aiMsg.value.isLoading) aiMsg.value.isLoading = false;

          switch (type) {
            case 'message':
              if (typeof data === 'string') aiMsg.value.content += data;
              break;
            case 'conversationId':
              currentConversationId.value = Number(data);
              break;
            case 'location': // 处理地点推荐
              aiMsg.value.type = 'location';
              aiMsg.value.location = typeof data === 'string' ? JSON.parse(data) : data;
              break;
            case 'product': // 处理商品推荐
              aiMsg.value.type = 'product';
              aiMsg.value.products = typeof data === 'string' ? JSON.parse(data) : data;
              break;
            case 'error':
              aiMsg.value.content += `\n[错误: ${data}]`;
              break;
          }
        },
        onDone: () => {
          isStreaming.value = false;
        },
        onError: (err) => {
          console.error('SSE Error:', err);
          aiMsg.value.content += '\n[网络连接异常]';
          isStreaming.value = false;
        },
      }
    );
  };

  // 3. 获取会话列表
  const fetchConversations = async () => {
    try {
      const res: any = await http.post('/chat/conversations', { current: 1, pageSize: 20 });
      conversationList.value = res.records || [];
    } catch (error) {
      conversationList.value = [];
    }
  };

  // 4. 加载历史 (核心修复: 确保字段完整)
  const loadHistory = async (id: string) => {
    messages.value = [];
    currentConversationId.value = Number(id);

    try {
      const res = await http.get<ChatMessage[]>(`/chat/history/${id}`);
      if (Array.isArray(res)) {
        // ✅ 强制映射，防止字段丢失
        messages.value = res.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          // 如果后端历史接口没返回 type，尝试根据 content 内容特征回退，或者默认为 text
          type: msg.type || 'text',
          location: msg.location, // 确保后端返回了这些字段
          products: msg.products,
          createdAt: msg.createdAt,
          isLoading: false
        }));
      }
    } catch (error) {
      console.error('加载历史失败', error);
      addMessage({
        id: 'err',
        role: 'assistant',
        content: '无法加载历史记录。',
        type: 'text',
        createdAt: Date.now()
      });
    }
  };

  return {
    messages,
    isStreaming,
    currentConversationId,
    conversationList,
    initChat,
    sendMessage,
    fetchConversations,
    loadHistory
  };
});