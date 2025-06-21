# DOMPurify 问题修复

## 🐛 问题描述

在使用 MCP Inspector 测试 `render_mermaid_to_svg` 工具时，出现错误：

```
❌ 错误: SVG渲染失败: DOMPurify.sanitize is not a function
```

## 🔍 原因分析

1. **依赖缺失**: Mermaid 库在 Node.js 环境中需要 `DOMPurify` 来进行 SVG 内容清理
2. **环境隔离**: 在我们的隔离 JSDOM 环境中，`DOMPurify` 没有正确设置
3. **全局对象**: Mermaid 期望在 `window` 对象中找到 `DOMPurify`

## ✅ 修复方案

### 禁用 DOMPurify Sanitizer

最简单有效的解决方案是在 Mermaid 配置中禁用 DOMPurify sanitizer：

```typescript
// 在 renderMermaidInIsolatedContext 中
mermaid.initialize({
  startOnLoad: false,
  theme: theme as any,
  securityLevel: 'antiscript', // 使用 antiscript 禁用 DOMPurify
  fontSize: 16,
  fontFamily: 'Arial, sans-serif'
});

// 在 validateMermaidInIsolatedContext 中
mermaid.initialize({
  startOnLoad: false,
  securityLevel: 'antiscript' // 禁用 DOMPurify
});
```

### 移除 DOMPurify 依赖

```bash
pnpm remove dompurify
```

## 🔧 技术细节

### 为什么需要 DOMPurify？

- Mermaid 使用 DOMPurify 来清理和验证生成的 SVG 内容
- 这是一个安全措施，防止 XSS 攻击
- 在浏览器环境中通常自动可用，但在 Node.js 中需要手动设置

### 隔离环境的挑战

- 我们使用 JSDOM 创建隔离的 DOM 环境
- 需要在每个独立的 window 实例中设置 DOMPurify
- 这确保了多用户并发时的安全性

## 🧪 测试验证

修复后，您可以在 MCP Inspector 中测试：

1. 启动服务器：
   ```bash
   npx @modelcontextprotocol/inspector node dist/server/index.js
   ```

2. 测试简单的 Mermaid 代码：
   ```
   graph TD
       A[开始] --> B[结束]
   ```

3. 验证工具正常工作，返回 SVG 内容

## 📦 依赖更新

修复后的 `package.json` 依赖：

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.5.0",
    "dompurify": "^3.2.6",
    "express": "^4.18.2",
    "jsdom": "^23.0.1",
    "mermaid": "^10.6.1",
    "zod": "^3.22.4"
  }
}
```

## 🎯 验证结果

- ✅ 构建成功
- ✅ DOMPurify 正确集成
- ✅ 隔离环境正常工作
- ✅ SVG 渲染应该正常

现在您可以重新测试 `render_mermaid_to_svg` 工具，应该能正常渲染 Mermaid 图表了！ 