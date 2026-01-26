// src/utils/xf-voice.ts
import CryptoJS from 'crypto-js';

// ⚠️ 请在此处填入您的科大讯飞 Key，或者从 import.meta.env 读取
const APPID ='ab7bf99e';
const API_SECRET ='YmM1MzFjMmEyNjc2MmMyMTkxODU4YWQ1';
const API_KEY ='520f545f0d554dac923ae572af96b380';

// ==========================================
// 1. AudioWorklet 处理器 (独立线程采集音频)
// ==========================================
const WORKLET_CODE = `
class XFVoiceProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // 减小缓冲大小到 2048 (约 40-50ms)，降低延迟，提高传输稳定性
    this.bufferSize = 2048;
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || !input.length) return true;
    
    const channel0 = input[0];
    
    for (let i = 0; i < channel0.length; i++) {
      this.buffer[this.bufferIndex++] = channel0[i];
      
      if (this.bufferIndex >= this.bufferSize) {
        this.port.postMessage(this.buffer.slice());
        this.bufferIndex = 0;
      }
    }
    return true;
  }
}
registerProcessor('xf-voice-processor', XFVoiceProcessor);
`;

export class XFVoiceClient {
  private socket: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private mediaStream: MediaStream | null = null;
  private status: 'init' | 'recording' | 'error' = 'init';

  constructor(
    private onTextChange: (text: string, isFinal: boolean) => void,
    private onError: (err: string) => void
  ) {}

  private getWebSocketUrl(): string {
    const url = 'wss://iat-api.xfyun.cn/v2/iat';
    const host = 'iat-api.xfyun.cn';
    const date = new Date().toUTCString();
    const algorithm = 'hmac-sha256';
    const headers = `host date request-line`;
    const signatureOrigin = `host: ${host}\ndate: ${date}\nGET /v2/iat HTTP/1.1`;
    const signatureSha = CryptoJS.HmacSHA256(signatureOrigin, API_SECRET);
    const signature = CryptoJS.enc.Base64.stringify(signatureSha);
    const authorizationOrigin = `api_key="${API_KEY}", algorithm="${algorithm}", headers="${headers}", signature="${signature}"`;
    const authorization = btoa(authorizationOrigin);
    return `${url}?authorization=${authorization}&date=${date}&host=${host}`;
  }

  public async start() {
    if (this.status === 'recording') return;

    try {
      this.status = 'init';
      const url = this.getWebSocketUrl();
      this.socket = new WebSocket(url);
      
      this.socket.onopen = () => {
        this.status = 'recording';
        this.startRecording();
      };

      this.socket.onmessage = (e) => {
        const result = JSON.parse(e.data);
        if (result.code !== 0) {
          console.error('XF Error:', result);
          this.socket?.close();
          // 忽略 10165 错误，如果它是偶发的，通常是 socket 关闭时序问题
          if (result.code !== 10165) {
             this.onError(`识别错误: ${result.code}`);
          }
          return;
        }
        if (result.data && result.data.result) {
          const ws = result.data.result.ws;
          let str = '';
          ws.forEach((w: any) => {
            w.cw.forEach((c: any) => {
              str += c.w;
            });
          });
          this.onTextChange(str, result.data.status === 2);
        }
      };

      this.socket.onerror = (e) => {
        console.error("WebSocket error:", e);
        this.onError('网络连接失败，请检查网络');
        this.stop();
      };
      
      this.socket.onclose = () => {
        this.stop();
      };

    } catch (error) {
      this.onError('无法启动语音识别');
    }
  }

  private async startRecording() {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContext();

      const blob = new Blob([WORKLET_CODE], { type: 'application/javascript' });
      const workletUrl = URL.createObjectURL(blob);

      await this.audioContext.audioWorklet.addModule(workletUrl);

      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.workletNode = new AudioWorkletNode(this.audioContext, 'xf-voice-processor');

      this.workletNode.port.onmessage = (event) => {
        if (this.status !== 'recording' || !this.socket || this.socket.readyState !== WebSocket.OPEN) return;
        
        // 1. 获取原始音频数据 (Float32, 采样率可能是 48000Hz 或 44100Hz)
        const inputBuffer = event.data;
        
        // 2. 关键步骤：降采样到 16000Hz 并转为 16位 PCM
        const buffer = this.resampleTo16k(inputBuffer, this.audioContext!.sampleRate);

        // 3. 发送数据
        this.socket.send(JSON.stringify({
          data: {
            status: 1, 
            format: "audio/L16;rate=16000",
            encoding: "raw",
            audio: this.arrayBufferToBase64(buffer.buffer)
          }
        }));
      };

      source.connect(this.workletNode);
      this.workletNode.connect(this.audioContext.destination);

      // 发送第一帧（握手）
      this.socket?.send(JSON.stringify({
        common: { app_id: APPID },
        business: { language: "zh_cn", domain: "iat", accent: "mandarin", vad_eos: 5000 },
        data: { status: 0, format: "audio/L16;rate=16000", encoding: "raw" }
      }));

    } catch (e) {
      console.error(e);
      this.onError('麦克风访问失败');
      this.stop();
    }
  }

  public stop() {
    if (this.status === 'recording' && this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        data: { status: 2, format: "audio/L16;rate=16000", encoding: "raw", audio: "" }
      }));
    }
    
    this.status = 'init';
    
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(console.error);
      this.audioContext = null;
    }
    
    setTimeout(() => {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.close();
        }
        this.socket = null;
    }, 1000);
  }

  // ✅ 核心修复：降采样算法 (任意采样率 -> 16000Hz Int16)
  private resampleTo16k(audioData: Float32Array, sampleRate: number): Int16Array {
    const targetSampleRate = 16000;
    
    // 如果已经是 16k，直接转换
    if (sampleRate === targetSampleRate) {
      return this.floatTo16BitPCM(audioData);
    }

    // 计算压缩比例
    const compression = sampleRate / targetSampleRate;
    const length = Math.floor(audioData.length / compression);
    const result = new Int16Array(length);
    let index = 0, j = 0;

    // 线性插值降采样
    while (index < length) {
      const offset = Math.floor(j);
      const nextOffset = Math.ceil(j);
      const weight = j - offset;
      
      const s0 = audioData[offset] || 0;
      const s1 = audioData[nextOffset] || 0;
      
      // 插值计算
      const interpolatedValue = s0 * (1 - weight) + s1 * weight;
      
      result[index] = this.floatTo16BitValue(interpolatedValue);
      
      j += compression;
      index++;
    }
    
    return result;
  }

  private floatTo16BitPCM(input: Float32Array): Int16Array {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      output[i] = this.floatTo16BitValue(input[i]);
    }
    return output;
  }

  private floatTo16BitValue(input: number): number {
    let s = Math.max(-1, Math.min(1, input));
    return s < 0 ? s * 0x8000 : s * 0x7FFF;
  }

private arrayBufferToBase64(buffer: ArrayBufferLike) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}
}