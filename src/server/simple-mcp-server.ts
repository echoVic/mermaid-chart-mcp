/**
 * Mermaid Chart MCP服务器
 * 核心功能：接收Mermaid代码 → 渲染SVG → 创建临时文件
 * 
 * 预期工作流程：
 * 1. AI助手或应用生成Mermaid代码
 * 2. MCP接收Mermaid代码并渲染成SVG
 * 3. 返回SVG文件路径或内容
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { JSDOM } from 'jsdom';
import mermaid from 'mermaid';
import { validateInput, sanitizeFileName } from './utils.js';

export class SimpleMermaidMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'mermaid-chart-mcp',
        version: '1.0.0'
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    this.setupToolHandlers();
  }

  private setupToolHandlers(): void {
    // 注册工具列表
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'render_mermaid_to_svg',
            description: '将Mermaid代码渲染为SVG图表，创建临时文件并返回路径',
            inputSchema: {
              type: 'object',
              properties: {
                mermaidCode: {
                  type: 'string',
                  description: 'Mermaid图表代码（由Cursor大模型生成）',
                  maxLength: 50000
                },
                title: {
                  type: 'string',
                  description: '图表标题（可选）',
                  default: 'Mermaid图表',
                  maxLength: 100
                },
                theme: {
                  type: 'string',
                  enum: ['default', 'dark', 'forest', 'neutral'],
                  description: '图表主题',
                  default: 'default'
                },
                createTempFile: {
                  type: 'boolean',
                  description: '是否创建临时SVG文件',
                  default: true
                }
              },
              required: ['mermaidCode']
            }
          },
          {
            name: 'validate_mermaid_syntax',
            description: '验证Mermaid代码语法是否正确',
            inputSchema: {
              type: 'object',
              properties: {
                mermaidCode: {
                  type: 'string',
                  description: 'Mermaid图表代码',
                  maxLength: 50000
                }
              },
              required: ['mermaidCode']
            }
          }
        ]
      };
    });

    // 注册工具调用处理器
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'render_mermaid_to_svg':
            return await this.handleRenderMermaidToSVG(args as any);
          case 'validate_mermaid_syntax':
            return await this.handleValidateMermaidSyntax(args as any);
          default:
            throw new Error(`未知的工具: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ 错误: ${error instanceof Error ? error.message : String(error)}`
            }
          ],
          isError: true
        };
      }
    });
  }

  /**
   * 渲染Mermaid代码为SVG
   */
  private async handleRenderMermaidToSVG(params: {
    mermaidCode: string;
    title?: string;
    theme?: string;
    createTempFile?: boolean;
  }) {
    const { mermaidCode, title = 'Mermaid图表', theme = 'default', createTempFile = true } = params;

    // 输入校验
    const validationError = validateInput({ mermaidCode, title, theme });
    if (validationError) {
      throw new Error(`输入校验失败: ${validationError}`);
    }

    try {
      // 渲染SVG，使用隔离的JSDOM实例
      const svg = await this.renderMermaidInIsolatedContext(mermaidCode, theme);
      
      // 添加标题到SVG
      const svgWithTitle = this.addTitleToSVG(svg, title);

      let result = {
        content: [
          {
            type: 'text',
            text: `✅ Mermaid图表渲染成功！\n📊 图表类型: ${this.detectDiagramType(mermaidCode)}\n🎨 主题: ${theme}`
          }
        ]
      };

      // 如果需要创建临时文件
      if (createTempFile) {
        const tempFilePath = await this.createTempSVGFile(svgWithTitle, title);
        result.content.push({
          type: 'text',
          text: `📁 临时SVG文件已创建: ${tempFilePath}`
        });
      }

      // 返回SVG内容
      result.content.push({
        type: 'text',
        text: `\n📄 SVG内容:\n\`\`\`svg\n${svgWithTitle}\n\`\`\``
      });

      return result;

    } catch (error) {
      throw new Error(`SVG渲染失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 验证Mermaid语法
   */
  private async handleValidateMermaidSyntax(params: { mermaidCode: string }) {
    const { mermaidCode } = params;

    // 输入校验
    const validationError = validateInput({ mermaidCode });
    if (validationError) {
      throw new Error(`输入校验失败: ${validationError}`);
    }

    try {
      // 在隔离环境中验证语法
      await this.validateMermaidInIsolatedContext(mermaidCode);

      return {
        content: [
          {
            type: 'text',
            text: `✅ Mermaid语法验证通过！\n📊 图表类型: ${this.detectDiagramType(mermaidCode)}`
          }
        ]
      };

    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Mermaid语法错误: ${error instanceof Error ? error.message : String(error)}`
          }
        ],
        isError: true
      };
    }
  }

  /**
   * 在隔离的上下文中渲染Mermaid
   * 解决全局污染问题
   */
  private async renderMermaidInIsolatedContext(mermaidCode: string, theme: string): Promise<string> {
    // 创建独立的JSDOM实例
    const dom = new JSDOM('<!DOCTYPE html><html><body><div id="mermaid-container"></div></body></html>');
    const window = dom.window as any;
    
    // 创建临时的全局变量覆盖，而不是直接修改global
    const originalWindow = global.window;
    const originalDocument = global.document;
    
    try {
      // 临时设置全局变量
      global.window = window;
      global.document = window.document;

      // 初始化Mermaid
      mermaid.initialize({
        startOnLoad: false,
        theme: theme as any,
        securityLevel: 'loose',
        fontSize: 16,
        fontFamily: 'Arial, sans-serif'
      });

      // 渲染SVG
      const { svg } = await mermaid.render('mermaid-diagram', mermaidCode);
      return svg;
      
    } finally {
      // 恢复原始的全局变量
      if (originalWindow !== undefined) {
        global.window = originalWindow;
      } else {
        delete (global as any).window;
      }
      
      if (originalDocument !== undefined) {
        global.document = originalDocument;
      } else {
        delete (global as any).document;
      }
      
      // 清理DOM
      dom.window.close();
    }
  }

  /**
   * 在隔离的上下文中验证Mermaid语法
   */
  private async validateMermaidInIsolatedContext(mermaidCode: string): Promise<void> {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    const window = dom.window as any;
    
    const originalWindow = global.window;
    const originalDocument = global.document;
    
    try {
      global.window = window;
      global.document = window.document;

      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'loose'
      });

      await mermaid.parse(mermaidCode);
      
    } finally {
      if (originalWindow !== undefined) {
        global.window = originalWindow;
      } else {
        delete (global as any).window;
      }
      
      if (originalDocument !== undefined) {
        global.document = originalDocument;
      } else {
        delete (global as any).document;
      }
      
      dom.window.close();
    }
  }

  /**
   * 为SVG添加标题（使用DOM解析，更稳健）
   */
  private addTitleToSVG(svg: string, title: string): string {
    try {
      // 使用DOM解析器插入title元素
      const dom = new JSDOM(`<!DOCTYPE html><html><body>${svg}</body></html>`);
      const svgElement = dom.window.document.querySelector('svg');
      
      if (svgElement) {
        // 创建title元素
        const titleElement = dom.window.document.createElement('title');
        titleElement.textContent = title;
        
        // 将title作为第一个子元素插入
        svgElement.insertBefore(titleElement, svgElement.firstChild);
        
        return svgElement.outerHTML;
      }
      
      // 回退到简单字符串替换
      return svg.replace('<svg', `<svg>\n  <title>${title}</title>`);
      
    } catch (error) {
      // 回退到简单字符串替换
      const titleElement = `<title>${title}</title>`;
      return svg.replace('<svg', `<svg>\n  ${titleElement}`);
    }
  }

  /**
   * 检测图表类型（更精细的判断）
   */
  private detectDiagramType(mermaidCode: string): string {
    const code = mermaidCode.toLowerCase().trim();
    
    // 使用更精确的正则匹配
    const patterns = [
      { pattern: /^(graph|flowchart)\s+(TD|TB|BT|RL|LR)/, type: '流程图' },
      { pattern: /^sequencediagram/m, type: '序列图' },
      { pattern: /^classDiagram/m, type: '类图' },
      { pattern: /^gantt/m, type: '甘特图' },
      { pattern: /^pie(\s+title)?/m, type: '饼图' },
      { pattern: /^erdiagram/m, type: 'ER图' },
      { pattern: /^journey/m, type: '用户旅程图' },
      { pattern: /^gitgraph/m, type: 'Git图' },
      { pattern: /^mindmap/m, type: '思维导图' },
      { pattern: /^timeline/m, type: '时间线' },
      { pattern: /^requirementdiagram/m, type: '需求图' },
      { pattern: /^statediagram(-v2)?/m, type: '状态图' }
    ];

    for (const { pattern, type } of patterns) {
      if (pattern.test(code)) {
        return type;
      }
    }
    
    return '未知类型';
  }

  /**
   * 创建临时SVG文件
   */
  private async createTempSVGFile(svg: string, title: string): Promise<string> {
    const tempDir = os.tmpdir();
    const sanitizedTitle = sanitizeFileName(title);
    const fileName = `mermaid_${sanitizedTitle}_${Date.now()}.svg`;
    const filePath = path.join(tempDir, fileName);
    
    await fs.writeFile(filePath, svg, 'utf8');
    
    return filePath;
  }

  /**
   * 获取底层服务器实例（用于SSE模式）
   */
  getServer(): Server {
    return this.server;
  }

  /**
   * 启动服务器
   */
  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('🚀 Mermaid Chart MCP服务器已启动');
  }
}

// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new SimpleMermaidMCPServer();
  server.run().catch((error) => {
    console.error('❌ 服务器启动失败:', error);
    process.exit(1);
  });
} 