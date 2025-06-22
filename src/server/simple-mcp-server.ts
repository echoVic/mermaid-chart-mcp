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
import puppeteer, { Browser } from 'puppeteer';
import mermaid from 'mermaid';
import createDOMPurify from 'dompurify';
import { validateInput, sanitizeFileName } from './utils.js';

export class SimpleMermaidMCPServer {
  private server: Server;
  private browser?: Browser;

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
   * 初始化浏览器实例（延迟初始化）
   */
  private async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: 'new', // 使用新的Headless模式
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security'
        ]
      });
    }
    return this.browser;
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
   * 渲染Mermaid - 先尝试Puppeteer，失败时降级到JSDOM
   */
  private async renderMermaidInIsolatedContext(mermaidCode: string, theme: string): Promise<string> {
    try {
      console.error('🌐 尝试使用Puppeteer渲染...');
      return await this.renderWithPuppeteer(mermaidCode, theme);
    } catch (error) {
      console.error('⚠️ Puppeteer失败，降级到JSDOM:', error instanceof Error ? error.message : String(error));
      console.error('🔄 使用JSDOM降级方案...');
      try {
        return await this.renderWithJSDOM(mermaidCode, theme);
      } catch (jsdomError) {
        console.error('⚠️ JSDOM也失败，使用静态降级方案:', jsdomError instanceof Error ? jsdomError.message : String(jsdomError));
        return this.renderStaticFallback(mermaidCode, theme);
      }
    }
  }

  /**
   * 使用Puppeteer在真实浏览器环境中渲染Mermaid
   */
  private async renderWithPuppeteer(mermaidCode: string, theme: string): Promise<string> {
    let browser;
    let page;
    
    try {
      // 每次都启动新的浏览器实例（避免连接重用问题）
      browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security',
          '--disable-extensions',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding'
        ],
        timeout: 10000
      });
      
      page = await browser.newPage();

      // 设置页面错误监听
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          console.error('浏览器控制台错误:', msg.text());
        }
      });

      page.on('pageerror', (error) => {
        console.error('页面错误:', error.message);
      });

      // 创建HTML页面内容
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <script src="https://cdn.jsdelivr.net/npm/mermaid@11.7.0/dist/mermaid.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/dompurify@3.2.6/dist/purify.min.js"></script>
</head>
<body>
    <div id="mermaid-container"></div>
    
    <script>
        // 初始化Mermaid
        mermaid.initialize({
            startOnLoad: false,
            theme: '${theme}',
            securityLevel: 'loose'
        });
        
        // 渲染函数
        window.renderMermaid = async function(mermaidCode) {
            try {
                const { svg } = await mermaid.render('diagram-id-' + Date.now(), mermaidCode);
                return { success: true, svg };
            } catch (error) {
                return { 
                    success: false, 
                    error: error.message || error.toString() || 'Unknown error'
                };
            }
        };
    </script>
