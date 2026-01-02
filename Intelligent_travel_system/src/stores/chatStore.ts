import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { ChatMessage, ChatInitResponse } from '../types/api'; // 引入类型
import http from '../utils/request'; // 注意这里导入的是我们新封装的 http
import { fetchStream } from '../utils/sse-client';

export const useChatStore = defineStore('chat', () => {
  const messages = ref<ChatMessage[]>([]);
  const isStreaming = ref(false);

  const addMessage = (msg: ChatMessage) => {
    messages.value.push(msg);
  };

  const initChat = async (lat: number, lng: number) => {
    if (messages.value.length > 0) return;

    try {
      // 修复点：添加泛型 <ChatInitResponse>
      // 此时 data 被推断为 ChatInitResponse 类型，不再是 AxiosResponse
      const data = await http.post<ChatInitResponse>('/chat/init', { lat, lng });

      addMessage({
        id: 'init-welcome',
        role: 'assistant',
        // 现在这里不会报错了，IDE 会有智能提示
        content: `${data.welcomeMessage}\n\n当前天气：${data.weather}`,
        type: 'text',
        createdAt: Date.now(),
      });
    } catch (e) {
      console.error('Init failed', e);
      // 失败兜底
      addMessage({
        id: 'init-fail',
        role: 'assistant',
        content: '你好！我是非遗小助手。这里信号好像不太好，但我依然可以为你服务。',
        type: 'text',
        createdAt: Date.now(),
      });
    }
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isStreaming.value) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      type: 'text',
      createdAt: Date.now(),
    };
    addMessage(userMsg);

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

    await fetchStream(
      '/api/chat/send',
      { message: content },
      {
        onMessage: (chunk) => {
          if (aiMsg.value.isLoading) aiMsg.value.isLoading = false;
          aiMsg.value.content += chunk;
        },
        onDone: () => {
          isStreaming.value = false;
        },
        onError: () => {
          aiMsg.value.content += '\n[网络异常，请重试]';
          isStreaming.value = false;
        },
      }
    );
  };

  return {
    messages,
    isStreaming,
    initChat,
    sendMessage,
  };
});