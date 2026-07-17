import { NativeModule, requireNativeModule } from 'expo';

declare class SystemDownloadManager extends NativeModule {
  downloadApk(
    url: string,
    fileName?: string,
    title?: string,
    description?: string
  ): Promise<string>;
}

export default requireNativeModule<SystemDownloadManager>('SystemDownloadManager');
