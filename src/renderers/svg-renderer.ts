/**
 * SVG 渲染器
 */

import { JSDOM } from 'jsdom';
import mermaid from 'mermaid';
import {
  RenderError,
  SVGRenderOptions,
  SVGRenderResult
} from '../types';

export class SVGRenderer {
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // 创建虚拟DOM环境
      const dom = new JSDOM('<!DOCTYPE html><html><body><div id="mermaid"></div></body></html>');
      global.window = dom.window as any;
      global.document = dom.window.document;
      global.HTMLElement = dom.window.HTMLElement;
      global.SVGElement = dom.window.SVGElement;

      // 初始化Mermaid
      mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'loose',
        fontFamily: 'Arial, sans-serif',
        fontSize: 14,
        flowchart: {
          useMaxWidth: true,
          htmlLabels: true
        },
        classDiagram: {
          useMaxWidth: true,
          htmlLabels: true
        }
      });

      this.isInitialized = true;
    } catch (error) {
      throw new RenderError(
        `SVG渲染器初始化失败: ${error instanceof Error ? error.message : String(error)}`,
        'RENDERER_INITIALIZATION_ERROR',
        { error }
      );
    }
  }

  async render(mermaidCode: string, options: SVGRenderOptions = {}): Promise<SVGRenderResult> {
    const startTime = Date.now();

    try {
      await this.initialize();

      // 验证Mermaid代码
      if (!mermaidCode || !mermaidCode.trim()) {
        throw new RenderError(
          'Mermaid代码不能为空',
          'EMPTY_MERMAID_CODE',
          { mermaidCode }
        );
      }

      // 设置主题
      if (options.theme) {
        mermaid.initialize({
          theme: options.theme
        });
      }

      // 生成唯一ID
      const diagramId = `mermaid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // 渲染SVG
      const { svg } = await mermaid.render(diagramId, mermaidCode);

      // 解析SVG以获取尺寸
      const dom = new JSDOM(svg);
      const svgElement = dom.window.document.querySelector('svg');
      
      if (!svgElement) {
        throw new RenderError(
          '渲染结果中未找到SVG元素',
          'NO_SVG_ELEMENT',
          { svg: svg.substring(0, 200) }
        );
      }

      // 获取SVG尺寸
      let width = 800;
      let height = 600;

      if (options.width) {
        width = options.width;
      } else {
        const widthAttr = svgElement.getAttribute('width');
        if (widthAttr) {
          width = parseInt(widthAttr, 10) || width;
        }
      }

      if (options.height) {
        height = options.height;
      } else {
        const heightAttr = svgElement.getAttribute('height');
        if (heightAttr) {
          height = parseInt(heightAttr, 10) || height;
        }
      }

      // 设置背景色
      let finalSvg = svg;
      if (options.backgroundColor && options.backgroundColor !== 'transparent') {
        finalSvg = this.addBackgroundColor(svg, options.backgroundColor);
      }

      // 确保SVG有正确的尺寸属性
      finalSvg = this.ensureSVGDimensions(finalSvg, width, height);

      return {
        svg: finalSvg,
        width,
        height,
        metadata: {
          renderTime: Date.now() - startTime,
          fileSize: finalSvg.length
        }
      };
    } catch (error) {
      if (error instanceof RenderError) {
        throw error;
      }
      
      throw new RenderError(
        `SVG渲染失败: ${error instanceof Error ? error.message : String(error)}`,
        'SVG_RENDER_ERROR',
        { error, mermaidCode: mermaidCode.substring(0, 200), options }
      );
    }
  }

  private addBackgroundColor(svg: string, backgroundColor: string): string {
    const dom = new JSDOM(svg);
    const svgElement = dom.window.document.querySelector('svg');
    
    if (!svgElement) {
      return svg;
    }

    // 创建背景矩形
    const rect = dom.window.document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('width', '100%');
    rect.setAttribute('height', '100%');
    rect.setAttribute('fill', backgroundColor);

    // 插入到SVG的开始位置
    svgElement.insertBefore(rect, svgElement.firstChild);

    return dom.window.document.documentElement.outerHTML;
  }

  private ensureSVGDimensions(svg: string, width: number, height: number): string {
    const dom = new JSDOM(svg);
    const svgElement = dom.window.document.querySelector('svg');
    
    if (!svgElement) {
      return svg;
    }

    // 设置尺寸属性
    svgElement.setAttribute('width', width.toString());
    svgElement.setAttribute('height', height.toString());
    
    // 如果没有viewBox，添加一个
    if (!svgElement.getAttribute('viewBox')) {
      svgElement.setAttribute('viewBox', `0 0 ${width} ${height}`);
    }

    return dom.window.document.documentElement.outerHTML;
  }

  async validateMermaidCode(mermaidCode: string): Promise<boolean> {
    try {
      await this.initialize();
      
      // 使用Mermaid的解析功能验证代码
      const parseResult = await mermaid.parse(mermaidCode);
      return true;
    } catch (error) {
      return false;
    }
  }

  getSupportedThemes(): string[] {
    return ['default', 'neutral', 'dark', 'forest', 'base'];
  }

  async renderWithMultipleThemes(
    mermaidCode: string, 
    themes: string[], 
    options: SVGRenderOptions = {}
  ): Promise<Record<string, SVGRenderResult>> {
    const results: Record<string, SVGRenderResult> = {};
    
    for (const theme of themes) {
      try {
        const themeOptions = { ...options, theme };
        results[theme] = await this.render(mermaidCode, themeOptions);
      } catch (error) {
        console.warn(`渲染主题 ${theme} 失败:`, error);
      }
    }
    
    return results;
  }
} 