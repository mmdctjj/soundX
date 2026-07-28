import router from '@ohos.router';
import { kvStore } from 'features_storage';
import { Logger } from 'audiodock_common';
import { authStore } from '../context/AuthStore';

interface ServerRecord {
  address?: string;
  type?: string;
  name?: string;
}

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
      this.currentAddress = authStore.state_.serverAddress;
      const parsed = await kvStore.getJSON<ServerRecord[]>('servers');
      if (parsed) {
        const mapped: ServerData[] = [];
        for (const item of parsed) {
          const server = new ServerData();
          server.address = item.address ?? '';
          server.type = item.type ?? '';
          server.name = item.name ?? '';
          mapped.push(server);
        }
        this.servers = mapped;
      }
    } catch (e) {
      Logger.w('SourceManagePage', `load servers failed: ${String(e)}`);
    } finally {
      this.loading = false;
    }
  }

  async selectServer(server: ServerData) {
    try {
      // switchServer 会写入 serverAddress、重设 baseURL 并载入该服务器下的 token/user。
      await authStore.switchServer(server.address);
      await kvStore.set('selectedSourceType', server.type);
      this.currentAddress = authStore.state_.serverAddress;
      router.pushUrl({ url: 'pages/LoginPage', params: { sourceType: server.type } });
    } catch (e) {
      Logger.e('SourceManagePage', `select server failed: ${String(e)}`);
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
