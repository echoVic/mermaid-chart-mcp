/**
 * 集成测试
 */

import { TypeScriptAnalyzer } from '../src/analyzers/typescript-analyzer';
import { SVGBeautifier } from '../src/beautifiers/svg-beautifier';
import { ClassDiagramGenerator } from '../src/generators/class-diagram-generator';
import { SVGRenderer } from '../src/renderers/svg-renderer';
import {
  BeautificationStyle,
  DiagramType,
  SupportedLanguage
} from '../src/types';

describe('集成测试', () => {
  const sampleCode = `
class Animal {
  private name: string;
  public age: number;
  
  constructor(name: string, age: number) {
    this.name = name;
    this.age = age;
  }
  
  public makeSound(): void {
    console.log('Some generic sound');
  }
}

class Dog extends Animal {
  public breed: string;
  
  constructor(name: string, age: number, breed: string) {
    super(name, age);
    this.breed = breed;
  }
  
  public makeSound(): void {
    console.log('Woof!');
  }
  
  public fetch(item: string): void {
    console.log(\`Fetching \${item}...\`);
  }
}
`;

  let analyzer: TypeScriptAnalyzer;
  let generator: ClassDiagramGenerator;
  let renderer: SVGRenderer;
  let beautifier: SVGBeautifier;

  beforeAll(() => {
    analyzer = new TypeScriptAnalyzer();
    generator = new ClassDiagramGenerator();
    renderer = new SVGRenderer();
    beautifier = new SVGBeautifier();
  });

  test('完整流程：代码分析 -> 图表生成 -> SVG渲染 -> 美化', async () => {
    // 步骤1：分析代码
    const analysisResult = await analyzer.analyze(sampleCode, {
      language: SupportedLanguage.TypeScript,
      includePrivate: true
    });

    expect(analysisResult.entities).toHaveLength(2);
    expect(analysisResult.entities[0].name).toBe('Animal');
    expect(analysisResult.entities[1].name).toBe('Dog');
    expect(analysisResult.relationships).toHaveLength(1);
    expect(analysisResult.relationships[0].type).toBe('inheritance');

    // 步骤2：生成Mermaid图表
    const mermaidResult = await generator.generate(analysisResult, {
      diagramType: DiagramType.ClassDiagram,
      direction: 'TB',
      includeTitle: true,
      title: 'Animal Hierarchy'
    });

    expect(mermaidResult.mermaidCode).toContain('classDiagram');
    expect(mermaidResult.mermaidCode).toContain('class Animal');
    expect(mermaidResult.mermaidCode).toContain('class Dog');
    expect(mermaidResult.mermaidCode).toContain('Dog --|> Animal');

    // 步骤3：渲染SVG
    const svgResult = await renderer.render(mermaidResult.mermaidCode);

    expect(svgResult.svg).toContain('<svg');
    expect(svgResult.width).toBeGreaterThan(0);
    expect(svgResult.height).toBeGreaterThan(0);

    // 步骤4：美化SVG
    const beautifiedResult = await beautifier.beautify(svgResult.svg, {
      style: BeautificationStyle.Professional,
      optimizeLayout: true
    });

    expect(beautifiedResult.svg).toContain('<svg');
    expect(beautifiedResult.style).toBe(BeautificationStyle.Professional);
    expect(beautifiedResult.metadata.beautificationTime).toBeGreaterThan(0);

  }, 30000); // 30秒超时，因为渲染可能需要一些时间

  test('TypeScript分析器应该正确提取类结构', async () => {
    const result = await analyzer.analyze(sampleCode, {
      language: SupportedLanguage.TypeScript,
      includePrivate: false
    });

    const animalClass = result.entities.find(e => e.name === 'Animal');
    const dogClass = result.entities.find(e => e.name === 'Dog');

    expect(animalClass).toBeDefined();
    expect(dogClass).toBeDefined();

    // 检查Animal类的结构
    expect(animalClass!.properties).toHaveLength(1); // 只有public属性
    expect(animalClass!.properties![0].name).toBe('age');
    expect(animalClass!.methods).toHaveLength(1); // makeSound方法

    // 检查Dog类的结构
    expect(dogClass!.properties).toHaveLength(1); // breed属性
    expect(dogClass!.methods).toHaveLength(2); // makeSound和fetch方法
  });

  test('类图生成器应该生成正确的Mermaid语法', async () => {
    const analysisResult = await analyzer.analyze(sampleCode, {
      language: SupportedLanguage.TypeScript,
      includePrivate: true
    });

    const result = await generator.generate(analysisResult, {
      diagramType: DiagramType.ClassDiagram,
      direction: 'LR'
    });

    expect(result.mermaidCode).toContain('direction LR');
    expect(result.mermaidCode).toMatch(/\+makeSound\(\)\s*:\s*void/);
    expect(result.mermaidCode).toMatch(/-name\s*:\s*string/);
    expect(result.metadata.nodeCount).toBe(2);
    expect(result.metadata.edgeCount).toBe(1);
  });

  test('SVG渲染器应该处理不同主题', async () => {
    const mermaidCode = `
      classDiagram
        class Test {
          +method() void
        }
    `;

    const themes = ['default', 'dark', 'forest'];
    
    for (const theme of themes) {
      const result = await renderer.render(mermaidCode, {
        theme,
        width: 400,
        height: 300
      });

      expect(result.svg).toContain('<svg');
      expect(result.width).toBe(400);
      expect(result.height).toBe(300);
    }
  });

  test('SVG美化器应该支持不同风格', async () => {
    const simpleSvg = `
      <svg width="200" height="200">
        <rect x="10" y="10" width="100" height="50" fill="blue"/>
        <text x="60" y="35">Test</text>
      </svg>
    `;

    const styles = [
      BeautificationStyle.Colorful,
      BeautificationStyle.Minimalist,
      BeautificationStyle.Professional
    ];

    for (const style of styles) {
      const result = await beautifier.beautify(simpleSvg, {
        style,
        optimizeLayout: true
      });

      expect(result.svg).toContain('<svg');
      expect(result.style).toBe(style);
      expect(result.metadata.originalSize).toBeGreaterThan(0);
    }
  });

  test('错误处理：无效的Mermaid代码', async () => {
    const invalidMermaidCode = 'invalid mermaid syntax';

    await expect(renderer.render(invalidMermaidCode)).rejects.toThrow();
  });

  test('错误处理：空代码分析', async () => {
    await expect(analyzer.analyze('', {
      language: SupportedLanguage.TypeScript
    })).rejects.toThrow();
  });
}); 