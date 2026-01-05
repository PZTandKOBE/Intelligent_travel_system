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

  // 辅助函数：确保会话出现在历史列表中（带类型兼容处理）
  const ensureHistoryItem = (id: number, title: string) => {
    // 使用 == 稍微放宽类型检查，防止 string/number 不匹配
    const existingItem = historyList.value.find(item => item.id == id);
    if (existingItem) {
      existingItem.title = title; // 实时更新本地显示
    } else {
      historyList.value.unshift({
        id,
        userId: 0, 
        title: title,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
  };

  // ==================== 核心功能 Action ====================

  const initChat = async () => {
    try {
      await initLocation();
      const { lat, lng } = userLocation.value;
      
      const res = await http.post<any>('/chat/init', { lat, lng });
      const data = (res as any).data || res;
      
      if (data) {
        if (data.conversationId) {
          currentConversationId.value = Number(data.conversationId);
        }

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

  const updateConversationTitle = async (id: number, newTitle: string, silent = false) => {
    // 1. 先更新本地，保证UI立刻变
    ensureHistoryItem(id, newTitle);

    try {
      await http.put(`/chat/conversation/${id}/title`, { title: newTitle });
      
      if (!silent) {
        showToast('修改成功');
      }
      return true;
    } catch (error) {
      console.error('更新标题失败:', error);
      return false;
    }
  };

  // 【核心修复】拉取历史记录时，防止旧数据覆盖新数据
  const fetchHistory = async () => {
    try {
      const res: any = await http.post('/chat/conversations', { current: 1, pageSize: 20 });
      const remoteRecords = res.records || [];

      // 防覆盖逻辑：如果当前会话刚刚改过名，但后端列表还没更新，我们保留本地的正确标题
      if (currentConversationId.value) {
        const localItem = historyList.value.find(i => i.id == currentConversationId.value);
        const remoteItem = remoteRecords.find((i: any) => i.id == currentConversationId.value);
        
        // 如果本地有标题，且不是默认的"新会话"，而后端返回的是空的或"新会话"，则信任本地
        if (localItem && remoteItem && localItem.title && localItem.title !== '新会话') {
           if (!remoteItem.title || remoteItem.title === '新会话') {
              remoteItem.title = localItem.title; 
           }
        }
      }

      historyList.value = remoteRecords;
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

  const sendMessage = async (content: string) => {
    // 1. 消息上屏
    messages.value.push({
      id: Date.now().toString(),
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
      type: 'text'
    });
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

    // 2. 自动改名检查
    const isFirstUserMessage = messages.value.filter(m => m.role === 'user').length === 1;
    let hasUpdatedTitle = false;

    // 尝试立即改名（利用 initChat 的 ID）
    if (isFirstUserMessage && currentConversationId.value) {
      const cleanContent = content.trim();
      const autoTitle = cleanContent.length > 15 ? cleanContent.slice(0, 15) + '...' : cleanContent;
      updateConversationTitle(currentConversationId.value, autoTitle, true);
      hasUpdatedTitle = true;
    }

    const { lat, lng } = userLocation.value;
    const sse = new SSEClient(`${API_BASE_URL}/chat/send`);
    
    try {
      await sse.connect({
        message: content,
        conversationId: currentConversationId.value,
        lat,
        lng
      }, (event: SSECallback) => {
        
        // --- ID 事件 ---
        if (event.event === 'conversationId') {
          const newId = Number(event.data);
          currentConversationId.value = newId;

          // 如果还没改名（之前没ID），现在有了ID就赶紧改
          if (isFirstUserMessage && !hasUpdatedTitle) {
             const cleanContent = content.trim();
             const autoTitle = cleanContent.length > 15 ? cleanContent.slice(0, 15) + '...' : cleanContent;
             updateConversationTitle(newId, autoTitle, true);
             hasUpdatedTitle = true;
          } else {
             // 即使不改名，也要确保该 ID 存在于历史列表中
             const currentTitle = hasUpdatedTitle ? (content.length > 15 ? content.slice(0,15)+'...' : content) : '新会话';
             // 再次确认本地列表有这个ID
             const exists = historyList.value.some(i => i.id == newId);
             if (!exists) {
               ensureHistoryItem(newId, currentTitle);
             }
          }
          return;
        }

        // --- 状态/错误处理 ---
        if (event.event === 'status') {
          if (event.data === 'thinking') assistantMsg.value.isThinking = true;
          else if (event.data === 'answering') assistantMsg.value.isThinking = false;
        } else if (event.event === 'error') {
          assistantMsg.value.content = '抱歉，遇到了一些问题，请稍后再试。';
          handleStreamEnd();
        } 
        // --- 消息处理 ---
        else if (event.event === 'message') {
          const rawData = event.data;
          if (typeof rawData === 'object' && rawData !== null) {
            if (rawData.type === 'text') {
              assistantMsg.value.isThinking = false;
              assistantMsg.value.content += (rawData.content || '');
            } else if (rawData.type === 'location') {
              // ... 处理地点卡片 ...
              assistantMsg.value.isThinking = false;
              const backendLocations = (rawData.locations || []).map((item: any) => ({
                 name: item.name, address: item.address, lat: item.lat, lng: item.lng,
                 mapImageUrl: item.images?.[0] || '', images: item.images
              }));
              assistantMsg.value.locations = [...(assistantMsg.value.locations || []), ...backendLocations];
              assistantMsg.value.type = 'location';
            } else if (rawData.type === 'start') {
              currentConversationId.value = rawData.conversationId;
            }
          } else {
             // 纯文本兼容
             const text = String(rawData).replace(/^"|"$/g, '').replace(/\\n/g, '\n');
             if (text) {
                assistantMsg.value.isThinking = false;
                assistantMsg.value.content += text;
             }
          }
          // 地图链接解析
          const extracted = extractLocationsFromText(assistantMsg.value.content);
          if (extracted.length > (assistantMsg.value.locations?.length || 0)) {
               assistantMsg.value.locations = extracted;
               assistantMsg.value.type = 'location';
          }
        } else if (event.event === 'done') {
          handleStreamEnd();
        }
      });
    } catch (err) {
      console.error(err);
      assistantMsg.value.content += '\n[网络异常]';
      handleStreamEnd();
    }

    function handleStreamEnd() {
      assistantMsg.value.isLoading = false;
      assistantMsg.value.isThinking = false;
      isStreaming.value = false;
    }
  };

  const deleteConversation = async (id: number) => {
    try {
      await http.delete(`/chat/conversation/${id}`);
      showToast('删除成功');
      historyList.value = historyList.value.filter(item => item.id !== id);
      if (currentConversationId.value === id) resetChat();
      return true;
    } catch (error) { return false; }
  };

  return {
    messages, historyList, currentConversationId, isStreaming, envContext, userLocation,
    initChat, resetChat, sendMessage, fetchHistory, loadHistory, deleteConversation, updateConversationTitle, initLocation
  };
});