import router from '@ohos.router';
import { storage } from '../utils/StorageManager';
import { httpClient } from '../utils/HttpClient';

class ServerData {
  address: string = '';
  type: string = '';
  name: string = '';
}

@Entry
@Component
struct SourceManagePage {
  @State servers: ServerData[] = [];
  @State currentAddress: string = '';
  @State loading: boolean = true;

  aboutToAppear() {
    this.loadServers();
  }

  async loadServers() {
    this.loading = true;
    try {
      const savedServers = await storage.getItem('servers');
      this.currentAddress = await storage.getItem('serverAddress') || '';
      if (savedServers) {
        const parsed = JSON.parse(savedServers) as Array<Record<string, Object>>;
        const mapped: ServerData[] = [];
        for (let i = 0; i < parsed.length; i++) {
          const item = parsed[i];
          const server = new ServerData();
          server.address = String(item['address'] || '');
          server.type = String(item['type'] || '');
          server.name = String(item['name'] || '');
          mapped.push(server);
        }
        this.servers = mapped;
      }
    } catch (e) {
      console.error('Load servers failed:', e);
    } finally {
      this.loading = false;
    }
  }

  async selectServer(server: ServerData) {
    try {
      await storage.setItem('serverAddress', server.address);
      await storage.setItem('sourceType', server.type);
      httpClient.setBaseURL(server.address);
      this.currentAddress = server.address;
      // Navigate to login
      router.pushUrl({ url: 'pages/LoginPage', params: { sourceType: server.type } });
    } catch (e) {
      console.error('Select server failed:', e);
    }
  }

  goBack() {
    router.back();
  }

  navigateToAddServer() {
    router.pushUrl({ url: 'pages/SourceSelectPage' });
  }

  @Builder
  ServerItemBuilder(server: ServerData) {
    Row() {
      Column() {
        Text(server.name.substring(0, 1))
          .fontSize(20)
          .fontColor('#FFFFFF')
      }
      .width(48)
      .height(48)
      .borderRadius(24)
      .backgroundColor('#007DFF')
      .justifyContent(FlexAlign.Center)
      .margin({ right: 12 })

      Column() {
        Text(server.name || server.address)
          .fontSize(15)
          .fontWeight(FontWeight.Medium)
          .fontColor('#2c3e50')
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
          .width(200)

        Text(server.type + ' · ' + server.address)
          .fontSize(12)
          .fontColor('#95a5a6')
          .margin({ top: 4 })
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
          .width(200)
      }
      .layoutWeight(1)
      .alignItems(HorizontalAlign.Start)

      if (this.currentAddress === server.address) {
        Text('✓')
          .fontSize(16)
          .fontColor('#007DFF')
      }
    }
    .width('100%')
    .padding({ top: 12, bottom: 12, left: 16, right: 16 })
    .backgroundColor('#ffffff')
    .borderRadius(12)
    .margin({ bottom: 8 })
    .onClick(() => this.selectServer(server))
  }

  build() {
    Column() {
      Row() {
        Button('←')
          .width(40)
          .height(40)
          .backgroundColor(Color.Transparent)
          .fontSize(24)
          .fontColor('#2c3e50')
          .onClick(() => this.goBack())

        Text('数据源管理')
          .fontSize(18)
          .fontWeight(FontWeight.Bold)
          .fontColor('#2c3e50')
          .layoutWeight(1)
          .textAlign(TextAlign.Center)
      }
      .width('100%')
      .padding({ left: 8, right: 8, top: 16, bottom: 8 })

      if (this.loading) {
        Column() {
          Text('加载中...')
            .fontSize(14)
            .fontColor('#95a5a6')
            .margin({ top: 40 })
        }
        .width('100%')
        .layoutWeight(1)
      } else {
        List() {
          ForEach(this.servers, (server: ServerData) => {
            ListItem() {
              this.ServerItemBuilder(server);
            }
          })
        }
        .width('100%')
        .layoutWeight(1)
        .scrollBar(BarState.Off)
        .edgeEffect(EdgeEffect.Spring)
        .padding({ left: 16, right: 16, top: 8 })

        if (this.servers.length === 0) {
          Column() {
            Text('暂无数据源')
              .fontSize(14)
              .fontColor('#95a5a6')
              .margin({ top: 40 })
          }
          .width('100%')
        }
      }

      Button('➕ 添加数据源')
        .width('90%')
        .height(48)
        .backgroundColor('#007DFF')
        .borderRadius(24)
        .fontSize(15)
        .fontWeight(FontWeight.Medium)
        .fontColor('#FFFFFF')
        .margin({ bottom: 20, top: 12 })
        .onClick(() => this.navigateToAddServer())
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#f5f5f5')
  }
}
