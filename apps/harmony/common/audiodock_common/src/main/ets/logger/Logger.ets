import hilog from '@ohos.hilog';

const DOMAIN = 0xA001;
const TAG = 'AudioDock';

export class Logger {
  static d(tag: string, msg: string, ...args: object[]): void {
    hilog.debug(DOMAIN, TAG, `[${tag}] ${msg}`, ...args);
  }
  static i(tag: string, msg: string, ...args: object[]): void {
    hilog.info(DOMAIN, TAG, `[${tag}] ${msg}`, ...args);
  }
  static w(tag: string, msg: string, ...args: object[]): void {
    hilog.warn(DOMAIN, TAG, `[${tag}] ${msg}`, ...args);
  }
  static e(tag: string, msg: string, ...args: object[]): void {
    hilog.error(DOMAIN, TAG, `[${tag}] ${msg}`, ...args);
  }
}
