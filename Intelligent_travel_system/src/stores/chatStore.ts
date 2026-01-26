// src/stores/chatStore.ts
import { defineStore } from 'pinia';
import { ref } from 'vue';
import http from '../utils/request';
import { showToast } from 'vant';
import { SSEClient, type SSECallback } from '../utils/sse-client';
import { getStaticMapUrl } from '../utils/amap'; // ✅ 引入地图工具
import type { ChatMessage, ChatHistoryItem, LocationData } from '../types/api';

interface ExtendedMessage extends ChatMessage {
  isLoading?: boolean;
  isThinking?: boolean;
  tempContent?: string;
}

// ✅ 配置打字机效果参数
const TYPING_SPEED = 50; // 打字间隔 (毫秒)，越大越慢
const CHUNK_SIZE = 1;    // 每次渲染多少个字符，1=逐字渲染

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

  // ==================== 打字机核心逻辑 ====================
  let textBuffer = ''; // 待渲染的文本队列
  let typingTimer: any = null;
  let isTyping = false;

  // 启动打字机循环
  const startTypingLoop = (targetMsg: ExtendedMessage) => {
    if (isTyping) return;
    isTyping = true;

    const loop = () => {
      // 如果缓冲区有内容，取出 CHUNK_SIZE 个字符上屏
      if (textBuffer.length > 0) {
        const chunk = textBuffer.slice(0, CHUNK_SIZE);
        textBuffer = textBuffer.slice(CHUNK_SIZE);
        targetMsg.content += chunk;
        
        // 继续下一轮
        typingTimer = setTimeout(loop, TYPING_SPEED);
      } else {
        // 缓冲区空了
        if (!isStreaming.value) {
          // 如果 SSE 也结束了，那就彻底停止
          isTyping = false;
          clearTimeout(typingTimer);
          targetMsg.isLoading = false; // 彻底完成
        } else {
          // SSE 还没断，可能只是卡顿，继续空转检查（或者稍微降低频率等待）
          typingTimer = setTimeout(loop, 100); 
        }
      }
    };
    
    loop();
  };

  // ==================== 辅助函数 ====================

  // 解析文本中的特定格式或 Markdown 图片作为地点
  const extractLocationsFromText = (text: string): LocationData[] => {
    const locations: LocationData[] = [];
    // 匹配 Markdown 图片语法或旧版语法
    const markdownImgRegex = /!\[(.*?)\]\((https?:\/\/[^\)]+)\)/g;

    const parseCoordsFromUrl = (url: string) => {
      // 尝试从 URL 中提取经纬度 (兼容高德静态图 URL 格式)
      const match = url.match(/(?:markers|center|location)=([\d\.]+),([\d\.]+)/);
      if (match) return { lng: parseFloat(match[1]), lat: parseFloat(match[2]) };
      return null;
    };

    let match;
    while ((match = markdownImgRegex.exec(text)) !== null) {
      const name = match[1] || '推荐地点';
      const url = match[2];
      
      const coords = parseCoordsFromUrl(url);
      // 如果 URL 里包含经纬度，说明是有效的地图链接
      if (coords) {
         // 去重
         if (!locations.find(l => l.mapImageUrl === url)) {
            locations.push({
              name: name,
              address: '点击查看详情',
              lat: coords.lat,
              lng: coords.lng,
              mapImageUrl: url, // 已经是地图 URL 了
              images: [] // 这里没有实景图
            });
         }
      }
    }
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

  const ensureHistoryItem = (id: number, title: string) => {
    const existingItem = historyList.value.find(item => item.id == id);
    if (existingItem) {
      existingItem.title = title;
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
        if (data.conversationId) currentConversationId.value = Number(data.conversationId);
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
    ensureHistoryItem(id, newTitle);
    try {
      await http.put(`/chat/conversation/${id}/title`, { title: newTitle });
      if (!silent) showToast('修改成功');
      return true;
    } catch (error) {
      return false;
    }
  };

  const fetchHistory = async () => {
    try {
      const res: any = await http.post('/chat/conversations', { current: 1, pageSize: 20 });
      const remoteRecords = res.records || [];
      if (currentConversationId.value) {
        const localItem = historyList.value.find(i => i.id == currentConversationId.value);
        const remoteItem = remoteRecords.find((i: any) => i.id == currentConversationId.value);
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
      messages.value = (res || []).map((msg: any) => {
        // 历史消息如果是 location 类型，需要补全 mapImageUrl
        if (msg.locations && msg.locations.length > 0) {
           msg.locations = msg.locations.map((loc: any) => ({
             ...loc,
             mapImageUrl: getStaticMapUrl(loc.lat, loc.lng), // ✅ 补全地图链接
             images: loc.images || []
           }));
        }
        return {
          ...msg,
          type: (msg.locations && msg.locations.length > 0) ? 'location' : 'text'
        };
      });
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
    
    // 标记开始流式传输
    isStreaming.value = true;
    // 重置打字机缓冲区
    textBuffer = ''; 
    isTyping = false;
    if (typingTimer) clearTimeout(typingTimer);

    // 创建 AI 占位消息
    const assistantMsg = ref<ExtendedMessage>({
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '', // 初始为空，等待打字机填充
      createdAt: new Date().toISOString(),
      type: 'text',
      isLoading: true,
      isThinking: true, // 显示思考动画
      locations: []
    });
    messages.value.push(assistantMsg.value);

    // 自动标题逻辑
    const isFirstUserMessage = messages.value.filter(m => m.role === 'user').length === 1;
    let hasUpdatedTitle = false;
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
          if (isFirstUserMessage && !hasUpdatedTitle) {
             const cleanContent = content.trim();
             const autoTitle = cleanContent.length > 15 ? cleanContent.slice(0, 15) + '...' : cleanContent;
             updateConversationTitle(newId, autoTitle, true);
             hasUpdatedTitle = true;
          } else {
             const exists = historyList.value.some(i => i.id == newId);
             if (!exists) ensureHistoryItem(newId, '新会话');
          }
        }

        // --- 状态事件 ---
        else if (event.event === 'status') {
          if (event.data === 'thinking') {
            assistantMsg.value.isThinking = true;
          } else if (event.data === 'answering') {
            assistantMsg.value.isThinking = false;
            // 状态变为回答时，确保开启打字机循环
            startTypingLoop(assistantMsg.value);
          }
        } 
        
        // --- 错误事件 ---
        else if (event.event === 'error') {
          // 直接推入缓冲区，走打字机效果显示错误
          textBuffer += '\n[抱歉，遇到了一些问题，请稍后再试]';
          handleStreamEnd();
        } 
        
        // --- 核心消息处理 ---
        else if (event.event === 'message') {
          const rawData = event.data;
          
          // 确保开始打字（防止没有收到 answering 状态）
          assistantMsg.value.isThinking = false;
          startTypingLoop(assistantMsg.value);

          if (typeof rawData === 'object' && rawData !== null) {
            
            // 1. 文本消息 -> 推入缓冲区
            if (rawData.type === 'text') {
              const text = rawData.content || '';
              textBuffer += text;
            } 
            
            // 2. 地点消息 -> 解析并处理
            else if (rawData.type === 'location') {
              // ✅ 核心修复：后端返回地点数据 + 前端生成地图图片
              const backendLocations = (rawData.locations || []).map((item: any) => ({
                 name: item.name,
                 address: item.address,
                 lat: item.lat,
                 lng: item.lng,
                 // 🌟 前端生成静态地图 URL
                 mapImageUrl: getStaticMapUrl(item.lat, item.lng),
                 // 后端返回的实景图
                 images: item.images || []
              }));
              
              // 地点卡片不走打字机，直接显示（或者你可以选择等文字打完再显示）
              // 这里选择追加到 locations 数组，Vue 会自动渲染卡片
              assistantMsg.value.locations = [...(assistantMsg.value.locations || []), ...backendLocations];
              assistantMsg.value.type = 'location';
            }
          } else {
             // 纯文本兼容
             const text = String(rawData).replace(/^"|"$/g, '').replace(/\\n/g, '\n');
             if (text) textBuffer += text;
          }
        } 
        
        // --- 结束事件 ---
        else if (event.event === 'done') {
          handleStreamEnd();
        }
      });
    } catch (err) {
      console.error(err);
      textBuffer += '\n[网络连接异常]';
      handleStreamEnd();
    }

    function handleStreamEnd() {
      // 这里的结束只是 SSE 连接断开
      // isStreaming = false 会通知打字机循环：一旦缓冲区空了，就彻底结束
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

  // ==================== 新增：发送图片消息 ====================
  const sendImageMessage = async (file: File, caption?: string) => {
    // 1. 本地预览消息
    const tempUrl = URL.createObjectURL(file);
    messages.value.push({
      id: Date.now().toString(),
      role: 'user',
      content: caption || '【发送了图片】',
      type: 'image', // 假设 ExtendedMessage 类型或前端展示逻辑支持 image 类型
      // 如果前端没有专门的 image 类型支持，可以临时用 text 存 "[图片]"，
      // 但最好在 views/Chat/index.vue 里处理 content 包含 "blob:" 的情况
      tempContent: tempUrl // 用于前端展示图片
    } as any);

    isStreaming.value = true;
    textBuffer = ''; 
    
    // AI 占位消息
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

    const { lat, lng } = userLocation.value;
    
    // 构造 FormData
    const formData = new FormData();
    formData.append('file', file);
    if (currentConversationId.value) {
      formData.append('conversationId', currentConversationId.value.toString());
    }
    if (caption) formData.append('message', caption);
    formData.append('lat', lat.toString());
    formData.append('lng', lng.toString());

    // 使用 SSE 发送
    const sse = new SSEClient(`${API_BASE_URL}/chat/send/image`);
    
    try {
      // connect 方法现在支持 FormData
      await sse.connect(formData, (event: SSECallback) => {
        // ... 复用 sendMessage 中的 SSE 处理逻辑 (ID, status, message, done) ...
        // 为了避免重复代码，建议把 SSE 处理逻辑抽离成 handleSSEResponse 函数
        // 这里简单起见，请直接复制 sendMessage 中的 SSE 回调逻辑到这里
        
        if (event.event === 'conversationId') {
          currentConversationId.value = Number(event.data);
          // 首次不需要自动标题，图片对话通常不需要改标题
        }
        else if (event.event === 'status') {
           if (event.data === 'thinking') assistantMsg.value.isThinking = true;
           else if (event.data === 'answering') {
             assistantMsg.value.isThinking = false;
             startTypingLoop(assistantMsg.value);
           }
        }
        else if (event.event === 'message') {
           assistantMsg.value.isThinking = false;
           startTypingLoop(assistantMsg.value);
           const rawData = event.data;
           if (typeof rawData === 'object' && rawData?.type === 'text') {
             textBuffer += rawData.content;
           } else if (rawData?.type === 'location') {
             // 同样的地点处理逻辑
             const backendLocations = (rawData.locations || []).map((item: any) => ({
                 name: item.name, address: item.address, lat: item.lat, lng: item.lng,
                 mapImageUrl: getStaticMapUrl(item.lat, item.lng), images: item.images || []
              }));
              assistantMsg.value.locations = [...(assistantMsg.value.locations || []), ...backendLocations];
              assistantMsg.value.type = 'location';
           }
        }
        else if (event.event === 'done') {
          isStreaming.value = false;
        }
      });
    } catch (err) {
      console.error(err);
      textBuffer += '\n[图片分析失败]';
      isStreaming.value = false;
    }
  };

  return {
    messages, historyList, currentConversationId, isStreaming, envContext, userLocation,
    initChat, resetChat, sendMessage, fetchHistory, loadHistory, deleteConversation, updateConversationTitle, initLocation, sendImageMessage
  };
});