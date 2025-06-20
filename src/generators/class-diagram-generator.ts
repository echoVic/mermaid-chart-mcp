/**
 * 类图生成器
 */

import {
  CodeAnalysisResult,
  CodeEntity,
  DiagramType,
  GenerationError,
  MermaidGenerationOptions,
  MermaidGenerationResult,
  Relationship
} from '../types';

export class ClassDiagramGenerator {
  async generate(
    analysisResult: CodeAnalysisResult,
    options: MermaidGenerationOptions
  ): Promise<MermaidGenerationResult> {
    const startTime = Date.now();
    
    try {
      if (options.diagramType !== DiagramType.ClassDiagram) {
        throw new GenerationError(
          '类图生成器只支持类图类型',
          'INVALID_DIAGRAM_TYPE',
          { requestedType: options.diagramType }
        );
      }

      const mermaidCode = this.buildClassDiagram(analysisResult, options);
      const nodeCount = analysisResult.entities.length;
      const edgeCount = analysisResult.relationships.length;

      return {
        mermaidCode,
        diagramType: DiagramType.ClassDiagram,
        metadata: {
          nodeCount,
          edgeCount,
          generationTime: Date.now() - startTime
        }
      };
    } catch (error) {
      throw new GenerationError(
        `类图生成失败: ${error instanceof Error ? error.message : String(error)}`,
        'CLASS_DIAGRAM_GENERATION_ERROR',
        { error, analysisResult }
      );
    }
  }

  private buildClassDiagram(
    analysisResult: CodeAnalysisResult,
    options: MermaidGenerationOptions
  ): string {
    const lines: string[] = [];
    
    // 图表声明
    lines.push('classDiagram');
    
    // 方向设置
    if (options.direction) {
      lines.push(`    direction ${options.direction}`);
    }
    
    // 标题
    if (options.includeTitle && options.title) {
      lines.push(`    title ${options.title}`);
    }
    
    // 空行分隔
    lines.push('');
    
    // 生成类定义
    for (const entity of analysisResult.entities) {
      if (entity.type === 'class' || entity.type === 'interface') {
        lines.push(...this.generateClassDefinition(entity));
        lines.push('');
      }
    }
    
    // 生成关系
    for (const relationship of analysisResult.relationships) {
      lines.push(this.generateRelationship(relationship));
    }
    
    return lines.join('\n');
  }

  private generateClassDefinition(entity: CodeEntity): string[] {
    const lines: string[] = [];
    const className = this.sanitizeClassName(entity.name);
    
    // 类声明
    if (entity.type === 'interface') {
      lines.push(`    class ${className} {`);
      lines.push(`        <<interface>>`);
    } else {
      lines.push(`    class ${className} {`);
    }
    
    // 添加修饰符
    if (entity.modifiers && entity.modifiers.length > 0) {
      for (const modifier of entity.modifiers) {
        if (modifier === 'abstract') {
          lines.push(`        <<abstract>>`);
        }
      }
    }
    
    // 属性
    if (entity.properties && entity.properties.length > 0) {
      for (const property of entity.properties) {
        lines.push(`        ${this.generateProperty(property)}`);
      }
    }
    
    // 方法
    if (entity.methods && entity.methods.length > 0) {
      for (const method of entity.methods) {
        lines.push(`        ${this.generateMethod(method)}`);
      }
    }
    
    lines.push('    }');
    
    return lines;
  }

  private generateProperty(property: any): string {
    const visibility = this.getVisibilitySymbol(property.visibility);
    const staticModifier = property.isStatic ? '$ ' : '';
    const readonlyModifier = property.isReadonly ? '~ ' : '';
    
    return `${visibility}${staticModifier}${readonlyModifier}${property.name} : ${property.type}`;
  }

  private generateMethod(method: any): string {
    const visibility = this.getVisibilitySymbol(method.visibility);
    const staticModifier = method.isStatic ? '$ ' : '';
    const abstractModifier = method.isAbstract ? '* ' : '';
    
    const parameters = method.parameters
      .map((param: any) => `${param.name}: ${param.type}`)
      .join(', ');
    
    return `${visibility}${staticModifier}${abstractModifier}${method.name}(${parameters}) : ${method.returnType}`;
  }

  private generateRelationship(relationship: Relationship): string {
    const fromClass = this.sanitizeClassName(relationship.from);
    const toClass = this.sanitizeClassName(relationship.to);
    
    let relationshipSymbol: string;
    
    switch (relationship.type) {
      case 'inheritance':
        relationshipSymbol = '--|>';
        break;
      case 'composition':
        relationshipSymbol = '*--';
        break;
      case 'aggregation':
        relationshipSymbol = 'o--';
        break;
      case 'association':
        relationshipSymbol = '-->';
        break;
      case 'dependency':
        relationshipSymbol = '..>';
        break;
      default:
        relationshipSymbol = '-->';
    }
    
    let relationshipLine = `    ${fromClass} ${relationshipSymbol} ${toClass}`;
    
    // 添加标签
    if (relationship.label) {
      relationshipLine += ` : ${relationship.label}`;
    }
    
    // 添加多重性
    if (relationship.multiplicity) {
      relationshipLine += ` "${relationship.multiplicity}"`;
    }
    
    return relationshipLine;
  }

  private getVisibilitySymbol(visibility: string): string {
    switch (visibility) {
      case 'private':
        return '-';
      case 'protected':
        return '#';
      case 'public':
      default:
        return '+';
    }
  }

  private sanitizeClassName(name: string): string {
    // 移除特殊字符，保留字母、数字和下划线
    return name.replace(/[^a-zA-Z0-9_]/g, '_');
  }
} 