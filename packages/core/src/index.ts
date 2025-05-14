import { createClient } from "webdav";
import { parseBuffer } from "music-metadata";

export class WebDavMusicScanner {
  private client;

  constructor(url: string, username: string, password: string) {
    this.client = createClient(url, { username, password });
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
        // 从 WebDAV 获取文件内容
        const fileContent = await this.client.getFileContents(file.filename, {
          format: "binary",
        });

        // 将文件内容转换为 Uint8Array
        const arrayBuffer = this.toArrayBuffer(fileContent);
        const uint8Array = new Uint8Array(arrayBuffer);

        // 使用 parseBuffer 解析元数据
        const metadata = await parseBuffer(uint8Array, {
          mimeType: this.getMimeType(file.basename),
        });
        
        console.log("metadata", metadata);  

        // 将解析结果添加到结果数组
        results.push({
          path: file.filename,
          size: file.size,
          ...metadata.common,
        });
      } catch (err) {
        console.error(`❌ Failed to parse ${file.filename}:`, err);
      }
    }
    console.log("results", results);  

    return results;
  }

  private toArrayBuffer(result: any): ArrayBuffer {
    if (result instanceof ArrayBuffer) return result;
    if (typeof result === "string") {
      return new TextEncoder().encode(result).buffer;
    }
    if (result?.data instanceof ArrayBuffer) {
      return result.data;
    }
    if (typeof result?.data === "string") {
      return new TextEncoder().encode(result.data).buffer;
    }
    throw new Error("Unsupported format returned from getFileContents");
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
