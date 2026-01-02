import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { ChatMessage, ChatInitResponse, ConversationItem } from '../types/api';
import http from '../utils/request';
import { fetchStream } from '../utils/sse-client';

export const useChatStore = defineStore('chat', () => {
  // 消息列表
  const messages = ref<ChatMessage[]>([]);
  // 是否正在流式输出
  const isStreaming = ref(false);
  // 当前会话 ID (为空表示新会话)
  const currentConversationId = ref<string>('');
  // 会话列表数据
  const conversationList = ref<ConversationItem[]>([]);

  const addMessage = (msg: ChatMessage) => {
    messages.value.push(msg);
  };

  // 1. 初始化新会话
  const initChat = async (lat: number, lng: number) => {
    // 每次进入新会话，清空数据
    messages.value = [];
    currentConversationId.value = ''; 
    
    try {
      // 调用初始化接口获取欢迎语
      const data = await http.post<ChatInitResponse>('/chat/init', { lat, lng });
      
      addMessage({
        id: 'init-welcome',
        role: 'assistant',
        content: `${data.welcomeMessage}\n\n当前天气：${data.weather}`,
        type: 'text',
        createdAt: Date.now(),
      });
    } catch (e) {
      console.error('Init failed', e);
      addMessage({
        id: 'init-fail',
        role: 'assistant',
        content: '你好！我是非遗小助手。虽然网络有点波动，但我依然可以为你服务。',
        type: 'text',
        createdAt: Date.now(),
      });
    }
  };

  // 2. 发送消息
  const sendMessage = async (content: string) => {
    if (!content.trim() || isStreaming.value) return;

    // 1. 上屏用户消息
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      type: 'text',
      createdAt: Date.now(),
    };
    addMessage(userMsg);

    // 2. 预占位 AI 消息
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

    // 3. 准备请求体
    // 如果是历史会话续聊，尝试带上 conversationId (取决于后端是否支持显式传参)
    const body: any = { message: content };
    if (currentConversationId.value) {
      body.conversationId = currentConversationId.value;
    }

    // 4. 发起 SSE 请求
    await fetchStream(
      '/api/chat/send',
      body,
      {
        onMessage: (chunk) => {
          if (aiMsg.value.isLoading) aiMsg.value.isLoading = false;
          aiMsg.value.content += chunk;
        },
        onDone: () => {
          isStreaming.value = false;
          // 如果后端在 SSE 结束时返回了新的 conversationId，可以在这里更新
          // 暂时假设逻辑是依赖前端状态
        },
        onError: () => {
          aiMsg.value.content += '\n[网络异常，请重试]';
          isStreaming.value = false;
        },
      }
    );
  };

  // 3. 获取会话列表 (用于历史记录页)
  const fetchConversations = async () => {
    try {
      // POST /chat/conversations
      const res = await http.post<ConversationItem[]>('/chat/conversations', {});
      conversationList.value = res || [];
    } catch (error) {
      console.error('获取会话列表失败', error);
      conversationList.value = [];
    }
  };

  // 4. 加载特定历史会话 (用于回看)
  const loadHistory = async (id: string) => {
    messages.value = []; // 先清空
    currentConversationId.value = id; // 标记当前 ID

    try {
      // GET /chat/history/{id}
      const res = await http.get<ChatMessage[]>(`/chat/history/${id}`);
      
      if (Array.isArray(res)) {
        messages.value = res;
      } else {
        messages.value = [];
      }
    } catch (error) {
      console.error('加载历史记录失败', error);
      addMessage({
        id: 'err',
        role: 'assistant',
        content: '无法加载历史记录，请重试。',
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