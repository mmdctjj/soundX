import { WebDavMusicScanner } from "@soundx/core";
import fs from "fs";
import path from "path";

async function testWebDavScanner() {
  console.log("🧪 开始测试 WebDavMusicScanner...\n");

  // 创建扫描器实例
  const scanner = new WebDavMusicScanner(
    "http://localhost:1900", // baseUrl
    "", // url (空字符串，因为 baseUrl 已经包含完整地址)
    "admin", // username
    "123456" // password
  );

  try {
    console.log("📂 扫描音乐文件...");
    const musicFiles = await scanner.scanAllMusic("/");

    console.log(`\n✅ 成功扫描到 ${musicFiles.length} 个音乐文件:\n`);

    // 创建 covers 目录（如果不存在）
    const coversDir = "./covers";
    if (!fs.existsSync(coversDir)) {
      fs.mkdirSync(coversDir);
    }

    musicFiles.forEach((file, index) => {
      console.log(`${index + 1}. ${file.title || "未知标题"}`);
      console.log(`   艺术家: ${file.artist || "未知"}`);
      console.log(`   专辑: ${file.album || "未知"}`);
      console.log(`   路径: ${file.path}`);
      console.log(`   大小: ${(file.size / 1024 / 1024).toFixed(2)} MB`);

      // 显示封面信息
      if (file.cover) {
        console.log(
          `   📷 封面: ${file.cover.format} (${file.cover.data.length} bytes)`
        );

        // 从 MIME 类型提取文件扩展名
        const ext = file.cover.format.split("/")[1] || "jpg";
        const coverFileName = `${file.title || index}.${ext}`;
        const coverPath = path.join(coversDir, coverFileName);
        fs.writeFileSync(coverPath, file.cover.data);
        console.log(`   💾 封面已保存: ${coverPath}`);
      } else {
        console.log(`   📷 封面: 无`);
      }
      console.log();
    });

    console.log("✅ 测试成功！");
  } catch (error) {
    console.error("❌ 测试失败:", error.message);
    console.error(error);
  }
}

// 运行测试
testWebDavScanner();
