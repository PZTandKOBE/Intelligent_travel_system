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
  // 当前会话 ID
  const currentConversationId = ref<number | null>(null);
  // 会话列表数据
  const conversationList = ref<ConversationItem[]>([]);

  const addMessage = (msg: ChatMessage) => {
    messages.value.push(msg);
  };

  // 1. 初始化新会话
  const initChat = async (lat: number, lng: number) => {
    messages.value = [];
    currentConversationId.value = null; 
    
    try {
      const data = await http.post<ChatInitResponse>('/chat/init', { lat, lng });
      
      // 保存会话ID
      currentConversationId.value = data.conversationId;

      addMessage({
        id: 'init-welcome',
        role: 'assistant',
        content: `${data.welcomeMessage}\n\n当前天气：${data.envContext.weather} ${data.envContext.temperature}℃`,
        type: 'text',
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

  // 2. 发送消息
  const sendMessage = async (content: string) => {
    if (!content.trim() || isStreaming.value) return;

    // 1. 上屏用户消息
    addMessage({
      id: Date.now().toString(),
      role: 'user',
      content,
      type: 'text',
      createdAt: Date.now(),
    });

    // 2. 预占位 AI 消息
    const aiMsgId = (Date.now() + 1).toString();
    const aiMsg = ref<ChatMessage>({
      id: aiMsgId,
      role: 'assistant',
      content: '',
      type: 'text', // 默认为 text, 如果 SSE 返回了 location 数据，我们在回调里修改
      isLoading: true,
      createdAt: Date.now(),
    });
    messages.value.push(aiMsg.value);
    isStreaming.value = true;

    // 3. 准备请求体
    const body: any = { message: content };
    // 如果有 conversationId，带上
    if (currentConversationId.value) {
      body.conversationId = currentConversationId.value;
    }

    // 4. 发起 SSE 请求
    // 假设后端 endpoint 是 /api/chat/send
    await fetchStream(
      '/api/chat/send',
      body,
      {
        onMessage: (type, data) => {
          if (aiMsg.value.isLoading) aiMsg.value.isLoading = false;

          // 根据事件类型处理
          switch (type) {
            case 'message':
              // data 是文本片段
              if (typeof data === 'string') {
                 aiMsg.value.content += data;
              }
              break;
            
            case 'conversationId':
              // 如果是新会话，后端可能会返回 ID
              currentConversationId.value = Number(data);
              break;
            
            case 'status':
              // 例如 "thinking" 或 "answering"，目前前端只显示 isLoading，暂不处理
              break;

            case 'error':
              aiMsg.value.content += `\n[错误: ${data}]`;
              break;
              
            // 如果后端直接返回复杂的 JSON 对象用于渲染卡片
            // 比如 event: location_recommend, data: { ... }
            // 这里可以扩展
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
      console.error('获取会话列表失败', error);
      conversationList.value = [];
    }
  };

  // 4. 加载特定历史会话
  const loadHistory = async (id: string) => {
    messages.value = [];
    currentConversationId.value = Number(id);

    try {
      // 接口返回的是消息数组
      const res = await http.get<ChatMessage[]>(`/chat/history/${id}`);
      
      if (Array.isArray(res)) {
        messages.value = res.map(msg => ({
          ...msg,
          // 确保字段兼容，比如后端返回的可能是 created_at 下划线风格，需注意转换
          // 这里假设后端已按 camelCase 返回
          isLoading: false
        }));
      }
    } catch (error) {
      console.error('加载历史记录失败', error);
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