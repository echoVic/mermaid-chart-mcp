/**
 * TypeScript 代码分析器
 */

import Parser from 'tree-sitter';
import TypeScript from 'tree-sitter-typescript';
import {
  AnalysisError,
  CodeAnalysisOptions,
  CodeAnalysisResult,
  CodeEntity,
  Method,
  Parameter,
  Property,
  Relationship,
  SupportedLanguage
} from '../types';

export class TypeScriptAnalyzer {
  private parser: Parser;

  constructor() {
    this.parser = new Parser();
    this.parser.setLanguage(TypeScript.typescript);
  }

  async analyze(code: string, options: CodeAnalysisOptions): Promise<CodeAnalysisResult> {
    const startTime = Date.now();
    
    try {
      const tree = this.parser.parse(code);
      const entities = this.extractEntities(tree.rootNode, code, options);
      const relationships = this.extractRelationships(entities);
      const imports = this.extractImports(tree.rootNode, code);
      const exports = this.extractExports(tree.rootNode, code);
      
      return {
        entities,
        relationships,
        imports,
        exports,
        metadata: {
          language: SupportedLanguage.TypeScript,
          totalLines: code.split('\n').length,
          analysisTime: Date.now() - startTime
        }
      };
    } catch (error) {
      throw new AnalysisError(
        `TypeScript 分析失败: ${error instanceof Error ? error.message : String(error)}`,
        'TYPESCRIPT_ANALYSIS_ERROR',
        { error, code: code.substring(0, 100) }
      );
    }
  }

  private extractEntities(node: Parser.SyntaxNode, sourceCode: string, options: CodeAnalysisOptions): CodeEntity[] {
    const entities: CodeEntity[] = [];
    
    this.traverseNode(node, (child) => {
      switch (child.type) {
        case 'class_declaration':
          entities.push(this.extractClass(child, sourceCode, options));
          break;
        case 'interface_declaration':
          entities.push(this.extractInterface(child, sourceCode, options));
          break;
        case 'function_declaration':
          entities.push(this.extractFunction(child, sourceCode, options));
          break;
        case 'enum_declaration':
          entities.push(this.extractEnum(child, sourceCode, options));
          break;
      }
    });
    
    return entities;
  }

  private extractClass(node: Parser.SyntaxNode, sourceCode: string, options: CodeAnalysisOptions): CodeEntity {
    const nameNode = node.childForFieldName('name');
    const name = nameNode ? this.getNodeText(nameNode, sourceCode) : 'Unknown';
    
    const entity: CodeEntity = {
      type: 'class',
      name,
      properties: [],
      methods: [],
      position: {
        line: node.startPosition.row + 1,
        column: node.startPosition.column + 1
      },
      modifiers: this.extractModifiers(node, sourceCode),
      extends: this.extractExtends(node, sourceCode),
      implements: this.extractImplements(node, sourceCode)
    };

    // 提取类成员
    const bodyNode = node.childForFieldName('body');
    if (bodyNode) {
      this.traverseNode(bodyNode, (child) => {
        if (child.type === 'property_signature' || child.type === 'public_field_definition') {
          const property = this.extractProperty(child, sourceCode, options);
          if (property && (options.includePrivate || property.visibility !== 'private')) {
            entity.properties?.push(property);
          }
        } else if (child.type === 'method_definition' || child.type === 'method_signature') {
          const method = this.extractMethod(child, sourceCode, options);
          if (method && (options.includePrivate || method.visibility !== 'private')) {
            entity.methods?.push(method);
          }
        }
      });
    }

    return entity;
  }

  private extractInterface(node: Parser.SyntaxNode, sourceCode: string, options: CodeAnalysisOptions): CodeEntity {
    const nameNode = node.childForFieldName('name');
    const name = nameNode ? this.getNodeText(nameNode, sourceCode) : 'Unknown';
    
    const entity: CodeEntity = {
      type: 'interface',
      name,
      properties: [],
      methods: [],
      position: {
        line: node.startPosition.row + 1,
        column: node.startPosition.column + 1
      },
      extends: this.extractExtends(node, sourceCode)
    };

    // 提取接口成员
    const bodyNode = node.childForFieldName('body');
    if (bodyNode) {
      this.traverseNode(bodyNode, (child) => {
        if (child.type === 'property_signature') {
          const property = this.extractProperty(child, sourceCode, options);
          if (property) {
            entity.properties?.push(property);
          }
        } else if (child.type === 'method_signature') {
          const method = this.extractMethod(child, sourceCode, options);
          if (method) {
            entity.methods?.push(method);
          }
        }
      });
    }

    return entity;
  }

