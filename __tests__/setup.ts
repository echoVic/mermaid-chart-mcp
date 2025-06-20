/**
 * Jest 测试设置文件
 */

// 设置测试超时
jest.setTimeout(30000);

// 模拟浏览器环境变量
global.console = {
  ...console,
  // 在测试中静默某些日志
  warn: jest.fn(),
  error: jest.fn(),
};

// 全局测试清理
afterEach(() => {
  jest.clearAllMocks();
}); 