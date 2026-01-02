/**
 * 处理 POST 方式的 SSE 流式响应
 * @param url 接口地址
 * @param body 请求体
 * @param onMessage 接收到消息片段的回调
 * @param onDone 完成回调
 * @param onError 错误回调
 */
export async function fetchStream(
  url: string,
  body: any,
  callbacks: {
    onMessage: (text: string, isJson?: boolean) => void;
    onDone?: () => void;
    onError?: (err: any) => void;
  }
) {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 'Authorization': `Bearer ${token}` // 如果需要鉴权
      },
      body: JSON.stringify(body),
    });

    if (!response.ok || !response.body) {
      throw new Error(response.statusText);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      // 这里需要根据后端 SSE 格式进行解析，假设是标准的 data: ...
      // 简单处理：直接把 chunk 传出去，或者在这里做按行分割
      // 为了稳健，我们直接传 chunk 给上层去拼装
      callbacks.onMessage(chunk);
    }

    callbacks.onDone?.();
  } catch (err) {
    callbacks.onError?.(err);
  }
}