import media from '@ohos.multimedia.media';
import fs from '@ohos.file.fs';
import request from '@ohos.request';
import { abilityAccessCtrl, Permissions } from '@kit.AbilityKit';
import type { common } from '@kit.AbilityKit';
import { httpClient, trackApi, albumApi, artistApi } from 'features_network';
import type { TrackDto, AlbumDto, ArtistDto } from 'features_network';
import { Logger } from 'audiodock_common';

/**
 * 语音能力服务，对齐 mobile：
 * - 语音搜索（search.tsx）：录音 → ASR 转文字 → 作为关键字搜索。
 * - 语音助手（SquirrelAgent.tsx）：录音 → ASR → LLM 意图解析（/llm/chat）→ 执行播放指令。
 *
 * 后端契约：
 * - ASR：POST {baseURL}/api/asr/text，multipart 字段名 "audio"，返回 { text }。
 * - LLM：POST {baseURL}/llm/chat，body { messages:[{role,content}] }，返回 { prompt, text }。
 */

const TAG = 'SpeechService';
const MIC_PERMISSION: Permissions = 'ohos.permission.MICROPHONE';

export interface SearchAllResult {
  tracks: TrackDto[];
  albums: AlbumDto[];
  artists: ArtistDto[];
}

export interface IntentResult {
  prompt: string;
  text: string;
}

interface ChatMessage {
  role: string;
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
}

// ─── 录音状态（模块级单例，避免多处同时录音） ───
let activeRecorder: media.AVRecorder | null = null;
let activeFd: number = -1;
let activePath: string = '';

/** 申请麦克风权限，返回是否已授权。 */
export async function ensureMicPermission(context: common.Context): Promise<boolean> {
  try {
    const atManager = abilityAccessCtrl.createAtManager();
    const result = await atManager.requestPermissionsFromUser(context, [MIC_PERMISSION]);
    return result.authResults.length > 0 && result.authResults[0] === 0;
  } catch (e) {
    Logger.w(TAG, `request mic permission failed: ${String(e)}`);
    return false;
  }
}

/** 开始录音，返回录音文件路径；失败返回空串。 */
export async function startRecording(context: common.Context): Promise<string> {
  // 清理上一次未释放的录音
  await discardRecording();

  const path = `${context.cacheDir}/asr_record_${Date.now()}.m4a`;
  try {
    const file = fs.openSync(path, fs.OpenMode.READ_WRITE | fs.OpenMode.CREATE | fs.OpenMode.TRUNC);
    activeFd = file.fd;
    activePath = path;

    const recorder = await media.createAVRecorder();
    const profile: media.AVRecorderProfile = {
      audioBitrate: 128000,
      audioChannels: 1,
      audioCodec: media.CodecMimeType.AUDIO_AAC,
      audioSampleRate: 44100,
      fileFormat: media.ContainerFormatType.CFT_MPEG_4A,
    };
    const config: media.AVRecorderConfig = {
      audioSourceType: media.AudioSourceType.AUDIO_SOURCE_TYPE_MIC,
      profile: profile,
      url: `fd://${file.fd}`,
    };
    await recorder.prepare(config);
    await recorder.start();
    activeRecorder = recorder;
    return path;
  } catch (e) {
    Logger.w(TAG, `startRecording failed: ${String(e)}`);
    await discardRecording();
    return '';
  }
}

/** 停止录音并返回文件路径（供上传）。 */
export async function stopRecording(): Promise<string> {
  const recorder = activeRecorder;
  const path = activePath;
  if (recorder) {
    try {
      await recorder.stop();
      await recorder.release();
    } catch (e) {
      Logger.w(TAG, `stop recorder failed: ${String(e)}`);
    }
  }
  activeRecorder = null;
  if (activeFd !== -1) {
    try { fs.closeSync(activeFd); } catch (e) { /* ignore */ }
    activeFd = -1;
  }
  activePath = '';
  return path;
}

