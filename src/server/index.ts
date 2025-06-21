/**
 * Mermaid Chart MCP 服务器主入口
 * 支持两种传输方式：
 * 1. stdio - 标准输入输出（用于MCP客户端）
 * 2. sse - 服务器发送事件（用于Web界面测试）
 */

import { SimpleMermaidMCPServer } from './simple-mcp-server.js';
import { SSETransport } from './sse-transport.js';

class MermaidChartServer {
  private mcpServer: SimpleMermaidMCPServer;

  constructor() {
    this.mcpServer = new SimpleMermaidMCPServer();
  }

  /**
   * 启动stdio模式（默认）
   */
  async startStdio(): Promise<void> {
    console.error('🚀 启动 Mermaid Chart MCP 服务器 (stdio 模式)');
    await this.mcpServer.run();
  }

  /**
   * 启动SSE模式（Web服务器）
   */
  async startSSE(port: number = 3000): Promise<void> {
    const sseTransport = new SSETransport(this.mcpServer);
    await sseTransport.start(port);
  }
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  const server = new MermaidChartServer();

  if (args.includes('--sse') || args.includes('-s')) {
    // SSE模式
    const portArg = args.find(arg => arg.startsWith('--port='));
    const port = portArg ? parseInt(portArg.split('=')[1]!) : 3000;
    await server.startSSE(port);
  } else {
    // 默认stdio模式
    await server.startStdio();
  }
}

// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('❌ 服务器启动失败:', error);
    process.exit(1);
  });
}

export { MermaidChartServer }; 