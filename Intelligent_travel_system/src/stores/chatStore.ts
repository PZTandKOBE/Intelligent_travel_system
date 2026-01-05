// src/stores/chatStore.ts
import { defineStore } from 'pinia';
import { ref } from 'vue';
import http from '../utils/request';
import { SSEClient, type SSECallback } from '../utils/sse-client';
import type { ChatMessage, ChatHistoryItem, LocationData } from '../types/api';

interface ExtendedMessage extends ChatMessage {
  isLoading?: boolean;
  isThinking?: boolean;
  tempContent?: string;
}

export const useChatStore = defineStore('chat', () => {
  const messages = ref<ExtendedMessage[]>([]);
  const historyList = ref<ChatHistoryItem[]>([]);
  const currentConversationId = ref<number | null>(null);
  const isStreaming = ref(false);
  const currentWeather = ref('');

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

  // ✅ 核心修复：升级解析逻辑
  // 1. 支持 Markdown 图片 ![name](url)
  // 2. 从百度地图 URL 参数中提取经纬度
  const extractLocationsFromText = (text: string): LocationData[] => {
    const locations: LocationData[] = [];
    
    // 匹配 Markdown 图片语法: ![alt](url)
    // 同时也兼容之前的 "地图图片：url" 格式（为了稳健）
    const markdownImgRegex = /!\[(.*?)\]\((https?:\/\/[^\)]+)\)/g;
    const legacyImgRegex = /地图图片：(https?:\/\/[^\s\n]+)/g;

    // 辅助函数：解析 URL 中的坐标
    const parseCoordsFromUrl = (url: string) => {
      // 百度静态图 URL 通常包含 markers=lng,lat 或 center=lng,lat
      // 例如: markers=113.252922,23.132124
      const match = url.match(/(?:markers|center)=([\d\.]+),([\d\.]+)/);
      if (match) {
        return { lng: parseFloat(match[1]), lat: parseFloat(match[2]) };
      }
      return { lng: 0, lat: 0 };
    };

    // 1. 处理 Markdown 图片
    let match;
    while ((match = markdownImgRegex.exec(text)) !== null) {
      const [_, alt, url] = match;
      const { lng, lat } = parseCoordsFromUrl(url);
      
      locations.push({
        name: alt || '推荐地点',
        address: '点击卡片查看详情', // 暂时无法精确关联上下文的地址文本，用通用文案
        lat,
        lng,
        mapImageUrl: url,
        images: [url]
      });
    }

    // 2. 处理旧格式（如果混合存在）
    while ((match = legacyImgRegex.exec(text)) !== null) {
      const [_, url] = match;
      // 避免重复添加
      if (!locations.find(l => l.mapImageUrl === url)) {
        const { lng, lat } = parseCoordsFromUrl(url);
        locations.push({
          name: '推荐地点',
          address: '点击查看详情',
          lat,
          lng,
          mapImageUrl: url,
          images: [url]
        });
      }
    }

    return locations;
  };

  const initChat = async (lat: number, lng: number) => {
    try {
      const res = await http.post<any>('/chat/init', { lat, lng });
      const data = (res as any).data || res;
      
      if (data) {
        currentConversationId.value = data.conversationId;
        if (data.envContext) {
          currentWeather.value = data.envContext.weather;
        }
        messages.value = [{
          id: Date.now().toString(),
          role: 'assistant',
          content: data.welcomeMessage,
          createdAt: new Date().toISOString(),
          type: 'text'
        }];
      }
    } catch (error) {
      console.error('初始化会话失败', error);
    }
  };

  // ✅ 核心修复：Promise 封装定位，解决异步导致坐标错误的问题
  const getGeoLocation = (): Promise<{lat: number, lng: number}> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        console.warn('浏览器不支持地理定位');
        resolve({ lat: 23.1291, lng: 113.2644 }); // 默认广州
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          console.log('定位成功:', pos.coords.latitude, pos.coords.longitude);
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err) => {
          console.error('定位失败，使用默认坐标:', err);
          resolve({ lat: 23.1291, lng: 113.2644 }); // 失败回退
        },
        { timeout: 5000, enableHighAccuracy: true }
      );
    });
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

    // ✅ 修复：等待定位完成后再继续
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
          if (event.data === 'thinking') {
             assistantMsg.value.isThinking = true;
          } else if (event.data === 'answering') {
             assistantMsg.value.isThinking = false;
          }
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
          
          // 处理结构化 JSON
          if (typeof rawData === 'object' && rawData !== null) {
            if (rawData.type === 'start') {
              if (rawData.conversationId) {
                currentConversationId.value = rawData.conversationId;
              }
            }
            else if (rawData.type === 'text') {
              if (rawData.content) {
                assistantMsg.value.content += rawData.content;
              }
            }
            else if (rawData.type === 'location') {
              // 后端直接返回 location 列表的情况
              if (Array.isArray(rawData.locations)) {
                // 合并后端返回的 locations
                const backendLocations = rawData.locations.map((item: any) => ({
                  name: item.name,
                  address: item.address,
                  lat: item.lat,
                  lng: item.lng,
                  mapImageUrl: (item.images && item.images.length > 0) ? item.images[0] : '',
                  images: item.images
                }));
                // 避免重复
                 assistantMsg.value.locations = [
                    ...(assistantMsg.value.locations || []),
                    ...backendLocations
                 ];
                 assistantMsg.value.type = 'location';
              }
            }
          } 
          // 纯文本兼容
          else {
             const text = String(rawData).replace(/^"|"$/g, '').replace(/\\n/g, '\n');
             assistantMsg.value.content += text;
          }

          // ✅ 实时解析文本中的 Markdown 图片
          // 每次文本更新都重新解析一遍，确保能捕获最新生成的图片
          const extractedLocations = extractLocationsFromText(assistantMsg.value.content);
          if (extractedLocations.length > 0) {
            // 这里我们采用"并集"策略，或者如果解析到了就优先用解析的
            // 为了简单，我们直接覆盖 locations（如果后端没发 type:location 事件的话）
            // 或者如果已经有 locations 了，就不覆盖？
            // 策略：如果 extractedLocations 数量比当前多，就更新
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
    } catch (e) {
      console.error(e);
    }
  };

  const loadHistory = async (id: string | number) => {
    try {
      const res: any = await http.get(`/chat/history/${id}`);
      currentConversationId.value = Number(id);
      messages.value = (res || []).map((msg: any) => ({
        ...msg,
        type: (msg.locations && msg.locations.length > 0) ? 'location' : 'text'
      }));
    } catch (e) {
      console.error(e);
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
    loadHistory
  };
});