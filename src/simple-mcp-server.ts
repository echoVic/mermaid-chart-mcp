#!/usr/bin/env node

/**
 * 简化版Mermaid Chart MCP服务器
 * 核心功能：接收Mermaid代码 → 渲染SVG → 创建临时文件
 * 
 * 预期工作流程：
 * 1. 用户在Cursor中圈选代码
 * 2. Cursor大模型生成Mermaid代码
 * 3. MCP接收Mermaid代码并渲染成SVG
 * 4. 返回SVG文件路径或内容
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

export class SimpleMermaidMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'simple-mermaid-chart-mcp',
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
                  description: 'Mermaid图表代码（由Cursor大模型生成）'
                },
                title: {
                  type: 'string',
                  description: '图表标题（可选）',
                  default: 'Mermaid图表'
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
                  description: 'Mermaid图表代码'
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

    try {
      // 创建虚拟DOM环境
      const dom = new JSDOM('<!DOCTYPE html><html><body><div id="mermaid-container"></div></body></html>');
      const window = dom.window as any;
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

    try {
      // 创建虚拟DOM环境
      const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
      const window = dom.window as any;
      global.window = window;
      global.document = window.document;

      // 初始化Mermaid
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'loose'
      });

      // 尝试解析
      await mermaid.parse(mermaidCode);

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
   * 为SVG添加标题
   */
  private addTitleToSVG(svg: string, title: string): string {
    // 在SVG中添加标题元素
    const titleElement = `<title>${title}</title>`;
    return svg.replace('<svg', `<svg${titleElement ? '\n  ' + titleElement : ''}`);
  }

  /**
   * 检测图表类型
   */
  private detectDiagramType(mermaidCode: string): string {
    const code = mermaidCode.toLowerCase().trim();
    
    if (code.includes('graph') || code.includes('flowchart')) return '流程图';
    if (code.includes('sequencediagram') || code.includes('sequence')) return '序列图';
    if (code.includes('classdiagram') || code.includes('class')) return '类图';
    if (code.includes('gantt')) return '甘特图';
    if (code.includes('pie')) return '饼图';
    if (code.includes('erdiagram') || code.includes('er')) return 'ER图';
    if (code.includes('journey')) return '用户旅程图';
    if (code.includes('gitgraph')) return 'Git图';
    if (code.includes('mindmap')) return '思维导图';
    if (code.includes('timeline')) return '时间线';
    
    return '未知类型';
  }

  /**
   * 创建临时SVG文件
   */
  private async createTempSVGFile(svg: string, title: string): Promise<string> {
    const tempDir = os.tmpdir();
    const fileName = `mermaid_${title.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.svg`;
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
    console.error('🚀 简化版Mermaid Chart MCP服务器已启动');
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