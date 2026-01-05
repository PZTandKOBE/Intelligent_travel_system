// src/utils/sse-client.ts

// 定义 SSE 事件回调类型
export interface SSECallback {
  event: string; // 'message' | 'status' | 'conversationId' | 'error' | 'done'
  data: any;
}

export class SSEClient {
  private url: string;
  private controller: AbortController | null = null;

  constructor(url: string) {
    this.url = url;
  }

  /**
   * 连接 SSE 流
   * @param body 请求体参数
   * @param onMessage 消息回调
   */
  async connect(body: any, onMessage: (payload: SSECallback) => void) {
    this.controller = new AbortController();

    try {
      const response = await fetch(this.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: this.controller.signal,
        credentials: 'include', // 携带 Cookie
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('Response body is empty');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        // SSE 消息通常以双换行符分隔
        const parts = buffer.split('\n\n');
        // 保留最后一个可能不完整的片段
        buffer = parts.pop() || '';

        for (const part of parts) {
          if (!part.trim()) continue;

          const lines = part.split('\n');
          let eventType = 'message';
          let dataStr = '';

          for (const line of lines) {
            if (line.startsWith('event:')) {
              eventType = line.slice(6).trim();
            } else if (line.startsWith('data:')) {
              dataStr = line.slice(5).trim();
            }
          }

          if (dataStr) {
            if (dataStr === '[DONE]') {
              onMessage({ event: 'done', data: null });
              return;
            }

            let parsedData = dataStr;
            try {
              parsedData = JSON.parse(dataStr);
            } catch (e) {
              // 无法解析为 JSON，保持原字符串
            }

            onMessage({ event: eventType, data: parsedData });
          }
        }
      }

      // 流结束
      onMessage({ event: 'done', data: null });

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('SSE connection aborted');
      } else {
        console.error('SSE Error:', error);
        onMessage({ event: 'error', data: error.message });
      }
    } finally {
      this.controller = null;
    }
  }

  /**
   * 中断连接
   */
  abort() {
    if (this.controller) {
      this.controller.abort();
      this.controller = null;
    }
  }
}