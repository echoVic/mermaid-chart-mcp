/**
 * 基本使用示例
 */

import {
  BeautificationStyle,
  ClassDiagramGenerator,
  DiagramType,
  SVGBeautifier,
  SVGRenderer,
  SupportedLanguage,
  TypeScriptAnalyzer
} from '../src/index';

// 示例代码
const sampleCode = `
interface Flyable {
  fly(): void;
}

abstract class Animal {
  protected name: string;
  protected age: number;

  constructor(name: string, age: number) {
    this.name = name;
    this.age = age;
  }

  abstract makeSound(): void;
  
  public getName(): string {
    return this.name;
  }
}

class Dog extends Animal {
  private breed: string;

  constructor(name: string, age: number, breed: string) {
    super(name, age);
    this.breed = breed;
  }

  makeSound(): void {
    console.log('Woof! Woof!');
  }

  fetch(item: string): void {
    console.log(\`\${this.name} is fetching \${item}\`);
  }
}

class Bird extends Animal implements Flyable {
  private wingSpan: number;

  constructor(name: string, age: number, wingSpan: number) {
    super(name, age);
    this.wingSpan = wingSpan;
  }

  makeSound(): void {
    console.log('Tweet! Tweet!');
  }

  fly(): void {
    console.log(\`\${this.name} is flying with \${this.wingSpan}cm wingspan\`);
  }
}
`;

async function basicExample(): Promise<void> {
  console.log('🚀 开始基本示例...\n');

  try {
    // 步骤1：分析代码
    console.log('📝 步骤1：分析TypeScript代码...');
    const analyzer = new TypeScriptAnalyzer();
    const analysisResult = await analyzer.analyze(sampleCode, {
      language: SupportedLanguage.TypeScript,
      includePrivate: true,
      includeComments: false
    });

    console.log(`✅ 分析完成！发现 ${analysisResult.entities.length} 个实体和 ${analysisResult.relationships.length} 个关系`);
    console.log('实体列表:');
    analysisResult.entities.forEach(entity => {
      console.log(`  - ${entity.type}: ${entity.name}`);
    });
    console.log();

    // 步骤2：生成Mermaid类图
    console.log('🎨 步骤2：生成Mermaid类图...');
    const generator = new ClassDiagramGenerator();
    const mermaidResult = await generator.generate(analysisResult, {
      diagramType: DiagramType.ClassDiagram,
      direction: 'TB',
      includeTitle: true,
      title: '动物类层次结构',
      theme: 'default'
    });

    console.log('✅ Mermaid代码生成完成！');
    console.log('生成的Mermaid代码:');
    console.log('```mermaid');
    console.log(mermaidResult.mermaidCode);
    console.log('```\n');

    // 步骤3：渲染SVG
    console.log('🖼️  步骤3：渲染SVG...');
    const renderer = new SVGRenderer();
    const svgResult = await renderer.render(mermaidResult.mermaidCode, {
      width: 800,
      height: 600,
      backgroundColor: 'white',
      theme: 'default'
    });

    console.log(`✅ SVG渲染完成！尺寸: ${svgResult.width}x${svgResult.height}, 大小: ${svgResult.metadata.fileSize} 字节`);
    console.log();

    // 步骤4：美化SVG - 专业风格
    console.log('✨ 步骤4a：应用专业风格美化...');
    const beautifier = new SVGBeautifier();
    const professionalResult = await beautifier.beautify(svgResult.svg, {
      style: BeautificationStyle.Professional,
      optimizeLayout: true
    });

    console.log(`✅ 专业风格美化完成！优化后大小: ${professionalResult.metadata.optimizedSize} 字节`);

    // 步骤5：美化SVG - 彩色风格
    console.log('🌈 步骤4b：应用彩色风格美化...');
    const colorfulResult = await beautifier.beautify(svgResult.svg, {
      style: BeautificationStyle.Colorful,
      colorPalette: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'],
      optimizeLayout: true
    });

    console.log(`✅ 彩色风格美化完成！优化后大小: ${colorfulResult.metadata.optimizedSize} 字节`);

    // 步骤6：美化SVG - 极简风格
    console.log('⚪ 步骤4c：应用极简风格美化...');
    const minimalistResult = await beautifier.beautify(svgResult.svg, {
      style: BeautificationStyle.Minimalist,
      optimizeLayout: true
    });

    console.log(`✅ 极简风格美化完成！优化后大小: ${minimalistResult.metadata.optimizedSize} 字节`);

    // 总结统计
    console.log('\n📊 处理统计:');
    console.log(`总处理时间: ${
      analysisResult.metadata.analysisTime + 
      mermaidResult.metadata.generationTime + 
      svgResult.metadata.renderTime +
      professionalResult.metadata.beautificationTime +
      colorfulResult.metadata.beautificationTime +
      minimalistResult.metadata.beautificationTime
    }ms`);
    console.log(`- 代码分析: ${analysisResult.metadata.analysisTime}ms`);
    console.log(`- 图表生成: ${mermaidResult.metadata.generationTime}ms`);
    console.log(`- SVG渲染: ${svgResult.metadata.renderTime}ms`);
    console.log(`- 专业美化: ${professionalResult.metadata.beautificationTime}ms`);
    console.log(`- 彩色美化: ${colorfulResult.metadata.beautificationTime}ms`);
    console.log(`- 极简美化: ${minimalistResult.metadata.beautificationTime}ms`);

    console.log('\n🎉 基本示例完成！');

  } catch (error) {
    console.error('❌ 示例执行失败:', error);
    throw error;
  }
}

async function multipleThemeExample(): Promise<void> {
  console.log('\n🎨 多主题渲染示例...\n');

  const simpleMermaidCode = `
    classDiagram
      class Example {
        +String name
        +int value
        +display() void
        +calculate(input: int) int
      }
  `;

  try {
    const renderer = new SVGRenderer();
    const themes = ['default', 'neutral', 'dark', 'forest', 'base'];

    console.log('🖼️  渲染多个主题...');
    const results = await renderer.renderWithMultipleThemes(simpleMermaidCode, themes, {
      width: 400,
      height: 300
    });

    console.log('✅ 多主题渲染完成！');
    for (const [theme, result] of Object.entries(results)) {
      console.log(`  - ${theme}: ${result.width}x${result.height}, ${result.metadata.fileSize} 字节`);
    }

  } catch (error) {
    console.error('❌ 多主题示例失败:', error);
    throw error;
  }
}

// 运行示例
async function runExamples(): Promise<void> {
  try {
    await basicExample();
    await multipleThemeExample();
  } catch (error) {
    console.error('示例运行失败:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  runExamples();
} 