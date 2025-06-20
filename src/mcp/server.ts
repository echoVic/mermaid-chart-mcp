/**
 * MCP 服务器实现
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool
} from '@modelcontextprotocol/sdk/types.js';

import { TypeScriptAnalyzer } from '../analyzers/typescript-analyzer.js';
import { SVGBeautifier } from '../beautifiers/svg-beautifier.js';
import { ClassDiagramGenerator } from '../generators/class-diagram-generator.js';
import { SVGRenderer } from '../renderers/svg-renderer.js';

import {
  BeautificationStyle,
  CodeAnalysisOptionsSchema,
  DiagramType,
  GenerateDiagramParams,
  MermaidGenerationOptionsSchema,
  SupportedLanguage,
  SVGBeautificationOptionsSchema,
  SVGRenderOptionsSchema
} from '../types.js';

export class MermaidChartMCPServer {
  private server: Server;
  private tsAnalyzer: TypeScriptAnalyzer;
  private classDiagramGenerator: ClassDiagramGenerator;
  private svgRenderer: SVGRenderer;
  private svgBeautifier: SVGBeautifier;

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

    this.tsAnalyzer = new TypeScriptAnalyzer();
    this.classDiagramGenerator = new ClassDiagramGenerator();
    this.svgRenderer = new SVGRenderer();
    this.svgBeautifier = new SVGBeautifier();

    this.setupToolHandlers();
  }

  private setupToolHandlers(): void {
    // 注册工具列表处理器
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this.getAvailableTools()
      };
    });

    // 注册工具调用处理器
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'generate_mermaid_diagram':
            return await this.handleGenerateDiagram(args as GenerateDiagramParams);
          
          case 'analyze_code':
            return await this.handleAnalyzeCode(args as any);
          
          case 'render_svg':
            return await this.handleRenderSVG(args as any);
          
          case 'beautify_svg':
            return await this.handleBeautifySVG(args as any);
          
          default:
            throw new Error(`未知的工具: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `错误: ${error instanceof Error ? error.message : String(error)}`
            }
          ],
          isError: true
        };
      }
    });
  }

  private getAvailableTools(): Tool[] {
    return [
      {
        name: 'generate_mermaid_diagram',
        description: '从代码或文档生成Mermaid图表并可选择性地渲染为美化的SVG',
        inputSchema: {
          type: 'object',
          properties: {
            code: {
              type: 'string',
              description: '要分析的代码（与document二选一）'
            },
            document: {
              type: 'string',
              description: '要分析的文档内容（与code二选一）'
            },
            language: {
              type: 'string',
              enum: Object.values(SupportedLanguage),
              description: '代码语言'
            },
            diagramType: {
              type: 'string',
              enum: Object.values(DiagramType),
              description: '图表类型'
            },
            beautificationStyle: {
              type: 'string',
              enum: Object.values(BeautificationStyle),
              description: '美化风格（可选）'
            },
            renderSVG: {
              type: 'boolean',
              description: '是否渲染为SVG',
              default: true
            },
            options: {
              type: 'object',
              description: '高级选项',
              properties: {
                analysis: {
                  type: 'object',
                  description: '分析选项'
                },
                generation: {
                  type: 'object',
                  description: '生成选项'
                },
                render: {
                  type: 'object',
                  description: '渲染选项'
                },
                beautification: {
                  type: 'object',
                  description: '美化选项'
                }
              }
            }
          },
          required: ['diagramType'],
          oneOf: [
            { required: ['code', 'language'] },
            { required: ['document'] }
          ]
        }
      },
      {
        name: 'analyze_code',
        description: '分析代码结构',
        inputSchema: {
          type: 'object',
          properties: {
            code: {
              type: 'string',
              description: '要分析的代码'
            },
            language: {
              type: 'string',
              enum: Object.values(SupportedLanguage),
              description: '代码语言'
            },
            options: {
              type: 'object',
              description: '分析选项'
            }
          },
          required: ['code', 'language']
        }
      },
      {
        name: 'render_svg',
        description: '将Mermaid代码渲染为SVG',
        inputSchema: {
          type: 'object',
          properties: {
            mermaidCode: {
              type: 'string',
              description: 'Mermaid图表代码'
            },
            options: {
              type: 'object',
              description: '渲染选项'
            }
          },
          required: ['mermaidCode']
        }
      },
      {
        name: 'beautify_svg',
        description: '美化SVG图表',
        inputSchema: {
          type: 'object',
          properties: {
            svg: {
              type: 'string',
              description: 'SVG内容'
            },
            style: {
              type: 'string',
              enum: Object.values(BeautificationStyle),
              description: '美化风格'
            },
            options: {
              type: 'object',
              description: '美化选项'
            }
          },
          required: ['svg', 'style']
        }
      }
    ];
  }

  private async handleGenerateDiagram(params: GenerateDiagramParams) {
    try {
      let analysisResult;
      
      // 分析输入
      if (params.code && params.language) {
        const analysisOptions = CodeAnalysisOptionsSchema.parse({
          language: params.language,
          ...params.options?.analysis
        });
        
        analysisResult = await this.tsAnalyzer.analyze(params.code, analysisOptions);
      } else {
        throw new Error('目前只支持代码分析，文档分析功能开发中');
      }

      // 生成Mermaid图表
      const generationOptions = MermaidGenerationOptionsSchema.parse({
        diagramType: params.diagramType,
        ...params.options?.generation
      });

      let mermaidResult;
      if (params.diagramType === DiagramType.ClassDiagram) {
        mermaidResult = await this.classDiagramGenerator.generate(analysisResult, generationOptions);
      } else {
        throw new Error(`暂不支持图表类型: ${params.diagramType}`);
      }

      const result: any = {
        mermaidCode: mermaidResult.mermaidCode,
        metadata: {
          analysis: analysisResult.metadata,
          generation: mermaidResult.metadata
        }
      };

      // 渲染SVG（如果需要）
      if (params.renderSVG !== false) {
        const renderOptions = SVGRenderOptionsSchema.parse(params.options?.render || {});
        const svgResult = await this.svgRenderer.render(mermaidResult.mermaidCode, renderOptions);
        
        result.svg = svgResult.svg;
        result.metadata.render = svgResult.metadata;

        // 美化SVG（如果指定了风格）
        if (params.beautificationStyle) {
          const beautificationOptions = SVGBeautificationOptionsSchema.parse({
            style: params.beautificationStyle,
            ...params.options?.beautification
          });
          
          const beautifiedResult = await this.svgBeautifier.beautify(svgResult.svg, beautificationOptions);
          result.beautifiedSvg = beautifiedResult.svg;
          result.metadata.beautification = beautifiedResult.metadata;
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: `成功生成 ${params.diagramType} 图表！\n\n**Mermaid代码:**\n\`\`\`mermaid\n${result.mermaidCode}\n\`\`\`\n\n**分析统计:**\n- 实体数量: ${result.metadata.analysis.totalLines} 行代码\n- 图表节点: ${result.metadata.generation.nodeCount}\n- 图表边: ${result.metadata.generation.edgeCount}\n- 生成时间: ${result.metadata.generation.generationTime}ms`
          }
        ]
      };
    } catch (error) {
      throw error;
    }
  }

  private async handleAnalyzeCode(params: any) {
    const analysisOptions = CodeAnalysisOptionsSchema.parse({
      language: params.language,
      ...params.options
    });
    
    const result = await this.tsAnalyzer.analyze(params.code, analysisOptions);
    
    return {
      content: [
        {
          type: 'text',
          text: `代码分析完成！\n\n**统计信息:**\n- 总行数: ${result.metadata.totalLines}\n- 实体数量: ${result.entities.length}\n- 关系数量: ${result.relationships.length}\n- 分析时间: ${result.metadata.analysisTime}ms\n\n**发现的实体:**\n${result.entities.map(e => `- ${e.type}: ${e.name}`).join('\n')}`
        }
      ]
    };
  }

  private async handleRenderSVG(params: any) {
    const renderOptions = SVGRenderOptionsSchema.parse(params.options || {});
    const result = await this.svgRenderer.render(params.mermaidCode, renderOptions);
    
    return {
      content: [
        {
          type: 'text',
          text: `SVG渲染完成！\n\n**统计信息:**\n- 尺寸: ${result.width}x${result.height}\n- 文件大小: ${result.metadata.fileSize} 字节\n- 渲染时间: ${result.metadata.renderTime}ms`
        }
      ]
    };
  }

  private async handleBeautifySVG(params: any) {
    const beautificationOptions = SVGBeautificationOptionsSchema.parse({
      style: params.style,
      ...params.options
    });
    
    const result = await this.svgBeautifier.beautify(params.svg, beautificationOptions);
    
    return {
      content: [
        {
          type: 'text',
          text: `SVG美化完成！\n\n**统计信息:**\n- 美化风格: ${result.style}\n- 原始大小: ${result.metadata.originalSize} 字节\n- 优化后大小: ${result.metadata.optimizedSize} 字节\n- 美化时间: ${result.metadata.beautificationTime}ms`
        }
      ]
    };
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Mermaid Chart MCP Server 已启动');
  }
} 