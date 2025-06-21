#!/usr/bin/env node

/**
 * Mermaid Chart MCP 服务器
 * 支持两种传输方式：
 * 1. stdio - 标准输入输出（用于MCP客户端）
 * 2. sse - 服务器发送事件（用于Web界面测试）
 */

import { SimpleMermaidMCPServer } from './simple-mcp-server.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express from 'express';

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
    const app = express();
    
    // 启用CORS
    app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });

    app.use(express.json());

    // SSE连接端点
    app.get('/sse', async (_req, res) => {
      console.error('🔗 新的SSE连接');
      
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      });

      const transport = new SSEServerTransport('/sse', res);
      await this.mcpServer.getServer().connect(transport);
    });

    // 健康检查端点
    app.get('/health', (_req, res) => {
      res.json({ 
        status: 'healthy', 
        mode: 'sse',
        timestamp: new Date().toISOString() 
      });
    });

    // 静态测试页面
    app.get('/', (_req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Mermaid Chart MCP Server</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .container { max-width: 800px; margin: 0 auto; }
                textarea { width: 100%; height: 200px; margin: 10px 0; }
                button { padding: 10px 20px; margin: 5px; }
                .output { border: 1px solid #ccc; padding: 10px; margin: 10px 0; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🧜‍♀️ Mermaid Chart MCP Server</h1>
                <p>服务器运行在 SSE 模式，端口: ${port}</p>
                
                <h2>测试工具调用</h2>
                <textarea id="mermaidCode" placeholder="在此输入Mermaid代码...">
graph TD
    A[开始] --> B{是否理解?}
    B -->|是| C[继续]
    B -->|否| D[学习更多]
    D --> B
    C --> E[结束]
                </textarea>
                <br>
                <button onclick="renderMermaid()">渲染图表</button>
                <button onclick="validateSyntax()">验证语法</button>
                
                <div id="output" class="output">
                    <h3>输出结果</h3>
                    <div id="result">等待操作...</div>
                </div>
            </div>

            <script>
                // 这里可以添加测试用的JavaScript代码
                function renderMermaid() {
                    const code = document.getElementById('mermaidCode').value;
                    document.getElementById('result').innerHTML = '正在渲染图表...';
                    console.log('渲染Mermaid代码:', code);
                }
                
                function validateSyntax() {
                    const code = document.getElementById('mermaidCode').value;
                    document.getElementById('result').innerHTML = '正在验证语法...';
                    console.log('验证Mermaid语法:', code);
                }
            </script>
        </body>
        </html>
      `);
    });

    app.listen(port, () => {
      console.error(`🌐 Mermaid Chart MCP 服务器已启动 (SSE 模式)`);
      console.error(`📡 SSE 端点: http://localhost:${port}/sse`);
      console.error(`🏠 测试页面: http://localhost:${port}/`);
      console.error(`💚 健康检查: http://localhost:${port}/health`);
    });
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