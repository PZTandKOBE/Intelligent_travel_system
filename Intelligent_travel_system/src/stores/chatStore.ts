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
  
  // 当前天气状态
  const currentWeather = ref<string>('');
  
  // ✅ 新增：存储用户经纬度
  const userLocation = ref<{ lat: number; lng: number } | null>(null);

  const addMessage = (msg: ChatMessage) => {
    messages.value.push(msg);
  };

  // 1. 初始化会话 (同时保存经纬度)
  const initChat = async (lat: number, lng: number) => {
    messages.value = [];
    currentConversationId.value = null; 
    currentWeather.value = '';
    
    // ✅ 保存位置，供后续 sendMessage 使用
    userLocation.value = { lat, lng };

    try {
      const data = await http.post<ChatInitResponse>('/chat/init', { lat, lng });
      currentConversationId.value = data.conversationId;
      
      if (data.envContext && data.envContext.weather) {
        currentWeather.value = data.envContext.weather;
      }

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

  // 2. 发送消息 (自动携带经纬度)
  const sendMessage = async (content: string) => {
    if (!content.trim() || isStreaming.value) return;

    addMessage({
      id: Date.now().toString(),
      role: 'user',
      content,
      type: 'text',
      createdAt: Date.now(),
    });

    const aiMsgId = (Date.now() + 1).toString();
    const aiMsg = ref<ChatMessage>({
      id: aiMsgId,
      role: 'assistant',
      content: '',
      type: 'text',
      isLoading: true, // 开启 Loading
      createdAt: Date.now(),
    });
    messages.value.push(aiMsg.value);
    isStreaming.value = true;

    // ✅ 构建请求体：带上 lat/lng
    const body: any = { message: content };
    if (currentConversationId.value) {
      body.conversationId = currentConversationId.value;
    }
    // 如果有位置信息，带上它！
    if (userLocation.value) {
      body.lat = userLocation.value.lat;
      body.lng = userLocation.value.lng;
    }

    await fetchStream(
      '/api/chat/send', 
      body,
      {
        onMessage: (type, data) => {
          // 收到会话ID，不关 Loading
          if (type === 'conversationId') {
            currentConversationId.value = Number(data);
            return; 
          }

          // 收到实质内容，关闭 Loading
          if (aiMsg.value.isLoading) {
             aiMsg.value.isLoading = false; 
          }

          switch (type) {
            case 'message':
              if (typeof data === 'string') aiMsg.value.content += data;
              break;
            case 'location': 
              aiMsg.value.type = 'location';
              aiMsg.value.location = typeof data === 'string' ? JSON.parse(data) : data;
              break;
            case 'product': 
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
          if (aiMsg.value.isLoading) aiMsg.value.isLoading = false;
        },
        onError: (err) => {
          console.error('SSE Error:', err);
          aiMsg.value.content += '\n[网络连接异常]';
          isStreaming.value = false;
          if (aiMsg.value.isLoading) aiMsg.value.isLoading = false;
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

  // 4. 加载历史
  const loadHistory = async (id: string) => {
    messages.value = [];
    currentConversationId.value = Number(id);
    currentWeather.value = ''; 

    try {
      const res = await http.get<ChatMessage[]>(`/chat/history/${id}`);
      if (Array.isArray(res)) {
        messages.value = res.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          type: msg.type || 'text',
          location: msg.location,
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
    currentWeather, 
    userLocation, // 导出状态供调试
    initChat,
    sendMessage,
    fetchConversations,
    loadHistory
  };
});