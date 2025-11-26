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

  async ensureCacheDirectory() {
    const cacheDir = "/.soundx";
    try {
      const exists = await this.client.exists(cacheDir);
      if (!exists) {
        await this.client.createDirectory(cacheDir);
        console.log(`Created cache directory: ${cacheDir}`);
      }
    } catch (err) {
      console.error(`Failed to create cache directory: ${err}`);
    }
  }

  async scanAllMusic(directory = "/"): Promise<any[]> {
    await this.ensureCacheDirectory();

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

        // 转换为 Uint8Array
        let uint8Array: Uint8Array;

        if (Buffer.isBuffer(fileContent)) {
          uint8Array = new Uint8Array(fileContent);
        } else if (fileContent instanceof ArrayBuffer) {
          uint8Array = new Uint8Array(fileContent);
        } else {
          continue;
        }

        if (uint8Array.byteLength === 0) continue;

        // 解析元数据
        const metadata = await this.musicMetadata.parseBuffer(uint8Array, {
          mimeType: this.getMimeType(file.basename),
        });

        // 提取封面图片
        let coverPath = null;
        if (metadata.common.picture && metadata.common.picture.length > 0) {
          const picture = metadata.common.picture[0];
          const ext = picture.format.split('/')[1] || 'jpg';
          // 使用文件名作为封面名，避免冲突
          const safeName = file.basename.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, "_");
          const coverName = `${safeName}.${ext}`;
          const remoteCoverPath = `/.soundx/${coverName}`;

          try {
            // 上传封面到 WebDAV
            await this.client.putFileContents(remoteCoverPath, Buffer.from(picture.data));
            coverPath = remoteCoverPath;
            console.log(`Saved cover to ${remoteCoverPath}`);
          } catch (e) {
            console.error(`Failed to save cover for ${file.filename}:`, e);
          }
        }

        // 添加结果
        results.push({
          path: file.filename,
          size: file.size,
          coverPath, // 返回远程封面路径
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