import * as music from "music-metadata";
import { createClient } from "webdav";

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
          file.filename,
          {
            format: "binary",
          }
        );

        // 调试：验证 fileContent 类型和大小
        console.log(`File: ${file.filename}`);
        console.log(`Type: ${typeof fileContent}, Constructor: ${fileContent?.constructor?.name}`);
        console.log(`Is Buffer: ${Buffer.isBuffer(fileContent)}`);
        console.log(`Is ArrayBuffer: ${fileContent instanceof ArrayBuffer}`);

        // 转换为 Uint8Array
        let uint8Array: Uint8Array;

        if (Buffer.isBuffer(fileContent)) {
          // Node.js Buffer
          uint8Array = new Uint8Array(fileContent);
        } else if (fileContent instanceof ArrayBuffer) {
          // ArrayBuffer
          uint8Array = new Uint8Array(fileContent);
        } else {
          throw new Error(`Unexpected file content type: ${typeof fileContent}`);
        }

        // 检查是否为空
        if (uint8Array.byteLength === 0) {
          throw new Error(`Empty file content for ${file.filename}`);
        }

        console.log(`Size: ${uint8Array.byteLength} bytes`);

        // 解析元数据
        const metadata = await this.musicMetadata.parseBuffer(uint8Array, {
          mimeType: this.getMimeType(file.basename),
        });

        // 提取封面图片
        let cover = null;
        if (metadata.common.picture && metadata.common.picture.length > 0) {
          const picture = metadata.common.picture[0];
          cover = {
            format: picture.format,
            data: picture.data, // Buffer 数据
            description: picture.description,
            type: picture.type,
          };
        }

        // 添加结果
        results.push({
          path: file.filename,
          size: file.size,
          cover, // 封面信息
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

export default WebDavMusicScanner;