#!/usr/bin/env node

/**
 * Mermaid Chart MCP 服务器入口文件
 */

import { MermaidChartMCPServer } from './mcp/server.js';

async function main() {
  try {
    const server = new MermaidChartMCPServer();
    await server.run();
  } catch (error) {
    console.error('服务器启动失败:', error);
    process.exit(1);
  }
}

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason, 'at:', promise);
  process.exit(1);
});

// 优雅关闭
process.on('SIGINT', () => {
  console.error('收到SIGINT信号，正在关闭服务器...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('收到SIGTERM信号，正在关闭服务器...');
  process.exit(0);
});

if (require.main === module) {
  main();
}

// 导出主要类和接口供库使用
export { TypeScriptAnalyzer } from './analyzers/typescript-analyzer.js';
export { SVGBeautifier } from './beautifiers/svg-beautifier.js';
export { ClassDiagramGenerator } from './generators/class-diagram-generator.js';
export { MermaidChartMCPServer } from './mcp/server.js';
export { SVGRenderer } from './renderers/svg-renderer.js';
export * from './types.js';

