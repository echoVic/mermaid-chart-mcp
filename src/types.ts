/**
 * 核心类型定义
 */

import { z } from 'zod';

// 支持的编程语言
export enum SupportedLanguage {
  JavaScript = 'javascript',
  TypeScript = 'typescript',
  Python = 'python',
  Java = 'java'
}

// 文档格式
export enum DocumentFormat {
  Markdown = 'markdown',
  PlainText = 'text'
}

// Mermaid图表类型
export enum DiagramType {
  ClassDiagram = 'classDiagram',
  FlowChart = 'flowchart',
  SequenceDiagram = 'sequenceDiagram',
  StateDiagram = 'stateDiagram',
  EntityRelationship = 'erDiagram',
  GitGraph = 'gitgraph',
  Timeline = 'timeline'
}

// SVG美化风格
export enum BeautificationStyle {
  Sketchy = 'sketchy',
  Colorful = 'colorful',
  Minimalist = 'minimalist',
  Professional = 'professional'
}

// Zod 验证 schemas
export const CodeAnalysisOptionsSchema = z.object({
  language: z.nativeEnum(SupportedLanguage),
  includePrivate: z.boolean().optional().default(true),
  includeComments: z.boolean().optional().default(false),
  maxDepth: z.number().min(1).max(10).optional().default(5)
});

export const DocumentAnalysisOptionsSchema = z.object({
  format: z.nativeEnum(DocumentFormat),
  includeHeadings: z.boolean().optional().default(true),
  includeCodeBlocks: z.boolean().optional().default(true)
});

export const MermaidGenerationOptionsSchema = z.object({
  diagramType: z.nativeEnum(DiagramType),
  direction: z.enum(['TB', 'BT', 'LR', 'RL']).optional().default('TB'),
  includeTitle: z.boolean().optional().default(false),
  title: z.string().optional(),
  theme: z.enum(['default', 'neutral', 'dark', 'forest', 'base']).optional().default('default')
});

export const SVGRenderOptionsSchema = z.object({
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  backgroundColor: z.string().optional().default('white'),
  theme: z.string().optional().default('default')
});

export const SVGBeautificationOptionsSchema = z.object({
  style: z.nativeEnum(BeautificationStyle),
  colorPalette: z.array(z.string()).optional(),
  roughness: z.number().min(0).max(10).optional().default(1),
  optimizeLayout: z.boolean().optional().default(true)
});

// 推导类型
export type CodeAnalysisOptions = z.infer<typeof CodeAnalysisOptionsSchema>;
export type DocumentAnalysisOptions = z.infer<typeof DocumentAnalysisOptionsSchema>;
export type MermaidGenerationOptions = z.infer<typeof MermaidGenerationOptionsSchema>;
export type SVGRenderOptions = z.infer<typeof SVGRenderOptionsSchema>;
export type SVGBeautificationOptions = z.infer<typeof SVGBeautificationOptionsSchema>;

// 实体和关系类型
export interface CodeEntity {
  type: 'class' | 'interface' | 'function' | 'variable' | 'enum';
  name: string;
  properties?: Property[];
  methods?: Method[];
  position?: Position;
  modifiers?: string[];
  extends?: string[];
  implements?: string[];
}

export interface Property {
  name: string;
  type: string;
  visibility: 'public' | 'private' | 'protected';
  isStatic?: boolean;
  isReadonly?: boolean;
}

export interface Method {
  name: string;
  parameters: Parameter[];
  returnType: string;
  visibility: 'public' | 'private' | 'protected';
  isStatic?: boolean;
  isAbstract?: boolean;
}

export interface Parameter {
  name: string;
  type: string;
  optional?: boolean;
  defaultValue?: string;
}

export interface Position {
  line: number;
  column: number;
}

export interface Relationship {
  type: 'inheritance' | 'composition' | 'aggregation' | 'association' | 'dependency';
  from: string;
  to: string;
  label?: string;
  multiplicity?: string;
}

// 分析结果类型
export interface CodeAnalysisResult {
  entities: CodeEntity[];
  relationships: Relationship[];
  imports: string[];
  exports: string[];
  metadata: {
    language: SupportedLanguage;
    totalLines: number;
    analysisTime: number;
  };
}

export interface DocumentAnalysisResult {
  structure: DocumentSection[];
  metadata: {
    format: DocumentFormat;
    wordCount: number;
    analysisTime: number;
  };
}

export interface DocumentSection {
  type: 'heading' | 'paragraph' | 'list' | 'code' | 'table';
  level?: number;
  content: string;
  children?: DocumentSection[];
}

// 生成结果类型
export interface MermaidGenerationResult {
  mermaidCode: string;
  diagramType: DiagramType;
  metadata: {
    nodeCount: number;
    edgeCount: number;
    generationTime: number;
  };
}

export interface SVGRenderResult {
  svg: string;
  width: number;
  height: number;
  metadata: {
    renderTime: number;
    fileSize: number;
  };
}

export interface SVGBeautificationResult {
  svg: string;
  style: BeautificationStyle;
  metadata: {
    beautificationTime: number;
    originalSize: number;
    optimizedSize: number;
  };
}

// 错误类型
export class AnalysisError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'AnalysisError';
  }
}

export class GenerationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'GenerationError';
  }
}

export class RenderError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'RenderError';
  }
}

// MCP 工具参数类型
export interface GenerateDiagramParams {
  code?: string;
  document?: string;
  language?: SupportedLanguage;
  documentFormat?: DocumentFormat;
  diagramType: DiagramType;
  beautificationStyle?: BeautificationStyle;
  options?: {
    analysis?: Partial<CodeAnalysisOptions | DocumentAnalysisOptions>;
    generation?: Partial<MermaidGenerationOptions>;
    render?: Partial<SVGRenderOptions>;
    beautification?: Partial<SVGBeautificationOptions>;
  };
} 