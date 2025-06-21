# Mermaid Chart MCP Server

一个专注于Mermaid图表渲染的MCP服务器，支持将Mermaid代码渲染为SVG图表。

## ✨ 特性

- 🎨 **高质量渲染**: 基于官方Mermaid库的SVG渲染
- 🔄 **双模式支持**: stdio（MCP标准）和SSE（Web测试）
- 🛡️ **安全性**: 输入校验、沙箱环境、CORS配置
- 📊 **多图表类型**: 支持流程图、序列图、类图、甘特图等
- 🚀 **高性能**: 隔离渲染环境，避免全局污染
- 💚 **健康监控**: 内置健康检查和连接管理

## 🏗️ 项目结构

```
src/
├── server/
│   ├── index.ts              # 主入口文件
│   ├── simple-mcp-server.ts  # MCP服务器核心逻辑
│   ├── sse-transport.ts      # SSE传输和Web服务器
│   └── utils.ts              # 工具函数（校验、清理等）
├── package.json
├── tsconfig.json
├── tsup.config.ts            # 构建配置
└── README.md
```

## 🚀 快速开始

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
# stdio模式（用于MCP客户端）
pnpm run start:dev

# SSE模式（用于Web测试）
pnpm run start:dev:sse

# 指定端口的SSE模式
pnpm run start:dev:sse -- --port=3001
```

### 构建和运行

```bash
# 构建项目
pnpm run build

# 运行构建后的项目
pnpm start                  # stdio模式
pnpm run start:sse          # SSE模式
pnpm run start:sse:port     # SSE模式（端口3001）
```

## 🔍 调试和测试

推荐使用官方的 [MCP Inspector](https://github.com/modelcontextprotocol/inspector) 进行调试和测试：

```bash
# 使用 MCP Inspector 调试服务器
npx @modelcontextprotocol/inspector node dist/server/index.js

# 或者在开发模式下
npx @modelcontextprotocol/inspector node --loader ts-node/esm src/server/index.ts
```

MCP Inspector 提供了强大的可视化界面，支持：
- 🎨 交互式工具测试
- 📊 实时请求/响应监控
- 🔧 参数配置和验证
- 📋 完整的API探索

## 🛠️ 可用工具

### 1. render_mermaid_to_svg

将Mermaid代码渲染为SVG图表。

**参数:**
- `mermaidCode` (string, 必需): Mermaid图表代码
- `title` (string, 可选): 图表标题，默认"Mermaid图表"
- `theme` (string, 可选): 主题，可选值: default, dark, forest, neutral
- `createTempFile` (boolean, 可选): 是否创建临时SVG文件，默认true

**示例:**
```json
{
  "mermaidCode": "graph TD\n    A[开始] --> B[结束]",
  "title": "简单流程图",
  "theme": "dark",
  "createTempFile": true
}
```

### 2. validate_mermaid_syntax

验证Mermaid代码语法。

**参数:**
- `mermaidCode` (string, 必需): 要验证的Mermaid图表代码

**示例:**
```json
{
  "mermaidCode": "sequenceDiagram\n    Alice->>Bob: Hello"
}
```

## 🔧 技术特性

### 全局污染解决方案

使用独立的JSDOM实例和临时全局变量设置，避免在多用户并发环境中的竞态问题：

```typescript
// 创建隔离的渲染环境
const dom = new JSDOM('<!DOCTYPE html>...');
const originalWindow = global.window;
const originalDocument = global.document;

try {
  global.window = dom.window;
  global.document = dom.window.document;
  // 渲染逻辑
} finally {
  // 恢复原始全局变量
  if (originalWindow !== undefined) {
    global.window = originalWindow;
  } else {
    delete (global as any).window;
  }
  dom.window.close();
}
```

### 稳健的SVG标题添加

使用DOM解析器插入title元素，比字符串替换更可靠：

```typescript
private addTitleToSVG(svg: string, title: string): string {
  try {
    const dom = new JSDOM(`<!DOCTYPE html><html><body>${svg}</body></html>`);
    const svgElement = dom.window.document.querySelector('svg');
    
    if (svgElement) {
      const titleElement = dom.window.document.createElement('title');
      titleElement.textContent = title;
      svgElement.insertBefore(titleElement, svgElement.firstChild);
      return svgElement.outerHTML;
    }
    // 回退方案...
  } catch (error) {
    // 回退到字符串替换
  }
}
```

### 精细的图表类型检测

使用正则表达式精确匹配各种Mermaid图表类型：

```typescript
const patterns = [
  { pattern: /^(graph|flowchart)\s+(TD|TB|BT|RL|LR)/, type: '流程图' },
  { pattern: /^sequencediagram/m, type: '序列图' },
  { pattern: /^classDiagram/m, type: '类图' },
  // ... 更多模式
];
```

### 输入校验和安全性

- 字符串长度限制（50000字符）
- 恶意内容检测（script标签、JavaScript URL等）
- 文件名清理和安全化
- CORS配置和域名白名单

### SSE连接管理

- 自动连接清理和资源释放
- 优雅关闭处理
- 活动连接数量监控
- 错误处理和重连机制

## 🌐 Web测试界面

SSE模式提供了一个现代化的测试界面，包含：

- 🎨 美观的Material Design风格UI
- 📱 响应式设计，支持移动设备
- 🧪 实时代码测试和验证
- 📊 服务器状态监控
- 🔗 API端点信息

访问 `http://localhost:3000` 查看测试界面。

## 📡 API端点

### SSE模式端点

- `GET /` - 测试页面
- `GET /sse` - Server-Sent Events连接端点
- `GET /health` - 健康检查
- `GET /api/info` - API信息

### 健康检查响应

```json
{
  "status": "healthy",
  "mode": "sse",
  "port": 3000,
  "activeConnections": 2,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0"
}
```

## 🔧 配置

### 环境变量

- `ALLOWED_ORIGINS`: CORS允许的域名列表（逗号分隔），默认为`*`
- `NODE_ENV`: 环境模式（development/production）

### TypeScript配置

项目使用严格的TypeScript配置：

- 启用所有严格检查
- ESM模块系统
- Node.js 18+ 目标
- 完整的类型声明

## 🚢 部署建议

### 1. 构建优化

```bash
# 生产构建
pnpm run build

# 验证构建产物
ls -la dist/
```

### 2. 进程管理

推荐使用PM2等进程管理器：

```bash
# 安装PM2
npm install -g pm2

# 启动服务
pm2 start dist/server/index.js --name mermaid-mcp

# SSE模式
pm2 start dist/server/index.js --name mermaid-mcp-sse -- --sse --port=3000
```

### 3. 反向代理

Nginx配置示例：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🤝 贡献

欢迎提交Issue和Pull Request来改进这个项目！

## 📄 许可证

MIT License

---

**Made with ❤️ for the MCP community** 