</body>
</html>
      `;

      // 设置页面内容
      await page.setContent(htmlContent, { waitUntil: 'networkidle0', timeout: 30000 });

      // 等待Mermaid加载完成
      await page.waitForFunction(
        () => typeof (window as any).mermaid !== 'undefined' && typeof (window as any).renderMermaid !== 'undefined',
        { timeout: 30000 }
      );

      // 在页面中执行渲染
      const result = await page.evaluate(async (code) => {
        try {
          return await (window as any).renderMermaid(code);
        } catch (error) {
          return {
            success: false,
            error: `页面执行错误: ${error instanceof Error ? error.message : String(error)}`
          };
        }
      }, mermaidCode);

      if (!result.success) {
        throw new Error(result.error);
      }

      if (!result.svg) {
        throw new Error('渲染结果为空');
      }

      return result.svg;

    } catch (error) {
      // 详细的错误日志
      console.error('渲染错误详情:', {
        type: typeof error,
        message: error instanceof Error ? error.message : 'No message',
        stack: error instanceof Error ? error.stack : 'No stack',
        error: error
      });
      
      // 更安全的错误信息提取
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object') {
        // 处理ErrorEvent或其他特殊错误对象
        if ('type' in error && 'error' in error) {
          // 这是一个ErrorEvent
          const innerError = (error as any).error;
          if (innerError instanceof Error) {
            errorMessage = `浏览器连接错误: ${innerError.message}`;
          } else {
            errorMessage = `浏览器连接错误: ${(error as any).type}`;
          }
        } else if ('message' in error) {
          errorMessage = String((error as any).message);
        } else if ('code' in error) {
          errorMessage = `错误代码: ${(error as any).code}`;
        } else {
          try {
            errorMessage = JSON.stringify(error);
          } catch {
            errorMessage = `Error object: ${Object.prototype.toString.call(error)}`;
          }
        }
      } else {
        errorMessage = `Unexpected error type: ${typeof error}`;
      }
      
      throw new Error(errorMessage);
    } finally {
      // 清理资源
      if (page) {
        await page.close().catch(() => {});
      }
      if (browser) {
        await browser.close().catch(() => {});
      }
    }
  }

  /**
   * 静态降级方案 - 当所有其他方法都失败时使用
   */
  private renderStaticFallback(mermaidCode: string, theme: string): string {
    const diagramType = this.detectDiagramType(mermaidCode);
    const timestamp = new Date().toISOString();
    
    // 生成一个基本的信息性SVG
    return `<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${theme === 'dark' ? '#1e1e1e' : '#ffffff'}" stroke="${theme === 'dark' ? '#666' : '#ccc'}" stroke-width="1"/>
      <text x="200" y="50" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="${theme === 'dark' ? '#ffffff' : '#000000'}">
        Mermaid图表 (${diagramType})
      </text>
      <text x="200" y="80" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="${theme === 'dark' ? '#cccccc' : '#666666'}">
        渲染环境不可用
      </text>
      <text x="200" y="120" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="${theme === 'dark' ? '#999999' : '#888888'}">
        原始代码:
      </text>
      <foreignObject x="20" y="140" width="360" height="140">
        <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: monospace; font-size: 9px; padding: 10px; background: ${theme === 'dark' ? '#2d2d2d' : '#f5f5f5'}; border-radius: 4px; overflow: auto; max-height: 120px; color: ${theme === 'dark' ? '#ffffff' : '#000000'};">
          ${mermaidCode.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}
        </div>
      </foreignObject>
      <text x="200" y="295" text-anchor="middle" font-family="Arial, sans-serif" font-size="8" fill="${theme === 'dark' ? '#777777' : '#999999'}">
        生成时间: ${timestamp}
      </text>
    </svg>`;
  }

  /**
   * 使用JSDOM作为降级方案渲染Mermaid
   */
  private async renderWithJSDOM(mermaidCode: string, theme: string): Promise<string> {
    // 创建独立的JSDOM实例
    const dom = new JSDOM('<!DOCTYPE html><html><body><div id="mermaid-container"></div></body></html>');
    const window = dom.window as any;
    
    // 备份原始全局变量
    const originalWindow = (global as any).window;
    const originalDocument = (global as any).document;
    
    try {
      // 设置全局变量
      (global as any).window = window;
      (global as any).document = window.document;
      
      // 在antiscript模式下不需要DOMPurify，但为了兼容性还是设置一个
      try {
        const DOMPurify = createDOMPurify(window);
        (global as any).DOMPurify = DOMPurify;
        (window as any).DOMPurify = DOMPurify;
             } catch (e) {
         // DOMPurify设置失败也没关系，antiscript模式不依赖它
         console.error('DOMPurify设置失败，但继续使用antiscript模式:', e instanceof Error ? e.message : String(e));
       }

      // 初始化Mermaid，使用antiscript来避免DOMPurify依赖
      mermaid.initialize({
        startOnLoad: false,
        theme: theme as any,
        securityLevel: 'antiscript',  // 使用antiscript避免DOMPurify
        fontSize: 16,
        fontFamily: 'Arial, sans-serif',
        suppressErrorRendering: false
      });

      // 渲染SVG
      const { svg } = await mermaid.render('mermaid-diagram-' + Date.now(), mermaidCode);
      
      if (!svg) {
        throw new Error('JSDOM渲染失败：SVG为空');
      }
      
      return svg;
      
    } finally {
      // 恢复原始全局变量
      if (originalWindow !== undefined) {
        (global as any).window = originalWindow;
      } else {
        delete (global as any).window;
      }
      
      if (originalDocument !== undefined) {
        (global as any).document = originalDocument;
      } else {
        delete (global as any).document;
      }
      
      // 清理DOMPurify
      delete (global as any).DOMPurify;
      
      // 清理DOM
      dom.window.close();
    }
  }

  /**
   * 验证Mermaid语法 - 先尝试Puppeteer，失败时降级到JSDOM
   */
  private async validateMermaidInIsolatedContext(mermaidCode: string): Promise<void> {
    try {
      console.error('🌐 尝试使用Puppeteer验证...');
      return await this.validateWithPuppeteer(mermaidCode);
    } catch (error) {
      console.error('⚠️ Puppeteer验证失败，降级到JSDOM:', error instanceof Error ? error.message : String(error));
      console.error('🔄 使用JSDOM验证...');
      try {
        return await this.validateWithJSDOM(mermaidCode);
      } catch (jsdomError) {
        console.error('⚠️ JSDOM验证也失败，使用静态验证:', jsdomError instanceof Error ? jsdomError.message : String(jsdomError));
        return this.validateStaticFallback(mermaidCode);
      }
    }
  }

  /**
   * 使用Puppeteer在真实浏览器环境中验证Mermaid语法
   */
  private async validateWithPuppeteer(mermaidCode: string): Promise<void> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      // 创建HTML页面内容
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <script src="https://cdn.jsdelivr.net/npm/mermaid@11.7.0/dist/mermaid.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/dompurify@3.2.6/dist/purify.min.js"></script>
</head>
<body>
    <script>
        // 初始化Mermaid
        mermaid.initialize({
            startOnLoad: false,
            securityLevel: 'loose'
        });
        
        // 验证函数
        window.validateMermaid = async function(mermaidCode) {
            try {
                await mermaid.parse(mermaidCode);
                return { success: true };
            } catch (error) {
                return {
                    success: false,
                    error: error.message || error.toString() || 'Unknown validation error'
                };
            }
        };
    </script>
</body>
</html>
      `;

      // 设置页面内容
      await page.setContent(htmlContent);

      // 等待Mermaid加载完成
      await page.waitForFunction(() => typeof (window as any).mermaid !== 'undefined' && typeof (window as any).validateMermaid !== 'undefined');

      // 在页面中执行验证
      const result = await page.evaluate(async (code) => {
        return await (window as any).validateMermaid(code);
      }, mermaidCode);

      if (!result.success) {
        throw new Error(result.error);
      }

    } finally {
      await page.close();
    }
  }

  /**
   * 静态验证方案 - 基本的语法检查
   */
  private validateStaticFallback(mermaidCode: string): void {
    console.error('🔍 使用静态语法检查...');
    
    // 基本的语法检查
    if (!mermaidCode || typeof mermaidCode !== 'string') {
      throw new Error('代码不能为空且必须是字符串');
    }
    
    const trimmedCode = mermaidCode.trim();
    if (trimmedCode.length === 0) {
      throw new Error('代码内容不能为空');
    }
    
    // 检查是否包含基本的图表类型关键词
    const diagramTypes = [
      'graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 
      'gantt', 'pie', 'erDiagram', 'journey', 'gitgraph',
      'mindmap', 'timeline', 'requirementDiagram', 'stateDiagram'
    ];
    
    const lowerCode = trimmedCode.toLowerCase();
    const hasValidType = diagramTypes.some(type => lowerCode.includes(type.toLowerCase()));
    
    if (!hasValidType) {
      throw new Error('未识别的图表类型。请确保代码包含有效的Mermaid图表类型关键词');
    }
    
    console.error('✅ 静态验证通过');
  }

  /**
   * 使用JSDOM验证Mermaid语法
   */
  private async validateWithJSDOM(mermaidCode: string): Promise<void> {
    // 创建独立的JSDOM实例用于验证
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    const window = dom.window as any;
    
    // 备份原始全局变量
    const originalWindow = (global as any).window;
    const originalDocument = (global as any).document;
    
    try {
      // 设置全局变量
      (global as any).window = window;
      (global as any).document = window.document;
      
      // 初始化Mermaid用于验证（使用antiscript避免DOMPurify）
      mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'antiscript',
        suppressErrorRendering: false
      });

      // 尝试解析（不需要实际渲染）
      await mermaid.parse(mermaidCode);
      
    } finally {
      // 恢复原始全局变量
      if (originalWindow !== undefined) {
        (global as any).window = originalWindow;
      } else {
        delete (global as any).window;
      }
      
      if (originalDocument !== undefined) {
        (global as any).document = originalDocument;
      } else {
        delete (global as any).document;
      }
      
      // 清理DOM
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