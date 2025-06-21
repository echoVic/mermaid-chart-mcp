# Mermaid Chart MCP Server

一个简单的 Model Context Protocol (MCP) 服务器，提供 Mermaid 图表生成和渲染功能。

## 功能特性

- 🎨 渲染 Mermaid 代码为 SVG 格式
- ✅ 验证 Mermaid 语法
- 🌐 支持两种连接方式：stdio 和 Server-Sent Events (SSE)
- 🚀 基于 TypeScript 和 ES 模块

## 快速开始

### 安装依赖

```bash
pnpm install
```

### 启动服务器

#### 1. stdio 模式（默认）

```bash
pnpm start
```

#### 2. SSE 模式（Web API）

```bash
pnpm run start:sse
```

服务器将在 http://localhost:3000 启动，提供以下端点：

- `/sse` - SSE 连接端点
- `/health` - 健康检查
- `/` - 测试页面

### 自定义端口（SSE模式）

```bash
pnpm run start:sse:port
```

将在端口 3001 启动服务器。

## 支持的工具

### 1. render_mermaid_to_svg

将 Mermaid 代码渲染为 SVG 格式。

**参数：**
- `diagram` (string): Mermaid 图表代码

**返回：**
- SVG 字符串

### 2. validate_mermaid_syntax

验证 Mermaid 语法的正确性。

**参数：**
- `diagram` (string): 要验证的 Mermaid 代码

**返回：**
- 验证结果和错误信息（如有）

## 技术架构

- **Framework**: TypeScript + Node.js
- **模块系统**: ES Modules
- **MCP**: @modelcontextprotocol/sdk
- **渲染**: 基于 Puppeteer 的无头浏览器
- **传输**: stdio 和 SSE

## 项目结构

```
src/
├── server.ts              # 统一服务器入口（支持 stdio 和 SSE）
└── simple-mcp-server.ts   # 核心 MCP 服务器实现
```

## 许可证

MIT License 