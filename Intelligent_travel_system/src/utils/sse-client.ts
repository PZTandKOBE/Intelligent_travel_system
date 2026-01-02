/**
 * 处理 POST 方式的 SSE 流式响应
 * @param url 接口地址
 * @param body 请求体
 * @param callbacks 回调集合
 */
export async function fetchStream(
  url: string,
  body: any,
  callbacks: {
    // 这里的 type 对应后端 SSE 事件: 'message' | 'status' | 'conversationId' | 'error'
    onMessage: (type: string, data: any) => void; 
    onDone?: () => void;
    onError?: (err: any) => void;
  }
) {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      credentials: 'include', // ✅ 核心修改：SSE 请求也要带 Cookie
    });

    if (!response.ok) {
      throw new Error(response.statusText);
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

      // 解码并拼接到缓冲区
      buffer += decoder.decode(value, { stream: true });

      // 按双换行符切割消息 (标准 SSE 以 \n\n 分隔)
      const parts = buffer.split('\n\n');
      // 保留最后一个可能不完整的片段在 buffer 中
      buffer = parts.pop() || '';

      for (const part of parts) {
        if (!part.trim()) continue;

        const lines = part.split('\n');
        let eventType = 'message'; // 默认事件类型
        let dataStr = '';

        for (const line of lines) {
          if (line.startsWith('event:')) {
            eventType = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            dataStr = line.slice(5).trim();
          }
        }

        if (dataStr) {
          // 如果收到 [DONE]，则结束
          if (dataStr === '[DONE]') {
            callbacks.onDone?.();
            return;
          }

          // 尝试解析 JSON 数据
          try {
            // 如果后端返回的是普通字符串且用引号包裹，这里也能解析
            // 如果是对象结构，解析为对象
            const parsedData = JSON.parse(dataStr);
            callbacks.onMessage(eventType, parsedData);
          } catch (e) {
            // 解析失败则按纯文本处理
            callbacks.onMessage(eventType, dataStr);
          }
        }
      }
    }
    
    // 循环结束也算完成
    callbacks.onDone?.();

  } catch (err) {
    callbacks.onError?.(err);
  }
}