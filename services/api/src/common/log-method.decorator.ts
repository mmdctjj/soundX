import { Logger } from '@nestjs/common';

/**
 * 方法装饰器：在方法调用前后统一记录入参、出参以及异常。
 * 使用 NestJS 的 Logger，日志前缀为 `${target.constructor.name}.${propertyKey}`。
 */
export function LogMethod() {
  return (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) => {
    const originalMethod = descriptor.value;
    const logger = new Logger(`${target.constructor.name}.${propertyKey}`);

    descriptor.value = async function (...args: any[]) {
      // 记录入口参数
      logger.verbose('▶️ method called', { args });
      try {
        const result = await originalMethod.apply(this, args);
        // 记录返回值（只保留关键字段，防止日志爆炸）
        logger.debug('✅ method returned', { result });
        return result;
      } catch (err) {
        // 记录异常栈
        logger.error('❌ method threw', err.stack || err);
        throw err;
      }
    };
    return descriptor;
  };
}