  private extractFunction(node: Parser.SyntaxNode, sourceCode: string, options: CodeAnalysisOptions): CodeEntity {
    const nameNode = node.childForFieldName('name');
    const name = nameNode ? this.getNodeText(nameNode, sourceCode) : 'Unknown';
    
    return {
      type: 'function',
      name,
      position: {
        line: node.startPosition.row + 1,
        column: node.startPosition.column + 1
      },
      methods: [this.extractFunctionAsMethod(node, sourceCode)]
    };
  }

  private extractEnum(node: Parser.SyntaxNode, sourceCode: string, options: CodeAnalysisOptions): CodeEntity {
    const nameNode = node.childForFieldName('name');
    const name = nameNode ? this.getNodeText(nameNode, sourceCode) : 'Unknown';
    
    return {
      type: 'enum',
      name,
      position: {
        line: node.startPosition.row + 1,
        column: node.startPosition.column + 1
      },
      properties: this.extractEnumMembers(node, sourceCode)
    };
  }

  private extractProperty(node: Parser.SyntaxNode, sourceCode: string, options: CodeAnalysisOptions): Property | null {
    const nameNode = node.childForFieldName('name');
    if (!nameNode) return null;

    const name = this.getNodeText(nameNode, sourceCode);
    const typeNode = node.childForFieldName('type');
    const type = typeNode ? this.getNodeText(typeNode, sourceCode) : 'any';
    
    return {
      name,
      type,
      visibility: this.extractVisibility(node, sourceCode),
      isStatic: this.hasModifier(node, sourceCode, 'static'),
      isReadonly: this.hasModifier(node, sourceCode, 'readonly')
    };
  }

  private extractMethod(node: Parser.SyntaxNode, sourceCode: string, options: CodeAnalysisOptions): Method | null {
    const nameNode = node.childForFieldName('name');
    if (!nameNode) return null;

    const name = this.getNodeText(nameNode, sourceCode);
    const parameters = this.extractParameters(node, sourceCode);
    const returnTypeNode = node.childForFieldName('return_type');
    const returnType = returnTypeNode ? this.getNodeText(returnTypeNode, sourceCode) : 'void';
    
    return {
      name,
      parameters,
      returnType,
      visibility: this.extractVisibility(node, sourceCode),
      isStatic: this.hasModifier(node, sourceCode, 'static'),
      isAbstract: this.hasModifier(node, sourceCode, 'abstract')
    };
  }

  private extractFunctionAsMethod(node: Parser.SyntaxNode, sourceCode: string): Method {
    const nameNode = node.childForFieldName('name');
    const name = nameNode ? this.getNodeText(nameNode, sourceCode) : 'Unknown';
    const parameters = this.extractParameters(node, sourceCode);
    const returnTypeNode = node.childForFieldName('return_type');
    const returnType = returnTypeNode ? this.getNodeText(returnTypeNode, sourceCode) : 'void';
    
    return {
      name,
      parameters,
      returnType,
      visibility: 'public'
    };
  }

  private extractParameters(node: Parser.SyntaxNode, sourceCode: string): Parameter[] {
    const parameters: Parameter[] = [];
    const paramsNode = node.childForFieldName('parameters');
    
    if (paramsNode) {
      this.traverseNode(paramsNode, (child) => {
        if (child.type === 'required_parameter' || child.type === 'optional_parameter') {
          const nameNode = child.childForFieldName('pattern');
          const typeNode = child.childForFieldName('type');
          
          if (nameNode) {
            parameters.push({
              name: this.getNodeText(nameNode, sourceCode),
              type: typeNode ? this.getNodeText(typeNode, sourceCode) : 'any',
              optional: child.type === 'optional_parameter'
            });
          }
        }
      });
    }
    
    return parameters;
  }