/** 丢弃当前录音（清理资源，删除临时文件）。 */
export async function discardRecording(): Promise<void> {
  const recorder = activeRecorder;
  const path = activePath;
  const fd = activeFd;
  activeRecorder = null;
  activePath = '';
  activeFd = -1;
  if (recorder) {
    try { await recorder.release(); } catch (e) { /* ignore */ }
  }
  if (fd !== -1) {
    try { fs.closeSync(fd); } catch (e) { /* ignore */ }
  }
  if (path.length > 0) {
    try { if (fs.accessSync(path)) fs.unlinkSync(path); } catch (e) { /* ignore */ }
  }
}

/** 上传音频文件到 ASR 服务，返回识别文本。 */
export async function speechToText(context: common.Context, filePath: string): Promise<string> {
  const fileName = filePath.split('/').pop() || 'audio.m4a';
  const headers: Record<string, string> = { 'Content-Type': 'multipart/form-data' };
  const token = httpClient.getAuthToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const uploadConfig: request.UploadConfig = {
    url: `${httpClient.getBaseURL()}/api/asr/text`,
    header: headers,
    method: 'POST',
    files: [{ filename: fileName, name: 'audio', uri: filePath, type: 'audio/m4a' }],
    data: [],
  };

  const uploadTask = await request.uploadFile(context, uploadConfig);
  try {
    return await new Promise<string>((resolve, reject) => {
      uploadTask.on('complete', (data) => {
        try {
          const raw = extractResult(data);
          const parsed = JSON.parse(raw) as Record<string, Object>;
          const text = pickText(parsed);
          if (text.length > 0) resolve(text);
          else reject(new Error('ASR returned empty text'));
        } catch (e) {
          reject(e instanceof Error ? e : new Error(String(e)));
        }
      });
      uploadTask.on('fail', (err: request.TaskState[]) => {
        reject(new Error(`ASR upload failed: ${JSON.stringify(err)}`));
      });
    });
  } finally {
    try { if (fs.accessSync(filePath)) fs.unlinkSync(filePath); } catch (e) { /* ignore */ }
  }
}

/** complete 回调 data 结构在不同 API 版本可能是对象或数组，做兼容处理。 */
function extractResult(data: Object): string {
  const obj = data as Record<string, Object>;
  if (obj && typeof obj['result'] === 'string') return obj['result'] as string;
  const arr = data as Array<Record<string, Object>>;
  if (Array.isArray(arr) && arr.length > 0 && typeof arr[0]['result'] === 'string') {
    return arr[0]['result'] as string;
  }
  return '';
}

function pickText(parsed: Record<string, Object>): string {
  if (typeof parsed['text'] === 'string') return parsed['text'] as string;
  const inner = parsed['data'] as Record<string, Object> | undefined;
  if (inner && typeof inner['text'] === 'string') return inner['text'] as string;
  return '';
}

/** LLM 意图解析：把识别文本转成可执行指令。 */
export async function extractIntent(text: string): Promise<IntentResult | null> {
  try {
    const messages: ChatMessage[] = [{ role: 'user', content: text }];
    const resp = await httpClient.post<IntentResult>('/llm/chat', { messages: messages } as ChatRequest);
    if (resp && resp.prompt && resp.text) return resp;
    return null;
  } catch (e) {
    Logger.w(TAG, `extractIntent failed: ${String(e)}`);
    return null;
  }
}

/** 综合搜索（对齐 mobile searchAll），供语音助手按关键字取曲目。 */
export async function searchAll(keyword: string): Promise<SearchAllResult> {
  const results = await Promise.allSettled([
    trackApi.search({ keyword: keyword, limit: 5 }),
    albumApi.search(keyword, 5),
    artistApi.search(keyword, 5),
  ]);
  return {
    tracks: results[0].status === 'fulfilled' ? results[0].value : [],
    albums: results[1].status === 'fulfilled' ? results[1].value : [],
    artists: results[2].status === 'fulfilled' ? results[2].value : [],
  };
}
