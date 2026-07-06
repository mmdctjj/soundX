import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { igniteModel, loadModels, Message } from 'multi-llm-ts';
import { LlmConfigService } from './llm-config.service';

@Injectable()
export class LlmService implements OnModuleInit {
  private readonly logger = new Logger(LlmService.name);
  private modelInst: any;

  constructor(
    private configService: ConfigService,
    private llmConfig: LlmConfigService,
  ) {}

  async onModuleInit() {
    await this.initLlm();
  }

  private async initLlm() {
    try {
      const cfg = await this.llmConfig.getEffective();
      if (!cfg.apiKey) {
        this.logger.warn(`LLM_API_KEY is not configured for provider ${cfg.provider}`);
        return;
      }

      const config: any = { apiKey: cfg.apiKey };
      if (cfg.baseUrl) {
        config.baseURL = cfg.baseUrl;
      }

      const models = await loadModels(cfg.provider, config);
      const chatModels = models?.chat || [];
      const targetModel =
        chatModels.find((m) => m.id === cfg.model || m.name === cfg.model) ||
        chatModels[0];

      if (!targetModel) {
        this.logger.error(`Model ${cfg.model} not found for provider ${cfg.provider}`);
        return;
      }

      this.modelInst = igniteModel(cfg.provider, targetModel, config);
      this.logger.log(
        `LLM Model initialized with provider: ${cfg.provider}, model: ${cfg.model}`,
      );
    } catch (e) {
      this.logger.error(`Failed to initialize LLM: ${e.message}`, e.stack);
    }
  }

  /**
   * 在配置变更后重新初始化模型 (供 controller / 外部直接调用)。
   */
  async reload() {
    this.modelInst = undefined;
    await this.initLlm();
  }

  public async chat(messages: { role: 'system' | 'user' | 'assistant', content: string }[]): Promise<{prompt: string, text: string}> {
    if (!this.modelInst) {
      throw new Error('LLM Service is not initialized or API Key is missing.');
    }

    const systemPrompt = `### 角色设定
你是一名文本指令识别专家，根据文本提取用户关键意图
### 任务
识别用户的关键指令，包括：
- 上一首
- 下一首
- 暂停
- 播放
- 随机播放
- 播放xxx歌曲
- 播放xxx专辑的歌
- 播放xxx歌手的歌
- 播放歌单xxx
- 播放xxx歌单
### 输出
**必须以严格的 JSON 格式输出，不要包含任何其他额外的文本或 markdown 标记，如果有繁体字请转换为简体字**
输出的 JSON 对象必须包含以下两个字段：
1. \`prompt\`: 识别出的指令键值（例如：next, last, pause, play, random, song_xxx, alum_xxx, arist_xxx, list_xxx）
2. \`text\`: 用于展示给用户的友好回复语句（例如：好的，即将播放xxx的歌）

### 指令映射关系
- 上一首 -> next
- 下一首 -> last
- 暂停 -> pause
- 播放 -> play
- 随机播放 -> random
- 播放xxx歌曲 -> song_xxx 
- 播放xxx专辑的歌 -> alum_xxx
- 播放xxx歌手的歌 -> arist_xxx
- 播放歌单xxx -> list_xxx
- 播放xxx歌单 -> list_xxx

### 注意事项
- 不要输出和指令无关的事
- 用户说暂停吧是值 暂停播放，不是停止上下文
- 返回的结果必须是可以直接被 \`JSON.parse()\` 解析的合法 JSON 字符串。
### 示例
输入：
我想听周杰伦的歌
输出:
{"prompt": "arist_周杰伦", "text": "好的，即将播放周杰伦的歌"}

输入：
暂停播放
输出：
{"prompt": "pause", "text": "好的，已暂停"}
====`;

    const cfg = await this.llmConfig.getEffective();
    const payload = [
      new Message('system', systemPrompt),
      ...messages.map((m) => new Message(m.role, m.content)),
    ];

    const response = await this.modelInst.complete(payload, {
      timeout: cfg.timeout,
      temperature: cfg.temperature,
      maxTokens: cfg.maxTokens,
    });

    let content = response.content;
    try {
      if (content.startsWith('```json') && content.endsWith('```')) {
        content = content.substring(7, content.length - 3).trim();
      } else if (content.startsWith('```') && content.endsWith('```')) {
        content = content.substring(3, content.length - 3).trim();
      }
      const parsed = JSON.parse(content);
      return parsed;
    } catch (e) {
      this.logger.error('Failed to parse LLM JSON response', e);
      return { prompt: 'error', text: '意图解析失败：' + content };
    }
  }
}
