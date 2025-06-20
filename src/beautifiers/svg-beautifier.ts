/**
 * SVG 美化器
 */

import { JSDOM } from 'jsdom';
import rough from 'rough.js/bundled/rough.cjs';
import {
  BeautificationStyle,
  RenderError,
  SVGBeautificationOptions,
  SVGBeautificationResult
} from '../types';

export class SVGBeautifier {
  async beautify(svg: string, options: SVGBeautificationOptions): Promise<SVGBeautificationResult> {
    const startTime = Date.now();
    const originalSize = svg.length;

    try {
      let beautifiedSvg: string;

      switch (options.style) {
        case BeautificationStyle.Sketchy:
          beautifiedSvg = await this.applySketchyStyle(svg, options);
          break;
        case BeautificationStyle.Colorful:
          beautifiedSvg = await this.applyColorfulStyle(svg, options);
          break;
        case BeautificationStyle.Minimalist:
          beautifiedSvg = await this.applyMinimalistStyle(svg, options);
          break;
        case BeautificationStyle.Professional:
          beautifiedSvg = await this.applyProfessionalStyle(svg, options);
          break;
        default:
          throw new RenderError(
            `不支持的美化风格: ${options.style}`,
            'UNSUPPORTED_BEAUTIFICATION_STYLE',
            { style: options.style }
          );
      }

      // 优化布局
      if (options.optimizeLayout) {
        beautifiedSvg = this.optimizeLayout(beautifiedSvg);
      }

      return {
        svg: beautifiedSvg,
        style: options.style,
        metadata: {
          beautificationTime: Date.now() - startTime,
          originalSize,
          optimizedSize: beautifiedSvg.length
        }
      };
    } catch (error) {
      if (error instanceof RenderError) {
        throw error;
      }
      
      throw new RenderError(
        `SVG美化失败: ${error instanceof Error ? error.message : String(error)}`,
        'SVG_BEAUTIFICATION_ERROR',
        { error, svg: svg.substring(0, 200), options }
      );
    }
  }

  private async applySketchyStyle(svg: string, options: SVGBeautificationOptions): Promise<string> {
    const dom = new JSDOM(svg);
    const document = dom.window.document;
    const svgElement = document.querySelector('svg');

    if (!svgElement) {
      throw new RenderError('SVG元素未找到', 'NO_SVG_ELEMENT', { svg: svg.substring(0, 100) });
    }

    // 创建rough.js实例
    const rc = rough.svg(svgElement);
    const roughness = options.roughness || 1;

    // 替换矩形
    const rects = svgElement.querySelectorAll('rect');
    rects.forEach(rect => {
      const x = parseFloat(rect.getAttribute('x') || '0');
      const y = parseFloat(rect.getAttribute('y') || '0');
      const width = parseFloat(rect.getAttribute('width') || '0');
      const height = parseFloat(rect.getAttribute('height') || '0');
      const fill = rect.getAttribute('fill') || 'none';
      const stroke = rect.getAttribute('stroke') || 'black';

      const roughRect = rc.rectangle(x, y, width, height, {
        roughness,
        fill,
        stroke,
        strokeWidth: 2,
        fillStyle: 'hachure'
      });

      rect.parentNode?.replaceChild(roughRect, rect);
    });

    // 替换圆形
    const circles = svgElement.querySelectorAll('circle');
    circles.forEach(circle => {
      const cx = parseFloat(circle.getAttribute('cx') || '0');
      const cy = parseFloat(circle.getAttribute('cy') || '0');
      const r = parseFloat(circle.getAttribute('r') || '0');
      const fill = circle.getAttribute('fill') || 'none';
      const stroke = circle.getAttribute('stroke') || 'black';

      const roughCircle = rc.circle(cx, cy, r * 2, {
        roughness,
        fill,
        stroke,
        strokeWidth: 2,
        fillStyle: 'hachure'
      });

      circle.parentNode?.replaceChild(roughCircle, circle);
    });

    // 替换路径（更复杂的形状）
    const paths = svgElement.querySelectorAll('path');
    paths.forEach(path => {
      const d = path.getAttribute('d');
      if (d) {
        path.setAttribute('stroke-width', '2');
        path.setAttribute('filter', 'url(#rough-filter)');
      }
    });

    // 添加手绘滤镜
    this.addSketchyFilter(svgElement);

    return dom.serialize();
  }

  private async applyColorfulStyle(svg: string, options: SVGBeautificationOptions): Promise<string> {
    const dom = new JSDOM(svg);
    const document = dom.window.document;
    const svgElement = document.querySelector('svg');

    if (!svgElement) {
      throw new RenderError('SVG元素未找到', 'NO_SVG_ELEMENT', { svg: svg.substring(0, 100) });
    }

    // 默认彩色调色板
    const defaultPalette = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#FFB6C1', '#87CEEB', '#F0E68C'
    ];

    const colorPalette = options.colorPalette || defaultPalette;
    let colorIndex = 0;

