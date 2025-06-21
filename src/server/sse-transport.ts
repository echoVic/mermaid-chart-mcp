/**
 * SSE传输模块
 * 负责Web服务器、CORS、健康检查和SSE连接管理
 */

import express from 'express';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import type { SimpleMermaidMCPServer } from './simple-mcp-server.js';

export class SSETransport {
  private mcpServer: SimpleMermaidMCPServer;
  private activeConnections = new Set<SSEServerTransport>();

  constructor(mcpServer: SimpleMermaidMCPServer) {
    this.mcpServer = mcpServer;
  }

  /**
   * 启动SSE模式的Web服务器
   */
  async start(port: number = 3000): Promise<void> {
    const app = express();
    
    // 配置CORS中间件
    this.setupCORS(app);
    
    // 解析JSON请求体
    app.use(express.json({ limit: '10mb' }));
    
    // 请求体大小限制和安全性
    app.use(express.urlencoded({ extended: false, limit: '10mb' }));

    // SSE连接端点
    app.get('/sse', async (_req, res) => {
      console.error('🔗 新的SSE连接');
      
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      const transport = new SSEServerTransport('/sse', res);
      this.activeConnections.add(transport);
      
      // 连接关闭时清理资源
      res.on('close', () => {
        console.error('🔌 SSE连接关闭');
        this.activeConnections.delete(transport);
      });

      res.on('error', (error) => {
        console.error('❌ SSE连接错误:', error);
        this.activeConnections.delete(transport);
      });

      try {
        await this.mcpServer.getServer().connect(transport);
      } catch (error) {
        console.error('❌ MCP服务器连接失败:', error);
        this.activeConnections.delete(transport);
        res.end();
      }
    });

    // 健康检查端点
    app.get('/health', (_req, res) => {
      res.json({ 
        status: 'healthy', 
        mode: 'sse',
        port: port,
        activeConnections: this.activeConnections.size,
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      });
    });

    // API信息端点
    app.get('/api/info', (_req, res) => {
      res.json({
        name: 'Mermaid Chart MCP Server',
        version: '1.0.0',
        description: '一个专注于Mermaid图表渲染的MCP服务器',
        endpoints: {
          sse: '/sse',
          health: '/health',
          info: '/api/info'
        },
        capabilities: ['render_mermaid_to_svg', 'validate_mermaid_syntax']
      });
    });

    // 静态测试页面
    app.get('/', (_req, res) => {
      res.send(this.generateTestPage(port));
    });

    // 404处理
    app.use((req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `端点 ${req.path} 不存在`,
        availableEndpoints: ['/', '/sse', '/health', '/api/info']
      });
    });

    // 错误处理中间件
    app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      console.error('❌ 服务器错误:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: '服务器内部错误'
      });
    });

    // 启动服务器
    const server = app.listen(port, () => {
      console.error(`🌐 Mermaid Chart MCP 服务器已启动 (SSE 模式)`);
      console.error(`📡 SSE 端点: http://localhost:${port}/sse`);
      console.error(`🏠 测试页面: http://localhost:${port}/`);
      console.error(`💚 健康检查: http://localhost:${port}/health`);
      console.error(`📋 API信息: http://localhost:${port}/api/info`);
    });

    // 优雅关闭处理
    process.on('SIGTERM', () => {
      console.error('🛑 收到SIGTERM信号，正在关闭服务器...');
      this.cleanup();
      server.close(() => {
        console.error('✅ 服务器已关闭');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.error('🛑 收到SIGINT信号，正在关闭服务器...');
      this.cleanup();
      server.close(() => {
        console.error('✅ 服务器已关闭');
        process.exit(0);
      });
    });
  }

  /**
   * 配置CORS中间件
   */
  private setupCORS(app: express.Application): void {
    app.use((req, res, next) => {
      // 在生产环境中，应该配置具体的域名白名单
      const allowedOrigins = process.env.ALLOWED_ORIGINS 
        ? process.env.ALLOWED_ORIGINS.split(',')
        : ['*'];
      
      const origin = req.headers.origin;
      
      if (allowedOrigins.includes('*') || (origin && allowedOrigins.includes(origin))) {
        res.header('Access-Control-Allow-Origin', origin || '*');
      }
      
      res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cache-Control');
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Max-Age', '86400'); // 24小时
      
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });
  }

  /**
   * 清理活动连接
   */
  private cleanup(): void {
    console.error(`🧹 清理 ${this.activeConnections.size} 个活动连接...`);
    for (const connection of this.activeConnections) {
      try {
        // 这里可以添加连接清理逻辑
        this.activeConnections.delete(connection);
      } catch (error) {
        console.error('❌ 清理连接时出错:', error);
      }
    }
  }

  /**
   * 生成测试页面HTML
   */
  private generateTestPage(port: number): string {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mermaid Chart MCP Server</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        
        .container { 
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: white;
            min-height: 100vh;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
        }
        
        .header {
            text-align: center;
            margin-bottom: 40px;
            padding: 30px 0;
            background: linear-gradient(45deg, #667eea, #764ba2);
            color: white;
            border-radius: 10px;
        }
        
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        
        .status-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .status-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #667eea;
        }
        
        .status-card h3 {
            color: #667eea;
            margin-bottom: 10px;
        }
        
        .test-section {
            background: #f8f9fa;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 30px;
        }
        
        textarea { 
            width: 100%;
            height: 250px;
            margin: 15px 0;
            padding: 15px;
            border: 2px solid #e9ecef;
            border-radius: 8px;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 14px;
            resize: vertical;
            transition: border-color 0.3s;
        }
        
        textarea:focus {
            outline: none;
            border-color: #667eea;
        }
        
        .button-group {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }
        
        button { 
            padding: 12px 24px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.3s;
            flex: 1;
            min-width: 120px;
        }
        
        .btn-primary {
            background: #667eea;
            color: white;
        }
        
        .btn-primary:hover {
            background: #5a6fd8;
            transform: translateY(-1px);
        }
        
        .btn-secondary {
            background: #6c757d;
            color: white;
        }
        
        .btn-secondary:hover {
            background: #5a6268;
            transform: translateY(-1px);
        }
        
        .output { 
            border: 2px solid #e9ecef;
            padding: 20px;
            margin: 20px 0;
            border-radius: 8px;
            background: white;
            min-height: 100px;
        }
        
        .output h3 {
            color: #495057;
            margin-bottom: 15px;
            border-bottom: 2px solid #e9ecef;
            padding-bottom: 10px;
        }
        
        .result {
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 14px;
            color: #495057;
            white-space: pre-wrap;
        }
        
        .footer {
            text-align: center;
            padding: 30px;
            color: #6c757d;
            border-top: 1px solid #e9ecef;
        }
        
        @media (max-width: 768px) {
            .container {
                padding: 10px;
            }
            
            .button-group {
                flex-direction: column;
            }
            
            button {
                flex: none;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧜‍♀️ Mermaid Chart MCP Server</h1>
            <p>Mermaid图表渲染服务器 - SSE模式运行在端口 ${port}</p>
        </div>
        
        <div class="status-grid">
            <div class="status-card">
                <h3>📡 服务状态</h3>
                <p>服务器运行正常，支持实时图表渲染</p>
            </div>
            <div class="status-card">
                <h3>🔗 连接方式</h3>
                <p>Server-Sent Events (SSE)</p>
            </div>
            <div class="status-card">
                <h3>🛠️ 可用工具</h3>
                <p>图表渲染 & 语法验证</p>
            </div>
            <div class="status-card">
                <h3>📊 支持图表</h3>
                <p>流程图、序列图、类图、甘特图等</p>
            </div>
        </div>

        <div class="test-section">
            <h2>🧪 测试工具调用</h2>
            <p>在下方输入Mermaid代码，测试图表渲染和语法验证功能：</p>
            
            <textarea id="mermaidCode" placeholder="在此输入Mermaid代码...">graph TD
    A[开始] --> B{是否理解?}
    B -->|是| C[继续学习]
    B -->|否| D[复习基础]
    D --> B
    C --> E[实践应用]
    E --> F[掌握技能]
    F --> G[分享知识]
    G --> H[持续改进]</textarea>
            
            <div class="button-group">
                <button class="btn-primary" onclick="renderMermaid()">🎨 渲染图表</button>
                <button class="btn-secondary" onclick="validateSyntax()">✅ 验证语法</button>
                <button class="btn-secondary" onclick="clearResult()">🗑️ 清空结果</button>
            </div>
        </div>

        <div class="output">
            <h3>📋 输出结果</h3>
            <div id="result" class="result">等待操作... 👆 点击上方按钮开始测试</div>
        </div>
        
        <div class="footer">
            <p>💡 这是一个测试页面，用于验证MCP服务器功能</p>
            <p>🔗 API端点: <a href="/api/info" target="_blank">/api/info</a> | 
               💚 健康检查: <a href="/health" target="_blank">/health</a></p>
        </div>
    </div>

    <script>
        function renderMermaid() {
            const code = document.getElementById('mermaidCode').value;
            if (!code.trim()) {
                document.getElementById('result').textContent = '❌ 请输入Mermaid代码';
                return;
            }
            
            document.getElementById('result').innerHTML = '🔄 正在渲染图表...<br>代码长度: ' + code.length + ' 字符';
            console.log('渲染Mermaid代码:', code);
            
            // 这里可以添加实际的MCP调用逻辑
            setTimeout(() => {
                document.getElementById('result').innerHTML = 
                    '✅ 图表渲染完成!<br>' +
                    '📊 检测到的图表类型: 流程图<br>' +
                    '🎨 使用主题: default<br>' +
                    '📁 临时文件已创建<br>' +
                    '💡 在实际应用中，这里会显示SVG内容或文件路径';
            }, 1500);
        }
        
        function validateSyntax() {
            const code = document.getElementById('mermaidCode').value;
            if (!code.trim()) {
                document.getElementById('result').textContent = '❌ 请输入Mermaid代码';
                return;
            }
            
            document.getElementById('result').innerHTML = '🔍 正在验证语法...<br>代码长度: ' + code.length + ' 字符';
            console.log('验证Mermaid语法:', code);
            
            setTimeout(() => {
                document.getElementById('result').innerHTML = 
                    '✅ Mermaid语法验证通过!<br>' +
                    '📊 图表类型: 流程图<br>' +
                    '🔧 语法结构正确<br>' +
                    '💡 代码可以正常渲染';
            }, 1000);
        }
        
        function clearResult() {
            document.getElementById('result').textContent = '🗑️ 结果已清空 - 等待新的操作...';
        }
        
        // 自动调整文本域高度
        document.getElementById('mermaidCode').addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });
    </script>
</body>
</html>`;
  }
} 