/**
 * 喜马拉雅有声书封面插件（Mock 版本）
 *
 * 用于测试：不请求真实接口，直接返回固定封面 URL。
 *
 * 使用方式：
 * 1. 启动：node plugins/ximalaya-cover-plugin.js
 * 2. 在 metadata-plugins.json 中配置 endpoint 为 http://localhost:18081/scrape
 */

const http = require('http');
const path = require('path');

const PORT = process.env.PORT || 18081;

const MOCK_COVER_URL =
  'https://imagev2.xmcdn.com/storages/28f7-audiofreehighqps/03/70/GKwRIW4MLmRMABAAAAPPeYfa.jpeg!op_type=3&columns=290&rows=290&magick=png';

const server = http.createServer((req, res) => {
  if (req.url !== '/scrape' || req.method !== 'POST') {
    res.writeHead(404);
    res.end();
    return;
  }

  let body = '';
  req.on('data', (chunk) => (body += chunk));
  req.on('end', () => {
    try {
      const input = JSON.parse(body);
      const fileName = path.basename(input.path || input.fileName || 'unknown');
      console.log(`[XimalayaPlugin] Received: ${fileName}`);

      // 只处理有声书
      if (input.type !== 'audiobook') {
        console.log(`[XimalayaPlugin] Skip non-audiobook: ${input.type}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ provider: 'ximalaya-cover', raw: { skipped: true } }));
        return;
      }

      const response = {
        cover: {
          source: 'url',
          value: MOCK_COVER_URL,
        },
        provider: 'ximalaya-cover',
        confidence: 0.8,
      };

      console.log(`[XimalayaPlugin] Response: ${JSON.stringify(response)}`);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(response));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[XimalayaPlugin] Error: ${message}`);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          error: message,
          provider: 'ximalaya-cover',
        }),
      );
    }
  });
});

server.listen(PORT, () => {
  console.log(`[XimalayaPlugin] Mock mode, listening on http://localhost:${PORT}/scrape`);
});
