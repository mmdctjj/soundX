import { createClient } from "webdav";
import * as music from "music-metadata";

export class WebDavMusicScanner {
  private client;
  private musicMetadata;
  private baseUrl;

  constructor(
    baseUrl: string,
    url: string,
    username: string,
    password: string
  ) {
    this.client = createClient(`${baseUrl}/${url}`, { username, password });
    this.baseUrl = baseUrl;
    this.musicMetadata = music;
  }

  async scanAllMusic(directory = "/"): Promise<any[]> {
    const files = await this.client.getDirectoryContents(directory);
    const musicFiles = (Array.isArray(files) ? files : files.data).filter(
      (f) => f.type === "file" && /\.(mp3|flac|ogg|wav)$/i.test(f.basename)
    );

    const results: any[] = [];
    console.log("musicFiles", musicFiles);

    for (const file of musicFiles) {
      try {
        // 获取文件内容
        const fileContent = await this.client.getFileContents(
          `${this.baseUrl}${file.filename}`,
          {
            format: "binary",
          }
        );

        // 调试：验证 fileContent 类型和大小
        console.log(`File: ${file.filename}`);

        // 检查是否为空
        if (
          !(fileContent instanceof ArrayBuffer) ||
          fileContent.byteLength === 0
        ) {
          throw new Error(`Empty or invalid file content for ${file.filename}`);
        }

        // 转换为 Uint8Array
        const uint8Array = new Uint8Array(fileContent);

        // 解析元数据
        const metadata = await this.musicMetadata.parseBuffer(uint8Array, {
          mimeType: this.getMimeType(file.basename),
        });

        // 添加结果
        results.push({
          path: file.filename,
          size: file.size,
          ...metadata.common,
        });
      } catch (err) {
        console.error(`❌ Failed to parse ${file.filename}:`, err);
      }
    }

    return results;
  }

  private getMimeType(filename: string): string {
    const extension = filename.split(".").pop()?.toLowerCase();
    switch (extension) {
      case "mp3":
        return "audio/mpeg";
      case "flac":
        return "audio/flac";
      case "ogg":
        return "audio/ogg";
      case "wav":
        return "audio/wav";
      default:
        return "application/octet-stream";
    }
  }
}

export default music;