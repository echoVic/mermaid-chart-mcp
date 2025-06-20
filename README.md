# Mermaid Chart MCP

一个功能强大的Model Context Protocol (MCP)服务器，提供从代码自动生成Mermaid图表及SVG美化功能。

## ✨ 特性

- 🔍 **智能代码分析** - 支持TypeScript/JavaScript代码结构分析
- 📊 **多种图表类型** - 类图、流程图、序列图等
- 🎨 **SVG美化** - 手绘风格、彩色主题、极简设计、专业风格
- 🚀 **MCP集成** - 完全兼容Model Context Protocol
- ⚡ **高性能** - 基于Tree-sitter的快速代码解析
- 🛡️ **类型安全** - 完整的TypeScript类型定义

## 🚀 快速开始

### 安装

```bash
# 克隆项目
git clone <repository-url>
cd mermaid-chart-mcp

# 安装依赖
npm install

# 构建项目
npm run build
```

### 基本使用

#### 作为MCP服务器运行

```bash
# 启动MCP服务器
npm start
```

#### 作为库使用

```typescript
import {
  TypeScriptAnalyzer,
  ClassDiagramGenerator,
  SVGRenderer,
  SVGBeautifier,
  SupportedLanguage,
  DiagramType,
  BeautificationStyle
} from 'mermaid-chart-mcp';

// 分析TypeScript代码
const analyzer = new TypeScriptAnalyzer();
const analysisResult = await analyzer.analyze(code, {
  language: SupportedLanguage.TypeScript,
  includePrivate: true
});

// 生成类图
const generator = new ClassDiagramGenerator();
const mermaidResult = await generator.generate(analysisResult, {
  diagramType: DiagramType.ClassDiagram,
  direction: 'TB',
  includeTitle: true,
  title: '类结构图'
});

// 渲染SVG
const renderer = new SVGRenderer();
const svgResult = await renderer.render(mermaidResult.mermaidCode);

// 美化SVG
const beautifier = new SVGBeautifier();
const beautifiedResult = await beautifier.beautify(svgResult.svg, {
  style: BeautificationStyle.Professional,
  optimizeLayout: true
});
```

## 🛠️ MCP工具

### `generate_mermaid_diagram`

从代码或文档生成Mermaid图表并可选择性地渲染为美化的SVG。

**参数:**
- `code` - 要分析的代码（与document二选一）
- `language` - 代码语言（typescript/javascript）
- `diagramType` - 图表类型（classDiagram/flowchart等）
- `beautificationStyle` - 美化风格（可选）
- `renderSVG` - 是否渲染为SVG（默认true）
- `options` - 高级选项

**示例:**
```json
{
  "code": "class Animal { private name: string; }",
  "language": "typescript",
  "diagramType": "classDiagram",
  "beautificationStyle": "professional",
  "options": {
    "generation": {
      "direction": "TB",
      "includeTitle": true,
      "title": "动物类图"
    }
  }
}
```

### `analyze_code`

分析代码结构并提取实体和关系。

### `render_svg`

将Mermaid代码渲染为SVG。

### `beautify_svg`

对SVG图表应用美化风格。

## 📊 支持的图表类型

- **类图** (`classDiagram`) - 显示类、接口、属性和方法
- **流程图** (`flowchart`) - 业务流程和决策流程
- **序列图** (`sequenceDiagram`) - 对象间的交互序列
- **状态图** (`stateDiagram`) - 状态转换图
- **实体关系图** (`erDiagram`) - 数据库关系图

## 🎨 美化风格

### 手绘风格 (Sketchy)
- 使用rough.js创建手绘效果
- 适合原型设计和非正式文档

### 彩色风格 (Colorful)
- 丰富的色彩搭配
- 渐变效果和阴影
- 适合演示和报告

### 极简风格 (Minimalist)
- 简洁的线条和布局
- 黑白配色
- 适合技术文档

### 专业风格 (Professional)
- 企业级配色方案
- 统一的字体和样式
- 适合商业文档

## 🧪 测试

```bash
# 运行所有测试
npm test

# 运行测试并观察变化
npm run test:watch

# 生成测试覆盖率报告
npm test -- --coverage
```

## 🔧 开发

```bash
# 开发模式（自动重新编译）
npm run dev

# 代码检查
npm run lint

# 自动修复代码风格
npm run lint:fix

# 格式化代码
npm run format

# 清理构建文件
npm run clean
```

## 📦 项目结构

```
mermaid-chart-mcp/
├── src/
│   ├── analyzers/          # 代码分析器
│   ├── generators/         # 图表生成器
│   ├── renderers/          # SVG渲染器
│   ├── beautifiers/        # SVG美化器
│   ├── mcp/               # MCP服务器实现
│   ├── types.ts           # 类型定义
│   └── index.ts           # 入口文件
├── __tests__/             # 测试文件
├── examples/              # 使用示例
├── package.json
├── tsconfig.json
├── jest.config.js
└── README.md
```

## 📝 API文档

### 类型定义

```typescript
// 支持的编程语言
enum SupportedLanguage {
  JavaScript = 'javascript',
  TypeScript = 'typescript',
  Python = 'python',
  Java = 'java'
}

// 图表类型
enum DiagramType {
  ClassDiagram = 'classDiagram',
  FlowChart = 'flowchart',
  SequenceDiagram = 'sequenceDiagram',
  StateDiagram = 'stateDiagram',
  EntityRelationship = 'erDiagram'
}

// 美化风格
enum BeautificationStyle {
  Sketchy = 'sketchy',
  Colorful = 'colorful',
  Minimalist = 'minimalist',
  Professional = 'professional'
}
```

### 核心接口

详细的API文档请参考源代码中的类型定义和JSDoc注释。

## 🤝 贡献

欢迎贡献代码！请遵循以下步骤：

1. Fork 这个项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🔗 相关链接

- [Model Context Protocol](https://github.com/modelcontextprotocol)
- [Mermaid](https://mermaid.js.org/)
- [Tree-sitter](https://tree-sitter.github.io/)
- [Rough.js](https://roughjs.com/)

## 📞 支持

如果您遇到问题或有建议，请：

- 提交 [Issue](../../issues)
- 查看 [文档](../../wiki)
- 联系维护者

---

**让代码可视化变得简单！** 🚀 