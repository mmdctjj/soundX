import http from '@ohos.net.http';
import { Logger } from 'audiodock_common';

const TAG = 'UpdateService';

/**
 * 检查更新服务，对齐 mobile apps/mobile/src/services/update.ts + hooks/useCheckUpdate.ts：
 * - getLatestVersion(): 拉 GitHub releases/latest 拿版本号
 * - fetchReleaseBody(version): 拿指定版本的 Release body 作更新说明
 * - compareVersions(a, b): 语义化版本号比较
 */

const GITHUB_USER = 'mmdctjj';
const GITHUB_REPO = 'AudioDock';
const GITHUB_API = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/releases`;

export interface UpdateInfo {
  version: string;
  body: string;
  publishedAt: string;
  htmlUrl: string;
}

/** fetchRaw 内部返回结构：HTTP status code + 响应原始文本。 */
interface FetchRawResp {
  status: number;
  text: string;
}

/**
 * 比较两个语义化版本号（a > b 返回正数，a < b 返回负数，相等返回 0）。
 * 与 mobile apps/mobile/src/utils/updateUtils.ts compareVersions 同款语义。
 */
export function compareVersions(a: string, b: string): number {
  const pa: number[] = a.replace(/^v/, '').split('.').map((s) => Number.parseInt(s, 10) || 0);
  const pb: number[] = b.replace(/^v/, '').split('.').map((s) => Number.parseInt(s, 10) || 0);
  const len: number = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const ai: number = pa[i] ?? 0;
    const bi: number = pb[i] ?? 0;
    if (ai !== bi) return ai - bi;
  }
  return 0;
}

/**
 * 构造统一 GitHub API 请求选项。集中处理，避免 ArkTS strict 模式把方法字面量
 * 推断成 string 而报错 "Type 'string' is not assignable to RequestMethod"。
 */
function githubOptions(): http.HttpRequestOptions {
  const opts: http.HttpRequestOptions = {
    method: http.RequestMethod.GET,
    header: { 'Accept': 'application/vnd.github+json', 'User-Agent': 'AudioDock-HarmonyOS' },
    readTimeout: 15_000,
    connectTimeout: 10_000,
  };
  return opts;
}

/**
 * 执行一次 GitHub GET。返回 raw text + status code。
 */
async function fetchRaw(url: string): Promise<FetchRawResp> {
  const httpReq = http.createHttp();
  try {
    const opts: http.HttpRequestOptions = githubOptions();
    const resp: http.HttpResponse = await httpReq.request(url, opts);
    const code: number = resp.responseCode;
    const raw = typeof resp.result === 'string' ? resp.result : '';
    return { status: code, text: raw };
  } finally {
    httpReq.destroy();
  }
}

/**
 * 拉 GitHub 最新 release 版本号（仅 tag_name），用于轻量级"是否有新版本"检查。
 * 返回 tag_name（带 v 前缀）或空串（拉取失败）。
 */
export async function getLatestVersion(): Promise<string> {
  try {
    const resp = await fetchRaw(`${GITHUB_API}/latest`);
    const status: number = resp.status;
    const text: string = resp.text;
    if (status !== 200) return '';
    if (text.length === 0) return '';
    const obj: Record<string, Object> = JSON.parse(text) as Record<string, Object>;
    const tag = obj['tag_name'];
    return typeof tag === 'string' ? tag : '';
  } catch (e) {
    Logger.w(TAG, `getLatestVersion failed: ${String(e)}`);
    return '';
  }
}

/**
 * 拉指定版本的 Release body（markdown），用于在"检查更新"弹窗里展示。
 * version 可带或不带 v 前缀。
 */
export async function fetchReleaseBody(version: string): Promise<UpdateInfo | null> {
  const tagVersion: string = version.startsWith('v') ? version : `v${version}`;
  try {
    const resp = await fetchRaw(`${GITHUB_API}/tags/${tagVersion}`);
    const status: number = resp.status;
    const text: string = resp.text;
    if (status !== 200) return null;
    if (text.length === 0) return null;
    const obj: Record<string, Object> = JSON.parse(text) as Record<string, Object>;
    return {
      version: tagVersion,
      body: typeof obj['body'] === 'string' ? (obj['body'] as string) : '',
      publishedAt: typeof obj['published_at'] === 'string' ? (obj['published_at'] as string) : '',
      htmlUrl: typeof obj['html_url'] === 'string' ? (obj['html_url'] as string) : '',
    };
  } catch (e) {
    Logger.w(TAG, `fetchReleaseBody(${tagVersion}) failed: ${String(e)}`);
    return null;
  }
}

/**
 * 拉最近 N 个 release 列表（用于产品动态页）。
 * 失败返回空数组。
 */
export async function listRecentReleases(limit: number = 20): Promise<UpdateInfo[]> {
  try {
    const resp = await fetchRaw(`${GITHUB_API}?per_page=${limit}`);
    const status: number = resp.status;
    const text: string = resp.text;
    if (status !== 200) return [];
    if (text.length === 0) return [];
    const arr = JSON.parse(text) as Array<Record<string, Object>>;
    const out: UpdateInfo[] = [];
    for (const obj of arr) {
      const tag = obj['tag_name'];
      if (typeof tag !== 'string') continue;
      out.push({
        version: tag,
        body: typeof obj['body'] === 'string' ? (obj['body'] as string) : '',
        publishedAt: typeof obj['published_at'] === 'string' ? (obj['published_at'] as string) : '',
        htmlUrl: typeof obj['html_url'] === 'string' ? (obj['html_url'] as string) : '',
      });
    }
    return out;
  } catch (e) {
    Logger.w(TAG, `listRecentReleases failed: ${String(e)}`);
    return [];
  }
}