    // 为形状添加渐变和颜色
    const shapes = svgElement.querySelectorAll('rect, circle, ellipse, polygon, path');
    shapes.forEach(shape => {
      const currentFill = shape.getAttribute('fill');
      
      if (!currentFill || currentFill === 'none' || currentFill === 'transparent') {
        const color = colorPalette[colorIndex % colorPalette.length];
        shape.setAttribute('fill', color);
        shape.setAttribute('fill-opacity', '0.8');
        colorIndex++;
      }

      // 添加阴影效果
      shape.setAttribute('filter', 'url(#colorful-shadow)');
    });

    // 添加渐变定义
    this.addColorfulGradients(svgElement, colorPalette);
    
    // 添加阴影滤镜
    this.addShadowFilter(svgElement);

    return dom.serialize();
  }

  private async applyMinimalistStyle(svg: string, options: SVGBeautificationOptions): Promise<string> {
    const dom = new JSDOM(svg);
    const document = dom.window.document;
    const svgElement = document.querySelector('svg');

    if (!svgElement) {
      throw new RenderError('SVG元素未找到', 'NO_SVG_ELEMENT', { svg: svg.substring(0, 100) });
    }

    // 极简风格：减少颜色，使用细线条
    const shapes = svgElement.querySelectorAll('rect, circle, ellipse, polygon, path');
    shapes.forEach(shape => {
      shape.setAttribute('fill', 'none');
      shape.setAttribute('stroke', '#333333');
      shape.setAttribute('stroke-width', '1');
      shape.setAttribute('stroke-linecap', 'round');
      shape.setAttribute('stroke-linejoin', 'round');
    });

    // 简化文本样式
    const texts = svgElement.querySelectorAll('text');
    texts.forEach(text => {
      text.setAttribute('font-family', 'Arial, sans-serif');
      text.setAttribute('font-size', '12');
      text.setAttribute('fill', '#333333');
      text.setAttribute('font-weight', 'normal');
    });

    // 移除不必要的装饰
    const decorativeElements = svgElement.querySelectorAll('[stroke-dasharray], [opacity]');
    decorativeElements.forEach(element => {
      element.removeAttribute('stroke-dasharray');
      element.removeAttribute('opacity');
    });

    return dom.serialize();
  }

  private async applyProfessionalStyle(svg: string, options: SVGBeautificationOptions): Promise<string> {
    const dom = new JSDOM(svg);
    const document = dom.window.document;
    const svgElement = document.querySelector('svg');

    if (!svgElement) {
      throw new RenderError('SVG元素未找到', 'NO_SVG_ELEMENT', { svg: svg.substring(0, 100) });
    }

    // 专业风格：统一的配色方案和字体
    const professionalColors = {
      primary: '#2C3E50',
      secondary: '#3498DB',
      accent: '#E74C3C',
      background: '#ECF0F1',
      text: '#2C3E50'
    };

    // 设置专业的形状样式
    const shapes = svgElement.querySelectorAll('rect, circle, ellipse, polygon');
    shapes.forEach((shape, index) => {
      const isHeader = shape.classList.contains('header') || index === 0;
      
      shape.setAttribute('fill', isHeader ? professionalColors.primary : professionalColors.background);
      shape.setAttribute('stroke', professionalColors.primary);
      shape.setAttribute('stroke-width', '2');
      shape.setAttribute('rx', '4'); // 圆角
    });

    // 设置专业的文本样式
    const texts = svgElement.querySelectorAll('text');
    texts.forEach(text => {
      text.setAttribute('font-family', 'Segoe UI, Arial, sans-serif');
      text.setAttribute('font-size', '14');
      text.setAttribute('fill', professionalColors.text);
      text.setAttribute('font-weight', '400');
    });

    // 添加专业的连接线样式
    const paths = svgElement.querySelectorAll('path');
    paths.forEach(path => {
      path.setAttribute('stroke', professionalColors.secondary);
      path.setAttribute('stroke-width', '2');
      path.setAttribute('marker-end', 'url(#professional-arrow)');
    });

    // 添加专业箭头标记
    this.addProfessionalMarkers(svgElement, professionalColors.secondary);

    return dom.serialize();
  }

  private addSketchyFilter(svgElement: SVGElement): void {
    const defs = svgElement.querySelector('defs') || svgElement.ownerDocument!.createElementNS('http://www.w3.org/2000/svg', 'defs');
    if (!svgElement.querySelector('defs')) {
      svgElement.insertBefore(defs, svgElement.firstChild);
    }

    const filter = svgElement.ownerDocument!.createElementNS('http://www.w3.org/2000/svg', 'filter');
    filter.setAttribute('id', 'rough-filter');
    
    const turbulence = svgElement.ownerDocument!.createElementNS('http://www.w3.org/2000/svg', 'feTurbulence');
    turbulence.setAttribute('baseFrequency', '0.04');
    turbulence.setAttribute('numOctaves', '3');
    turbulence.setAttribute('result', 'noise');

    const displacementMap = svgElement.ownerDocument!.createElementNS('http://www.w3.org/2000/svg', 'feDisplacementMap');
    displacementMap.setAttribute('in', 'SourceGraphic');
    displacementMap.setAttribute('in2', 'noise');
    displacementMap.setAttribute('scale', '2');

    filter.appendChild(turbulence);
    filter.appendChild(displacementMap);
    defs.appendChild(filter);
  }

  private addColorfulGradients(svgElement: SVGElement, colorPalette: string[]): void {
    const defs = svgElement.querySelector('defs') || svgElement.ownerDocument!.createElementNS('http://www.w3.org/2000/svg', 'defs');
    if (!svgElement.querySelector('defs')) {
      svgElement.insertBefore(defs, svgElement.firstChild);
    }

    colorPalette.forEach((color, index) => {
      const gradient = svgElement.ownerDocument!.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
      gradient.setAttribute('id', `gradient-${index}`);
      gradient.setAttribute('x1', '0%');
      gradient.setAttribute('y1', '0%');
      gradient.setAttribute('x2', '100%');
      gradient.setAttribute('y2', '100%');

      const stop1 = svgElement.ownerDocument!.createElementNS('http://www.w3.org/2000/svg', 'stop');
      stop1.setAttribute('offset', '0%');
      stop1.setAttribute('stop-color', color);
      stop1.setAttribute('stop-opacity', '0.8');

      const stop2 = svgElement.ownerDocument!.createElementNS('http://www.w3.org/2000/svg', 'stop');
      stop2.setAttribute('offset', '100%');
      stop2.setAttribute('stop-color', this.lightenColor(color, 20));
      stop2.setAttribute('stop-opacity', '0.6');

      gradient.appendChild(stop1);
      gradient.appendChild(stop2);
      defs.appendChild(gradient);
    });
  }

  private addShadowFilter(svgElement: SVGElement): void {
    const defs = svgElement.querySelector('defs') || svgElement.ownerDocument!.createElementNS('http://www.w3.org/2000/svg', 'defs');
    if (!svgElement.querySelector('defs')) {
      svgElement.insertBefore(defs, svgElement.firstChild);
    }

    const filter = svgElement.ownerDocument!.createElementNS('http://www.w3.org/2000/svg', 'filter');
    filter.setAttribute('id', 'colorful-shadow');
    filter.setAttribute('x', '-50%');
    filter.setAttribute('y', '-50%');
    filter.setAttribute('width', '200%');
    filter.setAttribute('height', '200%');

    const dropShadow = svgElement.ownerDocument!.createElementNS('http://www.w3.org/2000/svg', 'feDropShadow');
    dropShadow.setAttribute('dx', '3');
    dropShadow.setAttribute('dy', '3');
    dropShadow.setAttribute('stdDeviation', '3');
    dropShadow.setAttribute('flood-opacity', '0.3');

    filter.appendChild(dropShadow);
    defs.appendChild(filter);
  }

  private addProfessionalMarkers(svgElement: SVGElement, color: string): void {
    const defs = svgElement.querySelector('defs') || svgElement.ownerDocument!.createElementNS('http://www.w3.org/2000/svg', 'defs');
    if (!svgElement.querySelector('defs')) {
      svgElement.insertBefore(defs, svgElement.firstChild);
    }

    const marker = svgElement.ownerDocument!.createElementNS('http://www.w3.org/2000/svg', 'marker');
    marker.setAttribute('id', 'professional-arrow');
    marker.setAttribute('markerWidth', '10');
    marker.setAttribute('markerHeight', '10');
    marker.setAttribute('refX', '8');
    marker.setAttribute('refY', '3');
    marker.setAttribute('orient', 'auto');
    marker.setAttribute('markerUnits', 'strokeWidth');

    const path = svgElement.ownerDocument!.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M0,0 L0,6 L9,3 z');
    path.setAttribute('fill', color);

    marker.appendChild(path);
    defs.appendChild(marker);
  }

  private optimizeLayout(svg: string): string {
    const dom = new JSDOM(svg);
    const document = dom.window.document;
    const svgElement = document.querySelector('svg');

    if (!svgElement) {
      return svg;
    }

    // 移除多余的空白
    const texts = svgElement.querySelectorAll('text');
    texts.forEach(text => {
      if (text.textContent) {
        text.textContent = text.textContent.trim();
      }
    });

    // 优化路径
    const paths = svgElement.querySelectorAll('path');
    paths.forEach(path => {
      const d = path.getAttribute('d');
      if (d) {
        // 简化路径数据（移除多余的精度）
        const optimizedD = d.replace(/(\d+\.\d{3,})/g, (match) => {
          return parseFloat(match).toFixed(2);
        });
        path.setAttribute('d', optimizedD);
      }
    });

    return dom.serialize();
  }

  private lightenColor(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  }
} 