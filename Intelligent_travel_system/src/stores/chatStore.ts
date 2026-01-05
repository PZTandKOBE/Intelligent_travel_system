// src/stores/chatStore.ts
import { defineStore } from 'pinia';
import { ref } from 'vue';
import http from '../utils/request';
import { showToast } from 'vant'; // ✅ 记得引入 showToast
import { SSEClient, type SSECallback } from '../utils/sse-client';
import type { ChatMessage, ChatHistoryItem, LocationData } from '../types/api';

// 扩展 Message 类型以支持前端状态
interface ExtendedMessage extends ChatMessage {
  isLoading?: boolean;
  isThinking?: boolean;
  tempContent?: string;
}

export const useChatStore = defineStore('chat', () => {
  // ==================== 状态定义 ====================
  const messages = ref<ExtendedMessage[]>([]);
  const historyList = ref<ChatHistoryItem[]>([]);
  const currentConversationId = ref<number | null>(null);
  const isStreaming = ref(false);
  const currentWeather = ref('');

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

  // ==================== 辅助函数 ====================

  // 增强正则解析，兼容三种图片格式
  const extractLocationsFromText = (text: string): LocationData[] => {
    const locations: LocationData[] = [];
    
    // 1. Markdown 格式: ![alt](url)
    const markdownImgRegex = /!\[(.*?)\]\((https?:\/\/[^\)]+)\)/g;
    // 2. 旧文本格式: 地图图片：url
    const legacyImgRegex = /地图图片：(https?:\/\/[^\s\n]+)/g;
    // 3. 全角括号格式: （图片：url）
    const parenthesesImgRegex = /（图片：(https?:\/\/[^\s\n）]+)）/g;

    // 从百度静态图 URL 中解析 lat/lng
    const parseCoordsFromUrl = (url: string) => {
      const match = url.match(/(?:markers|center)=([\d\.]+),([\d\.]+)/);
      if (match) {
        return { lng: parseFloat(match[1]), lat: parseFloat(match[2]) };
      }
      return { lng: 0, lat: 0 };
    };

    const processMatch = (name: string, url: string) => {
      if (locations.find(l => l.mapImageUrl === url)) return;
      const { lng, lat } = parseCoordsFromUrl(url);
      locations.push({
        name: name || '推荐地点',
        address: '点击卡片查看详情',
        lat,
        lng,
        mapImageUrl: url,
        images: [url]
      });
    };

    let match;
    while ((match = markdownImgRegex.exec(text)) !== null) processMatch(match[1], match[2]);
    while ((match = legacyImgRegex.exec(text)) !== null) processMatch('推荐地点', match[1]);
    while ((match = parenthesesImgRegex.exec(text)) !== null) processMatch('推荐地点', match[1]);

    return locations;
  };

  // Promise 封装定位
  const getGeoLocation = (): Promise<{lat: number, lng: number}> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({ lat: 23.1291, lng: 113.2644 });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => resolve({ lat: 23.1291, lng: 113.2644 }),
        { timeout: 5000, enableHighAccuracy: true }
      );
    });
  };

  // ==================== 核心功能 Action ====================

  const initChat = async (lat: number, lng: number) => {
    try {
      const res = await http.post<any>('/chat/init', { lat, lng });
      const data = (res as any).data || res;
      
      if (data) {
        currentConversationId.value = data.conversationId;
        if (data.envContext) {
          currentWeather.value = data.envContext.weather;
        }
        // 如果当前没有消息，显示欢迎语
        if (messages.value.length === 0) {
          messages.value = [{
            id: Date.now().toString(),
            role: 'assistant',
            content: data.welcomeMessage,
            createdAt: new Date().toISOString(),
            type: 'text'
          }];
        }
      }
    } catch (error) {
      console.error('初始化会话失败', error);
    }
  };

  const sendMessage = async (content: string) => {
    const userMsg: ExtendedMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
      type: 'text'
    };
    messages.value.push(userMsg);
    isStreaming.value = true;

    const assistantMsg = ref<ExtendedMessage>({
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
      type: 'text',
      isLoading: true,
      isThinking: true,
      locations: []
    });
    messages.value.push(assistantMsg.value);

    const { lat, lng } = await getGeoLocation();
    const sse = new SSEClient(`${API_BASE_URL}/chat/send`);
    
    try {
      await sse.connect({
        message: content,
        conversationId: currentConversationId.value,
        lat,
        lng
      }, (event: SSECallback) => {
        if (event.event === 'status') {
          assistantMsg.value.isThinking = (event.data === 'thinking');
          return;
        }

        if (event.event === 'error') {
          assistantMsg.value.content = '抱歉，遇到了一些问题，请稍后再试。';
          assistantMsg.value.isLoading = false;
          assistantMsg.value.isThinking = false;
          isStreaming.value = false;
          return;
        }

        if (event.event === 'message') {
          assistantMsg.value.isThinking = false;
          const rawData = event.data;
          
          if (typeof rawData === 'object' && rawData !== null) {
            if (rawData.type === 'start') {
              if (rawData.conversationId) currentConversationId.value = rawData.conversationId;
            }
            else if (rawData.type === 'text') {
              if (rawData.content) assistantMsg.value.content += rawData.content;
            }
            else if (rawData.type === 'location') {
               if (Array.isArray(rawData.locations)) {
                 const backendLocations = rawData.locations.map((item: any) => ({
                    name: item.name,
                    address: item.address,
                    lat: item.lat,
                    lng: item.lng,
                    mapImageUrl: (item.images && item.images.length > 0) ? item.images[0] : '',
                    images: item.images
                 }));
                 assistantMsg.value.locations = [
                    ...(assistantMsg.value.locations || []),
                    ...backendLocations
                 ];
                 assistantMsg.value.type = 'location';
               }
            }
          } else {
             const text = String(rawData).replace(/^"|"$/g, '').replace(/\\n/g, '\n');
             assistantMsg.value.content += text;
          }

          const extractedLocations = extractLocationsFromText(assistantMsg.value.content);
          if (extractedLocations.length > 0) {
            if (extractedLocations.length > (assistantMsg.value.locations?.length || 0)) {
               assistantMsg.value.locations = extractedLocations;
               assistantMsg.value.type = 'location';
            }
          }
        }

        if (event.event === 'done') {
          assistantMsg.value.isLoading = false;
          assistantMsg.value.isThinking = false;
          isStreaming.value = false;
        }
      });
    } catch (err) {
      console.error('SSE Error:', err);
      assistantMsg.value.content += '\n[网络连接异常]';
      assistantMsg.value.isLoading = false;
      assistantMsg.value.isThinking = false;
      isStreaming.value = false;
    }
  };

  const fetchHistory = async () => {
    try {
      const res: any = await http.post('/chat/conversations', { current: 1, pageSize: 20 });
      historyList.value = res.records || [];
    } catch (e) { console.error(e); }
  };

  const loadHistory = async (id: string | number) => {
    try {
      const res: any = await http.get(`/chat/history/${id}`);
      currentConversationId.value = Number(id);
      messages.value = (res || []).map((msg: any) => ({
        ...msg,
        type: (msg.locations && msg.locations.length > 0) ? 'location' : 'text'
      }));
    } catch (e) { console.error(e); }
  };

  // ✅ 恢复缺失的删除会话方法
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

  // ✅ 恢复缺失的修改标题方法
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
    messages,
    historyList,
    currentConversationId,
    isStreaming,
    currentWeather,
    initChat,
    sendMessage,
    fetchHistory,
    loadHistory,
    deleteConversation,      
    updateConversationTitle  
  };
});