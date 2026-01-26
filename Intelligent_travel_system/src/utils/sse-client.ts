// src/utils/sse-client.ts

export interface SSECallback {
  event: string;
  data: any;
}

export class SSEClient {
  private url: string;
  private controller: AbortController | null = null;

  constructor(url: string) {
    this.url = url;
  }

  async connect(body: any, onMessage: (payload: SSECallback) => void) {
    this.controller = new AbortController();

    try {
      const headers: HeadersInit = {};
      let requestBody = body;

      // ✅ 关键修改：如果是 FormData，不要设置 Content-Type，让浏览器自动处理 Boundary
      // 否则保持 application/json
      if (!(body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
        requestBody = JSON.stringify(body);
      }

      const response = await fetch(this.url, {
        method: 'POST',
        headers: headers,
        body: requestBody,
        signal: this.controller.signal,
        credentials: 'include',
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
        const parts = buffer.split('\n\n');
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
              // ignore
            }
            onMessage({ event: eventType, data: parsedData });
          }
        }
      }
      onMessage({ event: 'done', data: null });

    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('SSE Error:', error);
        onMessage({ event: 'error', data: error.message });
      }
    } finally {
      this.controller = null;
    }
  }

  abort() {
    if (this.controller) {
      this.controller.abort();
      this.controller = null;
    }
  }
}