// src/stores/chatStore.ts
import { defineStore } from 'pinia';
import { ref } from 'vue';
import http from '../utils/request';
import { showToast } from 'vant';
import { SSEClient, type SSECallback } from '../utils/sse-client';
import type { ChatMessage, ChatHistoryItem, LocationData } from '../types/api';

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
  
  // 缓存环境信息
  const envContext = ref({
    weather: '晴',
    city: '广州市',
    district: '天河区'
  });

  // 位置缓存
  const userLocation = ref<{ lat: number; lng: number }>({ lat: 23.1291, lng: 113.2644 });
  const isLocationInit = ref(false);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

  // ==================== 辅助函数 ====================

  const extractLocationsFromText = (text: string): LocationData[] => {
    const locations: LocationData[] = [];
    const markdownImgRegex = /!\[(.*?)\]\((https?:\/\/[^\)]+)\)/g;
    const legacyImgRegex = /地图图片：(https?:\/\/[^\s\n]+)/g;
    const parenthesesImgRegex = /（图片：(https?:\/\/[^\s\n）]+)）/g;

    const parseCoordsFromUrl = (url: string) => {
      const match = url.match(/(?:markers|center)=([\d\.]+),([\d\.]+)/);
      if (match) return { lng: parseFloat(match[1]), lat: parseFloat(match[2]) };
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

  const initLocation = async () => {
    if (isLocationInit.value) return userLocation.value;
    
    return new Promise<{lat: number, lng: number}>((resolve) => {
      if (!navigator.geolocation) {
        isLocationInit.value = true;
        resolve(userLocation.value);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          userLocation.value = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          isLocationInit.value = true;
          resolve(userLocation.value);
        },
        (err) => {
          console.warn('定位失败，使用默认坐标', err);
          isLocationInit.value = true;
          resolve(userLocation.value);
        },
        { timeout: 5000, enableHighAccuracy: true }
      );
    });
  };

  const generateLocalWelcome = () => {
    return `您好！我是您的非遗文化智能伴游助手。检测到您当前位于${envContext.value.city}。今天天气${envContext.value.weather}，非常适合探索周边的非遗文化！`;
  };

  // ==================== 核心功能 Action ====================

  const initChat = async () => {
    try {
      await initLocation();
      const { lat, lng } = userLocation.value;
      
      const res = await http.post<any>('/chat/init', { lat, lng });
      const data = (res as any).data || res;
      
      if (data) {
        if (data.envContext) {
          envContext.value = {
            weather: data.envContext.weather || '',
            city: data.envContext.city || '',
            district: data.envContext.district || ''
          };
        }
        
        if (messages.value.length === 0) {
          messages.value = [{
            id: Date.now().toString(),
            role: 'assistant',
            content: data.welcomeMessage || generateLocalWelcome(),
            createdAt: new Date().toISOString(),
            type: 'text'
          }];
        }
      }
    } catch (error) {
      console.error('初始化会话失败', error);
      if (messages.value.length === 0) {
        messages.value = [{
          id: Date.now().toString(),
          role: 'assistant',
          content: generateLocalWelcome(),
          createdAt: new Date().toISOString(),
          type: 'text'
        }];
      }
    }
  };

  const resetChat = () => {
    currentConversationId.value = null;
    messages.value = [{
      id: Date.now().toString(),
      role: 'assistant',
      content: generateLocalWelcome(),
      createdAt: new Date().toISOString(),
      type: 'text'
    }];
  };

  // ✅ 改标题接口：增加 silent 参数，控制是否显示弹窗
  const updateConversationTitle = async (id: number, newTitle: string, silent = false) => {
    try {
      await http.put(`/chat/conversation/${id}/title`, { title: newTitle });
      
      if (!silent) {
        showToast('修改成功');
      }

      // 立即更新本地列表，反应极快
      const item = historyList.value.find(i => i.id === id);
      if (item) {
        item.title = newTitle;
      }
      return true;
    } catch (error) {
      console.error('更新标题失败:', error);
      return false;
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

    // 标记：这是不是第一条用户消息？如果是，我们需要生成标题
    const isFirstUserMessage = messages.value.filter(m => m.role === 'user').length === 1;

    const { lat, lng } = userLocation.value;
    const sse = new SSEClient(`${API_BASE_URL}/chat/send`);
    
    try {
      await sse.connect({
        message: content,
        conversationId: currentConversationId.value,
        lat,
        lng
      }, (event: SSECallback) => {
        
        // 1. 监听会话 ID 事件
        if (event.event === 'conversationId') {
          const newId = Number(event.data);
          const isNewId = currentConversationId.value !== newId;
          currentConversationId.value = newId;

          // A. 如果是新 ID，立即添加到历史记录列表（防止列表为空）
          let historyItem = historyList.value.find(item => item.id === newId);
          if (!historyItem) {
             historyItem = {
                 id: newId,
                 userId: 0, 
                 title: '新会话',
                 createdAt: new Date().toISOString(),
                 updatedAt: new Date().toISOString()
             };
             // 插入到最前面
             historyList.value.unshift(historyItem);
          }

          // B. 核心逻辑：如果是第一条消息，自动生成标题并更新
          if (isFirstUserMessage) {
             // 截取前 15 个字作为标题
             const autoTitle = content.length > 15 ? content.slice(0, 15) + '...' : content;
             // 调用更新接口 (silent = true，不弹窗)
             updateConversationTitle(newId, autoTitle, true);
          }
          return;
        }

        // 2. 状态事件
        if (event.event === 'status') {
          if (event.data === 'thinking') {
            assistantMsg.value.isThinking = true;
          } else if (event.data === 'answering') {
            assistantMsg.value.isThinking = false;
          }
          return;
        }

        // 3. 错误事件
        if (event.event === 'error') {
          assistantMsg.value.content = '抱歉，遇到了一些问题，请稍后再试。';
          handleStreamEnd();
          return;
        }

        // 4. 消息内容
        if (event.event === 'message') {
          const rawData = event.data;
          
          if (typeof rawData === 'object' && rawData !== null) {
            if (rawData.type === 'text' && rawData.content) {
              assistantMsg.value.isThinking = false;
              assistantMsg.value.content += rawData.content;
            }
            else if (rawData.type === 'location' && Array.isArray(rawData.locations)) {
               assistantMsg.value.isThinking = false;
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
            // 兼容性处理：防止后端把 id 放在 message 里
            else if (rawData.type === 'start' && rawData.conversationId) {
               currentConversationId.value = rawData.conversationId;
            }
          } else {
             const text = String(rawData).replace(/^"|"$/g, '').replace(/\\n/g, '\n');
             if (text) {
                assistantMsg.value.isThinking = false;
                assistantMsg.value.content += text;
             }
          }

          const extractedLocations = extractLocationsFromText(assistantMsg.value.content);
          if (extractedLocations.length > (assistantMsg.value.locations?.length || 0)) {
               assistantMsg.value.locations = extractedLocations;
               assistantMsg.value.type = 'location';
          }
        }

        if (event.event === 'done') {
          handleStreamEnd();
        }
      });
    } catch (err) {
      console.error('SSE Error:', err);
      assistantMsg.value.content += '\n[网络连接异常]';
      handleStreamEnd();
    }

    function handleStreamEnd() {
      assistantMsg.value.isLoading = false;
      assistantMsg.value.isThinking = false;
      isStreaming.value = false;
      // ❌ 坚决不在这里调用 fetchHistory()，避免覆盖刚才自动生成的标题
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

  const deleteConversation = async (id: number) => {
    try {
      await http.delete(`/chat/conversation/${id}`);
      showToast('删除成功');
      historyList.value = historyList.value.filter(item => item.id !== id);
      if (currentConversationId.value === id) {
        resetChat();
      }
      return true;
    } catch (error) {
      console.error('删除会话失败:', error);
      return false;
    }
  };

  return {
    messages,
    historyList,
    currentConversationId,
    isStreaming,
    envContext,
    userLocation,
    initChat,
    resetChat,
    sendMessage,
    fetchHistory,
    loadHistory,
    deleteConversation,      
    updateConversationTitle,
    initLocation
  };
});