  private extractEnumMembers(node: Parser.SyntaxNode, sourceCode: string): Property[] {
    const members: Property[] = [];
    const bodyNode = node.childForFieldName('body');
    
    if (bodyNode) {
      this.traverseNode(bodyNode, (child) => {
        if (child.type === 'property_signature') {
          const nameNode = child.childForFieldName('name');
          if (nameNode) {
            members.push({
              name: this.getNodeText(nameNode, sourceCode),
              type: 'string | number',
              visibility: 'public'
            });
          }
        }
      });
    }
    
    return members;
  }

  private extractRelationships(entities: CodeEntity[]): Relationship[] {
    const relationships: Relationship[] = [];
    
    for (const entity of entities) {
      // 继承关系
      if (entity.extends) {
        for (const parentName of entity.extends) {
          relationships.push({
            type: 'inheritance',
            from: entity.name,
            to: parentName
          });
        }
      }
      
      // 实现关系
      if (entity.implements) {
        for (const interfaceName of entity.implements) {
          relationships.push({
            type: 'dependency',
            from: entity.name,
            to: interfaceName,
            label: 'implements'
          });
        }
      }
    }
    
    return relationships;
  }

  private extractImports(node: Parser.SyntaxNode, sourceCode: string): string[] {
    const imports: string[] = [];
    
    this.traverseNode(node, (child) => {
      if (child.type === 'import_statement') {
        const sourceNode = child.childForFieldName('source');
        if (sourceNode) {
          imports.push(this.getNodeText(sourceNode, sourceCode).replace(/['"]/g, ''));
        }
      }
    });
    
    return imports;
  }

  private extractExports(node: Parser.SyntaxNode, sourceCode: string): string[] {
    const exports: string[] = [];
    
    this.traverseNode(node, (child) => {
      if (child.type === 'export_statement' || child.type.startsWith('export_')) {
        const nameNode = child.childForFieldName('name');
        if (nameNode) {
          exports.push(this.getNodeText(nameNode, sourceCode));
        }
      }
    });
    
    return exports;
  }

  private extractModifiers(node: Parser.SyntaxNode, sourceCode: string): string[] {
    const modifiers: string[] = [];
    
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child && ['public', 'private', 'protected', 'static', 'abstract', 'readonly'].includes(child.type)) {
        modifiers.push(child.type);
      }
    }
    
    return modifiers;
  }

  private extractVisibility(node: Parser.SyntaxNode, sourceCode: string): 'public' | 'private' | 'protected' {
    const modifiers = this.extractModifiers(node, sourceCode);
    
    if (modifiers.includes('private')) return 'private';
    if (modifiers.includes('protected')) return 'protected';
    return 'public';
  }

  private hasModifier(node: Parser.SyntaxNode, sourceCode: string, modifier: string): boolean {
    return this.extractModifiers(node, sourceCode).includes(modifier);
  }

  private extractExtends(node: Parser.SyntaxNode, sourceCode: string): string[] {
    const extends_: string[] = [];
    const extendsNode = node.childForFieldName('extends');
    
    if (extendsNode) {
      extends_.push(this.getNodeText(extendsNode, sourceCode));
    }
    
    return extends_;
  }

  private extractImplements(node: Parser.SyntaxNode, sourceCode: string): string[] {
    const implements_: string[] = [];
    const implementsNode = node.childForFieldName('implements');
    
    if (implementsNode) {
      this.traverseNode(implementsNode, (child) => {
        if (child.type === 'type_identifier') {
          implements_.push(this.getNodeText(child, sourceCode));
        }
      });
    }
    
    return implements_;
  }

  private traverseNode(node: Parser.SyntaxNode, callback: (node: Parser.SyntaxNode) => void): void {
    callback(node);
    
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child) {
        this.traverseNode(child, callback);
      }
    }
  }

  private getNodeText(node: Parser.SyntaxNode, sourceCode: string): string {
    return sourceCode.slice(node.startIndex, node.endIndex);
  }
} 