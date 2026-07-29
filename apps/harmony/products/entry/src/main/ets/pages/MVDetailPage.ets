import router from '@ohos.router';
import { buildTheme, CommonNavBar, EmptyView, SkeletonBlock } from 'features_ui';
import type { ThemeMode } from 'features_ui';
import { t, getLang } from 'features_i18n';
import { formatDuration } from 'audiodock_common';
import { mvApi } from 'features_network';
import type { MVDto } from 'features_network';

@Entry
@Component
struct MVDetailPage {
  @State data: MVDto | null = null;
  @State loading: boolean = true;
  @State error: string = '';
  private entityId: string = '';
  @StorageLink('themeMode') @Watch('onThemeModeChange') themeMode: ThemeMode = 'light';
  @State private langAtBuild: string = getLang();
  private theme = buildTheme('light');

  onThemeModeChange(): void {
    this.theme = buildTheme(this.themeMode);
  }

  aboutToAppear(): void {
    this.theme = buildTheme(this.themeMode);
    interface RouterParams { id?: string }
    const p = router.getParams() as RouterParams;
    this.entityId = p.id ?? '';
    this.load();
  }

  onPageShow(): void {
    // 语言可能在后台（语言页/系统设置）被修改：回显时若语言已变化，切换 if 分支重建整页。
    // 不能在隐藏时重建——@StorageProp 在后台更新触发的重建会导致路由页触摸失效，
    // 因此用 langAtBuild 把重建延迟到页面可见时。
    const cur = getLang();
    if (cur !== this.langAtBuild) this.langAtBuild = cur;
  }

  build() {
    // 语言切换时重建整页：条件读取 langAtBuild 建立依赖（框架只追踪读取状态变量的表达式，
    // t() 是普通函数无法被追踪），语言变化使 if 分支切换，旧子树销毁、新子树重建，
    // 所有 t() 文案（含局部 @Builder 和 @Prop 传串的子组件）都按新语言重新求值。
    if (this.langAtBuild === 'zh-CN') {
      this.LocalizedContent()
    } else {
      this.LocalizedContent()
    }
  }

  @Builder
  LocalizedContent() {
    Column() {
      CommonNavBar({ title: this.data?.name ?? '', theme: this.theme,
        onBack: () => router.back() });
      if (this.loading) {
        Column({ space: 12 }) {
          SkeletonBlock({ blockHeight: 220, theme: this.theme });
          SkeletonBlock({ blockWidth: '60%', blockHeight: 20, theme: this.theme });
        }.padding(16);
      } else if (this.error || !this.data) {
        EmptyView({ message: this.error || t('detail.retry_failed'), theme: this.theme });
      } else {
        this.content();
      }
    }.width('100%').height('100%').backgroundColor(this.theme.colors.background)
  }

  @Builder content() {
    Column({ space: 12 }) {
      // Cover stand-in for <video> playback; P3 wires the real player.
      SkeletonBlock({ blockHeight: 220, theme: this.theme });
      Text(this.data!.name).fontSize(22).fontWeight(FontWeight.Bold);
      Text(this.data!.artist ?? '').fontSize(14)
        .fontColor(this.theme.colors.textSecondary);
      Text(formatDuration((this.data!.duration ?? 0) * 1000))
        .fontSize(12).fontColor(this.theme.colors.textSecondary);
    }.padding(16);
  }

  private async load(): Promise<void> {
    this.loading = true; this.error = '';
    try {
      this.data = await mvApi.getById(this.entityId);
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
    } finally {
      this.loading = false;
    }
  }
}
